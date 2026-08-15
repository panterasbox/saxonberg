/**
 * CombatantMixin — the capability "I can fight" (composed on `Character`).
 *
 * Carries **no** transient fight state — poise, tempo, and flags all live
 * on the {@link CombatSession}, never on the `Creature` (they evaporate at
 * session end). What lives here is durable and small:
 *
 *   - the combat verb affordances (`attack` / `status` / `yield` plus the
 *     demonstrative gambits `strike` / `disarm` / `subdue` / `shove`),
 *     contributed statically and gated at **attempt-time** by
 *     `CombatApi.eligibilityFor` (the terminal-only build needs only the
 *     attempt-time reject; the client-card "menu greys itself" defers with
 *     the card);
 *   - the **innate attack** hook: a species-declared natural weapon
 *     (`naturalAttackChannel`, e.g. a wolf's `point` bite). Humanoids
 *     leave it empty — fisticuffs / grapple depth is deferred in
 *     materials-response-slate — so a disarmed or impaired-limb humanoid
 *     genuinely *loses* `strike`, while a natural-weapon beast keeps it;
 *   - a `look` extension: a banded, perception-safe combat-state line
 *     appended to the host's long description while a fight is live.
 *
 * See docs/subsystems/combat.md.
 */

import type { MixinConstructor, FieldMeta } from "../mixin";
import type { CommandContributions } from "../../api/command";
import type { MarkupAugmenter } from "../../api/mml";
import type { Stuff } from "../stuff/Stuff";
import type { Channel } from "../material/Channel";
import type { CombatHookContext } from "./CombatHookContext";
import { CHANNELS } from "../material/Channel";
import { CombatApi } from "../../api/combat";
import {
  SettingTypes,
  type SettingsSchemaEntry,
} from "../shell/Environment";
import { LETHALITIES, STOP_CONDITIONS } from "./CombatTerms";

/** Public method surface for CombatantMixin. */
export interface Combatant {
  /** The legacy single-attack innate channel, or null (no natural
   * weapon — disarm/impair removes `strike`). The engine prefers the
   * species-level `Species.naturalAttacks[]` vocabulary when that list
   * is non-empty; this is its byte-preserving one-entry fallback. */
  getNaturalAttackChannel(): Channel | null;
  /** The authored standing lethality posture (`''` = none authored). The
   * consent handshake reads this so an NPC can declare it fights to the
   * death — NPCs aren't `Environment`s and so can't carry the player-side
   * `combat.lethality` *setting*. */
  getStandingLethality(): string;
  /** The authored standing stop-condition posture (`''` = none). */
  getStandingStopCondition(): string;

  // The participant hook terminals (the combat hook grammar — every
  // combatant, player or NPC, hears the same lifecycle moments). The
  // interface members carry the projected `@hook` contracts (an
  // interface reflects into the author surface; a mixin factory's
  // returned class does not) — the mixin's method TSDoc below is the
  // in-editor twin. Every body: synchronous, deterministic, cheap;
  // consequences through the ctx queue; shadowable by design.

