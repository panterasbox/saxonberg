/**
 * Door - First-class shared door state referenced by exit pairs.
 *
 * One `Door` instance represents one physical door. Both sides of a
 * bidirectional exit pair reference the SAME instance so that opening the
 * door from one side is immediately visible from the other.
 * `ExitableMixin.addBidirectionalExit()` wires this up in a single call.
 *
 * Composition: `VisibleMixin(PerceptibleMixin(SealableMixin(Thing)))`.
 * A Door is a `Thing` — it has identity AND a `Containable` environment,
 * so a *broken* or *unhinged* door can be moved into a Location with
 * `ContainmentApi.move(door, location)` and picked up like any item. In
 * the **attached** state the door's `environment` is `null`; the door
 * is reachable only via the `Exit.door` references that track it. In
 * the **detached** state (broken, removed, carried) the door has an
 * `environment` and appears in that container's `getContents()`.
 *
 * The same physical door is referenced by potentially many Exits (the
 * canonical case is two — forward + back). The `attachedTo` set is the
 * runtime back-reference, populated automatically by `Exit`'s `door`
 * setter. When a door breaks or is detached, walk `attachedTo` to clear
 * each Exit's `door` ref before relocating.
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
 * MQL surfaces a door on its location via `ExitableMixin.getExitDoors()`
 * (MqlApi scans those in addition to the location's contents), so a door
 * is player-targetable by name even though it doesn't live in anyone's
 * inventory while attached.
 *
 * Phase 7 scope: open/closed only. No locks, no keys, no `unlock` command.
 */

import { Thing } from '../stuff/Thing';
import { SealableMixin } from './Sealable';
import { PerceptibleMixin } from '../description/Perceptible';
import { VisibleMixin } from '../description/Visible';
import type { Exit } from './Exit';

const DoorBase = VisibleMixin(PerceptibleMixin(SealableMixin(Thing)));

export class Door extends DoorBase {
  /**
   * Runtime back-reference: every Exit whose `door` currently points at
   * this Door. Maintained by `Exit`'s `door` setter — adding the door
   * to a new Exit registers; clearing the door (or `Exit.prepareDestroy`)
   * unregisters.
   *
   * Not persistent: the relationship is rebuilt at load time as Exits
   * are constructed. Wiping it on destroy is `prepareDestroy`'s job.
   *
   * Host-internal storage; external callers (Exit's door setter,
   * ExitableVessel's synth, tests) go through `attachExit` /
   * `detachExit` / `hasAttached` / `getAttachedTo`.
   */
  protected attachedTo: Set<Exit> = new Set();

  public attachExit(exit: Exit): void { this.attachedTo.add(exit); }
  public detachExit(exit: Exit): boolean { return this.attachedTo.delete(exit); }
  public hasAttached(exit: Exit): boolean { return this.attachedTo.has(exit); }
  public getAttachedTo(): ReadonlySet<Exit> { return this.attachedTo; }

  /**
   * Union of the PerceptibleMixin keyword list with the tokens of the
   * door's shortDescription. A door constructed with only `shortDescription:
   * 'heavy oak door'` should still be targetable as `oak` / `door` without
   * the template author having to re-list those as explicit keywords.
   */
  override getKeywords(): string[] {
    const base = super.getKeywords();
    const nameTokens = this.getShortDescription()
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 0);
    return Array.from(new Set([...base, ...nameTokens]));
  }

  /**
   * Detach this door from every Exit currently referencing it, clearing
   * each exit's `door` ref and emptying `attachedTo`. The door becomes
   * a free-standing Thing — the caller is responsible for placing it
   * somewhere with `ContainmentApi.move(door, location)` (the typical
   * "broken door drops to the floor" case).
   *
   * Idempotent: detaching an already-detached door is a no-op.
   */
  public detach(): void {
    const exits = [...this.attachedTo];
    for (const exit of exits) {
      exit.setDoor(null);
    }
    this.attachedTo.clear();
  }

  /**
   * Cleanup hook fired by `StuffApi.destruct(this)`. Clears the back-
   * pointer on every Exit that referenced this door so neighbors don't
   * retain dead Door references.
   */
  public prepareDestroy(): void {
    this.detach();
  }
}
