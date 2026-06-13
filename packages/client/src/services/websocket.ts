/**
 * WebSocket Client Service
 *
 * Inbound messages from the server are `MessageFrame<T>` objects with
 * a `topic` (e.g. `world.speech.say`, `system.connection.established`)
 * and a rendered MML `body`. We dispatch by topic prefix to the
 * built-in handlers and to caller-registered listeners. MML parsing
 * happens at render time inside `MmlRenderer` / `parseMml`; the
 * websocket layer just hands the body string through.
 *
 * Outbound messages use the simple `{ type, payload }` envelope.
 *
 * MQL subscription substrate integration:
 *
 * - `subscribeMql(spec)` opens an `mql-subscribe` with the supplied
 *   query / cardinality / fields (and optional `focusDependent` /
 *   `locationDependent` dependency flags), returns a `subscriptionId`,
 *   and re-issues the subscribe with the same spec on every
 *   `connection-established` event (reconnect-aware).
 * - Inbound `mql-subscription-result` and `mql-subscription-delta`
 *   envelopes are first walked for `StuffRefRecord`-shape records
 *   (the top-level result entries plus any nested `contents` arrays
 *   on detail records) and fed to the session-wide stuff registry
 *   via `useStore.getState().upsertStuffMetadata(...)`. This is a
 *   side-effect cache for rendering metadata only — not authoritative.
 *   See `store/index.ts`.
 */

import type {
  CharGenRosterPayload,
  CharGenStatePayload,
  ConnectionEstablishedPayload,
  DispatchResponseEnvelope,
  Envelope,
  MessageFrame,
  MqlSubscriptionDeltaEnvelope,
  MqlSubscriptionResultEnvelope,
  Note,
  PromptEnvelope,
  StuffDetailRecord,
  StuffRefRecord,
} from "@saxonberg/types";
import { useStore, type PromptEntry, type StuffMetadata } from "../store/index";

interface OutboundClientMessage {
  type: string;
  payload?: unknown;
}

type FrameHandler = (frame: MessageFrame) => void;
type EnvelopeHandler = (envelope: Envelope) => void;

/**
 * MQL subscription spec carried over the wire — mirrors
 * `MqlSubscribeMessage` minus `type` / `subscriptionId`. Held
 * verbatim so the client can re-issue the subscribe on reconnect
 * without the caller needing to remember the spec.
 */
export interface MqlSubscribeSpec {
  query: string;
  cardinality: "one" | "many";
  fields?: string[] | "ref" | "detail";
  detailKey?: string;
  focusDependent?: boolean;
  locationDependent?: boolean;
}

/**
 * Bookkeeping entry for a live MQL subscription. Stores the spec
 * so reconnect can re-issue the same subscribe.
 */
interface MqlSubscriptionEntry {
  subscriptionId: string;
  spec: MqlSubscribeSpec;
}

/**
 * Generates a process-local subscriptionId. The substrate only
 * requires per-Interactive uniqueness, but a UUID-shape string keeps
 * collisions impossible across reconnects within the same client
 * session.
 */
