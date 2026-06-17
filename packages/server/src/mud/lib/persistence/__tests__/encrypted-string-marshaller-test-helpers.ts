/**
 * Test seam: install the singleton `EncryptedStringMarshaller` under its
 * canonical templatePath so `StuffApi.findByTemplatePath` resolves it.
 * Production seeds the same singleton via `SeederManager` at boot; tests
 * bypass Mongo and register it in-memory directly.
 *
 * Call once in `beforeEach` (paired with `StuffApi.clearAll()` in
 * `afterEach`) for any test that round-trips a marshalled token field.
 *
 * Lives under `__tests__/` without a `.test.ts` suffix so vitest's
 * default include glob skips it; it's only imported explicitly by tests.
 *
 * @internal — do not import from production code.
 */

import { EncryptedStringMarshaller } from '../EncryptedStringMarshaller';
import { registerMarshallerForTest } from '../../security/__tests__/test-setup';

/**
 * Register the `EncryptedStringMarshaller` singleton. Pair with
 * `StuffApi.clearAll()` between tests.
 */
export function installEncryptedStringMarshaller(): void {
  registerMarshallerForTest(
    () => new EncryptedStringMarshaller(),
    EncryptedStringMarshaller.templatePath
  );
}
