# AlbumShelf

<!-- impeccable:product-schema 1 -->

## Platform

web

## Product Purpose

Display favourite TIDAL albums as a quiet album wall and control playback on an existing Lyrion Music Server player. The browser is a display and remote control.

## Operating Context

The existing frontend is plain HTML, CSS and JavaScript, served by a Perl LMS plugin. It supports television remote navigation, mouse and keyboard, explicit player selection, an idle display, and a now-playing view.

## Capabilities and Constraints

Preserve explicit playback actions, existing-player targeting, TIDAL Local integration and the dependency-free production frontend. Support a configurable public reverse-proxy URL in app links and artwork served through the browser's current origin. The reported missing now-playing artwork must handle native LMS cover IDs as well as artwork URLs.

The user selected two configurable album-selection animations: a slight sleeve tilt and a partial vinyl reveal. Both must work without a selection frame; distinguish the selected album through motion and shadows. The revealed record must look realistic, with a perfect circular silhouette and detailed groove material.

## Brand Commitments

The user approved the supplied photograph and liked the image proposals: warm light wall, large square album covers, individual small wooden holders. Stay close to the reference. Remove the visible AlbumShelf wordmark. Make the holders lower/thinner while retaining distinct natural grain on each holder. Use icon-only now-playing and back actions, omit the redundant now-playing status label and footer keyboard hints, and keep pagination small at the lower right. Preserve accessible control names. The user requested image proposals before interface implementation.

## Evidence on Hand

Existing source and tests; user-supplied reference photo; read-only snapshot of twelve real favourite albums; native status returning coverid for the current TIDAL track. Live playback and installation have not been exercised during this work.

## Approved implementation

The user approved applying the refined proposals. Version 0.2.3 uses locally bundled Roboto, selectable light/dark/artwork backgrounds, a six-cover wall and both selection motions. Automatic background sampling combines the visible shelf, or uses the current cover in now-playing, and remains stable while selection moves. The source and archive are the delivery scope; live installation, proxy deployment and household playback are not claimed as tested.

The user subsequently rejected the shallow appearance and supplied worn record-sleeve references. The current refinement adds frontal holders with level edges and a narrow symmetric top face, a small resting lean, visible cardboard thickness and separated directional wall shadows. Three original transparent textures add asymmetric worn edges and subtle surface rubbing over real artwork. The browser-local wear slider runs0–100(default55); at0 the artwork is clean. A stable normalized-title hash varies the material between albums and preserves it between the wall and Now Playing. Missing-art placeholders remain unweathered. This explicit request authorizes material patina; actual provider cover images must still be retained.
