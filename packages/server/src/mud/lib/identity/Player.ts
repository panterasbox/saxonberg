/**
 * Player - Persistent player character object
 *
 * Represents a character that can enter the game world.
 * Uses NamedMixin and GenderedMixin for character properties.
 *
 * Persistence: Saved to MongoDB 'players' collection
 */

import { PersistentBase } from '../stuff/PersistentBase';
import { NamedMixin } from '../mixins/NamedMixin';
import { GenderedMixin } from '../mixins/GenderedMixin';
import { MortalMixin } from '../mixins/MortalMixin';
import { MixinApi } from '../../api/mixin';
import type { Player as IPlayer, Pronouns } from '@saxonberg/types';

/**
 * Compose Player base class with mixins.
 */
const PlayerBase = MortalMixin(GenderedMixin(NamedMixin(PersistentBase)));

/**
 * Player character (persistent).
 */
export class Player extends PlayerBase implements IPlayer {
  /**
   * MongoDB collection name.
   */
  static collectionName = 'players';

  /**
   * Persistent fields for auto-sync (class fields only - mixin fields auto-collected).
   */
  static persistentFields = ['userId'];

  /**
   * User ID that owns this player.
   */
  userId: string = '';

  /**
   * Constructor.
   *
   * @param firstName - Optional first name
   * @param lastName - Optional last name
   * @param pronouns - Optional pronouns (defaults to They)
   */
  constructor(firstName?: string, lastName?: string, pronouns?: Pronouns) {
    super(); // Auto-registers with StuffApi

    if (firstName) this.firstName = firstName;
    if (lastName) this.lastName = lastName;
    if (pronouns) this.pronouns = pronouns;
  }

  /**
   * Get all persistent fields (mixin fields + class fields).
   * This is called by Persistent base class during save/load.
   */
  public static getAllPersistentFields(): string[] {
    return MixinApi.getAllPersistentFields(this);
  }

  /**
   * String representation.
   */
  public toString(): string {
    return `[Player ${this.fullName} (${this._id || this.stuffId})]`;
  }
}
