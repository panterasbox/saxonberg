/**
 * LoadBearingMixin — the encumbrance gauge: how much a body carries,
 * how much it can carry, and the consequences of carrying too much.
 *
 * Composition requirement (declared + runtime-enforced): a load-bearer
 * is `Container + Slotted + Tangible + Reserved + Vitals`. The mixin
 * reads all five — `Container`/`Slotted` for the two stores it weighs,
 * `Tangible` for body mass, `Vitals`/`Reserved` for the physiology that
 * sets capacity — so it composes **outer** of all of them (the same
 * placement logic as `Vitals` outer of `Reserved`). Today only `Creature`
 * assembles the prerequisites, but the door is open: a future non-Creature
 * bearer composes the mixin, not the class tree.
 *
 * The gauge is **derived-on-read** — nothing is stored. `getBorneBurden`
 * walks the carried tree (both `Container.contents` and slot occupants),
 * applying two coupling factors: a per-container **transmission** product
 * (`Vessel.transmissionFactor`, so a bag of holding nearly erases its
 * contents' weight) and a per-attachment **placement** surcharge (held /
 * loose costs more than worn; derived from the slot's `accepts`).
 * `getCarryCapacity` derives from body mass × physiology margins. The
 * consequences — the lift gate, the locomotion veto, the traversal drain —
 * are driven by `GetController` and `LocomotionApi` reading this surface;
 * the move/containment substrate itself stays encumbrance-agnostic.
 *
 * NOT a home for movement-speed effects (a non-goal — load taxes
 * endurance and gates locomotion modes, never pace) nor for endurance
 * *recovery* (a metabolism concern; v1 drain is one-way and gentle).
 */

import type { MixinConstructor } from '../mixin';
import { Quantity } from '../quantity';
import type { Stuff } from '../stuff/Stuff';
import { Vessel } from '../stuff/Vessel';
import type { Container } from '../spatial/Container';
import type { Slotted } from '../slot/Slotted';
import type { Tangible } from '../material/Tangible';
import type { Reserved } from '../reserve/Reserved';
import type { Vitals, ConditionBand } from '../vitals/Vitals';
import { MixinApi } from '../../api/mixin';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../config/AppSettings';
import type { SubscribableFieldDescriptor } from '../../api/mql-subscription';
import { NEUTRAL_DENSITY_KG_M3 } from './Buoyant';
import { SIZE_DEFAULTS } from '../spatial/Dimensions';

/** Numeric AppSetting read with a seeded-literal fallback. */
function readDial(key: string, fallback: number): number {
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
 * Engine dials for the encumbrance gauge — **deferred dials** (numeric
 * tuning is a non-goal this build): named, greppable, retunable in one
 * place. They live in the capability's own module (the `Vitals`
 * precedent — `UNIVERSE_DEFAULT_VITAL_PROFILE` lives in `Vitals.ts`).
 * When GameConfig lands it is the eventual home; until then this is it.
 */
export const LOAD_BEARING_DEFAULTS = {
  /** Comfortable carry as a fraction of the bearer's own body mass. */
  CAPACITY_FRACTION: 0.5,
  /** Strain ceiling = capacity × this (the absolute lift cap). */
  OVERLOAD_FACTOR: 2.0,
  /**
   * Load ratio (burden / capacity) at/above which self-powered
   * climb/swim/fly is vetoed. `1.0` = over comfortable capacity.
   */
  HEAVY_LOAD_THRESHOLD: 1.0,
  /**
   * Surcharge applied to what the HANDS hold (a hand-held load couples
   * worse than a worn or pocketed one; size and carrying D12). Renamed from
   * the loose-carry surcharge at the flip (W7): nothing is carried loose.
   */
  HELD_SURCHARGE: 1.25,
  /**
   * Extra placement coupling per unit of a worn garment's `tightness`.
   * Clothes cut for a smaller body bind, and binding is a real load;
   * a garment cut for you, or cut generous, adds nothing.
   */
  TIGHT_FIT_SURCHARGE: 0.5,
  /**
   * Load ratio below which a traverse costs nothing extra. Read by
   * `ExertingMixin.traversePowerW` — the loaded-traversal drain that
   * used to live here is folded into the one exertion event.
   */
  LIGHT_LOAD_FLOOR: 0.25,
  /**
   * Capacity multiplier floor as endurance empties — the spiral term.
   * Exhaustion shaves capacity toward this floor, never to zero.
   */
  ENDURANCE_FLOOR: 0.5,
  /**
   * Capacity multiplier by condition band — injury lowers what a body
   * can comfortably bear. All ≤ 1.0; `dead` is irrelevant (a corpse
   * carries nothing) but mapped for totality.
   */
  CONDITION_BAND_MARGIN: {
    healthy: 1.0,
    hurt: 0.85,
    serious: 0.6,
    critical: 0.35,
    // A dying body bears what a critical one does — it is still a body,
    // and the burden gauge has no opinion about how long it has left.
    dying: 0.35,
    dead: 0,
  } satisfies Record<ConditionBand, number>,
  /** Recursion guard for the burden walk (matches locomotion/conveyance). */
  MAX_DEPTH: 16,
} as const;

