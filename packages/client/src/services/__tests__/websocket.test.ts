import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  MqlSubscriptionDeltaEnvelope,
  MqlSubscriptionResultEnvelope,
} from "@saxonberg/types";
import { useStore } from "../../store/index";
import { websocketClient } from "../websocket";

/**
 * Minimal mock WebSocket that tracks `send` calls and exposes a
 * `readyState` we can flip. Installed in place of the global
 * `WebSocket` for the tests below.
 *
 * We don't actually exercise the URL connection; we directly invoke
 * the `handleMessage` private path via `(client as any).handleMessage`
 * to simulate inbound frames. Outbound `send` goes through `JSON.stringify`
 * onto the mock, which we then assert on.
 */
class MockWebSocket {
  public readyState: number = 1; // OPEN
  public sent: unknown[] = [];
  public onopen: ((this: WebSocket, ev: Event) => unknown) | null = null;
  public onmessage:
    | ((this: WebSocket, ev: MessageEvent) => unknown)
    | null = null;
  public onclose: ((this: WebSocket, ev: CloseEvent) => unknown) | null = null;
  public onerror: ((this: WebSocket, ev: Event) => unknown) | null = null;

  send(data: string): void {
    this.sent.push(JSON.parse(data));
  }

  close(): void {
    this.readyState = 3; // CLOSED
  }
}

function resetClient(): void {
  // Reset the registry between tests.
  useStore.setState({ stuffRegistry: new Map() });
  // Disconnect any lingering ws + clear bookkeeping by accessing the
  // private state.
  const c = websocketClient as unknown as {
    ws: MockWebSocket | null;
    mqlSubscriptions: Map<string, unknown>;
    reconnectAttempts: number;
  };
  c.ws = null;
  c.mqlSubscriptions = new Map();
  c.reconnectAttempts = 0;
}

function attachMockWs(): MockWebSocket {
  const mock = new MockWebSocket();
  (
    websocketClient as unknown as { ws: MockWebSocket | null }
  ).ws = mock;
  return mock;
}

function deliver(envelope: unknown): void {
  // Bypass JSON.stringify by handing the envelope directly to the
  // private `handleMessage` (which JSON.parse's it).
  (
    websocketClient as unknown as {
      handleMessage: (data: string) => void;
    }
  ).handleMessage(JSON.stringify(envelope));
}

describe("websocket subscription consumer", () => {
  beforeEach(() => {
    resetClient();
  });

  it("populates the stuff registry from a subscription result envelope", () => {
    attachMockWs();
    const env: MqlSubscriptionResultEnvelope = {
      type: "mql-subscription-result",
      frameId: 1,
      subscriptionId: "sub-1",
      result: [
        {
          stuffId: "a",
          displayName: "Alice",
          primaryKeyword: "alice",
        },
      ],
    };
    deliver(env);

    const reg = useStore.getState().stuffRegistry;
    expect(reg.get("a")).toEqual({
      stuffId: "a",
      displayName: "Alice",
      primaryKeyword: "alice",
    });
  });

  it("walks nested `contents` arrays on detail records", () => {
    attachMockWs();
    const env: MqlSubscriptionResultEnvelope = {
      type: "mql-subscription-result",
      frameId: 1,
      subscriptionId: "sub-1",
      result: [
        {
          stuffId: "a",
          displayName: "the room",
          shortDescription: "a cozy room",
          contents: [
            { stuffId: "b", displayName: "Bob", primaryKeyword: "bob" },
            { stuffId: "c", displayName: "Carol", primaryKeyword: "carol" },
          ],
        },
      ],
    };
    deliver(env);

    const reg = useStore.getState().stuffRegistry;
    expect(reg.get("a")?.displayName).toBe("the room");
    expect(reg.get("b")?.primaryKeyword).toBe("bob");
    expect(reg.get("c")?.primaryKeyword).toBe("carol");
  });

  it("populates the registry from subscription delta envelopes", () => {
    attachMockWs();
    const env: MqlSubscriptionDeltaEnvelope = {
      type: "mql-subscription-delta",
      frameId: 2,
      subscriptionId: "sub-1",
      changes: [
        {
          op: "replace",
          key: "a",
          fields: {
            stuffId: "a",
            displayName: "Alice the Bold",
            primaryKeyword: "alice",
          },
        },
      ],
    };
    deliver(env);

    const reg = useStore.getState().stuffRegistry;
    expect(reg.get("a")).toEqual({
      stuffId: "a",
      displayName: "Alice the Bold",
      primaryKeyword: "alice",
    });
  });

  it("feeds the registry BEFORE dispatching to widget handlers", () => {
    attachMockWs();
    let observedDisplayName: string | undefined;
    const handler = vi.fn(() => {
      // The widget handler should see the registry already populated
      // by the time it runs, because the side-effect feeder is invoked
      // before the registered handlers.
      observedDisplayName = useStore.getState().stuffRegistry.get("a")
        ?.displayName;
    });
    websocketClient.onEnvelope("mql-subscription-result", handler);

    const env: MqlSubscriptionResultEnvelope = {
      type: "mql-subscription-result",
      frameId: 1,
      subscriptionId: "sub-1",
      result: [{ stuffId: "a", displayName: "Alice" }],
    };
    deliver(env);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(observedDisplayName).toBe("Alice");

    websocketClient.offEnvelope("mql-subscription-result", handler);
  });

  it("does not touch the registry on non-MQL envelopes", () => {
    attachMockWs();
    // A dispatch-response envelope is also a valid Envelope shape;
    // confirm it does not feed the registry.
    deliver({
      type: "dispatch-response",
      frameId: 1,
      dispatchId: "c1",
      outcome: { status: "ok", notes: [] },
    });
    expect(useStore.getState().stuffRegistry.size).toBe(0);
  });
});

