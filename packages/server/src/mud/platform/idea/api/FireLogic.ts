// FireLogic — the hot-reloadable logic singleton behind FireApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { ApiLogic } from '../../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../../lib/security/decorators';
import { SecurityPolicies } from '../../../lib/security/SecurityPolicies';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Container } from '../../../lib/spatial/Container';
import type { Containable } from '../../../lib/spatial/Containable';
import type { Atmospheric } from '../../../lib/biome/Atmospheric';
import { MixinApi } from '../../../api/mixin';
import { StuffApi } from '../../../api/stuff';
import { BiomeApi } from '../../../api/biome';
import { ConnectionApi } from '../../../api/connection';
import { WorldClockApi } from '../../../api/worldclock';
import { AppApi } from '../../../api/app';
import { AppSettingKeys } from '../../../lib/config/AppSettings';
import { TemplatePaths } from '../../../lib/paths';
import type { Combustible } from '../../../lib/fire/Combustible';
import type { IgniteOutcome } from '../../../api/fire';

const FireApiCallers = SecurityPolicies.FromModule('/api/fire#FireApi');
/** The F1 object face: a Combustible host forwards its own combustion. */
const selfSubject = {
  // Compare by stuffId — the caller may surface as the raw target
  // while the argument is the proxy (or vice versa).
  where: (
    caller: unknown,
    _target: unknown,
    _method: string,
    args: readonly unknown[],
  ) =>
    (caller as { stuffId?: string }).stuffId !== undefined &&
    (caller as { stuffId?: string }).stuffId ===
      (args[0] as { stuffId?: string } | undefined)?.stuffId,
};
/**
 * The exhaust face's callers. ⚠ Deliberately NOT {@link FireCallers}: its
 * `where` clause asserts `args[0]` IS the caller, which is true of every
 * `advance(self)`-shaped forward and false here — the first argument is
 * the ROOM. A burner emitting into its scope is the legitimate caller and
 * the subject is somewhere else entirely.
 */
const FireExhaustCallers = SecurityPolicies.AnyOf(
  SecurityPolicies.FromModule('/api/fire#FireApi'),
  SecurityPolicies.FromMixin('BurnerMixin'),
  SecurityPolicies.FromMixin('CombustibleMixin'),
);

const FireCallers = SecurityPolicies.AnyOf(
  FireApiCallers,
  SecurityPolicies.FromMixin('BurnerMixin', selfSubject),
  SecurityPolicies.FromMixin('CombustibleMixin', {
    // Compare by stuffId — the caller may surface as the raw target
    // while the argument is the proxy (or vice versa).
    where: (caller, _target, _method, args) =>
      (caller as { stuffId?: string }).stuffId !== undefined &&
      (caller as { stuffId?: string }).stuffId ===
        (args[0] as { stuffId?: string } | undefined)?.stuffId,
  }),
);

/**
 * FireLogic — the hot-reloadable logic singleton behind {@link FireApi}.
 *
 * Lives at `/platform/idea/api/fire` (a stateless `Stuff` singleton, no backing
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
 * `dest /platform/idea/api/fire` reloads it.
 *
 * @internal
 */
@Unshadowable
export class FireLogic extends ApiLogic {
  /** See {@link Combustible.ignite}. */
  @CallSecurity(FireCallers)
  public ignite(stuff: Stuff): IgniteOutcome {
    return igniteImpl(stuff);
  }

  /**
   * Put one fire's exhaust for `kgBurnt` of fuel into a scope's medium —
   * the `Burner` face of {@link emitExhaustInto}. A burner's own tick
   * forwards here the way its `ignite`/`douse` do.
   */
  @CallSecurity(FireExhaustCallers)
  public emitExhaust(
    room: Stuff & Container,
    kgBurnt: number,
    complete: boolean,
  ): void {
    emitExhaustInto(room, kgBurnt, complete);
  }

  /** See {@link Combustible.tryAutoignite}. */
  @CallSecurity(FireCallers)
  public tryAutoignite(stuff: Stuff): boolean {
    return tryAutoigniteImpl(stuff);
  }

  /** See {@link Combustible.douse}. */
  @CallSecurity(FireCallers)
  public douse(stuff: Stuff): boolean {
    return douseImpl(stuff);
  }

  /** See {@link Combustible.advanceBurn}. */
  @CallSecurity(FireCallers)
  public advance(stuff: Stuff): void {
    advanceImpl(stuff);
  }

  /** See {@link FireApi.isBurning}. */
  @CallSecurity(FireApiCallers)
  public isBurning(stuff: Stuff): boolean {
    return MixinApi.isCombustible(stuff) && stuff.isBurning();
  }

