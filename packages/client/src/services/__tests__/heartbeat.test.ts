/**
 * The round-trip heartbeat, and the retry countdown.
 *
 * ⚠⚠ **A separate file from `websocket.test.ts` on purpose.** That file
 * is one of the three the reconnect machine is frozen behind, and the
 * requirement is that it shows a zero diff — if exposing the backoff
 * delay had needed it edited, that would be the signal that *behaviour*
 * moved where only *reporting* should have. New assertions about new
 * fields belong beside it, not inside it.
 *
 * ⭐ Both halves of this phase are the same move: **the information
 * already existed and was thrown away one line before it left.** The
 * ping protocol was written end to end and never called; the backoff
 * delay was computed and dropped into a bare `setTimeout`. Neither is
 * new measurement.
 */

import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { useStore } from "../../store/index";
import { websocketClient } from "../websocket";

class MockWebSocket {
  public readyState: number = 1; // OPEN
  public sent: Array<{ type: string; payload?: unknown }> = [];
  public onopen: ((ev: Event) => unknown) | null = null;
  public onmessage: ((ev: MessageEvent) => unknown) | null = null;
  public onclose: ((ev: CloseEvent) => unknown) | null = null;
  public onerror: ((ev: Event) => unknown) | null = null;

  send(data: string): void {
    this.sent.push(JSON.parse(data));
  }
  close(): void {
    this.readyState = 3;
  }
}

interface Privates {
  ws: MockWebSocket | null;
  heartbeat: ReturnType<typeof setInterval> | null;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
  reconnectAttempts: number;
  url: string;
  startHeartbeat: () => void;
  stopHeartbeat: () => void;
  attemptReconnect: () => void;
  handleMessage: (data: string) => void;
}

function privates(): Privates {
  return websocketClient as unknown as Privates;
}

function attachMockWs(): MockWebSocket {
  const mock = new MockWebSocket();
  privates().ws = mock;
  return mock;
}

function deliver(frame: unknown): void {
  privates().handleMessage(JSON.stringify(frame));
}

function connectionState() {
  return useStore.getState().connection;
}

beforeEach(() => {
  vi.useFakeTimers();
  const p = privates();
  p.stopHeartbeat();
  if (p.reconnectTimer !== null) {
    clearTimeout(p.reconnectTimer);
    p.reconnectTimer = null;
  }
  p.ws = null;
  p.reconnectAttempts = 0;
  p.url = "ws://test";
  useStore.setState({
    connection: {
      link: "connected",
      isConnected: false,
      socketId: null,
      sessionId: null,
      error: null,
    },
    auth: { isAuthenticated: true, user: null, player: null },
    connectionPhase: "in-world",
  });
});

afterEach(() => {
  const p = privates();
  p.stopHeartbeat();
  if (p.reconnectTimer !== null) {
    clearTimeout(p.reconnectTimer);
    p.reconnectTimer = null;
  }
  vi.useRealTimers();
});

/**
 * ⭐⭐ **The backoff loop is the SOLE driver of reconnection, and this
 * is the assertion that keeps it that way.**
 *
 * Measured against a real stopped server: `setDisconnected` flips
 * `connection.isConnected` false, which re-fires **`App`'s connect
 * effect** — a second, independent caller of `connect()`, racing the
 * backoff. One of them opened a socket; the other's timer then found it
 * mid-handshake and returned **without re-arming**. The chain was lost,
 * the link sat at `reconnecting` indefinitely, and the countdown this
 * build added froze at `0s` — a promise of a retry that would never
 * fire.
 *
 * ⚠ Reporting a schedule obliges the schedule to be real. That is why a
 * pre-existing fault in a machine this build was told to leave alone
 * had to be fixed here: the build is what made it a lie.
 */
