/**
 * Corpse — what a body leaves behind, whoever it was.
 *
 * The one template that cloned `Creature` directly was
 * `/stuff/agent/Corpse`, and a corpse is a game object rather than a
 * generic creature: it is the forensic record of a death, searchable,
 * carryable, and decaying. `Creature` itself is mid-spine substrate
 * (`Agent -> Creature -> Character`) and should not be cloned to make
 * one.
 *
 * ⭐⭐ **Every death that is not a player's mints one of these too.**
 * Until the carcass-chain build, a beast or an NPC that died was flipped
 * to `dead` *in place* and kept every mixin it had — so a dead ewe was a
 * ewe that could no longer be milked, sheared, handled, herded or
 * driven, and the realm showed all of that to a player as a long list of
 * things the object could not do. A dead clerk was a clerk with a job.
 * Two kinds of death read as two kinds of object with no explanation for
 * the asymmetry, and the asymmetry was not a design — it was what fell
 * out of the cheaper branch.
 *
 * So there is one body now. A corpse's lifecycle is genuinely a
 * different lifecycle: it cools, it decays, it is evidence, it is taken
 * apart, and it is **never alive again**. That is not a living body
 * minus some verbs; it is this class. What a corpse composes is
 * therefore the whole statement of what a dead thing can still do —
 * `Container` (the loadout somebody has to come and take), `Vitals` +
 * `BodyPlanSlots` (the wound map), `Thermal` (algor mortis as passive
 * drift), `Postmortem` (the decay clock), and `Contaminable` (a carcass
 * in the sun grows a population nothing reports).
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
 * See CLAUDE.md § Instanceable Lives in `obj/`, and
 * docs/subsystems/mortality.md § One body, two choreographies.
 */

import { Creature } from '../../lib/creature/Creature';
import { ContaminableMixin } from '../../lib/material/Contaminable';
import type { FieldMeta } from '../../lib/mixin';

export default class Corpse extends ContaminableMixin(Creature) {
  static fieldMeta: FieldMeta = {
    conditionAtDeath: { persistent: true, authorable: true },
  };

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