describe("subscribeMql", () => {
  const FOCUS_SPEC = {
    query: "$focus",
    cardinality: "many" as const,
    fields: "detail" as const,
    focusDependent: true,
  };
  const LOCATION_SPEC = {
    query: "here",
    cardinality: "one" as const,
    fields: "ref" as const,
    locationDependent: true,
  };

  beforeEach(() => {
    resetClient();
  });

  it("sends an mql-subscribe message with the supplied spec", () => {
    const mock = attachMockWs();
    const id = websocketClient.subscribeMql(FOCUS_SPEC);

    expect(typeof id).toBe("string");
    expect(mock.sent).toHaveLength(1);
    expect(mock.sent[0]).toMatchObject({
      type: "mql-subscribe",
      payload: {
        subscriptionId: id,
        ...FOCUS_SPEC,
      },
    });
  });

  it("returns distinct ids for concurrent subscriptions", () => {
    attachMockWs();
    const a = websocketClient.subscribeMql(FOCUS_SPEC);
    const b = websocketClient.subscribeMql(FOCUS_SPEC);
    expect(a).not.toBe(b);
  });

  it("queues the subscription (no send) when not connected", () => {
    // No ws attached → not connected.
    const id = websocketClient.subscribeMql(FOCUS_SPEC);
    expect(typeof id).toBe("string");
    // Re-attach and confirm a reconnect re-issues.
    const mock = attachMockWs();
    // Trigger the connection-established handler manually.
    (
      websocketClient as unknown as {
        handleConnectionEstablished: (p: unknown) => void;
      }
    ).handleConnectionEstablished({
      socketId: "s",
      sessionId: "sess",
      userId: "u",
      interactiveStuffId: "i",
      player: {
        _id: "p",
        name: "Player",
        pronouns: "they",
      },
    });

    const subscribes = mock.sent.filter(
      (m) => (m as { type?: string }).type === "mql-subscribe"
    );
    expect(subscribes).toHaveLength(1);
    expect(subscribes[0]).toMatchObject({
      type: "mql-subscribe",
      payload: {
        subscriptionId: id,
        ...FOCUS_SPEC,
      },
    });
  });

  it("re-issues every active subscription on connection-established", () => {
    const mock = attachMockWs();
    const a = websocketClient.subscribeMql(FOCUS_SPEC);
    const b = websocketClient.subscribeMql(LOCATION_SPEC);
    expect(mock.sent).toHaveLength(2);

    // Simulate reconnect: clear sent, re-fire connection-established.
    mock.sent = [];
    (
      websocketClient as unknown as {
        handleConnectionEstablished: (p: unknown) => void;
      }
    ).handleConnectionEstablished({
      socketId: "s",
      sessionId: "sess",
      userId: "u",
      interactiveStuffId: "i",
      player: {
        _id: "p",
        name: "Player",
        pronouns: "they",
      },
    });

    const subscribes = mock.sent.filter(
      (m) => (m as { type?: string }).type === "mql-subscribe"
    );
    expect(subscribes).toHaveLength(2);
    const ids = subscribes.map(
      (m) =>
        (m as { payload: { subscriptionId: string } }).payload.subscriptionId
    );
    expect(ids).toContain(a);
    expect(ids).toContain(b);
  });

  it("unsubscribe sends mql-unsubscribe and stops re-issuing on reconnect", () => {
    const mock = attachMockWs();
    const id = websocketClient.subscribeMql(FOCUS_SPEC);
    mock.sent = [];

    websocketClient.unsubscribe(id);
    expect(mock.sent).toHaveLength(1);
    expect(mock.sent[0]).toMatchObject({
      type: "mql-unsubscribe",
      payload: { subscriptionId: id },
    });

    // Reconnect should not re-issue the now-unsubscribed kind.
    mock.sent = [];
    (
      websocketClient as unknown as {
        handleConnectionEstablished: (p: unknown) => void;
      }
    ).handleConnectionEstablished({
      socketId: "s",
      sessionId: "sess",
      userId: "u",
      interactiveStuffId: "i",
      player: {
        _id: "p",
        name: "Player",
        pronouns: "they",
      },
    });

    const subscribes = mock.sent.filter(
      (m) => (m as { type?: string }).type === "mql-subscribe"
    );
    expect(subscribes).toHaveLength(0);
  });
});
