// Executes an approved plan: creates the new playlists and fills them.
// Only ever creates playlists or appends to playlists this tool created.

import { describePlaylist } from './organizer.js';

/**
 * @param api      AppleMusicApi instance
 * @param plan     reconciled plan (see reconcilePlan)
 * @param selected optional Set of playlist names the user kept in the preview
 */
export async function applyPlan(api, plan, { selected, onProgress = () => {}, now = new Date() } = {}) {
  const results = [];
  const todo = plan.playlists.filter((p) => p.action !== 'skip' && (!selected || selected.has(p.name)));

  for (const [i, p] of todo.entries()) {
    const label = `(${i + 1}/${todo.length}) ${p.name}`;
    try {
      let id = p.targetId;
      if (p.action === 'append') {
        api.markWritable(id);
        onProgress(`${label}: adding ${p.tracks.length} new songs to existing playlist…`);
      } else {
        onProgress(`${label}: creating playlist…`);
        id = await api.createPlaylist(p.name, describePlaylist(p, now));
      }
      await api.addTracks(id, p.tracks.map((t) => t.ref), (done, total) =>
        onProgress(`${label}: added ${done}/${total} songs`),
      );
      results.push({ name: p.name, id, action: p.action, added: p.tracks.length, ok: true });
    } catch (e) {
      onProgress(`${label}: FAILED – ${e.message}`);
      results.push({ name: p.name, action: p.action, added: 0, ok: false, error: e.message });
    }
  }
  return results;
}
