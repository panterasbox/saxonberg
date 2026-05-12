/**
 * Test fixture for the `_stampZone` gate.
 *
 * This file deliberately does NOT match any pattern in
 * `Stuff.#stampGateAllowlist`:
 *
 *   - It's under `mud/api/` but the regex is narrowed to
 *     `mud/api/stuff.(ts|js)` — only the literal `stuff.ts`
 *     file matches.
 *   - It's named `zone-bad-caller.ts` — not a `*.test.ts` file.
 *   - It's not `test-setup.ts`.
 *
 * Calling `_stampZone` from here should throw. The sibling
 * `zone-lockdown.test.ts` imports `stampZoneFromBadCaller` and
 * asserts that.
 */

import { Stuff } from '../../../lib/stuff/Stuff';
import type { SpatialZone } from '../../../lib/spatial/SpatialZone';

/**
 * Tries to stamp a Stuff's `zone` from a non-allowlisted module.
 * The gate should reject this with a clear message.
 */
export function stampZoneFromBadCaller(
  stuff: Stuff,
  zone: SpatialZone | null
): void {
  Stuff._stampZone(stuff, zone);
}
