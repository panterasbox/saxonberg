/**
 * CombatNarration — turns a resolved exchange into per-viewer prose.
 *
 * This is the narration adapter (Thesis 17). It builds an algorithmic
 * frame from `{attacker, gambit, outcome, poise-band, trauma, site}`,
 * weaves in optional condition-keyed fragments from {@link CombatFlavor},
 * renders via `ProseApi.format` → `Mml`, and — per the plan's
 * [VERIFIED-CORRECTION] — **loops over the witnesses in perception tiers
 * and emits one Scene per tier** (a Scene fans by audience bucket and
 * gives every peer the *same* body; only per-viewer *naming* is
 * automatic, so per-viewer *content* — the hedged-for-bystanders severity
 * — needs the loop). The combatants read the precise band; bystanders
 * read a hedged clause. Server-authoritative — the client is never sent
 * hidden state.
 *
 * Reactions are producer-driven: the adapter mints its own `commandId`
 * (`SecurityApi.uuid()` — the beat runs in a detached scheduler root with
 * no command frame), stamps it on every frame, and — on **dramatic beats
 * only** — calls `ReactionApi.noteReactableAct` itself (the `Vocal`/`Soul`
 * precedent). Tick/pressed beats stay silent.
 *
 * A frame is always complete without a fragment (graceful default), so a
 * flavor miss never breaks a beat.
 */

import type { Stuff } from "../stuff/Stuff";
import type { Sensor } from "../message/Sensor";
import type { Channel } from "../material/Channel";
import type { OutcomeBand } from "../../api/material";
import { MessageApi } from "../../api/message";
import { ProseApi } from "../../api/prose";
import { Mml } from "../../api/mml";
import { ReactionApi } from "../../api/reaction";
import { SecurityApi } from "../../api/security";
import { MixinApi } from "../../api/mixin";
import { CombatFlavor, type FlavorOutcome } from "./CombatFlavor";
import type { CombatResolution } from "./CombatSession";

export const COMBAT_EXCHANGE_TOPIC = "world.combat.exchange";

/** The end-of-fight narration input. */
export interface ResolutionReport {
  combatants: readonly [Stuff, Stuff];
  outcome: CombatResolution;
  /** The loser (downed / killed / yielded), when there is one. */
  victim?: Stuff;
  /** The winner (for a death / incapacitation), when there is one. */
  killer?: Stuff;
}

/** What happened this exchange (the narration input). */
export type ExchangeOutcome =
  | "land" // offensive gambit landed, trauma inflicted
  | "control" // control gambit landed, flag set
  | "parried" // blow turned by the defender
  | "whiff" // missed and self-opened
  | "deflected" // reached the body but armor turned it (no trauma)
  | "down" // defender lost the poise contest (incapacitated)
  | "killed"; // lethal finish on a downed body

export interface ExchangeReport {
  attacker: Stuff;
  defender: Stuff;
  gambitKey: string;
  outcome: ExchangeOutcome;
  channel?: Channel;
  site?: string;
  /** The mechanical outcome band of a landed offensive blow. */
  band?: OutcomeBand;
  /** Struck material key (for material-aspect flavor). */
  materialKey?: string;
  /** Attacker species key (for species-aspect flavor). */
  attackerSpeciesKey?: string;
  /** The flag a control gambit set (disarmed/prone/grappled). */
  flagSet?: string;
  /** Whether this beat is reaction-worthy (a hit / break / down / kill). */
  dramatic: boolean;
}

/** Map a mechanical outcome band to the coarser flavor outcome. */
function flavorOutcomeFor(band: OutcomeBand | undefined): FlavorOutcome {
  switch (band) {
    case "turned":
      return "deflected";
    case "grazes":
      return "graze";
    case "bites":
      return "bite";
    case "bites-deep":
      return "bite-deep";
    default:
      return "bite";
  }
}

export class CombatNarration {
  private constructor() {}

