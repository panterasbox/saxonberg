/**
 * SourceSlot — ⭐ **a bulk slot held by a place: the water it is beside**
 * (maritime revision 3, T9).
 *
 * `fill pail from river`, `drink from mere`, `wash shirt in river`: the
 * verbs draw from a slot, and a shore is not a vessel — it is cited,
 * never containing (the place does not HOLD the river; making it
 * `Bulkable` would put every bank in `reachable:[mixin.BulkableMixin]` and
 * leak liquid keywords into room scope). So the shore hands out this
 * slot instead, for the water as named, and the bulk substrate learns
 * only *a slot whose holder is not a vessel* — never what a shore is.
 *
 * What it gives is what the water is, there, now: the material the read
 * names (fresh, fouled, salt), at the water's temperature, endlessly
 * (drawing never depletes — a pail is nothing to a river). One that
 * cannot give (frozen, not yet read, which water?, no water in that) is
 * EMPTY and says why in {@link whyEmpty}.
 */

import { BulkSlot, type Bulkable, type BulkPayload, type ClosureLevel } from './Bulkable';
import type { Stuff } from '../stuff/Stuff';
import type Material from '../material/Material';
import type { WaterRead } from '../location/WaterSource';
import { Quantity } from '../quantity';
import { StuffApi } from '../../api/stuff';
// The `hardnessDgh` payload field is declared by Hardness's merge.
import type {} from '../cleanliness/Hardness';

/** What a source slot reads its water through — the shore's own surface. */
export interface SourceSlotPlace {
  /** The current read under `key`, kicking a refresh when stale (sync). */
  peekWaterRead(key: string): WaterRead | null;
  /** Await a current read under `key`. */
  settleWater(key: string): Promise<WaterRead | null>;
}

export class SourceSlot extends BulkSlot {
  /**
   * @param place The shore (a room).
   * @param key The cited feature drawn from, or `null` with a refusal.
   * @param refusal The shore's words when no water was picked.
   */
  constructor(
    private readonly place: Stuff & SourceSlotPlace,
    private readonly key: string | null,
    private readonly refusal: string | null = null,
  ) {
    // The base delegates to a Bulkable host; every member that would is
    // overridden below, so the place is never asked anything bulk-shaped.
    super(place as unknown as Stuff & Bulkable, 'interior');
  }

  private read(): WaterRead | null {
    return this.key === null ? null : this.place.peekWaterRead(this.key);
  }

  public override whyEmpty(): string | null {
    if (this.refusal !== null) return this.refusal;
    const read = this.read();
    if (read === null || read.pending) return 'You cannot tell what you would be drawing yet.';
    if (read.frozen) {
      return `${capitalise(read.name)} is frozen from bank to bank; nothing comes up but ice.`;
    }
    if (read.draw === null) return 'Nothing comes up.';
    return null;
  }

  public override async settle(): Promise<void> {
    if (this.key !== null) await this.place.settleWater(this.key);
  }

  public override getMaterialPath(): string | null {
    return this.whyEmpty() === null ? (this.read()?.draw?.materialPath ?? null) : null;
  }

  public override getMaterial(): Material | null {
    const path = this.getMaterialPath();
    return path === null ? null : (StuffApi.findByTemplatePath<Material>(path) ?? null);
  }

  /** As much as you like — a river is not a vessel. */
  public override getAmount(): Quantity<'L'> {
    return Quantity.of(this.isEmpty() ? 0 : Infinity, 'L');
  }

  public override getCapacity(): Quantity<'L'> | null {
    return null;
  }

  public override getClosure(): ClosureLevel {
    return 'open';
  }

  public override isEmpty(): boolean {
    return this.whyEmpty() !== null;
  }

  public override available(): number {
    return this.isEmpty() ? 0 : Infinity;
  }

  /** ⭐ Drawing never depletes. */
  public override debit(litres: number): void {
    void litres;
  }

  /** What you pour back is lost in it — not designed further (recorded). */
  public override remaining(): number {
    return Infinity;
  }

  public override getPayload(): BulkPayload | null {
    return null;
  }

  /**
   * ⭐ What a pail drawn here carries of the water beyond its matter — its
   * hardness (cleanliness D12), so the Kestrel's water is hard in the
   * copper too.
   */
  public override payloadForDraw(litres: number): BulkPayload | null {
    void litres;
    const dgh = this.getHardnessDgh();
    return dgh === null ? null : { hardnessDgh: dgh };
  }

  /** The water's own hardness, as its read says. */
  public override getHardnessDgh(): number | null {
    if (this.whyEmpty() !== null) return null;
    const dgh = this.read()?.draw?.hardnessDgh;
    return typeof dgh === 'number' && Number.isFinite(dgh) ? dgh : null;
  }

  public override setPayload(payload: BulkPayload | null): void {
    void payload;
  }

  public override setMaterial(material: Material | null): void {
    void material;
  }

  public override setAmount(amount: Quantity<'L'>): void {
    void amount;
  }

  /** The water's own temperature. */
  public override getTemperatureK(): number | null {
    return this.whyEmpty() === null ? (this.read()?.draw?.temperatureK ?? null) : null;
  }
}

function capitalise(s: string): string {
  return s.length === 0 ? s : s[0]!.toUpperCase() + s.slice(1);
}
