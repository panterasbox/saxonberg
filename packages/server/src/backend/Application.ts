/**
 * Application - Game logic coordinator singleton
 *
 * Responsibilities:
 * - User connection lifecycle (handleUserConnect, handleUserDisconnect)
 * - Message routing between client and game
 * - Initial game state (starting room - future)
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
import type { PassportGoogleProfile } from '@saxonberg/types';
import { Pronouns } from '@saxonberg/types';

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
import { User } from '../mud/lib/identity/User';
import { TemplateApi } from '../mud/api/template';
import { Avatar } from '../mud/obj/Avatar';
import { Location } from '../mud/lib/stuff/Location';
import { PersistentHydrator } from '../mud/lib/persistence/PersistentHydrator';
import type { CommandContext } from '../mud/api/command';
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
    console.log('Application: Initialized with Backend');
  }

  /**
   * Send a message to a specific Interactive's client. Sole gateway for
   * game objects to reach Backend — Application owns Backend communication.
   */
  public sendMessageToInteractive(interactive: Interactive, message: unknown): void {
    if (this.backend && interactive.socketId) {
      this.backend.sendMessageToSocket(interactive.socketId, message);
    }
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
      console.log(`Application: User connecting - userId=${userId}, socketId=${socketId}`);

      const user = await User.findById(userId);
      if (!user) {
        throw new Error(`Application: User ${userId} not found`);
      }

      const interactive = await ConnectionManager.get().createInteractive(
        socketId,
        sessionId,
        user
      );

      await new Login(interactive).enter();
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
    console.log(`Application: User disconnecting - socketId=${socketId}`);

    const removed = ConnectionManager.get().removeInteractive(socketId);

    if (removed) {
      console.log(`Application: User disconnected successfully`);
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
    if (!interactive || !interactive.currentAvatar) {
      this.backend.sendMessageToSocket(socketId, {
        type: 'error',
        payload: { message: 'No active character' },
      });
      return;
    }

    const commandText = (message.payload as { text: string }).text?.trim();
    if (!commandText) return;

    const avatar = interactive.currentAvatar;
    const location = avatar.getEnvironment() as Location;

    if (!location) {
      this.backend.sendMessageToSocket(socketId, {
        type: 'error',
        payload: { message: 'Avatar has no location' },
      });
      return;
    }

    const context: CommandContext = {
      commandGiver: avatar,
      interactive,
      location,
      commandText,
      executionId: nanoid(),
      // Placeholder — `CommandGiverMixin.executeCommand` overwrites this
      // with a fresh per-execution attribution id before invoking the
      // controller.
      commandId: '',
    };

    // Discard the result; CommandResult is purely semantic now. Any
    // prose the controller wanted the actor to see is fired via Scene
    // inside the controller body, and the auto-emitted MudlogApi
    // command-outcome entry surfaces success/failure with `summary`.
    await avatar.executeCommand(commandText, context);
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
      console.log(`Application: Created new GoogleProfile ${id}`);
      return id;
    }

    const id = existing[0]._id;
    await PersistenceManager.get().save(Collections.GoogleProfiles, {
      ...fields,
      _id: id,
      createdAt: existing[0].createdAt,
    });
    console.log(`Application: Updated GoogleProfile ${id}`);
    return id;
  }

  private async findOrCreateUser(
    googleProfileId: string,
    profile: PassportGoogleProfile
  ): Promise<string> {
    const existing = await User.find({ googleProfileId });

    if (existing.length > 0) {
      const user = existing[0]!;
      console.log(`Application: Found existing User ${user._id}`);
      return user._id!;
    }

    const user = new User();
    user.googleProfileId = googleProfileId;
    await user.save();
    console.log(`Application: Created new User ${user._id}`);

    const playerId = await this.createDefaultAvatarTemplate(
      profile.name?.givenName || 'Unnamed',
      profile.name?.familyName
    );
    user.playerIds.push(playerId);
    await user.save();

    return user._id!;
  }

  /**
   * Seed a default avatar template for a new user. Self-contained under
   * the unified state model — no Player/CharacterSheet indirection. Opts
   * into `PersistentHydrator` so the generic mixin-field copy applies the
   * persistent fields (name/surname/pronouns) at clone time; runtime-only
   * fields (`user`, `playerId`) are stamped by Avatar's `postRegister`
   * from the clone context.
   *
   * @returns the generated playerId (template path: `/avatar/<playerId>`)
   */
  private async createDefaultAvatarTemplate(
    name: string,
    surname?: string
  ): Promise<string> {
    const playerId = nanoid();
    const path = Avatar.getTemplatePath(playerId);
    const data: Record<string, unknown> = {
      name,
      pronouns: Pronouns.They,
    };
    if (surname) data.surname = surname;
    await TemplateApi.saveTemplate(
      path,
      '/obj/Avatar',
      data,
      PersistentHydrator.templatePath
    );
    console.log(`Application: Created avatar template at ${path}`);
    return playerId;
  }
}

