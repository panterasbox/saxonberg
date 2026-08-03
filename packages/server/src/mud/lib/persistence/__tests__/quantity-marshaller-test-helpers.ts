/**
 * Test seam: install all v1 quantity-marshaller singletons under
 * their canonical templatePaths so `StuffApi.findByTemplatePath`
 * resolves them. Production seeds the same set via `SeederManager`
 * at boot; tests bypass Mongo and register the marshallers in-
 * memory directly.
 *
 * Call once in `beforeEach` (paired with `StuffApi.clearAll()` in
 * `afterEach`) for any test that exercises a marshaller-bound
 * field or prop. New v1 units add to the list here.
 *
 * Lives under `__tests__/` without a `.test.ts` suffix so vitest's
 * default include glob skips it; it's only imported explicitly by
 * tests.
 *
 * @internal — do not import from production code.
 */

import { QuantityMarshaller } from '../../../obj/persistence/QuantityMarshaller';
import { QuantityApi } from '../../../api/quantity';
import type { Unit } from '../../quantity';
import { registerMarshallerForTest } from '../../security/__tests__/test-setup';

const V1_QUANTITY_UNITS: ReadonlyArray<Unit> = [
  'kg',
  'g/mol',
  'kg/m³',
  'lumen',
  'lux',
  'K',
  'Pa',
  '%',
  // The vital-sign units. Needed by any test that round-trips a body
  // through the persistence spine — a Creature stores heart rate in `bpm`
  // and blood pressure in `mmHg`.
  'bpm',
  'mmHg',
  'm/s²',
  'm',
  'm³',
  'ppm',
  'dB',
  'Hz',
  'L',
  'mL',
  'cup',
  'W/(m·K)',
  'J/(kg·K)',
  'clo',
  'm/s',
  'MPa',
  'MJ/m³',
];

/**
 * Register every v1 QuantityMarshaller. Idempotent within a single
 * test (StuffApi rejects duplicate registrations); pair with
 * `StuffApi.clearAll()` between tests.
 */
export function installV1QuantityMarshallers(): void {
  for (const unit of V1_QUANTITY_UNITS) {
    registerMarshallerForTest(() => {
      const m = new QuantityMarshaller<typeof unit>();
      (m as unknown as { unit: Unit }).unit = unit;
      return m;
    }, QuantityMarshaller.pathFor(unit));
  }
}

/**
 * Load the v1 tag tables from the production YAML config. Tests
 * that exercise tag lookup (`Quantity.tag()`,
 * `Quantity.parse(tagString)`, `Quantity.fromTag()`,
 * `bandFor(lux)`) call this in `beforeEach` so the registry is
 * populated.
 *
 * In production, `AppBootstrap` does the same load. Splitting the
 * helper from `installV1QuantityMarshallers` keeps the concerns
 * orthogonal — a test that only exercises Quantity instances (no
 * marshallers, no setProp paths) calls only this; a test that
 * round-trips through marshalling calls both.
 */
export function installV1QuantityTagTables(): void {
  QuantityApi.loadTagTables();
}
