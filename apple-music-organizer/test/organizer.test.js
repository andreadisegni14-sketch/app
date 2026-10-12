import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, verify } from 'node:crypto';

import { AppleMusicApi } from '../lib/apple-music-api.js';
import { collectLibrary } from '../lib/library.js';
import { applyPlan } from '../lib/apply.js';
import { createDeveloperToken } from '../lib/developer-token.js';
import { buildPlan, classify, dedupeTracks, normalizeResource, reconcilePlan, MARKER } from '../lib/organizer.js';
import { fakeFetch, sampleLibrary, song } from './fixtures.js';

const norm = (r) => normalizeResource(r, 'test');
const names = (plan) => plan.playlists.map((p) => p.name);

test('classify picks genre and subgenre from Apple genre names', () => {
  const c = (genres) => classify({ genreNames: genres });
  assert.deepEqual(c(['House', 'Electronic', 'Music']), { genre: 'Electronic', subgenre: 'House' });
  assert.deepEqual(c(['Hip-Hop/Rap', 'Music']), { genre: 'Hip-Hop & Rap', subgenre: null });
  assert.deepEqual(c(['Indie Rock', 'Alternative']), { genre: 'Indie & Alternative', subgenre: 'Indie Rock' });
  assert.deepEqual(c(['Music']), { genre: null, subgenre: null });
  assert.deepEqual(c(['Fado', 'Music']), { genre: 'Fado', subgenre: null }); // unmapped genres survive
});

test('duplicates are merged across ISRC, catalog id and title/artist', () => {
  const a = norm(song({ name: 'Song', artist: 'X', isrc: 'US1', genres: ['Pop'] }));
  const b = norm(song({ name: 'Different Title', artist: 'Y', isrc: 'US1', genres: ['Pop'] }));
  const c = norm(song({ name: 'Song (feat. Z)', artist: 'X & Z', genres: ['Pop'] }));
  const d = norm(song({ name: 'Song (Live)', artist: 'X', genres: ['Pop'] }));
  const { unique, duplicateGroups } = dedupeTracks([a, b, c, d]);
  assert.equal(unique.length, 2); // a+b+c merged; the live version stays separate
  assert.equal(duplicateGroups.length, 1);
});

test('buildPlan creates genre, subgenre and favorites playlists without duplicates', () => {
  const lib = sampleLibrary();
  const tracks = lib.librarySongs.map(norm);
  tracks.filter((t) => lib.ratings[t.ref.id] === 1).forEach((t) => (t.favorite = true));
  const plan = buildPlan(tracks);

  assert.deepEqual(names(plan), [
    'Genre · Electronic',
    'Genre · Electronic · House',
    'Genre · Hip-Hop & Rap',
    'Genre · Pop',
    'Genre · Rock',
    'Genre · Other', // Jazz (2 songs) folded in
    'Genre · Unclassified',
    'Favorites · Pop',
  ]);
  for (const p of plan.playlists) {
    const ids = p.tracks.map((t) => t.ref.id);
    assert.equal(new Set(ids).size, ids.length, `${p.name} has duplicates`);
  }
  const rock = plan.playlists.find((p) => p.name === 'Genre · Rock');
  assert.equal(rock.tracks.filter((t) => t.name.startsWith('Bohemian')).length, 1);
  assert.equal(plan.stats.duplicatesMerged, 1);
});

test('reconcilePlan never reuses a user playlist name and appends to its own', () => {
  const lib = sampleLibrary();
  const plan = buildPlan(lib.librarySongs.map(norm));
  const pop = plan.playlists.find((p) => p.name === 'Genre · Pop');
  const existing = [
    { id: 'u1', name: 'Genre · Rock', description: 'made by me', tracks: [] },
    { id: 'g1', name: 'Genre · Pop', description: `old ${MARKER}`, tracks: pop.tracks.slice(0, 3) },
  ];
  const r = reconcilePlan(plan, existing);
  assert.ok(names(r).includes('Genre · Rock (Organized)'));
  const popR = r.playlists.find((p) => p.name === 'Genre · Pop');
  assert.equal(popR.action, 'append');
  assert.equal(popR.targetId, 'g1');
  assert.equal(popR.tracks.length, pop.tracks.length - 3);
});

test('end to end: reads library, writes only to playlists it creates, re-run is idempotent', async () => {
  const lib = sampleLibrary();
  const original = structuredClone({ playlists: lib.playlists, tracks: lib.playlistTracks });
  const { fetchImpl, calls } = fakeFetch(lib);
  const api = new AppleMusicApi({ developerToken: 'dev', musicUserToken: 'user', fetchImpl });

  const { tracks, existing } = await collectLibrary(api);
  const plan = reconcilePlan(buildPlan(tracks), existing);
  // Favorites come from ratings (3 pop songs) and the "Favorite Songs" playlist (3 house).
  assert.ok(names(plan).includes('Favorites · Pop'));
  assert.ok(names(plan).includes('Favorites · Electronic'));

  const results = await applyPlan(api, plan);
  assert.ok(results.every((r) => r.ok), JSON.stringify(results));

  const writes = calls.filter((c) => c.method !== 'GET');
  const created = new Set(lib.playlists.filter((p) => p.id.startsWith('p.new')).map((p) => p.id));
  for (const w of writes) {
    const id = w.path.match(/playlists\/([^/]+)\/tracks/)?.[1];
    assert.ok(w.path === '/v1/me/library/playlists' || created.has(id), `unexpected write ${w.method} ${w.path}`);
  }
  for (const id of Object.keys(original.tracks)) {
    assert.deepEqual(lib.playlistTracks[id], original.tracks[id], `original playlist ${id} changed`);
  }

  // Second run: everything already present -> nothing created or added.
  const writesBefore = calls.filter((c) => c.method !== 'GET').length;
  const again = await collectLibrary(api);
  const plan2 = reconcilePlan(buildPlan(again.tracks), again.existing);
  assert.ok(plan2.playlists.every((p) => p.action === 'skip'), JSON.stringify(plan2.playlists.map((p) => [p.name, p.action])));
  await applyPlan(api, plan2);
  assert.equal(calls.filter((c) => c.method !== 'GET').length, writesBefore);
});

test('API client refuses to touch playlists it did not create', async () => {
  const { fetchImpl } = fakeFetch(sampleLibrary());
  const api = new AppleMusicApi({ developerToken: 'd', musicUserToken: 'u', fetchImpl });
  await assert.rejects(api.addTracks('p.mine', [{ id: 'i.1', type: 'library-songs' }]), /not created by this tool/);
  await assert.rejects(api.request('DELETE', '/v1/me/library/playlists/p.mine'), /only reads and creates/);
});

test('developer token is a valid ES256 JWT', () => {
  const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const pem = privateKey.export({ type: 'pkcs8', format: 'pem' });
  const { token } = createDeveloperToken({ teamId: 'TEAM', keyId: 'KEY', privateKey: pem, origins: ['http://localhost:3000'] });
  const [h, p, s] = token.split('.');
  assert.deepEqual(JSON.parse(Buffer.from(h, 'base64url')), { alg: 'ES256', kid: 'KEY' });
  const payload = JSON.parse(Buffer.from(p, 'base64url'));
  assert.equal(payload.iss, 'TEAM');
  assert.ok(payload.exp > payload.iat);
  const ok = verify('sha256', Buffer.from(`${h}.${p}`), { key: publicKey, dsaEncoding: 'ieee-p1363' }, Buffer.from(s, 'base64url'));
  assert.ok(ok);
});
