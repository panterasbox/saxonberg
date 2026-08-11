import { beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type {
  MqlSubscriptionDeltaEnvelope,
  MqlSubscriptionResultEnvelope,
} from "@saxonberg/types";
import { useStore } from "../../store/index";
import { websocketClient } from "../../services/websocket";
import { InspectionPane } from "../InspectionPane";

/**
 * Minimal mock WebSocket sufficient for the wire client's `send` +
 * `isConnected` checks. Mirrors the mock used by the
 * `websocket.test.ts` suite.
 */
class MockWebSocket {
  public readyState: number = 1; // OPEN
  public sent: unknown[] = [];
  send(data: string): void {
    this.sent.push(JSON.parse(data));
  }
  close(): void {
    this.readyState = 3;
  }
}

function attachMockWs(): MockWebSocket {
  const mock = new MockWebSocket();
  (
    websocketClient as unknown as { ws: MockWebSocket | null }
  ).ws = mock;
  return mock;
}

function resetClient(): void {
  useStore.setState({
    stuffRegistry: new Map(),
    paneFocusName: null,
    paneFocusFragment: "",
    paneBodyPainted: false,
    paneLastResult: null,
    paneBreadcrumbRoot: null,
    paneBreadcrumbTrail: [],
    paneDetailPath: [],
    auth: {
      isAuthenticated: false,
      user: null,
      player: null,
    },
  });
  const c = websocketClient as unknown as {
    ws: MockWebSocket | null;
    mqlSubscriptions: Map<string, unknown>;
    reconnectAttempts: number;
    topicHandlers: Map<string, unknown[]>;
    envelopeHandlers: Map<string, unknown[]>;
  };
  c.ws = null;
  c.mqlSubscriptions = new Map();
  c.reconnectAttempts = 0;
  c.topicHandlers = new Map();
  c.envelopeHandlers = new Map();
}

function deliver(envelope: unknown): void {
  act(() => {
    (
      websocketClient as unknown as {
        handleMessage: (data: string) => void;
      }
    ).handleMessage(JSON.stringify(envelope));
  });
}

function paintBody(): void {
  act(() => {
    useStore.getState().setPanePainted(true);
  });
}

/**
 * Pull the subscriptionId the pane registered with the wire client.
 * The pane mints a UUID; the test needs the exact id to address delta
 * envelopes at the same subscription. Pass the PANE NAME to disambiguate
 * the two.
 *
 * ⚠ This used to key on `spec.query`, because the pane used to send MQL.
 * It does not any more — the server owns what a named pane subscribes
 * to — so the query is not something the client knows or should.
 */
function currentSubscriptionId(pane: string = "inspect"): string {
  const c = websocketClient as unknown as {
    mqlSubscriptions: Map<
      string,
      { subscriptionId: string; spec: { pane?: string } }
    >;
  };
  for (const entry of c.mqlSubscriptions.values()) {
    if (entry.spec.pane === pane) return entry.subscriptionId;
  }
  throw new Error(`no subscription registered for pane ${pane}`);
}

describe("InspectionPane", () => {
  beforeEach(() => {
    resetClient();
  });

  it("mounts with cleared body and a placeholder", () => {
    attachMockWs();
    const onSend = vi.fn();
    render(<InspectionPane onSendCommand={onSend} />);

    // Header shows the empty-focused fallback.
    expect(screen.getByText("nothing focused")).toBeDefined();
    // Body shows the placeholder (cleared state).
    const placeholder = screen.getByLabelText("paint pane body");
    expect(placeholder.textContent).toContain("look");
  });

  it("subscribes to the focus + location queries on mount and unsubscribes on unmount", () => {
    const mock = attachMockWs();
    const onSend = vi.fn();
    const { unmount } = render(<InspectionPane onSendCommand={onSend} />);

    const subscribes = mock.sent.filter(
      (m) => (m as { type?: string }).type === "mql-subscribe"
    );
    expect(subscribes).toHaveLength(2);
    const panes = subscribes.map(
      (m) => (m as { payload: { pane?: string } }).payload.pane
    );
    // ⭐ The pane opens `inspect` and `location` BY NAME. It sends no
    // query, no cardinality, no field set and no dependency flags — the
    // server owns every one of those. A client that named its own query
    // here would be holding a server semantic.
    expect(panes).toContain("inspect");
    expect(panes).toContain("location");
    for (const m of subscribes) {
      const payload = (m as { payload: Record<string, unknown> }).payload;
      expect(payload.query, "the client must not send MQL").toBeUndefined();
      expect(payload.cardinality).toBeUndefined();
      expect(payload.fields).toBeUndefined();
    }

    mock.sent = [];
    unmount();

    const unsubscribes = mock.sent.filter(
      (m) => (m as { type?: string }).type === "mql-unsubscribe"
    );
    expect(unsubscribes).toHaveLength(2);
  });

  it("updates the header from the initial result envelope and auto-paints the body", () => {
    attachMockWs();
    const onSend = vi.fn();
    render(<InspectionPane onSendCommand={onSend} />);
    const subId = currentSubscriptionId();

    const env: MqlSubscriptionResultEnvelope = {
      type: "mql-subscription-result",
      frameId: 1,
      subscriptionId: subId,
      result: [
        {
          stuffId: "room-1",
          displayName: "The Atrium",
          shortDescription: "a sunlit atrium",
          longDescription: "Tall windows admit the morning light.",
        } as never,
      ],
    };
    deliver(env);

    // Header reflects the new display name.
    expect(screen.getByText("The Atrium")).toBeDefined();
    // First-delivery auto-paint: the body renders the long description
    // without needing an explicit `look`. Subsequent focus-shifts still
    // clear (see the focus-change tests below).
    expect(
      screen.getByText("Tall windows admit the morning light.")
    ).toBeDefined();
  });

  it("paints the body when the player issues `look`", () => {
    attachMockWs();
    const onSend = vi.fn();
    render(<InspectionPane onSendCommand={onSend} />);
    const subId = currentSubscriptionId();

    deliver({
      type: "mql-subscription-result",
      frameId: 1,
      subscriptionId: subId,
      result: [
        {
          stuffId: "room-1",
          displayName: "The Atrium",
          longDescription: "Tall windows admit the morning light.",
        },
      ],
    } as MqlSubscriptionResultEnvelope);

    // Simulate the App.tsx outgoing-look path.
    paintBody();

    expect(
      screen.getByText("Tall windows admit the morning light.")
    ).toBeDefined();
  });

  it("patches the contents list in place from a delta while painted", () => {
    attachMockWs();
    const onSend = vi.fn();
    render(<InspectionPane onSendCommand={onSend} />);
    const subId = currentSubscriptionId();

    deliver({
      type: "mql-subscription-result",
      frameId: 1,
      subscriptionId: subId,
      result: [
        {
          stuffId: "room-1",
          displayName: "The Atrium",
          contents: [
            { stuffId: "apple-1", displayName: "an apple" },
          ],
        },
      ],
    } as MqlSubscriptionResultEnvelope);
    paintBody();

    // First a single apple is in contents.
    expect(screen.getByText("an apple")).toBeDefined();

    // Then a containment add ships an update on the contents field.
    const delta: MqlSubscriptionDeltaEnvelope = {
      type: "mql-subscription-delta",
      frameId: 2,
      subscriptionId: subId,
      changes: [
        {
          op: "update",
          key: "room-1",
          fields: {
            contents: [
              { stuffId: "apple-1", displayName: "an apple" },
              { stuffId: "pear-1", displayName: "a pear" },
            ],
          } as never,
        },
      ],
    };
    deliver(delta);

    expect(screen.getByText("a pear")).toBeDefined();
    expect(screen.getByText("an apple")).toBeDefined();
  });

  it("renders a list when the result is multi-cardinality", () => {
    attachMockWs();
    const onSend = vi.fn();
    render(<InspectionPane onSendCommand={onSend} />);
    const subId = currentSubscriptionId();

    deliver({
      type: "mql-subscription-result",
      frameId: 1,
      subscriptionId: subId,
      result: [
        { stuffId: "a", displayName: "Alice" },
        { stuffId: "b", displayName: "Bob" },
        { stuffId: "c", displayName: "Carol" },
      ],
    } as MqlSubscriptionResultEnvelope);
    paintBody();

    const matches = screen.getByLabelText("matches");
    expect(within(matches).getByText("Alice")).toBeDefined();
    expect(within(matches).getByText("Bob")).toBeDefined();
    expect(within(matches).getByText("Carol")).toBeDefined();
  });

  it("Refresh button sends `look` through the command sink", () => {
    attachMockWs();
    const onSend = vi.fn();
    render(<InspectionPane onSendCommand={onSend} />);

    fireEvent.click(screen.getByLabelText("refresh pane"));
    expect(onSend).toHaveBeenCalledWith("look");
  });

  it("placeholder click sends `look` through the command sink", () => {
    attachMockWs();
    const onSend = vi.fn();
    render(<InspectionPane onSendCommand={onSend} />);

    fireEvent.click(screen.getByLabelText("paint pane body"));
    expect(onSend).toHaveBeenCalledWith("look");
  });

  it("breadcrumb trail click sends the segment's stored command", () => {
    attachMockWs();
    const onSend = vi.fn();
    useStore.setState({
      paneBreadcrumbRoot: {
        stuffId: "room-1",
        displayName: "the lobby",
        primaryKeyword: "lobby",
      },
      paneBreadcrumbTrail: [
        { label: "apple", command: "look apple" },
        { label: "counter", command: "look counter" },
      ],
    });
    render(<InspectionPane onSendCommand={onSend} />);

    fireEvent.click(screen.getByText("apple"));
    expect(onSend).toHaveBeenCalledWith("look apple");
  });

  it("breadcrumb root click sends look <root-keyword>", () => {
    attachMockWs();
    const onSend = vi.fn();
    useStore.setState({
      paneBreadcrumbRoot: {
        stuffId: "room-1",
        displayName: "the lobby",
        primaryKeyword: "lobby",
      },
      paneBreadcrumbTrail: [],
    });
    render(<InspectionPane onSendCommand={onSend} />);

    // Root label uses the primaryKeyword for brevity + consistency
    // with the trail entries; the displayName ("the lobby") is the
    // fallback for keyword-less roots only.
    fireEvent.click(screen.getByText("lobby"));
    expect(onSend).toHaveBeenCalledWith("look lobby");
  });

  it("contents row click sends `look <primaryKeyword>` (fallback to displayName)", () => {
    attachMockWs();
    const onSend = vi.fn();
    render(<InspectionPane onSendCommand={onSend} />);
    const subId = currentSubscriptionId();

    deliver({
      type: "mql-subscription-result",
      frameId: 1,
      subscriptionId: subId,
      result: [
        {
          stuffId: "room-1",
          displayName: "The Atrium",
          contents: [
            {
              stuffId: "thermo-1",
              displayName: "a brass thermometer",
              primaryKeyword: "thermometer",
            },
            { stuffId: "rock-1", displayName: "a rock" },
          ],
        },
      ],
    } as MqlSubscriptionResultEnvelope);
    paintBody();

    fireEvent.click(screen.getByText("a brass thermometer"));
    expect(onSend).toHaveBeenCalledWith("look thermometer");

    fireEvent.click(screen.getByText("a rock"));
    expect(onSend).toHaveBeenCalledWith("look a rock");
  });

  it("contents rows carry data-stuff-id (interactivity + styling double duty)", () => {
    attachMockWs();
    const onSend = vi.fn();
    render(<InspectionPane onSendCommand={onSend} />);
    const subId = currentSubscriptionId();

    deliver({
      type: "mql-subscription-result",
      frameId: 1,
      subscriptionId: subId,
      result: [
        {
          stuffId: "room-1",
          displayName: "The Atrium",
          contents: [
            { stuffId: "apple-1", displayName: "an apple" },
            { stuffId: "pear-1", displayName: "a pear" },
          ],
        },
      ],
    } as MqlSubscriptionResultEnvelope);
    paintBody();

    const apple = screen.getByText("an apple");
    expect(apple.getAttribute("data-stuff-id")).toBe("apple-1");
    const pear = screen.getByText("a pear");
    expect(pear.getAttribute("data-stuff-id")).toBe("pear-1");
  });

  it("multi-focus rows carry data-stuff-id", () => {
    attachMockWs();
    const onSend = vi.fn();
    render(<InspectionPane onSendCommand={onSend} />);
    const subId = currentSubscriptionId();

    deliver({
      type: "mql-subscription-result",
      frameId: 1,
      subscriptionId: subId,
      result: [
        { stuffId: "alice", displayName: "Alice" },
        { stuffId: "bob", displayName: "Bob" },
      ],
    } as MqlSubscriptionResultEnvelope);
    paintBody();

    expect(screen.getByText("Alice").getAttribute("data-stuff-id")).toBe(
      "alice"
    );
    expect(screen.getByText("Bob").getAttribute("data-stuff-id")).toBe(
      "bob"
    );
  });

  it("hover preview channel fires for Refresh, breadcrumbs, and contents rows", () => {
    attachMockWs();
    const onSend = vi.fn();
    const onPreview = vi.fn();
    useStore.setState({
      paneBreadcrumbRoot: {
        stuffId: "room-1",
        displayName: "the lobby",
        primaryKeyword: "lobby",
      },
      paneBreadcrumbTrail: [],
    });
    render(
      <InspectionPane onSendCommand={onSend} onCommandPreview={onPreview} />
    );
    const subId = currentSubscriptionId();

    deliver({
      type: "mql-subscription-result",
      frameId: 1,
      subscriptionId: subId,
      result: [
        {
          stuffId: "room-1",
          displayName: "the lobby",
          longDescription: "a lobby",
          contents: [
            {
              stuffId: "thermo-1",
              displayName: "a brass thermometer",
              primaryKeyword: "thermometer",
            },
          ],
          exits: [{ direction: "south" }],
        } as never,
      ],
    } as MqlSubscriptionResultEnvelope);
    paintBody();

    // Refresh button: hover → "look", leave → null.
    const refresh = screen.getByLabelText("refresh pane");
    fireEvent.mouseEnter(refresh);
    expect(onPreview).toHaveBeenLastCalledWith("look");
    fireEvent.mouseLeave(refresh);
    expect(onPreview).toHaveBeenLastCalledWith(null);

    // Breadcrumb root (the room): hover → "look lobby". The label
    // is the primaryKeyword ("lobby"), not the displayName. Scope
    // to the trail nav so other "lobby" occurrences don't collide.
    const trail = screen.getByLabelText("focus breadcrumbs");
    const crumb = within(trail).getByText("lobby");
    fireEvent.mouseEnter(crumb);
    expect(onPreview).toHaveBeenLastCalledWith("look lobby");

    // Exit affordance: hover → "go south".
    const exit = screen.getByText("south");
    fireEvent.mouseEnter(exit);
    expect(onPreview).toHaveBeenLastCalledWith("go south");

    // Contents row: hover → "look thermometer" (registry primaryKeyword).
    const thermo = screen.getByText("a brass thermometer");
    fireEvent.mouseEnter(thermo);
    expect(onPreview).toHaveBeenLastCalledWith("look thermometer");
    fireEvent.mouseLeave(thermo);
    expect(onPreview).toHaveBeenLastCalledWith(null);
  });

});
