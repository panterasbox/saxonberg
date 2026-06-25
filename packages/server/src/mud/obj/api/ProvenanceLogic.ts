// ProvenanceLogic — the hot-reloadable logic singleton behind ProvenanceApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { Idea } from '../../lib/stuff/Idea';
import { CallSecurity, Unshadowable } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import AuthoringEvent from '../../lib/standing/AuthoringEvent';
import type { AuthoringEventFields } from '../../lib/standing/AuthoringEvent';
import { WorldClockApi } from '../../api/worldclock';
import { PersistApi } from '../../api/persist';

const ProvenanceApiCallers = SecurityPolicies.FromModule(
  'mud/api/provenance#ProvenanceApi'
);

/** Persistence is a no-op unless Mongo is connected (tests, pre-boot). */
function active(): boolean {
  return PersistApi.isConnected();
}

/**
 * Append one authoring-act row. Append-only — nothing is ever overwritten,
 * so a re-save by a different author leaves a new row and never changes
 * `authorOf`. A module-private free function (no intra-singleton self-call
 * to trip the gate).
 */
async function recordImpl(fields: AuthoringEventFields): Promise<void> {
  if (!active()) return;
  const ev = new AuthoringEvent();
  ev.path = fields.path;
  ev.author = fields.author;
  ev.kind = fields.kind ?? 'save';
  ev.at = fields.at ?? WorldClockApi.getNow().rawValue();
  ev.realAt = fields.realAt ?? Date.now();
  await ev.save();
}

/**
 * Derive the author of a content path: the **earliest** `AuthoringEvent`
 * for `path` (the original author). Ordered by `realAt` ascending so a later
 * save by a different player never changes the answer. `null` when the path
 * has no authoring history (engine / unauthored content).
 */
async function authorOfImpl(path: string): Promise<string | null> {
  if (!active()) return null;
  const rows = await AuthoringEvent.find({ path });
  if (rows.length === 0) return null;
  let earliest = rows[0]!;
  for (const r of rows) if (r.realAt < earliest.realAt) earliest = r;
  return earliest.author;
}

/**
 * ProvenanceLogic — the hot-reloadable logic singleton behind
 * {@link ProvenanceApi}.
 *
 * Lives at `/obj/api/provenance` (a stateless `Stuff` singleton, no backing
 * `Template`); `ProvenanceApi`'s public statics forward here via
 * `StuffApi.singletonSync`. Owns the append-only authorship ledger and the
 * derive-on-read `authorOf`. The dumb-store / smart-consumer framing — and
 * the "authorship is a ledger, never a mutable field" rationale — live on
 * the Api face.
 *
 * @internal
 */
@Unshadowable
export class ProvenanceLogic extends Idea {
  /** See {@link ProvenanceApi.recordAuthoring}. */
  @CallSecurity(ProvenanceApiCallers)
  public async recordAuthoring(fields: AuthoringEventFields): Promise<void> {
    return recordImpl(fields);
  }

  /** See {@link ProvenanceApi.authorOf}. */
  @CallSecurity(ProvenanceApiCallers)
  public async authorOf(path: string): Promise<string | null> {
    return authorOfImpl(path);
  }

  /** See {@link ProvenanceApi.eventsFor}. */
  @CallSecurity(ProvenanceApiCallers)
  public async eventsFor(path: string): Promise<AuthoringEvent[]> {
    if (!active()) return [];
    return AuthoringEvent.find({ path });
  }
}