  /**
   * This combatant entered a combat session — at open (initiator then
   * defender, before the venue's `onCombatOpened`) or at join (the
   * joiner). Determinism contract: synchronous, deterministic, cheap.
   * Shadowable by design.
   *
   * @hook Invoked by the combat engine at `openSessionImpl`'s and
   * `joinImpl`'s success tails. Compose via
   * `super.onSessionEntered(ctx)`.
   */
  onSessionEntered(ctx: CombatHookContext): void;
  /**
   * One of this combatant's exchanges fully resolved (`ctx.outcome`
   * set; once per exchange, actor-first then target, riposte included
   * in its parent's dispatch). Determinism contract: synchronous,
   * deterministic, cheap. Shadowable by design.
   *
   * @hook Invoked by the combat engine (`witnessExchange`) at the tail
   * of every outcome case in `resolveExchange`. Compose via
   * `super.onExchangeResolved(ctx)`.
   */
  onExchangeResolved(ctx: CombatHookContext): void;
  /**
   * This combatant's poise band changed over a beat — the per-beat
   * **net** transition, fired in roster order. Determinism contract:
   * synchronous, deterministic, cheap. Shadowable by design.
   *
   * @hook Invoked by the combat engine at the tail of `advanceImpl`,
   * after the poise tick loop. Compose via
   * `super.onPoiseBandChanged(ctx)`.
   */
  onPoiseBandChanged(ctx: CombatHookContext): void;
  /**
   * This combatant went down — the poise-contest loss OR the attrition
   * stamp. Determinism contract: synchronous, deterministic, cheap.
   * Shadowable by design.
   *
   * @hook Invoked by the combat engine at both `down = true` sites
   * (`handleDown`; `checkVitalsResolution`'s unconscious path), after
   * the stamp. Compose via `super.onDowned(ctx)`.
   */
  onDowned(ctx: CombatHookContext): void;
  /**
   * This combatant is the named victim of a resolving fight
   * (`ctx.resolution` says how). States still live. Determinism
   * contract: synchronous, deterministic, cheap. Shadowable by design.
   *
   * @hook Invoked by the combat engine in `endWith`, after
   * `narrateResolution` and before `session.resolve`. Compose via
   * `super.onDefeated(ctx)`.
   */
  onDefeated(ctx: CombatHookContext): void;
  /**
   * The victor-side twin: this combatant is the named killer/winner
   * (contest, or `lastStruckBy` for an attrition death; a draw fires
   * nothing). Determinism contract: synchronous, deterministic, cheap.
   * Shadowable by design.
   *
   * @hook Invoked by the combat engine in `endWith`, immediately after
   * the victim's `onDefeated`, before `session.resolve`. Compose via
   * `super.onDefeatedFoe(ctx)`.
   */
  onDefeatedFoe(ctx: CombatHookContext): void;
  /**
   * A coup this combatant is party to (executioner or victim) has
   * begun — the telegraph moment. The session's states have dissolved:
   * `ctx.actorState`/`targetState` are null here. Determinism
   * contract: synchronous, deterministic, cheap. Shadowable by design.
   *
   * @hook Invoked by the combat engine in `startCoup`, only after a
   * successful scheduler start — executioner first, then victim.
   * Compose via `super.onCoupBegun(ctx)`.
   */
  onCoupBegun(ctx: CombatHookContext): void;
}

