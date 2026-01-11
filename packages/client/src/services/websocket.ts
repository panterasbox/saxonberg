/**
 * WebSocket Client Service
 *
 * Manages WebSocket connection to the server.
 *
 * Features:
 * - Auto-connect/reconnect
 * - Message type routing
 * - State management integration
 */

import type {
  WebSocketMessage,
  MessageType,
  ConnectionEstablishedPayload,
  EchoPayload,
  ErrorPayload,
} from '@saxonberg/types';
import { useStore } from '../store/index.js';

/**
 * Message handler function type.
 */
type MessageHandler = (payload: any) => void;

/**
 * WebSocket client singleton.
 */
class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string = '';
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 2000;
  private messageHandlers: Map<string, MessageHandler[]> = new Map();

  /**
   * Connect to WebSocket server.
   *
   * @param url - WebSocket URL (e.g., ws://localhost:2010)
   */
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

        // Attempt reconnection
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

  /**
   * Disconnect from WebSocket server.
   */
  public disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Send a message to the server.
   *
   * @param message - Message object
   */
  public send(message: WebSocketMessage): void {
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

  /**
   * Send echo message (for testing).
   *
   * @param message - Message to echo
   */
  public sendEcho(message: string): void {
    this.send({
      type: 'echo',
      payload: {
        message,
        timestamp: Date.now(),
      },
    });
  }

  /**
   * Send ping message (heartbeat).
   */
  public sendPing(): void {
    this.send({
      type: 'ping',
      payload: {
        timestamp: Date.now(),
      },
    });
  }

  /**
   * Register a message handler for a specific message type.
   *
   * @param type - Message type
   * @param handler - Handler function
   */
  public on(type: string, handler: MessageHandler): void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, []);
    }

    this.messageHandlers.get(type)!.push(handler);
  }

  /**
   * Unregister a message handler.
   *
   * @param type - Message type
   * @param handler - Handler function
   */
  public off(type: string, handler: MessageHandler): void {
    const handlers = this.messageHandlers.get(type);
    if (!handlers) return;

    const index = handlers.indexOf(handler);
    if (index !== -1) {
      handlers.splice(index, 1);
    }
  }

  /**
   * Handle incoming message from server.
   *
   * @param data - Raw message data
   */
  private handleMessage(data: string): void {
    try {
      const message: WebSocketMessage = JSON.parse(data);

      console.log(`WebSocketClient: Received message type '${message.type}'`);

      // Built-in handlers
      switch (message.type) {
        case 'connection_established':
          this.handleConnectionEstablished(
            message.payload as ConnectionEstablishedPayload
          );
          break;

        case 'error':
          this.handleError(message.payload as ErrorPayload);
          break;

        case 'echo':
          console.log('WebSocketClient: Echo response:', message.payload);
          break;

        case 'pong':
          console.log('WebSocketClient: Pong response:', message.payload);
          break;

        default:
          // No default handler
          break;
      }

      // Call registered handlers
      const handlers = this.messageHandlers.get(message.type);
      if (handlers) {
        for (const handler of handlers) {
          handler(message.payload);
        }
      }
    } catch (error) {
      console.error('WebSocketClient: Error handling message:', error);
    }
  }

  /**
   * Handle connection_established message.
   */
  private handleConnectionEstablished(
    payload: ConnectionEstablishedPayload
  ): void {
    console.log('WebSocketClient: Connection established:', payload);
    useStore.getState().setConnected(payload);
  }

  /**
   * Handle error message.
   */
  private handleError(payload: ErrorPayload): void {
    console.error('WebSocketClient: Server error:', payload);
    useStore.getState().setConnection({ error: payload.message });
  }

  /**
   * Attempt to reconnect after connection loss.
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(
        'WebSocketClient: Max reconnection attempts reached'
      );
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

  /**
   * Check if connected.
   */
  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// Export singleton instance
export const websocketClient = new WebSocketClient();
