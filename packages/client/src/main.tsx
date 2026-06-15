import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { GlobalFonts } from "./styles/GlobalFonts";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <GlobalFonts />
    <App />
  </React.StrictMode>
);
