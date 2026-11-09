/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Saxonberg WebSocket origin for the broadcast feed, e.g.
   * `ws://localhost:2010` (dev) or `wss://play.example.com` (prod).
   * When unset, overlays fall back to local/demo behavior.
   */
  readonly VITE_SAXONBERG_WS?: string;
  /**
   * Your overlay token — issued in game by `stream token` (the server's
   * env `BROADCAST_TOKEN` still opens the founder's feed during the
   * changeover). Rides in the WS query param; the OBS source URL is
   * private to the streamer.
   */
  readonly VITE_BROADCAST_TOKEN?: string;
  /**
   * obs-websocket's URL (e.g. `ws://localhost:4455`) — the scene-switch
   * fallback when the browser source has no Advanced access.
   */
  readonly VITE_OBS_WS_URL?: string;
  /** obs-websocket's password, when it has one. */
  readonly VITE_OBS_WS_PASSWORD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** Counted from the checkout when Vite starts — see vite.config.ts. */
declare module 'virtual:repo-stats' {
  const stats: {
    packs: number;
    subsystems: number;
    slates: number;
    linesOfTypeScript: number;
    testFiles: number;
    countedAt: number;
  };
  export default stats;
}
