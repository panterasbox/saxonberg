/**
 * WebSocketService - WebSocket server management
 *
 * Responsibilities:
 * - Initialize WebSocket server
 * - Handle WebSocket upgrades with session validation
 * - Delegate connections to Backend
 */

import { WebSocketServer } from 'ws';
import type { Server as HttpServer } from 'http';
import type { IncomingMessage } from 'http';
import type { Socket } from 'net';
import type { RequestHandler } from 'express';
import type { Backend } from '../../backend/Backend';

/**
 * WebSocketService - Manages WebSocket server.
 */
export class WebSocketService {
  private wss: WebSocketServer | null = null;
  private backend: Backend;

  /**
   * Constructor.
   *
   * @param backend - Backend instance for connection callbacks
   */
  constructor(backend: Backend) {
    this.backend = backend;
  }

  /**
   * Initialize WebSocket server.
   *
   * @param httpServer - HTTP server to attach to
   * @param sessionMiddleware - Express session middleware
   * @returns WebSocket server instance
   */
  public initialize(
    httpServer: HttpServer,
    sessionMiddleware: RequestHandler
  ): WebSocketServer {
    this.wss = new WebSocketServer({
      noServer: true,
      clientTracking: true,
      maxPayload: 50 * 1024 * 1024, // 50MB
    });

    // Handle WebSocket upgrade with session middleware
    httpServer.on('upgrade', (request: IncomingMessage, socket: Socket, head: Buffer) => {
      // Run session middleware to populate req.session
      sessionMiddleware(request as any, {} as any, () => {
        this.handleUpgrade(request, socket, head);
      });
    });

    console.info('WebSocketService: WebSocket server initialized');

    return this.wss;
  }

  /**
   * Handle WebSocket upgrade request.
   * Validates session and delegates to Backend if authenticated.
   *
   * @param request - HTTP upgrade request
   * @param socket - TCP socket
   * @param head - First packet of upgraded stream
   */
  private handleUpgrade(
    request: IncomingMessage,
    socket: Socket,
    head: Buffer
  ): void {
    // Get session from request
    const session = (request as any).session;
    const userId = session?.passport?.user?.id;

    if (!userId) {
      console.warn('WebSocketService: WebSocket upgrade rejected - no userId in session');
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    // Session is valid - proceed with WebSocket upgrade
    this.wss!.handleUpgrade(request, socket, head, (ws) => {
      const sessionId = session.id;

      console.info(
        `WebSocketService: WebSocket upgrade successful - userId=${userId}, sessionId=${sessionId}`
      );

      // Delegate to Backend
      this.backend.handleWebSocketConnect(ws, userId, sessionId);
    });
  }

  /**
   * Get the WebSocket server instance.
   */
  public getServer(): WebSocketServer | null {
    return this.wss;
  }

  /**
   * Close WebSocket server.
   */
  public close(): void {
    if (this.wss) {
      this.wss.close();
      this.wss = null;
      console.info('WebSocketService: WebSocket server closed');
    }
  }
}
