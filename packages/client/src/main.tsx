import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { GlobalFonts } from "./styles/GlobalFonts";
import { applyGround } from "./lib/style/useGround";
import { INK_THEME } from "./lib/style/themes/ink";

// Paint the default ground BEFORE the first render, so the very first
// frame already resolves `var(--sx-*)` instead of flashing whatever the
// browser inherits and then correcting. `useGround()` inside App takes
// over from here and re-applies on every theme change; this call exists
// only to cover the gap before React mounts.
applyGround(INK_THEME.ground);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <>
    {/* GlobalFonts is mounted OUTSIDE StrictMode on purpose: a
        createGlobalStyle under React 18 StrictMode is injected on mount
        then removed by the simulated mount→unmount→remount cycle and
        not re-added (styled-components #3601), so its @font-face block
        silently never lands. Outside StrictMode it injects once and
        stays. App keeps StrictMode.

        The colour ground does NOT need this treatment — it is emitted
        imperatively via setProperty rather than injected as a global
        style sheet, so it has nothing to be removed. That is why
        useGround() can live inside StrictMode and read the store. */}
    <GlobalFonts />
    <React.StrictMode>
      <App />
    </React.StrictMode>
  </>
);
