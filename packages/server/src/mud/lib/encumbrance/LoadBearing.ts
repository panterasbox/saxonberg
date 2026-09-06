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
import { Mixins } from '../mixin';
import { Quantity } from '../quantity';
import type { Stuff } from '../stuff/Stuff';
import { Vessel } from '../stuff/Vessel';
import type { Container } from '../spatial/Container';
import type { Slotted, SlotSpec } from '../slot/Slotted';
import type { Tangible } from '../material/Tangible';
import type { Reserved } from '../reserve';
import type { Vitals, ConditionBand } from '../vitals/Vitals';
import { MixinApi } from '../../api/mixin';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../config/AppSettings';
import type { SubscribableFieldDescriptor } from '../../api/mql-subscription';

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
   * Surcharge applied to held items and to loose general-contents carry
   * (a hand-held or unstowed load couples worse than a worn one). Also
   * the value the derived placement coupling returns for a held slot.
   */
  LOOSE_CARRY_SURCHARGE: 1.25,
  /**
   * Extra placement coupling per unit of a worn garment's `tightness`.
   * Clothes cut for a smaller body bind, and binding is a real load;
   * a garment cut for you, or cut generous, adds nothing.
   */
  TIGHT_FIT_SURCHARGE: 0.5,
  /** Load ratio below which a traverse costs no endurance. */
  LIGHT_LOAD_FLOOR: 0.25,
  /** Endurance drawn per loaded traverse, scaled by overload (`%`). */
  DRAIN_PER_TRAVERSAL: 2.0,
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
  getBorneBurden(): Quantity<'kg'>;
  /** What this body can comfortably carry (physiology-derived). */
  getCarryCapacity(): Quantity<'kg'>;
  /** Absolute lift cap = capacity × OVERLOAD_FACTOR. */
  getStrainCeiling(): Quantity<'kg'>;
  /** Burden / capacity (dimensionless; `0` capacity → `0`/`Infinity`). */
  getLoadRatio(): number;
  /** Would lifting `candidate` (as loose carry) push burden past the ceiling? */
  wouldExceedCeiling(candidate: Stuff): boolean;
  /** Draw down endurance for one loaded self-powered traverse. */
  drainForTraversal(): void;
}

/**
 * Placement coupling for a top-level attachment, derived from the slot's
 * existing `accepts` — held (`WieldableMixin`) couples at the surcharge,
 * worn (`WearableMixin` / anything else) at the `1.0` floor. No field on
 * `SlotSpec`: the universal slot record stays a pure structural mechanism,
 * and v1 has no per-slot coupling overrides. A `null` spec (unknown slot)
 * falls back to the worn floor.
 */
function placementCouplingFor(spec: SlotSpec | null): number {
  if (spec && spec.accepts === Mixins.Wieldable) {
    return LOAD_BEARING_DEFAULTS.LOOSE_CARRY_SURCHARGE;
  }
  return 1.0;
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
): number {
  if (depth > LOAD_BEARING_DEFAULTS.MAX_DEPTH) return 0;
  if (visited.has(item.stuffId)) return 0;
  visited.add(item.stuffId);

  const self = MixinApi.isTangible(item) ? item.getMass().rawValue() : 0;
  let contribution = self * transmission * placement;

  if (MixinApi.isContainer(item)) {
    // Transmission attenuates only across a Vessel (the container-object
    // that owns the factor); a non-Vessel container (e.g. a
    // creature-as-container) passes weight through at 1.0.
    const childTransmission =
      transmission *
      (item instanceof Vessel ? item.getTransmissionFactor() : 1.0);
    for (const child of item.getContents()) {
      contribution += walk(child, childTransmission, placement, depth + 1, visited);
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

    public getBorneBurden(): Quantity<'kg'> {
      this.requireBearerSurface();
      const bearer = this as unknown as Stuff & Container & Slotted;
      const visited = new Set<string>();
      let total = 0;

      // a) General contents — carried loose, paying the held surcharge
      // (v1 has no hand-slot-claiming on `get`; loose contents couple
      // like a held item — see docs/subsystems/encumbrance.md).
      for (const item of bearer.getContents()) {
        total += walk(
          item,
          1.0,
          LOAD_BEARING_DEFAULTS.LOOSE_CARRY_SURCHARGE,
          0,
          visited,
        );
      }

      // b) Slot occupants — worn / wielded; placement from the slot kind.
      //
      // ⭐ A TIGHT garment costs more than its mass. Clothes cut for a
      // smaller body bind, and binding is a real load on a body that
      // has to move in them — so `tightness` (the fit reading's signed
      // half) adds a surcharge on top of the placement coupling. A
      // garment cut for you, or cut generous, adds nothing.
      const tightSurcharge = readDial(
        AppSettingKeys.textilesFitTightnessBurden,
        LOAD_BEARING_DEFAULTS.TIGHT_FIT_SURCHARGE,
      );
      const self0 = this as unknown as Stuff;
      for (const [slotName, occupants] of bearer.getAllOccupants()) {
        const placement = placementCouplingFor(bearer.getSlotSpec(slotName));
        for (const occ of occupants) {
          const asStuff = occ as unknown as Stuff;
          let coupling = placement;
          if (MixinApi.isWearable(asStuff)) {
            coupling += asStuff.fitOn(self0).tightness * tightSurcharge;
          }
          total += walk(asStuff, 1.0, coupling, 0, visited);
        }
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

      return Quantity.of(total, 'kg');
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
      const margin = bandMargin * enduranceMargin(bearer);
      return Quantity.of(base * margin, 'kg');
    }

    public getStrainCeiling(): Quantity<'kg'> {
      return Quantity.of(
        this.getCarryCapacity().rawValue() *
          LOAD_BEARING_DEFAULTS.OVERLOAD_FACTOR,
        'kg',
      );
    }

    public getLoadRatio(): number {
      const capacity = this.getCarryCapacity().rawValue();
      const burden = this.getBorneBurden().rawValue();
      if (capacity <= 0) return burden > 0 ? Infinity : 0;
      return burden / capacity;
    }

    public wouldExceedCeiling(candidate: Stuff): boolean {
      // Prospective burden = current borne + the candidate's full subtree
      // as it would attach (loose carry → the held surcharge). A bag of
      // holding lifted whole is correctly attenuated by walking it.
      const prospective =
        this.getBorneBurden().rawValue() +
        walk(
          candidate,
          1.0,
          LOAD_BEARING_DEFAULTS.LOOSE_CARRY_SURCHARGE,
          0,
          new Set<string>(),
        );
      return prospective > this.getStrainCeiling().rawValue();
    }

    public drainForTraversal(): void {
      const bearer = this as unknown as Stuff & Reserved;
      if (!bearer.hasReserve('endurance')) return;
      const ratio = this.getLoadRatio();
      if (ratio <= LOAD_BEARING_DEFAULTS.LIGHT_LOAD_FLOOR) return;
      const cost =
        LOAD_BEARING_DEFAULTS.DRAIN_PER_TRAVERSAL *
        (ratio - LOAD_BEARING_DEFAULTS.LIGHT_LOAD_FLOOR);
      bearer.adjustReserve('endurance', Quantity.of(-cost, '%'));
    }
  };
}
