/**
 * KeptAnimal — ⭐⭐ **an animal kept for itself.**
 *
 * The one class an individual kept animal is cloned from: the cat on the
 * lane, the collie on the farm, the canary down the pit. Not a *kind* of
 * animal — a *rung*. What separates it from the `Creature` it extends is
 * not biology but that somebody could come to care about this particular
 * one, and the world is willing to remember which one it was.
 *
 * ⭐ Why a class and not a bag of mixins per row: eleven layers in a
 * fixed order is exactly what a concrete `platform/` class is for, and
 * the acceptance criterion *"a second companion species is two rows and
 * no code"* needs something for those rows to name.
 *
 * ⚠ Why the **kernel** and not a pack: its three composers — the commons'
 * cat, ranching's collie, mining's canary — have no common pack
 * ancestor, which is the standing test for kernel substrate.
 *
 * The stack, outer → inner, and what each earns its place with:
 *
 * ```
 * Persistable   it can be promoted to something the world remembers
 *   Behaved     it decides things: follows · feeds · homes
 *     Bonded    the bond, the home, the verbs           ⟵ the point
 *       Status  legible attention ("watching the stock")
 *       PostRegistration  the clone-pipeline marker — INNERMOST, its
 *                         postRegister is a terminal no-op (see below)
 *       BeliefStore  its opinion of you — the bond's first factor
 *       Handling     how tractable it is — the second       ⟵ SIBLINGS
 *         Engaged    brain slot contention
 *         Mobile     it can walk: follows / homes need this
 *         Sensor     witness triggers — it notices you leave
 *           Named    ⭐ a pet HAS a name
 *             Creature
 * ```
 *
 * ⚠ `BeliefStore` and `Handling` are composed **side by side**, never
 * nested: `BondedMixin` narrows to both with `MixinApi` rather than
 * demanding them in its base constraint, so a host that forgets one
 * degrades to "no bond" instead of failing to compile somewhere
 * unhelpful.
 *
 * ⚠ `Persistable` OUTSIDE `Behaved` is safe and deliberate:
 * `Persistable.postRegister` only chains, `Behaved.postRegister` chains
 * *then* wires, so the single call the clone pipeline makes reaches
 * both.
 *
 * ⭐⭐ **`NamedMixin` is composed here, explicitly** — and that is the
 * right cost. The presentation build took `Named` off `Creature` (a body
 * is not a somebody) and put `Perceptible` on it (every body is
 * addressable by keyword). So a wolf is *a rangy grey wolf* and can
 * never be anything else, while a class that can hold a proper name has
 * to say so. **Naming the cat is the moment it stops being *a* cat**, and
 * the composition is where that claim lives.
 *
 * ⚠ `PerceptibleMixin` is NOT composed here — it arrives from `Creature`
 * and declaring it twice would double its `fieldMeta`.
 *
 * What it deliberately does **not** compose: `Vocal`, `Soul`, `Caster`,
 * `Persona`, `Advancement`. An animal does not speak, cast, hold a job
 * or carry a transcript — which is the whole objection to building this
 * on `Character`.
 */

import { Creature } from './Creature';
import { NamedMixin } from '../description/Named';
import { SensorMixin } from '../message/Sensor';
import { MobileMixin } from '../spatial/Mobile';
import { EngagedMixin } from '../activity/Engaged';
import { HandlingMixin } from '../husbandry/Handling';
import { BeliefStoreMixin } from '../belief/BeliefStore';
import { StatusMixin } from '../status/Status';
import { BondedMixin } from '../husbandry/Bonded';
import { PostRegistrationMixin } from '../stuff/PostRegistration';
import { BehavedMixin } from '../behavior/Behaved';
import { PersistableMixin } from '../persistence/Persistable';

// Named beneath the agency layers so the stack reads outermost-first and
// inference does not collapse across this many nested factories in one
// expression (the PlantPot lesson).
const KeptAnimalBody = HandlingMixin(
  BeliefStoreMixin(EngagedMixin(MobileMixin(SensorMixin(NamedMixin(Creature))))),
);

// ⚠⚠ `PostRegistrationMixin` INNERMOST. Its `postRegister` is a terminal
// no-op that never calls `super`, so every layer inside it is shadowed:
// composed between `Behaved` and `Bonded`, as it shipped, `Bonded.postRegister`
// never ran on a live animal — no home seeded, no species warmed — and
// nothing above the fixtures could see it. `Creature` carries no
// `postRegister`, so the chain terminates here harmlessly.
const KeptAnimalBase = PersistableMixin(
  BehavedMixin(BondedMixin(StatusMixin(PostRegistrationMixin(KeptAnimalBody)))),
);

export class KeptAnimal extends KeptAnimalBase {
  /**
   * ⭐ A kept animal **pins**: once named, it is stood up at boot and at
   * its owner's login without anybody asking for it, because everything
   * that makes it a pet rather than a chair is something it *does* while
   * nobody is looking — wanders, comes to a door, gets fed by a
   * neighbour, starves in front of somebody instead of retroactively.
   * Reconcile-on-read keeps its clocks honest; only residency lets it
   * emit. The unnamed animal never reaches the roll (no row, no key).
   *
   * On the class, not on `Bonded`: `Persistable` is the outermost layer,
   * so a mixin further in could not override its default.
   */
  public override pinsResidency(): boolean {
    return true;
  }
}

export default KeptAnimal;
