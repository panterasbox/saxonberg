/**
 * Test fixture for the `_stampTemplatePath` gate.
 *
 * This file deliberately does NOT match any pattern in
 * `Stuff.#stampGateAllowlist`:
 *
 *   - It's under `mud/api/` but the regex is narrowed to
 *     `mud/api/stuff.(ts|js)` — only the literal `stuff.ts`
 *     file matches.
 *   - It's named `templatePath-bad-caller.ts` — not a
 *     `*.test.ts` file.
 *   - It's not `test-setup.ts`.
 *
 * Calling `_stampTemplatePath` from here should throw. The
 * sibling `templatePath-lockdown.test.ts` imports
 * `stampFromBadCaller` and asserts that.
 */

import { Stuff } from '../../../lib/stuff/Stuff';

/**
 * Tries to stamp a Stuff's `templatePath` from a non-allowlisted
 * module. The gate should reject this with a clear message.
 */
export function stampFromBadCaller(stuff: Stuff, path: string): void {
  Stuff._stampTemplatePath(stuff, path);
}
