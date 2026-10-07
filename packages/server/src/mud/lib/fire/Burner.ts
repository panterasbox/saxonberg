/**
 * BurnerMixin — a **sustained heat source**: an appliance that holds a
 * real, fuel-and-air-driven temperature while lit, then releases to
 * passive cooling embers on burnout.
 *
 * ⭐⭐⭐ **A fire is its fuel, its air and its vessel.** Heat, light and
 * exhaust are consequences of those three, and this file is where that
 * stops being a docstring. The header above has claimed *"a real,
 * fuel-and-air-driven temperature"* since it was written, and until the
 * fire build nothing in the file read either: `getHeldTemperatureK()`
 * was `burnTemperatureK × bellows` — one authored number and a boolean
 * — and the fuel was a `%` Reserve that nothing could refill, so no
 * fire in the game could run twice.
 *
 * Now:
 *
 *  - **The vessel sets the ceiling** (`burnTemperatureK`, authored, and
 *    the bellows multiplies it). A forge can get to smelting heat; a
 *    bread oven cannot, whatever you put in it.
 *  - **The fuel decides whether you reach it.** A fuel's flame
 *    temperature derives from its `heatOfCombustion` — oak ~1340 K,
 *    peat ~1275, coal ~2120, charcoal ~2250 — so the smelter's own
 *    sentence *"this fuel does not burn hot enough"* is arithmetic
 *    rather than a dial. ⭐ `heatOfCombustion` is authored on 26
 *    material rows and was read by **nothing** before this.
 *  - **Air decides how clean**, and the draught is the air control. One
 *    continuous `completeness()` drives the held temperature, the light
 *    and the exhaust together, which is why opening the vents makes a
 *    fire hotter, cleaner and *dimmer* — luminosity is incandescent
 *    soot.
 *
 * **Composed OUTSIDE `ThermalMixin`**: it overrides `getTemperature()`
 * to pin the held temperature while lit and fuelled, and delegates to
 * `super` (the passive embers) once out. The fuel drain is
 * reconcile-on-read over game-time.
 *
 * ⚠ `ReservedMixin` is NOT part of the chain any more. The `'fuel'`
 * Reserve was a percentage of nothing: it could not say what the fuel
 * WAS, so a fire could not be told what it was burning and could not be
 * given more. Fuel is a **bed** — kilograms, by material — and `stoke`
 * puts matter in it.
 *
 * See docs/subsystems/fire.md + thermal.md.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { CommandContributions } from '../../api/command';
import type { MarkupAugmenter } from '../../api/mml';
import type { Stuff } from '../stuff/Stuff';
import type { Thermal } from '../thermal/Thermal';
import type { Container } from '../spatial/Container';
import type { Atmospheric } from '../biome/Atmospheric';
import type { BulkSlot } from '../bulk/Bulkable';
import type Material from '../material/Material';
import { Quantity } from '../quantity';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { BiomeApi } from '../../api/biome';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../config/AppSettings';
import { WorldClockApi } from '../../api/worldclock';
import { TemplatePaths } from '../paths';
import { CallSecurity, Final, Unshadowable } from '../security/decorators';
// eslint-disable-next-line no-restricted-imports -- the F1 object face: a Burner's ignite()/douse()/advanceBurn() forward into the fire logic singleton exactly as the api/fire facade does (the Combustible/Energized precedent)
import { FireLogic } from '../../platform/idea/api/FireLogic';
import type { IgniteOutcome } from '../../api/fire';

/** Resolve the HMR-able FireLogic singleton (the combustion driver). */
function burnerFireLogic(): FireLogic {
  return StuffApi.singletonSync('/platform/idea/api/fire', () => new FireLogic());
}
import { SecurityPolicies } from '../security/SecurityPolicies';

/** Burner defaults that are not magnitudes — the rest are dials. */
const BURNER_DEFAULTS = {
  /** Far-past absence guard (game-seconds). */
  MAX_REASONABLE_GAP_SEC: 4 * 3600,
  /** Default held temperature (K) — the Campfire pin (byte-compat). */
  DEFAULT_BURN_TEMPERATURE_K: 800,
  /** Fraction of the temperature gap a lit furnace closes on a scope Meltable
   * per `heatContents` call (a lumped radiant-transfer coefficient). */
  HEAT_TRANSFER_FRACTION: 0.5,
} as const;

/**
 * The never-reconciled fuel-clock stamp. ⚠ Not `0`: game-time zero is a
 * legal instant (the first instant of a fresh world), and a `0` sentinel
 * makes the drain silently never run there because every read re-seeds
 * the stamp it is comparing against.
 */
const UNSTAMPED = -1;

/**
 * Below a gram of fuel a fire is out. ⚠ Not tidiness: see the burnout
 * edge in `reconcileBurnerFuel`. Once the bed's mass stops binding
 * against `maxBurnPowerW` the power is proportional to what is left, so
 * the drain becomes exponential and approaches zero without reaching it
 * — the burnout edge would never fire and a lamp would stay faintly lit
 * forever on a milligram of oil.
 */
const FUEL_FLOOR_KG = 1e-3;

