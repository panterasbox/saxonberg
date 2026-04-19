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
import type { PassportGoogleProfile, WebSocketMessage, MessageType } from '@saxonberg/types';
import { Pronouns } from '@saxonberg/types';
import { PersistenceManager, Collections } from './PersistenceManager';
import { ConnectionManager } from './ConnectionManager';
import type { Interactive } from '../mud/obj/Interactive';
import { Avatar } from '../mud/obj/Avatar';
import { Login } from '../mud/obj/Login';
import { User } from '../mud/lib/identity/User';
import { Player } from '../mud/lib/identity/Player';
import { CharacterSheet } from '../mud/lib/identity/CharacterSheet';
import { GoogleProfile } from '../mud/lib/identity/GoogleProfile';
import { Location } from '../mud/lib/stuff/Location';
import type { CommandContext } from '../mud/api/command';
import { nanoid } from 'nanoid';

/**
 * Application - Singleton for game logic coordination.
 */
export class Application {
  private static instance: Application;

  /**
   * Reference to Backend (for I/O operations).
   */
  private backend: IBackend | null = null;

  /**
   * Starting room/location for new connections (future).
   */
  private startingRoom: any = null;

  /**
   * Private constructor (singleton pattern).
   */
  private constructor() {}

  /**
   * Get the singleton instance.
   */
  public static get(): Application {
    if (!this.instance) {
      this.instance = new Application();
    }
    return this.instance;
  }

  /**
   * Initialize Application with Backend reference.
   *
   * @param backend - Backend instance (implements IBackend)
   */
  public initialize(backend: IBackend): void {
    this.backend = backend;
    console.log('Application: Initialized with Backend');
  }

  /**
   * Send a message to a specific Interactive's client.
   * This is the public API for game objects to send messages to clients.
   * Application maintains sole responsibility for Backend communication.
   *
   * @param interactive - Interactive to send to
   * @param message - Message to send
   */
  public sendMessageToInteractive(interactive: Interactive, message: unknown): void {
    if (this.backend && interactive.socketId) {
      this.backend.sendMessageToSocket(interactive.socketId, message);
    }
  }

  /**
   * Handle user connection.
   * Called by Backend when WebSocket connection is established.
   *
   * Creates the Interactive for this connection, then hands off to a
   * Login instance to run the mudlib-side entry procedure (avatar
   * loading, character selection, starting-room placement, welcome
   * messages).
   *
   * @param userId - User's MongoDB _id
   * @param sessionId - Session ID
   * @param socketId - Socket ID
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

      const interactive = await ConnectionManager.get().createInteractive(
        socketId,
        sessionId,
        userId
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

  /**
   * Handle user disconnection.
   * Called by Backend when WebSocket connection closes.
   *
   * @param socketId - Socket ID
   */
  public handleUserDisconnect(socketId: string): void {
    console.log(`Application: User disconnecting - socketId=${socketId}`);

    // Delegate to ConnectionManager (handles destroy and removal)
    const removed = ConnectionManager.get().removeInteractive(socketId);

    if (removed) {
      console.log(`Application: User disconnected successfully`);
    } else {
      console.warn(`Application: No Interactive found for socket ${socketId}`);
    }
  }

  /**
   * Process a message from the client.
   * Routes message to appropriate handler based on type.
   *
   * @param socketId - Socket ID
   * @param message - Message object
   */
  public processUserMessage(socketId: string, message: WebSocketMessage): void {
    const interactive = ConnectionManager.get().getInteractive(socketId);

    if (!interactive) {
      console.warn(`Application: No Interactive found for socket ${socketId}`);
      return;
    }

    if (!this.backend) {
      console.error('Application: Backend not initialized');
      return;
    }

    // Route by message type
    switch (message.type) {
      case 'echo':
        this.handleEchoMessage(socketId, message);
        break;

      case 'ping':
        this.handlePingMessage(socketId, message);
        break;

      case 'command':
        // Handle async command execution (don't await to avoid blocking)
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

  /**
   * Handle echo message (test).
   */
  private handleEchoMessage(socketId: string, message: WebSocketMessage): void {
    if (!this.backend) return;

    console.log(`Application: Echo message from ${socketId}`);

    this.backend.sendMessageToSocket(socketId, {
      type: 'echo',
      payload: message.payload,
    });
  }

  /**
   * Handle ping message (heartbeat).
   */
  private handlePingMessage(socketId: string, message: WebSocketMessage): void {
    if (!this.backend) return;

    this.backend.sendMessageToSocket(socketId, {
      type: 'pong',
      payload: {
        timestamp: Date.now(),
      },
    });
  }

  /**
   * Handle command message (Phase 3 - lightweight stubs).
   * Full command framework will be implemented in Phase 4.
   */
  private async handleCommandMessage(socketId: string, message: WebSocketMessage): Promise<void> {
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

    // Build command context
    const context: CommandContext = {
      commandGiver: avatar,
      interactive,
      location,
      commandText,
      executionId: nanoid(),
    };

    // Execute command via CommandGiverMixin
    const result = await avatar.executeCommand(commandText, context);

    // Send result
    if (result.success && result.output) {
      this.backend.sendMessageToSocket(socketId, {
        type: 'output',
        payload: result.output,
      });
    } else if (!result.success && result.error) {
      this.backend.sendMessageToSocket(socketId, {
        type: 'error',
        payload: { message: result.error },
      });
    }
  }

  /**
   * Find or create User, GoogleProfile, and Player from Google OAuth profile.
   * Called during authentication flow.
   *
   * @param profile - Google profile from Passport
   * @returns User ID (MongoDB _id)
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
    const existing = await PersistenceManager.get().find(Collections.Users, {
      googleProfileId,
    });

    if (existing.length > 0) {
      const userId = existing[0]._id;
      console.log(`Application: Found existing User ${userId}`);
      return userId;
    }

    const userId = await PersistenceManager.get().save(Collections.Users, {
      googleProfileId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log(`Application: Created new User ${userId}`);

    const playerId = await this.createDefaultPlayer(
      userId,
      profile.name?.givenName || 'Unnamed',
      profile.name?.familyName || 'Player'
    );
    await this.createAvatarTemplate(playerId);

    return userId;
  }

  private async createDefaultPlayer(
    userId: string,
    firstName: string,
    lastName: string
  ): Promise<string> {
    const sheet = new CharacterSheet();
    sheet.firstName = firstName;
    sheet.lastName = lastName;
    sheet.pronouns = Pronouns.They;
    await sheet.save();

    const player = new Player();
    player.userId = userId;
    player.characterSheetId = sheet._id!;
    await player.save();

    console.log(
      `Application: Created default Player ${player._id} (sheet=${sheet._id}) for User ${userId}`
    );
    return player._id!;
  }

  private async createAvatarTemplate(playerId: string): Promise<void> {
    const template = {
      path: Avatar.getTemplatePath(playerId),
      class: '/obj/Avatar',
      data: { playerId },
    };
    await PersistenceManager.get().save(Collections.Domain, template);
    console.log(`Application: Created avatar template at ${template.path}`);
  }
}
