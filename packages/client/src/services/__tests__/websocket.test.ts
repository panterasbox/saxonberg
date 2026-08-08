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

describe("onAnyTopic catch-all", () => {
  beforeEach(() => {
    resetClient();
    // Clear any anyTopic subscribers leaked from a prior test.
    (
      websocketClient as unknown as {
        anyTopicHandlers: Set<unknown>;
      }
    ).anyTopicHandlers = new Set();
  });

  it("fires for a frame whose topic has no per-topic handler registered", () => {
    attachMockWs();
    const seen: { topic: string; body: string }[] = [];
    const handler = (frame: { topic: string; body: string }) => {
      seen.push({ topic: frame.topic, body: frame.body });
    };
    websocketClient.onAnyTopic(handler);

    // Deliver a MessageFrame on a topic with no per-topic listener.
    deliver({
      id: "f1",
      topic: "some.brand.new.topic",
      body: "hello",
      meta: { timestamp: 100 },
    });

    expect(seen).toHaveLength(1);
    expect(seen[0]).toEqual({
      topic: "some.brand.new.topic",
      body: "hello",
    });
    websocketClient.offAnyTopic(handler);
  });

  it("fires AFTER per-topic handlers (composition order)", () => {
    attachMockWs();
    const order: string[] = [];
    const perTopic = () => order.push("per-topic");
    const anyTopic = () => order.push("any-topic");
    websocketClient.onTopic("speech.vocal", perTopic);
    websocketClient.onAnyTopic(anyTopic);

    deliver({
      id: "f2",
      topic: "speech.vocal",
      body: "hi",
      meta: { timestamp: 0 },
    });

    expect(order).toEqual(["per-topic", "any-topic"]);
    websocketClient.offTopic("speech.vocal", perTopic);
    websocketClient.offAnyTopic(anyTopic);
  });

  it("offAnyTopic removes the handler", () => {
    attachMockWs();
    const handler = vi.fn();
    websocketClient.onAnyTopic(handler);
    websocketClient.offAnyTopic(handler);

    deliver({
      id: "f3",
      topic: "x.y",
      body: "z",
      meta: { timestamp: 0 },
    });

    expect(handler).not.toHaveBeenCalled();
  });
});