/** Where a fire's energy comes from. */
export interface FuelSource {
  /**
   * `'bed'` — matter on a grate, or a liquid/gas in this vessel's own
   * tank; it is spent and it runs out.
   *
   * `'worked'` — a conjured flame. There is no matter: the working is
   * paying for it, so there is nothing to stoke, nothing to run out,
   * **no soot** (nothing is incompletely burning) and therefore a
   * noticeably dim flame. ⭐ It still consumes the room's air and still
   * emits carbon dioxide for the power it delivers, because
   * conservation is not a thing magic is exempt from — and that is what
   * makes a worked fire in a sealed cellar as dangerous as a real one,
   * which is the honest answer the Fire school inherits.
   */
  kind: 'bed' | 'worked';
}

/** What `stoke` did, or why it would not. */
export type StokeOutcome =
  | { ok: true; kg: number; material: string }
  | {
      ok: false;
      reason: 'not-matter' | 'not-fuel' | 'too-wet' | 'bed-full' | 'no-bed';
    };

/** The furnace capability surface. */
export interface Burner {
  /** Is the furnace currently alight? */
  isLit(): boolean;
  /** Fuel remaining, in **kilograms** (was a `%` of a Reserve). */
  fuelRemaining(): number;
  /** The chemical energy left in the bed, in joules. */
  fuelEnergyJ(): number;
  /** What it is burning, heaviest first. Empty when the bed is empty. */
  fuelMaterials(): Material[];
  /** The dominant fuel, or `null`. */
  fuelMaterial(): Material | null;
  /** How fast it is burning right now, in watts. */
  burnPowerW(): number;
  /**
   * How completely it is burning, `0..1` — ⭐ the one number the heat,
   * the light and the exhaust all read.
   */
  completeness(): number;
  /** The temperature (K) the furnace holds while lit + fuelled. */
  getHeldTemperatureK(): number;
  /** Is the bellows working (boosting the held temperature)? */
  isBellowsActive(): boolean;
  setBellowsActive(active: boolean): void;
  /** The bellows boost factor (1 = no bellows fitted). */
  getBellowsMultiplier(): number;
  /** The air control, `0..1`. 1 = vents wide; the floor is banked. */
  getDraught(): number;
  setDraught(value: number): void;
  /** Is the flame behind gauze — a safety lamp. */
  isFlameEnclosed(): boolean;
  /** Put matter in the fuel bed. */
  stoke(item: Stuff): StokeOutcome;
  /** Spend `kg` of fuel across the bed, heaviest-share first. */
  consumeFuel(kg: number): void;
  /** Reconcile the fuel drain over elapsed game-time (reconcile-on-read). */
  reconcileBurnerFuel(): void;
  /** Put this fire's exhaust for `dtS` game-seconds into its scope. */
  exhaustTick(dtS: number): void;

  // The combustion face (F1) — forwards into the FireLogic driver.
  /** Light the furnace; `{lit:false, reason}` on refusal (no fuel / lit). */
  ignite(): IgniteOutcome;
  /** Put the furnace out (and wet it); returns whether it was lit. */
  douse(): boolean;
  /** Advance one burning tick (fuel drain; self-extinguish at empty). */
  advanceBurn(): void;
  /** Heat the Meltables in the furnace's scope toward the held temperature and
   * reconcile their phase — the forge-melts-an-ingot driver. */
  heatContents(): void;
  /** Re-stamp every Thermal body in the furnace's **heat scope** (what it
   * holds, what rests on it) so each re-resolves its ambient against the
   * furnace's new lit state. */
  restampHeated(): void;

  // Authorable configuration.
  setBurnTemperatureK(value: number): void;
  setBellowsMultiplier(value: number): void;
  setMaxBurnPowerW(value: number): void;
  setFuelCapacityKg(value: number): void;
  setFlameEnclosed(value: boolean): void;
  // Gated (Api) lit-state writer.
  _setLit(value: boolean): void;
}

/**
 * ⭐⭐ **What a fire looks like, said in words a player can act on.**
 *
 * Three sentences, and each one is a reading of a derived number rather
 * than authored prose:
 *
 *  1. **What it is burning** — AC1, and the thing a `%` Reserve could
 *     never say. A mixed bed names its dominant fuel and admits the
 *     rest.
 *  2. **How it is burning** — clean and dim, or yellow and smoky. The
 *     brightness sentence is the one that teaches the draught: a player
 *     who opens the vents is TOLD the fire got dimmer, so the trade-off
 *     is legible instead of being a number in a log.
 *  3. **Whether it is banked** — because *bank it and come back* only
 *     works if coming back shows you something.
 *
 * ⚠ Filter-gated. The `fractionAugmenter` lesson: an augmenter that
 * ignores `opts.filter` appends its line to a SMELL as well as a look.
 */
