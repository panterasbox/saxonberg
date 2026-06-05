/**
 * Application - Game logic coordinator singleton
 *
 * Responsibilities:
 * - User connection lifecycle (handleUserConnect, handleUserDisconnect)
 * - Message routing between client and game
 * - Initial game state (starting location - future)
 * - User/Player creation and lookup
 *
 * Does NOT:
 * - Track connections (that's ConnectionManager's job)
 * - Track all objects (that's StuffApi's job)
 * - Handle I/O directly (that's Backend's job)
 * - Manage database (that's PersistenceManager's job)
 *
 * This is a singleton - only one instance exists per application.
 */

import type { IBackend } from './IBackend';
import type {
  Envelope,
  EnvelopeTemplate,
  MessageFrame,
  PassportGoogleProfile,
} from '@saxonberg/types';

/**
 * Local minimal type for inbound client → server messages. Kept simple
 * — the inbound protocol isn't part of the messaging redesign (§1).
 */
interface InboundClientMessage {
  type: string;
  payload?: unknown;
  id?: string;
}
import { PersistenceManager, Collections } from './PersistenceManager';
import { ConnectionManager } from './ConnectionManager';
import type { Interactive } from '../mud/obj/Interactive';
import { Login } from '../mud/obj/Login';
import { MqlSubscriptionApi } from '../mud/api/mql-subscription';
import { PromptApi, renderPromptRefresh } from '../mud/api/prompt';
import type {
  MqlSubscribeMessage,
  MqlUnsubscribeMessage,
  PromptResponseMessage,
  PromptCancelMessage,
} from '@saxonberg/types';
import { User } from '../mud/lib/identity/User';
import { TemplateApi } from '../mud/api/template';
import { StuffApi } from '../mud/api/stuff';
import { Avatar } from '../mud/obj/Avatar';
import { Template } from '../mud/lib/stuff/Template';
import { nanoid } from 'nanoid';
import { CallSecurity } from '../mud/lib/security/decorators';
import { SecurityPolicies } from '../mud/lib/security/SecurityPolicies';

/**
 * Sets the class-default policy for Application's instance methods to
 * `Public`. Backend wraps every entry call site in
 * `ExecutionContextApi.runRoot(Backend, ...)`, so the live frame at
 * Application's top is the network → Application root frame; this
 * decorator is a forward-compatible declaration of intent rather than
 * a runtime intercept (instance methods on Application aren't
 * proxy-mediated). Per-method `@CallSecurity(...)` on any specific
 * Application method would override.
 */
@CallSecurity(SecurityPolicies.Public)
export class Application {
  private static instance: Application;

  private backend: IBackend | null = null;

  private constructor() {}

  public static get(): Application {
    if (!this.instance) {
      this.instance = new Application();
    }
    return this.instance;
  }

  public initialize(backend: IBackend): void {
    this.backend = backend;
    console.info('Application: Initialized with Backend');
  }

  /**
   * Send a `MessageFrame` to a specific Interactive's client. Sole
   * gateway for game objects to reach Backend — Application owns
   * Backend communication. Stamps `meta.frameId` per-Interactive at
   * send-time so multi-device Avatars receive monotonic streams from
   * each Interactive's perspective.
   *
   * Error / auth notifications (raw `{type, payload}` shapes) go
   * directly through `Backend.sendMessageToSocket` and bypass this
   * chokepoint — they're not Sensor-pipeline frames and have no
   * `frameId` to stamp.
   */
  public sendMessageToInteractive(
    interactive: Interactive,
    frame: MessageFrame,
  ): void {
    const socketId = interactive.getSocketId();
    if (!this.backend || !socketId) return;
    const stamped: MessageFrame = {
      ...frame,
      meta: { ...frame.meta, frameId: interactive.nextFrameId() },
    };
    this.backend.sendMessageToSocket(socketId, stamped);
  }

  /**
   * Envelope counterpart to {@link sendMessageToInteractive}. Stamps
   * `frameId` per-Interactive from the same `Interactive.nextFrameId`
   * counter used for prose frames — one ordering primitive across all
   * server→client traffic.
   */
  public sendEnvelopeToInteractive(
    interactive: Interactive,
    template: EnvelopeTemplate
  ): void {
    const socketId = interactive.getSocketId();
    if (!this.backend || !socketId) return;
    const stamped: Envelope = {
      ...template,
      frameId: interactive.nextFrameId(),
    } as Envelope;
    this.backend.sendEnvelopeToSocket(socketId, stamped);
  }