export function CombatantMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class CombatantMixin extends Base implements Combatant {
    static _mixinName = "CombatantMixin";
    static fieldMeta: FieldMeta = {
      naturalAttackChannel: { persistent: true, authorable: true },
      standingLethality: { persistent: true, authorable: true },
      standingStopCondition: { persistent: true, authorable: true },
    };

    /**
     * The **legacy single-attack fallback** — the innate attack channel:
     * `edge` (claws), `point` (bite/horn), `blunt` (hooves/fists). Empty
     * = no natural weapon. The richer authoring surface is the
     * species-level `Species.naturalAttacks[]` vocabulary (multi-attack
     * beat-keyed rotation + profile hints); when THAT list is empty the
     * engine synthesizes this channel as a one-entry `{key: 'natural'}`
     * list, byte-preserving pre-vocabulary behavior. Kept as the simple
     * one-channel surface (field and behavior unchanged).
     */
    public naturalAttackChannel: string = "";

    /**
     * The authored **standing combat posture** — the terms this
     * combatant brings to a fight, read by the consent handshake. The
     * player-side surface is the `combat.lethality` / `combat.stopCondition`
     * *settings* (below), but those only resolve for `Environment` hosts;
     * an NPC isn't an Environment, so a duelist authors its posture here
     * instead (`'lethal'` / `'death'`). Empty = no authored posture (the
     * frictionless non-lethal default).
     */
    public standingLethality: string = "";
    public standingStopCondition: string = "";

    getStandingLethality(): string {
      return this.standingLethality;
    }
    getStandingStopCondition(): string {
      return this.standingStopCondition;
    }

    getNaturalAttackChannel(): Channel | null {
      const c = this.naturalAttackChannel;
      return c && (CHANNELS as readonly string[]).includes(c)
        ? (c as Channel)
        : null;
    }

    /* ── the participant hook terminals (the combat hook grammar) ──
     *
     * Every hook body is bound by the determinism contract: synchronous,
     * deterministic, cheap — no `await`, no wall-clock, no randomness,
     * bounded work per beat. Consequences on others go through the
     * {@link CombatHookContext} queue (never a gated Api from the hook
     * frame); self-state mutation is sanctioned. All hooks are
     * **shadowable by design** — a temporary effect attaches a shadow
     * over the method; detach ends the effect. Never `@Final` /
     * `@Unshadowable` here.
     */

    /**
     * This combatant entered a combat session — at open (initiator then
     * defender, before the venue's `onCombatOpened`) or at join (the
     * joiner). `ctx.target` pairs the entrant with the foe its
     * participation began against.
     *
     * Determinism contract: synchronous, deterministic, cheap.
     *
     * @hook Invoked by the combat engine at `openSessionImpl`'s success
     * tail and `joinImpl`'s success tail. Override to react (a fear aura
     * afflicts through the ctx); compose via
     * `super.onSessionEntered(ctx)`. No-op terminal. Shadowable by
     * design.
     */
    onSessionEntered(_ctx: CombatHookContext): void {
      // no-op terminal — overriders compose via super
    }

    /**
     * One of this combatant's exchanges fully resolved (`ctx.outcome`
     * set; riposte included in its parent exchange's dispatch — the
     * witness fires once per exchange, actor-first then target).
     *
     * Determinism contract: synchronous, deterministic, cheap.
     *
     * @hook Invoked by the combat engine (`witnessExchange`) at the tail
     * of every outcome case in `resolveExchange`. Override to react;
     * compose via `super.onExchangeResolved(ctx)`. No-op terminal.
     * Shadowable by design.
     */
    onExchangeResolved(_ctx: CombatHookContext): void {
      // no-op terminal — overriders compose via super
    }

    /**
     * This combatant's poise band changed over a beat — the **per-beat
     * net transition** (beat-top snapshot vs post-tick band; one
     * comparison per combatant per beat, fired in roster order, never
     * the reach sort).
     *
     * Determinism contract: synchronous, deterministic, cheap.
     *
     * @hook Invoked by the combat engine at the tail of `advanceImpl`,
     * after the poise tick loop. Override to react; compose via
     * `super.onPoiseBandChanged(ctx)`. No-op terminal. Shadowable by
     * design.
     */
    onPoiseBandChanged(_ctx: CombatHookContext): void {
      // no-op terminal — overriders compose via super
    }

    /**
     * This combatant went down — the poise-contest loss OR the attrition
     * (bled-to-unconscious) stamp, right after `down = true`.
     *
     * Determinism contract: synchronous, deterministic, cheap.
     *
     * @hook Invoked by the combat engine at both `down = true` sites
     * (`handleDown` before the terms branch; the `checkVitalsResolution`
     * unconscious path). Override to react; compose via
     * `super.onDowned(ctx)`. No-op terminal. Shadowable by design.
     */
    onDowned(_ctx: CombatHookContext): void {
      // no-op terminal — overriders compose via super
    }

    /**
     * This combatant is the named victim of a resolving fight
     * (`ctx.resolution` carries how it ended). Fires while the session's
     * states are still live — before `session.resolve` dissolves them.
     *
     * Determinism contract: synchronous, deterministic, cheap.
     *
     * @hook Invoked by the combat engine in `endWith`, after
     * `narrateResolution` and before `session.resolve`. Override to
     * react; compose via `super.onDefeated(ctx)`. No-op terminal.
     * Shadowable by design.
     */
    onDefeated(_ctx: CombatHookContext): void {
      // no-op terminal — overriders compose via super
    }

    /**
     * The victor-side twin: this combatant is the named killer/winner of
     * a resolving fight (named by the contest or, for an attrition
     * death, by the `lastStruckBy` killing edge — a draw names none and
     * fires nothing). On-kill dynamics (heal-on-fell,
     * chronicle-adjacent gear) live here.
     *
     * Determinism contract: synchronous, deterministic, cheap.
     *
     * @hook Invoked by the combat engine in `endWith`, immediately after
     * the victim's `onDefeated` and before `session.resolve` (states
     * still live). Override to react; compose via
     * `super.onDefeatedFoe(ctx)`. No-op terminal. Shadowable by design.
     */
    onDefeatedFoe(_ctx: CombatHookContext): void {
      // no-op terminal — overriders compose via super
    }

    /**
     * A coup this combatant is party to (executioner or victim) has
     * begun — the telegraph moment, after the coup activity started.
     * The resolved session's states have already dissolved:
     * `ctx.actorState`/`ctx.targetState` are null here.
     *
     * Determinism contract: synchronous, deterministic, cheap.
     *
     * @hook Invoked by the combat engine in `startCoup`, only after a
     * successful scheduler start, alongside `narrateCoupTelegraph` —
     * executioner first, then victim. Override to react; compose via
     * `super.onCoupBegun(ctx)`. No-op terminal. Shadowable by design.
     */
    onCoupBegun(_ctx: CombatHookContext): void {
      // no-op terminal — overriders compose via super
    }

    /**
     * Combat affordances — two verbs: `attack <target>` opens a fight,
     * and `fight` handles everything inside one (the read, the gambits,
     * yield) via subcommands. The gambit subcommands reject at
     * attempt-time when not in combat or when the instrument/limb is
     * unavailable (`CombatApi.eligibilityFor`).
     */
    static commandContributions: CommandContributions = {
      self: [
        "combat/attack.yaml",
        "combat/fight.yaml",
        "combat/intervene.yaml",
        "combat/defend.yaml",
      ],
      peers: [],
      environment: [],
    };

    /**
     * A character's **standing combat posture** — the terms they bring to
     * every fight, which pre-answer the consent handshake. `AttackController`
     * reads these to build each side's proposal: when the two sides agree
     * on lethality the fight folds silently; when they conflict a live
     * defender is prompted, and an NPC has its terms imposed. So a duelist
     * who declares `combat.lethality lethal` **consents** to a lethal
     * challenge (no crime); a townsperson at the non-lethal default does
     * not (the imposed-terms crime path).
     */
    static settings: SettingsSchemaEntry[] = [
      {
        key: "combat.lethality",
        type: SettingTypes.Enum,
        enumValues: [...LETHALITIES],
        default: "non-lethal",
        description:
          "Your standing lethality — the terms you bring to a fight. " +
          "`non-lethal` (a bout) or `lethal` (you fight to wound and, " +
          "if it comes to it, to kill). Matching lethality opens a fight " +
          "silently; a mismatch prompts (or imposes on an NPC).",
      },
      {
        key: "combat.stopCondition",
        type: SettingTypes.Enum,
        enumValues: [...STOP_CONDITIONS],
        default: "yield",
        description:
          "How far your standing terms carry a fight: `first-blood`, " +
          "`yield`, `incapacitation`, or `death`. The two sides fold to " +
          "the milder of their stop-conditions.",
      },
    ];

    static markupAugmenters: MarkupAugmenter[] = [combatStateAugmenter];
  };
}

/**
 * Append a banded combat-state line to a combatant's long description
 * while a fight is live. Bands only (the condition-band doctrine) —
 * poise is already banded and flags are boolean, so nothing leaks a
 * scalar. Server-authoritative; the client never receives hidden state.
 */
function combatStateAugmenter(
  text: string,
  host: Stuff,
  _viewer: Stuff,
): string {
  const session = CombatApi.sessionFor(host);
  if (!session) return text;
  const state = session.getState(host);
  if (!state) return text;
  const parts: string[] = [state.poise.band()];
  for (const flag of state.flags.list()) parts.push(flag);
  if (state.down) parts.push("down");
  const line = `In combat — ${parts.join(", ")}.`;
  return text && text.length > 0 ? `${text}\n\n${line}` : line;
}