function burnerAugmenter(
  text: string,
  host: Stuff,
  _viewer: Stuff,
  opts?: { filter?: readonly string[] },
): string {
  if (opts?.filter) return text;
  if (!MixinApi.isBurner(host)) return text;
  const lines: string[] = [];
  const materials = host.fuelMaterials();
  if (!host.isLit()) {
    lines.push(
      materials.length > 0
        ? `It is cold. There is ${materials[0]!.getName()} laid in it.`
        : 'It is cold, and the bed is empty.',
    );
  } else {
    if (materials.length === 1) {
      lines.push(`It is burning ${materials[0]!.getName()}.`);
    } else if (materials.length > 1) {
      lines.push(
        `It is burning ${materials[0]!.getName()}, with a little ` +
          `${materials[1]!.getName()}.`,
      );
    }
    const c = host.completeness();
    lines.push(
      c >= 0.85
        ? 'The flame burns clean and pale, and sheds little light.'
        : 'The flame is yellow and smoky, and lights the room.',
    );
    if (host.getDraught() <= BANKED_LOOK_THRESHOLD) {
      lines.push('It is banked down under its own ash, and will keep.');
    }
  }
  if (lines.length === 0) return text;
  const line = lines.join(' ');
  return text && text.length > 0 ? `${text}\n\n${line}` : line;
}

/** At or below this draught a fire reads as banked. */
const BANKED_LOOK_THRESHOLD = 0.1;

