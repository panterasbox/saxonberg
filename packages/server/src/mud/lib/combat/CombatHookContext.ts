/**
 * CombatHookContext — the one context object every combat hook takes
 * (value-object; the `Poise`/`Gambit` shape: plain class, not Stuff,
 * never proxied).
 *
 * Two faces:
 *
 *   - a **readonly read surface** — the tactical state the engine itself
 *     holds at the firing point (session, beat, the exchange pair and
 *     their `CombatantState` views, gambit, outcome, channel/site,
 *     instrument, venue, resolution). Nullable where a seam lacks it
 *     (a coup-time context has no live states; a venue-resolution
 *     context may have no gambit). Hooks **read freely** — any
 *     participant surface (material, species, poise band) is directly
 *     readable; only *consequences* are context-mediated.
 *   - a **consequence queue** — the engine-mediated surface for effects
 *     on others. A hook never calls a gated Api from its own frame
 *     (hooks must not become a permission bypass); it queues through
 *     the eight `attach*`/verb methods below, and the engine **drains**
 *     the queue from its own frame, in queue order, after dispatch —
 *     so provenance and accountability bookkeeping are identical to the
 *     engine's own calls. **Self-state mutation is sanctioned**: a hook
 *     freely mutates its own host (combo counters, charge gauges, its
 *     own wear) directly, under the determinism contract.
 *
 * The `on?: 'attacker' | 'defender'` recipient (default `'defender'`)
 * resolves against the context's own actor/target pair —
 * recipient-constrained, never arbitrary targeting; queueing against a
 * null resolved recipient throws.
 *
 * **Determinism contract** (binds every hook body, override or shadow):
 * synchronous, deterministic, cheap — no `await`, no wall-clock, no
 * randomness, bounded work per beat.
 *
 * A rogue hook-constructed context is inert — only the engine drains
 * the one it built. After the engine drains, the context is **sealed**:
 * any further queueing throws (closing the stashed-context determinism
 * hole).
 *
 * See docs/subsystems/combat.md (the hook grammar).
 */

import type { Stuff } from "../stuff/Stuff";
import type { InflictSpec } from "../../api/condition";
import type { ActiveCondition } from "../vitals/Condition";
import type { Channel } from "../material/Channel";
import type { Quantity, Unit } from "../quantity";
import type { Energized } from "../electricity/Energized";
import type { CombatInfluence } from "./CombatInfluence";
import type {
  CombatSession,
  CombatantState,
  CombatResolution,
} from "./CombatSession";
import type { GambitSpec } from "./Gambit";

/**
 * The deterministic exchange-outcome vocabulary (the engine's
 * `decideOutcome` result). Canonical home — `CombatLogic` re-aliases it
 * locally as its `OutcomeKind`.
 */
export type ExchangeOutcomeKind =
  | "whiff"
  | "parried"
  | "control-resisted"
  | "control-land"
  | "exploit"
  | "land"
  | "feint-bit"
  | "feint-read";

/**
 * A queued consequence's recipient, resolved against the context's own
 * exchange pair — `'attacker'` = the context's actor, `'defender'` =
 * its target.
 */
export type ConsequenceRecipient = "attacker" | "defender";

/**
 * One queued consequence — the discriminated union the engine drains
 * and applies from its own frame, in queue order.
 */
export type CombatConsequence =
  | { kind: "rider"; spec: InflictSpec; on: ConsequenceRecipient }
  | { kind: "afflict"; condition: ActiveCondition; on: ConsequenceRecipient }
  | { kind: "toxin"; type: string; amount: number; on: ConsequenceRecipient }
  | {
      kind: "reserve";
      key: string;
      delta: Quantity<Unit>;
      on: ConsequenceRecipient;
    }
  | { kind: "wear"; amount: number; on: ConsequenceRecipient }
  | { kind: "influence"; instruction: CombatInfluence; on: ConsequenceRecipient }
  | { kind: "shock"; source: Stuff & Energized }
  | { kind: "flavor"; line: string };

/**
 * A **reactive venue** — the optional Location hooks the engine
 * presence-dispatches (the `Exitable.onEntered`/`onExited` optional-hook
 * idiom: present → called, absent → skipped; the base `Location` is
 * untouched). A hook-less room (a gym `ContainerMixin(Idea)`) is simply
 * skipped.
 */
export interface CombatVenue {
  /**
   * A combat session opened in this venue (fired once at open — a
   * mid-fight `join` does not re-fire it). Anchor = the initiator's
   * room.
   *
   * Determinism contract: synchronous, deterministic, cheap — no
   * `await`, no wall-clock, no randomness, bounded work per beat.
   *
   * @hook Invoked by the combat engine at `openSessionImpl`'s success
   * tail, after the participants' `onSessionEntered`. Optional —
   * declare it on a Location subclass (or future mixin) to react.
   */
  onCombatOpened?(ctx: CombatHookContext): void;

