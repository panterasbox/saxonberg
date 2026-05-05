/**
 * Backend - I/O layer singleton
 *
 * Responsibilities:
 * - WebSocket connection management (Map<socketId, WebSocket>)
 * - Message serialization/deserialization
 * - Network I/O
 * - Implements IBackend interface
 *
 * Does NOT:
 * - Track game objects (that's StuffApi's job)
 * - Manage game logic (that's Application's job)
 * - Handle database operations (privileged code uses PersistenceManager directly)
 *
 * This is a singleton - only one instance exists per application.
 */

import type { WebSocket } from 'ws';
import type { IBackend } from './IBackend';
import type { PassportGoogleProfile } from '@saxonberg/types';
import { Application } from './Application';
import { ExecutionContextApi } from '../mud/api/execution-context';

/**
 * Backend - Singleton for I/O operations.
 */
export class Backend implements IBackend {
  private static instance: Backend;

  /**
   * Map of socket IDs to WebSocket connections.
   */
  private socketsBySocketId: Map<string, WebSocket> = new Map();

  /**
   * Reference to Application singleton.
   */
  private application: Application | null = null;

  /**
   * Private constructor (singleton pattern).
   */
  private constructor() {}

  /**
   * Get the singleton instance.
   */
  public static get(): Backend {
    if (!this.instance) {
      this.instance = new Backend();
    }
    return this.instance;
  }

  /**
   * Initialize Backend with Application reference.
   *
   * @param application - Application instance
   */
  public initialize(application: Application): void {
    this.application = application;
  }

  /**
   * Send a message to a specific WebSocket connection.
   *
   * @param socketId - The socket ID to send to
   * @param message - The message object to send
   */
  public sendMessageToSocket(socketId: string, message: unknown): void {
    const ws = this.socketsBySocketId.get(socketId);

    if (!ws) {
      console.error(`Backend.sendMessageToSocket(): Socket ${socketId} not found`);
      return;
    }

    if (ws.readyState !== ws.OPEN) {
      console.error(`Backend.sendMessageToSocket(): Socket ${socketId} not open`);
      return;
    }

    try {
      const json = JSON.stringify(message);
      ws.send(json);
    } catch (error) {
      console.error(`Backend.sendMessageToSocket(): Error sending message:`, error);
    }
  }

  /**
   * Handle WebSocket connection.
   * Called by WebSocketService when a new connection is established.
   *
   * @param ws - WebSocket connection
   * @param userId - User ID from session
   * @param sessionId - Session ID
   */
  public handleWebSocketConnect(
    ws: WebSocket,
    userId: string,
    sessionId: string
  ): void {
    // Generate socket ID
    const socketId = `socket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Store WebSocket connection
    this.socketsBySocketId.set(socketId, ws);

    console.info(`Backend: WebSocket connected - socketId=${socketId}, userId=${userId}`);

    // Setup WebSocket event handlers
    ws.on('message', (data: Buffer) => {
      this.handleWebSocketMessage(socketId, data);
    });

    ws.on('close', () => {
      this.handleWebSocketClose(socketId);
    });

    ws.on('error', (error: Error) => {
      this.handleWebSocketError(socketId, error);
    });

    // Notify Application of new connection. Plant the call-security
    // root frame around the call so the call stack has a well-defined
    // bottom — Backend at the network → Application boundary.
    if (this.application) {
      const app = this.application;
      ExecutionContextApi.runRoot(Backend, 'handleUserConnect', () =>
        app.handleUserConnect(userId, sessionId, socketId)
      );
    }
  }

  /**
   * Handle WebSocket message from client.
   *
   * @param socketId - Socket ID
   * @param data - Raw message data
   */
  private handleWebSocketMessage(socketId: string, data: Buffer): void {
    try {
      const message = JSON.parse(data.toString());

      // Delegate to Application for processing. Root frame on the
      // boundary so the message-driven call stack is rooted at Backend.
      if (this.application) {
        const app = this.application;
        ExecutionContextApi.runRoot(Backend, 'processUserMessage', () =>
          app.processUserMessage(socketId, message)
        );
      }
    } catch (error) {
      console.error(`Backend: Error parsing WebSocket message:`, error);

      // Send error response
      this.sendMessageToSocket(socketId, {
        type: 'error',
        payload: {
          message: 'Invalid message format',
        },
      });
    }
  }

  /**
   * Handle WebSocket close.
   *
   * @param socketId - Socket ID
   */
  private handleWebSocketClose(socketId: string): void {
    console.info(`Backend: WebSocket closed - socketId=${socketId}`);

    // Remove from registry
    this.socketsBySocketId.delete(socketId);

    // Notify Application of disconnection. Root frame on the boundary.
    if (this.application) {
      const app = this.application;
      ExecutionContextApi.runRoot(Backend, 'handleUserDisconnect', () =>
        app.handleUserDisconnect(socketId)
      );
    }
  }

  /**
   * Handle WebSocket error.
   *
   * @param socketId - Socket ID
   * @param error - Error object
   */
  private handleWebSocketError(socketId: string, error: Error): void {
    console.error(`Backend: WebSocket error - socketId=${socketId}:`, error);

    // Clean up connection
    this.socketsBySocketId.delete(socketId);
  }

  /**
   * Handle successful Google authentication.
   * Called by Passport strategy after Google OAuth succeeds.
   *
   * @param profile - Google profile data from Passport
   * @param done - Passport callback
   */
  public async handleAuthenticationSuccess(
    profile: PassportGoogleProfile,
    done: (error: any, user?: any) => void
  ): Promise<void> {
    try {
      // Delegate to Application for user/player creation
      if (!this.application) {
        throw new Error('Backend: Application not initialized');
      }

      // OAuth callback path also enters Application from the network
      // boundary, so plant the same root frame here.
      const app = this.application;
      const userId = await ExecutionContextApi.runRoot(
        Backend,
        'findOrCreateUserFromGoogle',
        () => app.findOrCreateUserFromGoogle(profile)
      );

      // Return user object for session serialization
      done(null, { id: userId });
    } catch (error) {
      console.error('Backend: Error in handleAuthenticationSuccess:', error);
      done(error);
    }
  }

  /**
   * Get count of active WebSocket connections.
   */
  public getConnectionCount(): number {
    return this.socketsBySocketId.size;
  }

  /**
   * Close all WebSocket connections (for shutdown).
   */
  public closeAllConnections(): void {
    for (const [socketId, ws] of this.socketsBySocketId.entries()) {
      try {
        ws.close();
      } catch (error) {
        console.error(`Backend: Error closing socket ${socketId}:`, error);
      }
    }

    this.socketsBySocketId.clear();
  }
}
