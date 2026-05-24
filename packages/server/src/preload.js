/**
 * Pre-bootstrap entry point. Registers the call-security loader hook
 * BEFORE any game-code import, then dynamically imports the real
 * entry.
 *
 * Why this file exists: ESM hoists every `import` to the top of the
 * module, so a `register()` call in the body of `index.ts` runs AFTER
 * the entire transitive import graph is already resolved — by which
 * point the loader can't see any of the eagerly-imported modules and
 * can't stamp them. Splitting register-then-dynamic-import is the
 * standard pattern.
 *
 * Plain JS for the same reason as the loader files themselves (see
 * loader-hook.js header): `module.register()` only accepts a JS module
 * URL.
 *
 * Skipped under Vitest: Vitest uses its own pipeline (callSecPlugin)
 * and doesn't run this entry.
 */

import { register } from 'node:module';
if (!process.env.VITEST) {
  register('./services/loader/loader-hook.js', import.meta.url);
}

const { main } = await import('./index.js');
await main();