/** The public surface added by LoadBearingMixin. */
export interface LoadBearing {
  /** Total weighted weight this body bears (carried + worn + held). */
  /**
   * ⭐ With `waterDensityKgM3`, the burden IN THE WATER (underwater
   * review): each carried thing at its weight there — mass × (1 − ρ_water
   * / ρ_thing) — so lead still weighs and a bag of air lifts (it counts
   * negative and helps carry the rest; the total never goes below 0).
   */
  getBorneBurden(waterDensityKgM3?: number): Quantity<'kg'>;
  /** What this body can comfortably carry (physiology-derived). */
  getCarryCapacity(): Quantity<'kg'>;
  /** Absolute lift cap = capacity × OVERLOAD_FACTOR. */
  getStrainCeiling(): Quantity<'kg'>;
  /** Burden / capacity (dimensionless; `0` capacity → `0`/`Infinity`). */
  /** Burden over capacity; in the water when `waterDensityKgM3` is given. */
  getLoadRatio(waterDensityKgM3?: number): number;
  /**
   * ⭐ How the load sits on this body, in words — never a number (size and
   * carrying D28's burden line): `null` when it carries next to nothing.
   */
  burdenWords(): string | null;
  /** Would lifting `candidate` (as loose carry) push burden past the ceiling? */
  wouldExceedCeiling(candidate: Stuff): boolean;
  /**
   * ⭐ The MASS a hand must control to hold `item` — the thing and
   * everything in it (a Vessel's transmission still applies), with **no
   * gravity in it** (size and carrying D10-d). Weight is the burden line's;
   * the grip judges inertia, so a full pack takes both hands at zero g.
   */
  ladenMassOf(item: Stuff): Quantity<'kg'>;
}

/**
 * Recursive weighted weight of one borne subtree. `transmission` is the
 * running product of every enclosing `Vessel.transmissionFactor` down to
 * this item; `placement` is the top-level attachment surcharge, fixed at
 * the attach point and carried down unchanged (a backpack worn on the
 * torso applies the worn floor to itself *and* its contents). The
 * `visited` set (by `stuffId`) plus `MAX_DEPTH` guard against cycles and
 * pathological nesting — containment is a DAG via the move chokepoint, but
 * the walk does not assume it. Reads only the method surface
 * (`getMass`/`getContents`/`getTransmissionFactor`), never fields.
 */
function walk(
  item: Stuff,
  transmission: number,
  placement: number,
  depth: number,
  visited: Set<string>,
  waterDensityKgM3?: number,
): number {
  if (depth > LOAD_BEARING_DEFAULTS.MAX_DEPTH) return 0;
  if (visited.has(item.stuffId)) return 0;
  visited.add(item.stuffId);

  let self = MixinApi.isTangible(item) ? item.getMass().rawValue() : 0;
  // ⭐ In the water a thing weighs what it does not float off: lead still
  // pulls, air lifts (negative), and the bearer's total is clamped at 0.
  if (waterDensityKgM3 !== undefined && MixinApi.isTangible(item) && self > 0) {
    const rho = item.getMaterial()?.getDensity().rawValue() ?? NEUTRAL_DENSITY_KG_M3;
    self = rho > 0 ? self * (1 - waterDensityKgM3 / rho) : self;
  }
  let contribution = self * transmission * placement;

  if (MixinApi.isContainer(item)) {
    // Transmission attenuates only across a Vessel (the container-object
    // that owns the factor); a non-Vessel container (e.g. a
    // creature-as-container) passes weight through at 1.0.
    const childTransmission =
      transmission *
      (item instanceof Vessel ? item.getTransmissionFactor() : 1.0);
    for (const child of item.getContents()) {
      contribution += walk(child, childTransmission, placement, depth + 1, visited, waterDensityKgM3);
    }
  }
  return contribution;
}

