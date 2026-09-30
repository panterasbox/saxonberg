/**
 * Actor — **a body that acts**: the rung between the body and the
 * person.
 *
 * Composition: `Combatant(Perception(Mobile(Engaged(Sensor(Creature)))))`.
 *
 * ⭐⭐ **The Agent branch has TWO lines in it, not one.** The taxonomy
 * read `Creature` (a body) → `Character` (a person), so every mixin
 * true of *anything that moves and fights* had to be composed on
 * `Character` — which is how a pit pony came to carry `CasterMixin`,
 * `EmployedMixin` and `PersonaMixin`. The readers were already asking
 * the narrower question:
 *
 * - `AttackController.ts:57` refuses a target that is not
 *   `Vitals && Engaged` — **not** `Combatant`. What you can attack is a
 *   body that can be engaged.
 * - `Combatant.ts:40` returns silently for a non-`Combatant` host, so
 *   the fighting half is a capability, not a gate.
 * - `PerceptionLogic.ts:437,901,940` require a VIEWER to be
 *   `Sensor && Perception`.
 *
 * None of the three asks *is this a person*.
 *
 * ```
 *   Creature   a body, alive or dead   — a corpse, a head of stock
 *   Actor      a body that ACTS        — a wolf, a horse, and every person
 *   Character  a body that is SOMEBODY — a name, a job, a faculty, a voice
 * ```
 *
 * ⭐ **The name is the codebase's own.** `actor: Stuff` appears in 318
 * signatures, always meaning *the one performing the act* — and this is
 * the class of things that can. It was `Animate` for one build, which
 * had the same defect `Movable` did: every `-able`/`-ate`-shaped name
 * in the kernel is a mixin or an interface, and a class wearing one
 * reads as a category error. The eventual win is that `actor: Stuff`
 * can tighten to `actor: Actor`.
 *
 * ⚠⚠ **`Corpse` is the proof of the line, not an exception to it.** It
 * composes the whole of `Creature` — vitals, respiration, postmortem,
 * because it is a forensic body — and none of these five. A corpse does
 * not move, cannot be engaged, receives no scenes, perceives nothing
 * and does not fight. The five mixins this rung adds are exactly the
 * five that are false of a corpse, which is a stronger test of where
 * the line falls than any authoring count could be.
 *
 * ## ⚠ What this rung must NEVER compose
 *
 * `CommandGiverMixin`. It carries **fifteen** affordance statics — it is
 * the verb surface of *being a thing that types commands* — and every
 * mixin moved down here contributes its `commandContributions` to the
 * `self` bucket only, which is inert on a non-giver. That is the one
 * invariant keeping this move from failing OPEN (conferring verbs on a
 * horse rather than withholding them from a person), and
 * `Actor.test.ts` asserts it.
 *
 * ## Order
 *
 * `Sensor` innermost — `Perception` and `Combatant` read through it, and
 * `Perceiver` (which stays on `Character`) requires it in its base.
 * `Engaged` inner of `Mobile`, so the body-slot engagement that is the
 * source of truth for `Mobile.getEngagedMode` can be read without a
 * forward reference. `Combatant` outermost of the five so its
 * `onExchangeResolved` terminal sits above the body and `Character`'s
 * override still wins by being on the class.
 *
 * **No concrete twin, deliberately.** A bare acting body with no brain
 * is exactly what the `cast:` designation refuses, so nothing should
 * clone one; `ExitableVessel`'s deferral is the precedent. The concrete
 * word is `platform/agent/Beast`, and a class called `Beast` would be
 * the wrong thing for `Character` to extend.
 */

import { Creature } from './Creature';
import { SensorMixin } from '../message/Sensor';
import { EngagedMixin } from '../activity/Engaged';
import { MobileMixin } from '../spatial/Mobile';
import { PerceptionMixin } from '../perception/Perception';
import { CombatantMixin } from '../combat/Combatant';

const ActorBase = CombatantMixin(
  PerceptionMixin(MobileMixin(EngagedMixin(SensorMixin(Creature)))),
);

export abstract class Actor extends ActorBase {}

export default Actor;
