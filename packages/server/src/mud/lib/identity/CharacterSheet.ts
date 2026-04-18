/**
 * CharacterSheet - Persistent character data
 *
 * Holds the mixin-based character properties (name, pronouns, etc.) that
 * a runtime Avatar or NPC projects into the world. Decoupled from Player
 * so that both PC sheets (owned via a Player record) and NPC sheets can
 * share the same persistable shape.
 *
 * Persistence: Saved to MongoDB 'character_sheets' collection.
 */

import { Persistable } from '../stuff/Persistable';
import { NamedMixin } from '../character/Named';
import { GenderedMixin } from '../character/Gendered';

const CharacterSheetBase = GenderedMixin(NamedMixin(Persistable));

export class CharacterSheet extends CharacterSheetBase {
  static collectionName = 'character_sheets';

  public toString(): string {
    return `[CharacterSheet ${this.fullName} (${this._id || this.stuffId})]`;
  }
}
