# Frontend handoff

This directory is the complete standalone browser frontend. No bundler, external runtime dependency, CDN, font request, audio element, browser player, Slimproto bridge, or credentials. HTML references `style.css`, `core.js`, `app.js` relatively. Backend contract read from root `INTERFACE.md`.

## Backend packaging checklist

- Serve this `index.html` at **`/plugins/AlbumShelf/`**, including the trailing slash (redirect the non-slash path). Serve the three adjacent assets at the same URL prefix with correct MIME types. Existing plugin HTML mapping must be confirmed in the isolated LMS test, not assumed from the fixture browser server.
- Album request: relative `albums.json?player=<encoded selected ID>`.
- Native discovery/status/control: same-origin POST `/jsonrpc.js`, `slim.request`; play uses the exact TIDAL Local action documented in `INTERFACE.md`: `["tidal_browse","playlist","load","type:album","id:123"]`. This replaces the selected player's queue only after explicit OK/click. Errors do not silently fall back to another player.
- Add `node_modules/` and `artifacts/` to the repository's `.gitignore` before staging. This frontend agent owns neither `.gitignore` nor backend files. Screenshots are test output, not shipped assets. There was no git repository at frontend verification time.
- This handoff file can be omitted from the runtime ZIP.

## Interaction

Czech UI; warm medium taupe grain, two thin oak ledges, eight large covers. Fewer than eight favourites leave real empty space; missing images show a neutral music glyph, never invented album art. More albums are paged in groups of eight by D-pad navigation.

First launch requires explicit connected-player selection. Previously explicitly chosen ID is saved in `localStorage['albumshelf.player']`; `?player=<encoded ID>` can select an existing connected player. Invalid/disconnected IDs are not replaced with the first player. Initial focus is on the chooser; after changing player it moves to the first album. Native select uses normal browser select/OK semantics. From the top album row, Up reaches “Právě hraje”; Left/Right navigates header buttons; Down returns to the album. Escape/Backspace closes now-playing view. Tab/mouse also work. Actual TV remote select behavior still needs on-device verification.

Chrome and focus fade after 18 seconds of inactivity. First key only wakes the shelf, without playback/navigation. One off-screen favourite can replace one non-selected cover after five minutes idle; no rotation while interacting, loading/control busy, or server reports playback/unknown status. Every ten seconds the chosen player's status is refreshed. Now-playing is an explicit toggle and pause/resume is an explicit separate control; opening either page never starts playback. No automatic audio-device creation or queue writes.

`?demo=1` is a separately labelled, offline visual preview with eight original CSS cover studies, **not claimed user content**. It disables player choice and playback, and does not make LMS requests.

## Tests / evidence

`package.json` contains only the Playwright development dependency and a frontend test script. Production assets require no npm install.

Portable setup: `npm install --ignore-scripts --no-package-lock` then `npx playwright install chromium`, then `npm run test:frontend`. Alternatively set `CHROMIUM_PATH` to an already available Chromium executable.

Exact command used successfully in this environment:

```
NODE_PATH=/opt/data/home/.npm/_npx/420ff84f11983ee5/node_modules \
CHROMIUM_PATH=/opt/hermes/tools/chromium-1208/chrome-linux64/chrome \
node --test tests/frontend*.cjs
```

The initial Playwright browser download timed out; tests instead used the real preinstalled Chromium. Test-first core cycles and browser regression red/green runs were exercised. Browser tests use an explicitly isolated HTTP fixture with synthetic API responses, not live LMS/TIDAL. They verify real HTML/JS rendering and real artwork image pixels, eight-cover grid, explicit target and preservation, exact native play command with duplicate prevention, remote focus, safe remote text/art, empty/provider errors, manual pause/resume, idle wake behavior and virtual-clock five-minute rotation inhibition during playback.

Screenshots generated at 1920×1080:

- `artifacts/frontend-1920x1080.png` — active labelled demo.
- `artifacts/frontend-idle-1920x1080.png` — uncluttered idle labelled demo.

Not verified here: real TIDAL favourites or playback, installed LMS static MIME/path mapping, authenticated server transport, actual TV remote/fullscreen/brightness. Do not claim these as exercised or install/restart a live server without separate approval.
