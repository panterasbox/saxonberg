/**
 * Creature — the body layer: a living physical thing that can break,
 * with or without agency.
 *
 * Sits between `Agent` (runtime active object) and `Character` (the
 * agent layer). Carries the **body** mixins — identity, species /
 * lifecycle, biological sex, anatomy slots, posture, description,
 * containment — plus (added by the Vitals build) vital signs,
 * reserves, and anatomy. `Character` extends `Creature` and adds the
 * **agency** mixins (command execution, perception, speech, movement,
 * engagement, social identity).
 *
 * The split exists because **vitals are body-state, not agent-state**:
 * a corpse, an anesthetized patient, a simple animal, and a sessile
 * frog are all bodies with full vital/anatomy state and reduced or
 * zero agency. Modelling the body below the agent makes that fall out
 * of the type hierarchy instead of being special-cased.
 *
 * Concrete on purpose — a bare `Creature` is a valid non-agent body
 * (a frog, a corpse, a test fixture). A future named NPC just extends
 * `Creature` (animate) or `Character` (animate + agency).
 *
 * This is NOT the place for agency (commands, perception verbs,
 * speech, locomotion), nor for narrative/social identity (persona,
 * pronouns) — those are `Character`-tier.
 *
 * Composition order (preserved from the original Character stack):
 * - `Organism` sits between `Named` and (the now-Character-tier)
 *   `Gendered` — species/lifecycle alongside basic identity.
 * - `BodyPlanSlots` sits outer of `Slotted` (overrides its defaults
 *   to derive slots from species → bodyPlan) and after `Organism`
 *   (which provides the species reference it reads).
 * - `Containable` is inner of `Mobile` (Character-tier) which uses
 *   its setContainer/getContainer — the one cross-layer dependency,
 *   still inner→outer.
 */

import { Agent } from '../stuff/Agent';
import { PropertiedMixin } from '../stuff/Propertied';
import { NamedMixin } from '../description/Named';
import { OrganismMixin } from '../species/Organism';
import { SexedMixin } from '../character/Sexed';
import { SlottedMixin } from '../slot/Slotted';
import { BodyPlanSlotsMixin } from '../slot/BodyPlanSlots';
import { PosedMixin } from '../character/Posed';
import { VisibleMixin } from '../description/Visible';
import { ContainableMixin } from '../spatial/Containable';
import { ContainerMixin } from '../spatial/Container';
import { VitalsMixin } from '../vitals/Vitals';
import { ReservedMixin, type Reserve } from '../reserve';
import { LoadBearingMixin } from '../encumbrance/LoadBearing';
import { MetabolicMixin } from '../metabolism/Metabolic';
import { ThermalMixin } from '../thermal/Thermal';
import { ThermalRegulationMixin } from '../thermal/ThermalRegulation';
import { RespirationMixin } from '../respiration/Respiration';
import { DisguisableMixin } from '../disguise/Disguisable';
import { ConcealableMixin } from '../concealment/Concealable';
import { SlottableMixin } from '../slot/Slottable';
import { PostmortemMixin } from '../mortality/Postmortem';
import { Quantity } from '../quantity';

// Body stack (inner → outer):
//   Container + Containable + Disguisable + Visible + Respiration +
//   Metabolic + Vitals + Reserved + Posed + BodyPlanSlots + Slotted +
//   Sexed + Organism + Named + Propertied + Agent, with LoadBearing
//   outermost.
// PropertiedMixin sits innermost (just outer of Agent) — the general
// dynamic per-instance property store. It carries no composition
// requirements and every body (frog, corpse, Character, Avatar) is a
// legitimate place for other objects to park state, so it belongs on
// the shared Creature base rather than being re-declared per subclass.
// DisguisableMixin sits outer of Visible (it scans worn slots and reads
// shortDescription to resolve the masking presentation); Stuff's
// getPresentation defers to it.
// VitalsMixin sits outer of Organism/BodyPlanSlots (it reads
// getSpecies() for the band profile and anatomy/slots). ReservedMixin
// sits inner of Vitals so the derived band can read the reserve surface.
// MetabolicMixin sits OUTER of Vitals/Reserved/Posed — it drives all
// three (basal drain, coupled recovery, the condition cascade) and
// overrides getReserve/getReserves to reconcile-on-read. It is INNER of
// LoadBearing so the encumbrance gauge keeps reading the reserve
// surface metabolism populates (LoadBearing's endurance read dispatches
// through the proxy to Metabolic's override).
// RespirationMixin sits immediately OUTER of Metabolic — it drives
// Vitals (`spo2`) only, reading the same vital surface. It is the first
// concrete engagement producer: at runtime it narrows the Character-tier
// Engaged/Mobile surfaces (the crisis drain + the move reassess). A bare
// non-Character Creature carries the breathable config + engine but,
// lacking an Engaged slot, holds no scheduled drain (the documented
// degenerate — the proof drownable is a Character).
// ThermalMixin sits OUTER of Respiration/Metabolic (it reads mass/material;
// the Phase-2 ThermalRegulationMixin wraps it to drive coreTemperature)
// and INNER of LoadBearing. A bare Creature is a plain Thermal object — a
// corpse cools toward ambient (algor mortis) as a passive drift; the
// living regulation layer (Phase 2) pins coreTemperature instead.
// (Thermal and Respiration are independent: respiration is schedule-
// driven and drives `spo2`; thermal overrides getVitalSign for
// `coreTemperature` only — neither reads the other's sign.)
// LoadBearingMixin sits outermost — the encumbrance gauge reads
// Container + Slotted + Tangible (Agent) + Reserved + Vitals, so it
// must compose outer of all of them (same placement logic as Vitals
// outer of Reserved).
// ConcealableMixin sits outermost (default `obvious`, a plain field
// carrier — placement is immaterial to the ordered body stack below). It
// lets a creature carry a concealment level so a lurking beast can be
// hidden until noticed; inert until authored (see concealment subsystem).
// PostmortemMixin wraps everything: it reads only lifecycle + the world
// clock, so its placement is immaterial to the ordered body stack, and
// being outermost puts its `canEvict` veto ahead of the others — a corpse
// objects to being collected before any inner layer gets a say.
const CreatureBase = PostmortemMixin(
  ConcealableMixin(
  LoadBearingMixin(
    ContainerMixin(
    ContainableMixin(
      DisguisableMixin(
        VisibleMixin(
          ThermalRegulationMixin(
            ThermalMixin(
              RespirationMixin(
                MetabolicMixin(
                  VitalsMixin(
                    ReservedMixin(
                      PosedMixin(
                        // A body OCCUPIES slots as well as offering them:
                        // Slotted (above) is the chair's side, Slottable is
                        // the sitter's. Every posture verb gates on it
                        // (`requiresSlottable`), and until this composed,
                        // `lie`/`sit`/`kneel` rejected every actor in the
                        // game with "you can't fit in a slot" — the
                        // validator's own docstring asserted actors "are
                        // always Slottable via Avatar's composition", which
                        // was never true. Found by driving the world.
                        SlottableMixin(
                        BodyPlanSlotsMixin(
                          SlottedMixin(
                            SexedMixin(
                              OrganismMixin(
                                NamedMixin(PropertiedMixin(Agent))
                              )
                            )
                          )
                        )
                        )
                      )
                    )
                  )
                )
              )
            )
          )
        )
      )
    )
  )
  )
  )
);

