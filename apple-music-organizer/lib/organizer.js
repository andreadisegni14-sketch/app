// Pure planning logic: normalize Apple Music resources, classify genres,
// detect duplicates and build the proposed playlist organization.
// No network access happens here, so it runs unchanged in the browser and in
// Node (tests, demo).

import { GENERIC_GENRES, lookupGenre } from './taxonomy.js';

// Written into the description of every playlist this tool creates. It is how
// later runs recognise their own playlists (to append instead of duplicating)
// and how the tool knows which playlists it is allowed to write to.
export const MARKER = '[genre-organizer]';

export const DEFAULT_OPTIONS = {
  genrePrefix: 'Genre',
  favoritesPrefix: 'Favorites',
  separator: ' · ',
  minGenreSize: 3, // smaller genres are folded into "Other"
  minSubgenreSize: 8, // subgenre playlists only when they have at least this many songs
  minFavoritesSize: 3, // smaller favorite groups are folded into "Favorites · Other"
  favoritesSubgenres: false,
  includeUnclassified: true,
};

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

/**
 * Turns an Apple Music API song resource (library-songs or catalog songs,
 * optionally with `include=catalog`) into the flat shape used for planning.
 */
export function normalizeResource(resource, source) {
  const a = resource.attributes ?? {};
  const catalog = resource.relationships?.catalog?.data?.[0];
  const ca = catalog?.attributes ?? {};
  const catalogId =
    catalog?.id ?? a.playParams?.catalogId ?? (resource.type === 'songs' ? resource.id : null);

  return {
    ref: { id: resource.id, type: resource.type },
    name: a.name ?? ca.name ?? '',
    artist: a.artistName ?? ca.artistName ?? '',
    album: a.albumName ?? ca.albumName ?? '',
    durationMs: a.durationInMillis ?? ca.durationInMillis ?? null,
    // Catalog genres are more precise (they carry subgenres), so they go first.
    genreNames: dedupeStrings([...(ca.genreNames ?? []), ...(a.genreNames ?? [])]),
    catalogId: catalogId ?? null,
    isrc: ca.isrc ?? a.isrc ?? null,
    favorite: false,
    sources: source ? [source] : [],
  };
}

function dedupeStrings(list) {
  const seen = new Set();
  return list.filter((s) => {
    const k = s.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// ---------------------------------------------------------------------------
// Genre classification
// ---------------------------------------------------------------------------

export function classify(track) {
  let genre = null;
  let subgenre = null;
  let firstUnknown = null;

  for (const raw of track.genreNames ?? []) {
    if (GENERIC_GENRES.has(raw.toLowerCase())) continue;
    const hit = lookupGenre(raw);
    if (!hit) {
      firstUnknown ??= raw.trim();
      continue;
    }
    // Subgenre only counts if it belongs to the genre we end up with.
    if (!genre) genre = hit.genre;
    if (!subgenre && hit.sub && hit.genre === genre) subgenre = hit.sub;
    if (genre && subgenre) break;
  }

  // An unmapped Apple genre (e.g. a regional one) still becomes its own
  // category rather than being thrown away.
  if (!genre && firstUnknown) genre = firstUnknown;
  return { genre: genre ?? null, subgenre };
}

// ---------------------------------------------------------------------------
// Duplicate detection
// ---------------------------------------------------------------------------

const VERSION_NOISE = [
  /\s*[([](?:feat\.?|ft\.?|featuring|with)\s[^)\]]*[)\]]/gi,
  /\s*[([][^)\]]*remaster(?:ed)?[^)\]]*[)\]]/gi,
  /\s+-\s+[^-]*remaster(?:ed)?.*$/gi,
  /\s*[([](?:explicit|clean|album version|single version|mono|stereo)[)\]]/gi,
];