describe("the reconnect loop owns the connection", () => {
  /*
   * ⚠ These tests let `connect()` actually run, so the constructor has
   * to be stubbed — jsdom would otherwise open a real socket to
   * `ws://test` and reject asynchronously long after the test passed.
   */
  const RealWebSocket = globalThis.WebSocket;
  beforeEach(() => {
    globalThis.WebSocket = MockWebSocket as unknown as typeof WebSocket;
  });
  afterEach(() => {
    globalThis.WebSocket = RealWebSocket;
  });

  it("⭐⭐ refuses an out-of-band connect while an attempt is armed", () => {
    const p = privates();
    p.ws = null;
    p.attemptReconnect();
    expect(p.reconnectTimer).not.toBeNull();

    // What `App`'s effect does the instant the store flips.
    websocketClient.connect("ws://test");

    // No socket was opened behind the loop's back.
    expect(p.ws).toBeNull();
    expect(p.reconnectTimer).not.toBeNull();
  });

  it("⚠ and disarms so the NEXT attempt can proceed", () => {
    const p = privates();
    p.attemptReconnect();
    // Fire the armed attempt; it clears itself before connecting.
    vi.advanceTimersByTime(1000);
    expect(p.reconnectTimer).toBeNull();
  });

  /*
   * ⚠ The manual affordance must never be blocked by a pending backoff
   * — that is the opposite of what a "Retry now" button promises.
   */
  it("⚠ the manual reconnect disarms rather than being refused", () => {
    const p = privates();
    p.attemptReconnect();
    expect(p.reconnectTimer).not.toBeNull();
    websocketClient.reconnectNow();
    expect(p.reconnectTimer).toBeNull();
  });

  it("an intentional disconnect cancels the armed attempt", () => {
    const p = privates();
    p.attemptReconnect();
    websocketClient.disconnect();
    expect(p.reconnectTimer).toBeNull();
  });
});

describe("the round-trip heartbeat", () => {
  /*
   * ⚠ One IMMEDIATELY, then on the cadence. Without the immediate ping
   * the figure would be blank for the first half-minute of every
   * session, which reads as "not built" rather than "not yet measured"
   * — the two states the honesty convention exists to keep apart.
   */
  it("⚠ pings immediately on start, then every 30s", () => {
    const ws = attachMockWs();
    privates().startHeartbeat();

    expect(ws.sent.filter((m) => m.type === "ping")).toHaveLength(1);

    vi.advanceTimersByTime(30_000);
    expect(ws.sent.filter((m) => m.type === "ping")).toHaveLength(2);

    vi.advanceTimersByTime(60_000);
    expect(ws.sent.filter((m) => m.type === "ping")).toHaveLength(4);
  });

  it("stops when the socket closes, and leaks no timer", () => {
    const ws = attachMockWs();
    privates().startHeartbeat();
    const before = ws.sent.length;

    privates().ws = null;
    privates().stopHeartbeat();
    vi.advanceTimersByTime(120_000);

    expect(ws.sent).toHaveLength(before);
    expect(privates().heartbeat).toBeNull();
  });

  /*
   * ⚠ Idempotent: a reconnect legitimately produces a second
   * `connection-established`, and two timers pinging in parallel would
   * double the traffic invisibly and forever.
   */
  it("⚠ starting twice does not leave two timers running", () => {
    const ws = attachMockWs();
    privates().startHeartbeat();
    privates().startHeartbeat();
    ws.sent.length = 0;

    vi.advanceTimersByTime(30_000);
    expect(ws.sent.filter((m) => m.type === "ping")).toHaveLength(1);
  });

  it("does not ping a socket that is no longer open", () => {
    const ws = attachMockWs();
    privates().startHeartbeat();
    ws.sent.length = 0;
    ws.readyState = 3; // CLOSED, but the timer has not been cleared yet

    vi.advanceTimersByTime(30_000);
    expect(ws.sent).toHaveLength(0);
  });
});

