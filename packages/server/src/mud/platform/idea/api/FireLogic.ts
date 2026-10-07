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
import { ConditionApi } from '../../../api/condition';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';
import type Material from '../../../lib/material/Material';
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

  /**
   * ⭐ Is this too wet to catch — the ONE wetness formula, in one place.
   *
   * ⚠ Two waters, one arithmetic: the surface wetness of a log left in
   * the rain and the matter's OWN water (a turf cut out of a bog is
   * nearly all water) raise the ignition threshold in exactly the same
   * way, so they add. That is what makes `stoke`'s *"It is too sodden to
   * catch."* and `ignite`'s shipped refusal the same sentence about the
   * same number, with no peat-specific branch anywhere.
   */
  @CallSecurity(FireExhaustCallers)
  public tooWetToCatch(item: Stuff): boolean {
    return (
      wetPenaltyKOf(item) >
      dial(AppSettingKeys.fireIgnitionMaxManualDryingK, 150)
    );
  }

  /** The held-water ignition penalty (K) — see {@link wetPenaltyKOf}. */
  @CallSecurity(FireExhaustCallers)
  public wetPenaltyK(item: Stuff): number {
    return wetPenaltyKOf(item);
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

/**
 * The extra temperature (K) an object's held water raises its ignition
 * threshold by — mass-independent, because the fuel mass cancels between
 * the water-boil energy and the thermal capacity. A soaked log resists
 * ignition regardless of its size.
 *
 * ⭐ The single home for the formula. `CombustibleMixin.wetPenaltyK`
 * forwards here, and `stoke` asks the same question of an object that
 * may not be a Combustible at all.
 */
function wetPenaltyKOf(item: Stuff): number {
  const mat = MixinApi.isTangible(item) ? item.getMaterial() : null;
  if (!mat) return 0;
  const capacityFraction = mat.getWaterAbsorptionCapacity().rawValue() / 100;
  if (capacityFraction <= 0) return 0;
  const c = mat.getSpecificHeat().rawValue();
  if (c <= 0) return 0;

  let held = 0;
  if (MixinApi.isWet(item)) {
    const saturation = item.getWetness();
    if (saturation > 0) held += saturation;
  }
  if (MixinApi.isWaterActive(item)) {
    // Above the `dried` band the fuel still carries its own water; at or
    // below it, it is dry fuel and contributes nothing.
    const driedAt = dial(AppSettingKeys.cureBandDriedAt, 0.5);
    const span = 1 - driedAt;
    if (span > 0) {
      const own = (item.getMoisture() - driedAt) / span;
      if (own > 0) held += own > 1 ? 1 : own;
    }
  }
  if (held <= 0) return 0;
  const lVap = dial(AppSettingKeys.fireIgnitionWaterLatentHeatJPerKg, 2260000);
  return (held * capacityFraction * lVap) / c;
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
  // ⭐⭐⭐ **Striking a light is how you find out.** The tick's flash check
  // runs where a fire already burns; this is the other half, and it is
  // the one that actually kills people — a miner walks into a gassy
  // heading with a cold lamp, lights it, and the heading goes off.
  //
  // ⚠ It runs BEFORE the lit state changes, so the flash is caused by
  // the striking rather than by a fire that was already there. The
  // refusal is not a refusal: the act happens, and then the room does.
  // ⚠ `stuff` is passed as the flame: it is not lit YET, so the walk
  // would find nothing and striking a light in a gassy heading would be
  // safe — which is the opposite of true and the opposite of the lesson.
  const scope = igniteScopeOf(stuff);
  if (scope !== null) flammableMediumCheck(scope, stuff);
  // A furnace appliance (forge / kiln / oven / campfire): lighting it is
  // toggling its lit state — it holds a fuel-driven pin, not a Burning object.
  if (MixinApi.isBurner(stuff)) {
    if (stuff.isLit()) return { lit: false, reason: 'already-burning' };
    // ⭐ `no-fuel`, not `not-flammable`. A forge with an empty bed is not
    // an unburnable object — it is a fire waiting for somebody to stoke
    // it, and the refusal has to say which so the verb can tell them.
    // ⭐⭐ THE REFUSAL IS THE PROGRESSION UI: if something lifts it, the
    // player has to be able to be told what.
    if (stuff.fuelRemaining() <= 0) return { lit: false, reason: 'no-fuel' };
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
  //
  // ⭐⭐ …and they BREATHE. Until the fire build a `Burner` was outside
  // the chemistry entirely: only `Combustible`s got a completeness
  // verdict and only they put anything into the air, so the one fire a
  // player actually lights — a hearth, a forge, a lamp — could run in a
  // sealed cellar forever and poison nobody. A burner's exhaust is what
  // the oxygen leg reads on the next tick, which is what closes the
  // loop: the fire fills the room, the room starves the fire.
  const tickS = dial(AppSettingKeys.fireTickIntervalSeconds, 30);
  for (const occ of room.getContents()) {
    const s = occ as unknown as Stuff;
    if (s.isDestroyed() || !MixinApi.isBurner(s)) continue;
    if (!s.isLit()) continue;
    s.heatContents();
    s.exhaustTick(tickS);
  }

  // ⭐ A burner smothers on the same share, and it is checked BEFORE the
  // `burning.length === 0` early return below — a lamp in a sealed box is
  // the only fire in the room, and a room with no `Combustible` in it was
  // returning before anything looked at it.
  smotherStarvedBurners(room);

  // ⭐⭐⭐ …and so does the FLASH, for the same reason: the dangerous room
  // is the one with gas in the air and ONE naked flame carried into it,
  // and there is nothing burning in it at all until the moment there is.
  flammableMediumCheck(room);

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
  if (airShare <= dial(AppSettingKeys.fireAirSmotherAirShare, 0.7)) {
    for (const b of burning) (b as unknown as Combustible)._extinguishState();
    return;
  }

  // Complete (hot, clean) with enough air; incomplete (cooler, soot + CO)
  // once a shut scope has filled with its own exhaust.
  const complete =
    airShare >= dial(AppSettingKeys.fireAirCompleteAirShare, 0.85);
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

/**
 * The scope an ignition happens in — the first `Atmospheric` ancestor
 * with a volume, which is the same walk a fire's exhaust takes.
 */
function igniteScopeOf(stuff: Stuff): (Stuff & Container) | null {
  let at: Stuff | null = stuff;
  let depth = 32;
  while (at !== null && depth-- > 0) {
    if (
      MixinApi.isAtmospheric(at) &&
      MixinApi.isContainer(at) &&
      (at as unknown as Atmospheric).getVolume() !== null
    ) {
      return at as unknown as Stuff & Container;
    }
    at = MixinApi.isContainable(at) ? at.getContainer() : null;
  }
  return null;
}

/**
 * ⭐⭐⭐ **The air itself is fuel** — and the moment a naked flame meets
 * it, the room goes off.
 *
 * This is the whole of firedamp, and every term in it is already true of
 * something else: a content whose MATERIAL has a heat of combustion is
 * flammable (the same number that gives a fuel its flame temperature), a
 * fraction above `ignitesAt` is an explosive mixture, and a naked flame
 * is a lit `Burner` that is not gauzed or a `Combustible` that is
 * burning. ⚠ No `hazard:` field, no authored trap, no room marked
 * dangerous: the danger is that the stuff in the air will burn.
 *
 * ⭐ And the remedy is therefore an OBJECT rather than a rule. A safety
 * lamp's flame is enclosed, so it is not a naked flame, so the check
 * does not find one — which means a player with a gauze lamp can work
 * ground a player with a torch cannot, and nothing anywhere is told to
 * make that true.
 *
 * ⚠ The flame walk goes **one level deep through a person**: a torch in
 * somebody's hand is in the room for this purpose, which is the
 * `VisionModality` leg (b′) applied to heat. A flame nobody is carrying
 * is still a flame.
 */
function flammableMediumCheck(
  room: Stuff & Container,
  strikingNow: Stuff | null = null,
): void {
  const contents = BiomeApi.resolveAtmosphereContentsFor(room);
  if (contents.length === 0) return;
  const ignitesAt = dial(AppSettingKeys.fireFlammableIgnitesAt, 0.05);
  let worst: { type: string; amount: number } | null = null;
  for (const c of contents) {
    if (c.amount < ignitesAt) continue;
    const material = StuffApi.findByTemplatePath<Material>(c.type);
    if (!material) continue;
    if (!(material.getHeatOfCombustion().rawValue() > 0)) continue;
    if (worst === null || c.amount > worst.amount) worst = c;
  }
  if (worst === null) return;
  const striking =
    strikingNow !== null &&
    MixinApi.isBurner(strikingNow) &&
    !strikingNow.isFlameEnclosed();
  if (!striking && nakedFlameIn(room) === null) return;

  // The flash. ⭐ It burns what is there and leaves the air clear, which
  // is why a heading that has gone off once is safe for a while and then
  // is not — the measures are still giving it off.
  const atm = room as unknown as Atmospheric;
  const volume = atm.getVolume?.() ?? null;
  const litres = volume === null ? 0 : worst.amount * volume.rawValue() * 1000;
  atm.drawAtmosphereContent(worst.type, litres > 0 ? litres : Infinity);

  const energy =
    dial(AppSettingKeys.fireFlammableFlashEnergy, 90000) *
    (worst.amount / ignitesAt);
  for (const occ of room.getContents()) {
    const s = occ as unknown as Stuff;
    if (s.isDestroyed()) continue;
    if (MixinApi.isVitals(s)) {
      // ⭐ The one heat channel, so armour inversion applies for free: a
      // mail shirt is no help against a flash and a wet coat is.
      void ConditionApi.inflict(s, {
        mechanism: 'heat',
        energy,
        site: 'torso',
      });
    }
    if (MixinApi.isThermal(s)) s.depositHeat(energy);
    tryAutoigniteImpl(s);
  }
  for (const occ of room.getContents()) {
    const s = occ as unknown as Stuff;
    if (!s.isDestroyed() && MixinApi.isSensor(s)) {
      MessageApi.scene(s)
        // ⚠ `sense.surroundings`, not `sense.sight`: the topic roots are
        // a CLOSED seven and their leaves are seeded rows, so a topic
        // nobody seeded is a message nobody can mute —
        // `lint:topics` catches it, which is how this one was found.
        .topic('sense.surroundings')
        .toSelf(
          Mml.compose`The air itself catches. A sheet of pale flame goes over you with a sound like a door slamming, and then it is dark again.`,
        )
        .send();
      break;
    }
  }
}

/**
 * A naked flame in `room`, or `null` — ⚠ walking **one level deep
 * through a person**, because a torch in somebody's hand is in the room
 * for this purpose.
 */
function nakedFlameIn(room: Stuff & Container): Stuff | null {
  const check = (s: Stuff): Stuff | null => {
    if (s.isDestroyed()) return null;
    if (MixinApi.isBurner(s) && s.isLit() && !s.isFlameEnclosed()) return s;
    if (MixinApi.isCombustible(s) && s.isBurning()) return s;
    return null;
  };
  for (const occ of room.getContents()) {
    const s = occ as unknown as Stuff;
    const hit = check(s);
    if (hit !== null) return hit;
    // One level deep, and no further: a lamp in a bag in a cart is not
    // an open flame in the room.
    if (!MixinApi.isContainer(s)) continue;
    for (const held of s.getContents()) {
      const inner = check(held as unknown as Stuff);
      if (inner !== null) return inner;
    }
  }
  return null;
}

/**
 * Put out every lit burner in `room` whose air has run out.
 *
 * ⚠ Separate from the `Combustible` arm because the two have different
 * *writers*: a `Combustible`'s burning state is `_extinguishState`, a
 * burner's lit state is `_setLit`, and only `FireApi` may call the
 * latter. Same threshold, same reason, two mechanisms — which is the
 * shipped split between *an object that is on fire* and *an appliance
 * that holds one*.
 */
function smotherStarvedBurners(room: Stuff & Container): void {
  const share = BiomeApi.airShareOf(
    BiomeApi.resolveAtmosphereContentsFor(room),
  );
  if (share > dial(AppSettingKeys.fireAirSmotherAirShare, 0.7)) return;
  for (const occ of room.getContents()) {
    const s = occ as unknown as Stuff;
    if (s.isDestroyed() || !MixinApi.isBurner(s)) continue;
    if (!s.isLit()) continue;
    s._setLit(false);
  }
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
