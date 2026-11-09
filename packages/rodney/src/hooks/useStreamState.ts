import { useEffect, useRef, useState } from 'react';

import type {
  ChatService,
  RelayChatEnvelope,
  StreamEventEnvelope,
  StreamShow,
  StreamStateEnvelope,
} from '../show/wire';

export type { ChatService } from '../show/wire';

/**
 * The broadcast feed — ONE streamer's read-only overlay projection over
 * WebSocket (broadcast-ready D5). Connects to
 * `${VITE_SAXONBERG_WS}/?broadcast=<token>`, where the token is the one
 * `stream token` issued in game, and tracks that streamer's pushed show,
 * their own relay chat, and the world's arrivals.
 *
 * ⭐ Fail closed: when the socket drops, `connected` goes false and the
 * last `state` is KEPT — the overlay holds its scene; nothing here ever
 * infers `live`.
 */

/** A new player's first arrival, as the ticker tells it. */
export interface Arrival {
  id: number;
  name: string;
  fromStream: boolean;
}

/** One chat line as the overlay renders it. */
export interface ChatLine {
  id: number;
  service: ChatService;
  author: string;
  /** True when the speaker is (or is linked to) a Saxonberg character. */
  inGame: boolean;
  /** Escaped plain text from the server — never markup. */
  text: string;
}

export interface StreamFeed {
  /** True while a WS connection is open. */
  connected: boolean;
  /**
   * Latest pushed show, or null before the first snapshot arrives. Kept
   * across a drop — the last thing the server said stands.
   */
  state: StreamShow | null;
  /** The most recent chat lines, oldest first. */
  chat: ChatLine[];
  /** New players' first arrivals this session, oldest first. */
  arrivals: Arrival[];
}

/** How many chat lines the overlay keeps. */
const CHAT_KEEP = 40;

/** How many arrivals the overlay keeps. */
const ARRIVALS_KEEP = 20;

function toChatLine(env: RelayChatEnvelope): Omit<ChatLine, 'id'> {
  const s = env.speaker;
  const author =
    s.kind === 'in-game' ? s.ref.displayName ?? 'a player' : s.externalName;
  return { service: env.service, author, inGame: s.kind !== 'external', text: env.text };
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

// ── ?mock — a canned feed so the overlay can be looked at with no server ──

const MOCK_LINES: Array<Omit<ChatLine, 'id'>> = [
  { service: 'twitch', author: 'ironmonger', inGame: false, text: 'is the river still drowning people' },
  { service: 'youtube', author: 'Mara K.', inGame: false, text: 'first time here, what is this game?' },
  { service: 'twitch', author: 'Iffy', inGame: true, text: 'log in, the clinic is open' },
  { service: 'youtube', author: 'quietgeologist', inGame: false, text: 'the ore grades are real?' },
  { service: 'twitch', author: 'pelt_and_tallow', inGame: false, text: 'brb making a sandwich, same as you' },
  { service: 'twitch', author: 'Odo', inGame: true, text: 'the silk house lost a whole tray to pebrine lol' },
  { service: 'youtube', author: 'S. Whitcombe', inGame: false, text: 'how long until the demo?' },
  { service: 'twitch', author: 'ironmonger', inGame: false, text: 'the banners look great' },
];

function useMockChat(enabled: boolean, push: (line: Omit<ChatLine, 'id'>) => void) {
  useEffect(() => {
    if (!enabled) return;
    let i = 0;
    const tick = () => push(MOCK_LINES[i++ % MOCK_LINES.length]);
    // Prefill on a timer, not inline, so a dev-mode double effect cancels it.
    const prefill = setTimeout(() => {
      for (let n = 0; n < 4; n++) tick();
    }, 0);
    const id = setInterval(tick, 2600);
    return () => {
      clearTimeout(prefill);
      clearInterval(id);
    };
  }, [enabled, push]);
}

/**
 * Subscribe to the broadcast feed. Resilient: reconnects on drop with a
 * fixed backoff, and reports `connected: false` so callers can fall back to
 * local/demo behavior. When env isn't configured it stays disconnected and
 * never opens a socket (pure offline mode). With `?mock` in the page URL and
 * no feed configured, chat is fed from canned lines.
 */
export default function useStreamState(): StreamFeed {
  const [feed, setFeed] = useState<StreamFeed>({
    connected: false,
    state: null,
    chat: [],
    arrivals: [],
  });
  const wsRef = useRef<WebSocket | null>(null);
  const nextChatId = useRef(1);
  const nextArrivalId = useRef(1);

  const pushChat = useRef((line: Omit<ChatLine, 'id'>) => {
    const id = nextChatId.current++;
    setFeed((f) => ({ ...f, chat: [...f.chat, { ...line, id }].slice(-CHAT_KEEP) }));
  }).current;

  const url = resolveBroadcastUrl();
  const mock = !url && new URLSearchParams(window.location.search).has('mock');
  useMockChat(mock, pushChat);

  useEffect(() => {
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
          const msg = JSON.parse(ev.data as string) as
            | Partial<StreamStateEnvelope>
            | Partial<RelayChatEnvelope>
            | Partial<StreamEventEnvelope>;
          if (msg?.type === 'stream-state' && 'state' in msg && msg.state) {
            const state = msg.state;
            setFeed((f) => ({ ...f, connected: true, state }));
          } else if (msg?.type === 'relay-chat' && 'speaker' in msg && msg.speaker) {
            pushChat(toChatLine(msg as RelayChatEnvelope));
          } else if (msg?.type === 'stream-event' && 'kind' in msg && msg.kind === 'new-player') {
            const ev2 = msg as StreamEventEnvelope;
            const id = nextArrivalId.current++;
            setFeed((f) => ({
              ...f,
              arrivals: [...f.arrivals, { id, name: ev2.name, fromStream: ev2.fromStream }].slice(
                -ARRIVALS_KEEP,
              ),
            }));
          }
        } catch {
          // Ignore non-JSON / unexpected frames — the feed is tolerant.
        }
      };

      const scheduleReconnect = () => {
        if (disposed) return;
        // ⭐ Hold the scene: only `connected` changes; `state` stays.
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
  }, [url, pushChat]);

  return feed;
}
