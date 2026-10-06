/**
 * Corpse — what a body leaves behind, whoever it was.
 *
 * ⭐⭐⭐ **A corpse is MATTER, not an Agent, and that is the first
 * question the taxonomy asks.** `Agent` exists to distinguish *things
 * capable of acting on their own behalf* from things that are not; for a
 * non-Agent the second question is Space (`Location`) vs Matter (`Thing`)
 * vs Information (`Idea`). A corpse cannot act on its own behalf and
 * never can again — `adoptMaterialState` has no `mergeSlice_`
 * counterpart, so it is **un-reanimatable by protocol**, not merely
 * inert — and it is plainly matter. So: `Thing`.
 *
 * ⚠⚠ **It lived on the `Agent` branch until 2026-10-05, and three
 * behaviours were wrong for it the whole time** — all three being
 * consumers of `Stuff.isAgent()`:
 *
 * - `MixinApi.isOpenContainer` excludes agents, because *you cannot reach
 *   into another actor's pockets*. So a corpse was not an open container,
 *   and since `mql/scope-walk` and `PerceptionApi.canReach` both gate on
 *   that one rule, **nothing inside a corpse was reachable** — breaking
 *   the loadout promise this very class was given: *the corpse is where
 *   somebody has to go to get it*.
 * - `RecognitionLogic`'s obscured form answered **"someone"** for a body
 *   in the dark instead of "something" — the same defect as the three
 *   cherry trees that offered themselves as *someone (1) · someone (2)*.
 * - `PutController` offered no `in` region, so `put coin in body` had
 *   nowhere to put it.
 *
 * ⭐ The sub-rungs were never the question. `Corpse extends Creature`
 * stopped one rung below `Actor`, which is where agency-of-ACTION was
 * cut (no `Mobile`, `Engaged`, `Sensor`, `Perception`, `Combatant`), and
 * that cut is real — but `Creature`/`Actor`/`Character` are
 * categorization by mixin composition and carry no taxonomic weight. The
 * branch is the answer to *can it act on its own behalf*, and nothing
 * below it can stand in for that.
 *
 * ## What it composes, and why the list is the point
 *
 * ⚠⚠ **This class's own docstring described this composition for a
 * build before the code did it.** It said a corpse composes "`Container`,
 * `Vitals` + `BodyPlanSlots`, `Thermal`, `Postmortem`, `Contaminable`"
 * while `extends ContaminableMixin(Creature)` quietly gave it all of
 * `Creature` — so the carcass chain retired *"a dead ewe that cannot be
 * milked"* and shipped a corpse that **breathes, digests, tires, gets
 * dirty, carries a load, holds a posture and can wear a disguise**. The
 * same defect one level in. The list below is now the statement it always
 * claimed to be.
 *
 * Kept, each because something reads it:
 * `Container` (the loadout somebody has to come and take) ·
 * `Vitals` (the wound map, `causeOfDeath`, and the material-fork adopt
 * side) · `Reserved` (the stocks `Vitals` narrows on) · `Organism`
 * (species, lifecycle state, the material slices) · `Slotted` +
 * `BodyPlanSlots` + `Attired` (what the body still has on — which is
 * also what the `distinguishing` form says about it) · `Thermal` (algor
 * mortis as passive drift, and the host temperature spoilage reads) ·
 * `Postmortem` (the decay clock, outermost so its `canEvict` veto leads)
 * · `Contaminable` (a carcass in the sun grows a population nothing
 * reports) · `Concealable` (a body can be hidden; inert until authored) ·
 * `Propertied`. `Tangible`, `Perceptible`, `Visible`, `Detailed`, `Wet`
 * and `Containable` come from `Thing` itself.
 *
 * Dropped, each because it is false of a dead body: `Metabolic`,
 * `Respiration`, `Exerting`, `Hygiene`, `LoadBearing`, `Posed`,
 * `Slottable`, `Disguisable`, `ThermalRegulation`.
 *
 * ⭐ **Not a second body stack.** The kept list is a strict SUBSET of
 * `Creature`'s and a different claim, not a copy of it — the drift hazard
 * is a duplicated list (`Creature` once lacked `Perceptible` while 48
 * rows authored `primaryKeyword:` into a void), and there is no shared
 * list here to fall out of step. If a third forensic body ever appears,
 * extract the common core then.
 *
 * ⚠ **The mint is lossy on purpose.** A herd place, a tap's standing, a
 * bond, a job, a brain: none of it survives, because none of it is true
 * of a body. The continuity the player gets is that every body in the
 * world is the same kind of thing.
 *
 * What it carries instead is stamped by `ConditionLogic`'s shared mint:
 * species, cause, time of death, the mass the body actually had, its
 * birthday (so its age is the age it died at), the condition it died in,
 * its own keywords, its material slices and its contamination.
 *
 * See docs/subsystems/mortality.md § One body, two choreographies, and
 * CLAUDE.md § Instanceable Lives in `platform/<branch>/`.
 */

