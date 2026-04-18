/**
 * Avatar - Runtime player character presence in the game world
 *
 * Represents a Player's active presence when connected.
 * Extends Character (which provides: Named, Gendered, Sensor, Vocal mixins).
 * Syncs with Player (persistent) via PersistApi.
 *
 * Key Features:
 * - Extends Character abstract class
 * - Supports multiplexing (multiple connections via Set<Interactive>)
 * - Auto-syncs all mixin fields via PersistApi
 * - Runtime-only (NOT persisted to database)
 *
 * Lifetime: Created when player connects, destroyed when last connection drops.
 *
 * Location: /mud/obj/ because it's an instantiable game object (not a library class)
 */

import { Character } from '../lib/character/Character';
import { PlayerApi } from '../api/player';
import { PersistApi } from '../api/persist';
import { Player } from '../lib/identity/Player';
import type { Interactive } from './Interactive';
import { PersistenceManager, Collections } from '../../backend/PersistenceManager';
import { ApplicationInstance } from '../../backend/ApplicationInstance';

/**
 * Template data for Avatar (from domain collection).
 */
export interface AvatarTemplateData {
  playerId: string; // MongoDB _id of Player
}

/**
 * Avatar - Runtime player character (extends Character).
 *
 * Inherits from Character which provides:
 * - Named, Gendered mixins (identity)
 * - Sensor, Vocal mixins (messaging)
 * - Container, Containable mixins (inventory management)
 * - Visible mixin (descriptions)
 * - Mobile mixin (movement)
 * - CommandGiver mixin (command execution)
 *
 * Also provides diagnostic/system commands: ping, help, player
 */
export class Avatar extends Character {
  /**
   * Command provider for Avatar-specific commands (diagnostic/system)
   */
  static commandProvider = {
    self: ['ping.yaml', 'help.yaml', 'player.yaml'],
    environment: [],
    inventory: [],
    colocated: [],
  };

  /**
   * Get ApplicationInstance (can be overridden for testing)
   * @internal
   */
  private static getApplicationInstance(): any {
    return ApplicationInstance.get();
  }

  /**
   * Template path prefix for avatars in domain collection.
   * Avatar templates are stored at: /avatar/player/<playerId>
   */
  static readonly TEMPLATE_PATH_PREFIX = '/avatar/player/';

  /**
   * Get the template path for a given playerId.
   *
   * @param playerId - Player's MongoDB _id
   * @returns Template path (e.g., "/avatar/player/abc123")
   */
  static getTemplatePath(playerId: string): string {
    return `${this.TEMPLATE_PATH_PREFIX}${playerId}`;
  }

  /**
   * User ID (MongoDB _id).
   */
  userId: string = '';

  /**
   * Player ID (MongoDB _id).
   */
  playerId: string = '';

  /**
   * Reference to the persistent Player object.
   */
  player?: Player;

  /**
   * Set of connected Interactive objects (supports multiplexing).
   * Multiple connections (laptop + phone) can control the same Avatar.
   */
  interactives: Set<Interactive> = new Set();

  /**
   * Constructor - accepts template data from domain collection.
   *
   * @param templateData - Template data with playerId
   */
  constructor(templateData: AvatarTemplateData | Record<string, unknown>) {
    super();

    // Extract playerId from template data
    const data = templateData as AvatarTemplateData;
    this.playerId = data.playerId || '';
  }

  /**
   * Async initialization - loads Player and syncs state.
   * Called automatically by StuffApi.clone().
   */
  public async initialize(): Promise<void> {
    if (!this.playerId) {
      throw new Error('Avatar.initialize(): No playerId');
    }

    // Load Player from database
    const playerDoc = await PersistenceManager.get().findById(
      Collections.Players,
      this.playerId
    );

    if (!playerDoc) {
      throw new Error(`Avatar.initialize(): Player not found: ${this.playerId}`);
    }

    // Create Player runtime object
    const player = new Player();
    player._id = playerDoc._id;
    player.userId = playerDoc.userId;
    player.firstName = playerDoc.firstName;
    player.lastName = playerDoc.lastName;
    player.pronouns = playerDoc.pronouns;
    player.createdAt = playerDoc.createdAt;
    player.updatedAt = playerDoc.updatedAt;

    // Sync from Player (sets mixin fields and userId)
    await this.syncFromPlayer(player);

    // Register with PlayerApi for playerId lookup
    PlayerApi.registerAvatar(this);

    console.log(`Avatar.initialize(): Initialized for player ${this.playerId}`);
  }