  /**
   * Handle user connection. Loads the authenticated User, spins up an
   * Interactive, and hands off to Login to run the entry procedure.
   */
  public async handleUserConnect(
    userId: string,
    sessionId: string,
    socketId: string
  ): Promise<void> {
    if (!this.backend) {
      console.error('Application: Backend not initialized');
      return;
    }

    try {
      console.info(`Application: User connecting - userId=${userId}, socketId=${socketId}`);

      const user = await User.findById(userId);
      if (!user) {
        throw new Error(`Application: User ${userId} not found`);
      }

      const interactive = await ConnectionManager.get().createInteractive(
        socketId,
        sessionId,
        user
      );

      const login = await StuffApi.create(() => new Login(interactive));
      await login.enter();
    } catch (error) {
      console.error('Application: Error in handleUserConnect:', error);

      if (this.backend) {
        this.backend.sendMessageToSocket(socketId, {
          type: 'error',
          payload: {
            message: 'Failed to connect user',
            error: error instanceof Error ? error.message : String(error),
          },
        });
      }
    }
  }

  public handleUserDisconnect(socketId: string): void {
    console.info(`Application: User disconnecting - socketId=${socketId}`);

    // Tear down per-Interactive substrate state BEFORE removing the
    // Interactive so any final substrate-side delivery still has a
    // live Interactive to address.
    //
    // Order:
    //   1. MQL subscriptions (silent in v1; cancelled-reason
    //      envelopes ship from a later subsystem).
    //   2. Prompts (PromptApi rejects pending awaits with
    //      PromptCancelledError { reason: 'host-disconnected' };
    //      controllers' try/catch can react before the Interactive
    //      goes away).
    //   3. removeInteractive (below).
    const interactive = ConnectionManager.get().getInteractive(socketId);
    if (interactive) {
      MqlSubscriptionApi.cancelAllForInteractive(interactive);
      PromptApi.cancelAll(interactive, 'host-disconnected');
    }

    const removed = ConnectionManager.get().removeInteractive(socketId);

    if (removed) {
      console.info(`Application: User disconnected successfully`);
    } else {
      console.warn(`Application: No Interactive found for socket ${socketId}`);
    }
  }

  public processUserMessage(socketId: string, message: InboundClientMessage): void {
    const interactive = ConnectionManager.get().getInteractive(socketId);

    if (!interactive) {
      console.warn(`Application: No Interactive found for socket ${socketId}`);
      return;
    }

    if (!this.backend) {
      console.error('Application: Backend not initialized');
      return;
    }

    switch (message.type) {
      case 'echo':
        this.handleEchoMessage(socketId, message);
        break;

      case 'ping':
        this.handlePingMessage(socketId, message);
        break;

      case 'command':
        this.handleCommandMessage(socketId, message).catch((error) => {
          console.error(`Application: Command error for socket ${socketId}:`, error);
          if (this.backend) {
            this.backend.sendMessageToSocket(socketId, {
              type: 'error',
              payload: { message: 'Command execution failed' },
            });
          }
        });
        break;

      case 'mql-subscribe':
        this.handleMqlSubscribe(socketId, message);
        break;

      case 'mql-unsubscribe':
        this.handleMqlUnsubscribe(socketId, message);
        break;

      case 'prompt-response':
        this.handlePromptResponse(socketId, message);
        break;

      case 'prompt-cancel':
        this.handlePromptCancel(socketId, message);
        break;

      default:
        console.warn(`Application: Unknown message type: ${message.type}`);
        this.backend.sendMessageToSocket(socketId, {
          type: 'error',
          payload: {
            message: `Unknown message type: ${message.type}`,
          },
        });
    }
  }

  /**
   * Route `mql-subscribe` to the substrate. Drops on shape mismatch
   * without an error envelope — the substrate handles substantive
   * checks (duplicate id, MQL parse, focus + cardinality cross-check,
   * unknown `kind`).
   *
   * When `kind` is present, the substrate looks the name up against
   * its canonical-kind registry and overlays the registered spec
   * onto the request; `query` and `cardinality` are optional on the
   * wire in that case. When `kind` is absent, both are required.
   */
  private handleMqlSubscribe(socketId: string, message: InboundClientMessage): void {
    const interactive = ConnectionManager.get().getInteractive(socketId);
    if (!interactive) return;
    const payload = message.payload as MqlSubscribeMessage | undefined;
    if (!payload || typeof payload.subscriptionId !== 'string') {
      return;
    }
    const hasKind = typeof payload.kind === 'string';
    if (!hasKind) {
      // Raw subscribe — query + cardinality required.
      if (
        typeof payload.query !== 'string' ||
        (payload.cardinality !== 'one' && payload.cardinality !== 'many')
      ) {
        return;
      }
    }
    MqlSubscriptionApi.handleSubscribe({
      interactive,
      subscriptionId: payload.subscriptionId,
      ...(typeof payload.query === 'string' ? { query: payload.query } : {}),
      ...(payload.cardinality === 'one' || payload.cardinality === 'many'
        ? { cardinality: payload.cardinality }
        : {}),
      fields: payload.fields,
      detailKey: payload.detailKey,
      ...(hasKind ? { kind: payload.kind } : {}),
    });
  }

