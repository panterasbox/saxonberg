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
import type { DeliveryForm } from "../material/Construction";

export type GambitKind =
  | "offensive"
  | "control"
  | "reactive"
  | "defensive"
  | "feint";

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
  /**
   * The weapon-delivery forms that **afford** this gambit ("the weapon edits
   * the menu"): a `sweep` needs a hafted weapon. Absent = any weapon. Checked
   * at attempt-time in `CombatLogic.eligibilityImpl`.
   */
  affordedByForm?: DeliveryForm[];
  /** Requires a wielded **shield** to afford (e.g. `bash`). */
  affordedByShield?: boolean;
}

/**
 * The gambit set. Enough to show the affordance model, attempt-time
 * cross-gating, and injury-edits-the-menu, plus the experience-pass
 * **feint** (the read/deception channel). The remaining four-channel
 * breadth (read / command) is deferred. Module-private; read through
 * {@link Gambit}'s statics.
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
   * The deliberate **defend** — cover up and recover poise (capped by the
   * `endurance` reserve) instead of attacking. The engine already picks
   * this as the autocombat default when a fighter is overextended; this
   * gambit hands the *choice* to the player, so they can play the patient
   * defender (whose parry-and-riposte beats a blind aggressor — the
   * build-1 balance finding) on purpose. Needs no instrument; the actual
   * poise restore lives in `CombatLogic.resolveExchange`'s `defend` branch,
   * so this descriptor exists only to make the intent *queueable*.
   */
  defend: {
    key: "defend",
    verb: "defend",
    kind: "defensive",
    offensive: false,
    needsInstrument: false,
  },
  /**
   * The **feint** — the read/deception move (poker, not slots). It inflicts
   * nothing itself; it presents as a threat/opening and reads the
   * *defender's* commitment. A committed defender (a steady, armed turtle
   * poised to parry) who fails to *read* the feint over-commits and cracks
   * their own guard open — which the feinter cashes in on the next strike.
   * A defender who reads it, or an un-committed aggressor, isn't fooled and
   * the bait is wasted. This is the one move that punishes patience, closing
   * rock-paper-scissors (strike ▸ feint ▸ defend ▸ strike). Weapon-only (you
   * feint *with* something); the bite/read logic lives in
   * `CombatLogic.decideOutcome` via the shared `CombatFog` gate.
   */
  feint: {
    key: "feint",
    verb: "feint",
    kind: "feint",
    offensive: false,
    needsInstrument: true,
  },
  /**
   * The **close** — step inside a longer weapon's reach (the reach tier's
   * approach half). A tempo-costed opposed maneuver: it flips the pair's
   * engagement range from `reach` to `close`, where a dagger/unarmed fighter
   * owns the clinch and the spear becomes a liability. The reach-holder can
   * contest it (keep you at bay) while composed and genuinely longer. Needs
   * no instrument (you can close bare-handed); the flip/contest logic lives
   * in `CombatLogic.resolveExchange`'s `close` branch. The reversal (pushing
   * back out to `reach`) is the reach-holder's `defend`.
   */
  close: {
    key: "close",
    verb: "close",
    kind: "control",
    offensive: false,
    needsInstrument: false,
  },
  /**
   * The **shield-bash** — a weapon-shaped gambit *afforded by the shield*,
   * not the weapon (the "weapon edits the menu" seam, over the equipment):
   * slam the shield forward to stagger a foe prone. Needs no weapon
   * instrument (the shield IS the instrument), but is only eligible while a
   * shield is wielded.
   */
  bash: {
    key: "bash",
    verb: "bash",
    kind: "control",
    offensive: false,
    needsInstrument: false,
    affordedByShield: true,
    flagOnLand: "prone",
  },
  /**
   * The **sweep** — a hafted weapon's low, wide swing that takes a foe's
   * legs. Afforded only by a hafted/flail form (a long haft to sweep with);
   * a bladed or pointed weapon can't. Lands the `prone` control flag.
   */
  sweep: {
    key: "sweep",
    verb: "sweep",
    kind: "control",
    offensive: false,
    needsInstrument: true,
    affordedByForm: ["hafted", "flail"],
    flagOnLand: "prone",
  },
  /**
   * The **entangle** — a whip's signature: wrap the lash round a limb or
   * weapon and bind the foe up. Afforded only by a `whip` form (you need a
   * flexible cord to snare with); lands the `grappled` control flag. This is
   * the "the weapon edits the menu" answer to a whip's poor raw damage —
   * a whip fights by *control*, not by the sting of the lash.
   */
  entangle: {
    key: "entangle",
    verb: "entangle",
    kind: "control",
    offensive: false,
    needsInstrument: true,
    affordedByForm: ["whip"],
    flagOnLand: "grappled",
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

  /** The verbs of the extra gambits a weapon-delivery form affords ("the
   * weapon edits the menu") — e.g. a hafted weapon affords `sweep`. Used by
   * the `analyze weapon` legibility preview. Null form → none. */
  static affordedByForm(form: DeliveryForm | null): string[] {
    if (!form) return [];
    return Object.values(GAMBITS)
      .filter((g) => g.affordedByForm?.includes(form))
      .map((g) => g.verb);
  }
}
