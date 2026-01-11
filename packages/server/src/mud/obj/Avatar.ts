/**
 * Avatar - Runtime player presence in the game world
 *
 * Represents a Player's active presence when connected.
 * Uses NamedMixin and GenderedMixin (same as Player) for runtime state.
 * Syncs with Player (persistent) via syncToPlayer()/syncFromPlayer().
 *
 * This is a RUNTIME object - it is NOT persisted to the database.
 * Lifetime: Created when player connects, destroyed when player disconnects.
 *
 * Location: /mud/obj/ because it's an instantiable game object (not a library class)
 */

import { AgentBase } from '../lib/stuff/AgentBase.js';
import { NamedMixin } from '../lib/mixins/NamedMixin.js';
import { GenderedMixin } from '../lib/mixins/GenderedMixin.js';
import { MixinApi } from '../api/mixin.js';
import { PlayerApi } from '../api/player.js';
import { Player } from '../lib/identity/Player.js';
import type { Interactive } from '../lib/connection/Interactive.js';
import { PersistenceManager, Collections } from '../../backend/PersistenceManager.js';

/**
 * Template data for Avatar (from domain collection).
 */
export interface AvatarTemplateData {
  playerId: string; // MongoDB _id of Player
}

/**
 * Compose Avatar base class with mixins (same as Player).
 */
const AvatarBase = GenderedMixin(NamedMixin(AgentBase));

/**
 * Avatar - Runtime player presence (runtime only).
 */
export class Avatar extends AvatarBase {
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
   * Reference to the Interactive connection object.
   */
  interactive?: Interactive;

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
    this.syncFromPlayer(player);

    // Register with PlayerApi for playerId lookup
    PlayerApi.registerAvatar(this);

    console.log(`Avatar.initialize(): Initialized for player ${this.playerId}`);
  }

  /**
   * Set the Interactive connection reference.
   * Creates bidirectional link between Avatar and Interactive.
   *
   * @param interactive - The Interactive object
   */
  public setInteractive(interactive: Interactive): void {
    this.interactive = interactive;
  }

  /**
   * Unlink the Interactive connection.
   */
  public unlinkInteractive(): void {
    this.interactive = undefined;
  }

  /**
   * Sync runtime state TO persistent Player object.
   * Copies mixin fields (firstName, lastName, pronouns) to Player.
   */
  public syncToPlayer(): void {
    if (!this.player) {
      console.warn('Avatar.syncToPlayer(): No player reference');
      return;
    }

    // Get all persistent fields from mixins
    const mixinFields = MixinApi.getMixinFields(Avatar);

    // Copy fields to player
    for (const field of mixinFields) {
      if (field in this) {
        (this.player as any)[field] = (this as any)[field];
      }
    }

    // Update timestamp
    this.player.updatedAt = new Date();

    console.log(`Avatar.syncToPlayer(): Synced ${mixinFields.length} fields to Player ${this.playerId}`);
  }

  /**
   * Sync persistent Player state FROM persistent Player object.
   * Copies mixin fields (firstName, lastName, pronouns) from Player.
   *
   * @param player - The Player object to sync from
   */
  public syncFromPlayer(player: Player): void {
    this.player = player;

    // Get all persistent fields from mixins
    const mixinFields = MixinApi.getMixinFields(Avatar);

    // Copy fields from player
    for (const field of mixinFields) {
      if (field in player) {
        (this as any)[field] = (player as any)[field];
      }
    }

    // Copy identity fields
    this.userId = player.userId;
    this.playerId = player._id || '';

    console.log(`Avatar.syncFromPlayer(): Synced ${mixinFields.length} fields from Player ${this.playerId}`);
  }

  /**
   * Cleanup hook (called on disconnect).
   * Unlinks interactive reference and unregisters from PlayerApi.
   */
  protected prepareDestroy(): void {
    // Unregister from PlayerApi
    PlayerApi.unregisterAvatar(this);

    // Unlink interactive if present
    if (this.interactive) {
      this.unlinkInteractive();
    }
  }

  /**
   * String representation.
   */
  public toString(): string {
    return `[Avatar ${this.fullName} userId=${this.userId} playerId=${this.playerId}]`;
  }
}
