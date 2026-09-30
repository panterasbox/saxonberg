/**
 * Pre-bootstrap entry for the composition census — ⭐⭐ **the reason the
 * first census could not answer the question it was built for.**
 *
 * `check-mixin-census.ts` reports every necessity channel it can see and
 * **refuses to report composition**, because a script cannot walk the
 * mixin prototypes: three ways were tried and each failed further in,
 * ending at a module-scope failure in `BoundaryAnchor.ts`. That refusal
 * was honest — a first cut called `PerceiverMixin`, the mixin behind
 * `look`, dead on every channel because 327 class loads had silently
 * failed — but it left the central question of the base-class narrowing
 * work unmeasurable: **does this template need every mixin its base
 * class composes?**
 *
 * The missing piece was never the class graph. It was this file.
 *
 * ESM hoists every `import` to the top of a module, so a `register()`
 * call in the body of a script runs AFTER its entire transitive import
 * graph is resolved — by which point the call-security loader cannot
 * see any eagerly-imported module and cannot stamp it, and the first
 * `FromModule` policy throws. `src/preload.js` splits register-then-
 * dynamic-import for exactly this reason and has since the beginning;
 * the census simply was not run through the same door.
 *
 * Plain JS because `module.register()` only accepts a JS module URL,
 * the same reason `preload.js` and the loader files are.
 *
 * Run it: `pnpm -C packages/server composition-census`.
 */

import { register } from 'node:module';
if (!process.env.VITEST) {
  register('../src/services/loader/loader-hook.js', import.meta.url);
}

await import('./check-composition-census.ts');
