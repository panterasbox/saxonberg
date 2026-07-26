/**
 * CombatReactiveMixin — the **instrument dynamics seam**: the one marker
 * mixin the combat engine scans for, whose hooks fire at fixed points of
 * the beat lifecycle (the hazard-precedent marker shape).
 *
 * A dynamic weapon, reactive armor, or a dynamic-innate creature
 * composes this and overrides the hook(s) it cares about; every default
 * body is a no-op terminal (the `onDestruct` shape) so overriders
 * compose via `super`. The engine's only narrowing is
 * `MixinApi.isCombatReactive(item)` at the declared scan points — no
 * duck-typed method-presence checks, no per-dynamic `MixinApi.isX`
 * branches (the barnacle this seam exists to kill).
 *
 * Carrier rule: the augment carrier for a strike is the wielded weapon
 * when armed, else (innate/bare path) the attacker itself when it is
 * CombatReactive — exactly one, never both. A venomous bite and a
 * poison blade are the same abstraction with a different carrier.
 *
 * **Determinism contract** (binds every hook body, override or shadow):
 * synchronous, deterministic, cheap — no `await`, no wall-clock, no
 * randomness, bounded work per beat. Consequences on others go through
 * the {@link CombatHookContext} queue — never call gated Apis from a
 * hook frame; **self-state mutation is sanctioned** (combo counters,
 * charge gauges, the host's own wear).
 *
 * Hooks are **deliberately shadowable** — none may ever carry `@Final`
 * or `@Unshadowable`: the proxy's shadow chain over a hook *is* the
 * temporary-enchantment substrate (attach a shadow, the dynamic lives;
 * detach, baseline returns byte-identically).
 *
 * See docs/subsystems/combat.md (the hook grammar).
 */

import type { MixinConstructor } from "../mixin";
import type { Stuff } from "../stuff/Stuff";
import type { Slotted } from "../slot/Slotted";
import type { InflictSpec } from "../../api/condition";
import type { CombatHookContext } from "./CombatHookContext";

/** Public hook surface added by CombatReactiveMixin. */
export interface CombatReactive {
  onWielded(host: Stuff & Slotted, slotName: string): void;
  onUnwielded(host: Stuff & Slotted, slotName: string): void;
  augmentInflict(spec: InflictSpec, ctx: CombatHookContext): InflictSpec;
  onStrikeResolved(ctx: CombatHookContext): void;
  onStruck(ctx: CombatHookContext): void;
  onParry(ctx: CombatHookContext): void;
  onBypassed(ctx: CombatHookContext): void;
}