  /**
   * Narrate one exchange to every witness in the room, each in their own
   * perception tier. Returns the minted `commandId` (tests assert on it).
   */
  static narrate(report: ExchangeReport): string {
    const commandId = SecurityApi.uuid();
    const fragment = CombatNarration.fragmentFor(report);

    for (const viewer of CombatNarration.witnesses(report.attacker)) {
      const tier: Tier =
        (viewer as Stuff) === (report.attacker as Stuff)
          ? "attacker"
          : (viewer as Stuff) === (report.defender as Stuff)
            ? "defender"
            : "bystander";
      const body = CombatNarration.body(report, tier, fragment);
      try {
        MessageApi.scene(viewer as Stuff)
          .topic(COMBAT_EXCHANGE_TOPIC)
          .meta({ commandId })
          .toSelf(body)
          .send();
      } catch {
        // best-effort per-viewer relay — drop this viewer, continue
      }
    }

    if (report.dramatic) {
      const scope = ReactionApi.locationScopeFor(report.attacker);
      if (scope) {
        ReactionApi.noteReactableAct({
          commandId,
          subject: report.attacker,
          scope,
        });
      }
    }
    return commandId;
  }

  /**
   * Narrate the **end** of a fight to every witness. Every resolution
   * path announces itself — a fight must never just stop (the silent
   * bleed-out / unconsciousness gap): the coup, the collapse, the yield,
   * the draw all get a line. Reactable (the finish is the most
   * reaction-worthy beat of all).
   */
  static narrateResolution(report: ResolutionReport): string {
    const commandId = SecurityApi.uuid();
    const anchor = report.killer ?? report.victim ?? report.combatants[0];
    for (const viewer of CombatNarration.witnesses(report.combatants[0])) {
      const body = CombatNarration.resolutionBody(report, viewer as Stuff);
      try {
        MessageApi.scene(viewer as Stuff)
          .topic(COMBAT_EXCHANGE_TOPIC)
          .meta({ commandId })
          .toSelf(body)
          .send();
      } catch {
        // best-effort per-viewer relay
      }
    }
    const scope = ReactionApi.locationScopeFor(anchor);
    if (scope) {
      ReactionApi.noteReactableAct({ commandId, subject: anchor, scope });
    }
    return commandId;
  }

  /** The per-viewer resolution line (self/target/bystander voice). */
  private static resolutionBody(
    report: ResolutionReport,
    viewer: Stuff,
  ): Mml {
    const { killer, victim, outcome } = report;
    const isVictim = victim && (viewer as Stuff) === (victim as Stuff);
    const isKiller = killer && (viewer as Stuff) === (killer as Stuff);
    const K = killer ? Mml.name(killer) : Mml.text("someone");
    const V = victim ? Mml.name(victim) : Mml.text("someone");
    let tpl: string;
    switch (outcome) {
      case "death":
        tpl = isVictim
          ? "{{killer}} cuts you down. You are dead."
          : isKiller
            ? "You cut {{victim}} down — dead. The fight is over."
            : "{{killer}} cuts {{victim}} down. The fight is over.";
        break;
      case "incapacitation":
        tpl = isVictim
          ? "You drop, senseless. The fight is over."
          : "{{victim}} drops, senseless. The fight is over.";
        break;
      case "first-blood":
        tpl = "First blood — {{victim}} is cut. The bout is decided.";
        break;
      case "yield":
        tpl = isVictim
          ? "You yield. The fight is over."
          : "{{victim}} yields. The fight is over.";
        break;
      case "draw":
        tpl = "You break apart, spent — neither will yield.";
        break;
      default:
        tpl = "The fight is over.";
    }
    try {
      return ProseApi.format(tpl, { killer: K, victim: V });
    } catch {
      return Mml.fromMarkup(Mml.escape("The fight is over."));
    }
  }