  /**
   * Route `mql-unsubscribe` to the substrate. Silent no-op when the
   * id is unknown (substrate behavior).
   */
  private handleMqlUnsubscribe(socketId: string, message: InboundClientMessage): void {
    const interactive = ConnectionManager.get().getInteractive(socketId);
    if (!interactive) return;
    const payload = message.payload as MqlUnsubscribeMessage | undefined;
    if (!payload || typeof payload.subscriptionId !== 'string') return;
    MqlSubscriptionApi.handleUnsubscribe(interactive, payload.subscriptionId);
  }

  /**
   * Route `prompt-response` to the substrate. Bypasses the command
   * bus (the slate's two-channel inbound protocol); the substrate
   * looks up the resolver by promptId and either resolves the
   * await or — when a validator rejects — emits
   * `prompt-validation-failed` and keeps the prompt alive.
   */
  private handlePromptResponse(socketId: string, message: InboundClientMessage): void {
    const interactive = ConnectionManager.get().getInteractive(socketId);
    if (!interactive) return;
    const payload = message.payload as PromptResponseMessage['payload'] | undefined;
    if (
      !payload ||
      typeof payload.promptId !== 'string' ||
      typeof payload.response !== 'string'
    ) {
      return;
    }
    PromptApi.handleResponse(interactive, payload);
  }

  /**
   * Route `prompt-cancel` to the substrate — the X-button
   * affordance on the client's prompt area. Wholesale cancel
   * rides the command bus separately via the `prompt cancel`
   * verb (Wave 4).
   */
  private handlePromptCancel(socketId: string, message: InboundClientMessage): void {
    const interactive = ConnectionManager.get().getInteractive(socketId);
    if (!interactive) return;
    const payload = message.payload as PromptCancelMessage['payload'] | undefined;
    if (!payload || typeof payload.promptId !== 'string') return;
    PromptApi.handleCancel(interactive, payload);
  }

  private handleEchoMessage(socketId: string, message: InboundClientMessage): void {
    if (!this.backend) return;

    this.backend.sendMessageToSocket(socketId, {
      type: 'echo',
      payload: message.payload,
    });
  }

  private handlePingMessage(socketId: string, _message: InboundClientMessage): void {
    if (!this.backend) return;

    this.backend.sendMessageToSocket(socketId, {
      type: 'pong',
      payload: {
        timestamp: Date.now(),
      },
    });
  }

  private async handleCommandMessage(socketId: string, message: InboundClientMessage): Promise<void> {
    if (!this.backend) return;

    const interactive = ConnectionManager.get().getInteractive(socketId);
    // Avatar-specific dispatch path: builds a location-bound
    // CommandContext. When Login (or any other HasInteractive) starts
    // running commands of its own, that's a separate dispatch path —
    // its CommandContext won't have a location.
    const holder = interactive?.getHolder();
    if (!interactive || !(holder instanceof Avatar)) {
      this.backend.sendMessageToSocket(socketId, {
        type: 'error',
        payload: { message: 'No active character' },
      });
      return;
    }

    const commandText = (message.payload as { text: string }).text?.trim();
    if (!commandText) {
      // MUD-style "press Enter for a fresh prompt." Empty command
      // line short-circuits to a dispatch-response carrying only
      // the prompt-refresh Note. No parser, no controller, no
      // controller side-effects. Runs even when the avatar has no
      // container (a placeless avatar should still see their
      // current prompt).
      const refresh = renderPromptRefresh(holder);
      const template: EnvelopeTemplate = {
        type: 'dispatch-response',
        dispatchId: nanoid(),
        outcome: { status: 'ok', notes: [refresh] },
      };
      this.sendEnvelopeToInteractive(interactive, template);
      return;
    }

    const avatar = holder;
    // The avatar must be inside *some* Container (Location, Vessel, …)
    // for command dispatch — the value isn't used past this guard, we
    // just need to bail out on the placeless edge case.
    if (!avatar.getContainer()) {
      this.backend.sendMessageToSocket(socketId, {
        type: 'error',
        payload: { message: 'Avatar has no location' },
      });
      return;
    }

    // executeCommand returns void; the dispatch-response envelope
    // (fired through the Sensor pipeline to every connected
    // Interactive) is the sole outcome carrier. Any prose the
    // controller wanted the player to see fires via Scene inside
    // the controller body.
    await avatar.executeCommand(commandText, { interactive });
  }