export function BurnerMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase,
) {
  class BurnerMixin extends Base implements Burner {
    static _mixinName = 'BurnerMixin';

    static markupAugmenters: MarkupAugmenter[] = [burnerAugmenter];

    /**
     * The fire-appliance verbs are **afforded by the appliance** (the
     * Bulkable holder-carries-the-verbs pattern): a room with a furnace
     * affords lighting it, dousing it, working its bellows, and bringing
     * a workpiece to its fire (`heat` — the manual-build step; the
     * furnace is the heat instrument the way the anvil is the hammer
     * surface). The fire build shipped the ignite/douse verbs with no
     * affording source — the live-drive gap this closes.
     */
    static commandContributions: CommandContributions = {
      self: [],
      // ⭐⭐ **Lighting and putting out reach OUTWARD as well as
      // sideways** (envelope W2). `peers` is siblings-and-one-exit, and
      // a furnace standing in a room is your sibling — which is the
      // whole story for a forge, an oven and a kiln, none of which is
      // ever picked up. A **lamp in your hand** is not your sibling:
      // you are its container, so only `environment` reaches you.
      //
      // ⚠ Without this line, the moment a carriable light composed
      // `BurnerMixin` the verb would have died at the AFFORDANCE link
      // — silently, with `light lantern` answering "you don't see any
      // 'lantern' here" while the lamp sat in the player's hand and 30
      // controller tests stayed green. `ChargedMixin` (the mana wand
      // you hold) declares both buckets for exactly this reason.
      //
      // ⭐ `stoke`, `draught` and `cover` join ignite/douse in BOTH
      // buckets: feeding a lamp in your hand, opening its wick and
      // turning it down are all things you do to a light you are
      // holding, and all three would have died at the affordance link
      // in exactly the same silence.
      environment: [
        'platform/cmd/device/ignite.yaml',
        'platform/cmd/device/douse.yaml',
        'platform/cmd/device/stoke.yaml',
        'platform/cmd/device/draught.yaml',
        'platform/cmd/device/cover.yaml',
      ],
      peers: [
        'platform/cmd/device/ignite.yaml',
        'platform/cmd/device/douse.yaml',
        'platform/cmd/device/stoke.yaml',
        'platform/cmd/device/draught.yaml',
        'platform/cmd/device/cover.yaml',
        'platform/cmd/device/pump.yaml',
        'platform/cmd/crafting/heat.yaml',
        // ⭐ The fire is what affords boiling — you cannot boil without
        // one, and there is no separate "kettle" to own. The whole
        // counterplay ladder's middle rung hangs off this one line.
        'platform/cmd/crafting/boil.yaml',
        // ⭐ …and you warm a frozen body by it (recovery build) — the same
        // way you learn every other thing a fire is for: by standing at one.
        'platform/cmd/medical/warm.yaml',
        // ⭐⭐ …and you FIRE a loaded chamber (extraction build). The sixth
        // verb on this principle, and the one that made the principle worth
        // restating: the plan had `fire` afforded by an open working and
        // living in the quarrying trade, which would have meant a potter's
        // shed needed its own class to fire a pot. A limekiln, a bread oven,
        // a bottle kiln and a crucible furnace are one mechanism on
        // different dials, and the CHARGE decides what comes out.
        'platform/cmd/device/fire.yaml',
      ],
    };

    static fieldMeta: FieldMeta = {
      burnTemperatureK: { persistent: true, authorable: true },
      bellowsMultiplier: { persistent: true, authorable: true },
      bellowsActive: { persistent: true, runtimeState: true },
      lit: { persistent: true, runtimeState: true },
      maxBurnPowerW: { persistent: true, authorable: true },
      fuelCapacityKg: { persistent: true, authorable: true },
      fuelBed: { persistent: true, authorable: true },
      draught: { persistent: true, authorable: true },
      flameEnclosed: { persistent: true, authorable: true },
      burnerFuelClockStamp: { persistent: true, runtimeState: true },
    };

    /** The vessel's ceiling (K) — what it can hold, with fuel that hot. */
    public burnTemperatureK: number = BURNER_DEFAULTS.DEFAULT_BURN_TEMPERATURE_K;
    /** The temperature multiplier applied when the bellows is working. */
    public bellowsMultiplier: number = 1;
    /** Is the bellows boosting right now. */
    public bellowsActive = false;
    /** Is the furnace alight (a Campfire seed starts lit). */
    public lit = true;
    /**
     * The most power (W) this vessel can draw through itself at full
     * draught — the vessel's size, replacing `fuelBurnRatePerMin`. A
     * forge 20 kW, a hearth 6 kW, a lamp 80 W.
     */
    public maxBurnPowerW: number = 0;
    /** How much fuel the bed holds, in kg. */
    public fuelCapacityKg: number = 0;
    /**
     * ⭐ **The fuel bed: kilograms, by Material template path.** A row
     * may seed a starting charge; `stoke` is how anybody adds more.
     */
    public fuelBed: Record<string, number> = {};
    /**
     * The air control, `0..1` — a damper, a wick, a tuyère, the ash you
     * bank a hearth down under. ⭐ On the mixin because **every** fire
     * has one; no `isX` guard re-narrows the host set.
     */
    public draught: number = 1;
    /**
     * Is the flame behind gauze. `false` everywhere except the one row
     * that says otherwise — a safety lamp, which is a CONSTRUCTION fact
     * about the lamp and therefore content, not a class.
     */
    public flameEnclosed = false;
    /** Game-time (s) of the last fuel reconcile; `-1` = unseeded. */
    public burnerFuelClockStamp = UNSTAMPED;

    private get burnerHost(): Stuff & Thermal {
      return this as unknown as Stuff & Thermal;
    }

    public isLit(): boolean {
      return this.lit;
    }

    // ---------- the extension points ----------

    /**
     * ⭐ Where this fire's energy comes from. A class-level statement
     * about what the object IS, not a runtime guard.
     *
     * @hook Override to `{kind: 'worked'}` on a conjured flame. The
     *   default is the fuel bed, which is every real fire.
     */
    protected fuelSource(): FuelSource {
      return { kind: 'bed' };
    }

    /**
     * ⭐ The bulk slot that IS this vessel's fuel tank, or `null` when
     * its fuel is solid and goes on a grate.
     *
     * @hook Override on a vessel whose interior is its tank — a lantern,
     *   whose only fuelling act is `fill lantern from cask`. ⚠ A
     *   `Still` does NOT override it: a still's interior is the WASH and
     *   its fire is a firebox you stoke. That distinction is exactly why
     *   this is a hook on the class rather than an `isBulkable` test at
     *   the call site, which would have made every still's own charge
     *   into its own fuel.
     */
    protected fuelSlot(): BulkSlot | null {
      return null;
    }

    // ---------- the fuel ----------

    public fuelRemaining(): number {
      if (this.fuelSource().kind === 'worked') return Infinity;
      const slot = this.fuelSlot();
      if (slot !== null) {
        const litres = slot.available();
        if (!(litres > 0)) return 0;
        const density = slot.getMaterial()?.getDensity().rawValue() ?? 0;
        return density > 0 ? (litres * density) / 1000 : 0;
      }
      let kg = 0;
      for (const mass of Object.values(this.fuelBed)) {
        if (mass > 0) kg += mass;
      }
      return kg;
    }

    public fuelEnergyJ(): number {
      const slot = this.fuelSlot();
      if (slot !== null) {
        const material = slot.getMaterial();
        if (!material) return 0;
        return (
          this.fuelRemaining() * material.getHeatOfCombustion().rawValue() * 1e6
        );
      }
      let joules = 0;
      for (const [path, mass] of Object.entries(this.fuelBed)) {
        if (!(mass > 0)) continue;
        const material = StuffApi.findByTemplatePath<Material>(path);
        if (!material) continue;
        joules += mass * material.getHeatOfCombustion().rawValue() * 1e6;
      }
      return joules;
    }

    public fuelMaterials(): Material[] {
      const slot = this.fuelSlot();
      if (slot !== null) {
        const material = slot.getMaterial();
        return material && this.fuelRemaining() > 0 ? [material] : [];
      }
      const out: { material: Material; mass: number }[] = [];
      for (const [path, mass] of Object.entries(this.fuelBed)) {
        if (!(mass > 0)) continue;
        const material = StuffApi.findByTemplatePath<Material>(path);
        if (material) out.push({ material, mass });
      }
      out.sort((a, b) => b.mass - a.mass);
      return out.map((e) => e.material);
    }

    public fuelMaterial(): Material | null {
      return this.fuelMaterials()[0] ?? null;
    }

    /**
     * The share of the bed each fuel holds, by mass — what a mixed
     * charge's flame temperature and imparted smoke are weighted by.
     */
    private fuelShares(): { material: Material; share: number }[] {
      const total = this.fuelRemaining();
      if (!(total > 0)) return [];
      const slot = this.fuelSlot();
      if (slot !== null) {
        const material = slot.getMaterial();
        return material ? [{ material, share: 1 }] : [];
      }
      const out: { material: Material; share: number }[] = [];
      for (const [path, mass] of Object.entries(this.fuelBed)) {
        if (!(mass > 0)) continue;
        const material = StuffApi.findByTemplatePath<Material>(path);
        if (material) out.push({ material, share: mass / total });
      }
      return out;
    }

    // ---------- air, power, heat, light ----------

    /**
     * The air control's effect, with the **banked floor**: you can shut
     * a fire down but you cannot shut it off. ⭐ Banking is this dial at
     * its floor and nothing else — there is no banking mechanism, which
     * is why *leave it banked and come back to it still in* is
     * arithmetic rather than a feature.
     */
    private draughtFactor(): number {
      const floor = burnerDial(AppSettingKeys.fireDraughtBanked, 0.05);
      const d = Number.isFinite(this.draught) ? this.draught : 1;
      return Math.max(Math.min(1, d), floor);
    }

    /** The scope whose medium this fire breathes, or `null`. */
    private airScope(): (Stuff & Container & Atmospheric) | null {
      let at: Stuff | null = this as unknown as Stuff;
      let depth = 32;
      while (at !== null && depth-- > 0) {
        if (
          MixinApi.isAtmospheric(at) &&
          MixinApi.isContainer(at) &&
          (at as unknown as Atmospheric).getVolume() !== null
        ) {
          return at as unknown as Stuff & Container & Atmospheric;
        }
        at = MixinApi.isContainable(at) ? at.getContainer() : null;
      }
      return null;
    }

    public completeness(): number {
      const scope = this.airScope();
      const airShare =
        scope === null
          ? 1
          : BiomeApi.airShareOf(
              BiomeApi.resolveAtmosphereContentsFor(
                scope as unknown as Stuff & Container,
              ),
            );
      const needed = burnerDial(AppSettingKeys.fireAirCompleteAirShare, 0.93);
      if (!(needed > 0)) return 1;
      // ⭐⭐ The draught and the room's air are the SAME lever from two
      // sides: a fire gets the air it is allowed to draw, and it is
      // allowed to draw what its vents admit of what is there. One
      // product, so closing the damper in a clean room and opening it
      // in a foul one starve the fire identically — which is true, and
      // is what makes AC4 (starve the draught → sooty) and AC7 (fill
      // the room → sooty) one mechanism instead of two.
      const c = (this.draughtFactor() * airShare) / needed;
      return c > 1 ? 1 : c < 0 ? 0 : c;
    }

    public burnPowerW(): number {
      const mult = this.bellowsActive ? this.bellowsMultiplier : 1;
      const ceiling =
        this.effectiveMaxPowerW() * this.draughtFactor() * mult;
      if (this.fuelSource().kind === 'worked') return ceiling;
      const kg = this.fuelRemaining();
      if (!(kg > 0)) return 0;
      // ⭐ Duration comes from MASS. A small charge in a big forge burns
      // at the charge's rate, not the forge's — which is why a heavy log
      // outlasts kindling of the same wood with no "size" field anywhere.
      const byFuel = kg * burnerDial(AppSettingKeys.firePowerPerKgW, 1500);
      return Math.min(ceiling, byFuel);
    }

    private effectiveMaxPowerW(): number {
      return this.maxBurnPowerW > 0
        ? this.maxBurnPowerW
        : burnerDial(AppSettingKeys.fireBurnerDefaultMaxPowerW, 8000);
    }

    private effectiveCapacityKg(): number {
      return this.fuelCapacityKg > 0
        ? this.fuelCapacityKg
        : burnerDial(AppSettingKeys.fireBurnerDefaultCapacityKg, 10);
    }

    /**
     * The hottest flame this bed can make, in K — derived from the
     * fuel's `heatOfCombustion`, mass-weighted across a mixed charge.
     *
     * ⭐ A linear map, and it has to be: the comparison it is ever put
     * to is *will this fuel reach this vessel's ceiling*, and the real
     * adiabatic flame temperatures of solid fuels sit in a narrow band
     * that a linear read off the one authored number reproduces to
     * within the accuracy anybody can act on. Charcoal reaches a
     * smelting furnace's 1590 K and oak does not, which is the fact the
     * metal chain already asserts in prose.
     */
    private fuelFlameK(): number {
      const shares = this.fuelShares();
      if (shares.length === 0) return 0;
      const base = burnerDial(AppSettingKeys.fireFlameBaseK, 300);
      const perMJ = burnerDial(AppSettingKeys.fireFlameKPerMJkg, 65);
      let k = 0;
      for (const { material, share } of shares) {
        k += share * (base + perMJ * material.getHeatOfCombustion().rawValue());
      }
      return k;
    }

    public getHeldTemperatureK(): number {
      const mult = this.bellowsActive ? this.bellowsMultiplier : 1;
      const vesselCeiling = this.burnTemperatureK * mult;
      const flame =
        this.fuelSource().kind === 'worked' ? Infinity : this.fuelFlameK();
      const reachable = flame > 0 ? Math.min(vesselCeiling, flame) : vesselCeiling;
      // Starved runs cooler — the 1000 K / 750 K continuity, made
      // continuous.
      const starved = burnerDial(
        AppSettingKeys.fireIncompleteTemperatureFactor,
        0.75,
      );
      const c = this.completeness();
      return reachable * (starved + (1 - starved) * c);
    }

    public isBellowsActive(): boolean {
      return this.bellowsActive;
    }

    /** The bellows boost factor (1 = no bellows fitted). */
    public getBellowsMultiplier(): number {
      return this.bellowsMultiplier;
    }

    public setBellowsActive(active: boolean): void {
      this.bellowsActive = active === true;
    }

    public getDraught(): number {
      return this.draught;
    }

    public setDraught(value: number): void {
      if (!Number.isFinite(value)) return;
      this.draught = Math.max(0, Math.min(1, value));
      this.restampHeated();
    }

    public isFlameEnclosed(): boolean {
      return this.flameEnclosed === true;
    }

    public setBurnTemperatureK(value: number): void {
      if (Number.isFinite(value) && value >= 0) this.burnTemperatureK = value;
    }
    public setBellowsMultiplier(value: number): void {
      if (Number.isFinite(value) && value >= 1) this.bellowsMultiplier = value;
    }
    public setMaxBurnPowerW(value: number): void {
      if (Number.isFinite(value) && value >= 0) this.maxBurnPowerW = value;
    }
    public setFuelCapacityKg(value: number): void {
      if (Number.isFinite(value) && value >= 0) this.fuelCapacityKg = value;
    }
    public setFlameEnclosed(value: boolean): void {
      this.flameEnclosed = value === true;
    }

    /**
     * ⭐⭐ **Luminosity is incandescent soot.**
     *
     * A clean flame is nearly invisible and a sooty one is bright, so
     * one draught dial drives heat, light and exhaust in three
     * directions at once: open the vents and the fire runs hotter,
     * cleaner and *dimmer*; shut them and it cools, smokes and glares.
     * That is why a gas lamp is disappointing until somebody invents a
     * mantle, and the fire build gets the mantle problem for free rather
     * than authoring it.
     *
     * Two floors, because sootiness is a property of the FUEL and not of
     * the draught alone:
     *
     *  - a **solid or liquid** fuel's flame is a cloud of particles and
     *    is luminous even when it is burning well (`sootyFloor`);
     *  - a **gas**, and a worked flame with no matter in it at all,
     *    burns clean and dim (`cleanFloor`).
     *
     * ⚠ The other three lit-gates in the tree stay where they are:
     * `PortableLight`/`SconceLamp` is a switch and `ElectricLight` is a
     * feeder. Folding them in here would be a mixin on the wrong host —
     * a glowcap jar is a fungus, not a fire.
     */
    getEmittedFlux(): Quantity<'lumen'> {
      this.reconcileBurnerFuel();
      if (!this.lit || !(this.fuelRemaining() > 0)) {
        return Quantity.of(0, 'lumen');
      }
      // `super.getEmittedFlux` is unavailable to the type system here —
      // the base is `MixinConstructor<Stuff>`, and tightening it to
      // require `LightSource` would refuse a furnace that is not one.
      // The prototype read is the same lookup `super` would do, and it
      // follows the chain, so a base that inherits the method still
      // answers.
      const base = Base.prototype as {
        getEmittedFlux?: () => Quantity<'lumen'>;
      };
      const ceiling = base.getEmittedFlux
        ? base.getEmittedFlux.call(this).rawValue()
        : 0;
      if (!(ceiling > 0)) return Quantity.of(0, 'lumen');

      const floor = this.luminosityFloor();
      const c = this.completeness();
      const lum = floor + (1 - floor) * (1 - c);
      // ⭐ And a banked fire is EMBERS, not a dim bonfire: how much light
      // there is also depends on how much fire there is.
      const full =
        this.effectiveMaxPowerW() *
        burnerDial(AppSettingKeys.fireLightFullSizeFraction, 0.25);
      const size = full > 0 ? Math.min(1, this.burnPowerW() / full) : 1;
      return Quantity.of(ceiling * lum * size, 'lumen');
    }

    /** How luminous this fuel's flame is at its cleanest. */
    private luminosityFloor(): number {
      const clean = burnerDial(AppSettingKeys.fireLightCleanFloor, 0.15);
      if (this.fuelSource().kind === 'worked') return clean;
      const material = this.fuelMaterial();
      if (material === null) return clean;
      return isGasMaterial(material)
        ? clean
        : burnerDial(AppSettingKeys.fireLightSootyFloor, 0.6);
    }

    // Pinned hot while lit + fuelled; passive embers otherwise.
    getTemperature(): Quantity<'K'> {
      this.reconcileBurnerFuel();
      if (this.lit && this.fuelRemaining() > 0) {
        return Quantity.of(this.getHeldTemperatureK(), 'K');
      }
      return (super.getTemperature as () => Quantity<'K'>).call(this);
    }

    // ---------- stoking ----------

    /**
     * ⭐⭐ **Put matter in the fire** — the act no fire in this game
     * could accept before, which is why none of them could run twice.
     *
     * The item is consumed into the bed by its own mass and material, so
     * what the fire is burning is a fact about what somebody put in it.
     * Three refusals, each of which is the object answering for itself:
     * a stone has no heat of combustion, a sodden turf carries its own
     * water, and a full bed is full.
     */
    public stoke(item: Stuff): StokeOutcome {
      if (this.fuelSlot() !== null) return { ok: false, reason: 'no-bed' };
      if (this.fuelSource().kind === 'worked') {
        return { ok: false, reason: 'no-bed' };
      }
      if (!MixinApi.isTangible(item)) return { ok: false, reason: 'not-matter' };
      const material = item.getMaterial();
      if (!material) return { ok: false, reason: 'not-fuel' };
      if (!(material.getHeatOfCombustion().rawValue() > 0)) {
        return { ok: false, reason: 'not-fuel' };
      }
      if (burnerFireLogic().tooWetToCatch(item)) {
        return { ok: false, reason: 'too-wet' };
      }
      const kg = item.getMass().rawValue();
      if (!(kg > 0)) return { ok: false, reason: 'not-matter' };
      if (this.fuelRemaining() + kg > this.effectiveCapacityKg()) {
        return { ok: false, reason: 'bed-full' };
      }
      const path = material.getTemplatePath();
      if (path === null) return { ok: false, reason: 'not-fuel' };
      this.reconcileBurnerFuel();
      this.fuelBed[path] = (this.fuelBed[path] ?? 0) + kg;
      StuffApi.destruct(item);
      this.restampHeated();
      return { ok: true, kg, material: material.getName() };
    }

    /** Spend what is left. The dregs are not worth tracking. */
    private clearFuelBed(): void {
      const slot = this.fuelSlot();
      if (slot !== null) {
        const left = slot.available();
        if (left > 0) slot.debit(left);
        return;
      }
      this.fuelBed = {};
    }

    public consumeFuel(kg: number): void {
      if (!(kg > 0)) return;
      const slot = this.fuelSlot();
      if (slot !== null) {
        const density = slot.getMaterial()?.getDensity().rawValue() ?? 0;
        if (density > 0) slot.debit((kg * 1000) / density);
        return;
      }
      const total = this.fuelRemaining();
      if (!(total > 0)) return;
      const fraction = Math.min(1, kg / total);
      for (const path of Object.keys(this.fuelBed)) {
        const mass = this.fuelBed[path] ?? 0;
        const left = mass - mass * fraction;
        if (left > 1e-9) this.fuelBed[path] = left;
        else delete this.fuelBed[path];
      }
    }

    public reconcileBurnerFuel(): void {
      const now = burnerNowSeconds();
      if (now === null) return;
      if (this.burnerFuelClockStamp === UNSTAMPED) {
        this.burnerFuelClockStamp = now;
        return;
      }
      const elapsed = now - this.burnerFuelClockStamp;
      if (elapsed <= 0 || elapsed > BURNER_DEFAULTS.MAX_REASONABLE_GAP_SEC) {
        this.burnerFuelClockStamp = now;
        return;
      }
      this.burnerFuelClockStamp = now;
      if (!this.lit) return;
      if (this.fuelSource().kind === 'worked') return;
      if (!(this.fuelRemaining() > 0)) return;
      const kg = this.kgBurntOver(elapsed);
      if (kg > 0) this.consumeFuel(kg);
      // ⭐⭐ The guttering tail, and it needs a floor. Below the point
      // where `maxBurnPowerW` stops binding, the power is proportional to
      // the mass left — so the drain becomes exponential and the bed
      // approaches zero without ever reaching it. The burnout edge would
      // never fire, and a lamp would stay faintly lit forever on a
      // milligram of oil. ⚠ Found by a test that expected a lamp to be
      // out after eighteen game hours and found 29 g left.
      if (this.fuelRemaining() < FUEL_FLOOR_KG) this.clearFuelBed();
      if (!(this.fuelRemaining() > 0)) {
        // Burnout edge — release the pin at the held temperature, go dark.
        this.burnerHost.setContentsTemperature(this.getHeldTemperatureK());
        this._goOut();
      }
    }

    /**
     * The mass this fire spends over `dtS` game-seconds: its power
     * divided by the energy density of what it is burning. ⭐ Energy in,
     * mass out — the thing a `%`/minute rate could never express.
     */
    private kgBurntOver(dtS: number): number {
      if (!(dtS > 0)) return 0;
      const joules = this.burnPowerW() * dtS;
      if (!(joules > 0)) return 0;
      const shares = this.fuelShares();
      let mjPerKg = 0;
      for (const { material, share } of shares) {
        mjPerKg += share * material.getHeatOfCombustion().rawValue();
      }
      if (!(mjPerKg > 0)) return 0;
      return Math.min(this.fuelRemaining(), joules / (mjPerKg * 1e6));
    }

    public exhaustTick(dtS: number): void {
      if (!this.lit || !(dtS > 0)) return;
      const scope = this.airScope();
      if (scope === null) return;
      const c = this.completeness();
      const complete = c >= 1;
      if (this.fuelSource().kind === 'worked') {
        // ⭐ No matter, so no soot — but the power still has to come out
        // of the room's air, which is why a worked fire smothers too.
        const kgEquivalent =
          (this.burnPowerW() * dtS) /
          (burnerDial(AppSettingKeys.fireWorkedFlameMJPerKg, 16) * 1e6);
        burnerFireLogic().emitExhaust(
          scope as unknown as Stuff & Container,
          kgEquivalent,
          true,
        );
        return;
      }
      const kg = this.kgBurntOver(dtS);
      if (kg > 0) {
        burnerFireLogic().emitExhaust(
          scope as unknown as Stuff & Container,
          kg,
          complete,
        );
      }
    }

    public heatContents(): void {
      if (!this.lit || this.fuelRemaining() <= 0) return;
      const held = this.getHeldTemperatureK();
      const scope = (this as unknown as { getContainer(): Stuff | null })
        .getContainer();
      if (scope === null || !MixinApi.isContainer(scope)) return;
      for (const occ of (scope as Stuff & Container).getContents()) {
        const s = occ as unknown as Stuff;
        if (s === (this as unknown as Stuff) || s.isDestroyed()) continue;
        if (!MixinApi.isThermal(s) || !MixinApi.isMeltable(s)) continue;
        const temp = s.getTemperature().rawValue();
        if (temp >= held) continue; // already at the furnace's heat
        const mat = MixinApi.isTangible(s) ? s.getMaterial() : null;
        const massKg = (s as unknown as { getMass(): Quantity<'kg'> })
          .getMass()
          .rawValue();
        let c = mat ? mat.getSpecificHeat().rawValue() : 0;
        if (c <= 0) c = 4186;
        const joules =
          (held - temp) * massKg * c * BURNER_DEFAULTS.HEAT_TRANSFER_FRACTION;
        s.depositHeat(joules);
        if (MixinApi.isThermal(s)) s.reconcilePhase();
      }
    }

    /**
     * The furnace's **heat scope** — what it holds (a `Container`
     * furnace: an oven chamber) and what is placed on it (a `Placing`
     * furnace: a pot on a campfire). Distinct from `heatContents`'
     * scope, which is the furnace's room SIBLINGS: that is radiant
     * transfer to a workpiece brought near a forge, and it is a
     * different mechanism from being inside the fire.
     */
    public restampHeated(): void {
      const self = this as unknown as Stuff;
      const heated: (Stuff & Thermal)[] = [];
      if (MixinApi.isContainer(self)) {
        for (const occ of self.getContents()) {
          const s = occ as unknown as Stuff;
          if (s !== self && !s.isDestroyed() && MixinApi.isThermal(s)) {
            heated.push(s);
          }
        }
      }
      if (MixinApi.isPlacing(self)) {
        for (const occ of self.getPlaced()) {
          const s = occ as unknown as Stuff;
          if (s !== self && !s.isDestroyed() && MixinApi.isThermal(s)) {
            heated.push(s);
          }
        }
      }
      for (const body of heated) void body.restamp();
    }

    /**
     * The one place lit state goes false from inside this class — so
     * the burnout edge and `_setLit(false)` restamp identically. ⚠ The
     * burnout edge wrote `this.lit = false` directly before, and
     * therefore skipped a restamp path its sibling ran.
     */
    private _goOut(): void {
      this.lit = false;
      this.restampHeated();
    }

    @CallSecurity(SecurityPolicies.ApiOnly)
    @Final
    @Unshadowable
    public _setLit(value: boolean): void {
      this.lit = value === true;
      // ⭐ The eighth re-stamp trigger class (the `Atmospheric
      // .setTemperature` fan-out shape): lighting or dousing changes
      // the ambient of everything the furnace heats, and the cached
      // ambient has no lazy re-resolve.
      this.restampHeated();
    }

    // -------- the combustion face (forwards into FireLogic) --------

    /** Light the furnace (the `ignite` verb's appliance arm). Sealed —
     * the combustion driver is the one writer of lit state. */
    @Final
    @Unshadowable
    public ignite(): IgniteOutcome {
      return burnerFireLogic().ignite(this as unknown as Stuff);
    }

    /** Put the furnace out (and wet it); returns whether it was lit. */
    @Final
    @Unshadowable
    public douse(): boolean {
      return burnerFireLogic().douse(this as unknown as Stuff);
    }

    /** Advance one burning tick (fuel drain; self-extinguish at empty). */
    @Final
    @Unshadowable
    public advanceBurn(): void {
      burnerFireLogic().advance(this as unknown as Stuff);
    }
  }

  return BurnerMixin;
}

/**
 * Is this material a gas where anybody is standing? ⭐ Derived from the
 * boiling point against the standard ambient — there is no `phase`
 * field, and phase stays a consequence of the material and the place.
 */
function isGasMaterial(material: Material): boolean {
  const bp = material.getBoilingPoint().rawValue();
  if (!(bp > 0)) return false;
  return bp <= burnerDial(AppSettingKeys.atmosphereStandardK, 293);
}

/** One numeric dial read, falling back to the literal when unseeded. */
function burnerDial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw == null || raw === '') return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

/** In-session game-time (seconds), or null when no world clock runs. */
function burnerNowSeconds(): number | null {
  if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) {
    return null;
  }
  return WorldClockApi.getNow().rawValue();
}
