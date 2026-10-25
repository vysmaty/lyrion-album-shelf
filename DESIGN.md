---
name: AlbumShelf
description: A tactile record wall with provider artwork, adjustable paper wear, frontal walnut holders and layered
  depth.
colors:
  wall: '#fbf8f2'
  ink: '#352e27'
  muted: '#716455'
  focus: '#806044'
  wall-dark: '#342b2c'
  ink-dark: '#f1eadf'
  muted-dark: '#c9bfb1'
  focus-dark: '#d6bd99'
  wall-artwork-fallback: '#342b2e'
  walnut: '#72503a'
  vinyl: '#141312'
  connected: '#717b34'
  thumb-border: '#c4a88b'
  thumb-light: '#e8d3bb'
  thumb-shade: '#b99c7d'
  paper-backing: '#827261'
typography:
  display:
    fontFamily: Roboto, sans-serif
    fontSize: clamp(36px, 6.94vw, 116px)
    fontWeight: 700
    lineHeight: 1.04
    letterSpacing: -0.025em
  headline:
    fontFamily: Roboto, sans-serif
    fontSize: clamp(28px, 3vw, 48px)
    fontWeight: 500
    lineHeight: 1.5
  title:
    fontFamily: Roboto, sans-serif
    fontSize: clamp(24px, 2.15vw, 36px)
    fontWeight: 500
    lineHeight: 1.15
  caption-artist:
    fontFamily: Roboto, sans-serif
    fontSize: clamp(16px, 1.4vw, 24px)
    fontWeight: 400
  now-artist:
    fontFamily: Roboto, sans-serif
    fontSize: clamp(22px, 2.51vw, 42px)
    fontWeight: 400
    lineHeight: 1.2
  now-album:
    fontFamily: Roboto, sans-serif
    fontSize: clamp(18px, 1.92vw, 32px)
    fontWeight: 400
    lineHeight: 1.3
  body:
    fontFamily: Roboto, sans-serif
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: Roboto, sans-serif
    fontSize: 15px
    fontWeight: 400
  control:
    fontFamily: Roboto, sans-serif
    fontSize: 18px
    fontWeight: 400
  display-long:
    fontFamily: Roboto, sans-serif
    fontSize: clamp(36px, 5.4vw, 96px)
    fontWeight: 700
    lineHeight: 1.04
    letterSpacing: -0.025em
  display-very-long:
    fontFamily: Roboto, sans-serif
    fontSize: clamp(30px, 4.2vw, 70px)
    fontWeight: 700
    lineHeight: 1.04
    letterSpacing: -0.025em
  pagination:
    fontFamily: Roboto, sans-serif
    fontSize: 16px
    fontWeight: 400
  time:
    fontFamily: Roboto, sans-serif
    fontSize: clamp(16px, 1.2vw, 20px)
    fontWeight: 400
rounded:
  square: '0'
  control: 4px
  panel: 8px
  circle: 50%
  sleeve: clamp(1px, 0.65cqw, 4.5px)
  holder: 0.5px
spacing:
  field: 8px
  icon: 10px
  tools: 14px
  heading: 16px
  panel: 24px
  mobile-stack: 40px
