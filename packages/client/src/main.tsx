import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { GlobalFonts } from "./styles/GlobalFonts";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <>
    {/* GlobalFonts is mounted OUTSIDE StrictMode on purpose: a
        createGlobalStyle under React 18 StrictMode is injected on mount
        then removed by the simulated mount→unmount→remount cycle and
        not re-added (styled-components #3601), so its @font-face block
        silently never lands. Outside StrictMode it injects once and
        stays. App keeps StrictMode. */}
    <GlobalFonts />
    <React.StrictMode>
      <App />
    </React.StrictMode>
  </>
);
