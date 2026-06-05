/**
 * WebSocket Client Service
 *
 * Inbound messages from the server are now `MessageFrame<T>` objects
 * with a `topic` (e.g. `world.speech.say`, `system.connection.established`)
 * and a rendered MML `body`. We dispatch by topic prefix to the
 * built-in handlers and to caller-registered listeners. MML parsing
 * is deferred — the body renders as plain text with literal tags
 * visible (per §14 of the messaging requirements).
 *
 * Outbound messages still use the simple `{ type, payload }` envelope
 * — the inbound protocol redesign is out of scope (§1.2).
 *
 * MQL subscription substrate integration:
 *
 * - `subscribeToCanonicalKind(kind)` opens an `mql-subscribe` against
 *   a server-registered canonical kind (e.g. `'me.focus'`), returns a
 *   `subscriptionId`, and re-issues the subscribe on every
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
  ConnectionEstablishedPayload,
  Envelope,
  MessageFrame,
  MqlSubscriptionDeltaEnvelope,
  MqlSubscriptionResultEnvelope,
  StuffDetailRecord,
  StuffRefRecord,
} from '@saxonberg/types';
import { useStore, type StuffMetadata } from '../store/index';

interface OutboundClientMessage {
  type: string;
  payload?: unknown;
}

type FrameHandler = (frame: MessageFrame) => void;
type EnvelopeHandler = (envelope: Envelope) => void;

/**
 * Bookkeeping entry for a canonical-kind subscription. We keep the
 * `kind` (the only piece needed to re-issue the subscribe on
 * reconnect) and the `subscriptionId` (so callers can unsubscribe).
 */
