/**
 * Preload for `bench-gate.ts` — registers the call-security loader hook
 * before any game code is imported, exactly as `src/preload.js` does for
 * the server. Without it no class carries a module stamp and every
 * `FromModule` gate denies. The second hook answers `vitest` with a stub
 * (see `bench-gate-hooks.js`).
 */
import { register } from 'node:module';
// The bench stands the world the way a unit test does (`test-bootstrap`),
// whose `@TestOnly` seams are withheld outside a test environment.
process.env.NODE_ENV ??= 'test';
register('../src/services/loader/loader-hook.js', import.meta.url);
register('./bench-gate-hooks.js', import.meta.url);
await import('./bench-gate.ts');
