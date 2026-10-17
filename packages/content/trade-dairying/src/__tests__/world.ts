/**
 * Test-local world: a game clock you can move, the quantity marshallers,
 * and vessels built with the fields their rows author.
 */
import { vi } from 'vitest';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import WorldClockRegistry from '@saxonberg/server/mud/platform/idea/WorldClockRegistry';
import {
  installV1QuantityMarshallers,
  installV1QuantityTagTables,
} from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { makeStuff, makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import Good from '@saxonberg/server/mud/lib/stuff/Good';
import { BulkableMixin } from '@saxonberg/server/mud/lib/bulk/Bulkable';
import { ThermalMixin } from '@saxonberg/server/mud/lib/thermal/Thermal';
import type Material from '@saxonberg/server/mud/lib/material/Material';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Bulkable } from '@saxonberg/server/mud/lib/bulk/Bulkable';
import type { Thermal } from '@saxonberg/server/mud/lib/thermal/Thermal';
import { standUpTheTrade } from './rows';

export const HOUR = 3600;
export const DAY = 86_400;

let base = 0;
let clock: ReturnType<typeof vi.spyOn> | null = null;

/** Clock, marshallers and every dairying row. */
export async function standUp(): Promise<void> {
  StuffApi.clearAll();
  installV1QuantityMarshallers();
  installV1QuantityTagTables();
  makeStuffAtPath(() => new WorldClockRegistry(), '/platform/idea/WorldClockRegistry');
  base = WorldClockApi.getNow().rawValue();
  clock = vi.spyOn(WorldClockApi, 'getNow');
  clock.mockReturnValue(Quantity.of(base, 's'));
  await standUpTheTrade();
}

export function tearDown(): void {
  vi.restoreAllMocks();
  StuffApi.clearAll();
}

/** Move the game clock to `s` seconds after stand-up. */
export function at(s: number): void {
  clock?.mockReturnValue(Quantity.of(base + s, 's'));
}

/** A plain pail — the thing you draw into. */
export class TestPail extends ThermalMixin(BulkableMixin(Good)) {
  static _mixinName = 'DairyTestPail';
}

/** Give a bulk vessel its interior, a temperature, and (optionally) a fill. */
export function vessel<T extends Stuff & Bulkable & Thermal>(
  make: () => T,
  capacityL: number,
  tempK: number,
  fill?: { material: Material; litres: number },
): T {
  const v = makeStuff(make);
  (v as unknown as { interiorBulk: boolean }).interiorBulk = true;
  (v as unknown as { setInteriorCapacity(q: Quantity<'L'>): void }).setInteriorCapacity(
    Quantity.of(capacityL, 'L'),
  );
  v.setStampedTemperatureK(tempK);
  v.setLastAmbientK(tempK);
  if (fill) {
    v.setBulkMaterial('interior', fill.material);
    v.setBulkAmount('interior', Quantity.of(fill.litres, 'L'));
  }
  return v;
}
