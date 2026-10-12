import { AppleMusicApi } from '/lib/apple-music-api.js';
import { collectLibrary } from '/lib/library.js';
import { buildPlan, reconcilePlan, DEFAULT_OPTIONS } from '/lib/organizer.js';
import { applyPlan } from '/lib/apply.js';

const $ = (id) => document.getElementById(id);
const el = (tag, props = {}, ...children) => {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
};

const state = { music: null, developerToken: null, library: null, plan: null, selected: new Set(), applied: false };

// ---------------------------------------------------------------- MusicKit

async function initMusicKit() {
  const res = await fetch('/api/developer-token');
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? 'Could not get developer token');
  state.developerToken = body.token;

  if (!window.MusicKit) await new Promise((r) => document.addEventListener('musickitloaded', r, { once: true }));
  await MusicKit.configure({ developerToken: state.developerToken, app: { name: 'Genre Organizer', build: '1.0.0' } });
  state.music = MusicKit.getInstance();
  renderAuth();
}

function renderAuth() {
  const authorized = state.music?.isAuthorized;
  $('btn-connect').disabled = false;
  $('btn-connect').textContent = authorized ? 'Connected ✓' : 'Connect Apple Music';
  $('btn-connect').disabled = authorized;
  $('btn-disconnect').hidden = !authorized;
  $('step-analyze').hidden = !authorized;
  $('connect-status').textContent = authorized ? 'Authorized through MusicKit.' : '';
}

$('btn-connect').onclick = async () => {
  try {
    await state.music.authorize(); // opens Apple's sign-in / consent window
  } catch (e) {
    $('connect-status').textContent = `Authorization was not completed: ${e.message ?? e}`;
  }
  renderAuth();
};

$('btn-disconnect').onclick = async () => {
  await state.music.unauthorize();
  location.reload();
};

// ---------------------------------------------------------------- Analyze

function api(log) {
  return new AppleMusicApi({
    developerToken: state.developerToken,
    musicUserToken: state.music.musicUserToken,
    onLog: log,
  });
}

function logger(pre) {
  pre.hidden = false;
  return (msg) => {
    pre.textContent += `${msg}\n`;
    pre.scrollTop = pre.scrollHeight;
  };
}

$('btn-analyze').onclick = async () => {
  const btn = $('btn-analyze');
  btn.disabled = true;
  $('log').textContent = '';
  const log = logger($('log'));
  try {
    state.library = await collectLibrary(api(log), { onProgress: log });
    loadOptions(DEFAULT_OPTIONS);
    replan();
    log('Done. Review the proposal below — nothing has been changed yet.');
    $('step-preview').hidden = false;
    $('step-preview').scrollIntoView({ behavior: 'smooth' });
  } catch (e) {
    log(`Error: ${e.message}`);
  } finally {
    btn.disabled = false;
  }
};

// ---------------------------------------------------------------- Preview

const NUM_OPTS = ['minGenreSize', 'minSubgenreSize', 'minFavoritesSize'];
const TEXT_OPTS = ['genrePrefix', 'favoritesPrefix'];
const BOOL_OPTS = ['favoritesSubgenres', 'includeUnclassified'];

function loadOptions(o) {
  for (const k of NUM_OPTS) $(`opt-${k}`).value = o[k];
  for (const k of TEXT_OPTS) $(`opt-${k}`).value = o[k];
  for (const k of BOOL_OPTS) $(`opt-${k}`).checked = o[k];
}

function readOptions() {
  const o = {};
  for (const k of NUM_OPTS) o[k] = Math.max(1, Number($(`opt-${k}`).value) || DEFAULT_OPTIONS[k]);
  for (const k of TEXT_OPTS) o[k] = $(`opt-${k}`).value.trim() || DEFAULT_OPTIONS[k];
  for (const k of BOOL_OPTS) o[k] = $(`opt-${k}`).checked;
  return o;
}

function replan() {
  const { tracks, existing } = state.library;
  state.plan = reconcilePlan(buildPlan(tracks, readOptions()), existing);
  state.selected = new Set(state.plan.playlists.filter((p) => p.action !== 'skip').map((p) => p.name));
  renderPreview();
}
$('btn-replan').onclick = replan;

function renderPreview() {
  const { stats, playlists, duplicateGroups } = state.plan;
  const stat = (n, label) => el('div', { className: 'stat' }, el('b', { textContent: n.toLocaleString() }), el('span', { textContent: label }));
  $('stats').replaceChildren(
    stat(stats.uniqueSongs, 'unique songs'),
    stat(stats.favorites, 'favorites'),
    stat(stats.genres, 'genres'),
    stat(stats.playlists, 'proposed playlists'),
    stat(stats.duplicatesMerged, 'duplicates merged'),
    stat(stats.unclassified, 'songs without genre'),
  );

  $('playlists').replaceChildren(...playlists.map(renderPlaylist));

  $('dupes-title').textContent = `Duplicates detected (${duplicateGroups.length} songs appear more than once — each is added only once)`;
  $('dupes-wrap').hidden = !duplicateGroups.length;
  $('dupes').replaceChildren(
    el('ul', { className: 'tracks' }, ...duplicateGroups.slice(0, 500).map((g) =>
      el('li', { textContent: `${g.kept.artist} — ${g.kept.name}  ×${g.copies.length}` },
        el('span', { className: 'g', textContent: `  (${[...new Set(g.copies.map((c) => c.album))].join(' / ')})` })),
    )),
  );
  updateApproveSummary();
}

