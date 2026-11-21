# soft shoulder: photo with a caption — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle `/soft-shoulder` so the still photo spans the full width, the title and artist sit as a small caption in its corner, and the type and controls are plain words in the system sans.

**Architecture:** Three files change. `visualizer.ts` learns where the bars start and end, so they sit in the right half of the photo. `ReleasePlayer.tsx` moves the caption into the stage and switches to word controls. `page.tsx` and `release.module.css` drop the header and container, set the full-bleed photo and the system font.

**Tech Stack:** Next.js 16 App Router, React 19, WebGL1 fragment shader, CSS modules. No test runner in the repo: verification is `eslint`, `tsc`, and checks in the in-app browser against the dev server (`portfolio-dev` in `.claude/launch.json`).

**Spec:** `docs/superpowers/specs/2026-11-21-soft-shoulder-vibe-design.md`

## Global Constraints

- The photo never moves: no drift, zoom, grain or brightness change. Only the bars update.
- Font on this page: `"Helvetica Neue", Helvetica, Arial, sans-serif`. No web font download. Rest of the site keeps Space Mono.
- Copy is lowercase. No ↗, no ▶ / ❚❚, no colons in control labels.
- Colors stay as defined on `.shell` in `release.module.css`.
- Edge inset: 20px desktop, 16px below 700px wide. Used by caption, bars' right edge and baseline, and the control rows.
- Commit only when the user asks. Commit messages are short one-liners with no Co-Authored-By trailer.

## Review Focus

1. **320px-wide phones:** caption and bars must not overlap; the second control row wraps cleanly.
2. **Wide, short windows (e.g. 1920×700):** the photo is capped at 80vh, so the play row stays visible without scrolling.
3. **Full screen:** the photo fills the screen, the caption stays bottom-left, the controls stay visible below it.
4. **No WebGL:** the fallback still image shows with the caption on top.
5. **Motion off while playing:** the bars stay flat, audio keeps playing, the button reads `motion off`.

---

### Task 1: Bars live in the right half of the photo

**Files:**
- Modify: `app/soft-shoulder/_components/visualizer.ts`
- Modify: `app/soft-shoulder/_components/ReleasePlayer.tsx:42-44` (`barCount` caller)

**Interfaces:**
- Produces: `export function barSpan(cssWidth: number): { left: number; right: number; inset: number }` in `visualizer.ts`, in CSS px. `inset` = 16 if `cssWidth < 700` else 20; `left = cssWidth * 0.5`; `right = inset`.
- Produces: the shader takes `uLeft`, `uRight`, `uInset` (CSS px, multiplied by `uDpr` inside) in place of `uMargin`. Bar baseline sits `uInset` above the bottom edge.
- `ReleasePlayer` computes the bar count from the span width: `barCount(w - span.left - span.right)` where `w = canvas.clientWidth`.

- [ ] **Step 1:** Add `barSpan` and swap `uMargin` for `uLeft` / `uRight` / `uInset` in the shader and in `render()`.
- [ ] **Step 2:** In `ReleasePlayer`, replace both `barCount(canvas.clientWidth)` calls with the span-based width.
- [ ] **Step 3: Verify.** Run `npx eslint app/soft-shoulder && npx tsc --noEmit -p .`; expected: no output from eslint, tsc exits 0. Load `/soft-shoulder` at desktop width, play, and confirm in a screenshot that the bars start at the middle and end 20px from the right edge.

### Task 2: Full-bleed photo with a caption

**Files:**
- Modify: `app/soft-shoulder/page.tsx`
- Modify: `app/soft-shoulder/_components/ReleasePlayer.tsx` (props and stage markup)
- Modify: `app/soft-shoulder/release.module.css` (`.shell`, `.page`, `.top`, `.artist`, `.stage`, `.title`)

**Interfaces:**
- `ReleasePlayer` gains `artist: string`. Inside `.stage`, after the hit button: a `.caption` block containing `<h1 className={styles.title}>{title}</h1>` and `<p className={styles.artist}><Link href="/">{artist}</Link></p>`.
- `page.tsx` renders `<div className={styles.shell}><main><ReleasePlayer … artist={release.artist} /></main></div>`. No header, no `.page` container.

- [ ] **Step 1:** Remove the header and the `.page` wrapper from `page.tsx`; pass `artist`.
- [ ] **Step 2:** Move the title into a `.caption` in the stage, with the artist link under it.
- [ ] **Step 3: CSS.**
  - `.stage`: `width: 100%`, `height: min(100vw / 2.375, 80vh)`; below 700px, `height: min(125vw, 80vh)` (4:5).
  - `.caption`: absolute, `left` / `bottom` = inset.
  - `.title`: 15px, weight 400, `line-height: 1.3`.
  - `.artist`: 13px, `color: var(--mute-1)`, the link without underline until hover.
  - `.caption` takes `pointer-events: none` except the link, so clicking the photo still plays.
  - Delete `.page`, `.top`, and the old large `.title` rules.
- [ ] **Step 4: Verify.** Run eslint and tsc as in Task 1. In the browser, at 1280×800 and 375×812:
  - the photo touches both window edges;
  - the caption is bottom-left, with no overlap with the bars;
  - clicking the photo starts playback;
  - clicking "notyuk" goes to `/`.
- [ ] **Step 5: Verify Review Focus 1–2.** At 320×640, take a screenshot; confirm the caption and bars don't overlap. At 1920×700, run `document.querySelector('[aria-label^="play"]').getBoundingClientRect().bottom <= innerHeight` in the page; expected `true`.

### Task 3: Plain type and word controls

**Files:**
- Modify: `app/soft-shoulder/_components/ReleasePlayer.tsx` (bar and links markup)
- Modify: `app/soft-shoulder/release.module.css` (`.shell` font, `.bar`, `.play`, `.time`, `.links`, `.tool`, fullscreen rules)

**Interfaces:**
- Play button text: `play` / `pause`. Keep its `aria-label` (`play soft shoulder` / `pause soft shoulder`).
- Row 1 order: play button, time (`0:42 / 3:00`), seek.
- Row 2: `spotify`, `youtube`, `motion on` / `motion off` (`aria-pressed` = motion), `full screen` / `exit full screen`.

- [ ] **Step 1:** Set the font stack on `.shell` (font-size 13px, `line-height` 1.5). Both rows get side padding equal to the inset.
- [ ] **Step 2:** Swap the glyphs for words, move the time before the seek, and drop the ↗ and colons from row 2.
- [ ] **Step 3: CSS.**
  - Links and tool buttons are plain text in `var(--mute-1)`, underlined on hover with `color: var(--ink)`.
  - The play word is in `var(--ink)` and gets a fixed width so the row doesn't shift between `play` and `pause`.
  - In full screen: the stage takes `flex: 1` and the caption stays bottom-left.
- [ ] **Step 4: Verify.** Run eslint and tsc. In the browser:
  - `getComputedStyle(document.querySelector('h1')).fontFamily` starts with `"Helvetica Neue"`;
  - `document.body.innerText` contains no `↗`, `▶` or `❚`;
  - play, then pause, then arrow-key seek on the range all work.
- [ ] **Step 5: Verify Review Focus 3–5.**
  - Enter full screen and take a screenshot; the caption and controls are visible.
  - Turn motion off while playing: `!audio.paused` stays `true`, the canvas pixels are unchanged across 500ms, and the button reads `motion off`.
  - Check the fallback by temporarily forcing `noWebGL` to `true` in React state (devtools or a one-off local edit, reverted after): the photo and caption show.
