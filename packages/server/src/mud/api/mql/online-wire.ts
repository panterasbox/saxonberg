/**
 * Wire-up for the MQL `online` provider — imports `ConnectionApi`
 * and registers a function that walks live interactives back to
 * their holder Stuff. Importing this module is the opt-in for
 * `online` / `world` (and the `:online` predicate) to return real
 * data; without it those features still resolve cleanly but yield no
 * matches.
 *
 * Kept off `command.ts`'s eager import path: the MQL pipeline
 * (`mql.ts` → `mql/resolver.ts`, `mql/predicates.ts`) reads from the
 * provider via `online-provider.ts`'s setter, while THIS module is
 * the single place that imports `ConnectionApi`. Pulling
 * `ConnectionApi` from anywhere on the eager chain forces
 * `ConnectionManager → Interactive → Idea` into a load-time cycle
 * that deadlocks tests starting with `import { Idea }`.
 *
 * Production wires once at boot via `AppBootstrap`; the dedicated
 * MQL test suites that need live online data import this module
 * directly.
 */

import type { Stuff } from '../../lib/stuff/Stuff';
import { ConnectionApi } from '../connection';
import { PlayerApi } from '../player';
import { setOnlineHoldersProvider } from './online-provider';

let _wired = false;

/**
 * Idempotent wiring. Safe to call from both production boot and
 * tests; subsequent calls are no-ops.
 */
export function installOnlineHoldersProvider(): void {
  if (_wired) return;
  _wired = true;
  setOnlineHoldersProvider((): Stuff[] => {
    const out: Stuff[] = [];
    const seen = new Set<string>();
    for (const interactive of ConnectionApi.getAllInteractives()) {
      const holder = interactive.getHolder();
      if (!holder) continue;
      // Present the player's stable FIELD identity, never the vessel
      // they happen to be wearing (sandbox, Decision N: recipient
      // resolution follows identity, not body). Two reasons:
      // `tell alice` must find Alice whether or not she stepped into
      // her circle, and a field-context resolve must not touch a
      // circle-scoped object at all — the boundary would deny the
      // scope-walk's own reads before any filtering could happen.
      // Delivery is redirected to her live body at the delivery seam
      // (`Avatar.handleMessage` forwards while parked).
      const playerId = holder.getPlayerId();
      const identity = playerId
        ? (PlayerApi.findAvatarByPlayerId(playerId) as Stuff | null) ?? holder
        : holder;
      if (seen.has(identity.stuffId)) continue;
      seen.add(identity.stuffId);
      out.push(identity);
    }
    return out;
  });
}
