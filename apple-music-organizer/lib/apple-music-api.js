// Minimal Apple Music API client (https://developer.apple.com/documentation/applemusicapi).
// Works anywhere `fetch` exists. Authentication uses the two official tokens:
//   - developer token: a JWT signed with your MusicKit private key (server side)
//   - Music User Token: returned by MusicKit's authorize() after the user
//     signs in on Apple's own consent screen. This app never sees a password.
//
// Safety: the client cannot delete or rename anything (it has no such
// methods), and it refuses to add tracks to any playlist that was not created
// by this client or explicitly marked writable (playlists from a previous run
// of this tool, identified by the description marker).

const BASE = 'https://api.music.apple.com';
const PAGE_LIMIT = 100;
const RATINGS_BATCH = 50;
const ADD_BATCH = 100;

export class AppleMusicApi {
  constructor({ developerToken, musicUserToken, fetchImpl = globalThis.fetch.bind(globalThis), onLog = () => {} }) {
    if (!developerToken || !musicUserToken) throw new Error('Both developer token and Music User Token are required');
    this.developerToken = developerToken;
    this.musicUserToken = musicUserToken;
    this.fetch = fetchImpl;
    this.log = onLog;
    this.writable = new Set();
  }

  async request(method, path, { query, body } = {}) {
    if (!['GET', 'POST'].includes(method)) throw new Error(`Refusing ${method}: this tool only reads and creates`);
    const url = new URL(path, BASE);
    for (const [k, v] of Object.entries(query ?? {})) if (v != null) url.searchParams.set(k, v);

    for (let attempt = 0; ; attempt++) {
      const res = await this.fetch(url.toString(), {
        method,
        headers: {
          Authorization: `Bearer ${this.developerToken}`,
          'Music-User-Token': this.musicUserToken,
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if ((res.status === 429 || res.status >= 500) && attempt < 5) {
        const retryAfter = Number(res.headers.get?.('Retry-After'));
        const wait = retryAfter > 0 ? retryAfter * 1000 : 500 * 2 ** attempt;
        this.log(`Apple Music API returned ${res.status}, retrying in ${Math.round(wait / 1000)}s…`);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      if (res.status === 204) return null;
      const text = await res.text();
      const json = text ? JSON.parse(text) : null;
      if (!res.ok) {
        const err = new Error(`${method} ${url.pathname} failed: ${res.status} ${json?.errors?.[0]?.detail ?? json?.errors?.[0]?.title ?? ''}`.trim());
        err.status = res.status;
        throw err;
      }
      return json;
    }
  }

  /** Follows `next` links until the collection is exhausted. 404 = empty. */
  async paginate(path, query = {}) {
    const items = [];
    // `next` links carry the offset; limit/include are re-applied on each page.
    const q = { limit: PAGE_LIMIT, ...query };
    let next = path;
    while (next) {
      let page;
      try {
        page = await this.request('GET', next, { query: q });
      } catch (e) {
        if (e.status === 404) break;
        throw e;
      }
      items.push(...(page?.data ?? []));
      next = page?.next ?? null;
    }
    return items;
  }

  /** Like paginate, but retries without `include=catalog` if that is rejected. */
  async paginateWithCatalog(path) {
    try {
      return await this.paginate(path, { include: 'catalog' });
    } catch (e) {
      if (e.status !== 400) throw e;
      this.log(`Catalog details unavailable for ${path}; using library metadata only.`);
      return this.paginate(path);
    }
  }

  // ----- reads ---------------------------------------------------------------

  getLibraryPlaylists() {
    return this.paginate('/v1/me/library/playlists');
  }

  getPlaylistTracks(playlistId) {
    return this.paginateWithCatalog(`/v1/me/library/playlists/${encodeURIComponent(playlistId)}/tracks`);
  }

  getLibrarySongs() {
    return this.paginateWithCatalog('/v1/me/library/songs');
  }

  /**
   * Returns the set of ids the user marked as Favorite (formerly "Loved").
   * `type` is 'library-songs' or 'songs' (catalog).
   */
  async getFavoriteIds(ids, type = 'library-songs') {
    const favorites = new Set();
    for (let i = 0; i < ids.length; i += RATINGS_BATCH) {
      const batch = ids.slice(i, i + RATINGS_BATCH);
      try {
        const res = await this.request('GET', `/v1/me/ratings/${type}`, { query: { ids: batch.join(',') } });
        for (const r of res?.data ?? []) if (r.attributes?.value === 1) favorites.add(r.id);
      } catch (e) {
        if (e.status !== 404) throw e; // 404 = none of these songs are rated
      }
    }
    return favorites;
  }

  // ----- writes (guarded) ----------------------------------------------------

  /** Allows appending to a playlist created by a previous run of this tool. */
  markWritable(playlistId) {
    this.writable.add(playlistId);
  }

  async createPlaylist(name, description) {
    const res = await this.request('POST', '/v1/me/library/playlists', {
      body: { attributes: { name, description } },
    });
    const id = res?.data?.[0]?.id;
    if (!id) throw new Error(`Apple Music did not return an id for new playlist "${name}"`);
    this.writable.add(id);
    return id;
  }

  async addTracks(playlistId, refs, onProgress = () => {}) {
    if (!this.writable.has(playlistId)) {
      throw new Error(`Refusing to modify playlist ${playlistId}: it was not created by this tool`);
    }
    for (let i = 0; i < refs.length; i += ADD_BATCH) {
      const data = refs.slice(i, i + ADD_BATCH).map(({ id, type }) => ({ id, type }));
      await this.request('POST', `/v1/me/library/playlists/${encodeURIComponent(playlistId)}/tracks`, { body: { data } });
      onProgress(Math.min(i + ADD_BATCH, refs.length), refs.length);
    }
  }
}