export function CombatReactiveMixin<TBase extends MixinConstructor>(
  Base: TBase,
) {
  return class CombatReactiveMixin extends Base implements CombatReactive {
    static _mixinName = "CombatReactiveMixin";

    /**
     * The item was armed — its slot claim landed. Fires **per slot**
     * (a two-handed claim hears it once per claimed slot — symmetric
     * with the release side), and fires outside any session (plain
     * args, no context — the `onSlotReleased` shape). Persistence
     * restore re-wears gear through the same chokepoint, so a fresh
     * clone being armed fires it too: bodies must be cheap and
     * idempotent.
     *
     * Determinism contract: synchronous, deterministic, cheap — no
     * `await`, no wall-clock, no randomness.
     *
     * @hook Invoked by `Slotted.occupy` (the arming chokepoint — all
     * three paths: `SlotApi.occupyAll`, combat's grip swap, restore),
     * after the successful slot add. Override to react to being armed;
     * compose via `super.onWielded(host, slotName)`. No-op terminal.
     */
    onWielded(_host: Stuff & Slotted, _slotName: string): void {
      // no-op terminal — overriders compose via super
    }

    /**
     * The item was disarmed — its slot claim released. Fires **per
     * slot**, after the generic `onSlotReleased` witness (generic
     * witness first, combat witness second), including through
     * `cleanupOnDestruct`.
     *
     * Determinism contract: synchronous, deterministic, cheap — no
     * `await`, no wall-clock, no randomness.
     *
     * @hook Invoked by `Slotted.vacate`/`vacateSole` (the release
     * chokepoint), after the existing `onSlotReleased` dispatch.
     * Override to react to being disarmed; compose via
     * `super.onUnwielded(host, slotName)`. No-op terminal.
     */
    onUnwielded(_host: Stuff & Slotted, _slotName: string): void {
      // no-op terminal — overriders compose via super
    }

    /**
     * Reshape (or pass through) the strike's {@link InflictSpec} before
     * it lands. The **compute** hook: return the spec — possibly
     * reshaped (any non-`shock` `InsultKind`: a flaming blade may
     * re-channel its primary to `heat`) — and queue riders /
     * side-consequences through `ctx` (never call gated Apis from this
     * frame). The identity default returns its input untouched;
     * overriders compose via
     * `return super.augmentInflict(reshaped, ctx)`.
     *
     * Determinism contract: synchronous, deterministic, cheap — no
     * `await`, no wall-clock, no randomness, bounded work per beat.
     *
     * **Shadowable by design** — a temporary effect (enchantment, oil,
     * blessing) attaches a shadow over this method; detach ends the
     * effect. A shadow wanting the base behavior continues via
     * `Shadow.callDown`.
     *
     * @hook Invoked by the combat engine at `commitInflict`, on the
     * strike's augment carrier (the wielded weapon, else the bare
     * CombatReactive attacker), before `ConditionApi.inflict`. A
     * malformed return falls back to the pre-augment spec.
     */
    augmentInflict(spec: InflictSpec, _ctx: CombatHookContext): InflictSpec {
      return spec;
    }

    /**
     * The carrier's own exchange resolved — a weapon hears its own
     * land/whiff/parried (`ctx.outcome` set; combo/momentum dynamics).
     * Fired once per exchange, riposte included in its parent's
     * dispatch.
     *
     * Determinism contract: synchronous, deterministic, cheap — no
     * `await`, no wall-clock, no randomness, bounded work per beat.
     *
     * @hook Invoked by the combat engine (`witnessExchange`) on the
     * actor's augment carrier after the exchange fully resolves,
     * following the participants' `onExchangeResolved`. Override to
     * react; compose via `super.onStrikeResolved(ctx)`. No-op terminal.
     */
    onStrikeResolved(_ctx: CombatHookContext): void {
      // no-op terminal — overriders compose via super
    }

    /**
     * This item, in the struck site's covering stack (worn armor /
     * facing shield), took an exchange's consequence — whether the blow
     * landed through or was fully attenuated (`ctx.deflected` says
     * which; "the shield took the blow" is the point).
     *
     * Determinism contract: synchronous, deterministic, cheap — no
     * `await`, no wall-clock, no randomness, bounded work per beat.
     *
     * @hook Invoked by the combat engine at `commitInflict`, on each
     * CombatReactive item in the covering stack at the struck site,
     * outside-in, after the primary inflict + drain. Override to react
     * (thorn mail queues an `on: 'attacker'` rider); compose via
     * `super.onStruck(ctx)`. No-op terminal.
     */
    onStruck(_ctx: CombatHookContext): void {
      // no-op terminal — overriders compose via super
    }

    /**
     * This item, as the guarding instrument, turned an attacker's blow
     * (the `parried` outcome).
     *
     * Determinism contract: synchronous, deterministic, cheap — no
     * `await`, no wall-clock, no randomness, bounded work per beat.
     *
     * @hook Invoked by the combat engine in `resolveExchange`,
     * immediately after `decideOutcome` returns `parried`, on the
     * defender's guarding instrument (resolved weapon, else the wielded
     * shield). Override to react; compose via `super.onParry(ctx)`.
     * No-op terminal.
     */
    onParry(_ctx: CombatHookContext): void {
      // no-op terminal — overriders compose via super
    }

    /**
     * This item, as the defender's instrument, could not guard — an
     * offensive outcome landed past a steady but guardless defender
     * (the flail that couldn't parry). `control-resisted` is not a
     * parry (nothing turned a blow) — excluded.
     *
     * Determinism contract: synchronous, deterministic, cheap — no
     * `await`, no wall-clock, no randomness, bounded work per beat.
     *
     * @hook Invoked by the combat engine in `resolveExchange`, after
     * `decideOutcome` returns `land`/`exploit` against a steady,
     * guardless defender, on the defender's resolved instrument.
     * Override to react; compose via `super.onBypassed(ctx)`. No-op
     * terminal.
     */
    onBypassed(_ctx: CombatHookContext): void {
      // no-op terminal — overriders compose via super
    }
  };
}
