/**
 * Player - Persistent record linking a User to a CharacterSheet
 *
 * A Player is a "character slot" owned by a User. It carries no character
 * data itself — the firstName, pronouns, etc. live on a CharacterSheet
 * referenced by characterSheetId.
 *
 * Persistence: Saved to MongoDB 'players' collection.
 */

import { Persistable } from '../stuff/Persistable';

export class Player extends Persistable {
  static collectionName = 'players';

  static persistentFields = ['userId', 'characterSheetId', 'startingRoomPath'];

  /** User ID that owns this player slot. */
  userId: string = '';

  /** CharacterSheet ID holding the character data for this player. */
  characterSheetId: string = '';

  /**
   * Starting room path for this player.
   * If not set, defaults to DEFAULT_STARTING_ROOM_PATH (/domain/void).
   */
  startingRoomPath?: string;

  public toString(): string {
    return `[Player userId=${this.userId} sheet=${this.characterSheetId} (${this._id || this.stuffId})]`;
  }
}
