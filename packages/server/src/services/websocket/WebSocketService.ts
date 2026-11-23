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
import type { RequestHandler, Request, Response } from 'express';
import type { Backend } from '../../backend/Backend';

/**
 * The environment names retired by stream arrival (D15) — a deploy that
 * still sets one is told, once and loudly, what replaced it.
 */
const RETIRED_STREAM_ENV: Readonly<Record<string, string>> = {
  OVERLAY_TWITCH_LOGIN: 'a program\'s Twitch feed (`program channel <name> twitch`)',
  OVERLAY_YOUTUBE_CHANNEL: 'a program\'s YouTube feed (`program channel <name> youtube`)',
  OVERLAY_KICK_CHANNEL: 'a program\'s Kick feed (`program channel <name> kick`)',
  STREAMER_PLAYER_IDS: 'running a program (`program run <name>`) — nobody is the streamer',
  BROADCAST_TOKEN: 'the per-player overlay token (`rodney token`)',
};

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

    this.warnRetiredStreamEnv();

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

  /** One loud line for each retired stream env name still set (D15). */
  private warnRetiredStreamEnv(): void {
    for (const [name, replacement] of Object.entries(RETIRED_STREAM_ENV)) {
      if ((process.env[name] ?? '').trim() === '') continue;
      console.warn(
        `WebSocketService: ${name} is set but RETIRED (stream arrival) and read by nothing — ` +
          `its job is now ${replacement}. Remove it from the environment.`,
      );
    }
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
    // ⭐ Token principals (broadcast-ready D4/D11): `?broadcast=<token>`
    // (an OBS browser source — it can't set WS headers) and
    // `?control=<token>` (pblive's Stream Deck). Checked BEFORE session
    // auth so a cookieless token socket isn't 401'd. Each token names ONE
    // player; neither becomes an Avatar or a CommandGiver.
    const broadcastToken = this.readQueryParam(request.url, 'broadcast');
    const controlToken = this.readQueryParam(request.url, 'control');
    if (broadcastToken !== null || controlToken !== null) {
      void this.acceptTokenSocket(
        request,
        socket,
        head,
        broadcastToken !== null ? 'broadcast' : 'control',
        (broadcastToken ?? controlToken)!,
      );
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

      // Delegate to Backend. `?from=stream` is the show's tagged link
      // (D7) — a closed vocabulary, anything else is no door at all.
      const from = this.readQueryParam(request.url, 'from');
      this.backend.handleWebSocketConnect(ws, userId, sessionId, {
        kind: 'player',
        clientIp,
        arrivedFrom: from === 'stream' ? 'stream' : null,
      });
    });
  }

  /**
   * Resolve a token socket to its player and accept or refuse it.
   *
   * ⭐ Fail loud, never open: an unknown, revoked or wrong-scope token is
   * a 401 with a warning — never a fallback to some shared feed. Every
   * token is a player's own (`rodney token`); there is no env door
   * (stream arrival D15).
   */
  private async acceptTokenSocket(
    request: IncomingMessage,
    socket: Socket,
    head: Buffer,
    kind: 'broadcast' | 'control',
    token: string,
  ): Promise<void> {
    const refuse = (why: string): void => {
      console.warn(`WebSocketService: ${kind} upgrade rejected - ${why}`);
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
    };
    let resolved: { playerId: string; scope: string } | null = null;
    try {
      resolved = await this.backend.resolveStreamToken(token);
    } catch (err) {
      console.error('WebSocketService: stream token lookup failed', err);
      return refuse('token lookup failed');
    }
    const wanted = kind === 'broadcast' ? 'overlay' : 'control';
    if (!resolved) return refuse('unknown or revoked token');
    if (resolved.scope !== wanted) return refuse(`a ${resolved.scope} token on the ${kind} door`);
    const playerId = resolved.playerId;
    const principal = `${kind}:${playerId}`;
    const pid = playerId;
    this.wss!.handleUpgrade(request, socket, head, (ws) => {
      console.info(`WebSocketService: ${kind} upgrade successful - principal=${principal}`);
      this.backend.handleWebSocketConnect(ws, principal, principal, { kind, playerId: pid });
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