describe("the pong, and the figure it produces", () => {
  it("⭐ a completed round trip yields roundTripMs", () => {
    attachMockWs();
    const sentAt = Date.now();
    vi.setSystemTime(sentAt + 37);

    deliver({ type: "pong", payload: { timestamp: 1, clientTimestamp: sentAt } });

    expect(connectionState().roundTripMs).toBe(37);
  });

  /*
   * ⚠⚠ **The reason the server echoes the client's stamp.** Subtracting
   * the SERVER's timestamp measures clock skew between two machines
   * plus half a trip — a number that looks like latency, moves like
   * latency, and is not latency. A pong carrying only the server clock
   * therefore reports nothing rather than reporting that.
   */
  it("⚠⚠ ignores a pong that carries only the server's clock", () => {
    attachMockWs();
    deliver({ type: "pong", payload: { timestamp: Date.now() - 5000 } });
    expect(connectionState().roundTripMs).toBeUndefined();
  });

  /*
   * A laptop lid closing, an NTP step. Dropping the sample beats
   * printing a round trip that cannot have happened.
   */
  it("ignores a negative round trip (the clock moved under us)", () => {
    attachMockWs();
    const now = Date.now();
    deliver({ type: "pong", payload: { clientTimestamp: now + 10_000 } });
    expect(connectionState().roundTripMs).toBeUndefined();
  });

  /*
   * ⚠ The `pong` needs its OWN branch above the envelope discriminator:
   * it carries no `frameId` and no `topic`, so without one it is read
   * as a topic-less MessageFrame and silently dropped — which is
   * precisely what "nothing handles the pong" meant in practice.
   */
  it("⚠ is not swallowed by the topic dispatcher", () => {
    attachMockWs();
    const seen: unknown[] = [];
    const handler = (f: unknown) => seen.push(f);
    websocketClient.onAnyTopic(handler);

    deliver({ type: "pong", payload: { clientTimestamp: Date.now() } });

    websocketClient.offAnyTopic(handler);
    expect(seen).toHaveLength(0);
    expect(connectionState().roundTripMs).toBeDefined();
  });
});

describe("the retry countdown", () => {
  /*
   * ⭐ Driven through the real backoff rather than asserted as a
   * constant: the claim is "this is the schedule the machine is
   * actually keeping", and a hard-coded 1000 would keep passing after
   * somebody changed the schedule.
   */
  it("⭐ retryAt reports the real backoff delay", () => {
    const now = Date.now();
    vi.setSystemTime(now);
    privates().reconnectAttempts = 0;

    privates().attemptReconnect();

    expect(connectionState().link).toBe("reconnecting");
    // First attempt: base delay, 1s.
    expect(connectionState().retryAt).toBe(now + 1000);
  });

  it("⭐ and it grows with the schedule, capped", () => {
    const now = Date.now();
    vi.setSystemTime(now);
    const seen: number[] = [];
    for (let i = 0; i < 7; i++) {
      privates().attemptReconnect();
      const at = connectionState().retryAt;
      seen.push(at === undefined ? -1 : at - now);
      // Swallow the scheduled reconnect so it does not fire a real
      // `connect()` into the mock-less global.
      vi.clearAllTimers();
    }
    expect(seen).toEqual([1000, 2000, 4000, 8000, 16000, 30000, 30000]);
  });

  /*
   * ⚠ The give-up transition. Once the machine has stopped retrying
   * there is no *next* attempt, and a countdown still ticking against a
   * link that will never come back on its own would be the most
   * misleading figure on the screen.
   */
  it("⚠ clears once the machine gives up", () => {
    privates().reconnectAttempts = 0;
    privates().attemptReconnect();
    vi.clearAllTimers();
    expect(connectionState().retryAt).toBeDefined();

    privates().reconnectAttempts = 99;
    privates().attemptReconnect();

    expect(connectionState().link).toBe("dropped");
    expect(connectionState().retryAt).toBeUndefined();
  });

  /*
   * ⭐ And a reconnect wipes BOTH derived readings by construction —
   * `setConnected` replaces the connection object rather than merging,
   * so a trip measured on the dead socket and a countdown to an attempt
   * that already succeeded cannot survive it.
   */
  it("⭐ a successful connect clears both retryAt and the stale trip", () => {
    privates().reconnectAttempts = 0;
    privates().attemptReconnect();
    vi.clearAllTimers();
    useStore.setState({
      connection: { ...connectionState(), roundTripMs: 999 },
    });

    useStore.getState().setConnected({
      userId: "u",
      socketId: "s",
      sessionId: "sess",
      interactiveStuffId: "i",
      avatarStuffId: "a",
      player: {
        _id: "p",
        name: "Bartleby",
        pronouns: "they" as never,
        portraitUrl: "",
      },
      topicCatalogue: [],
      emoteCatalogue: [],
      reactableTopics: [],
      releaseWindow: [],
      clientState: {},
    });

    expect(connectionState().link).toBe("connected");
    expect(connectionState().retryAt).toBeUndefined();
    expect(connectionState().roundTripMs).toBeUndefined();
  });
});