components:
  button-icon:
    backgroundColor: transparent
    textColor: '{colors.ink}'
    typography: '{typography.control}'
    rounded: '{rounded.control}'
    padding: '{spacing.icon}'
    size: 48px
  button-transport:
    backgroundColor: '{colors.ink}'
    textColor: '{colors.wall}'
    rounded: '{rounded.circle}'
    padding: '{spacing.icon}'
    size: clamp(80px, 7.42vw, 124px)
  button-outline:
    backgroundColor: transparent
    textColor: '{colors.ink}'
    rounded: '{rounded.control}'
    padding: 10px 15px
  field:
    backgroundColor: '{colors.wall}'
    textColor: '{colors.ink}'
    rounded: '{rounded.control}'
    padding: '{spacing.field}'
  player-navigation:
    backgroundColor: transparent
    textColor: '{colors.ink}'
    typography: '{typography.control}'
    padding: 9px 2px
  pagination:
    textColor: '{colors.ink}'
    typography: '{typography.pagination}'
  album:
    backgroundColor: transparent
    rounded: '{rounded.sleeve}'
    padding: '0'
    width: var(--cover-size)
    height: var(--cover-size)
  settings:
    backgroundColor: '{colors.wall}'
    textColor: '{colors.ink}'
    rounded: '{rounded.panel}'
    padding: 20px 24px 24px
    width: min(360px, calc(100vw - 32px))
  seek:
    backgroundColor: transparent
    textColor: '{colors.ink}'
    rounded: '{rounded.control}'
    width: 100%
    height: 24px
  wear-range:
    backgroundColor: '{colors.wall}'
    textColor: '{colors.focus}'
    width: 100%
    height: 44px
    padding: '0'
---



# Design System: AlbumShelf

## Overview

**Creative North Star: "The Quiet Record Wall"**

A domestic record wall gives real album artwork room to lead. Fine plaster relief, thin paperboard edges, frontal walnut supports and layered directional shadows create the physical character. Adjustable asymmetric paper wear adds the handled-record detail approved by the user. Locally bundled Roboto and compact icons keep controls quiet and readable from a distance. The supplied photograph, approved shelf composition and reattached now-playing reference establish this same visual world; material detail must remain legible at the rendered size.

The implemented system has a light wall by default, an explicit dark wall and a bounded artwork-derived wall. A constant physical rim, offset backing and slight resting pose give every sleeve depth; selection is communicated separately through one physical movement. Wear is an independent, browser-local material setting that can be switched fully off. There is no visible product wordmark, selection frame, redundant now-playing status label or footer keyboard-help strip. This document records the production interface in version 0.2.3; current source defines its tokens and behavior.

**Key Characteristics:**

- Provider artwork supplies the strongest color and visual detail beneath optional transparent wear.
- Fine plaster, a constant paperboard rim and tiny corners remain resolved at display size.
- Six individually grained walnut holders have a thin frontal fascia and shallow symmetric top face.
- Four directional shadow layers, offset paper backing and a subtle resting pose scale with each sleeve.
- Roboto, restrained header icons and larger filled transport icons carry the interface.
- Album selection uses motion and shadow without a selection border, outline, ring or glow.
- Adjustable wear remains stable between views and disappears completely at zero.

<!-- Evidence boundary: the historical numerical gate remains failed at 0.5465. Current captures use decoded real provider artwork, whose content differs from the generated mockup. No comp equality, live installation or household playback is claimed. -->

## Colors

Warm neutral wall and text roles frame provider artwork. Frontmatter owns the normative color primitives; textures, lighting, gradients, shadows and transparent wear extend them without replacing factual cover images. The artwork image element and URL remain intact, and palette sampling reads its original pixels rather than the composited wear.

### Primary

- **Warm Brown Ink** (`ink`): light-wall text, icons, completed seek rail and the base of the filled transport control.
- **Walnut Focus** (`focus`): visible keyboard focus on controls and fields outside album sleeves.
- **Ivory Ink** (`ink-dark`) and **Sand Focus** (`focus-dark`): readable foreground and control focus on dark and artwork-derived walls.

### Neutral

