/**
 * `GlobalReset` — the document-level reset the app has never had.
 *
 * ⚠⚠ **The bug this fixes was a white frame around the entire app and a
 * scrollbar on every screen.** `index.html` ships no reset, so `body`
 * kept the user-agent default `margin: 8px`. Two consequences, and the
 * second is the one that actually hurt:
 *
 *   1. an 8px white gutter on all four sides — the app's own ground
 *      stopped short of the window, so every screen looked like it was
 *      pasted onto a white page;
 *   2. **the document became `100vh + 16px` tall.** Every full-height
 *      surface in this client is `min-height: 100vh`, which is the
 *      viewport — plus the body's 16px of vertical margin, that
 *      overflows by exactly 16px and produces a scrollbar on a page
 *      that fits.
 *
 * ⭐ The lesson worth keeping: the overflow read like *content being too
 * tall*, and the instinct was to compress the layout. Compressing would
 * have made the design worse and left the scrollbar, because the 16px
 * was never in the content — it was around it. **Measure the container
 * before you shrink the contents.**
 *
 * `height: 100%` on `html`/`body` lets a percentage-height child resolve
 * against the window, and the ground on `body` means the area behind a
 * short page is the app's colour rather than the browser's white.
 *
 * ⚠ Mounted OUTSIDE `React.StrictMode`, for the same reason
 * `GlobalFonts` is: under React 18 StrictMode a `createGlobalStyle` is
 * injected on mount, removed by the simulated mount→unmount→remount
 * cycle, and never re-added (styled-components #3601). Inside
 * StrictMode this reset would silently vanish.
 */

import { createGlobalStyle } from 'styled-components';
import { tokens } from '../components/ui/tokens';

export const GlobalReset = createGlobalStyle`
  html,
  body {
    margin: 0;
    padding: 0;
    height: 100%;
    /* The ground behind everything. Without this, a page shorter than
       the window shows the browser's white beneath the app. */
    background: ${tokens.color.surfaceSunken};
  }

  #root {
    min-height: 100%;
  }

  /* ⚠ Border-box everywhere. Padding inside a 100%-width surface
     otherwise ADDS to it, which is precisely the failure that made a
     full-bleed mobile surface 18px too wide and scrolled the page
     sideways. */
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }
`;