  /**
   * First blood drawn in this venue (the existing
   * `CombatSession.bloodDrawn` transition — fired exactly once per
   * session, at the crossing, after the narration roar).
   *
   * Determinism contract: synchronous, deterministic, cheap — no
   * `await`, no wall-clock, no randomness, bounded work per beat.
   *
   * @hook Invoked by the combat engine at the three
   * `markBloodDrawn() === true` sites, after the narrate call.
   */
  onBloodDrawn?(ctx: CombatHookContext): void;

  /**
   * A combat session resolved in this venue (`ctx.resolution` carries
   * how it ended). Anchor = the victim's room, else the first
   * combatant's.
   *
   * Determinism contract: synchronous, deterministic, cheap — no
   * `await`, no wall-clock, no randomness, bounded work per beat.
   *
   * @hook Invoked by the combat engine in `endWith`, after
   * `narrateResolution` and the participant defeat witnesses, before
   * `session.resolve`.
   */
  onCombatResolved?(ctx: CombatHookContext): void;
}

/** Constructor init for {@link CombatHookContext} (built by the engine). */
export interface CombatHookContextInit {
  session: CombatSession;
  beat: number;
  actor?: Stuff | null;
  target?: Stuff | null;
  actorState?: CombatantState | null;
  targetState?: CombatantState | null;
  gambit?: GambitSpec | null;
  outcome?: ExchangeOutcomeKind | null;
  channel?: Channel | null;
  site?: string | null;
  deflected?: boolean;
  instrument?: Stuff | null;
  venue?: Stuff | null;
  resolution?: CombatResolution | null;
}

export class CombatHookContext {
  /* ───────────────────────── read surface ───────────────────────── */

  /** The live session this hook fires inside. */
  readonly session: CombatSession;
  /** The session beat at the firing point. */
  readonly beat: number;
  /** The exchange's acting side (the striker), when the seam has one. */
  readonly actor: Stuff | null;
  /** The exchange's receiving side, when the seam has one. */
  readonly target: Stuff | null;
  /** The actor's transient fight state (null once states dissolve —
   * e.g. a coup-time context). */
  readonly actorState: CombatantState | null;
  /** The target's transient fight state (null once states dissolve). */
  readonly targetState: CombatantState | null;
  /** The gambit being resolved, when the seam sits inside an exchange. */
  readonly gambit: GambitSpec | null;
  /** The exchange outcome, once decided (null before/outside one). */
  readonly outcome: ExchangeOutcomeKind | null;
  /** The delivery channel of the strike, when the seam has one. */
  readonly channel: Channel | null;
  /** The struck `body.*` site, when the seam has one. */
  readonly site: string | null;
  /** True when the blow was fully attenuated (nothing landed) — "the
   * shield took the blow" is the point of `onStruck`. */
  readonly deflected: boolean;
  /** The resolved striking instrument (wielded weapon), or null when
   * innate/bare. */
  readonly instrument: Stuff | null;
  /** The venue (the anchor combatant's room), when resolvable. */
  readonly venue: Stuff | null;
  /** How the fight ended — non-null only at/after resolution seams. */
  readonly resolution: CombatResolution | null;

  /* ─────────────────────── consequence queue ─────────────────────── */

  private queue: CombatConsequence[] = [];
  private drained = false;

  constructor(init: CombatHookContextInit) {
    this.session = init.session;
    this.beat = init.beat;
    this.actor = init.actor ?? null;
    this.target = init.target ?? null;
    this.actorState = init.actorState ?? null;
    this.targetState = init.targetState ?? null;
    this.gambit = init.gambit ?? null;
    this.outcome = init.outcome ?? null;
    this.channel = init.channel ?? null;
    this.site = init.site ?? null;
    this.deflected = init.deflected ?? false;
    this.instrument = init.instrument ?? null;
    this.venue = init.venue ?? null;
    this.resolution = init.resolution ?? null;
  }

  /**
   * Queue a secondary {@link InflictSpec} (a rider — the flaming
   * blade's heat, the venom blade's edge). Drained through
   * `ConditionApi.inflict(recipient, spec)` after the primary, stamping
   * `lastStruckBy` when the recipient is the exchange target.
   */
  attachRider(spec: InflictSpec, on: ConsequenceRecipient = "defender"): void {
    this.assertOpen("attachRider");
    this.queue.push({ kind: "rider", spec, on: this.resolveOn("attachRider", on) });
  }

