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

import { QuantityMarshaller } from '../QuantityMarshaller';
import type { Unit } from '../../quantity';
import { registerMarshallerForTest } from '../../security/__tests__/test-setup';

const V1_QUANTITY_UNITS: ReadonlyArray<Unit> = [
  'kg',
  'g/mol',
  'kg/m³',
  'lumen',
  'lux',
  'K',
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
