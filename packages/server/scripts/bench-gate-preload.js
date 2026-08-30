/**
 * Preload for `bench-gate.ts` — registers the call-security loader hook
 * before any game code is imported, exactly as `src/preload.js` does for
 * the server. Without it no class carries a module stamp and every
 * `FromModule` gate denies.
 */
import { register } from 'node:module';
register('../src/services/loader/loader-hook.js', import.meta.url);
await import('./bench-gate.ts');
