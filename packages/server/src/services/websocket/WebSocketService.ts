/**
 * WebSocketService - WebSocket server management
 *
 * Responsibilities:
 * - Initialize WebSocket server
 * - Handle WebSocket upgrades with session validation
 * - Delegate connections to Backend
 */

import { WebSocketServer } from 'ws';
import { timingSafeEqual } from 'crypto';
import type { Server as HttpServer } from 'http';
import type { IncomingMessage } from 'http';
import type { Socket } from 'net';
import type { RequestHandler, Request, Response } from 'express';
import type { Backend } from '../../backend/Backend';

/** Sentinel userId for the read-only broadcast principal. */
const BROADCAST_PRINCIPAL = 'service:broadcast';

/**
 * Minimum acceptable `BROADCAST_TOKEN` length. The token rides in the
 * OBS browser-source URL (browsers can't set WS headers); it grants
 * only public read-only data, but we still refuse trivially-guessable
 * secrets so a misconfigured deploy fails loud rather than open.
 */
const MIN_BROADCAST_TOKEN_LENGTH = 16;

/**
 * WebSocketService - Manages WebSocket server.
 */
export class WebSocketService {
  private wss: WebSocketServer | null = null;
  private backend: Backend;

  /**
   * The configured broadcast token, or `null` when the broadcast feed
   * is disabled (env var unset or too weak). Resolved once at
   * `initialize()` so per-upgrade work is a cheap compare.
   */
  private broadcastToken: string | null = null;

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

    this.configureBroadcast();

    // Handle WebSocket upgrade with session middleware
    httpServer.on('upgrade', (request: IncomingMessage, socket: Socket, head: Buffer) => {
      // Run session middleware to populate req.session. The upgrade
      // request isn't a full Express Request/Response, but the session
      // middleware only touches the bits it needs.
      sessionMiddleware(
        request as unknown as Request,
        {} as unknown as Response,
        () => {
          this.handleUpgrade(request, socket, head);
        }
      );
    });

    console.info('WebSocketService: WebSocket server initialized');

    return this.wss;
  }

  /**
   * Resolve + validate the broadcast token from the environment.
   * Enables the read-only broadcast feed iff `BROADCAST_TOKEN` is set
   * and strong enough; logs the decision at boot. A set-but-weak token
   * is treated as disabled (fail loud, not open).
   */
  private configureBroadcast(): void {
    const raw = process.env.BROADCAST_TOKEN?.trim();
    if (!raw) {
      this.broadcastToken = null;
      console.info(
        'WebSocketService: broadcast feed DISABLED (BROADCAST_TOKEN unset)'
      );
      return;
    }
    if (raw.length < MIN_BROADCAST_TOKEN_LENGTH) {
      this.broadcastToken = null;
      console.error(
        `WebSocketService: BROADCAST_TOKEN too weak ` +
          `(< ${MIN_BROADCAST_TOKEN_LENGTH} chars) — broadcast feed DISABLED`
      );
      return;
    }
    this.broadcastToken = raw;
    console.warn(
      'WebSocketService: broadcast feed ENABLED — read-only ' +
        `'${BROADCAST_PRINCIPAL}' connections accepted via ?broadcast=<token>`
    );
  }

  /**
   * Constant-time check of a candidate token against the configured
   * broadcast token. Returns false when broadcast is disabled or the
   * lengths differ (the early length check is unavoidable with
   * `timingSafeEqual`, which requires equal-length buffers).
   */
  private matchesBroadcastToken(candidate: string): boolean {
    if (!this.broadcastToken) return false;
    const a = Buffer.from(candidate);
    const b = Buffer.from(this.broadcastToken);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
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
    // Broadcast principal: a `?broadcast=<token>` query param (OBS
    // browser sources can't set WS headers). Checked BEFORE session
    // auth so a cookieless overlay connection isn't 401'd. Accepts as
    // the read-only broadcast principal — no Avatar, no CommandGiver.
    const broadcastToken = this.readQueryParam(request.url, 'broadcast');
    if (broadcastToken !== null) {
      if (this.matchesBroadcastToken(broadcastToken)) {
        this.wss!.handleUpgrade(request, socket, head, (ws) => {
          console.info(
            'WebSocketService: broadcast upgrade successful - ' +
              `principal=${BROADCAST_PRINCIPAL}`
          );
          this.backend.handleWebSocketConnect(
            ws,
            BROADCAST_PRINCIPAL,
            `broadcast:${BROADCAST_PRINCIPAL}`,
            true
          );
        });
      } else {
        console.warn(
          'WebSocketService: broadcast upgrade rejected - bad/disabled token'
        );
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
      }
      return;
    }

    // Get session from request (populated by the session middleware above).
    const session = (
      request as unknown as {
        session?: { id: string; passport?: { user?: { id?: string } } };
      }
    ).session;
    const userId = session?.passport?.user?.id;

    if (!userId || !session) {
      console.warn('WebSocketService: WebSocket upgrade rejected - no userId in session');
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    // Capture the client IP at the handshake (one hop of trust: a
    // proxy's X-Forwarded-For, else the raw socket address). Passed
    // forward so the connection layer can derive country of origin; the
    // raw IP is never persisted.
    const clientIp = this.clientIpOf(request);

    // Session is valid - proceed with WebSocket upgrade
    this.wss!.handleUpgrade(request, socket, head, (ws) => {
      const sessionId = session.id;

      console.info(
        `WebSocketService: WebSocket upgrade successful - userId=${userId}, sessionId=${sessionId}`
      );

      // Delegate to Backend
      this.backend.handleWebSocketConnect(ws, userId, sessionId, false, clientIp);
    });
  }

  /**
   * The connecting client's IP: the first hop of `X-Forwarded-For` when a
   * trusted proxy set it (production behind Caddy), else the raw socket
   * remote address (dev). Returns `undefined` when neither is present.
   */
  private clientIpOf(request: IncomingMessage): string | undefined {
    const xff = request.headers['x-forwarded-for'];
    const forwarded =
      typeof xff === 'string' ? xff.split(',')[0]?.trim() : undefined;
    return forwarded || request.socket.remoteAddress || undefined;
  }

  /**
   * Extract a single query-param value from a raw upgrade-request URL
   * (e.g. `/ws?broadcast=abc`). Returns `null` when the URL or param is
   * absent. A base is supplied because `request.url` is path-relative.
   */
  private readQueryParam(rawUrl: string | undefined, key: string): string | null {
    if (!rawUrl) return null;
    try {
      return new URL(rawUrl, 'http://localhost').searchParams.get(key);
    } catch {
      return null;
    }
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
