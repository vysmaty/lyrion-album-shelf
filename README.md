# AlbumShelf 0.2.3

A standalone Lyrion Music Server plugin: favourite TIDAL albums on a quiet wall, with playback on an **existing selected LMS player**. The browser is a display and remote control.

## What's new

- Six large square sleeves with physical paperboard edges and layered contact/cast shadows, individual thin walnut holders with resolved grain and a fine plaster wall. Locally bundled Roboto; mobile uses two columns.
- Frontal walnut holders with level edges and a narrow, symmetric top face, a slight sleeve resting lean and deeper directional wall shadows. Three original transparent wear textures add irregular scuffed edges and faint surface rubbing over the real artwork. Settings → **Opotřebení obalů** adjusts their intensity from 0 to 100% (default 55%), remembered per browser.
- Two selection animations in Settings: a subtle sleeve tilt or a narrow reveal of a photorealistic vinyl record. Selection uses movement and shadows, without a frame. Reduced-motion preferences suppress movement.
- Light, dark and artwork-derived backgrounds. The artwork palette combines all visible albums and stays stable when selection moves; Now Playing uses its current cover.
- Now Playing resolves native LMS cover IDs as well as artwork URLs, with a current-player fallback. Remote artwork travels through LMS's own image proxy, keeping requests on the page's origin, including HTTPS.
- A configurable public reverse-proxy URL for the standalone Apps link. Now Playing matches the approved large type and transport hierarchy, with a thin authored timeline that retains native keyboard seeking. Minimal icon controls and compact pagination.

## Open and use

Requires LMS 8.5+, configured [TIDAL Local](https://github.com/michaelherger/lms-plugin-tidal), an existing connected player and a modern browser. After installation, open **My Apps → Album Shelf**, follow its web link, or open `/plugins/AlbumShelf/` on LMS. Select the intended player; AlbumShelf never creates a player.

Arrows select an album. OK/Enter or a click explicitly loads it into that player's queue, replacing the current queue. Focus, opening Now Playing, changing settings and ambient rotation never start playback. After 18 seconds the controls retreat; the first key wakes them without an action. After five idle minutes, while playback is stopped, one non-selected cover can rotate into view.

The gear opens Settings. Background and animation choices are remembered per browser. **Veřejná adresa** is stored on LMS: enter a proxy origin such as `https://hudba.example.cz`, or the complete URL `https://hudba.example.cz/lms/plugins/AlbumShelf/`. An empty value restores LMS's default address. This changes the Apps link; configure DNS, TLS and the reverse proxy separately. AlbumShelf infers `/lms/` from the page URL for its RPC and artwork requests. Proxy LMS's native `/jsonrpc.js`, `/imageproxy/` and `/music/` routes as well as `/plugins/AlbumShelf/`.

## Build and test

The runtime has no frontend dependencies. Local checks use Perl core modules, Python 3, Node 18+; browser tests additionally use Playwright and Chromium.

```sh
prove -v tests/backend.t
node --test tests/frontend.test.cjs
npm install
npx playwright install chromium
npm run test:frontend
python3 -m unittest discover -s tests -p 'test_*.py' -v
python3 tools/package.py --output-dir artifacts/build
python3 tools/verify_package.py artifacts/build/AlbumShelf-0.2.3.zip
python3 tools/verify_package.py dist/AlbumShelf-0.1.0.zip
```

On Windows with Git's Perl, set `PERL` to its full executable path; `CHROMIUM_PATH` optionally selects an installed browser. The ZIP has one `AlbumShelf/` root with `Plugin.pm`, `install.xml` and `HTML/`. Builds are byte-reproducible. The packager refuses to overwrite different bytes; use a fresh output directory after source changes.

The repository manifest points to the versioned `v0.2.3/dist/AlbumShelf-0.2.3.zip` archive with a SHA-1 integrity check for LMS. Add `https://raw.githubusercontent.com/vysmaty/lyrion-album-shelf/main/repo.xml` to the additional repositories in LMS plugin settings, then install or update Album Shelf. The previous `dist/AlbumShelf-0.1.0.zip` remains unchanged for compatibility verification. Version-specific tests exercise that old archive; the current regression suite exercises every new build.

For development, `?demo=1` displays clearly labeled illustrative covers with no LMS requests. `tools/preview.cjs` provides an offline fixture preview if the developer's optional `artifacts/reference/` snapshot and cover files exist; it has no connection to LMS. Those private preview files are ignored and excluded from the plugin archive.

## Verification and integration scope

85 Perl assertions execute the actual backend handlers against labeled LMS/TIDAL boundary stubs. Nine Node unit tests and eleven browser checks cover navigation, safe content, native album commands, cover-ID artwork, settings, proxy prefixes, reduced motion, pagination, physical control hierarchy, keyboard seeking and idle behavior. Five Python distribution tests cover metadata, the retained release hashes, archive reproducibility, unsafe paths and extracted-code execution. Browser screenshots use an offline fixture; they do not establish live playback or installation.

Read-only checks of the target server supplied real favourite-album metadata and identified the cover-ID artwork issue. Players were disconnected during final implementation. Live playback, reverse-proxy deployment and a target-server install remain unexercised.

## Integration and licenses

The wire contract is in [INTERFACE.md](INTERFACE.md). Authentication and TIDAL account choice remain with LMS/TIDAL Local. AlbumShelf accepts no credentials. Native LMS access controls apply to playback and the server-wide public-URL setting. Use an authenticated proxy when making LMS available remotely.

AlbumShelf code is MIT licensed; see [LICENSE](LICENSE). Roboto is bundled under Apache 2.0; notices and license are in `HTML/FONT-LICENSE.txt` and `HTML/FONT-APACHE-LICENSE.txt`. Material rasters carry embedded XMP provenance. Actual album artwork is fetched at runtime and remains its owners' property. No TIDAL covers are distributed in the ZIP. This project is unaffiliated with TIDAL or Lyrion.

Upstream contracts were checked against [TIDAL Local](https://github.com/michaelherger/lms-plugin-tidal/blob/master/Plugin.pm) and [LMS](https://github.com/LMS-Community/slimserver): native `tidal_browse` album actions, status/cover handling, image proxy, request dispatch and plugin preferences. No third-party image proxy, analytics or external font service is used.