  /**
   * Queue an authored {@link ActiveCondition} (a fear aura's dread, a
   * curse). Drained through the recipient's own `afflict` door
   * (`MixinApi.isVitals` narrowing).
   */
  afflict(
    condition: ActiveCondition,
    on: ConsequenceRecipient = "defender",
  ): void {
    this.assertOpen("afflict");
    this.queue.push({
      kind: "afflict",
      condition,
      on: this.resolveOn("afflict", on),
    });
  }

  /**
   * Queue a bloodstream toxin dose (the hazard dart's
   * `Metabolic.introduceToxin`, funneled). Drained via
   * `MixinApi.isMetabolic` narrowing.
   */
  introduceToxin(
    type: string,
    amount: number,
    on: ConsequenceRecipient = "defender",
  ): void {
    this.assertOpen("introduceToxin");
    this.queue.push({
      kind: "toxin",
      type,
      amount,
      on: this.resolveOn("introduceToxin", on),
    });
  }

  /**
   * Queue a reserve drain/restore on a participant (lifesteal, smite,
   * adrenaline). Drained via the recipient's `Reserved` surface
   * (`MixinApi.isReserved` narrowing).
   */
  adjustReserve(
    key: string,
    delta: Quantity<Unit>,
    on: ConsequenceRecipient = "defender",
  ): void {
    this.assertOpen("adjustReserve");
    this.queue.push({
      kind: "reserve",
      key,
      delta,
      on: this.resolveOn("adjustReserve", on),
    });
  }

  /**
   * Queue wear on the recipient's resolved wielded instrument through
   * the `DurableMixin` condition gauge (the rust monster, durability
   * play; `MixinApi.isDurable` narrowing). No wielded instrument →
   * the consequence is inert.
   */
  wearInstrument(on: ConsequenceRecipient, amount: number): void {
    this.assertOpen("wearInstrument");
    this.queue.push({
      kind: "wear",
      amount,
      on: this.resolveOn("wearInstrument", on),
    });
  }

  /**
   * Queue a {@link CombatInfluence} instruction (stagger / expose /
   * steady — a concussive maul staggers on hit). Drained through the
   * same economy as `CombatApi.influence` — hooks and the external
   * bridge speak one vocabulary.
   */
  influence(
    instruction: CombatInfluence,
    on: ConsequenceRecipient = "defender",
  ): void {
    this.assertOpen("influence");
    this.queue.push({
      kind: "influence",
      instruction,
      on: this.resolveOn("influence", on),
    });
  }

  /**
   * Queue an electrical delivery from `source` to the exchange target
   * (the stun-baton seam). Drained through
   * `ElectricityApi.shockContact(source, target)` — the
   * `effectiveVoltage ≤ 0` guard inside the conduction walk still
   * applies, so a dead/switched-off source truthfully delivers nothing.
   */
  deliverShock(source: Stuff & Energized): void {
    this.assertOpen("deliverShock");
    this.queue.push({ kind: "shock", source });
  }

  /**
   * Queue a prose line (an item that whispers/taunts/flares —
   * expressive dynamics without a hook-frame `MessageApi` bypass).
   * Emitted through the existing narration witness loop **after** the
   * exchange's own beat, in queue order. Non-empty lines only.
   */
  attachFlavor(line: string): void {
    this.assertOpen("attachFlavor");
    if (typeof line !== "string" || line.trim().length === 0) {
      throw new Error(
        "CombatHookContext.attachFlavor: line must be a non-empty string",
      );
    }
    this.queue.push({ kind: "flavor", line });
  }

  /**
   * Drain the queue and **seal** the context — the engine calls this
   * exactly once after dispatching the hook(s); every subsequent
   * `attach*`/queue call throws (closing the stashed-context
   * determinism hole). Only the engine drains the context it built.
   *
   * @internal
   */
  _drain(): CombatConsequence[] {
    this.drained = true;
    return this.queue;
  }

  /* ───────────────────────── internals ───────────────────────── */

  private assertOpen(method: string): void {
    if (this.drained) {
      throw new Error(
        `CombatHookContext.${method}: context is sealed (already drained)`,
      );
    }
  }

  /**
   * Validate that the named recipient resolves against this context's
   * own actor/target pair (recipient-constrained, never arbitrary
   * targeting). Throws when the resolved recipient is null.
   */
  private resolveOn(
    method: string,
    on: ConsequenceRecipient,
  ): ConsequenceRecipient {
    const recipient = on === "attacker" ? this.actor : this.target;
    if (!recipient) {
      throw new Error(
        `CombatHookContext.${method}: this context has no ${on} to target`,
      );
    }
    return on;
  }
}