- **Ivory Plaster Base** (`wall`): raw light-wall ground and light control surfaces. The fine plaster raster is (1024 × 1024px), tiled at (400px), normal-blended at opacity (0.6). A separate `linear-gradient(110deg, #fff6ed05 20%, transparent 50%, #321d0d25)` supplies broad physical lighting with a stronger falloff on the right. Material plus lighting, rather than a flat swatch, defines the rendered wall.
- **Warm Taupe** (`muted`): secondary metadata, field strokes and the unfinished seek rail, whose muted color is mixed to (35%) against transparency.
- **Warm Charcoal Plum** (`wall-dark`): the manual dark wall. **Warm Linen** (`muted-dark`) supplies its secondary text.
- **Artwork Plaster Anchor** (`wall-artwork-fallback`): fallback and chromatic anchor for artwork mode. Dark and artwork-derived walls preserve visible plaster with soft-light blending at opacity (0.75), filtered by `grayscale(1) brightness(.55) contrast(1.8)`. Their broad lighting uses the gentler right falloff `#10080714`.
- **Walnut Base** (`walnut`): ground beneath six separate resolved grain rasters; a flat fill cannot replace the grain.
- **Paperboard Backing** (`paper-backing`): the offset physical thickness under each cover.
- **Pressed Vinyl** (`vinyl`): the dark base beneath the realistic groove/reflection raster.
- **Sand Thumb** (`thumb-border`, `thumb-light`, `thumb-shade`): a warm rim and diagonal light-to-shade gradient for the seek thumb.
- **Connected Olive** (`connected`): only the player-connection dot, not an album-selection accent or now-playing label.

**The Stable Wall Rule.** Sample all loaded covers on the visible shelf, or the current cover in now-playing; do not recolor as selection moves. Average each RGB channel, subtract the mean of those three channels, multiply the difference by (0.2), clamp each adjustment to (-8…8), then add it to the warm anchor channels (52, 43, 46) and round. Dark text roles remain fixed; monochrome art retains a warm plaster ground.

## Typography

**Display Font:** Roboto, with sans-serif fallback.  
**Body Font:** Roboto, with sans-serif fallback.

Regular (400), medium (500) and bold (700) are bundled locally as TTF files. Weight and scale distinguish the current track from its metadata. Use Czech interface copy and accessible labels for icon-only controls. Wrap factual titles rather than truncating or replacing them to match a reference.

### Hierarchy

- **Display** (`display`): bold current-track title with balanced wrapping, compact leading and slightly tightened tracking. At a (1672px) desktop width, the title/artist/album hierarchy reaches approximately (116px / 42px / 32px).
- **Long Display** (`display-long`, `display-very-long`): titles longer than (18 characters) use the first smaller clamp; titles longer than (42 characters) use the second. Their respective maximum sizes are (96px) and (70px). Both keep complete text.
- **Headline** (`headline`): medium loading, empty and connection-state headline; accompanying copy is limited to (65ch).
- **Title / Caption Artist** (`title`, `caption-artist`): medium selected-album title and regular muted artist below it; mobile uses (23px / 16px).
- **Now Artist / Album** (`now-artist`, `now-album`): regular metadata below the current title; mobile uses (24px / 19px).
- **Body / Label / Control** (`body`, `label`, `control`): settings support text, field labels and quiet header navigation. The now-playing header uses (20px) text. Pagination and time labels have their own tokens and use tabular numerals.

At widths (601–900px), every current-title variant uses `clamp(30px, 4.5vw, 50px)`. At widths up to (600px), every variant becomes (38px).

**The Artwork First Rule.** Keep controls and metadata subordinate to the cover while preserving the approved now-playing scale. Do not add a display wordmark or a status eyebrow above the current track.

## Layout

The desktop shelf contains six equal square sleeves in three columns and two rows. Cover size is `min(21.2vw, calc((100svh - 225px) / 2))`; horizontal gaps are `clamp(26px, 3vw, 56px)` and row gaps are `clamp(24px, 3.5vh, 40px)`. The centered wall begins at `max(82px, 9vh)`. This composition belongs to the album-wall surface, not every future product surface.

The fixed shelf header sits at top (16px), left (3.2%) and right (2.8%). Its tool row has a gap (14px). In now-playing, the header moves down to (38px) and its icons enlarge. The footer aligns the selected caption at lower left and compact pagination at lower right, above a bottom inset (28px). Pagination appears only when more than six albums exist.

