# AlbumShelf frontend/backend contract (0.1.0)

Standalone page: `/plugins/AlbumShelf/` (HTML/index.html). No Slimproto/browser player or TV audio.

## Read favourite albums

`GET /plugins/AlbumShelf/albums.json?player=<URL-encoded existing LMS player ID>`

200: `{ "albums": [{"id":"123", "title":"Album", "artist":"Artist", "artwork":"https://..."}], "player":"...", "source":"tidal-local" }`.

Errors: `{ "albums": [], "error": "machine_code", "message": "safe human-readable message" }` with HTTP 400 (missing/invalid/unknown player), 503 (TIDAL Local unavailable), 502 (provider failed), 504 (30-second provider timeout), or 405 (non-GET). Only connected existing players are accepted; no implicit fallback to another player. Empty collection is a successful 200. Backend invokes `Plugins::TIDAL::Plugin::getFavorites($client, $cb, {quantity=>2}, {type=>'albums'})`, using TIDAL Local's existing selected-player account. No credentials are accepted or returned. Read-only endpoint; it never changes playback.

## Native LMS JSON-RPC

POST same-origin `/jsonrpc.js`, JSON `{"id":1,"method":"slim.request","params":[PLAYER_ID,COMMAND_ARRAY]}`.

Discover: `params:["",["players",0,999]]` → `result.players_loop` (playerid/name/connected).
Status: `params:[PLAYER_ID,["status","-",1,"tags:alKct"]]` → native LMS result (`mode`, `playlist_loop`, artist/album/title/artwork_url or coverid).
Play explicitly on OK/click only: `params:[PLAYER_ID,["tidal_browse","playlist","load","type:album","id:123"]]`. This exact action shape is verified in upstream TIDAL Local Plugin.pm `_renderAlbum` and `_makeAction`. It replaces the selected player's queue with the album; do not call it on focus or rotation. Treat RPC errors as failures. Browser should preserve selected ID and reject disconnected players; never create a player or play audio in the browser.

Frontend assets are owned separately under plugin/AlbumShelf/HTML/. Backend serves index.html at the standalone root, static assets (root basenames ending .js, .css or .svg) are served by an explicit safe raw route from HTML/, not by a guessed skin mapping. Use same-origin relative paths (e.g. `app.js`, `style.css`).

Upstream reviewed: https://github.com/michaelherger/lms-plugin-tidal/blob/master/Plugin.pm (getFavorites, _renderAlbum, _makeAction); https://github.com/JameZUK/LyrionJS/blob/main/plugin/LyrionJS/Plugin.pm (Apps/feed and addRawFunction only; no bridge/player code reused).