function makeSubscriptionId(): string {
  // crypto.randomUUID is available in modern browsers + jsdom (vitest).
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID.
  return `sub-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string = "";
  private reconnectAttempts: number = 0;
  // Set by `disconnect()` so the next `onclose` skips auto-reconnect
  // (logout / leave-world drive the phase themselves).
  private intentionalDisconnect: boolean = false;
  // Exponential backoff over ~60s: delays 1·2·4·8·16·30·30s. The server
  // does NOT reap a real avatar on linkdead, so a generous window lets a
  // user ride straight through a server restart (standup deploy) without
  // touching anything; the manual Reconnect affordance is the backstop.
  private maxReconnectAttempts: number = 7;
  private reconnectBaseDelay: number = 1000;
  private reconnectMaxDelay: number = 30000;
  private topicHandlers: Map<string, FrameHandler[]> = new Map();
  /**
   * Catch-all frame handlers. Fired AFTER per-topic dispatch so
   * existing per-topic call sites (inspection pane, prompt slice)
   * keep working unmodified. The console-foundations frame store
   * uses this single subscription to consume every inbound frame.
   */
  private anyTopicHandlers: Set<FrameHandler> = new Set();
  private envelopeHandlers: Map<Envelope["type"], EnvelopeHandler[]> =
    new Map();

  /**
   * Active MQL subscriptions, keyed by subscriptionId. Re-issued on
   * every `connection-established` event so subscriptions survive
   * reconnects without consumer involvement.
   */
  private mqlSubscriptions: Map<string, MqlSubscriptionEntry> = new Map();

  constructor() {
    this.registerBuiltinHandlers();
  }

  /**
   * Wire the engine's own topic handlers through the same `onTopic`
   * registry external callers use — char-gen frames are not special-
   * cased in the dispatch switch. `system.connection.established`
   * stays in the switch: it's a one-off connection-lifecycle frame,
   * not part of this growing per-feature list.
   *
   * Char-gen frames carry structured payloads through the Login's
   * Sensor (no new envelope type). The roster drives the character-
   * select screen; the per-step state drives the char-gen stage. Both
   * flip the connection phase via the store. `system.charactergen.
   * welcome` carries no payload and reaches the catch-all so its prose
   * lands in the terminal.
   */
  private registerBuiltinHandlers(): void {
    this.onTopic("system.charactergen.roster", (frame) => {
      useStore
        .getState()
        .setCharGenRoster((frame.payload as CharGenRosterPayload).characters);
    });
    this.onTopic("system.charactergen.state", (frame) => {
      useStore.getState().setCharGenState(frame.payload as CharGenStatePayload);
    });
    // The `clear` verb's signal frame — empty body (so it never renders
    // a scrollback line), handled purely by emptying the buffer.
    this.onTopic("system.terminal.clear", () => {
      useStore.getState().clearFrames();
    });
  }

  public connect(url: string): void {
    this.url = url;

    if (this.ws) {
      console.warn("WebSocketClient: Already connected");
      return;
    }

    console.info(`WebSocketClient: Connecting to ${url}...`);

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.info("WebSocketClient: Connected");
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onclose = () => {
        console.info("WebSocketClient: Connection closed");
        this.ws = null;

        // Intentional teardown (logout / leave-world): the caller has
        // already driven the phase. Don't auto-reconnect, don't flip to
        // 'reconnecting'.
        if (this.intentionalDisconnect) {
          this.intentionalDisconnect = false;
          useStore.getState().clearPrompts();
          useStore.getState().clearFrames();
          return;
        }

        // Retrying — `reconnecting` keeps the cockpit up and input
        // gated while the backoff loop runs.
        useStore.getState().setDisconnected(undefined, "reconnecting");
        // Pending prompts targeted THIS connection's Interactive.
        // The server's host-disconnected cancelAll already rejected
        // every await on its side; dropping the client mirror keeps
        // both halves in sync. Base prompt + draft for the base
        // slot are preserved across the disconnect so a quick
        // reconnect feels seamless (the next dispatch refreshes the
        // base prompt anyway).
        useStore.getState().clearPrompts();
        // Frames are session-scoped; drop the buffer so scrollback
        // doesn't span a reconnect (welcome-scene-on-reconnect
        // anchors the new session at the top).
        useStore.getState().clearFrames();

        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error("WebSocketClient: Error:", error);
        useStore.getState().setDisconnected("WebSocket error", "reconnecting");
      };
    } catch (error) {
      console.error("WebSocketClient: Failed to connect:", error);
      useStore.getState().setDisconnected("Failed to connect", "reconnecting");
    }
  }

  /**
   * Manual reconnect — resets the backoff counter and reconnects from
   * scratch. Wired to the "Reconnect" affordance (after a drop) and to
   * "Switch character" (which bounces through Login → roster).
   *
   * The old socket is torn down **cleanly** first: its handlers are
   * detached (so its in-flight frames can't leak into the new session,
   * and its `onclose` can't null out the new socket) and it's closed (so
   * the server drops the old Interactive instead of leaving a zombie
   * connection multiplexed onto the same avatar). Scrollback + prompts
   * are cleared so the next session starts fresh.
   */
  public reconnectNow(): void {
    this.reconnectAttempts = 0;
    const old = this.ws;
    this.ws = null;
    if (old) {
      old.onmessage = null;
      old.onclose = null;
      old.onerror = null;
      old.onopen = null;
      try {
        old.close();
      } catch {
        /* already closing/closed */
      }
    }
    useStore.getState().clearFrames();
    useStore.getState().clearPrompts();
    useStore.getState().setDisconnected(undefined, "reconnecting");
    this.connect(this.url);
  }

  /**
   * Intentional teardown — close the socket and do NOT auto-reconnect.
   * Used by logout / leave-world, where the caller drives the phase
   * back to the start screen or roster itself.
   */
  public disconnect(): void {
    this.intentionalDisconnect = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  public send(message: OutboundClientMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error("WebSocketClient: Cannot send - not connected");
      return;
    }

    try {
      this.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error("WebSocketClient: Error sending message:", error);
    }
  }

  public sendPing(): void {
    this.send({
      type: "ping",
      payload: { timestamp: Date.now() },
    });
  }

  /**
   * Send a response to an active server-side prompt. Routes via
   * the `prompt-response` inbound channel — bypasses the command
   * bus per the substrate's two-channel design.
   *
   * `response` is the wire-string form per the prompt kind:
   * passthrough for `text` / `choice`; `'yes'`/`'no'` for
   * `confirm`; stuffId for `mql-object`; JSON-encoded string
   * array of stuffIds for `mql-many`. Callers package per kind
   * (CommandBar / PromptArea); this method does no encoding.
   */
  public sendPromptResponse(promptId: string, response: string): void {
    this.send({
      type: "prompt-response",
      payload: { promptId, response },
    });
  }

  /**
   * Cancel a specific active prompt — the X-button affordance on
   * the prompt slot. Substrate rejects the await with
   * `PromptCancelledError('cancelled')` and ships a
   * `prompt-dismissed` envelope. Wholesale cancel rides the
   * command bus as `prompt cancel`, not this channel.
   */
  public sendPromptCancel(promptId: string): void {
    this.send({
      type: "prompt-cancel",
      payload: { promptId },
    });
  }

  /**
   * Persist a single `ClientStateMixin` key. Mirrors the generic
   * wire path documented in the console-foundations plan: every
   * feature's UI mutations (tab edits, theme changes, etc.) route
   * through this single outbound message. The server validates the
   * key against the aggregated `ClientStateMixin` schema chain.
   */
  public sendClientStateWrite(key: string, value: unknown): void {
    this.send({
      type: "client-state-write",
      payload: { key, value },
    });
  }

  /**
   * Register a handler for a specific topic. The handler fires for
   * every frame whose `topic` matches exactly. (Prefix matching can
   * be added later if a use case demands it.)
   */
  public onTopic(topic: string, handler: FrameHandler): void {
    if (!this.topicHandlers.has(topic)) {
      this.topicHandlers.set(topic, []);
    }
    this.topicHandlers.get(topic)!.push(handler);
  }

  public offTopic(topic: string, handler: FrameHandler): void {
    const handlers = this.topicHandlers.get(topic);
    if (!handlers) return;
    const index = handlers.indexOf(handler);
    if (index !== -1) handlers.splice(index, 1);
  }

  /**
   * Register a catch-all handler. The handler fires for every
   * inbound `MessageFrame` AFTER any matching per-topic handlers
   * have run, regardless of topic. Used by the console foundation's
   * frame store so previously-unseen topics still reach the buffer.
   */
  public onAnyTopic(handler: FrameHandler): void {
    this.anyTopicHandlers.add(handler);
  }

  public offAnyTopic(handler: FrameHandler): void {
    this.anyTopicHandlers.delete(handler);
  }

  /**
   * Register a handler for a specific envelope type. Parallel to
   * `onTopic` for `MessageFrame`s — envelope frames discriminate on
   * `type` (`dispatch-response` | `activity-update` | `prompt`),
   * not `topic`.
   */
  public onEnvelope(type: Envelope["type"], handler: EnvelopeHandler): void {
    if (!this.envelopeHandlers.has(type)) {
      this.envelopeHandlers.set(type, []);
    }
    this.envelopeHandlers.get(type)!.push(handler);
  }

  public offEnvelope(type: Envelope["type"], handler: EnvelopeHandler): void {
    const handlers = this.envelopeHandlers.get(type);
    if (!handlers) return;
    const index = handlers.indexOf(handler);
    if (index !== -1) handlers.splice(index, 1);
  }

  private handleMessage(data: string): void {
    try {
      const frame: unknown = JSON.parse(data);

      // Server→client raw push for `ClientStateMixin` keys. Bypasses
      // the Sensor pipeline (no frameId, no topic) — substrate
      // plumbing, not narrative. Dispatched directly to the store.
      if (
        typeof frame === "object" &&
        frame !== null &&
        (frame as { type?: unknown }).type === "client-state-update" &&
        (frame as { frameId?: unknown }).frameId === undefined
      ) {
        const update = frame as {
          type: "client-state-update";
          payload: { key: string; value: unknown };
        };
        useStore
          .getState()
          .setLocalClientState(update.payload.key, update.payload.value);
        return;
      }

      // Envelope frames carry `type` + numeric `frameId`; MessageFrames
      // carry `topic`. Two channels, two shapes — discriminate
      // structurally.
      if (
        typeof frame === "object" &&
        frame !== null &&
        typeof (frame as { type?: unknown }).type === "string" &&
        typeof (frame as { frameId?: unknown }).frameId === "number"
      ) {
        const envelope = frame as Envelope;
        console.debug(
          `WebSocketClient: Received envelope type='${envelope.type}' frameId=${envelope.frameId}`,
        );

        // Side-effect: feed the session-wide stuff registry from every
        // subscription result / delta envelope BEFORE dispatching to
        // widget handlers. Walks the top-level result records plus any
        // nested `'ref'`-shape fields (v1: `contents`). Per
        // inspection-pane plan W7: the registry is the wire-fed cache
        // every `MmlRenderer.commandFor` lookup reads.
        this.feedStuffRegistry(envelope);

        // Side-effect: keep the prompt-stack slice and base-prompt
        // string in sync. Two envelope shapes feed it: `prompt`
        // envelopes (push/dismiss/annotate the stack), and
        // `dispatch-response` envelopes whose `outcome.notes`
        // optionally carry a `prompt-refresh` Note.
        this.applyPromptSideEffects(envelope);

        const handlers = this.envelopeHandlers.get(envelope.type);
        if (handlers) {
          for (const handler of handlers) handler(envelope);
        } else {
          console.debug(
            `WebSocketClient: No handler for envelope type='${envelope.type}'`,
          );
        }
        return;
      }

      const messageFrame = frame as MessageFrame;
      console.debug(
        `WebSocketClient: Received frame topic='${messageFrame.topic}'`,
      );

      // Built-in connection-lifecycle frame. Feature frames (char-gen,
      // etc.) register through `onTopic` in `registerBuiltinHandlers`
      // and are dispatched by the per-topic loop below.
      if (messageFrame.topic === "system.connection.established") {
        this.handleConnectionEstablished(
          messageFrame.payload as ConnectionEstablishedPayload,
        );
      }

      const handlers = this.topicHandlers.get(messageFrame.topic);
      if (handlers) {
        for (const handler of handlers) {
          handler(messageFrame);
        }
      }

      // Catch-all dispatch — fires regardless of topic, after the
      // per-topic loop. Console foundation's frame store hooks here.
      for (const handler of this.anyTopicHandlers) {
        handler(messageFrame);
      }
    } catch (error) {
      console.error("WebSocketClient: Error handling message:", error);
    }
  }

  private handleConnectionEstablished(
    payload: ConnectionEstablishedPayload,
  ): void {
    console.info("WebSocketClient: Connection established:", payload);
    useStore.getState().setConnected(payload);

    // Re-issue every active MQL subscription on every
    // connection-established event. The server re-instantiates the
    // Interactive's subscription registry on reconnect; sending the
    // subscribe again is what makes the substrate re-ship the initial
    // result on the new connection.
    for (const sub of this.mqlSubscriptions.values()) {
      this.send({
        type: "mql-subscribe",
        payload: {
          subscriptionId: sub.subscriptionId,
          ...sub.spec,
        },
      });
    }
  }

  /**
   * Open an `mql-subscribe` with the supplied spec. The subscription
   * is tracked locally and re-issued on every `connection-established`
   * event, so callers don't need to re-subscribe on reconnect.
   *
   * Dependency flags (`focusDependent` / `locationDependent`) install
   * holder-level dependency entries the result-walk wouldn't naturally
   * find — opt in when the query is a holder-pointer expression like
   * `$focus` or `here`.
   */
  public subscribeMql(spec: MqlSubscribeSpec): string {
    const subscriptionId = makeSubscriptionId();
    this.mqlSubscriptions.set(subscriptionId, { subscriptionId, spec });
    if (this.isConnected()) {
      this.send({
        type: "mql-subscribe",
        payload: { subscriptionId, ...spec },
      });
    }
    return subscriptionId;
  }

  /**
   * Tear down a subscription opened via `subscribeMql`. Sends
   * `mql-unsubscribe` if currently connected, and removes the local
   * bookkeeping so the subscription is not re-issued on the next
   * reconnect.
   */
  public unsubscribe(subscriptionId: string): void {
    const had = this.mqlSubscriptions.delete(subscriptionId);
    if (had && this.isConnected()) {
      this.send({
        type: "mql-unsubscribe",
        payload: { subscriptionId },
      });
    }
  }

  /**
   * Dispatch the per-envelope side effects the prompt substrate
   * needs:
   *
   *   - `prompt` envelopes drive `pushPrompt` / `dismissPrompt` /
   *     `setPromptValidationError`.
   *   - `dispatch-response` envelopes get scanned for
   *     `prompt-refresh` Notes; each one updates `basePrompt`.
   *
   * PromptArea / CommandBar subscribe to the resulting state — the
   * websocket layer never talks to them directly.
   */
  private applyPromptSideEffects(envelope: Envelope): void {
    if (envelope.type === "prompt") {
      this.handlePromptEnvelope(envelope as PromptEnvelope);
      return;
    }
    if (envelope.type === "dispatch-response") {
      const env = envelope as DispatchResponseEnvelope;
      for (const note of env.outcome.notes) {
        if (note.kind === "prompt-refresh") {
          useStore.getState().setBasePrompt(note.rendered);
        }
      }
    }
  }

  /**
   * Walk a `PromptEnvelope`'s `outcome.notes` and translate each
   * one into a store mutation. The substrate ships exactly one
   * substrate-side note per delivery:
   *
   *   - `prompt-choice` / `prompt-confirm` / `prompt-text` /
   *     `prompt-mql-object` / `prompt-mql-many` → push entry.
   *   - `prompt-validation-failed` → annotate existing entry.
   *   - `prompt-dismissed` → remove entry (answered, cancelled,
   *     or host-disconnected).
   */
  private handlePromptEnvelope(envelope: PromptEnvelope): void {
    const store = useStore.getState();
    const promptId = envelope.promptId;
    for (const note of envelope.outcome.notes) {
      const entry = this.promptEntryFromNote(promptId, note);
      if (entry) {
        store.pushPrompt(entry);
        continue;
      }
      if (note.kind === "prompt-validation-failed") {
        store.setPromptValidationError(promptId, note.message);
        continue;
      }
      if (note.kind === "prompt-dismissed") {
        store.dismissPrompt(promptId);
        continue;
      }
    }
  }

  /**
   * Map a substrate Note onto a `PromptEntry` for the store, or
   * return `null` if the note isn't a push-shape kind. Keeps the
   * discriminator walk in one place so `handlePromptEnvelope`
   * doesn't have to re-walk the union for the validation /
   * dismissed branches.
   */
  private promptEntryFromNote(
    promptId: string,
    note: Note,
  ): PromptEntry | null {
    switch (note.kind) {
      case "prompt-choice":
        return {
          kind: "choice",
          promptId,
          label: note.label,
          choices: note.choices,
          foreground: note.foreground,
          ...(note.defaultChoice !== undefined
            ? { defaultChoice: note.defaultChoice }
            : {}),
        };
      case "prompt-confirm":
        return {
          kind: "confirm",
          promptId,
          label: note.label,
          defaultAnswer: note.defaultAnswer,
          foreground: note.foreground,
        };
      case "prompt-text":
        return {
          kind: "text",
          promptId,
          label: note.label,
          foreground: note.foreground,
          ...(note.placeholder !== undefined
            ? { placeholder: note.placeholder }
            : {}),
        };
      case "prompt-mql-object":
        return {
          kind: "mql-object",
          promptId,
          label: note.label,
          matches: note.matches,
          foreground: note.foreground,
        };
      case "prompt-mql-many":
        return {
          kind: "mql-many",
          promptId,
          label: note.label,
          matches: note.matches,
          foreground: note.foreground,
          ...(note.min !== undefined ? { min: note.min } : {}),
          ...(note.max !== undefined ? { max: note.max } : {}),
        };
      default:
        return null;
    }
  }

  /**
   * Walk an inbound subscription envelope for ref-shape records and
   * upsert them into the session-wide stuff registry. Each top-level
   * record is fed; for detail records, the `contents` array (the v1
   * recognized ref-shape nested field) is walked recursively.
   *
   * Records on the wire vary: result envelopes ship the initial state;
   * delta envelopes carry per-change `fields` partials. Both shapes
   * are extracted and forwarded to the registry's `upsertStuffMetadata`
   * — fields-present overwrite, fields-absent leave intact.
   */
  private feedStuffRegistry(envelope: Envelope): void {
    if (
      envelope.type !== "mql-subscription-result" &&
      envelope.type !== "mql-subscription-delta"
    ) {
      return;
    }
    const collected: StuffMetadata[] = [];
    if (envelope.type === "mql-subscription-result") {
      this.collectRefRecords(
        (envelope as MqlSubscriptionResultEnvelope).result,
        collected,
      );
    } else {
      for (const change of (envelope as MqlSubscriptionDeltaEnvelope).changes) {
        if (change.fields) {
          this.collectRefRecords([change.fields], collected);
        }
      }
    }
    if (collected.length > 0) {
      useStore.getState().upsertStuffMetadata(collected);
    }
  }

  /**
   * Push every ref-shape record (top-level plus any nested
   * `contents` array) into `out` as `StuffMetadata`. Records lacking
   * a `stuffId` are skipped — the registry is keyed on stuffId, and
   * partial deltas may omit the key when they patch a non-Stuff
   * surface (the projection's structural fields).
   */
  private collectRefRecords(
    records: ReadonlyArray<
      | StuffRefRecord
      | StuffDetailRecord
      | Partial<StuffRefRecord | StuffDetailRecord>
      | Record<string, unknown>
    >,
    out: StuffMetadata[],
  ): void {
    for (const rec of records) {
      if (!rec || typeof rec !== "object") continue;
      const r = rec as Partial<StuffDetailRecord>;
      if (typeof r.stuffId === "string") {
        const meta: StuffMetadata = { stuffId: r.stuffId };
        if (typeof r.displayName === "string") {
          meta.displayName = r.displayName;
        }
        if (typeof r.primaryKeyword === "string") {
          meta.primaryKeyword = r.primaryKeyword;
        }
        out.push(meta);
      }
      // Recurse into recognized ref-shape nested fields (v1: contents).
      const contents = r.contents;
      if (Array.isArray(contents)) {
        this.collectRefRecords(contents, out);
      }
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("WebSocketClient: Max reconnection attempts reached");
      // Give up → `dropped`. For an authed non-guest this surfaces the
      // Reconnect banner (context preserved); a dropped guest is routed
      // to the start screen by the store (avatar reaped, nothing to
      // resume).
      useStore.getState().setDisconnected("Connection lost", "dropped");
      return;
    }
    // Exponential backoff, capped: 1·2·4·8·16·30·30s.
    const delay = Math.min(
      this.reconnectMaxDelay,
      this.reconnectBaseDelay * 2 ** this.reconnectAttempts,
    );
    this.reconnectAttempts++;
    console.warn(
      `WebSocketClient: Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`,
    );
    setTimeout(() => {
      this.connect(this.url);
    }, delay);
  }

  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

export const websocketClient = new WebSocketClient();
