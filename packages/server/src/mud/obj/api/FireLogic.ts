// FireLogic — the hot-reloadable logic singleton behind FireApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { ApiLogic } from '../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import type { Stuff } from '../../lib/stuff/Stuff';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { WorldClockApi } from '../../api/worldclock';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../../lib/config/AppSettings';
import { TemplatePaths } from '../../lib/paths';
import type { Combustible } from '../../lib/fire/Combustible';
import type { IgniteOutcome } from '../../api/fire';

const FireApiCallers = SecurityPolicies.FromModule('/api/fire#FireApi');

/**
 * FireLogic — the hot-reloadable logic singleton behind {@link FireApi}.
 *
 * Lives at `/obj/api/fire` (a stateless `Stuff` singleton, no backing
 * `Template`); `FireApi`'s public statics forward here via
 * `StuffApi.singletonSync`. The **single external writer** of a
 * `Combustible`'s Burning state — deliberate ignition (`ignite`), the
 * heat-threshold autoignition the spread check drives (`tryAutoignite`), the
 * three extinguishers (`douse` / smother / fuel-starvation via `advance`), and
 * the per-object `advance` the presence-gated fire tick fans out. Holds NO
 * state and NO tick handles (the tick lives on `WorldClockRegistry`; a lone
 * `Burning` reconciles-on-read on its own host). Internal sub-logic lives in
 * module-private free functions, so there are no intra-singleton `this.x()`
 * calls to trip the gate; each public method carries the `FromModule` gate.
 * `dest /obj/api/fire` reloads it.
 *
 * @internal
 */
@Unshadowable
export class FireLogic extends ApiLogic {
  /** See {@link FireApi.ignite}. */
  @CallSecurity(FireApiCallers)
  public ignite(stuff: Stuff): IgniteOutcome {
    return igniteImpl(stuff);
  }

  /** See {@link FireApi.tryAutoignite}. */
  @CallSecurity(FireApiCallers)
  public tryAutoignite(stuff: Stuff): boolean {
    return tryAutoigniteImpl(stuff);
  }

  /** See {@link FireApi.douse}. */
  @CallSecurity(FireApiCallers)
  public douse(stuff: Stuff): boolean {
    return douseImpl(stuff);
  }

  /** See {@link FireApi.advance}. */
  @CallSecurity(FireApiCallers)
  public advance(stuff: Stuff): void {
    advanceImpl(stuff);
  }

  /** See {@link FireApi.isBurning}. */
  @CallSecurity(FireApiCallers)
  public isBurning(stuff: Stuff): boolean {
    return MixinApi.isCombustible(stuff) && stuff.isBurning();
  }
}

// ---------- combustion internals (module-private free functions) ----------
//
// The fire-triangle logic. The SHAPE (fuel / oxygen / heat legs, the
// energy-balance ignition) is code; every MAGNITUDE is an AppSetting read with
// a seeded-literal fallback. Off-class so there are no intra-singleton
// `this.x()` self-calls to trip the gate.

/** Numeric AppSetting read, falling back to the seeded literal. */
function dial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw === '' || raw == null) return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

/** In-session game-time (seconds), or 0 when no world clock runs. */
function fireNowSeconds(): number {
  if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) {
    return 0;
  }
  return WorldClockApi.getNow().rawValue();
}

/**
 * Deliberate ignition (the `ignite` verb): a hand-flame lights a flammable,
 * dry-enough object. Rejects a non-flammable object, one already aflame, a
 * spent one, or one too wet for a sustained hand-flame to dry (the water
 * penalty exceeds the manual-drying headroom). The oxygen leg is a Phase-5
 * addition; a Phase-3 fire assumes air.
 */
function igniteImpl(stuff: Stuff): IgniteOutcome {
  if (!MixinApi.isCombustible(stuff)) {
    return { lit: false, reason: 'not-flammable' };
  }
  if (stuff.isBurning()) return { lit: false, reason: 'already-burning' };
  const base = stuff.getAutoignitionTemperatureK();
  if (base <= 0 || stuff.getFuelRemaining() <= 0) {
    return { lit: false, reason: 'not-flammable' };
  }
  const wetPenalty = stuff.getEffectiveAutoignitionK() - base;
  if (wetPenalty > dial(AppSettingKeys.fireIgnitionMaxManualDryingK, 150)) {
    return { lit: false, reason: 'too-wet' };
  }
  igniteNow(stuff);
  return { lit: true };
}

/**
 * The heat-threshold autoignition the spread check + the acceptance battery
 * drive: an object whose temperature has crossed its (wetness-adjusted)
 * autoignition point catches, no hand-flame needed. The derivable energy
 * balance — the caller delivered the heat (a fire's radiant deposit, the sun),
 * this only decides whether the threshold was reached. Returns whether it lit.
 */
function tryAutoigniteImpl(stuff: Stuff): boolean {
  if (!MixinApi.isCombustible(stuff)) return false;
  if (stuff.isBurning()) return false;
  if (stuff.getFuelRemaining() <= 0) return false;
  const eff = stuff.getEffectiveAutoignitionK();
  if (eff <= 0) return false; // non-flammable material
  if (stuff.getTemperature().rawValue() < eff) return false;
  igniteNow(stuff);
  return true;
}

/** Set the Burning state (born complete — Phase 5 flips it by air supply). */
function igniteNow(stuff: Stuff & Combustible): void {
  stuff._igniteState(fireNowSeconds(), true);
}

/**
 * Douse — the water/wet extinguisher. Puts the fire out and wets the object
 * (raising its effective ignition threshold so it resists re-ignition — the
 * real reason a doused log won't relight until dried). No-op on a non-burning
 * or non-combustible target.
 */
function douseImpl(stuff: Stuff): boolean {
  if (!MixinApi.isCombustible(stuff) || !stuff.isBurning()) return false;
  stuff._extinguishState();
  if (MixinApi.isWet(stuff)) {
    stuff.wet(dial(AppSettingKeys.wetnessImmersionSaturation, 1));
  }
  return true;
}

/**
 * Advance one burning object one tick: reconcile the fuel drain (which
 * self-extinguishes + chars / latches burn-through at fuel exhaustion), then
 * destruct a structural object that has burned through. Phase 4 layers the
 * neighbour heat deposits + spread on top; Phase 5 the oxygen leg + smoke.
 */
function advanceImpl(stuff: Stuff): void {
  if (!MixinApi.isCombustible(stuff)) return;
  stuff.reconcileBurning();
  if (stuff.hasBurnedThrough()) {
    StuffApi.destruct(stuff);
  }
}
