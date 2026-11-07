/**
 * Room — ⭐ **an interior, one of many laid out to a plan**: a house's
 * bathroom minted per unit, a holding's rooms per lot, the floor of a
 * works. You FILL a room the way you fill a location.
 *
 * ⭐ The place taxonomy sorts a place on two axes — how it is ADDRESSED
 * (`Locale` one particular, `Location` one of many) and whether it is KEPT
 * (`Persistent…`) — and neither says what a place IS. The room rung is the
 * one KIND that has substrate of its own, on both sides of the split:
 *
 * |        | one of many (`Location`) | one particular (`Locale`) |
 * |--------|--------------------------|---------------------------|
 * | plain  | `Room`                   | {@link Hall}              |
 * | kept   | {@link PersistentRoom}   | {@link PersistentHall}    |
 *
 * What a room has that a lane, a yard or a meadow does not:
 *
 * - **Walls and a roof unless its row says otherwise.** An interior is
 *   built: its roof is its walls' material unless the row authors one
 *   (`roofOverWalls()`), so a room row is never undeclared and
 *   never reads its construction off its biome (`lint:biome-sky`).
 * - ⭐⭐ **Water piped into it** (`PlumbedMixin`): a tap implies its pipe,
 *   in the room's own `plumbing:` word or the universe default. A street
 *   or a field never carries the field (review question P2 — the mixin
 *   was once on every `Place`).
 *
 * ⚠ A ship's rooms are `Compartment` — a hull is not a building, and her
 * rooms flood from her bilge. A mine's are workings. Neither is a room.
 */

import Location from './Location';
import { PlumbedMixin } from '../../lib/supply/Plumbed';
import type { RoofSpec } from '../../lib/spatial/Enclosed';

export default class Room extends PlumbedMixin(Location) {
  /**
   * ⭐ A room is roofed in what it is walled in, unless its row says
   * otherwise — the answer the legacy biome reading gave every interior
   * (its walls' material on five faces), now the room's own.
   */
  public override roofDefaults(): RoofSpec | null {
    return this.roofOverWalls();
  }
}
