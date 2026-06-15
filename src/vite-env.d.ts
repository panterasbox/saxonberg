/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Saxonberg WebSocket origin for the broadcast feed, e.g.
   * `ws://localhost:2010` (dev) or `wss://play.example.com` (prod).
   * When unset, overlays fall back to local/demo behavior.
   */
  readonly VITE_SAXONBERG_WS?: string;
  /**
   * Broadcast token (matches the server's `BROADCAST_TOKEN`). Rides in
   * the WS query param; the OBS source URL is private to the streamer.
   */
  readonly VITE_BROADCAST_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
