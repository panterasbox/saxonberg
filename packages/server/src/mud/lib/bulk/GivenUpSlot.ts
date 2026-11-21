/**
 * GivenUpSlot — ⭐ **liquid a SOLID gives up, as a slot** (matter-model-
 * overlaps D10): a burst pipe's water, molasses running off a loaf, a heap's
 * run-off — `BulkableApi.drip`'s `{ off }` form. The one transfer draws from
 * a slot, so the solid's matter is handed out as one: its own liquid, so
 * long as it lasts, at the solid's temperature. Nothing is written back to
 * the solid — it has no interior; what it gave is its host's business.
 *
 * ⚠ **The `SourceSlot` shape** (a slot whose holder is not a vessel): the
 * base delegates every read and write to a `Bulkable` host, and the solid
 * is not one. So EVERY member of {@link BulkSlot} that would ask the host
 * is overridden here — `getTemperatureK` · `whyEmpty` · `settle` ·
 * `getMaterialPath` · `getMaterial` · `getAmount` · `getCapacity` ·
 * `getClosure` · `isEmpty` · `available` · `debit` · `remaining` ·
 * `getPayload` · `payloadForDraw` · `setPayload` · `setMaterial` ·
 * `setAmount`; only `getHolder` (the solid, which is what a drip asks
 * "what is under you?" of) and `affordance` are the base's.
 * `GivenUpSlot.test.ts` fails the day `BulkSlot` gains a member this class
 * does not override, so the cast in the constructor cannot rot silently.
 */

import { BulkSlot, type Bulkable, type BulkPayload, type ClosureLevel } from './Bulkable';
import type { Stuff } from '../stuff/Stuff';
import type Material from '../material/Material';
import { Quantity } from '../quantity';
import { MixinApi } from '../../api/mixin';

export class GivenUpSlot extends BulkSlot {
  constructor(
    private readonly solid: Stuff,
    private readonly matter: Material,
    private litres: number,
    private readonly payload: BulkPayload | null,
  ) {
    // The base's host is never asked anything bulk-shaped: every member
    // that would is overridden below (pinned by GivenUpSlot.test.ts).
    super(solid as unknown as Stuff & Bulkable, 'interior');
  }
  public override getTemperatureK(): number | null {
    return MixinApi.isThermal(this.solid) ? this.solid.getTemperature().rawValue() : null;
  }
  public override whyEmpty(): string | null {
    return null;
  }
  public override settle(): Promise<void> {
    return Promise.resolve();
  }
  public override getMaterialPath(): string | null {
    return this.isEmpty() ? null : this.matter.getTemplatePath();
  }
  public override getMaterial(): Material | null {
    return this.isEmpty() ? null : this.matter;
  }
  public override getAmount(): Quantity<'L'> {
    return Quantity.of(Math.max(0, this.litres), 'L');
  }
  public override getCapacity(): Quantity<'L'> | null {
    return null;
  }
  public override getClosure(): ClosureLevel {
    return 'open';
  }
  public override isEmpty(): boolean {
    return !(this.litres > 0);
  }
  public override available(): number {
    return Math.max(0, this.litres);
  }
  public override debit(litres: number): void {
    this.litres -= litres;
  }
  public override remaining(): number {
    return 0;
  }
  public override getPayload(): BulkPayload | null {
    return this.payload;
  }
  public override payloadForDraw(_litres: number): BulkPayload | null {
    return this.payload;
  }
  public override setPayload(_payload: BulkPayload | null): void {}
  public override setMaterial(_material: Material | null): void {}
  public override setAmount(amount: Quantity<'L'>): void {
    this.litres = amount.rawValue();
  }
}
