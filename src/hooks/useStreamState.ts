import { useEffect, useRef, useState } from 'react';

/**
 * The broadcast feed — saxonberg's read-only overlay projection over
 * WebSocket. Connects to `${VITE_SAXONBERG_WS}/?broadcast=<token>` and
 * tracks the pushed `StreamState`. The countdown, scene, lower-third,
 * etc. all derive from this single source.
 *
 * Mirrors the server's `StreamStateSnapshot` (`@saxonberg/types`).
 * Inlined for Phase 1 — when the overlay grows prose-rich surfaces and
 * pulls in the shared types package via `link:`, this moves there.
 */
export interface StreamStateSnapshot {
  mode: 'live' | 'standby';
  awayUntil: number | null; // epoch ms; null when live
}

interface StreamStateEnvelope {
  type: 'stream-state';
  frameId: number;
  state: StreamStateSnapshot;
}

export interface StreamFeed {
  /** True while a WS connection is open. */
  connected: boolean;
  /** Latest pushed state, or null before the first snapshot arrives. */
  state: StreamStateSnapshot | null;
}

/** Build the broadcast WS URL from env, or null when not configured. */
function resolveBroadcastUrl(): string | null {
  const base = import.meta.env.VITE_SAXONBERG_WS;
  const token = import.meta.env.VITE_BROADCAST_TOKEN;
  if (!base || !token) return null;
  try {
    const url = new URL(base);
    url.protocol = url.protocol === 'https:' ? 'wss:' : url.protocol;
    url.searchParams.set('broadcast', token);
    return url.toString();
  } catch {
    return null;
  }
}

const RECONNECT_MS = 2000;

/**
 * Subscribe to the broadcast feed. Resilient: reconnects on drop with a
 * fixed backoff, and reports `connected: false` so callers can fall
 * back to local/demo behavior. When env isn't configured it stays
 * disconnected and never opens a socket (pure offline mode).
 */
export default function useStreamState(): StreamFeed {
  const [feed, setFeed] = useState<StreamFeed>({
    connected: false,
    state: null,
  });
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const url = resolveBroadcastUrl();
    if (!url) return; // not configured → stay offline

    let disposed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

    const connect = () => {
      if (disposed) return;
      let ws: WebSocket;
      try {
        ws = new WebSocket(url);
      } catch {
        reconnectTimer = setTimeout(connect, RECONNECT_MS);
        return;
      }
      wsRef.current = ws;

      ws.onopen = () => {
        if (!disposed) setFeed((f) => ({ ...f, connected: true }));
      };

      ws.onmessage = (ev) => {
        if (disposed) return;
        try {
          const msg = JSON.parse(ev.data as string) as Partial<StreamStateEnvelope>;
          if (msg?.type === 'stream-state' && msg.state) {
            setFeed({ connected: true, state: msg.state });
          }
        } catch {
          // Ignore non-JSON / unexpected frames — the feed is tolerant.
        }
      };

      const scheduleReconnect = () => {
        if (disposed) return;
        setFeed((f) => ({ ...f, connected: false }));
        reconnectTimer = setTimeout(connect, RECONNECT_MS);
      };

      ws.onclose = scheduleReconnect;
      ws.onerror = () => ws.close();
    };

    connect();

    return () => {
      disposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, []);

  return feed;
}
