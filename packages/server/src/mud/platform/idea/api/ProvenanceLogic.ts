// ProvenanceLogic — the hot-reloadable logic singleton behind ProvenanceApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { ApiLogic } from '../../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../../lib/security/decorators';
import { SecurityPolicies } from '../../../lib/security/SecurityPolicies';
import AuthoringEvent from '../../../lib/standing/AuthoringEvent';
import type { AuthoringEventFields } from '../../../lib/standing/AuthoringEvent';
import { WorldClockApi } from '../../../api/worldclock';
import { PersistApi } from '../../../api/persist';
import { ExecutionContextApi } from '../../../api/execution-context';

const ProvenanceApiCallers = SecurityPolicies.FromModule('/api/provenance#ProvenanceApi'
);

/** Persistence is a no-op unless Mongo is connected (tests, pre-boot). */
function active(): boolean {
  return PersistApi.isConnected();
}

/**
 * Derive the authenticated author's durable `templatePath` from the
 * dispatched execution context — NEVER from a caller-supplied value. The
 * acting principal (a Command-frame giver, or a REST `runRoot`'s Avatar
 * principal) is resolved by {@link ExecutionContextApi.getActingAuthor}; we
 * accept it only if it carries a durable `templatePath` (a real authoring
 * identity). `null` for an unattributable context (forced / cross-actor /
 * non-avatar principal) → the save proceeds, just unattributed.
 */
function actingAuthorPath(): string | null {
  const principal = ExecutionContextApi.getActingAuthor() as {
    getTemplatePath?(): string | null;
  } | null;
  return principal?.getTemplatePath?.() ?? null;
}

/**
 * Append one authoring-act row, attributed to the context-derived author.
 * Append-only — nothing is ever overwritten, so a re-save by a different
 * author leaves a new row and never changes `authorOf`. No row is written
 * when the context yields no author (the anti-spoof / unattributable case).
 * A module-private free function (no intra-singleton self-call to trip the
 * gate).
 */
async function recordImpl(fields: AuthoringEventFields): Promise<void> {
  // Resolve the author FIRST (a DB-free execution-context read): an
  // unattributable context records nothing and never touches persistence,
  // so a non-authoring save (no acting avatar) is a pure no-op.
  const author = actingAuthorPath();
  if (!author) return; // unattributable context → record nothing
  if (!active()) return;
  const ev = new AuthoringEvent();
  ev.path = fields.path;
  ev.author = author;
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
 * Lives at `/platform/idea/api/provenance` (a stateless `Stuff` singleton, no backing
 * `Template`); `ProvenanceApi`'s public statics forward here via
 * `StuffApi.singletonSync`. Owns the append-only authorship ledger and the
 * derive-on-read `authorOf`. The write **derives the author from the
 * dispatched execution context** (`ExecutionContextApi.getActingAuthor`) —
 * never a caller-supplied value — so it can't be spoofed; an unattributable
 * context (forced / cross-actor / non-avatar principal) records nothing. The
 * dumb-store / smart-consumer framing — and the "authorship is a ledger,
 * never a mutable field" rationale — live on the Api face.
 *
 * @internal
 */
@Unshadowable
export class ProvenanceLogic extends ApiLogic {
  /**
   * ⭐ Path → its author, as last read (db-performance H6). The producer
   * tap asks who authored the place on EVERY command — one ledger read a
   * command in the W0 drive. The answer is the earliest row, so it changes
   * only when a path gets its first row, which this logic writes; the write
   * drops the path's entry. Instance state: a fresh singleton starts empty.
   */
  private authorMemo = new Map<string, string | null>();

  /** See {@link ProvenanceApi.recordAuthoring}. */
  @CallSecurity(ProvenanceApiCallers)
  public async recordAuthoring(fields: AuthoringEventFields): Promise<void> {
    await recordImpl(fields);
    this.authorMemo.delete(fields.path);
  }

  /** See {@link ProvenanceApi.authorOf}. */
  @CallSecurity(ProvenanceApiCallers)
  public async authorOf(path: string): Promise<string | null> {
    // A circle reads its own marked rows beside the field's: not the memo's view.
    if (ExecutionContextApi.getCircleScope() !== null) return authorOfImpl(path);
    if (this.authorMemo.has(path)) return this.authorMemo.get(path) ?? null;
    const author = await authorOfImpl(path);
    if (active()) this.authorMemo.set(path, author);
    return author;
  }

  /** See {@link ProvenanceApi.eventsFor}. */
  @CallSecurity(ProvenanceApiCallers)
  public async eventsFor(path: string): Promise<AuthoringEvent[]> {
    if (!active()) return [];
    return AuthoringEvent.find({ path });
  }
}
