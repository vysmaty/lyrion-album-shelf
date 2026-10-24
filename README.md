# AlbumShelf 0.1.0

A standalone Lyrion Music Server plugin: favourite TIDAL albums on a quiet television shelf, with playback sent to an **existing selected LMS player**. It is not a LyrionJS subpage, audio renderer, Slimproto client, or Home Assistant automation.

## Runtime requirements

- LMS 8.5+ (declared compatibility floor; isolated target-server testing is still required).
- TIDAL Local (`michaelherger/lms-plugin-tidal`) installed and configured in LMS.
- An existing connected player and its normal TIDAL Local account selection.
- A modern TV/browser with JavaScript, Fetch, localStorage and D-pad key events.

No TIDAL tokens, login credentials or personal server addresses are stored by this repository. AlbumShelf calls the existing TIDAL Local favourite-album menu for the selected player; that plugin owns authentication, service requests and account choice. If no account is assigned, TIDAL Local itself may assign its normal default account. AlbumShelf does not create accounts or accept credentials.

## Open and use

After a separately authorized installation, open **My Apps → Album Shelf** and follow the standalone web link, or open `/plugins/AlbumShelf/` on the same LMS origin. Select the existing audio player before loading its collection. The television is display/control only; playback remains on that player.

Arrows select an album; OK/Enter explicitly loads that album into the selected player's queue (replacing the current queue). Focus and ambient rotation never start playback. Controls and labels retreat while idle. Interacting freezes slow cover rotation. The currently-playing view uses native LMS status rather than an invented television player.

The complete wire contract is in [INTERFACE.md](INTERFACE.md). Album listing is read-only. Playback uses native LMS JSON-RPC: `tidal_browse playlist load type:album id:ID`, verified in upstream `_renderAlbum` and `_makeAction`. This command shape is source-verified, **not an exercised real TIDAL playback claim**.

## Build and test (no installation)

Only Perl core modules, Python 3 standard library and Node 18+ are needed for local tests and packaging:

```sh
prove -v tests/backend.t
node --test tests/frontend.test.cjs
python3 -m unittest discover -s tests -p 'test_*.py' -v
python3 tools/package.py --output-dir artifacts/build
python3 tools/verify_package.py dist/AlbumShelf-0.1.0.zip
python3 tools/verify_package.py artifacts/build/AlbumShelf-0.1.0.zip
```

Local test-build output: `artifacts/build/AlbumShelf-0.1.0.zip` and its SHA256 file. The immutable published ZIP remains in `dist/` and on release `v0.1.0`; do not replace it with a rebuild. Current documentation changes mean a new test build can differ from that release without changing runtime code. The packager refuses to overwrite different existing archive bytes. Use a fresh output directory for test builds and a new version for any future release.

The ZIP has **one `AlbumShelf/` root**, directly containing `Plugin.pm`, `install.xml`, `strings.txt` and `HTML/`. It is not a source-repository ZIP. Lyrion's actual `PluginDownloader.extract` strips a matching `AlbumShelf/` (or `Plugins/AlbumShelf/`) prefix before extraction; the published archive is suitable for automatic installation by that code. This is source/layout verification, not a live install claim. Packaging is byte-reproducible and never installs, uploads, restarts LMS or changes a player. GitHub CI tests both the retained release and its fresh build; it retains the latter as a test artifact, not a release or deployment.

## Custom repository (after publication)

Planned additional-repository URL for **Settings → Plugins → Additional repositories**:

```text
https://raw.githubusercontent.com/vysmaty/lyrion-album-shelf/main/repo.xml
```

The repository is currently private, so this anonymous LMS URL is **not yet usable**. It becomes usable only after the manifest is pushed to `main` and the owner explicitly publishes the repository. Do not add GitHub credentials to the LMS URL. The root [repo.xml](repo.xml) pins the actual existing `v0.1.0` release asset, with Lyrion's required **SHA1** `0ebaffb1f1bd13dfe497fc6b336f9881718c9ec0`. Its SHA256 is `fc4a62464337a39101718bf8d0baf71c904c1d34456d3230f9f580f18a27649b`. No `0.1.1` release is needed for this compatible ZIP. See [PUBLICATION.md](PUBLICATION.md) for audit scope, checks and an owner-only publication recipe.

## Installation boundary

This version is delivered as source and an archive, **not installed on the household LMS**. After publication and separate installation approval, use the custom repository on an isolated test server, enable AlbumShelf and restart as requested by LMS. For a manual install, stop the target test server, extract `AlbumShelf/` into its third-party `Plugins/` directory, start it, enable AlbumShelf, and verify the Apps link. Do not overwrite bundled/core plugins. Back up the server configuration before changing a live installation.

Use a separate LMS test instance for the first install. Do not mount household config or media, reuse household player IDs, connect real players, or run a second server with host networking. Testing a stub provider does not verify TIDAL authentication, actual account selection, TLS, service availability, or album playback.

## Safety and limitations

- Every album request requires one valid existing connected player ID; no arbitrary-account fallback is implemented by AlbumShelf.
- The endpoint accepts GET only, filters malformed/non-album entries, deduplicates IDs, suppresses unsafe artwork schemes and secret-bearing provider errors, returns no-store JSON, and times out after 30 seconds.
- No backend write/play endpoint exists. Playback is an explicit browser command to native LMS and is limited by LMS's normal access control. Anyone allowed to control LMS can control its players; do not expose LMS/JSON-RPC to the public internet. Use LMS authentication or a trusted authenticated reverse proxy.
- Album artwork is fetched by the browser from provider-supplied HTTP(S) URLs. HTTPS LMS pages may block HTTP artwork as mixed content. No third-party image proxy, analytics, fonts or CDN is added by AlbumShelf.
- Real favourite retrieval/playback and physical TV-remote ergonomics require a separately authorized end-to-end test. A passing unit suite does not establish those.

## Verification status

The Perl harness executes real AlbumShelf handlers against **explicitly labeled LMS/TIDAL boundary stubs** (63 passing assertions). Five Python tests verify metadata, pinned repository SHA1/SHA256, updater prefix layout, archive integrity/reproducibility, unsafe-path rejection and overwrite refusal. Four browser-independent Node tests pass. Both the actual downloaded release archive and a clean local rebuild pass extracted-code verification. Browser fixture evidence is in `artifacts/frontend-tests.txt`; it is not actual LMS/TIDAL integration. Docker was checked during development but its local daemon was unreachable; an isolated actual-LMS load test could not run. No household LMS was contacted or modified.

## Upstream references

- [TIDAL Local Plugin.pm](https://github.com/michaelherger/lms-plugin-tidal/blob/master/Plugin.pm): `getFavorites`, `_renderAlbum`, `_makeAction`, `getAPIHandler`.
- [TIDAL Local API/Async.pm](https://github.com/michaelherger/lms-plugin-tidal/blob/master/API/Async.pm): favourite retrieval and undefined/error responses.
- [LyrionJS Plugin.pm](https://github.com/JameZUK/LyrionJS/blob/main/plugin/LyrionJS/Plugin.pm): standalone Apps/feed and raw HTTP patterns only. No Slimproto/Bridge code is included or invoked.
- [LMS Client.pm](https://github.com/LMS-Community/slimserver/blob/public/9.0/Slim/Player/Client.pm): `getClient` is a function, not a class method; exact player identity is checked by AlbumShelf.

AlbumShelf code is MIT licensed; see [LICENSE](LICENSE). Album artwork remains the property of its respective rights holders. This project is unaffiliated with TIDAL or Lyrion.
