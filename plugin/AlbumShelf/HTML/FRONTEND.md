# Frontend

Dependency-free HTML/CSS/JavaScript served by the LMS plugin. Assets are relative to `/plugins/AlbumShelf/`; native RPC and artwork requests infer an optional reverse-proxy prefix from the page URL. Fonts and interface materials are local. No audio element or browser player exists.

Six square album sleeves appear on separate walnut holders, in three desktop columns or two mobile columns. Real provider artwork is used; failed images show an explicit unavailable-cover placeholder. Selection is a bottom-anchored tilt or a small realistic vinyl reveal, configured in Settings. There is no selection frame. The holder remains stationary. Reduced motion replaces movement with a stronger static shadow.

Every sleeve has a fine paperboard rim and a separately offset cardboard backing, independent of selection. A resting1.3° lean and four directional contact/cast/diffuse shadows separate it from the wall. Walnut holders use a frontal view with a1.1cqw symmetric top face, no one-sided end plane or skew, and a thin front face (4.2% of gallery cover height;3.6% in Now Playing), with their own wall shadow. Holder geometry stays fixed during selection. Desktop typography resolves to116/42/32px and main transport124px at1672px width, with responsive and long-title overrides. The authored rail preserves the native accessible range input and keyboard events.

Two original1254×1254 transparent edge-wear textures and a separate surface-rub texture composite over the provider image; they never replace it. A normalized album-title hash chooses one of two edge patterns and four rotations, stable between wall and Now Playing. `albumshelf.wear` controls opacity from0 to100(default55), including clean artwork at0. These layers have no pointer events, are hidden from accessibility APIs and are absent from missing-art placeholders. Palette extraction still reads the provider image alone. All12 material rasters carry embedded XMP provenance; original PNGs and exact prompts remain in development-only `.impeccable/assets/patina-v3/`.

Roboto is bundled under Apache 2.0. Light is the default wall; dark and artwork-derived palettes are optional. Artwork sampling combines the six visible covers, or the current cover in Now Playing. Focus alone never recalculates the palette. Native LMS image proxy requests keep artwork same-origin for HTTPS and canvas sampling.

Player choice is explicit and stored locally. OK/click replaces only that player's queue with the selected album. Up from the first row reaches the now-playing icon; arrows navigate albums/header controls. Escape/Backspace returns from Now Playing. Settings preserve native input/select keys and close on Escape. All icons have accessible names. No setting, focus change or page opening starts playback.

Controls retreat after 18 idle seconds. The first key only wakes them. After five idle minutes with known stopped playback, one non-selected album may be replaced by an off-screen favourite. Status refreshes every ten seconds. Native pause/resume, previous/next and seeking require explicit actions and a connected player with a queue.

`albumshelf.player`, `.theme`, `.motion` and `.wear` are browser-local preferences. The public URL is stored using native `albumshelf publicurl` commands in LMS's `plugin.albumshelf` preferences and updates Apps links. See the root INTERFACE.md for the wire contract.

`?demo=1` is a labeled offline preview with six illustrative CSS covers. It makes no LMS requests and disables playback/server-setting writes. Test and screenshot fixtures are development-only. Browser tests exercise real rendering and safe API boundaries; live LMS installation, reverse-proxy deployment and physical TV controls need target-device verification.
