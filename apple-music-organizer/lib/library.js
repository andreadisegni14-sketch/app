// Reads the user's library through the API client and turns it into
// normalized tracks plus a list of existing playlists. Read-only.

import { isGeneratedPlaylist, normalizeResource } from './organizer.js';

// Apple's automatic "Favorite Songs" playlist (iOS 17.1+ / macOS 14.1+),
// in a few common languages. Songs in it count as favorites.
export const FAVORITES_PLAYLIST_NAMES = new Set([
  'favorite songs',
  'favourite songs',
  'brani preferiti',
  'canciones favoritas',
  'morceaux favoris',
  'lieblingssongs',
  'músicas favoritas',
]);

const SONG_TYPES = new Set(['library-songs', 'songs']);

export async function collectLibrary(api, { onProgress = () => {} } = {}) {
  onProgress('Reading your playlists…');
  const rawPlaylists = await api.getLibraryPlaylists();
  const playlists = rawPlaylists.map((p) => ({
    id: p.id,
    name: p.attributes?.name ?? '(untitled)',
    description: p.attributes?.description?.standard ?? '',
    canEdit: p.attributes?.canEdit ?? false,
  }));

  onProgress('Reading your saved songs…');
  const tracks = (await api.getLibrarySongs())
    .filter((r) => SONG_TYPES.has(r.type))
    .map((r) => normalizeResource(r, 'Library'));
  onProgress(`Found ${tracks.length} songs in your library.`);

  const existing = [];
  let skippedVideos = 0;
  for (const [i, p] of playlists.entries()) {
    onProgress(`Reading playlist ${i + 1}/${playlists.length}: ${p.name}`);
    const items = await api.getPlaylistTracks(p.id);
    skippedVideos += items.filter((r) => !SONG_TYPES.has(r.type)).length;
    const songs = items.filter((r) => SONG_TYPES.has(r.type));

    if (isGeneratedPlaylist(p)) {
      // Our own output from a previous run: used to avoid re-adding songs,
      // never treated as a source.
      existing.push({ ...p, tracks: songs.map((r) => normalizeResource(r)) });
      continue;
    }
    existing.push({ ...p, tracks: [] });
    const isFavorites = FAVORITES_PLAYLIST_NAMES.has(p.name.trim().toLowerCase());
    for (const r of songs) {
      const t = normalizeResource(r, `Playlist: ${p.name}`);
      if (isFavorites) t.favorite = true;
      tracks.push(t);
    }
  }
  if (skippedVideos) onProgress(`Skipped ${skippedVideos} music videos (only songs are organized).`);

  onProgress('Checking which songs you marked as Favorite…');
  const libIds = [...new Set(tracks.filter((t) => t.ref.type === 'library-songs').map((t) => t.ref.id))];
  const catIds = [...new Set(tracks.filter((t) => t.ref.type === 'songs').map((t) => t.ref.id))];
  const favLib = await api.getFavoriteIds(libIds, 'library-songs');
  const favCat = catIds.length ? await api.getFavoriteIds(catIds, 'songs') : new Set();
  for (const t of tracks) {
    if (favLib.has(t.ref.id) || favCat.has(t.ref.id)) t.favorite = true;
  }
  onProgress(`Found ${new Set(tracks.filter((t) => t.favorite).map((t) => t.ref.id)).size} favorite songs.`);

  return { tracks, existing };
}