Now-playing places a large cover left and title, artist, album, timeline and transport right. Desktop columns are `min(42vw, calc(100svh - 240px)) minmax(0, 1fr)` with a gap (6.3vw), within left (10%), right (4%), top (14.2vh) and bottom (12vh) bounds. Metadata shifts down by (3.3vh). The now-playing holder retains its approved width (46.5% of the cover); its thin frontal fascia is topped by a narrow symmetric plane with horizontal front and rear edges. From (601px) through (900px), the cover becomes (41vw), the gap becomes (5vw), metadata loses its vertical shift, and type and transport tighten.

At widths up to (600px), the page scrolls. The shelf reflows to two columns with side margins (24px), top margin (100px) and gaps (30px × 24px). Now-playing stacks cover above metadata with a gap (40px); its cover is capped at (360px). Header top returns to (12px), icon targets remain at least (44px), and footer content flows below the covers. Intermediate and mobile layouts remove the metadata shift.

## Elevation & Depth

Depth is physical and directional. At rest, the sleeve uses `rotateX(1.3deg) rotateY(-.35deg)` about its bottom center. The shared paperboard backing shifts by (.28cqw, .42cqw), revealing a thin edge behind the image. Four larger contact/cast/falloff shadows separate the cover from plaster. Shelf and now-playing art sit in inline-size containers with perspective (1100px), so `cqw` distances scale with the individual sleeve rather than the viewport.

### Shadow Vocabulary

- **Sleeve rest / now-playing** (`--rest-shadow`, inherited by `--sleeve-shadow`): `.25cqw .4cqw .5cqw #120c0880, 1.4cqw 2.4cqw 2.8cqw -.6cqw #140d0a88, 2.8cqw 5cqw 6cqw -1.4cqw #140d0a55, 4cqw 7cqw 9cqw -2cqw #140d0a26`.
- **Tilt selection**: `.3cqw .6cqw 1.2cqw #120c0866, 1.8cqw 3.5cqw 5cqw -.5cqw #140d0a66, 3.5cqw 6.5cqw 9cqw -1.4cqw #140d0a44` lengthens the cast as the sleeve tilts.
- **Reduced-motion selection**: `.25cqw .4cqw .5cqw #120c08aa, 1.4cqw 2.4cqw 2.8cqw -.6cqw #140d0ab3, 2.8cqw 5cqw 6cqw -1.4cqw #140d0a66, 4cqw 7cqw 9cqw -2cqw #140d0a33` provides a stronger four-layer static selection shadow while the sleeve retains `--rest-pose`, the vinyl returns to its hidden position and all transitions are suppressed.
- **Paperboard backing**: `inset -.5px -1px 1px #2e1b1099` shades the exposed thickness.
- **Sleeve edge**: `inset .6px .7px .7px #fff8, inset -.6px -.9px 1px #100a0899` supplies constant edge relief.
- **Vinyl**: `2px 4px 7px -3px #241c1666` sits behind the sleeve. Vinyl mode retains the four-layer resting sleeve shadow.
- **Holder cast**: `.2cqw .5cqw .6cqw #12090599, .9cqw 1.7cqw 2cqw -.3cqw #140b0670, 2cqw 3cqw 3.8cqw -.6cqw #140b064d` grounds the frontal support. Shallow top and fascia shading appear in the sidecar component.
- **Transport**: `inset 0 1.5px 1px #fff4, 0 2px 5px #100a0726` creates its restrained pressed surface.
- **Settings panel**: `3px 12px 40px -8px #17110c70` raises the temporary surface above the wall.

**The Stationary Holder Rule.** Move only the sleeve or vinyl during selection. The frontal holder remains a separate stationary sibling.

## Shapes