interface CanonicalKindSubscription {
  subscriptionId: string;
  kind: string;
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
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID.
  return `sub-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string = '';
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 2000;
  private topicHandlers: Map<string, FrameHandler[]> = new Map();
  private envelopeHandlers: Map<Envelope['type'], EnvelopeHandler[]> = new Map();

  /**
   * Active canonical-kind subscriptions, keyed by subscriptionId.
   * Re-issued on every `connection-established` event so subscriptions
   * survive reconnects without consumer involvement.
   */
  private canonicalKindSubscriptions: Map<string, CanonicalKindSubscription> =
    new Map();

  public connect(url: string): void {
    this.url = url;

    if (this.ws) {
      console.warn('WebSocketClient: Already connected');
      return;
    }

    console.info(`WebSocketClient: Connecting to ${url}...`);

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.info('WebSocketClient: Connected');
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onclose = () => {
        console.info('WebSocketClient: Connection closed');
        this.ws = null;

        useStore.getState().setDisconnected();

        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocketClient: Error:', error);
        useStore.getState().setDisconnected('WebSocket error');
      };
    } catch (error) {
      console.error('WebSocketClient: Failed to connect:', error);
      useStore.getState().setDisconnected('Failed to connect');
    }
  }

  public disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  public send(message: OutboundClientMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('WebSocketClient: Cannot send - not connected');
      return;
    }

    try {
      this.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error('WebSocketClient: Error sending message:', error);
    }
  }

  public sendEcho(message: string): void {
    this.send({
      type: 'echo',
      payload: { message, timestamp: Date.now() },
    });
  }

  public sendPing(): void {
    this.send({
      type: 'ping',
      payload: { timestamp: Date.now() },
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
   * Register a handler for a specific envelope type. Parallel to
   * `onTopic` for `MessageFrame`s — envelope frames discriminate on
   * `type` (`dispatch-response` | `activity-update` | `prompt`),
   * not `topic`.
   */
  public onEnvelope(type: Envelope['type'], handler: EnvelopeHandler): void {
    if (!this.envelopeHandlers.has(type)) {
      this.envelopeHandlers.set(type, []);
    }
    this.envelopeHandlers.get(type)!.push(handler);
  }

  public offEnvelope(type: Envelope['type'], handler: EnvelopeHandler): void {
    const handlers = this.envelopeHandlers.get(type);
    if (!handlers) return;
    const index = handlers.indexOf(handler);
    if (index !== -1) handlers.splice(index, 1);
  }

  private handleMessage(data: string): void {
    try {
      const frame: unknown = JSON.parse(data);

      // Envelope frames carry `type` + numeric `frameId`; MessageFrames
      // carry `topic`. Two channels, two shapes — discriminate
      // structurally.
      if (
        typeof frame === 'object' &&
        frame !== null &&
        typeof (frame as { type?: unknown }).type === 'string' &&
        typeof (frame as { frameId?: unknown }).frameId === 'number'
      ) {
        const envelope = frame as Envelope;
        console.debug(
          `WebSocketClient: Received envelope type='${envelope.type}' frameId=${envelope.frameId}`
        );

        // Side-effect: feed the session-wide stuff registry from every
        // subscription result / delta envelope BEFORE dispatching to
        // widget handlers. Walks the top-level result records plus any
        // nested `'ref'`-shape fields (v1: `contents`). Per
        // inspection-pane plan W7: the registry is the wire-fed cache
        // every `MmlRenderer.commandFor` lookup reads.
        this.feedStuffRegistry(envelope);

        const handlers = this.envelopeHandlers.get(envelope.type);
        if (handlers) {
          for (const handler of handlers) handler(envelope);
        } else {
          console.debug(
            `WebSocketClient: No handler for envelope type='${envelope.type}'`
          );
        }
        return;
      }

      const messageFrame = frame as MessageFrame;
      console.debug(
        `WebSocketClient: Received frame topic='${messageFrame.topic}'`
      );

      // Built-in routing by topic.
      switch (messageFrame.topic) {
        case 'system.connection.established':
          this.handleConnectionEstablished(
            messageFrame.payload as ConnectionEstablishedPayload
          );
          break;
        default:
          break;
      }

      const handlers = this.topicHandlers.get(messageFrame.topic);
      if (handlers) {
        for (const handler of handlers) {
          handler(messageFrame);
        }
      }
    } catch (error) {
      console.error('WebSocketClient: Error handling message:', error);
    }
  }

  private handleConnectionEstablished(
    payload: ConnectionEstablishedPayload
  ): void {
    console.info('WebSocketClient: Connection established:', payload);
    useStore.getState().setConnected(payload);

    // Re-issue every active canonical-kind subscription on every
    // connection-established event. The server re-instantiates the
    // Interactive's subscription registry on reconnect; sending the
    // subscribe again is what makes the substrate re-ship the initial
    // result on the new connection.
    for (const sub of this.canonicalKindSubscriptions.values()) {
      this.send({
        type: 'mql-subscribe',
        payload: {
          subscriptionId: sub.subscriptionId,
          kind: sub.kind,
          cardinality: 'many',
          fields: 'detail',
        },
      });
    }
  }

  /**
   * Open an `mql-subscribe` against a server-registered canonical
   * kind (e.g. `'me.focus'`). The substrate overlays the registered
   * spec — `query` / `cardinality` / `fields` / `detailKey` — onto
   * the request; the client-supplied `cardinality: 'many'` and
   * `fields: 'detail'` are placeholders the server discards when the
   * kind is recognized.
   *
   * The returned `subscriptionId` is tracked locally and the subscribe
   * is re-issued on every `connection-established` event, so callers
   * don't need to re-subscribe on reconnect.
   */
  public subscribeToCanonicalKind(kind: string): string {
    const subscriptionId = makeSubscriptionId();
    this.canonicalKindSubscriptions.set(subscriptionId, {
      subscriptionId,
      kind,
    });
    if (this.isConnected()) {
      this.send({
        type: 'mql-subscribe',
        payload: {
          subscriptionId,
          kind,
          cardinality: 'many',
          fields: 'detail',
        },
      });
    }
    return subscriptionId;
  }

  /**
   * Tear down a subscription opened via `subscribeToCanonicalKind`.
   * Sends `mql-unsubscribe` if currently connected, and removes the
   * local bookkeeping so the subscription is not re-issued on the
   * next reconnect.
   */
  public unsubscribe(subscriptionId: string): void {
    const had = this.canonicalKindSubscriptions.delete(subscriptionId);
    if (had && this.isConnected()) {
      this.send({
        type: 'mql-unsubscribe',
        payload: { subscriptionId },
      });
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
      envelope.type !== 'mql-subscription-result' &&
      envelope.type !== 'mql-subscription-delta'
    ) {
      return;
    }
    const collected: StuffMetadata[] = [];
    if (envelope.type === 'mql-subscription-result') {
      this.collectRefRecords(
        (envelope as MqlSubscriptionResultEnvelope).result,
        collected
      );
    } else {
      for (const change of (envelope as MqlSubscriptionDeltaEnvelope)
        .changes) {
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
    out: StuffMetadata[]
  ): void {
    for (const rec of records) {
      if (!rec || typeof rec !== 'object') continue;
      const r = rec as Partial<StuffDetailRecord>;
      if (typeof r.stuffId === 'string') {
        const meta: StuffMetadata = { stuffId: r.stuffId };
        if (typeof r.displayName === 'string') {
          meta.displayName = r.displayName;
        }
        if (typeof r.primaryKeyword === 'string') {
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
      console.error('WebSocketClient: Max reconnection attempts reached');
      useStore
        .getState()
        .setDisconnected('Max reconnection attempts reached');
      return;
    }
    this.reconnectAttempts++;
    console.warn(
      `WebSocketClient: Reconnecting in ${this.reconnectDelay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`
    );
    setTimeout(() => {
      this.connect(this.url);
    }, this.reconnectDelay);
  }

  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

export const websocketClient = new WebSocketClient();
