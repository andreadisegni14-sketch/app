// Prints the preview the app would show, using built-in sample data.
// No Apple account or network needed: `npm run demo`
import { AppleMusicApi } from '../lib/apple-music-api.js';
import { collectLibrary } from '../lib/library.js';
import { buildPlan, reconcilePlan } from '../lib/organizer.js';
import { fakeFetch, sampleLibrary } from '../test/fixtures.js';

const { fetchImpl } = fakeFetch(sampleLibrary());
const api = new AppleMusicApi({ developerToken: 'demo', musicUserToken: 'demo', fetchImpl });
const { tracks, existing } = await collectLibrary(api, { onProgress: (m) => console.log(`  ${m}`) });
const plan = reconcilePlan(buildPlan(tracks), existing);

console.log('\nStats:', plan.stats);
console.log('\nProposed playlists:');
for (const p of plan.playlists) {
  console.log(`\n  ${p.kind === 'subgenre' ? '  ↳ ' : ''}${p.name}  [${p.action}, ${p.tracks.length} songs]`);
  for (const t of p.tracks) console.log(`      ${t.artist} — ${t.name}${t.favorite ? ' ♥' : ''}`);
}
console.log('\nDuplicates merged:');
for (const g of plan.duplicateGroups) console.log(`  ${g.kept.artist} — ${g.kept.name} (×${g.copies.length})`);
