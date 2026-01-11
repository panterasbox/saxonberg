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

import type { IBackend } from './IBackend.js';
import type { PassportGoogleProfile, WebSocketMessage, MessageType } from '@saxonberg/types';
import { Pronouns } from '@saxonberg/types';
import { PersistenceManager, Collections } from './PersistenceManager.js';
import { ConnectionManager } from './ConnectionManager.js';
import type { Interactive } from '../mud/lib/connection/Interactive.js';
import { Avatar } from '../mud/obj/Avatar.js';
import { User } from '../mud/lib/identity/User.js';
import { Player } from '../mud/lib/identity/Player.js';
import { GoogleProfile } from '../mud/lib/identity/GoogleProfile.js';
import { StuffApi } from '../mud/api/stuff.js';

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
        sessionId
      );

      // 2. Load User from database
      const userDoc = await PersistenceManager.get().findById(Collections.Users, userId);

      if (!userDoc) {
        throw new Error(`User ${userId} not found in database`);
      }

      // 3. Load Player(s) for User
      const playerDocs = await PersistenceManager.get().find(Collections.Players, {
        userId: userId,
      });

      if (playerDocs.length === 0) {
        throw new Error(`No players found for user ${userId}`);
      }

      // For Phase 1, use the first player
      const playerDoc = playerDocs[0];

      // 4. Ensure avatar template exists (create if missing)
      const avatarPath = Avatar.getTemplatePath(playerDoc._id);
      const existingTemplates = await PersistenceManager.get().find(Collections.Domain, {
        path: avatarPath,
      });

      if (existingTemplates.length === 0) {
        // Template doesn't exist - create it (for existing players created before template system)
        const avatarTemplate = {
          path: avatarPath,
          class: '/obj/Avatar',
          data: {
            playerId: playerDoc._id,
          },
        };
        await PersistenceManager.get().save(Collections.Domain, avatarTemplate);
        console.log(`Application: Created missing avatar template at ${avatarPath}`);
      }

      // 5. Clone Avatar from template in domain collection
      // StuffApi.clone() loads template, constructs Avatar, calls initialize(), registers
      const avatar = await StuffApi.clone<Avatar>(avatarPath);

      // 5. Link Avatar ↔ Interactive (bidirectional)
      avatar.setInteractive(interactive);
      interactive.linkAvatar(avatar);

      console.log(`Application: User connected successfully - ${avatar.fullName}`);

      // 6. Send connection_established message
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
          message: `Welcome, ${avatar.fullName}!`,
        },
      });
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
   * Handle command message (future - Phase 2).
   */
  private handleCommandMessage(socketId: string, message: WebSocketMessage): void {
    if (!this.backend) return;

    // Phase 2 will implement command processing
    this.backend.sendMessageToSocket(socketId, {
      type: 'output',
      payload: {
        message: 'Command system not yet implemented (Phase 2)',
      },
    });
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
