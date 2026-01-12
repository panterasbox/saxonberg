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
import type { Interactive } from '../mud/lib/connection/Interactive';
import { Avatar } from '../mud/obj/Avatar';
import { User } from '../mud/lib/identity/User';
import { Player } from '../mud/lib/identity/Player';
import { GoogleProfile } from '../mud/lib/identity/GoogleProfile';
import { Location } from '../mud/lib/location/Location';
import { StuffApi } from '../mud/api/stuff';
import { DEFAULT_STARTING_ROOM_PATH } from '../mud/config/constants';

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
   * Flow:
   * 1. Create Interactive object
   * 2. Load User from database
   * 3. Load Player(s) for User
   * 4. Create Avatar (runtime player presence)
   * 5. Sync Avatar from Player
   * 6. Link Avatar ↔ Interactive
   * 7. Send connection_established message
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

      // 1. Create Interactive object (delegate to ConnectionManager)
      const interactive = await ConnectionManager.get().createInteractive(
        socketId,
        sessionId,
        userId
      );

      // 2. Load available Avatars for this user
      await interactive.loadAvailableAvatars();

      // 3. Handle character selection based on number of players
      if (interactive.availableAvatars.size === 0) {
        // No players - this shouldn't happen as users should have at least one
        throw new Error(`No players found for user ${userId}`);
      } else if (interactive.availableAvatars.size === 1) {
        // Single player - auto-select
        const playerId = Array.from(interactive.availableAvatars.keys())[0];
        if (!playerId) {
          throw new Error('Unexpected: availableAvatars has size 1 but no keys');
        }
        await interactive.switchAvatar(playerId);

        const avatar = interactive.currentAvatar!;
        console.log(`Application: User connected with single character - ${avatar.fullName}`);

        // Load starting room from Player data or use default
        const startingRoomPath = avatar.player?.startingRoomPath || DEFAULT_STARTING_ROOM_PATH;
        const startingRoom = await StuffApi.clone<Location>(startingRoomPath);

        // Move avatar to starting room (using MobileMixin)
        avatar.move(startingRoom);
        console.log(`Application: Placed ${avatar.fullName} in ${startingRoom.name}`);

        // Send connection_established message
        this.backend.sendMessageToSocket(socketId, {
          type: 'connection_established',
          payload: {
            userId: userId,
            socketId: socketId,
            sessionId: sessionId,
            player: {
              _id: avatar.playerId,
              firstName: avatar.firstName,
              lastName: avatar.lastName,
              pronouns: avatar.pronouns,
            },
            message: `Welcome back, ${avatar.fullName}!`,
          },
        });

        // Send look description automatically
        this.sendLookDescription(avatar, socketId);
      } else {
        // Multiple players - show character select screen
        const characterList = Array.from(interactive.availableAvatars.values()).map(
          (avatar) => ({
            playerId: avatar.playerId,
            name: avatar.fullName,
            // Future: add level, class, location, etc.
          })
        );

        console.log(
          `Application: User connected - showing character select (${characterList.length} characters)`
        );

        this.backend.sendMessageToSocket(socketId, {
          type: 'character_select',
          payload: {
            characters: characterList,
          },
        });
      }
    } catch (error) {
      console.error('Application: Error in handleUserConnect:', error);

      // Send error message
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

      case 'select_character':
        this.handleSelectCharacter(socketId, message);
        break;

      case 'command':
        this.handleCommandMessage(socketId, message);
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
   * Handle character selection (multiplexing support).
   */
  private async handleSelectCharacter(
    socketId: string,
    message: WebSocketMessage
  ): Promise<void> {
    if (!this.backend) return;

    const interactive = ConnectionManager.get().getInteractive(socketId);

    if (!interactive) {
      console.warn(`Application: No Interactive found for socket ${socketId}`);
      return;
    }

    const { playerId } = message.payload as { playerId: string };

    if (!playerId) {
      this.backend.sendMessageToSocket(socketId, {
        type: 'error',
        payload: {
          message: 'No playerId provided in select_character message',
        },
      });
      return;
    }

    try {
      // Switch to the selected character
      await interactive.switchAvatar(playerId);

      const avatar = interactive.currentAvatar!;

      console.log(
        `Application: Character selected - ${avatar.fullName} (playerId: ${playerId})`
      );

      // Load starting room from Player data or use default
      const startingRoomPath = avatar.player?.startingRoomPath || DEFAULT_STARTING_ROOM_PATH;
      const startingRoom = await StuffApi.clone<Location>(startingRoomPath);

      // Move avatar to starting room (using MobileMixin)
      avatar.move(startingRoom);
      console.log(`Application: Placed ${avatar.fullName} in ${startingRoom.name}`);

      // Send avatar_switched confirmation with character info
      this.backend.sendMessageToSocket(socketId, {
        type: 'avatar_switched',
        payload: {
          playerId: avatar.playerId,
          name: avatar.fullName,
          firstName: avatar.firstName,
          lastName: avatar.lastName,
          pronouns: avatar.pronouns,
          message: `You are now ${avatar.fullName}`,
        },
      });

      // Send connection_established to match single-character flow
      this.backend.sendMessageToSocket(socketId, {
        type: 'connection_established',
        payload: {
          userId: interactive.userId,
          socketId: socketId,
          sessionId: interactive.sessionId,
          player: {
            _id: avatar.playerId,
            firstName: avatar.firstName,
            lastName: avatar.lastName,
            pronouns: avatar.pronouns,
          },
          message: `Welcome back, ${avatar.fullName}!`,
        },
      });

      // Send look description automatically
      this.sendLookDescription(avatar, socketId);
    } catch (error) {
      console.error('Application: Error in handleSelectCharacter:', error);

      this.backend.sendMessageToSocket(socketId, {
        type: 'error',
        payload: {
          message: 'Failed to select character',
          error: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }

  /**
   * Send look description for avatar's current location.
   * Lightweight stub for Phase 3 - full command framework in Phase 4.
   *
   * @param avatar - Avatar to get location description for
   * @param socketId - Socket ID to send to
   */
  private sendLookDescription(avatar: Avatar, socketId: string): void {
    if (!this.backend) return;

    const location = avatar.getEnvironment() as Location;

    if (!location) {
      this.backend.sendMessageToSocket(socketId, {
        type: 'output',
        payload: {
          text: 'You are nowhere.',
        },
      });
      return;
    }

    // Simple stub output using MML (Mud Markup Language)
    // Full command framework in Phase 4
    const output = [
      `<location>${location.name}</location>`,
      '',
      location.description,
      '',
    ].join('\n');

    this.backend.sendMessageToSocket(socketId, {
      type: 'output',
      payload: { text: output },
    });
  }

  /**
   * Handle command message (Phase 3 - lightweight stubs).
   * Full command framework will be implemented in Phase 4.
   */
  private handleCommandMessage(socketId: string, message: WebSocketMessage): void {
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

    // STUB: Simple command parsing - Phase 4 will replace with full framework
    const [verb, ...args] = commandText.split(/\s+/);

    if (!verb) return; // Safety check

    switch (verb.toLowerCase()) {
      case 'look':
      case 'l':
        // Inline stub - no separate LookCommand class needed
        this.sendLookDescription(avatar, socketId);
        break;

      case 'say':
      case "'":
        // Inline stub using VocalMixin
        const text = args.join(' ');
        if (text) {
          avatar.say(text);
        }
        break;

      default:
        this.backend.sendMessageToSocket(socketId, {
          type: 'output',
          payload: {
            text: `Unknown command: ${verb}\n(Phase 4 will add full command framework)`,
          },
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
      // 1. Find or create GoogleProfile
      let googleProfileDocs = await PersistenceManager.get().find(
        Collections.GoogleProfiles,
        { googleId: profile.id }
      );

      let googleProfileId: string;

      if (googleProfileDocs.length === 0) {
        // Create new GoogleProfile
        const newProfile = {
          googleId: profile.id,
          email: profile.emails?.[0]?.value || '',
          displayName: profile.displayName,
          givenName: profile.name?.givenName,
          familyName: profile.name?.familyName,
          photoUrl: profile.photos?.[0]?.value,
          rawProfile: profile._json,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        googleProfileId = await PersistenceManager.get().save(
          Collections.GoogleProfiles,
          newProfile
        );

        console.log(`Application: Created new GoogleProfile ${googleProfileId}`);
      } else {
        googleProfileId = googleProfileDocs[0]._id;

        // Update existing profile
        const updateProfile = {
          _id: googleProfileId,
          googleId: profile.id,
          email: profile.emails?.[0]?.value || '',
          displayName: profile.displayName,
          givenName: profile.name?.givenName,
          familyName: profile.name?.familyName,
          photoUrl: profile.photos?.[0]?.value,
          rawProfile: profile._json,
          updatedAt: new Date(),
          createdAt: googleProfileDocs[0].createdAt,
        };

        await PersistenceManager.get().save(Collections.GoogleProfiles, updateProfile);

        console.log(`Application: Updated GoogleProfile ${googleProfileId}`);
      }

      // 2. Find or create User
      let userDocs = await PersistenceManager.get().find(Collections.Users, {
        googleProfileId: googleProfileId,
      });

      let userId: string;

      if (userDocs.length === 0) {
        // Create new User
        const newUser = {
          googleProfileId: googleProfileId,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        userId = await PersistenceManager.get().save(Collections.Users, newUser);

        console.log(`Application: Created new User ${userId}`);

        // 3. Create default Player for new User
        const newPlayer = {
          userId: userId,
          firstName: profile.name?.givenName || 'Unnamed',
          lastName: profile.name?.familyName || 'Player',
          pronouns: Pronouns.They,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const playerId = await PersistenceManager.get().save(
          Collections.Players,
          newPlayer
        );

        console.log(`Application: Created default Player ${playerId} for User ${userId}`);

        // 4. Create avatar template in domain collection
        const avatarTemplate = {
          path: Avatar.getTemplatePath(playerId),
          class: '/obj/Avatar',
          data: {
            playerId: playerId,
          },
        };

        await PersistenceManager.get().save(Collections.Domain, avatarTemplate);
        console.log(`Application: Created avatar template at ${avatarTemplate.path}`);
      } else {
        userId = userDocs[0]._id;
        console.log(`Application: Found existing User ${userId}`);
      }

      return userId;
    } catch (error) {
      console.error('Application: Error in findOrCreateUserFromGoogle:', error);
      throw error;
    }
  }
}
