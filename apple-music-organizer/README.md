# Apple Music Genre Organizer

Sorts your Apple Music library into genre, subgenre and favorites playlists,
using only Apple's official **MusicKit JS** sign-in and the **Apple Music API**.

- Reads your whole library: saved songs, every playlist, and your Favorites
  (both ★ Favorite ratings and the automatic "Favorite Songs" playlist).
- Works out each song's genre and subgenre from Apple's own metadata
  (catalog `genreNames`, e.g. `["House", "Electronic"]` → **Electronic › House**).
- Finds duplicates (same ISRC, same catalog song, or same title + main artist
  after removing "Remastered" / "feat." tags) so each playlist holds a song once.
- **Shows you a preview first.** Nothing is written until you click *Approve*,
  and you can untick any playlist you don't want.
- Only **creates** new playlists. It never deletes, renames or edits your
  existing playlists, favorites or library.

## What you get

| Playlist | Example | Created when |
|---|---|---|
| Genre | `Genre · Electronic` | genre has ≥ 3 songs (smaller genres go into `Genre · Other`) |
| Subgenre | `Genre · Electronic · House` | subgenre has ≥ 8 songs |
| Favorites by genre | `Favorites · Hip-Hop & Rap` | ≥ 3 favorites in that genre (the rest go into `Favorites · Other`) |
| No genre data | `Genre · Unclassified` | some songs have no genre (can be turned off) |

You can change the thresholds and name prefixes under **Options** in the preview.

Top-level genres include Pop, Rock, Metal, Punk, Indie & Alternative,
Hip-Hop & Rap, R&B & Soul, Electronic, Jazz, Classical, Country, Latin, Reggae,
Blues, Folk & Singer-Songwriter, Soundtrack, African, World, and more. Any Apple
genre not in the mapping becomes its own category. The full mapping is in
[`lib/taxonomy.js`](lib/taxonomy.js) and is easy to edit.

## Setup

### 1. What you need

- An **Apple Developer Program** membership. It's required to make a MusicKit
  key, which the Apple Music API needs. There's no way around it.
- An **Apple Music subscription** on the Apple ID you'll sign in with.
- **Node.js 18 or newer**. There's nothing to `npm install`: the project has no dependencies.

### 2. Create a MusicKit key (one-time, in the Apple Developer portal)

1. Go to [Certificates, Identifiers & Profiles → Identifiers](https://developer.apple.com/account/resources/identifiers/list),
   click **+**, choose **Media IDs**, and register one (for example `media.com.yourname.genreorganizer`).
2. Go to **Keys**, click **+**, give the key a name, tick
   **Media Services (MusicKit, ShazamKit, Apple Music Feed)**, click *Configure*,
   pick the Media ID from step 1, and save.
3. **Download** the `.p8` file. Apple lets you download it only once.
   Note the **Key ID** shown on the key.
4. Find your **Team ID** under [Membership details](https://developer.apple.com/account#MembershipDetailsCard).

### 3. Configure

```bash
cd apple-music-organizer
cp .env.example .env
# put the .p8 file in this folder (it's git-ignored), then edit .env:
#   APPLE_TEAM_ID=...  APPLE_KEY_ID=...  APPLE_PRIVATE_KEY_PATH=./AuthKey_XXXX.p8
```

### 4. Run

```bash
npm start
```

Open **http://localhost:3000** and follow the steps:

1. **Connect Apple Music**: Apple's own sign-in and consent window opens.
   You sign in there; this app never sees your password.
2. **Analyze my library**: reads everything (read-only). This takes about a
   minute for every few thousand songs.
3. **Review**: check the proposed playlists, open any of them to see its songs,
   untick what you don't want, adjust Options, or download the plan as JSON.
4. **Approve & create playlists**: the new playlists are created and filled.
   They show up on all your devices after iCloud syncs them.

To revoke access later, click **Disconnect** in the app, or remove the app
from your Apple ID's connected apps.

### Try it without an Apple account

```bash
npm run demo   # prints the preview for built-in sample data
npm test       # unit + end-to-end tests against a fake Apple Music API
```

## How it works

```
browser (public/app.js)                        local server (server.js, 127.0.0.1 only)
 ├─ MusicKit.configure(developer token) ◄───── GET /api/developer-token (JWT, ES256, signed with your .p8)
 ├─ music.authorize() → Apple sign-in → Music User Token
 ├─ lib/library.js    GET /v1/me/library/songs?include=catalog
 │                    GET /v1/me/library/playlists (+ /{id}/tracks)
 │                    GET /v1/me/ratings/library-songs?ids=…   (Favorites)
 ├─ lib/organizer.js  classify → dedupe → plan → reconcile   (pure, no network)
 ├─ preview UI        you approve
 └─ lib/apply.js      POST /v1/me/library/playlists          (create)
                      POST /v1/me/library/playlists/{new id}/tracks
```

**Safety guarantees in code**, not just by convention:

- `AppleMusicApi.request` refuses any HTTP method other than `GET` and `POST`.
- `AppleMusicApi.addTracks` refuses any playlist that this tool didn't create.
  The one exception is a playlist from an earlier run of this tool, recognised
  by the `[genre-organizer]` tag in its description.
- If a playlist you made already uses a planned name, it's left alone and the
  new one gets a ` (Organized)` suffix.
- Running it again is safe: playlists from a previous run only receive songs
  they're missing, so new songs get added and nothing is duplicated. If a run
  fails halfway, analyze again to finish it.
- The private key stays on the server. The browser only gets a short-lived
  token (12 hours) limited to `http://localhost:<port>`.

## Limitations (from Apple's API)

- **Genre quality depends on Apple's metadata.** Genres are usually set per
  album, and Apple files most hip-hop under one combined "Hip-Hop/Rap" genre.
  That's why `Hip-Hop & Rap` is one genre, and separate *Hip-Hop*, *Rap*, *Trap*
  and similar subgenre playlists appear only when the metadata tells them apart.
  The same goes for "Indie": Apple mostly calls it *Alternative*.
  Songs you uploaded yourself, with no catalog match, may have no genre and
  end up in `Genre · Unclassified`.
- The Apple Music API can't delete, rename or reorder playlists, and can't
  create playlist folders. To undo a run, delete the `Genre · …` and
  `Favorites · …` playlists in the Music app.
- Only songs are organized. Music videos in playlists are skipped.
- New playlists can take a minute or two to appear in the API and on your devices.
