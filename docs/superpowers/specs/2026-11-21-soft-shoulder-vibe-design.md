# soft shoulder page: photo with a caption

## Why
The page should have cool vibes and feel like someone posted it, not like someone built it. Mood reference: winter dusk, panel blocks, a phone photo, almost no words. The photo carries the page; the words step back.

## Goals
- The photo is the page: full width, nothing competing with it.
- Type and controls look plain and human, not like a template.

## Non-goals
- No change to the audio, the analyser, or how the spectrum bars react.
- No change to the colors (they already come from the photo).
- No change to the rest of the site.

## Anti-goals
- Anything that reads as "designed": big hero title, icon glyphs, arrows on links, labels above content.
- Moving the photo. It stays completely still.

## Approaches
1. **Plain personal page.** System font, title above the photo, underlined links, word controls. Most genuine, but can read as unfinished.
2. **Photo with a caption (picked).** Photo edge to edge; title and artist small in its bottom-left corner like a caption; one quiet line of word controls under it.
3. **Same layout, new details.** Swap font and glyphs only. Smallest change, but keeps the big title on the banner, which is itself the template look.

Picked 2 because it matches the reference: image first, words as caption.

## The design
- **Photo:** spans the full viewport width (no page container or side margins). Desktop keeps its wide shape (about 2.4:1), capped at 80% of the window height. Mobile goes portrait, 4:5, like a phone photo. Still click-to-play.
- **Caption:** two lines in the photo's bottom-left corner, 20px in from the edges (16px on mobile): "soft shoulder" and, under it, "notyuk" in the muted color, linking home. About 15px and 13px, regular weight, lowercase. The old big title and the "notyuk" header at the top of the page go away.
- **Bars:** unchanged in style and behaviour, but they start at the middle of the photo and run to the right edge, so they never sit under the caption. *(My call.)*
- **Type:** the page drops Space Mono for the system sans: Helvetica Neue, Helvetica, Arial. No web font download. *(My call: plain and cold, like the photo.)*
- **Controls, under the photo, 20px side padding:** line 1 is `play` / `pause` as a word, then the time `0:42 / 3:00`, then the seek line filling the rest. Line 2 is `spotify`, `youtube`, `motion on` / `motion off`, `full screen`, small and muted, as plain text links that underline on hover. No ↗, no ▶/❚❚, no colons.
- **Kept as is:** colors, motion toggle behaviour and saved preference, full screen, keyboard seek, the photo-only fallback when WebGL is missing.

## Left to the builder
Exact spacing between the two control lines, letter-spacing, and the hover color for links.