  /**
   * Find or create User + GoogleProfile from a Google OAuth profile. For
   * new users, seed a default avatar template and append its playerId to
   * `user.playerIds`.
   */
  public async findOrCreateUserFromGoogle(
    profile: PassportGoogleProfile
  ): Promise<string> {
    try {
      const googleProfileId = await this.findOrCreateGoogleProfile(profile);
      const userId = await this.findOrCreateUser(googleProfileId, profile);
      return userId;
    } catch (error) {
      console.error('Application: Error in findOrCreateUserFromGoogle:', error);
      throw error;
    }
  }

  private async findOrCreateGoogleProfile(
    profile: PassportGoogleProfile
  ): Promise<string> {
    const existing = await PersistenceManager.get().find(
      Collections.GoogleProfiles,
      { googleId: profile.id }
    );

    const fields = {
      googleId: profile.id,
      email: profile.emails?.[0]?.value || '',
      displayName: profile.displayName,
      givenName: profile.name?.givenName,
      familyName: profile.name?.familyName,
      photoUrl: profile.photos?.[0]?.value,
      rawProfile: profile._json,
      updatedAt: new Date(),
    };

    if (existing.length === 0) {
      const id = await PersistenceManager.get().save(Collections.GoogleProfiles, {
        ...fields,
        createdAt: new Date(),
      });
      console.info(`Application: Created new GoogleProfile ${id}`);
      return id;
    }

    const id = existing[0]._id;
    await PersistenceManager.get().save(Collections.GoogleProfiles, {
      ...fields,
      _id: id,
      createdAt: existing[0].createdAt,
    });
    console.debug(`Application: Updated GoogleProfile ${id}`);
    return id;
  }

  private async findOrCreateUser(
    googleProfileId: string,
    profile: PassportGoogleProfile
  ): Promise<string> {
    const existing = await User.find({ googleProfileId });

    if (existing.length > 0) {
      const user = existing[0]!;
      console.debug(`Application: Found existing User ${user._id}`);
      return user._id!;
    }

    const user = await StuffApi.create(() => new User());
    user.googleProfileId = googleProfileId;
    await user.save();
    console.info(`Application: Created new User ${user._id}`);

    const playerId = await this.createDefaultAvatarTemplate(
      profile.name?.givenName || 'Unnamed',
      profile.name?.familyName
    );
    user.playerIds.push(playerId);
    await user.save();

    return user._id!;
  }

  /**
   * Fork a per-user avatar template from the seed avatar at
   * `Avatar.SEED_TEMPLATE_PATH` (initial doc seeded from
   * `seeds/obj/Avatar/seed.yaml`; thereafter the live Mongo doc is
   * source of truth). Class, hydratorClass, and starting data come
   * from the seed; the user's name/surname overlay on top.
   * Runtime-only fields (`user`, `playerId`) are stamped later by
   * `Avatar.postRegister` from the clone context.
   *
   * @returns the generated playerId (template path:
   * `/obj/Avatar/<playerId>`)
   */
  private async createDefaultAvatarTemplate(
    name: string,
    surname?: string
  ): Promise<string> {
    const seed = await Template.findByPath(Avatar.SEED_TEMPLATE_PATH);
    if (!seed) {
      throw new Error(
        `Application.createDefaultAvatarTemplate: no seed at ` +
          `'${Avatar.SEED_TEMPLATE_PATH}'. Did SeederManager run?`
      );
    }

    const playerId = nanoid();
    const path = Avatar.getTemplatePath(playerId);
    const data: Record<string, unknown> = {
      ...seed.data,
      name,
    };
    if (surname) data.surname = surname;

    await TemplateApi.saveTemplate(
      path,
      seed.class,
      data,
      seed.hydratorClass
    );
    console.info(`Application: Created avatar template at ${path}`);
    return playerId;
  }
}

