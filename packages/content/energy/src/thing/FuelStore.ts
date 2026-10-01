/**
 * FuelStore — ⭐⭐ **a gas-lit town's oil, and the goods leg of its
 * street-lighting bill.**
 *
 * A `Holder` (matter that holds matter, and is itself held — a warehouse,
 * not a chest: no chattel identity, `fixedInPlace`) that keeps casks of lamp
 * oil in a public-works yard. At each dusk the locality's settle hands it the
 * night's candidate streets in seniority order and asks it to
 * {@link lightStreets}; it burns `fuelPerStreetNight` litres per street it can
 * cover, in that order, until the casks run dry — so a town that has not
 * bought enough oil watches its junior streets stand cold, the way a short
 * treasury already darkens them.
 *
 * ⭐ It implements the kernel's `StreetLightingSupply` (the goods leg the
 * street-lighting bill was missing) and `SupplyReporting` (so `analyze` reads
 * its litres and nights of oil). The kernel never imports it — the locality
 * resolves it by `StuffApi.singleton` and narrows by shape.
 *
 * ⚠ `Holder` already carries `Detailed` / `Containable` / `Tangible` (via
 * `Thing`), so there is no `DetailedMixin(Holder)` to compose — the plan's
 * D10 said so before the narrowing put `Detailed` on the chain; extending
 * `Holder` is enough.
 */

import Holder from '@saxonberg/server/mud/lib/stuff/Holder';
import { PostRegistrationMixin } from '@saxonberg/server/mud/lib/stuff/PostRegistration';
import { SingletonMixin } from '@saxonberg/server/mud/lib/stuff/Singleton';
import { StagedMixin } from '@saxonberg/server/mud/lib/stuff/Staged';
import { AddressApi } from '@saxonberg/server/mud/api/address';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import type {
  StreetLightingSupply,
  SupplyReport,
  SupplyReporting,
  SupplyState,
} from '@saxonberg/server/mud/lib/supply/SupplyState';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';

/** Litres per street-night when the covering locality declares none. */
const DEFAULT_LITRES_PER_STREET = 2;

/** The tag a cask's interior must carry to count as burnable oil. */
const OIL_TAG = 'lamp-oil';

// ⭐ One store per town (`SingletonMixin` — a distinct templatePath per
// locality, so `StuffApi.singleton(<store path>)` resolves it reliably from
// the settle and the props once-guard is safe); `StagedMixin` so a row can
// declare its founding casks (`props:`); `PostRegistrationMixin` for the
// locality-rate resolution.
const FuelStoreBase = PostRegistrationMixin(StagedMixin(SingletonMixin(Holder)));