/** Endurance reserve → capacity multiplier in `[ENDURANCE_FLOOR, 1.0]`. */
function enduranceMargin(bearer: Stuff & Reserved): number {
  const reserve = bearer.getReserve('endurance');
  if (!reserve) return 1.0;
  const cap = reserve.capacity.rawValue();
  if (cap <= 0) return LOAD_BEARING_DEFAULTS.ENDURANCE_FLOOR;
  const fraction = Math.max(0, Math.min(1, reserve.current.rawValue() / cap));
  const floor = LOAD_BEARING_DEFAULTS.ENDURANCE_FLOOR;
  return floor + (1 - floor) * fraction;
}

export function LoadBearingMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class LoadBearingMixin extends Base implements LoadBearing {
    static _mixinName = 'LoadBearingMixin';

    /**
     * Derived readouts surfaced through the live-query / inspection
     * substrate (the `Tangible.mass` precedent). No event wiring in v1 —
     * these are pure derived reads re-resolved on demand.
     */
    static subscribableFields: SubscribableFieldDescriptor[] = [
      {
        name: 'borneBurden',
        read: (stuff) => {
          const q = (stuff as unknown as LoadBearing).getBorneBurden();
          return { value: q.rawValue(), unit: 'kg' as const };
        },
      },
      {
        name: 'carryCapacity',
        read: (stuff) => {
          const q = (stuff as unknown as LoadBearing).getCarryCapacity();
          return { value: q.rawValue(), unit: 'kg' as const };
        },
      },
      {
        name: 'loadRatio',
        read: (stuff) => (stuff as unknown as LoadBearing).getLoadRatio(),
      },
    ];

    /**
     * Runtime guard for the declared composition requirement — a clear
     * throw beats a downstream "getReserve is not a function". Cheap
     * (member-presence checks); turns the "always composed with X"
     * contract into an enforced one.
     */
    private requireBearerSurface(): void {
      const self = this as unknown as Record<string, unknown>;
      for (const m of [
        'getContents',
        'getAllOccupants',
        'getSlotSpec',
        'getMass',
        'getConditionBand',
        'getReserve',
      ]) {
        if (typeof self[m] !== 'function') {
          throw new Error(
            `LoadBearingMixin requires Container + Slotted + Tangible + ` +
              `Vitals + Reserved (missing '${m}')`,
          );
        }
      }
    }

    public getBorneBurden(waterDensityKgM3?: number): Quantity<'kg'> {
      this.requireBearerSurface();
      const bearer = this as unknown as Stuff & Container & Slotted;
      const visited = new Set<string>();
      let total = 0;
      const self0 = this as unknown as Stuff;
      const carrier = MixinApi.isCarrying(self0) ? self0 : null;
      const hands = new Set(carrier?.handSlots() ?? []);

      // a) Slot occupants FIRST — worn / held; placement from the slot
      // kind. ⭐ Slots before the loose pass (size and carrying W4): an
      // occupant is in the contents too, and the loose pass used to reach
      // it first and charge a worn coat the held surcharge.
      //
      // ⭐ A TIGHT garment costs more than its mass. Clothes cut for a
      // smaller body bind, and binding is a real load on a body that
      // has to move in them — so `tightness` (the fit reading's signed
      // half) adds a surcharge on top of the placement coupling. A
      // garment cut for you, or cut generous, adds nothing.
      //
      // ⭐ A HELD load is also as awkward as its shape (D12): long against
      // the holder's stature, bulky against the body's volume.
      const tightSurcharge = readDial(
        AppSettingKeys.textilesFitTightnessBurden,
        LOAD_BEARING_DEFAULTS.TIGHT_FIT_SURCHARGE,
      );
      for (const [slotName, occupants] of bearer.getAllOccupants()) {
        // ⭐ Held = a HAND slot (D12, the flip): worn and slotted things
        // bear at the floor; what the hands hold at the held surcharge.
        const placement = hands.has(slotName) ? LOAD_BEARING_DEFAULTS.HELD_SURCHARGE : 1.0;
        for (const occ of occupants) {
          const asStuff = occ as unknown as Stuff;
          if (visited.has(asStuff.stuffId)) continue;
          let coupling = placement;
          if (MixinApi.isWearable(asStuff)) {
            coupling += asStuff.fitOn(self0).tightness * tightSurcharge;
          }
          if (carrier !== null && hands.has(slotName)) coupling *= carrier.awkwardnessOf(asStuff);
          total += walk(asStuff, 1.0, coupling, 0, visited, waterDensityKgM3);
        }
      }

      // b) Everything else on the body is PLACED on a worn host (D12, the
      // flip): a key in a pocket, a pouch hung from the belt — each at the
      // worn floor, 1.0, counted once (the visited set). The loose-carry
      // pass retired with the flip: nothing sits loose on a body.
      for (const item of bearer.getContents()) {
        total += walk(item, 1.0, 1.0, 0, visited, waterDensityKgM3);
      }

      // c) Hitched cart — the draft load of whatever this bearer hauls.
      // The cart's cargo was never on these books (it lives in the cart's
      // own container); only the attenuated draft is borne. Read dynamically
      // so the Creature base carries no haulage dependency — a non-hauler
      // bearer skips this entirely. See docs/subsystems/encumbrance.md.
      const self = this as unknown as Stuff;
      if (MixinApi.isHauling(self)) {
        total += self.getHaulDraft().rawValue();
      }

      // ⭐ Weight is mass × the place's gravity (size and carrying W4): the
      // burden is in Earth-kilograms of effort, so a pack weighs nothing at
      // zero g and 38 % of itself on Mars — and keeps its mass, its size
      // and the hands it takes.
      return Quantity.of(Math.max(0, total) * this.gravityShare(), 'kg');
    }

    /** The place's gravity over standard (1 when it is unknown). */
    private gravityShare(): number {
      const self = this as unknown as Stuff;
      const place = MixinApi.isContainable(self) ? self.getEnclosingPlace() : null;
      if (place === null || !MixinApi.isAtmospheric(place)) return 1;
      return place.gravityNow().rawValue() / SIZE_DEFAULTS.STANDARD_GRAVITY;
    }

    public getCarryCapacity(): Quantity<'kg'> {
      this.requireBearerSurface();
      const bearer = this as unknown as Stuff &
        Tangible &
        Vitals &
        Reserved;
      const base =
        bearer.getMass().rawValue() * LOAD_BEARING_DEFAULTS.CAPACITY_FRACTION;
      const bandMargin =
        LOAD_BEARING_DEFAULTS.CONDITION_BAND_MARGIN[bearer.getConditionBand()];
      // ⭐ The strength read: muscle widens what a body can carry (1.0
      // at the seed, so every untrained body reads exactly as before).
      // The one figure the tape, the water, the physician and the lift
      // gate all read.
      const lean = MixinApi.isExerting(bearer) ? bearer.leanMargin() : 1;
      const margin = bandMargin * enduranceMargin(bearer) * lean;
      return Quantity.of(base * margin, 'kg');
    }

    public getStrainCeiling(): Quantity<'kg'> {
      return Quantity.of(
        this.getCarryCapacity().rawValue() *
          LOAD_BEARING_DEFAULTS.OVERLOAD_FACTOR,
        'kg',
      );
    }

    public burdenWords(): string | null {
      const ratio = this.getLoadRatio();
      if (!Number.isFinite(ratio)) return 'You are carrying more than you can bear.';
      if (ratio < 0.05) return null;
      if (ratio < LOAD_BEARING_DEFAULTS.LIGHT_LOAD_FLOOR) return 'Your load is light.';
      if (ratio < 0.75) return 'You are carrying a fair load.';
      if (ratio <= LOAD_BEARING_DEFAULTS.HEAVY_LOAD_THRESHOLD) return 'You are well laden.';
      if (ratio <= LOAD_BEARING_DEFAULTS.OVERLOAD_FACTOR) return 'You are heavily burdened.';
      return 'You are carrying more than you can bear.';
    }

    public getLoadRatio(waterDensityKgM3?: number): number {
      const capacity = this.getCarryCapacity().rawValue();
      const burden = this.getBorneBurden(waterDensityKgM3).rawValue();
      if (capacity <= 0) return burden > 0 ? Infinity : 0;
      return burden / capacity;
    }

    public wouldExceedCeiling(candidate: Stuff): boolean {
      // Prospective burden = current borne + the candidate's full subtree
      // as it would attach (into a hand → the held surcharge, the worst case). A bag of
      // holding lifted whole is correctly attenuated by walking it.
      const prospective =
        this.getBorneBurden().rawValue() +
        walk(
          candidate,
          1.0,
          LOAD_BEARING_DEFAULTS.HELD_SURCHARGE,
          0,
          new Set<string>(),
        ) * this.gravityShare();
      return prospective > this.getStrainCeiling().rawValue();
    }

    public ladenMassOf(item: Stuff): Quantity<'kg'> {
      return Quantity.of(Math.max(0, walk(item, 1.0, 1.0, 0, new Set<string>())), 'kg');
    }

  };
}
