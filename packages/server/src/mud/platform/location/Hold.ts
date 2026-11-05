/**
 * Hold — ⭐ **the room of a ship that keeps a record: her cargo** (harbors
 * review 2, *persistence is the exception*).
 *
 * A ship's rooms are all `Compartment`s — every one floods from the lowest
 * up by asking her — and most of them keep nothing: her deck and her cabin
 * come up from their rows each time she wakes, her fixtures with them. Her
 * hold is the one with a stated purpose for a record of its own: what is
 * stowed in it is her cargo, and her cargo is what survives her sleeping,
 * a restart and her going down. So the hold is the compartment that
 * composes `Persistable` — keyed `(row, <serial>/<leaf>)` for a ship of a
 * kind, by its row for an authored ship — and nothing else aboard does.
 *
 * - Her warren declares it among its `dependentPersistables`, and she
 *   declares her warren, so saving her saves her hold.
 * - When she sleeps, whatever is loose on her plain rooms is stowed down
 *   here first (`ShipWarren.stow`): a ship laid up has her gear below.
 * - An owner's goods stowed here are laid back down by the room overlay
 *   when she wakes, as in any furnished room.
 */

import Compartment from './Compartment';
import { PersistableMixin } from '../../lib/persistence/Persistable';

export default class Hold extends PersistableMixin(Compartment) {
  /**
   * ⭐ Stood up by her warren, never alone by its key:
   * her ship stands her rooms up with her.
   *
   * @hook
   */
  public override standsUpAlone(): boolean {
    return false;
  }
}
