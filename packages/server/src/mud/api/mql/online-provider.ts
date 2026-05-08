/**
 * Online-holders provider — module-private setter shared by
 * `resolver.ts` (the `online` / `world` seeds) and `predicates.ts`
 * (the `online` predicate).
 *
 * The MQL pipeline lives on `command.ts`'s eager import path through
 * `MqlApi`; importing `ConnectionApi` from anywhere on that chain
 * forces the `ConnectionManager → Interactive → Idea` cycle to
 * deadlock when test files lead with `import { Idea }`. Two-step
 * indirection keeps the chain clean: this module exposes a setter,
 * and `mql/online-wire.ts` (NOT imported by `mql.ts` or any module
 * on the eager chain) imports `ConnectionApi` and registers the
 * provider.
 *
 * Production code installs the provider once at boot; test contexts
 * that exercise `online` / `world` features import the wire module
 * to opt in.
 */

import type { Stuff } from '../../lib/stuff/Stuff';

let _provider: (() => Stuff[]) | null = null;

/**
 * Register the function that returns the current set of online
 * command-givers (the `holder` Stuff for each connected interactive).
 * Pass `null` to clear, e.g., between tests.
 */
export function setOnlineHoldersProvider(
  fn: (() => Stuff[]) | null
): void {
  _provider = fn;
}

/**
 * Read the current set of online holders. Returns an empty array
 * when no provider is registered — `online` queries simply yield no
 * matches in that state (still a successful resolve).
 */
export function getOnlineHolders(): Stuff[] {
  return _provider ? _provider() : [];
}
