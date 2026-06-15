/**
 * Self-hosted `@font-face` declarations for the three functional faces
 * bound to the transcript's font registers (see `lib/style/registers`).
 *
 * The woff2 are **self-hosted** OFL subsets under `public/fonts/` —
 * Vite serves `public/` verbatim at the site root, so the `src` URLs
 * are literal same-origin `/fonts/*.woff2` with no hashing. There is no
 * Google Fonts / third-party CDN request at runtime (the `src` URLs are
 * relative — asserted by `globalFonts.test.ts`).
 *
 * `font-display: swap` keeps first paint non-render-blocking: text shows
 * immediately in each role's fallback stack (`Georgia` / `system-ui` /
 * `Courier New`) and swaps to the woff2 when it lands. The Source
 * superfamily shares metrics, so the swap is near-imperceptible.
 *
 * Faces shipped: Source Serif 4 (regular + italic — prose uses
 * `*italic*`), Source Sans 3 (regular), Source Code Pro (regular —
 * covers `<pre>`/`<code>`). Bold is browser-synthesized (acceptable for
 * the functional tier; `<strong>` is rare in narrative).
 *
 * Mounted once in `main.tsx`; the app has no other global-style sink.
 */

import { createGlobalStyle } from 'styled-components';
import { FACE_STACKS } from './faces';

export const GlobalFonts = createGlobalStyle`
  /* App-wide base voice: sans (the chrome register). Everything
     inherits this unless it opts into a register — the transcript
     overrides per-frame (serif/mono), the command console overrides to
     mono. Without this, unstyled or portaled text (dropdowns, menus
     rendered outside a font-set ancestor) would fall back to the
     browser default serif. */
  body {
    font-family: ${FACE_STACKS.sans};
  }

  @font-face {
    font-family: 'Source Serif 4';
    src: url('/fonts/source-serif-4-latin.woff2') format('woff2');
    font-weight: 400;
    font-style: normal;
    font-display: swap;
  }
  @font-face {
    font-family: 'Source Serif 4';
    src: url('/fonts/source-serif-4-latin-italic.woff2') format('woff2');
    font-weight: 400;
    font-style: italic;
    font-display: swap;
  }
  @font-face {
    font-family: 'Source Sans 3';
    src: url('/fonts/source-sans-3-latin.woff2') format('woff2');
    font-weight: 400;
    font-style: normal;
    font-display: swap;
  }
  @font-face {
    font-family: 'Source Code Pro';
    src: url('/fonts/source-code-pro-latin.woff2') format('woff2');
    font-weight: 400;
    font-style: normal;
    font-display: swap;
  }
`;