/**
 * Creature concrete class — a living body. `Character` extends this
 * and adds agency. `Agent` already registers the top-level branch;
 * `Creature` does not re-register.
 */
export class Creature extends CreatureBase {
  constructor() {
    super();
    // Every living body starts with its biological reserves (endurance /
    // satiation / hydration) at full. Idempotent — hydration overwrites
    // from stored values afterward.
    this.installBiologicalReserves();
  }

  // ── biological reserve readers — the contract surface ──
  // The convenience readers that spare consumers the reserve keys (the
  // `Combustible.getFuelRemaining` / `Caster.getMana` pattern): a
  // combat tempo read, an encumbrance margin, an authored brain or
  // script checking "is this body tired/hungry/thirsty" all come here.
  // Metabolic hooks the underlying keyed reads, so each carries the
  // metabolism reconcile — never a stale value. Always present (the
  // constructor installs them), hence non-null. See the reserve
  // landscape table in `lib/reserve.ts`.

  /** The endurance reserve (exertion capacity), reconciled. */
  public getEndurance(): Reserve {
    return this.getReserve('endurance')!;
  }

  /** The satiation reserve (food fuel), reconciled. */
  public getSatiation(): Reserve {
    return this.getReserve('satiation')!;
  }

  /** The hydration reserve (the tighter recovery leash), reconciled. */
  public getHydration(): Reserve {
    return this.getReserve('hydration')!;
  }

  /**
   * Mass override that lazy-seeds the body-grounded default. When the
   * instance authored no mass of its own (still `0`), resolve
   * `species → bodyPlan → baseMass` and adopt it; an explicitly-authored
   * mass is the deviation that wins (the guard short-circuits and this is
   * a plain `super.getMass()`).
   *
   * Runs lazily here rather than from a post-hydrate hook: the
   * `postRegister` chain is not uniformly threaded below `CommandGiver`
   * (e.g. `Avatar.postRegister` does not `super`-call), so a read-time
   * seed is the one seam that makes mass honest for *every* reader of
   * *every* Creature subclass, the moment a body plan is resolvable. The
   * "is mass still 0?" check is the idempotency guard — no persistent
   * "seeded" flag (the project rule); a genuinely 0-mass sessile body
   * simply re-checks cheaply.
   */
  override getMass(): Quantity<'kg'> {
    const current = super.getMass();
    if (current.rawValue() !== 0) return current;
    return this.seedMassFromBodyPlan() ?? current;
  }

  /**
   * Resolve the body-plan `baseMass` and adopt it as this body's mass,
   * returning the seeded quantity (or `null` when there is no plan /
   * `baseMass` is absent or `0`). Does **not** read `getMass()` — the
   * zero-guard lives in {@link getMass}, so this stays recursion-free and
   * is the single place the body-grounded default is applied.
   */
  protected seedMassFromBodyPlan(): Quantity<'kg'> | null {
    const baseMass = this.getSpecies()?.getBodyPlan()?.getBaseMass();
    if (baseMass !== undefined && baseMass > 0) {
      const seeded = Quantity.of(baseMass, 'kg');
      this.setMass(seeded);
      return seeded;
    }
    return null;
  }

  // The `ingest` seam now lives on `MetabolicMixin` (composed into the
  // body stack above): a living body routes consumed `{ material,
  // amount, phase }` into its digestion buffer. `drink`/`sip` fill the
  // liquid sub-volume, `eat` the solid one. See `lib/metabolism/`.
}