import Thing from '../../lib/stuff/Thing';
import { PropertiedMixin } from '../../lib/stuff/Propertied';
import { OrganismMixin } from '../../lib/species/Organism';
import { SlottedMixin } from '../../lib/slot/Slotted';
import { BodyPlanSlotsMixin } from '../../lib/slot/BodyPlanSlots';
import { AttiredMixin } from '../../lib/slot/Attired';
import { ReservedMixin } from '../../lib/reserve';
import { VitalsMixin } from '../../lib/vitals/Vitals';
import { ThermalMixin } from '../../lib/thermal/Thermal';
import { ContainerMixin } from '../../lib/spatial/Container';
import { ContaminableMixin } from '../../lib/material/Contaminable';
import { ConcealableMixin } from '../../lib/concealment/Concealable';
import { PostmortemMixin } from '../../lib/mortality/Postmortem';
import type { FieldMeta } from '../../lib/mixin';

// The order follows `Creature`'s own reasoning for the overlapping
// layers, so the two bodies agree about layering even though they
// compose different sets: `Postmortem` outermost (its `canEvict` veto
// leads), `Container` outer of `Thermal`/`Vitals`/`Slotted`, `Vitals`
// outer of `Reserved`, `Attired` outer of `BodyPlanSlots` outer of
// `Slotted` outer of `Organism`, and `Concealable` a plain field carrier
// whose placement is immaterial.
const CorpseBase = PostmortemMixin(
  ConcealableMixin(
    ContaminableMixin(
      ContainerMixin(
        ThermalMixin(
          VitalsMixin(
            ReservedMixin(
              AttiredMixin(
                BodyPlanSlotsMixin(
                  SlottedMixin(OrganismMixin(PropertiedMixin(Thing))),
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  ),
);

export default class Corpse extends CorpseBase {
  static fieldMeta: FieldMeta = {
    conditionAtDeath: { persistent: true, authorable: true },
    takenTissues: { persistent: true },
    takenLines: { persistent: true },
  };

  /**
   * ⭐⭐⭐ **A carcass REDUCES.** Tissue material paths a cut has already
   * taken off this body, and cut rows whose line has been taken.
   *
   * This is what lets a side be worked **to order** — take the loin to
   * sell and leave the rest hanging — which is how a shop behaves, and it
   * gives partial breakdown and trimming with no second verb. The body is
   * destructed only when every line of its species' yield is gone.
   *
   * ⚠ **Not persisted in practice, and that is right.** `Corpse`
   * composes no `PersistableMixin`, so a half-butchered body does not
   * survive a restart. `fieldMeta` declares the shape for honesty, not
   * for durability: a body on a hook mid-breakdown is not a thing a
   * reboot owes anybody.
   *
   * ⚠ Two lists rather than one, because the two things are different:
   * a MUSCLE is gone from the animal (and a cut claiming it can never be
   * taken again), while a hide or the offal is a LINE that has been taken
   * (it claims no tissue the plan knows about).
   */
  public takenTissues: string[] = [];

  /** See {@link takenTissues}. */
  public takenLines: string[] = [];

  public getTakenTissues(): readonly string[] {
    return this.takenTissues;
  }

  public getTakenLines(): readonly string[] {
    return this.takenLines;
  }

  public hasTissue(path: string): boolean {
    return !this.takenTissues.includes(path);
  }

  public hasLine(path: string): boolean {
    return !this.takenLines.includes(path);
  }

  public markTissuesTaken(paths: readonly string[]): void {
    for (const p of paths) {
      if (!this.takenTissues.includes(p)) this.takenTissues.push(p);
    }
  }

  public markLineTaken(path: string): void {
    if (!this.takenLines.includes(path)) this.takenLines.push(path);
  }

  /**
   * ⭐ The body's `flesh` reserve at the moment it died, or `null` when
   * the body carried no such stock (a person, a fixture).
   *
   * **A stamped number, never a reserve.** A reserve reconciles against
   * a clock, and a dead animal's condition cannot change: the whole
   * point of the figure is that the butcher is reading what the stockman
   * achieved before the kill, not what the carcass has done since. The
   * kitchen multiplies its species yield by it; nothing writes it after
   * the mint.
   */
  public conditionAtDeath: number | null = null;

  public getConditionAtDeath(): number | null {
    return this.conditionAtDeath;
  }

  public setConditionAtDeath(value: number | null): void {
    this.conditionAtDeath = value;
  }
}
