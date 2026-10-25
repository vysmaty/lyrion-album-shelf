# AlbumShelf frontend/backend contract (0.2.3)

Standalone page: `/plugins/AlbumShelf/` (HTML/index.html). No Slimproto/browser player or TV audio.

## Read favourite albums

`GET /plugins/AlbumShelf/albums.json?player=<URL-encoded existing LMS player ID>`

200: `{ "albums": [{"id":"123", "title":"Album", "artist":"Artist", "artwork":"https://..."}], "player":"...", "source":"tidal-local" }`.

Errors: `{ "albums": [], "error": "machine_code", "message": "safe human-readable message" }` with HTTP 400 (missing/invalid/unknown player), 503 (TIDAL Local unavailable), 502 (provider failed), 504 (30-second provider timeout), or 405 (non-GET). Only connected existing players are accepted; no implicit fallback to another player. Empty collection is a successful 200. Backend invokes `Plugins::TIDAL::Plugin::getFavorites($client, $cb, {quantity=>2}, {type=>'albums'})`, using TIDAL Local's existing selected-player account. No credentials are accepted or returned. Read-only endpoint; it never changes playback.

## Native LMS JSON-RPC

POST same-origin `/jsonrpc.js`, JSON `{"id":1,"method":"slim.request","params":[PLAYER_ID,COMMAND_ARRAY]}`.

When the page is mounted at `/lms/plugins/AlbumShelf/`, the frontend uses `/lms/jsonrpc.js` and the same `/lms/` prefix for native artwork routes. Asset and album requests are relative to the plugin page. The backend redirects a missing trailing slash with a relative Location, preserving an external proxy prefix.

Discover: `params:["",["players",0,999]]` → `result.players_loop` (playerid/name/connected).
Status: `params:[PLAYER_ID,["status","-",1,"tags:alKct"]]` → native LMS result (`mode`, `playlist_loop`, artist/album/title/artwork_url or coverid).
Play explicitly on OK/click only: `params:[PLAYER_ID,["tidal_browse","playlist","load","type:album","id:123"]]`. This exact action shape is verified in upstream TIDAL Local Plugin.pm `_renderAlbum` and `_makeAction`. It replaces the selected player's queue with the album; do not call it on focus or rotation. Treat RPC errors as failures. Browser should preserve selected ID and reject disconnected players; never create a player or play audio in the browser.

Transport uses native `['pause',1|0]`, `['playlist','index','-1'|'+1']` and `['time',SECONDS]` commands only after an explicit user action on a connected player with a queue. Opening the view does not send them.

## Public URL preference

Query: `params:["",["albumshelf","publicurl","?"]]`.
Set: `params:["",["albumshelf","publicurl","https://hudba.example.cz/plugins/AlbumShelf/"]]`.
Reset: the setter with an empty string. Result: `{"publicurl":"configured-or-empty", "url":"effective standalone link"}`. The origin-only form expands to `/plugins/AlbumShelf/`; full paths can include a proxy prefix. HTTP(S) only, with no credentials, query or fragment. Invalid values return native bad-parameters status and leave the stored value intact. Preference namespace: `plugin.albumshelf`, key `publicUrl`. Both Apps feed formats use the effective URL. This is not a proxy/DNS/TLS provisioning API.

## Artwork and assets

Now Playing tries a safe `artwork_url`, then `/music/COVER_ID/cover_800x800_o.jpg`, then `/music/current/cover_800x800_o.jpg?player=ID&track=CACHE_KEY`. It also accepts native artwork track IDs. Failure advances to the next candidate and finally a truthful missing-cover placeholder. Remote HTTP(S) artwork uses LMS's native `/imageproxy/ENCODED_URL/image_800x800_o.jpg`; native music/imageproxy paths are rebased to the current origin, avoiding private-host and mixed-content URLs. Palette sampling can therefore read same-origin artwork pixels. A failed image uses a neutral background.

Frontend assets live in plugin/AlbumShelf/HTML/. Explicit safe-basename routes serve .js, .css, .svg, .webp, .png, .ttf and .txt files with matching MIME types and nosniff. Use relative asset URLs. Artwork comes from the provider/native LMS at runtime; the ZIP contains only interface materials and locally licensed fonts.

Browser-local preferences: `albumshelf.player`, `albumshelf.theme` (`light|dark|artwork`), `albumshelf.motion` (`tilt|vinyl`) and `albumshelf.wear` (0–100, default55). Wear changes only the opacity of transparent interface layers; provider artwork URLs and palette sampling remain unchanged. A normalized album-title hash chooses a stable edge variant and quarter-turn shared by wall and Now Playing. Missing-art placeholders receive no wear layer. Page size is six; keyboard columns are three on desktop, two at widths up to600px. No selection outline is drawn; shadow and depth carry focus, including a static stronger shadow with reduced motion.

Upstream reviewed: https://github.com/michaelherger/lms-plugin-tidal/blob/master/Plugin.pm (getFavorites, _renderAlbum, _makeAction); https://github.com/JameZUK/LyrionJS/blob/main/plugin/LyrionJS/Plugin.pm (Apps/feed and addRawFunction only; no bridge/player code reused).
