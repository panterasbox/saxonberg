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
import type { PoiseBand } from "./Poise";
import type { Trauma } from "../vitals/Condition";

export const COMBAT_EXCHANGE_TOPIC = "world.combat.exchange";

/** The end-of-fight narration input. */
export interface ResolutionReport {
  /** Every participant in the resolving fight (≥1; a melee is N-sided). */
  combatants: readonly Stuff[];
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
  | "killed" // lethal finish on a downed body
  | "feinted" // a feint baited the defender — their guard cracked open
  | "feint-read"; // a feint was read/wasted — no effect

/**
 * The beat's punctuation intensity — the emergent dramatic arc (Thesis 2).
 * `roar` at a threshold crossing (first-blood / the break / the down/kill),
 * `murmur` for an ordinary notable beat, `silent` otherwise. Narration
 * swells and the crowd's reaction fan-out both scale to this.
 */
export type BeatIntensity = "silent" | "murmur" | "roar";

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
  /** The beat's dramatic-arc intensity — gates the crowd's reaction fan-out
   * (`silent` = no reactable act) and scales the narration swell. Falls back
   * to `dramatic` when absent (older callers). */
  intensity?: BeatIntensity;
  /** True when this beat drew the fight's first blood (a roar). */
  firstBlood?: boolean;
  /** The defender's poise band AFTER this exchange — the arc driver
   * (steady → pressed → reeling → broken → open). */
  defenderPoise?: PoiseBand;
  /** True when this blow exploited an open window (the decisive break). */
  openingExploited?: boolean;
  /** True when this exchange *cracked* the defender's guard open (a
   * fresh opening, not yet exploited) — surfaced as a beat. */
  openingCracked?: boolean;
  /** The trauma type inflicted (laceration/puncture/fracture/contusion). */
  traumaType?: string;
  /** Beat index — rotates phrasing so the feed doesn't repeat. */
  beat?: number;
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