Sleeves preserve exact square proportions with tiny physical corners (`rounded.sleeve`). The fine paperboard raster, `sleeve-paper.webp`, appears both as offset backing and as a perimeter masked to `clamp(.7px, .18cqw, 1.35px)` at opacity (0.7). Rim, backing, corner relief and edge shading exist across states; they are physical construction rather than a selected-state frame. Wear is a separate transparent surface layer, not a uniform outline.

Vinyl remains a mathematical circle (radius 50%), inset (1.5%) within the sleeve and covered by its front face. Its photographic raster supplies grooves and reflections while CSS defines the circular silhouette.

Each shelf holder has a thin frontal fascia: width (33%), height (4.2%), left offset (33.5%) and top position `calc(100% - .15cqw)`. Mobile general fascia height is (5%). Now-playing retains width (46.5%) and left offset (26.75%) with a slimmer fascia height (3.6%). The six distinct (1000 × 100px) grain samples remain fitted to the holder front. A shallow top face rises (1.1cqw) above the fascia, with grain fit (100% × 500%) and brightness (1.12). Its symmetric `polygon(2% 0, 98% 0, 100% 100%, 0 100%)` keeps front and rear edges horizontal. The holder has no transform, skew or separate end plane. Small insets articulate the top and fascia underside; corners remain just (0.5px). This nearly straight frontal construction follows the approved mockups while retaining the sleeve's existing depth and wall-shadow separation.

Controls and settings retain modest radii. Main transport and seek thumb are circular. Fields and utility buttons retain muted strokes. The selection-frame prohibition does not remove the constant physical rim, ordinary utility focus or approved asymmetric wear.

## Components

### Buttons

Header and return actions remain icon-only with accessible names. Desktop hit areas are at least (48px), with line icons (28px); now-playing header icons are (30px). Stroke width is (1.6), with round caps and joins. Mobile uses at least (44px) targets and (24px) icons. Hover adds a (7%) ink wash. Utility focus is a (2px) focus-colored outline offset by (4px); disabled controls reduce opacity to (0.4).

The main transport diameter is `clamp(80px, 7.42vw, 124px)`. It uses a subtle (145deg) light-to-dark ink gradient, inverse wall-colored icon and the transport shadow. Its play/pause icon occupies (58%) of the circle. Side actions are (64px) with filled previous/next symbols (48px), separated by `clamp(28px, 4.2vw, 70px)` and a top margin (24px). Intermediate transport is (64px) with smaller icons and gap (18px). Mobile transport is (80px), side actions (48px), side icons (36px) and gap (28px).

The outlined utility button serves retry and public-address saving. Do not introduce a competing high-chroma action style.

### Album Sleeve and Holder

The whole cover is a button. Hover or focus selects it; clicking or Enter explicitly plays it. The current selection has `aria-current` and is the shelf tab stop. Selection never adds a border, outline, ring or glow; the constant material rim does not change state.

**Tilt / B** moves from the slight resting pose to `rotateX(-3deg)`, anchored at the lower edge within perspective (1100px), using the longer selection shadow. **Vinyl / C** translates the circular record right by (8%) of its own width, exposing a narrow crescent while retaining the resting sleeve pose and four-layer shadow. Both enter once over (260ms) with `cubic-bezier(.16, 1, .3, 1)` and never pulse or loop. Reduced motion preserves the static resting sleeve pose, hides the vinyl reveal and suppresses transitions while retaining the stronger four-layer static selection shadow.

Production artwork URLs and original image pixels stay intact. External covers use the native LMS image proxy; now-playing also resolves native cover IDs and current-cover fallback. Missing covers use the quiet music icon and text label, without aging. Paper/plaster/wood origins and prompts remain in `.impeccable/assets/materials-v2/provenance.json`.

### Adjustable Jacket Wear

The user approved distressed sleeve overlays as a refinement of this same physical world. Two asymmetric transparent edge materials and one faint face-rub material add paper fibers, nicks and subtle handling marks over loaded artwork. The three original RGBA images are (1254 × 1254px); the shipped lossless WebP files preserve native alpha and embedded XMP provenance. Exact prompts and originals are retained under `.impeccable/assets/patina-v3/`. No licensed reference asset or generated replacement album image is used.

