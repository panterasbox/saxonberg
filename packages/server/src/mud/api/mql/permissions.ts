/**
 * MQL permissions — operator/seed access control by tier
 * (req §12). Three tiers:
 *
 *   - `public` — any command-giver. No check.
 *   - `authoring` — giver with authoring rights. Stub for v1
 *     (returns true if the giver carries the admin flag set via
 *     {@link _MqlAdminFlag.grant}).
 *   - `admin` — admin role only. Same flag for v1.
 *
 * The plan calls for a real zone-aware check to land later; the
 * contract here is in place so later work doesn't churn callers.
 *
 * Tests grant the admin flag by setting `_MqlAdminFlag.granter` —
 * deliberate observation seam, not part of the public API.
 */

import type { Stuff } from '../../lib/stuff/Stuff';
import type { CommandGiver } from '../../lib/command/CommandGiver';
import type { PermissionTier } from './types';

export class MqlPermissionError extends Error {
  constructor(
    message: string,
    public readonly operator: string,
    public readonly tier: PermissionTier
  ) {
    super(message);
    this.name = 'MqlPermissionError';
  }
}

/**
 * Test-only seam controlling the admin flag check. Defaults to
 * "no admin"; real zone-aware logic arrives later. Tests that
 * exercise admin-tier seeds (`online`, `world`) must set
 * {@link granter} before running and reset it after.
 *
 * @internal
 */
export const _MqlAdminFlag = {
  /** Function consulted to check whether `giver` is admin. */
  granter: (_giver: Stuff & CommandGiver): boolean => false,
};

/**
 * Throw if `giver` doesn't have the privilege required by `tier`.
 * Returns silently when the check passes. The `operator` argument
 * appears in error messages so players see which token tripped
 * the gate.
 */
export function checkTier(
  tier: PermissionTier,
  operator: string,
  giver: Stuff & CommandGiver
): void {
  if (tier === 'public') return;
  if (_MqlAdminFlag.granter(giver)) return;
  throw new MqlPermissionError(
    `You don't have permission to use '${operator}' here.`,
    operator,
    tier
  );
}