export default class FuelStore
  extends FuelStoreBase
  implements StreetLightingSupply, SupplyReporting
{
  /**
   * Litres burned per street per night, resolved once from the covering
   * locality's `_publicLighting.fuelPerStreetNight` at `postRegister`
   * (transient — re-resolved every boot). The single source of truth is the
   * locality's funding; this is a cache so the settle does not re-resolve.
   */
  private _litresPerStreet: number = DEFAULT_LITRES_PER_STREET;

  static fieldMeta: FieldMeta = {};

  public constructor() {
    super();
    // A town's oil store is not carried off. A row may still override.
    this.fixedInPlace = true;
  }

  public override async postRegister(context?: unknown): Promise<void> {
    await super.postRegister(context);
    try {
      const locality = await AddressApi.resolveLocalityFor(
        this as unknown as never,
      );
      const funding = (
        locality as {
          getPublicLightingFunding?: () => {
            fuelPerStreetNight?: number;
          } | null;
        } | null
      )?.getPublicLightingFunding?.();
      const per = funding?.fuelPerStreetNight;
      if (typeof per === 'number' && per > 0) this._litresPerStreet = per;
    } catch {
      // Keep the default — a store whose locality cannot be resolved still
      // burns oil at the fallback rate rather than serving nothing.
    }
  }

  /** Total litres of lamp oil across the casks this store holds. */
  public getLitresOnHand(): number {
    let total = 0;
    for (const item of this.getContents()) {
      const litres = this.oilLitresIn(item);
      if (litres > 0) total += litres;
    }
    return total;
  }

  /** Litres burned per covered street-night (resolved from the locality). */
  public getLitresPerStreet(): number {
    return this._litresPerStreet;
  }

  // ── StreetLightingSupply ──

  public async lightStreets(
    paths: readonly string[],
    _nowS: number,
  ): Promise<readonly string[]> {
    const per = this._litresPerStreet;
    if (per <= 0) return paths; // no draw set — degenerate, light them all
    const coverable = Math.floor(this.getLitresOnHand() / per);
    const n = Math.min(paths.length, Math.max(0, coverable));
    if (n <= 0) return [];
    this.drainLitres(n * per);
    return paths.slice(0, n);
  }

  /**
   * A fuel store commits the night's oil at the settle, so once a street is
   * lit it stays lit — the dryness shows at the NEXT dusk as fewer streets
   * covered, not as a street going dark mid-evening (that is the grid's
   * failure mode, not oil's).
   */
  public isServingNow(_path: string): boolean {
    return true;
  }

  public lightingSourceLabel(): string {
    return "fed from the town's oil store";
  }

  // ── SupplyReporting ──

  public async supplyReport(_nowS: number): Promise<SupplyReport> {
    const litres = this.getLitresOnHand();
    const per = this._litresPerStreet;
    const nights = per > 0 ? Math.floor(litres / per) : 0;
    const state: SupplyState | null = per > 0 && litres < per ? 'dry' : null;
    return {
      label: "the town's oil store",
      state,
      lines: [
        `${Math.round(litres)} L of lamp oil on hand`,
        per > 0
          ? `about ${nights} street-night${nights === 1 ? '' : 's'} of supply`
          : 'no nightly draw is set',
      ],
    };
  }

  // ── detail ──

  public override getDetail(
    id: string,
    senseOrParent?: unknown,
    parent?: unknown,
  ): string | null {
    const base =
      (
        Holder.prototype as {
          getDetail?: (
            i: string,
            s?: unknown,
            p?: unknown,
          ) => string | null;
        }
      ).getDetail?.call(this, id, senseOrParent, parent) ?? null;
    if (id !== 'oil' && id !== 'casks' && id !== 'store') return base;
    const litres = this.getLitresOnHand();
    const per = this._litresPerStreet;
    const nights = per > 0 ? Math.floor(litres / per) : 0;
    const live =
      litres <= 0
        ? 'The store is dry — not a drop of oil left.'
        : `About ${Math.round(litres)} litres of lamp oil stand racked here — ` +
          `roughly ${nights} more night${nights === 1 ? '' : 's'} of lamps.`;
    return base ? `${base} ${live}` : live;
  }

  // ── internals ──

  /** Litres of burnable lamp oil held as interior bulk by `item`, or 0. */
  private oilLitresIn(item: Stuff): number {
    if (!MixinApi.isBulkable(item) || !item.hasInteriorBulk()) return 0;
    const material = item.getBulkMaterial('interior');
    if (!material?.hasTag(OIL_TAG)) return 0;
    return item.getBulkAmount('interior').rawValue();
  }

  /**
   * Burn `need` litres out of the casks, largest-drawn-first (empty one
   * before opening the next). The oil is consumed — no destination. The
   * casks stay; an emptied one is a cask again, ready to refill.
   */
  private drainLitres(need: number): void {
    let remaining = need;
    for (const item of this.getContents()) {
      if (remaining <= 0) break;
      const have = this.oilLitresIn(item);
      if (have <= 0) continue;
      const take = Math.min(have, remaining);
      if (MixinApi.isBulkable(item)) {
        item.setBulkAmount('interior', Quantity.of(have - take, 'L'));
      }
      remaining -= take;
    }
  }
}
