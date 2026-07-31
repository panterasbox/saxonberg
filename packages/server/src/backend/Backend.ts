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
import type {
  AuthProvider,
  Envelope,
  PassportGoogleProfile,
} from '@saxonberg/types';
import { INTENTIONAL_LEAVE_CLOSE_CODE } from '@saxonberg/types';
import type {
  LinkResult,
  ProviderProfile,
  UnlinkResult,
} from './Application';
import { Application } from './Application';
import { ConnectionManager } from './ConnectionManager';
import type { InboundClientMessage } from './inbound/index';
import { ExecutionContextApi } from '../mud/api/execution-context';
import { SecurityApi } from '../mud/api/security';

/**
 * Build a deterministic synthetic Google profile for test-mode login.
 * The fixed `id` (`e2e:<handle>`) makes user/avatar creation
 * idempotent across runs. Used only by `handleTestAuthentication`.
 */
function syntheticTestProfile(handle: string): PassportGoogleProfile {
  const safe = handle.replace(/[^a-z0-9_-]/gi, '').toLowerCase() || 'default';
  return {
    id: `e2e:${safe}`,
    displayName: handle,
    emails: [{ value: `${safe}@e2e.local`, verified: true }],
    provider: 'google',
    _raw: '',
    _json: {},
  };
}

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
   * Per-socket inbound serialization chain. `ws` fires the `message`
   * callback synchronously per frame and never awaits the async
   * handler, so two rapid messages from one client would otherwise
   * process concurrently. We instead chain each socket's messages so
   * they apply in arrival order. This is the player-facing invariant
   * (a single actor's commands run in sequence, not interleaved) and
   * it also prevents same-template clone collisions — char-gen routes
   * every `enroll` field through the one `EnrollController` template,
   * and two concurrent clones of one path trip `StuffApi.clone`'s
   * in-flight cycle guard. Entry removed on socket close.
   */
  private inboundChainBySocketId: Map<string, Promise<void>> = new Map();

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
   * Send an envelope (dispatch-response, activity-update, prompt)
   * to a specific WebSocket connection. The wire layer is JSON
   * stringify; envelope and MessageFrame share the same transport.
   * The client discriminates on the `type` field.
   */
  public sendEnvelopeToSocket(socketId: string, envelope: Envelope): void {
    const ws = this.socketsBySocketId.get(socketId);

    if (!ws) {
      console.error(`Backend.sendEnvelopeToSocket(): Socket ${socketId} not found`);
      return;
    }

    if (ws.readyState !== ws.OPEN) {
      console.error(`Backend.sendEnvelopeToSocket(): Socket ${socketId} not open`);
      return;
    }

    try {
      ws.send(JSON.stringify(envelope));
    } catch (error) {
      console.error(`Backend.sendEnvelopeToSocket(): Error sending envelope:`, error);
    }
  }

  /**
   * Handle WebSocket connection.
   * Called by WebSocketService when a new connection is established.
   *
   * @param ws - WebSocket connection
   * @param userId - User ID from session (sentinel `service:broadcast`
   *   for the read-only broadcast principal)
   * @param sessionId - Session ID
   * @param isBroadcast - true for the read-only livestream broadcast
   *   principal: no User/Login/Avatar is created — Application routes it
   *   straight to the `BroadcastFeed` as a pure push target, so it can't
   *   run commands by construction.
   */
  public handleWebSocketConnect(
    ws: WebSocket,
    userId: string,
    sessionId: string,
    isBroadcast = false,
    clientIp?: string
  ): void {
    // Generate socket ID
    const socketId = `socket_${SecurityApi.uuid()}`;

    // Store WebSocket connection
    this.socketsBySocketId.set(socketId, ws);

    console.info(`Backend: WebSocket connected - socketId=${socketId}, userId=${userId}`);

    // Setup WebSocket event handlers
    ws.on('message', (data: Buffer) => {
      this.handleWebSocketMessage(socketId, data);
    });

    ws.on('close', (code: number) => {
      this.handleWebSocketClose(socketId, code);
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
        app.handleUserConnect(userId, sessionId, socketId, isBroadcast, clientIp)
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
    let message: InboundClientMessage;
    try {
      message = JSON.parse(data.toString()) as InboundClientMessage;
    } catch (error) {
      console.error(`Backend: Error parsing WebSocket message:`, error);

      // Send error response
      this.sendMessageToSocket(socketId, {
        type: 'error',
        payload: {
          message: 'Invalid message format',
        },
      });
      return;
    }

    if (!this.application) return;
    const app = this.application;

    // Chain this message behind the socket's prior one so they process
    // in arrival order (see `inboundChainBySocketId`). `runRoot` plants
    // a fresh root frame regardless of the calling continuation, so the
    // message-driven call stack is still rooted at Backend.
    const prior = this.inboundChainBySocketId.get(socketId) ?? Promise.resolve();
    const next = prior
      .then(() =>
        ExecutionContextApi.runRoot(Backend, 'processUserMessage', () => {
          // Sandbox taint at the INBOUND boundary (roots table, kind
          // (a) — Interactive principal): everything this socket asks
          // for runs as the body currently holding it. The command
          // path establishes this for itself, but so must every other
          // inbound handler — an MQL subscribe, a one-shot query, a
          // client-state write — or work done on a player's behalf
          // while they stand inside their circle is field-scoped and
          // the boundary denies reads of their own body.
          const holder = ConnectionManager.get()
            .getInteractive(socketId)
            ?.getHolder() as { getCircleScope?: () => string | null } | null;
          const scope = holder?.getCircleScope?.() ?? null;
          if (scope !== null) ExecutionContextApi.establishCircleScope(scope);
          return app.processUserMessage(socketId, message);
        })
      )
      .catch((error) => {
        console.error(
          `Backend: inbound processing error for socket ${socketId}:`,
          error
        );
      });
    this.inboundChainBySocketId.set(socketId, next);
  }

  /**
   * Handle WebSocket close.
   *
   * @param socketId - Socket ID
   * @param code - WebSocket close code. The client closes with
   *   {@link INTENTIONAL_LEAVE_CLOSE_CODE} on a deliberate sign-out /
   *   switch-character (vs a network drop), so a clean departure is
   *   distinguishable from an involuntary linkdead downstream.
   */
  private handleWebSocketClose(socketId: string, code?: number): void {
    console.info(`Backend: WebSocket closed - socketId=${socketId}`);

    // Remove from registry
    this.socketsBySocketId.delete(socketId);
    this.inboundChainBySocketId.delete(socketId);

    // Notify Application of disconnection. Root frame on the boundary.
    if (this.application) {
      const app = this.application;
      const intentional = code === INTENTIONAL_LEAVE_CLOSE_CODE;
      ExecutionContextApi.runRoot(Backend, 'handleUserDisconnect', () =>
        app.handleUserDisconnect(socketId, intentional)
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
   * Handle a successful provider authentication (login). Called by a
   * Passport strategy's verify callback after the provider OAuth
   * succeeds. Provider-parameterized: the verify callback passes its
   * `provider` argument so the find-or-create routes to the right
   * collection/key. `runRoot` lives here because only `backend/**` may
   * push call frames — `services/` may not.
   *
   * @param provider - which login provider authenticated
   * @param profile - normalized profile (Google) / profile+tokens (Twitch)
   * @param done - Passport callback (session principal carries authProvider)
   */
  public async handleProviderAuth(
    provider: AuthProvider,
    profile: ProviderProfile,
    done: (
      error: unknown,
      user?: { id: string; authProvider: AuthProvider }
    ) => void
  ): Promise<void> {
    try {
      if (!this.application) {
        throw new Error('Backend: Application not initialized');
      }
      const app = this.application;
      const userId = await ExecutionContextApi.runRoot(
        Backend,
        'findOrCreateUserFromProvider',
        () => app.findOrCreateUserFromProvider(provider, profile)
      );
      // Session principal carries authProvider for downstream
      // name-refraction (reserved this build).
      done(null, { id: userId, authProvider: provider });
    } catch (error) {
      console.error('Backend: Error in handleProviderAuth:', error);
      done(error);
    }
  }

  /**
   * Handle a provider *link* — the authenticated link OAuth round-trip
   * attaches the second provider's profile to the current `User` rather
   * than minting a session. The `services/`-layer route never calls
   * `Application` across the frame boundary directly; this seam plants
   * the root frame (only `backend/**` may push call frames).
   *
   * @param provider - which provider is being linked
   * @param userId - the currently-authenticated user's id
   * @param profile - the link OAuth's resolved profile
   * @param done - callback delivered the {@link LinkResult}
   */
  public async handleProviderLink(
    provider: AuthProvider,
    userId: string,
    profile: ProviderProfile,
    done: (error: unknown, result?: LinkResult) => void
  ): Promise<void> {
    try {
      if (!this.application) {
        throw new Error('Backend: Application not initialized');
      }
      const app = this.application;
      const result = await ExecutionContextApi.runRoot(
        Backend,
        'linkProvider',
        () => app.linkProvider(userId, provider, profile)
      );
      done(null, result);
    } catch (error) {
      console.error('Backend: Error in handleProviderLink:', error);
      done(error);
    }
  }

  /**
   * Handle a provider *unlink* — clears the FK on the current `User` and
   * deletes the orphaned profile. No OAuth round-trip; plain
   * authenticated operation behind the same root-frame discipline.
   *
   * @param provider - which provider to unlink
   * @param userId - the currently-authenticated user's id
   * @param done - callback delivered the {@link UnlinkResult}
   */
  public async handleProviderUnlink(
    provider: AuthProvider,
    userId: string,
    done: (error: unknown, result?: UnlinkResult) => void
  ): Promise<void> {
    try {
      if (!this.application) {
        throw new Error('Backend: Application not initialized');
      }
      const app = this.application;
      const result = await ExecutionContextApi.runRoot(
        Backend,
        'unlinkProvider',
        () => app.unlinkProvider(userId, provider)
      );
      done(null, result);
    } catch (error) {
      console.error('Backend: Error in handleProviderUnlink:', error);
      done(error);
    }
  }

  /**
   * TEST-ONLY authentication. Mints a session user for a deterministic
   * synthetic profile, bypassing Google OAuth. Mirrors
   * `handleProviderAuth('google', …)` exactly — same `runRoot` root
   * frame, same provider-parameterized creation path, same
   * `done(null, { id })` shape — so the resulting session and Avatar
   * are indistinguishable from a real login.
   *
   * Hard-gated on `AUTH_MODE === 'test'`: refuses regardless of how it
   * is reached. The route that calls this is itself only mounted in
   * test mode (see `Server` + `TestAuthRoutes`); this is the second
   * line of defense. `runRoot` lives here because only `backend/**`
   * (and a few framework dirs) may push call frames — `services/` may
   * not.
   *
   * @param handle - stable label → deterministic user/avatar (idempotent)
   * @param done - same callback shape as the OAuth verify path
   */
  public async handleTestAuthentication(
    handle: string,
    done: (error: unknown, user?: { id: string }) => void,
    withCharacter = false,
    startLocation?: string,
    wizard = false
  ): Promise<void> {
    if (process.env.AUTH_MODE !== 'test') {
      done(new Error('Backend: test authentication is disabled'));
      return;
    }
    try {
      if (!this.application) {
        throw new Error('Backend: Application not initialized');
      }
      const app = this.application;
      const profile = syntheticTestProfile(handle);
      const userId = await ExecutionContextApi.runRoot(
        Backend,
        'handleTestAuthentication',
        async () => {
          // Test seam stays Google-shaped — passes provider: 'google'
          // through the same provider-parameterized creation path.
          const id = await app.findOrCreateUserFromProvider('google', profile);
          // Optionally provision a ready character so in-world E2E tests
          // skip char-gen. char-gen specs omit this (0 chars → intake).
          if (withCharacter)
            await app.provisionTestCharacter(id, handle, startLocation, wizard);
          return id;
        }
      );
      done(null, { id: userId });
    } catch (error) {
      console.error('Backend: Error in handleTestAuthentication:', error);
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