function renderPlaylist(p) {
  const checkbox = el('input', { type: 'checkbox', checked: state.selected.has(p.name), disabled: p.action === 'skip' });
  checkbox.onclick = (e) => e.stopPropagation();
  checkbox.onchange = () => {
    checkbox.checked ? state.selected.add(p.name) : state.selected.delete(p.name);
    updateApproveSummary();
  };
  const badge = { create: 'new', append: 'add to existing', skip: 'up to date' }[p.action];
  const count = p.action === 'create' ? `${p.tracks.length} songs` : `+${p.tracks.length} of ${p.totalTracks}`;
  const list = el('ul', { className: 'tracks' });
  const details = el('details', { className: `pl ${p.kind}` },
    el('summary', {}, checkbox, el('span', { className: 'name', textContent: p.name }),
      el('span', { className: 'badge', textContent: badge }), el('span', { className: 'count', textContent: count })),
    list,
  );
  // Render track lists lazily; big libraries would otherwise create a huge DOM.
  details.addEventListener('toggle', () => {
    if (!details.open || list.childElementCount) return;
    list.append(...p.tracks.map((t) =>
      el('li', { textContent: `${t.artist} — ${t.name}${t.favorite ? ' ♥' : ''}` },
        el('span', { className: 'g', textContent: `  ${t.genreNames.filter((g) => g !== 'Music').join(', ') || 'no genre'}` })),
    ));
  });
  return details;
}

function updateApproveSummary() {
  const chosen = state.plan.playlists.filter((p) => state.selected.has(p.name));
  const created = chosen.filter((p) => p.action === 'create').length;
  const appended = chosen.filter((p) => p.action === 'append').length;
  const songs = chosen.reduce((n, p) => n + p.tracks.length, 0);
  $('approve-summary').textContent =
    `Will create ${created} new playlists${appended ? ` and add songs to ${appended} playlists from a previous run` : ''} ` +
    `(${songs.toLocaleString()} song placements). Your existing playlists will not be modified.`;
  $('btn-apply').disabled = !chosen.length || state.applied;
}

const setAll = (on) => {
  for (const p of state.plan.playlists) if (p.action !== 'skip') on ? state.selected.add(p.name) : state.selected.delete(p.name);
  renderPreview();
};
$('btn-all').onclick = () => setAll(true);
$('btn-none').onclick = () => setAll(false);

$('btn-export').onclick = () => {
  const slim = {
    stats: state.plan.stats,
    options: state.plan.options,
    playlists: state.plan.playlists.map((p) => ({
      name: p.name, kind: p.kind, genre: p.genre, subgenre: p.subgenre ?? null, action: p.action,
      selected: state.selected.has(p.name),
      tracks: p.tracks.map((t) => ({ artist: t.artist, name: t.name, album: t.album, genres: t.genreNames, favorite: t.favorite })),
    })),
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(slim, null, 2)], { type: 'application/json' }));
  el('a', { href: url, download: 'apple-music-organization-plan.json' }).click();
  URL.revokeObjectURL(url);
};

// ---------------------------------------------------------------- Apply

$('btn-apply').onclick = async () => {
  if (!confirm(`${$('approve-summary').textContent}\n\nProceed?`)) return;
  state.applied = true;
  $('btn-apply').disabled = true;
  $('btn-replan').disabled = true;
  $('step-apply').hidden = false;
  $('step-apply').scrollIntoView({ behavior: 'smooth' });
  const log = logger($('apply-log'));

  const results = await applyPlan(api(log), state.plan, { selected: state.selected, onProgress: log });
  const ok = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);
  $('results').replaceChildren(
    el('p', { className: 'ok', textContent: `✓ ${ok.length} playlists done, ${ok.reduce((n, r) => n + r.added, 0).toLocaleString()} songs added.` }),
    ...(failed.length ? [el('p', { className: 'err', textContent: `✗ ${failed.length} failed: ${failed.map((r) => r.name).join(', ')}. Run Analyze again to retry — completed playlists will be detected and not duplicated.` })] : []),
    el('p', { className: 'muted', textContent: 'New playlists can take a minute to sync to your devices.' }),
  );
};

initMusicKit().catch((e) => {
  $('btn-connect').textContent = 'Unavailable';
  $('connect-status').textContent = e.message;
});
