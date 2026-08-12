/**
 * Self-hosted `@font-face` declarations for the four civic faces bound
 * to the transcript's font registers (see `lib/style/themes/registers`).
 *
 * The woff2 are **self-hosted** OFL subsets under `public/fonts/` —
 * Vite serves `public/` verbatim at the site root, so the `src` URLs
 * are literal same-origin `/fonts/*.woff2` with no hashing. There is no
 * Google Fonts / third-party CDN request at runtime (the `src` URLs are
 * relative — asserted by `globalFonts.test.tsx`). `DESIGN-SYSTEM.md`
 * ships a `<link>` to Google Fonts; adopting it would be a regression
 * for a product whose claim is that it is auditable.
 *
 * `font-display: swap` keeps first paint non-render-blocking: text shows
 * immediately in each role's fallback stack (`Georgia` / `system-ui` /
 * `Courier New`) and swaps to the woff2 when it lands.
 *
 * ⚠ **The four families are unrelated and do not share metrics.** The
 * previous arrangement shipped the Source superfamily, where the swap
 * was near-imperceptible because every register shared a metric set;
 * Spectral / Public Sans / Newsreader / Plex Mono do not, so the swap
 * now reflows. `swap` is kept anyway: a non-blocking first paint is the
 * stronger property, and the alternative (`block`) trades a reflow for
 * invisible text.
 *
 * **Faces shipped — six files, four families.** Weight coverage is not
 * uniform, because what upstream serves is not uniform:
 *
 * - **Spectral** is a *static* family upstream, so 400 and 500 are two
 *   real files. 500 is not optional: the engraved display role is
 *   specified at 500, browsers synthesize bold only, and a lone 400 face
 *   would round 500 down and lose the weight the design asks for.
 * - **Public Sans** is a *variable* font upstream (`wght` 100–900 in one
 *   file), declared here with the range so `font-weight: 600` renders a
 *   real interpolated instance rather than a synthesized bold. Shipping
 *   a second file for 600 would be the same bytes under another name.
 * - **Newsreader** ships regular + italic (prose uses `*emphasis*`, plate
 *   captions are italic). ⚠ Requested **without** the `opsz` axis — with
 *   `opsz` in the tuple the face silently fails to load and falls back to
 *   Times. `Art Direction - Civic.dc.html`'s own `<link>` carries `opsz`;
 *   `DESIGN-SYSTEM.md` is the one to follow.
 * - **IBM Plex Mono** ships regular. Bold is browser-synthesized, which
 *   is acceptable for the machine voice.
 *
 * The fetch procedure for a future face swap is recorded in
 * `docs/subsystems/message-rendering.md` § Font-by-register typography —
 * it is a one-off build-time fetch and creates no runtime dependency.
 *
 * Mounted once in `main.tsx`; the app has no other global-style sink.
 * (The custom-property colour ground is emitted imperatively by
 * `lib/style/useGround`, deliberately *not* as a second
 * `createGlobalStyle` — see that module.)
 */

import { createGlobalStyle } from 'styled-components';
import { FACE_STACKS } from './faces';

export const GlobalFonts = createGlobalStyle`
  /* App-wide base voice: the chrome register (Public Sans). Everything
     inherits this unless it opts into a register — the transcript
     overrides per-frame (narrative/command), the command console
     overrides to command. Without this, unstyled or portaled text
     (dropdowns, menus rendered outside a font-set ancestor) would fall
     back to the browser default serif. */
  body {
    font-family: ${FACE_STACKS.chrome};
  }

  @font-face {
    font-family: 'Spectral';
    src: url('/fonts/spectral-latin.woff2') format('woff2');
    font-weight: 400;
    font-style: normal;
    font-display: swap;
  }
  @font-face {
    font-family: 'Spectral';
    src: url('/fonts/spectral-500-latin.woff2') format('woff2');
    font-weight: 500;
    font-style: normal;
    font-display: swap;
  }
  @font-face {
    font-family: 'Public Sans';
    src: url('/fonts/public-sans-latin.woff2') format('woff2');
    font-weight: 100 900;
    font-style: normal;
    font-display: swap;
  }
  @font-face {
    font-family: 'Newsreader';
    src: url('/fonts/newsreader-latin.woff2') format('woff2');
    font-weight: 400;
    font-style: normal;
    font-display: swap;
  }
  @font-face {
    font-family: 'Newsreader';
    src: url('/fonts/newsreader-italic-latin.woff2') format('woff2');
    font-weight: 400;
    font-style: italic;
    font-display: swap;
  }
  @font-face {
    font-family: 'IBM Plex Mono';
    src: url('/fonts/plex-mono-latin.woff2') format('woff2');
    font-weight: 400;
    font-style: normal;
    font-display: swap;
  }
`;
