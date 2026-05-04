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
 */

import type {
  MessageFrame,
  Pronouns,
  AlternateName,
} from '@saxonberg/types';
import { useStore } from '../store/index';

interface ConnectionEstablishedPayload {
  userId: string;
  socketId: string;
  sessionId: string;
  player: {
    _id: string;
    honorific?: string;
    name: string;
    surname?: string;
    suffix?: string;
    alternateNames?: AlternateName[];
    pronouns: Pronouns;
  };
}

interface OutboundClientMessage {
  type: string;
  payload?: unknown;
}

type FrameHandler = (frame: MessageFrame) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string = '';
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 2000;
  private topicHandlers: Map<string, FrameHandler[]> = new Map();

  public connect(url: string): void {
    this.url = url;

    if (this.ws) {
      console.warn('WebSocketClient: Already connected');
      return;
    }

    console.log(`WebSocketClient: Connecting to ${url}...`);

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('WebSocketClient: Connected');
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onclose = () => {
        console.log('WebSocketClient: Connection closed');
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

  private handleMessage(data: string): void {
    try {
      const frame: MessageFrame = JSON.parse(data);
      console.log(
        `WebSocketClient: Received frame topic='${frame.topic}'`
      );

      // Built-in routing by topic.
      switch (frame.topic) {
        case 'system.connection.established':
          this.handleConnectionEstablished(
            frame.payload as ConnectionEstablishedPayload
          );
          break;
        default:
          break;
      }

      const handlers = this.topicHandlers.get(frame.topic);
      if (handlers) {
        for (const handler of handlers) {
          handler(frame);
        }
      }
    } catch (error) {
      console.error('WebSocketClient: Error handling message:', error);
    }
  }

  private handleConnectionEstablished(
    payload: ConnectionEstablishedPayload
  ): void {
    console.log('WebSocketClient: Connection established:', payload);
    useStore.getState().setConnected(payload);
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
    console.log(
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