The layer has `pointer-events: none`, inherits the sleeve corners, uses `grayscale(.75)` on the overlay only and reads opacity from `--wear`, default (0.55). Its face-rub pseudo-layer has relative opacity (0.35). A stable normalized-title hash chooses one of two edge patterns and one of four quarter-turn rotations, producing eight combinations. The title normalization trims and lowercases text and removes a trailing `[E]` marker. Gallery and now-playing resolve the same finish for the same normalized album title; focus, transport updates and theme changes do not randomize it.

The native settings slider is labeled **Opotřebení obalů**, ranges from (0–100) in steps of (5), defaults to (55), displays a percentage and persists in browser-local `albumshelf.wear`. Zero fully hides aging without removing the constant physical rim, backing or shadows. Missing artwork receives no aging. Wear does not modify the image URL, underlying colors or the original-pixel palette sampling; preserve title/artwork readability beneath it.

### Navigation

The player selector remains a quiet native select beside an (8px) connection dot. Now-playing uses vertical bars; return uses an arrow. Both retain Czech accessible names. Small pagination appears only when required; it uses (44px) targets and (19px) chevrons, with no keyboard-help strip.

After idle time (18 seconds), chrome fades over (260ms), the cursor hides and sleeves return to `--rest-pose` and the four-layer `--rest-shadow` stack. Waking restores controls. There is no now-playing status dot or label beside the current title.

### Inputs / Fields

Settings fields have wall-colored surfaces, muted strokes, control radii and minimum height (44px), with visible utility focus. Placeholder text uses the muted role at full opacity.

Seeking remains a native keyboard-operable range input with authored visuals. A (24px) input area contains a (4px) rounded rail; `--progress` controls the ink-filled portion against the muted remainder. The circular sand thumb is (18px) including its border: WebKit declares (18px), while Firefox declares a (16px) content box plus its border. The thumb uses a (135deg) gradient and small inset/cast shadow. Elapsed and duration labels use ink and tabular numerals. Native input keys remain available, and unavailable transport disables seeking.

### Settings Panel and Feedback

The elevated wall-colored settings panel has maximum width (360px), its established padding and corners, and scrolls within the viewport. Theme, motion, jacket wear and player preferences stay browser-local; the public reverse-proxy address is server-stored. Form status appears beside saving.

Transient feedback uses an ink toast with wall-colored text and an opacity transition (180ms). Theme changes transition wall and text colors over (400ms) with `ease-out`. Reduced motion disables these transitions too.

## Do's and Don'ts

### Do:

- **Do** let real provider covers supply the strongest color and visual detail beneath the approved transparent wear.
- **Do** preserve resolved plaster, constant paperboard rims and six separate walnut grains at final display size.
- **Do** scale the four-layer resting shadows, paper backing and shallow frontal holder top with each cover, keeping holders stationary during selection.
- **Do** retain accessible names, readable contrast, visible utility focus and native range keyboard behavior.
- **Do** retain the static selection shadow for reduced motion.
- **Do** keep wear independently adjustable, stable between views, fully absent at zero and absent on missing artwork.
- **Do** keep artwork-derived walls on the warm bounded anchor and stable as selection moves.

### Don't:

- **Don't** add a product wordmark, redundant now-playing status label or footer keyboard-help strip.
- **Don't** turn the constant physical rim into a selection border, outline, ring or glow.
- **Don't** flatten holders into a continuous shelf or reuse one grain across every holder.
- **Don't** substitute generated album artwork, counterfeit printed lettering or apply a color wash while adding the approved material wear.
- **Don't** loop, pulse or animate the wooden holder during selection.
- **Don't** treat documentation or mockup similarity as evidence of a passed pixel gate, live installation or successful playback.