  /** See {@link FireApi.onFireTick}. */
  @CallSecurity(FireApiCallers)
  public onFireTick(): void {
    onFireTickImpl();
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

/** One string dial read, falling back to the literal when unseeded. */
function dialStr(key: string, fallback: string): string {
  try {
    const raw = AppApi.setting(key);
    return raw == null || raw === '' ? fallback : raw;
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
  // A furnace appliance (forge / kiln / oven / campfire): lighting it is
  // toggling its lit state — it holds a fuel-driven pin, not a Burning object.
  if (MixinApi.isBurner(stuff)) {
    if (stuff.isLit()) return { lit: false, reason: 'already-burning' };
    if (stuff.fuelRemaining() <= 0) return { lit: false, reason: 'not-flammable' };
    stuff._setLit(true);
    return { lit: true };
  }
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
  // A lit furnace — put it out.
  if (MixinApi.isBurner(stuff)) {
    if (!stuff.isLit()) return false;
    stuff._setLit(false);
    if (MixinApi.isWet(stuff)) {
      stuff.wet(dial(AppSettingKeys.wetnessImmersionSaturation, 1));
    }
    return true;
  }
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

/**
 * The presence-gated fire tick — fan out over **occupied** scopes only (the
 * weather-boundary / storm-strike precedent), advancing each burning object
 * and spreading to neighbours. An unwatched fire freezes (zero server work in
 * empty rooms, no offline-arson grief surface). Dedupes scopes by room id.
 */
function onFireTickImpl(): void {
  const visited = new Set<string>();
  for (const interactive of ConnectionApi.getAllInteractives()) {
    const holder = interactive.getHolder();
    if (holder === null || !MixinApi.isContainable(holder)) continue;
    const room = (holder as Stuff & Containable).getContainer();
    if (room === null || !MixinApi.isContainer(room)) continue;
    if (visited.has(room.stuffId)) continue;
    visited.add(room.stuffId);
    advanceFireInRoom(room);
  }
}

/**
 * Advance every fire in one occupied scope: drain each burning object (which
 * chars / destructs at fuel exhaustion), then spread — radiate heat into
 * co-located combustibles and, through **open** boundaries only (a closed /
 * locked door is a firebreak), into the adjacent scope's combustibles. A
 * neighbour catches iff the delivered heat crossed its (wetness-adjusted)
 * ignition point — so a wet log resists, emergent from the energy balance.
 */
function advanceFireInRoom(room: Stuff & Container): void {
  // Lit furnaces heat the Meltables in the scope toward their held temperature
  // (the forge melting an ingot) — independent of any Burning objects.
  for (const occ of room.getContents()) {
    const s = occ as unknown as Stuff;
    if (!s.isDestroyed() && MixinApi.isBurner(s) && s.isLit()) {
      s.heatContents();
    }
  }

  const combustibles = liveCombustiblesIn(room);
  // Advance the fires first (fuel drain → char / destruct at exhaustion).
  for (const c of combustibles) {
    if (c.isBurning()) advanceImpl(c as unknown as Stuff);
  }
  const burning = liveCombustiblesIn(room).filter((c) => c.isBurning());

  // ── Combustion chemistry: the oxygen leg + complete/incomplete verdict ──
  //
  // ⭐⭐ The air is DERIVED. There is no `'air'` Reserve and no authored
  // oxygen budget: the scope's medium carries what the fires have put into
  // it, decaying at the rate the scope's own openings imply, and the air
  // share is what is left. A room that authors nothing at all starves a
  // fire correctly if it is shut, and never does if it is not — which is
  // why four of the seven rows that authored a budget could be inert for
  // a year without anyone noticing.
  const airShare = BiomeApi.airShareOf(
    BiomeApi.resolveAtmosphereContentsFor(room),
  );

  if (burning.length === 0) {
    // No fire: nothing to emit. The scope's own decay clears what is in it.
    return;
  }

  // The oxygen leg: too little air left → the fire smothers.
  if (airShare <= dial(AppSettingKeys.fireAirSmotherAirShare, 0.88)) {
    for (const b of burning) (b as unknown as Combustible)._extinguishState();
    return;
  }

  // Complete (hot, clean) with enough air; incomplete (cooler, soot + CO)
  // once a shut scope has filled with its own exhaust.
  const complete =
    airShare >= dial(AppSettingKeys.fireAirCompleteAirShare, 0.93);
  for (const b of burning) (b as unknown as Combustible)._setComplete(complete);

  // ⭐ Exhaust: every fire puts carbon dioxide into the scope for the fuel
  // it burnt (conservation — the air really does go), and an incomplete
  // one adds soot on top. A sky-exposed scope accepts neither, because
  // that is where it goes. Nothing writes the atmosphere TAG any more:
  // smoke is a thing in the air, not a different air.
  for (const b of burning) emitCombustibleExhaust(b, room, complete);

  // ── Spread — radiate to co-located + open-boundary combustibles ──
  const radiant = dial(AppSettingKeys.fireRadiantJoulesPerTick, 700000);
  const crossFraction = dial(AppSettingKeys.fireCrossBoundaryFraction, 0.4);
  for (const c of liveCombustiblesIn(room)) {
    if (c.isBurning()) continue;
    const cs = c as unknown as Stuff;
    if (MixinApi.isThermal(cs)) cs.depositHeat(radiant);
    tryAutoigniteImpl(cs);
  }
  for (const dest of openNeighboursOf(room)) {
    for (const c of liveCombustiblesIn(dest)) {
      if (c.isBurning()) continue;
      const cs = c as unknown as Stuff;
      if (MixinApi.isThermal(cs)) cs.depositHeat(radiant * crossFraction);
      tryAutoigniteImpl(cs);
    }
  }
}

/**
 * ⭐⭐ **What a fire puts into the air** — the third product of
 * combustion, which until this build was a string.
 *
 * Carbon dioxide always, for the mass burnt; soot additionally while
 * combustion is incomplete. The emission goes into the scope's medium as
 * litres of a MATERIAL, so the same mechanism serves a hearth, a retort
 * driving tar off a charge, and a ferment breathing in a cellar — and a
 * pack adds a new exhaust by adding a material row.
 *
 * ⚠ A Combustible's fuel is still its own `%` Reserve this build (the
 * object IS the fuel: a burning door, a bale), so the kg burnt is read as
 * a fraction of its mass. {@link burnPowerFor} is where the mass-and-
 * heat-of-combustion swap lands — see `fire-combustion-slate`.
 */
function emitCombustibleExhaust(
  burning: Stuff & Combustible,
  room: Stuff & Container,
  complete: boolean,
): void {
  const s = burning as unknown as Stuff;
  if (!MixinApi.isTangible(s)) return;
  const massKg = s.getMass().rawValue();
  if (!(massKg > 0)) return;
  const tickS = dial(AppSettingKeys.fireTickIntervalSeconds, 30);
  const ratePerMin = dial(AppSettingKeys.fireBurnRatePerMin, 0.5) / 100;
  const kgBurnt = ratePerMin * massKg * (tickS / 60);
  emitExhaustInto(room, kgBurnt, complete);
}

/**
 * Put one fire's exhaust for `kgBurnt` of fuel into `room`'s medium.
 * Shared by the Combustible arm above and a `Burner`'s own tick.
 */
function emitExhaustInto(
  room: Stuff & Container,
  kgBurnt: number,
  complete: boolean,
): void {
  if (!(kgBurnt > 0)) return;
  if (!MixinApi.isAtmospheric(room)) return;
  const atm = room as unknown as Stuff & Container & Atmospheric;
  const co2 = dialStr(
    AppSettingKeys.fireExhaustCarbonDioxideMaterial,
    '/stuff/idea/material/gas/carbon-dioxide',
  );
  atm.addAtmosphereContent(
    co2,
    dial(AppSettingKeys.fireExhaustLitresPerKg, 950) * kgBurnt,
  );
  if (complete) return;
  const smoke = dialStr(
    AppSettingKeys.fireExhaustSmokeMaterial,
    '/stuff/idea/material/gas/smoke',
  );
  atm.addAtmosphereContent(
    smoke,
    dial(AppSettingKeys.fireExhaustSmokeLitresPerKg, 300) * kgBurnt,
  );
}

/** The live (non-destroyed) Combustibles directly in `room`. */
function liveCombustiblesIn(room: Stuff & Container): (Stuff & Combustible)[] {
  const out: (Stuff & Combustible)[] = [];
  for (const occ of room.getContents()) {
    const s = occ as unknown as Stuff;
    if (s.isDestroyed()) continue;
    if (MixinApi.isCombustible(s)) out.push(s);
  }
  return out;
}

/**
 * The adjacent scopes fire can reach — the destinations of `room`'s exits that
 * are passable to fire: not permanently blocked, and either doorless or with
 * an OPEN door (a closed or locked door is a firebreak — the `Sealable` read).
 * Skips an exit whose destination hasn't materialized (fire doesn't reach an
 * unbuilt room).
 */
function openNeighboursOf(room: Stuff & Container): (Stuff & Container)[] {
  if (!MixinApi.isExitable(room)) return [];
  const out: (Stuff & Container)[] = [];
  for (const exit of room.getExits().values()) {
    if (exit.isBlocked()) continue;
    const door = exit.getDoor();
    if (door !== null && MixinApi.isSealable(door) && !door.isOpen()) {
      continue; // firebreak
    }
    let dest: Stuff & Container | null = null;
    try {
      dest = exit.getDestination();
    } catch {
      dest = null; // unresolved deferred destination — fire doesn't reach it
    }
    if (dest !== null && MixinApi.isContainer(dest) && !dest.isDestroyed()) {
      out.push(dest);
    }
  }
  return out;
}