  /**
   * Add an Interactive connection (multiplexing support).
   * Adds to the set of connected Interactives.
   *
   * @param interactive - The Interactive object to add
   */
  public addInteractive(interactive: Interactive): void {
    this.interactives.add(interactive);
    console.log(`Avatar.addInteractive(): Added connection for ${this.fullName} (${this.interactives.size} total)`);
  }

  /**
   * Remove an Interactive connection.
   * If this is the last connection, syncs to Player and saves.
   *
   * @param interactive - The Interactive object to remove
   */
  public removeInteractive(interactive: Interactive): void {
    this.interactives.delete(interactive);
    console.log(`Avatar.removeInteractive(): Removed connection for ${this.fullName} (${this.interactives.size} remaining)`);

    // If no more connections, sync to Player and save
    if (this.interactives.size === 0 && this.player) {
      this.syncToPlayer();
      this.player.save().catch((err) => {
        console.error(`Avatar.removeInteractive(): Failed to save Player: ${err.message}`);
      });
    }
  }

  /**
   * Check if any Interactive is connected.
   */
  public isConnected(): boolean {
    return this.interactives.size > 0;
  }

  /**
   * Check if Avatar is linkdead (PC with no connections).
   */
  public isLinkdead(): boolean {
    return !this.isConnected();
  }

  /**
   * Send a message to all connected Interactives (broadcast).
   *
   * @param message - The message to send
   */
  public sendMessage(message: any): void {
    for (const interactive of this.interactives) {
      interactive.send(message);
    }
  }

  /**
   * Override SensorMixin.onMessage() to handle message delivery to connected clients.
   *
   * When MessageApi calls this (via messageContainer), we send the message
   * to all connected Interactives (multiplexing support).
   *
   * @param message - The message to receive
   */
  public onMessage(message: unknown): void {
    // Get Application instance (uses dynamic require to avoid circular dependencies)
    const app = Avatar.getApplicationInstance();

    // Send to all connected Interactives (multiplexing support)
    for (const interactive of this.interactives) {
      app.sendMessageToInteractive(interactive, message);
    }
  }

  /**
   * Legacy method for backward compatibility.
   * @deprecated Use addInteractive instead
   */
  public setInteractive(interactive: Interactive): void {
    this.addInteractive(interactive);
  }

  /**
   * Legacy method for backward compatibility.
   * @deprecated Use removeInteractive instead
   */
  public unlinkInteractive(): void {
    // Remove all interactives
    for (const interactive of Array.from(this.interactives)) {
      this.removeInteractive(interactive);
    }
  }

  /**
   * Sync runtime state TO persistent Player object (save).
   * Uses PersistApi for automatic field collection from mixins.
   * Copies all mixin fields (firstName, lastName, pronouns).
   */
  public syncToPlayer(): void {
    if (!this.player) {
      console.warn('Avatar.syncToPlayer(): No player reference');
      return;
    }

    // Use PersistApi for automatic sync
    PersistApi.syncTo(this, this.player);

    // Update timestamp
    this.player.updatedAt = new Date();

    console.log(`Avatar.syncToPlayer(): Auto-synced all fields to Player ${this.playerId}`);
  }

  /**
   * Sync persistent Player state FROM persistent Player object (load).
   * Uses PersistApi for automatic field collection from mixins.
   * Copies all mixin fields (firstName, lastName, pronouns).
   *
   * @param player - The Player object to sync from
   */
  public async syncFromPlayer(player: Player): Promise<void> {
    this.player = player;

    // Use PersistApi for automatic sync
    await PersistApi.syncFrom(player, this);

    // Copy identity fields
    this.userId = player.userId;
    this.playerId = player._id || '';

    console.log(`Avatar.syncFromPlayer(): Auto-synced all fields from Player ${this.playerId}`);
  }

  /**
   * Cleanup hook (called on disconnect/destruction).
   * Removes all interactive connections and unregisters from PlayerApi.
   */
  protected prepareDestroy(): void {
    // Unregister from PlayerApi
    PlayerApi.unregisterAvatar(this);

    // Remove all interactive connections
    for (const interactive of Array.from(this.interactives)) {
      this.interactives.delete(interactive);
    }
    this.interactives.clear();
  }

  /**
   * String representation.
   */
  public toString(): string {
    return `[Avatar ${this.fullName} userId=${this.userId} playerId=${this.playerId}]`;
  }
}
