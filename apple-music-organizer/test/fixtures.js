// Fake Apple Music API resources shaped like real responses.

let n = 0;
export function song({ name, artist, album = 'Album', genres = [], catalogGenres, isrc, catalogId, type = 'library-songs', id }) {
  const sid = id ?? (type === 'library-songs' ? `i.${++n}` : String(1000 + ++n));
  const res = {
    id: sid,
    type,
    attributes: {
      name, artistName: artist, albumName: album, genreNames: genres, durationInMillis: 200000,
      playParams: { id: sid, kind: 'song', ...(catalogId ? { catalogId } : {}) },
    },
  };
  if (catalogGenres || isrc) {
    res.relationships = {
      catalog: { data: [{ id: catalogId ?? `c${sid}`, type: 'songs', attributes: { name, artistName: artist, genreNames: catalogGenres ?? genres, isrc } }] },
    };
  }
  return res;
}

export function sampleLibrary() {
  n = 0;
  const pop = Array.from({ length: 5 }, (_, i) => song({ name: `Pop Song ${i}`, artist: 'Pop Star', genres: ['Pop', 'Music'], isrc: `USPOP000${i}` }));
  const house = Array.from({ length: 9 }, (_, i) => song({ name: `House Track ${i}`, artist: 'DJ House', genres: ['Dance'], catalogGenres: ['House', 'Electronic', 'Music'], isrc: `GBHOU000${i}` }));
  const techno = Array.from({ length: 3 }, (_, i) => song({ name: `Techno ${i}`, artist: 'Berghain Regular', genres: ['Electronic'], catalogGenres: ['Techno', 'Electronic', 'Music'] }));
  const rap = Array.from({ length: 4 }, (_, i) => song({ name: `Bars ${i}`, artist: 'MC', genres: ['Hip-Hop/Rap', 'Music'] }));
  const jazz = [song({ name: 'So What', artist: 'Miles Davis', genres: ['Jazz'] }), song({ name: 'Blue in Green', artist: 'Miles Davis', genres: ['Jazz'] })];
  const noGenre = [song({ name: 'Voice Memo', artist: 'Me', genres: [] })];
  // Same song saved twice from different albums (remaster) -> duplicate.
  const dupA = song({ name: 'Bohemian Rhapsody', artist: 'Queen', album: 'A Night at the Opera', genres: ['Rock'] });
  const dupB = song({ name: 'Bohemian Rhapsody (Remastered 2011)', artist: 'Queen', album: 'Greatest Hits', genres: ['Rock'] });
  const rock = [dupA, dupB, song({ name: 'Under Pressure', artist: 'Queen & David Bowie', genres: ['Rock'] }), song({ name: 'Paranoid', artist: 'Black Sabbath', genres: ['Hard Rock', 'Rock'] })];

  const librarySongs = [...pop, ...house, ...techno, ...rap, ...jazz, ...noGenre, ...rock];
  const playlists = [
    { id: 'p.mine', attributes: { name: 'Road Trip', canEdit: true, description: { standard: 'my stuff' } } },
    { id: 'p.favs', attributes: { name: 'Favorite Songs', canEdit: false } },
    { id: 'p.empty', attributes: { name: 'Empty', canEdit: true } },
  ];
  const playlistTracks = {
    'p.mine': [pop[0], house[0], dupB, { id: 'i.mv1', type: 'library-music-videos', attributes: { name: 'Video' } }],
    'p.favs': [house[1], house[2], house[3]],
    'p.empty': [],
  };
  const ratings = { [pop[0].id]: 1, [pop[1].id]: 1, [pop[2].id]: 1, [rap[0].id]: -1 };
  return { librarySongs, playlists, playlistTracks, ratings };
}

/** Minimal fetch implementation emulating the endpoints the tool uses. */
export function fakeFetch(lib, { pageSize = 4 } = {}) {
  const calls = [];
  let nextId = 0;
  const json = (status, body) => ({
    ok: status < 400, status, headers: { get: () => null },
    text: async () => (body == null ? '' : JSON.stringify(body)),
  });
  const page = (items, url) => {
    const offset = Number(url.searchParams.get('offset') ?? 0);
    if (!items.length) return json(404, { errors: [{ title: 'Not Found' }] });
    const data = items.slice(offset, offset + pageSize);
    const next = offset + pageSize < items.length ? `${url.pathname}?offset=${offset + pageSize}` : undefined;
    return json(200, { data, ...(next ? { next } : {}) });
  };

  const fetchImpl = async (href, init = {}) => {
    const url = new URL(href);
    const method = init.method ?? 'GET';
    calls.push({ method, path: url.pathname, body: init.body ? JSON.parse(init.body) : undefined });
    const p = url.pathname;

    if (method === 'GET' && p === '/v1/me/library/playlists') return page(lib.playlists, url);
    if (method === 'GET' && p === '/v1/me/library/songs') return page(lib.librarySongs, url);
    let m;
    if ((m = p.match(/^\/v1\/me\/library\/playlists\/([^/]+)\/tracks$/))) {
      const id = decodeURIComponent(m[1]);
      if (method === 'GET') return page(lib.playlistTracks[id] ?? [], url);
      if (method === 'POST') {
        lib.playlistTracks[id] = [...(lib.playlistTracks[id] ?? []), ...JSON.parse(init.body).data];
        return json(204, null);
      }
    }
    if (method === 'POST' && p === '/v1/me/library/playlists') {
      const { attributes } = JSON.parse(init.body);
      const id = `p.new${++nextId}`;
      lib.playlists.push({ id, attributes: { name: attributes.name, description: { standard: attributes.description }, canEdit: true } });
      lib.playlistTracks[id] = [];
      return json(201, { data: [{ id, type: 'library-playlists' }] });
    }
    if (method === 'GET' && (m = p.match(/^\/v1\/me\/ratings\/(library-songs|songs)$/))) {
      const ids = url.searchParams.get('ids').split(',');
      const data = ids.filter((id) => id in lib.ratings).map((id) => ({ id, type: 'ratings', attributes: { value: lib.ratings[id] } }));
      return data.length ? json(200, { data }) : json(404, { errors: [{ title: 'Not Found' }] });
    }
    return json(404, { errors: [{ title: `Unhandled ${method} ${p}` }] });
  };
  return { fetchImpl, calls };
}
