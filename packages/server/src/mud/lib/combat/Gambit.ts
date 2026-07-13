/**
 * Gambit — the affordance descriptor for a combat move (value-object /
 * vocabulary).
 *
 * Gambits are ordinary affordances, not a bespoke registry: the verbs
 * (`strike` / `disarm` / `subdue` / `shove`) are real commands, and this
 * module only carries the *metadata* the session needs to resolve one —
 * whether it routes through `inflict` (offensive), whether it needs a
 * usable melee **instrument** (a wielded weapon in a functional,
 * non-disarmed grip, or a species-declared innate attack), whether it
 * sets a {@link CombatFlag} on landing, and — for the reactive tier —
 * which exchange outcome triggers it.
 *
 * "Channels, not nouns": a gambit never names a specific weapon. The
 * *instrument* (body part or wielded weapon) contributes the delivery
 * channel at resolve time; the gambit only asserts that *some* instrument
 * is present. This is the seam the deferred four-channel loadout breadth
 * grows into.
 *
 * The `minBand` gate is declared here but only bites once Build 2 wires
 * combat `Discipline` conferrals; in Build 1 it is informational.
 */

import type { CombatFlag } from "./CombatFlags";
import type { CompetenceBandName } from "../advancement/CompetenceBand";

export type GambitKind = "offensive" | "control" | "reactive";

/**
 * The exchange outcome that arms a reactive gambit. `parried` — the
 * attacker's blow was turned; `whiff` — the attacker missed and
 * self-opened; `grab` — a grapple was attempted. The session consults
 * the defender's reactive affordances at these points (the net-new
 * reactive-dispatch seam, X).
 */
export type ReactiveTrigger = "parried" | "whiff" | "grab";

export interface GambitSpec {
  /** Stable key (== primary verb for the attemptable gambits). */
  key: string;
  /** The command verb, or '' for a reactive-only gambit. */
  verb: string;
  kind: GambitKind;
  /** Routes through `ConditionApi.inflict` when it lands. */
  offensive: boolean;
  /**
   * Needs a usable melee instrument — a wielded weapon (functional,
   * non-disarmed grip) or a species-declared innate attack. When neither
   * is present the gambit is ineligible (the injury-edits-the-menu
   * behaviour: a disarmed or impaired-limb combatant loses it).
   */
  needsInstrument: boolean;
  /** Disarm: the target must actually be holding a weapon. */
  needsTargetArmed?: boolean;
  /** Control gambits set this flag on the *target* when they land. */
  flagOnLand?: CombatFlag;
  /** For `kind: 'reactive'`, the outcome that arms it. */
  reactiveTrigger?: ReactiveTrigger;
  /** Competence-band gate (informational until Build 2 conferrals). */
  minBand?: CompetenceBandName;
}

/**
 * The minimal demonstrative gambit set. Enough to show the affordance
 * model, attempt-time cross-gating, and injury-edits-the-menu; the full
 * four-channel breadth (feint / read / command) is deferred. Module-
 * private; read through {@link Gambit}'s statics.
 */
const GAMBITS: Record<string, GambitSpec> = {
  strike: {
    key: "strike",
    verb: "strike",
    kind: "offensive",
    offensive: true,
    needsInstrument: true,
  },
  disarm: {
    key: "disarm",
    verb: "disarm",
    kind: "control",
    offensive: false,
    needsInstrument: true,
    needsTargetArmed: true,
    flagOnLand: "disarmed",
  },
  subdue: {
    key: "subdue",
    verb: "subdue",
    kind: "control",
    offensive: false,
    needsInstrument: false,
    flagOnLand: "grappled",
  },
  shove: {
    key: "shove",
    verb: "shove",
    kind: "control",
    offensive: false,
    needsInstrument: true,
    flagOnLand: "prone",
  },
  /**
   * The reactive counter — a weapon riposte the session offers the
   * defender when an attacker's blow is parried. Weapon-only (needs an
   * instrument), so a disarmed defender can't riposte.
   */
  riposte: {
    key: "riposte",
    verb: "",
    kind: "reactive",
    offensive: true,
    needsInstrument: true,
    reactiveTrigger: "parried",
  },
};

/**
 * The gambit catalogue — static lookups over the module-private
 * demonstrative set. (A class, not free functions, per the export
 * discipline: one concept per module.)
 */
export class Gambit {
  private constructor() {}

  /** Look up a gambit spec by key. */
  static get(key: string): GambitSpec | undefined {
    return GAMBITS[key];
  }

  /** Look up a gambit spec by its command verb (attemptable set only). */
  static forVerb(verb: string): GambitSpec | undefined {
    const spec = GAMBITS[verb];
    return spec && spec.verb === verb ? spec : undefined;
  }

  /** All reactive gambits armed by a given trigger. */
  static reactiveFor(trigger: ReactiveTrigger): GambitSpec[] {
    return Object.values(GAMBITS).filter(
      (g) => g.kind === "reactive" && g.reactiveTrigger === trigger,
    );
  }
}
