/**
 * PublicLightingMixin — ⭐⭐ **the town's lamps are a PROPERTY of the
 * street, not objects.**
 *
 * A street declares that the town lights it. Whether it is lit *right
 * now* is derived: the service is funded, it is after dusk, therefore
 * the street is lit. The lamps themselves are **prose** — a dynamic
 * detail you can `look at`, which says whether they are burning.
 * **Nothing is minted.**
 *
 * ## ⭐ The test that decides object-or-property: *is it the target of
 * a verb?*
 *
 * The realm has ruled on this twice, in opposite directions, and both
 * are right. The University Avenue **clock tower** is not an object —
 * *"fixed scenery whose only job is to show true time needs no
 * mechanism and no instanceable class; the detail seam is enough"*
 * (`time.md`). The **floor** IS an object, one per room, and the ground
 * build paid 0.76 ms a room for it with the measurement written down —
 * because `dig` has to bind it.
 *
 * Nobody binds a street lamp. Every act that matters — funding the
 * service, walking the round, the street being lit or dark — happens at
 * **street** granularity, and 41 of the realm's rows name an outdoor
 * biome. Minting one identical fuelled object per street would be
 * forty-one fuel reserves reconciling on read to produce a number that
 * is the same for all of them.
 *
 * ⭐ It also gives the civic half its honest shape: **the town's fuel
 * bill is one figure in one place.** A town does not track lamps. It
 * funds a service, and finds out it is short when the streets go dark.
 *
 * ## ⚠ The escape hatch, and it is the shipped pattern
 *
 * Forestry ships **four representations of a tree** — a place, a
 * slot-plant, a record, a prop — chosen by what the fiction needs at
 * that spot. If a later build wants an individual lamp smashed, doused
 * or climbed, **that** lamp becomes a prop at **that** spot and every
 * other street keeps the property. A second representation where
 * something acts on it; not forty-one of them on the chance.
 *
 * ⭐ The rule this generalizes to: **a light is an OBJECT where somebody
 * acts on it, and a PROPERTY where the town runs it.** Indoors is where
 * objects earn their place — a tavern's lamp and a hearth are things
 * you ignite, feed and run out of.
 *
 * Composed on `CartesianLocation`, over `Detailed` (the detail line
 * needs somewhere to live) — not on `Location` (no `Detailed` there)
 * and not on `FurnishableRoom` (interiors are where objects earn their
 * place). Inert unless a row declares it.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import { CelestialApi } from '../../api/celestial';
import { AddressApi } from '../../api/address';

/**
 * What a street says about the service the town runs on it.
 *
 * ⚠ Note what is NOT here: whether it is lit. That is derived from the
 * hour and from whether the extent paid, and a street that could
 * declare itself lit would be the authored-effect problem again.
 */
export interface PublicLightingSpec {
  /** Lumens the service puts on this street while it is burning. */
  flux: number;
  /** Colour temperature of that light, K. Optional. */
  colorTemperature?: number;
  /** The detail id the lamps answer to — what `look at lamps` binds. */
  detail: string;
  /**
   * ⭐ Where this street sits in the order the town lights them, lowest
   * first. **The preference is recorded in ADVANCE**, which is what
   * makes going short a matter of arithmetic rather than a judgement
   * about anybody at the moment of refusal — the watershed's rule for
   * a quota, applied to a service.
   */
  seniority: number;
}

/** Public shape added by PublicLightingMixin. */
export interface PublicLighting {
  getPublicLighting(): PublicLightingSpec | null;
  /** Is the service burning on this street right now? */
  isPubliclyLitNow(): boolean;
  /** The flux the service contributes right now (0 when unlit). */
  publicLightingFlux(): number;
  /** The covering locality's path, resolved once at postRegister. */
  getLightingLocalityPath(): string | null;
}

export function PublicLightingMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase,
) {
  return class PublicLightingMixin extends Base implements PublicLighting {
    static _mixinName: string = 'PublicLightingMixin';

    static fieldMeta: FieldMeta = {
      publicLighting: { persistent: true, authorable: true },
    };

    /** What the town runs here, or `null` — the ordinary case. */
    public publicLighting: PublicLightingSpec | null = null;

    /**
     * The covering locality's template path, resolved ONCE at
     * `postRegister` because `AddressApi.resolveLocalityFor` is async
     * and the light walk is not. Transient: re-resolved every boot.
     */
    private _lightingLocalityPath: string | null = null;

    public getPublicLighting(): PublicLightingSpec | null {
      return this.publicLighting;
    }

    public getLightingLocalityPath(): string | null {
      return this._lightingLocalityPath;
    }

    public async postRegister(): Promise<void> {
      const sup = (Base.prototype as { postRegister?: () => Promise<void> })
        .postRegister;
      if (typeof sup === 'function') await sup.call(this);
      if (this.publicLighting === null) return;
      try {
        const locality = await AddressApi.resolveLocalityFor(
          this as unknown as never,
        );
        this._lightingLocalityPath = locality?.getTemplatePath() ?? null;
      } catch {
        this._lightingLocalityPath = null;
      }
    }

    /**
     * ⭐ Lit iff **the street declares the service**, **it is dark
     * enough to need it**, and **the extent paid for this street
     * tonight**. Three conditions, all derived, none authored.
     */
    public isPubliclyLitNow(): boolean {
      if (this.publicLighting === null) return false;
      if (CelestialApi.skyFactorNow() >= CelestialApi.lampDuskFactor()) {
        return false; // it is daylight; the lamps are out
      }
      const path = (this as unknown as Stuff).getTemplatePath();
      if (path === null) return false;
      return AddressApi.isStreetLitTonight(this._lightingLocalityPath, path);
    }

    /** The flux the service contributes right now (0 when unlit). */
    public publicLightingFlux(): number {
      return this.isPubliclyLitNow() ? (this.publicLighting?.flux ?? 0) : 0;
    }

    /**
     * ⭐ The lamps, in prose. Three states and every one of them is a
     * true sentence about the world: burning, standing cold because
     * nobody lit them tonight, or out because it is daylight.
     *
     * ⚠ *"standing cold"*, never *"broken"* and never *"there are
     * none"*. An unlit lamp on a funded street is a service that has
     * lapsed, and a player who looks at it should be able to tell that
     * apart from a street the town never lit — which is why a street
     * with no `publicLighting` has no detail here at all.
     */
    public getDetail(
      id: string,
      senseOrParent?: unknown,
      parent?: unknown,
    ): string | null {
      const base = (
        Base.prototype as {
          getDetail?: (
            i: string,
            s?: unknown,
            p?: unknown,
          ) => string | null;
        }
      ).getDetail?.call(this, id, senseOrParent, parent) ?? null;
      const spec = this.publicLighting;
      if (!spec || id !== spec.detail || senseOrParent !== undefined) {
        return base;
      }
      const live =
        CelestialApi.skyFactorNow() >= CelestialApi.lampDuskFactor()
          ? 'The lamps are out; it is daylight.'
          : this.isPubliclyLitNow()
            ? 'The lamps are burning.'
            : 'The lamps stand cold — nobody has lit them tonight.';
      return base ? `${base} ${live}` : live;
    }
  };
}