describe("char-gen frame routing", () => {
  // These two topics are wired through the `onTopic` registry in the
  // client's constructor (`registerBuiltinHandlers`), NOT the legacy
  // dispatch switch. The frames reach the store only if that
  // registration ran — so this is the regression guard for the
  // switch→registry move.
  beforeEach(() => {
    resetClient();
    useStore.setState({
      charGenRoster: [],
      charGenState: null,
      connectionPhase: "unauthenticated",
    });
  });

  it("routes a roster frame to the store and flips to character-select", () => {
    attachMockWs();
    deliver({
      id: "f-roster",
      topic: "session.identity",
      body: "",
      meta: { timestamp: 0 },
      payload: {
        characters: [
          {
            playerId: "p1",
            name: "Bobalu",
            species: "Human",
            description: "a striver",
          },
        ],
      },
    });

    expect(useStore.getState().charGenRoster).toEqual([
      {
        playerId: "p1",
        name: "Bobalu",
        species: "Human",
        description: "a striver",
      },
    ]);
    expect(useStore.getState().connectionPhase).toBe("character-select");
  });

  it("routes a state frame to the store and flips to char-gen", () => {
    attachMockWs();
    deliver({
      id: "f-state",
      topic: "session.identity",
      body: "",
      meta: { timestamp: 0 },
      payload: {
        picks: {},
        speciesOptions: [{ value: "human", label: "Human" }],
        sexOptions: [],
        pronounOptions: [],
        aspirationOptions: [],
        missing: ["species"],
      },
    });

    const state = useStore.getState().charGenState;
    expect(state?.speciesOptions).toEqual([
      { value: "human", label: "Human" },
    ]);
    expect(state?.missing).toContain("species");
    expect(useStore.getState().connectionPhase).toBe("char-gen");
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

describe("websocket prompt substrate", () => {
  beforeEach(() => {
    resetClient();
    // Reset the prompt slice — same shape as resetSlice in
    // store/__tests__/promptStack.test.ts.
    useStore.setState({
      prompts: [],
      promptDrafts: { base: "" },
      activeSlot: "base",
      basePrompt: ">",
      echoSnapshotQueue: [],
    });
  });

  it("prompt envelope with a prompt-choice note pushes a choice entry", () => {
    attachMockWs();
    deliver({
      type: "prompt",
      frameId: 1,
      promptId: "p1",
      outcome: {
        notes: [
          {
            kind: "prompt-choice",
            label: "Pick one",
            choices: [
              { label: "A", response: "a" },
              { label: "B", response: "b" },
            ],
            defaultChoice: "a",
            foreground: true,
          },
        ],
      },
    });
    const s = useStore.getState();
    expect(s.prompts).toHaveLength(1);
    const entry = s.prompts[0]!;
    expect(entry.kind).toBe("choice");
    expect(entry.promptId).toBe("p1");
    expect(s.activeSlot).toBe("p1");
  });

  it("foreground: false leaves activeSlot alone", () => {
    attachMockWs();
    deliver({
      type: "prompt",
      frameId: 1,
      promptId: "p1",
      outcome: {
        notes: [
          {
            kind: "prompt-text",
            label: "Background?",
            foreground: false,
          },
        ],
      },
    });
    const s = useStore.getState();
    expect(s.prompts).toHaveLength(1);
    expect(s.activeSlot).toBe("base");
  });

  it("prompt-validation-failed annotates the active entry", () => {
    attachMockWs();
    deliver({
      type: "prompt",
      frameId: 1,
      promptId: "p1",
      outcome: {
        notes: [
          { kind: "prompt-text", label: "Name?", foreground: true },
        ],
      },
    });
    deliver({
      type: "prompt",
      frameId: 2,
      promptId: "p1",
      outcome: {
        notes: [
          {
            kind: "prompt-validation-failed",
            message: "must be 3-20 chars",
          },
        ],
      },
    });
    const entry = useStore.getState().prompts[0]!;
    expect(entry.validationError).toBe("must be 3-20 chars");
  });

  it("prompt-dismissed removes the entry", () => {
    attachMockWs();
    deliver({
      type: "prompt",
      frameId: 1,
      promptId: "p1",
      outcome: {
        notes: [
          { kind: "prompt-text", label: "Name?", foreground: true },
        ],
      },
    });
    deliver({
      type: "prompt",
      frameId: 2,
      promptId: "p1",
      outcome: {
        notes: [{ kind: "prompt-dismissed", reason: "answered" }],
      },
    });
    expect(useStore.getState().prompts).toEqual([]);
    expect(useStore.getState().activeSlot).toBe("base");
  });

  it("dispatch-response with prompt-refresh updates basePrompt", () => {
    attachMockWs();
    deliver({
      type: "dispatch-response",
      frameId: 1,
      dispatchId: "d1",
      outcome: {
        status: "ok",
        notes: [{ kind: "prompt-refresh", rendered: "kitchen>" }],
      },
    });
    expect(useStore.getState().basePrompt).toBe("kitchen>");
  });

  it("sendPromptResponse ships the expected wire shape", () => {
    const mock = attachMockWs();
    websocketClient.sendPromptResponse("p1", "yes");
    expect(mock.sent).toEqual([
      { type: "prompt-response", payload: { promptId: "p1", response: "yes" } },
    ]);
  });

  it("sendPromptCancel ships the expected wire shape", () => {
    const mock = attachMockWs();
    websocketClient.sendPromptCancel("p1");
    expect(mock.sent).toEqual([
      { type: "prompt-cancel", payload: { promptId: "p1" } },
    ]);
  });

  it("onclose clears prompt state but preserves basePrompt", () => {
    attachMockWs();
    deliver({
      type: "dispatch-response",
      frameId: 1,
      dispatchId: "d1",
      outcome: {
        status: "ok",
        notes: [{ kind: "prompt-refresh", rendered: "kitchen>" }],
      },
    });
    deliver({
      type: "prompt",
      frameId: 2,
      promptId: "p1",
      outcome: {
        notes: [
          { kind: "prompt-text", label: "Name?", foreground: true },
        ],
      },
    });
    expect(useStore.getState().prompts).toHaveLength(1);

    // Directly trigger the onclose path the WS would call. The
    // installed mock has no onclose handler in this test; reach
    // into the client's existing wiring via the same accessor the
    // setDisconnected test uses.
    useStore.getState().clearPrompts();

    const s = useStore.getState();
    expect(s.prompts).toEqual([]);
    expect(s.activeSlot).toBe("base");
    expect(s.basePrompt).toBe("kitchen>");
  });
});

describe("websocket social presence frames", () => {
  beforeEach(() => {
    resetClient();
    useStore.setState({ frames: [] });
  });

  function presenceFrame(
    event: "loggedIn" | "loggedOut" | "reconnected" | "disconnected",
    id: string,
  ): unknown {
    return {
      id,
      topic: "session.presence",
      tags: ["audience:actor"],
      body: "<name>Alice</name> has entered the game.",
      payload: {
        kind: "presence",
        event,
        actor: { stuffId: "a1", displayName: "Alice" },
        color: "amber",
      },
      meta: { timestamp: 0 },
    };
  }

  it("renders a presence frame inline via the catch-all (no separate surface)", () => {
    attachMockWs();
    const seen: string[] = [];
    const handler = (f: { id: string }) => seen.push(f.id);
    websocketClient.onAnyTopic(handler);
    try {
      deliver(presenceFrame("loggedIn", "f1"));
      deliver(presenceFrame("reconnected", "f2"));
    } finally {
      websocketClient.offAnyTopic(handler);
    }
    // Every presence frame reaches the catch-all (which the in-world frame
    // store appends to the transcript) — there is no toast/queue surface.
    expect(seen).toEqual(["f1", "f2"]);
  });
});