  /** The best-matching flavor fragment (material, then species), or ''. */
  private static fragmentFor(report: ExchangeReport): string {
    if (!report.channel) return "";
    const outcome = flavorOutcomeFor(report.band);
    if (report.materialKey) {
      const m = CombatFlavor.lookup({
        aspect: "material",
        key: report.materialKey,
        channel: report.channel,
        outcome,
      });
      if (m) return m;
    }
    if (report.attackerSpeciesKey) {
      const s = CombatFlavor.lookup({
        aspect: "species",
        key: report.attackerSpeciesKey,
        channel: report.channel,
        outcome,
      });
      if (s) return s;
    }
    return "";
  }

  /** The room's Sensors (combatants + bystanders); [] when unplaced. */
  private static witnesses(attacker: Stuff): (Stuff & Sensor)[] {
    if (!MixinApi.isContainable(attacker)) return [];
    const room = attacker.getContainer();
    if (!room || !MixinApi.isContainer(room)) return [];
    const out: (Stuff & Sensor)[] = [];
    for (const occ of room.getContents()) {
      if (MixinApi.isSensor(occ)) out.push(occ as Stuff & Sensor);
    }
    return out;
  }

  /** Render the per-tier body via ProseApi (Mml-aware, late-bound names). */
  private static body(
    report: ExchangeReport,
    tier: Tier,
    fragment: string,
  ): Mml {
    const vars = {
      attacker: Mml.name(report.attacker),
      defender: Mml.name(report.defender),
      fragment,
      clause: CombatNarration.severityClause(report, tier),
    };
    const template = CombatNarration.template(report, tier);
    try {
      return ProseApi.format(template, vars);
    } catch {
      return Mml.fromMarkup(Mml.escape("The fight rages on."));
    }
  }

  /** The severity clause: precise for combatants, hedged for bystanders. */
  private static severityClause(report: ExchangeReport, tier: Tier): string {
    if (report.outcome !== "land") return "";
    if (tier === "bystander") {
      return report.band === "bites-deep" ? "a hard hit" : "a hit";
    }
    switch (report.band) {
      case "bites-deep":
        return "a deep wound";
      case "bites":
        return "a solid wound";
      case "grazes":
        return "a graze";
      default:
        return "a glancing blow";
    }
  }

  /** The Liquid frame for an outcome × tier (self/target/bystander voice). */
  private static template(report: ExchangeReport, tier: Tier): string {
    const A = tier === "attacker" ? "You" : "{{attacker}}";
    const D = tier === "defender" ? "you" : "{{defender}}";
    const Dcap = tier === "defender" ? "You" : "{{defender}}";
    // A non-empty flavor fragment folds in parenthetically; a miss
    // renders nothing (graceful default).
    const frag = "{% if fragment != '' %} — {{fragment}}{% endif %}";
    switch (report.outcome) {
      case "land":
        return `${A} land a blow on ${D} — {{clause}}${frag}.`;
      case "control":
        return CombatNarration.controlTemplate(report, A, D);
      case "parried":
        return `${Dcap} turn ${A === "You" ? "your" : "the"} blow aside.`;
      case "whiff":
        return `${A} overreach and stumble, wide open.`;
      case "deflected":
        return `${A} strike ${D}, but the blow is turned.`;
      case "down":
        return `${Dcap} reel and drop, done.`;
      case "killed":
        return `${A} finish ${D}.`;
      default:
        return `${A} press ${D}.`;
    }
  }

  private static controlTemplate(
    report: ExchangeReport,
    A: string,
    D: string,
  ): string {
    switch (report.flagSet) {
      case "disarmed":
        return `${A} knock the weapon from ${D}'s grip.`;
      case "prone":
        return `${A} put ${D} on the ground.`;
      case "grappled":
        return `${A} lock ${D} up.`;
      default:
        return `${A} gain the upper hand on ${D}.`;
    }
  }
}

type Tier = "attacker" | "defender" | "bystander";