    // The crowd's reaction fan-out is volume-gated by beat-intensity: an
    // ordinary/silent beat notes nothing; a murmur or a roar marks the act
    // reactable so witnesses can react to it (the roar's swell is carried in
    // the prose above). Falls back to the older `dramatic` boolean.
    const reactable =
      report.intensity !== undefined
        ? report.intensity !== "silent"
        : report.dramatic;
    if (reactable) {
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
    const primary = report.combatants[0];
    const anchor = report.killer ?? report.victim ?? primary;
    if (!anchor) return commandId;
    const cause = causeOf(report.victim);
    for (const viewer of CombatNarration.witnesses(anchor)) {
      const body = CombatNarration.resolutionBody(report, viewer as Stuff, cause);
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

  /**
   * The coup **telegraph** — the slow, deliberate beat where the victor
   * stands over the fallen with the stroke poised, before it lands. This
   * is the window a present party has to intervene, so it must read
   * loudly to every witness. Reactable (a charged, dramatic beat).
   */
  static narrateCoupTelegraph(executioner: Stuff, victim: Stuff): string {
    const commandId = SecurityApi.uuid();
    const E = Mml.name(executioner);
    const V = Mml.name(victim);
    for (const viewer of CombatNarration.witnesses(executioner)) {
      const isE = (viewer as Stuff) === (executioner as Stuff);
      const isV = (viewer as Stuff) === (victim as Stuff);
      const tpl = isE
        ? `You stand over {{victim}}, fallen and helpless, and raise the killing stroke.`
        : isV
          ? `{{executioner}} stands over you, fallen, the killing stroke raised. There is a moment — no more.`
          : `{{executioner}} stands over the fallen {{victim}}, the killing stroke poised. There is a moment to stop it.`;
      try {
        const body = ProseApi.format(tpl, { executioner: E, victim: V });
        MessageApi.scene(viewer as Stuff)
          .topic(COMBAT_EXCHANGE_TOPIC)
          .meta({ commandId })
          .toSelf(body)
          .send();
      } catch {
        // best-effort per-viewer relay
      }
    }
    const scope = ReactionApi.locationScopeFor(executioner);
    if (scope) {
      ReactionApi.noteReactableAct({ commandId, subject: executioner, scope });
    }
    return commandId;
  }

  /**
   * A formation **interception** — a protector steps into an attacker's
   * line, taking a protected ally's incoming pressure onto themselves
   * (the policy-triggered `defend`, run by the beat's interception pass).
   * A murmur-tier beat: witnessed and reactable, not a roar.
   */
  static narrateInterception(
    interposer: Stuff,
    protectee: Stuff,
    attacker: Stuff,
  ): string {
    const commandId = SecurityApi.uuid();
    const I = Mml.name(interposer);
    const P = Mml.name(protectee);
    const A = Mml.name(attacker);
    for (const viewer of CombatNarration.witnesses(interposer)) {
      const isI = (viewer as Stuff) === (interposer as Stuff);
      const isP = (viewer as Stuff) === (protectee as Stuff);
      const isA = (viewer as Stuff) === (attacker as Stuff);
      const tpl = isI
        ? `You step into {{attacker}}'s line, taking the press off {{protectee}}.`
        : isP
          ? `{{interposer}} steps into {{attacker}}'s line — the press comes off you.`
          : isA
            ? `{{interposer}} steps into your line, covering {{protectee}}.`
            : `{{interposer}} steps into {{attacker}}'s line, covering {{protectee}}.`;
      try {
        const body = ProseApi.format(tpl, {
          interposer: I,
          protectee: P,
          attacker: A,
        });
        MessageApi.scene(viewer as Stuff)
          .topic(COMBAT_EXCHANGE_TOPIC)
          .meta({ commandId })
          .toSelf(body)
          .send();
      } catch {
        // best-effort per-viewer relay
      }
    }
    const scope = ReactionApi.locationScopeFor(interposer);
    if (scope) {
      ReactionApi.noteReactableAct({ commandId, subject: interposer, scope });
    }
    return commandId;
  }

  /**
   * A coup **held for the captain's word** (`coupCall: 'captain'`) — the
   * victor stands over the fallen, but the formation reserves the call.
   * Reads loudly (the intervention window is real), and telegraphs that
   * the decision is the captain's.
   */
  static narrateCoupHeld(executioner: Stuff, victim: Stuff): string {
    const commandId = SecurityApi.uuid();
    const E = Mml.name(executioner);
    const V = Mml.name(victim);
    for (const viewer of CombatNarration.witnesses(executioner)) {
      const isE = (viewer as Stuff) === (executioner as Stuff);
      const isV = (viewer as Stuff) === (victim as Stuff);
      const tpl = isE
        ? `You stand over {{victim}}, fallen — the stroke is yours to give, but the call is your captain's.`
        : isV
          ? `{{executioner}} stands over you, fallen — awaiting the word. There is a moment.`
          : `{{executioner}} stands over the fallen {{victim}}, awaiting the captain's word. There is a moment to stop it.`;
      try {
        const body = ProseApi.format(tpl, { executioner: E, victim: V });
        MessageApi.scene(viewer as Stuff)
          .topic(COMBAT_EXCHANGE_TOPIC)
          .meta({ commandId })
          .toSelf(body)
          .send();
      } catch {
        // best-effort per-viewer relay
      }
    }
    const scope = ReactionApi.locationScopeFor(executioner);
    if (scope) {
      ReactionApi.noteReactableAct({ commandId, subject: executioner, scope });
    }
    return commandId;
  }

  /**
   * The coup **stayed** — the killing stroke did not land (an intervention,
   * the executioner's own second thoughts, the moment lost). The victim
   * is spared; every witness gets the line so the drama resolves cleanly.
   */
  static narrateCoupStayed(executioner: Stuff, victim: Stuff): string {
    const commandId = SecurityApi.uuid();
    const E = Mml.name(executioner);
    const V = Mml.name(victim);
    for (const viewer of CombatNarration.witnesses(executioner)) {
      const isE = (viewer as Stuff) === (executioner as Stuff);
      const isV = (viewer as Stuff) === (victim as Stuff);
      const tpl = isE
        ? `You stay your hand. {{victim}} lives.`
        : isV
          ? `The stroke never falls. {{executioner}} stays their hand — you live.`
          : `The stroke never falls — {{executioner}} stays their hand. {{victim}} is spared.`;
      try {
        const body = ProseApi.format(tpl, { executioner: E, victim: V });
        MessageApi.scene(viewer as Stuff)
          .topic(COMBAT_EXCHANGE_TOPIC)
          .meta({ commandId })
          .toSelf(body)
          .send();
      } catch {
        // best-effort per-viewer relay
      }
    }
    return commandId;
  }

  /**
   * A hook-queued **flavor line** (an item that whispers / taunts /
   * flares — `CombatHookContext.attachFlavor`) — emitted through the same
   * witness loop as an exchange, AFTER the exchange's own narration beat,
   * in queue order. One identical line per witness; never reactable
   * (flavor is garnish, not a beat).
   */
  static narrateFlavor(anchor: Stuff, line: string): string {
    const commandId = SecurityApi.uuid();
    const body = Mml.fromMarkup(Mml.escape(line));
    for (const viewer of CombatNarration.witnesses(anchor)) {
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
    return commandId;
  }

  /** The per-viewer resolution line (self/target/bystander voice), naming
   * the cause of the fall when there is one (no bare "cut down"). */
  private static resolutionBody(
    report: ResolutionReport,
    viewer: Stuff,
    cause: string,
  ): Mml {
    const { killer, victim, outcome } = report;
    const isVictim = victim && (viewer as Stuff) === (victim as Stuff);
    const isKiller = killer && (viewer as Stuff) === (killer as Stuff);
    const K = killer ? Mml.name(killer) : Mml.text("someone");
    const V = victim ? Mml.name(victim) : Mml.text("someone");
    const c = cause ? ` — ${cause}` : "";
    let tpl: string;
    switch (outcome) {
      case "death":
        tpl = isVictim
          ? `{{killer}} cuts you down${c}. You are dead.`
          : isKiller
            ? `You cut {{victim}} down${c} — dead. The fight is over.`
            : `{{killer}} cuts {{victim}} down${c}. The fight is over.`;
        break;
      case "incapacitation":
        tpl = isVictim
          ? `You drop${c || ", senseless"}. The fight is over.`
          : `{{victim}} drops${c || ", senseless"}. The fight is over.`;
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

  /**
   * Render the per-tier body via ProseApi (Mml-aware, late-bound names).
   * The line is composed from the tactical state — outcome × the
   * defender's poise band × whether a guard broke this beat — so the feed
   * reads as an arc (feeling-out → pressure → the break → the finish),
   * varies by beat instead of repeating, and surfaces state changes
   * (openings, flags). Verbs conjugate correctly per tier.
   */
  private static body(
    report: ExchangeReport,
    tier: Tier,
    fragment: string,
  ): Mml {
    const template = composeExchangeLine(report, tier, fragment);
    const vars = {
      attacker: Mml.name(report.attacker),
      defender: Mml.name(report.defender),
    };
    try {
      return ProseApi.format(template, vars);
    } catch {
      return Mml.fromMarkup(Mml.escape("The fight rages on."));
    }
  }
}

type Tier = "attacker" | "defender" | "bystander";

/* ─────────────────── exchange-line composition ─────────────────── */

/** Rotate a phrasing pool by beat so the feed doesn't repeat. */
function rot(pool: readonly string[], beat = 0): string {
  return pool[Math.abs(beat) % pool.length]!;
}

/** English 3rd-person-singular of a bare verb (`you slip` → `it slips`). */
function conj(verb: string, secondPerson: boolean): string {
  if (secondPerson) return verb;
  if (/(s|sh|ch|x|z)$/.test(verb)) return verb + "es";
  if (/[^aeiou]y$/.test(verb)) return verb.slice(0, -1) + "ies";
  return verb + "s";
}

/** A body-part key → a readable site ("body.arm.right" → "right arm"). */
function siteWord(site: string | undefined): string {
  if (!site) return "body";
  const parts = site.replace(/^body\./, "").split(".");
  const side = parts.find((p) => p === "left" || p === "right");
  const rest = parts.filter((p) => p !== "left" && p !== "right");
  const noun = rest[rest.length - 1] ?? "body";
  return side ? `${side} ${noun}` : noun;
}

/** The channel's attack verbs (single words so they conjugate cleanly). */
function channelVerb(channel: Channel | undefined, beat: number): string {
  switch (channel) {
    case "edge":
      return rot(["open", "score", "slash", "cut"], beat);
    case "point":
      return rot(["stab", "pierce", "skewer"], beat);
    case "blunt":
      return rot(["hammer", "crack", "batter"], beat);
    default:
      return "strike";
  }
}

/** The wound clause — precise for combatants, hedged for bystanders. */
function woundWord(report: ExchangeReport, tier: Tier, beat: number): string {
  if (tier === "bystander") {
    return report.band === "bites-deep" ? "a hard hit" : "a hit";
  }
  switch (report.band) {
    case "bites-deep":
      return rot(["a deep wound", "a savage gash", "a wound to the bone"], beat);
    case "bites":
      return rot(["a solid wound", "a raking gash", "a real hurt"], beat);
    case "grazes":
      return "a graze";
    default:
      return "a glancing blow";
  }
}

/**
 * Build the Liquid template for one exchange from the tactical state.
 * `{{attacker}}`/`{{defender}}` stay for ProseApi to late-bind per viewer.
 */
function composeExchangeLine(
  report: ExchangeReport,
  tier: Tier,
  fragment: string,
): string {
  const atk = tier === "attacker";
  const defYou = tier === "defender";
  const beat = report.beat ?? 0;
  // Subject strings (sentence-start capitalized where the subject is
  // "You"; a 3rd-person name renders lower-case, MUD-conventionally).
  const Acap = atk ? "You" : "{{attacker}}";
  const Alow = atk ? "you" : "{{attacker}}";
  const Dcap = defYou ? "You" : "{{defender}}";
  const Dlow = defYou ? "you" : "{{defender}}";
  // The defender's possessive: a pronoun for a combatant viewer ("your"
  // when it's you, "its" when you're the attacker) but the name for a
  // bystander, where "its" would be ambiguous. Kills the name-repetition.
  const dp = defYou ? "your" : atk ? "its" : "{{defender}}'s";
  // Sentence-start form of the defender possessive (capitalised pronoun).
  const Dp = defYou ? "Your" : atk ? "Its" : "{{defender}}'s";
  /** Conjugate an attacker-subject verb (`you slip` / `it slips`). */
  const av = (v: string): string => conj(v, atk);
  const cv = av(channelVerb(report.channel, beat));
  const bp = `${dp} ${siteWord(report.site)}`;
  const frag = fragment ? ` — ${fragment}` : "";
  const band = report.defenderPoise;

  switch (report.outcome) {
    case "land": {
      const wound = woundWord(report, tier, beat);
      if (report.openingExploited) {
        return rot(
          [
            `${Dp} guard breaks wide — ${Alow} ${cv} ${bp} through the gap — ${wound}${frag}.`,
            `There — an opening. ${Acap} ${cv} ${bp} — ${wound}${frag}.`,
          ],
          beat,
        );
      }
      if (band === "reeling" || band === "broken") {
        return rot(
          [
            `${Dcap} ${conj("reel", defYou)} under it as ${Alow} ${cv} ${bp} — ${wound}${frag}.`,
            `Pressing hard, ${Alow} ${cv} ${bp} again — ${wound}${frag}.`,
          ],
          beat,
        );
      }
      // A clean hit on a still-composed guard.
      return rot(
        [
          `${Acap} ${av("slip")} inside ${dp} guard and ${cv} ${bp} — ${wound}${frag}.`,
          `${Acap} ${cv} ${bp} — ${wound}${frag}.`,
          `${Acap} ${av("find")} the angle and ${cv} ${bp} — ${wound}${frag}.`,
        ],
        beat,
      );
    }
    case "parried": {
      const opened = report.openingCracked
        ? ` — but ${dp} guard cracks open!`
        : "";
      return (
        rot(
          [
            `${Dcap} ${conj("read", defYou)} the strike and ${conj("turn", defYou)} it aside`,
            `${Acap} ${av("test")} ${dp} guard; ${Dlow} ${conj("hold", defYou)}`,
            `Steel rings as ${Dlow} ${conj("beat", defYou)} the blow away`,
          ],
          beat,
        ) + opened + "."
      );
    }
    case "whiff":
      return rot(
        [
          `${Acap} ${av("overreach")} and ${av("stumble")} past, wide open.`,
          `${Acap} ${av("lunge")}, spent, and ${av("carry")} past ${dp} shoulder — off balance.`,
        ],
        beat,
      );
    case "control":
      return controlLine(report, Acap, av, dp, Dlow);
    case "deflected":
      return `${Acap} ${cv} ${bp}, but the blow is turned.`;
    case "feinted":
      // The bait worked — the defender over-committed and their guard is
      // wide open (the roar; the feinter cashes it next strike).
      return rot(
        [
          `${Acap} ${av("feint")} — ${Dlow} ${conj("bite", defYou)} on it, and ${dp} guard is flung wide open.`,
          `A false opening. ${Acap} ${av("feint")}, ${Dlow} ${conj("commit", defYou)} to the parry — and ${dp} guard cracks open.`,
        ],
        beat,
      );
    case "feint-read":
      // The bait was seen through (or wasted on a non-turtle) — no effect.
      return rot(
        [
          `${Acap} ${av("feint")}, but ${Dlow} ${conj("read", defYou)} it and ${conj("stay", defYou)} composed.`,
          `${Acap} ${av("feint")} — ${Dlow} ${conj("refuse", defYou)} the bait.`,
        ],
        beat,
      );
    default:
      return `${Acap} ${av("press")} ${Dlow}.`;
  }
}

/**
 * The cause of a fall, read from the victim's worst wound — so a death
 * names *why* ("bled white", "skull broken"), never a bare "cut down".
 * Empty when there's nothing to read (a clean yield / draw).
 */
function causeOf(victim: Stuff | undefined): string {
  if (!victim || !MixinApi.isVitals(victim)) return "";
  const traumas = victim
    .getConditions()
    .filter((cnd): cnd is Trauma => cnd.kind === "trauma");
  if (traumas.length === 0) return "";
  const worst = [...traumas].sort((a, b) => b.severity - a.severity)[0]!;
  const bleeding = traumas.some((t) => t.bleeding);
  if (worst.type === "fracture") {
    return worst.site?.startsWith("body.head") ? "skull broken" : "bones broken";
  }
  if (bleeding || worst.type === "laceration" || worst.type === "puncture") {
    return "bled white";
  }
  return "beaten past enduring";
}

/** Control-gambit lines — surface the flag distinctly (a status effect). */
function controlLine(
  report: ExchangeReport,
  Acap: string,
  av: (v: string) => string,
  dp: string,
  Dlow: string,
): string {
  switch (report.flagSet) {
    case "disarmed":
      return `${Acap} ${av("knock")} the weapon from ${dp} grip — disarmed.`;
    case "prone":
      return `${Acap} ${av("sweep")} ${Dlow} off ${dp} feet — down in the dirt.`;
    case "grappled":
      return `${Acap} ${av("lock")} ${Dlow} up, grappling.`;
    default:
      return `${Acap} ${av("gain")} the upper hand on ${Dlow}.`;
  }
}
