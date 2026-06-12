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
import { ReservedMixin } from '../reserve';

// Body stack (inner → outer):
//   Container + Containable + Visible + Vitals + Reserved + Posed +
//   BodyPlanSlots + Slotted + Sexed + Organism + Named + Agent
// VitalsMixin sits outer of Organism/BodyPlanSlots (it reads
// getSpecies() for the band profile and anatomy/slots). ReservedMixin
// sits inner of Vitals so the derived band can read the reserve surface.
const CreatureBase = ContainerMixin(
  ContainableMixin(
    VisibleMixin(
      VitalsMixin(
        ReservedMixin(
          PosedMixin(
            BodyPlanSlotsMixin(
              SlottedMixin(SexedMixin(OrganismMixin(NamedMixin(Agent))))
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
}
