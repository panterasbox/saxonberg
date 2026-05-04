/**
 * Door - First-class shared door state referenced by exit pairs.
 *
 * One `Door` instance represents one physical door. Both sides of a
 * bidirectional exit pair reference the SAME instance so that opening the
 * door from room A is immediately visible from room B.
 * `ExitableMixin.addBidirectionalExit()` wires this up in a single call.
 *
 * Composition: `VisibleMixin(PerceptibleMixin(SealableMixin(Idea)))`.
 * A Door is an `Idea` — it has identity but does NOT compose `Containable`
 * (no environment) or `Container` (no inventory). It lives nowhere spatial
 * and is referenced purely through `Exit.door`.
 *
 * Mixin responsibilities:
 *   - `SealableMixin`: open/closed state (shared with chests, trapdoors, …).
 *     The `isOpen` setter rejects non-boolean assignments.
 *   - `PerceptibleMixin`: MQL keywords so the player can type
 *     `open the oak door` and have it resolve. The `keywords` setter
 *     normalizes (lowercase / trim / dedupe).
 *   - `VisibleMixin`: short/long descriptions, so `look door` and
 *     `DescribeApi.getDisplayName()` both work uniformly. A door's
 *     identity is its visual description ("a heavy oak door") — not
 *     a proper name. NamedMixin is for things that take proper
 *     names (characters, ships, named places).
 *
 * Template-loadable: `Door` is cloned from a `domain` template via
 * `StuffApi.clone()`. Templates set
 * `hydratorClass: '/lib/persistence/PersistentHydrator'` to opt into the
 * generic mixin-field copy; the field setters above enforce shape on the
 * way in, so no post-hydrate fixup is needed.
 *
 * MQL surfaces a door on its room via `ExitableMixin.getExitDoors()`
 * (MqlApi scans those in addition to the room's contents), so a door is
 * player-targetable by name even though it doesn't live in anyone's
 * inventory.
 *
 * Phase 7 scope: open/closed only. No locks, no keys, no `unlock` command.
 */

import { Idea } from '../stuff/Idea';
import { SealableMixin } from './Sealable';
import { PerceptibleMixin } from '../description/Perceptible';
import { VisibleMixin } from '../description/Visible';

const DoorBase = VisibleMixin(PerceptibleMixin(SealableMixin(Idea)));

export class Door extends DoorBase {
  /**
   * Union of the PerceptibleMixin keyword list with the tokens of the
   * door's shortDescription. A door constructed with only `shortDescription:
   * 'heavy oak door'` should still be targetable as `oak` / `door` without
   * the template author having to re-list those as explicit keywords.
   */
  override getKeywords(): string[] {
    const base = super.getKeywords();
    const nameTokens = this.shortDescription
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 0);
    return Array.from(new Set([...base, ...nameTokens]));
  }
}