export function normalizeText(s) {
  let out = (s ?? '').normalize('NFKD').replace(/[̀-ͯ]/g, '');
  for (const re of VERSION_NOISE) out = out.replace(re, '');
  return out
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function primaryArtist(artist) {
  const first = (artist ?? '').split(/\s*(?:,|&|\/|;|\bfeat\.?|\bft\.?|\bfeaturing\b|\sx\s|\swith\s)\s*/i)[0];
  return normalizeText(first);
}

/** All identities a track can be matched on, strongest first. */
export function identityKeys(track) {
  const keys = [];
  if (track.isrc) keys.push(`isrc:${track.isrc.toUpperCase()}`);
  if (track.catalogId) keys.push(`cat:${track.catalogId}`);
  keys.push(`lib:${track.ref.type}:${track.ref.id}`);
  const title = normalizeText(track.name);
  const artist = primaryArtist(track.artist);
  if (title && artist) keys.push(`meta:${title}|${artist}`);
  return keys;
}

/**
 * Merges tracks that are the same song (same ISRC, catalog id, library id, or
 * same normalized title + primary artist). Returns the unique tracks plus the
 * groups that contained duplicates.
 */
export function dedupeTracks(tracks) {
  const parent = tracks.map((_, i) => i);
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const owner = new Map();

  tracks.forEach((t, i) => {
    for (const key of identityKeys(t)) {
      if (owner.has(key)) parent[find(i)] = find(owner.get(key));
      else owner.set(key, i);
    }
  });

  const groups = new Map();
  tracks.forEach((t, i) => {
    const root = find(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(t);
  });

  const unique = [];
  const duplicateGroups = [];
  for (const members of groups.values()) {
    const merged = mergeGroup(members);
    unique.push(merged);
    const distinct = new Set(members.map((m) => `${m.ref.type}:${m.ref.id}`));
    if (distinct.size > 1) duplicateGroups.push({ kept: merged, copies: members });
  }
  return { unique, duplicateGroups };
}

function mergeGroup(members) {
  // Prefer an item that is in the user's library, then one with genre data.
  const ranked = [...members].sort(
    (a, b) =>
      (b.ref.type === 'library-songs') - (a.ref.type === 'library-songs') ||
      b.genreNames.length - a.genreNames.length,
  );
  const best = ranked[0];
  return {
    ...best,
    genreNames: dedupeStrings(ranked.flatMap((m) => m.genreNames)),
    isrc: best.isrc ?? ranked.find((m) => m.isrc)?.isrc ?? null,
    catalogId: best.catalogId ?? ranked.find((m) => m.catalogId)?.catalogId ?? null,
    favorite: members.some((m) => m.favorite),
    sources: dedupeStrings(members.flatMap((m) => m.sources)),
  };
}

// ---------------------------------------------------------------------------
// Plan
// ---------------------------------------------------------------------------

const otherLast = (a, b) => (a === 'Other' ? 1 : b === 'Other' ? -1 : a.localeCompare(b));

const byArtistAlbumTitle = (a, b) =>
  a.artist.localeCompare(b.artist) || a.album.localeCompare(b.album) || a.name.localeCompare(b.name);

export function playlistName(parts, opts) {
  return parts.join(opts.separator);
}

/**
 * Builds the proposed organization. `tracks` may contain duplicates; they are
 * merged first so every playlist holds each song at most once.
 */
export function buildPlan(tracks, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { unique, duplicateGroups } = dedupeTracks(tracks);

  const classified = unique.map((t) => ({ ...t, ...classify(t) }));
  const byGenre = groupBy(classified.filter((t) => t.genre), (t) => t.genre);
  const unclassified = classified.filter((t) => !t.genre);

  // Fold tiny genres into "Other" so the library isn't flooded with
  // one-song playlists.
  const genreBuckets = new Map();
  const other = [];
  for (const [genre, list] of byGenre) {
    if (list.length >= opts.minGenreSize) genreBuckets.set(genre, list);
    else other.push(...list);
  }
  if (other.length) genreBuckets.set('Other', [...(genreBuckets.get('Other') ?? []), ...other]);

  const playlists = [];
  const sortedGenres = [...genreBuckets.keys()].sort(otherLast);

  for (const genre of sortedGenres) {
    const list = genreBuckets.get(genre);
    playlists.push(makePlaylist('genre', [opts.genrePrefix, genre], list, opts, { genre }));

    if (genre === 'Other') continue;
    const bySub = groupBy(list.filter((t) => t.subgenre), (t) => t.subgenre);
    for (const [sub, subList] of [...bySub].sort(([a], [b]) => a.localeCompare(b))) {
      // Skip subgenres that are too small or identical to their parent.
      if (subList.length < opts.minSubgenreSize || subList.length === list.length) continue;
      playlists.push(
        makePlaylist('subgenre', [opts.genrePrefix, genre, sub], subList, opts, { genre, subgenre: sub }),
      );
    }
  }

  if (opts.includeUnclassified && unclassified.length) {
    playlists.push(
      makePlaylist('genre', [opts.genrePrefix, 'Unclassified'], unclassified, opts, { genre: 'Unclassified' }),
    );
  }

  // Favorites, grouped by the same (possibly folded) genre buckets.
  const favoriteGroups = new Map();
  for (const genre of sortedGenres) {
    const favs = genreBuckets.get(genre).filter((t) => t.favorite);
    if (favs.length) favoriteGroups.set(genre, favs);
  }
  const favOther = [];
  for (const [genre, favs] of [...favoriteGroups]) {
    if (genre !== 'Other' && favs.length < opts.minFavoritesSize) {
      favOther.push(...favs);
      favoriteGroups.delete(genre);
    }
  }
  if (favOther.length) favoriteGroups.set('Other', [...(favoriteGroups.get('Other') ?? []), ...favOther]);
  const unclassifiedFavs = unclassified.filter((t) => t.favorite);
  if (unclassifiedFavs.length) {
    favoriteGroups.set('Other', [...(favoriteGroups.get('Other') ?? []), ...unclassifiedFavs]);
  }

  for (const genre of [...favoriteGroups.keys()].sort(otherLast)) {
    const favs = favoriteGroups.get(genre);
    playlists.push(makePlaylist('favorites', [opts.favoritesPrefix, genre], favs, opts, { genre }));
    if (!opts.favoritesSubgenres || genre === 'Other') continue;
    const bySub = groupBy(favs.filter((t) => t.subgenre), (t) => t.subgenre);
    for (const [sub, subList] of bySub) {
      if (subList.length < opts.minSubgenreSize || subList.length === favs.length) continue;
      playlists.push(
        makePlaylist('favorites', [opts.favoritesPrefix, genre, sub], subList, opts, { genre, subgenre: sub }),
      );
    }
  }

  return {
    options: opts,
    stats: {
      // Entries scanned across library + playlists (the same library item
      // appearing in several playlists counts once per appearance).
      scannedEntries: tracks.length,
      distinctItems: new Set(tracks.map((t) => `${t.ref.type}:${t.ref.id}`)).size,
      uniqueSongs: unique.length,
      // Different library/catalog items that turned out to be the same song.
      duplicatesMerged: new Set(tracks.map((t) => `${t.ref.type}:${t.ref.id}`)).size - unique.length,
      duplicateGroups: duplicateGroups.length,
      favorites: classified.filter((t) => t.favorite).length,
      classified: classified.length - unclassified.length,
      unclassified: unclassified.length,
      genres: sortedGenres.length,
      playlists: playlists.length,
    },
    playlists,
    duplicateGroups,
    unclassified,
  };
}

function makePlaylist(kind, nameParts, tracks, opts, extra) {
  const name = playlistName(nameParts, opts);
  // Defensive: each playlist holds each song once even if the caller passed
  // overlapping lists.
  const seen = new Set();
  const unique = [];
  for (const t of [...tracks].sort(byArtistAlbumTitle)) {
    const k = `${t.ref.type}:${t.ref.id}`;
    if (!seen.has(k)) {
      seen.add(k);
      unique.push(t);
    }
  }
  return { kind, name, ...extra, tracks: unique, action: 'create', targetId: null };
}

function groupBy(list, keyFn) {
  const m = new Map();
  for (const item of list) {
    const k = keyFn(item);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(item);
  }
  return m;
}

// ---------------------------------------------------------------------------
// Reconcile with playlists that already exist in the library
// ---------------------------------------------------------------------------

export function isGeneratedPlaylist(p) {
  return (p.description ?? '').includes(MARKER);
}

/**
 * Decides, per planned playlist, whether to create it or append to a playlist
 * from a previous run. `existing` is [{ id, name, description, tracks }] where
 * tracks are normalized tracks (only needed for generated playlists).
 *
 * - Same name, created by this tool  -> append only the songs it lacks.
 * - Same name, created by the user   -> never touched; the new playlist gets a
 *                                       " (Organized)" suffix instead.
 */
export function reconcilePlan(plan, existing) {
  const takenNames = new Set(existing.map((p) => p.name));
  const playlists = plan.playlists.map((p) => {
    const generated = existing.find((e) => e.name === p.name && isGeneratedPlaylist(e));
    if (generated) {
      const have = new Set((generated.tracks ?? []).flatMap(identityKeys));
      const missing = p.tracks.filter((t) => !identityKeys(t).some((k) => have.has(k)));
      return { ...p, action: missing.length ? 'append' : 'skip', targetId: generated.id, tracks: missing, totalTracks: p.tracks.length };
    }
    let name = p.name;
    if (takenNames.has(name)) {
      let n = 1;
      name = `${p.name} (Organized)`;
      while (takenNames.has(name)) name = `${p.name} (Organized ${++n})`;
    }
    takenNames.add(name);
    return { ...p, name, action: 'create', targetId: null, totalTracks: p.tracks.length };
  });
  return { ...plan, playlists };
}

export function describePlaylist(p, date = new Date()) {
  const what =
    p.kind === 'favorites'
      ? `Your favorite ${p.subgenre ?? p.genre} songs`
      : `${p.subgenre ?? p.genre} songs from your library`;
  return `${what}. Created by Apple Music Genre Organizer on ${date.toISOString().slice(0, 10)}. ${MARKER}`;
}
