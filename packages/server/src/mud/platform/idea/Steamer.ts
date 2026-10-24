/**
 * Steamer — ⭐ **a ship driven by a fire** (river D29; its own class since
 * the river review, W14). A sailing ship — the Hesper — is a `Ship` and has
 * no firebox; a steamer — the Ostrander — is a `Steamer`, and the author
 * says so by the class its row names.
 *
 * Her fire burns what her `fuel` names, out of the `bunker` on her deck,
 * a billet at a time as the distance takes it (`burnFor`) — at sea as on
 * a river. With the bin empty the fire dies, she loses way, and the water
 * has her (`Voyage`).
 */

import Ship from './Ship';
import { StuffApi } from '../../api/stuff';
import { MixinApi } from '../../api/mixin';
import type { FieldMeta } from '../../lib/mixin';
import type { Stuff } from '../../lib/stuff/Stuff';

/** What her fire burns. */
export interface SteamerFuel {
  /** The material path prefix the bunker's goods must be of (`/stuff/idea/material/wood`). */
  material: string;
  /** kg burned per km at her speed. */
  kgPerKm: number;
}

export default class Steamer extends Ship {
  static fieldMeta: FieldMeta = {
    ...Ship.fieldMeta,
    fuel: { persistent: true, authorable: true },
    fuelDebtKg: { persistent: true },
    bunker: { persistent: true, authorable: true, ref: 'identity:relation' },
  };

  /** What her fire burns. */
  protected fuel: SteamerFuel | null = null;
  /** The prop on her deck the fire is fed from (its row path). */
  protected bunker: string | null = null;
  /** What the fire has burned that no whole billet has paid for yet, kg. */
  protected fuelDebtKg = 0;

  public getFuel(): SteamerFuel | null { return this.fuel ? { ...this.fuel } : null; }
  public setFuel(v: SteamerFuel | null): void { this.fuel = v ? { ...v } : null; }
  public getBunker(): string | null { return this.bunker; }
  public setBunker(v: string | null): void { this.bunker = v ?? null; }
  public setFuelDebtKg(v: number): void { this.fuelDebtKg = Math.max(0, Number(v) || 0); }

  /**
   * Burn the cordwood the km took (D29): billets out of the bunker on her
   * deck, whole, as the fire has eaten them. `false` when there are none.
   */
  override async burnFor(km: number): Promise<boolean> {
    const fuel = this.fuel;
    if (fuel === null) return true;
    this.fuelDebtKg += fuel.kgPerKm * km;
    if (this.bunker === null) return true;
    const bunker = await StuffApi.singleton<Stuff>(this.bunker).catch(() => null);
    if (!bunker || !MixinApi.isContainer(bunker)) return false;
    // ⭐ What a billet is made of is its Material's path (`wood/hazel`
    // under `wood`); a duck-typed `getMaterialPath` matched nothing, so
    // every fire died with a full bin (the drive's pass 10).
    const billets = bunker
      .getContents()
      .filter((x) => MixinApi.isTangible(x) && (x.getMaterial()?.getTemplatePath() ?? '').startsWith(fuel.material));
    while (this.fuelDebtKg > 0) {
      const b = billets.shift();
      if (!b) return false;
      this.fuelDebtKg -= MixinApi.isTangible(b) ? Math.max(0.1, b.getMass().rawValue()) : 1;
      StuffApi.destruct(b);
    }
    return true;
  }
}
