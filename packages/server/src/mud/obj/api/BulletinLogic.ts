// BulletinLogic — the hot-reloadable logic singleton behind BulletinApi.
// (Doc comment lives on the class so @internal lands on the reflection
// TypeDoc emits, not on the module.)
//
// Following the CorpoLogic / PresenceLogic precedent, the gated public
// methods are thin forwarders to module-level `*Impl` functions; internal
// callers use the functions directly so the `FromModule` gate never sees an
// intra-singleton self-call (which it would deny).

import { Idea } from '../../lib/stuff/Idea';
import { CallSecurity, Unshadowable } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import { StuffApi } from '../../api/stuff';
import { SecurityApi } from '../../api/security';
import { ExecutionContextApi } from '../../api/execution-context';
import { TemplatePaths } from '../../lib/paths';
import { Bulletin } from '../../lib/bulletin/Bulletin';
import type BulletinBoard from '../BulletinBoard';
import type {
  PublishRequest,
  BulletinPatch,
  ArchiveQuery,
} from '../../api/bulletin';

const BulletinApiCallers = SecurityPolicies.FromModule(
  'mud/api/bulletin#BulletinApi'
);

/** Default archive page size when the query doesn't specify one. */
const ARCHIVE_DEFAULT_LIMIT = 30;
/** Hard cap on an archive page (a malformed `limit` can't pull the world). */
const ARCHIVE_MAX_LIMIT = 100;

/** The live BulletinBoard singleton, or `null` before it warms. */
function board(): BulletinBoard | null {
  return (
    (StuffApi.findByTemplatePath(
      TemplatePaths.bulletinBoard
    ) as BulletinBoard | null) ?? null
  );
}

/**
 * The publishing author's durable `templatePath`, resolved from the
 * execution context (NEVER caller-supplied — the gated-API actor rule).
 * `null` when there is no consistent acting author, or it carries no
 * templatePath.
 */
function resolveAuthorImpl(): string | null {
  const author = ExecutionContextApi.getActingAuthor();
  if (!author || typeof author !== 'object') return null;
  const tp = (
    author as { getTemplatePath?: () => string | null }
  ).getTemplatePath?.();
  return typeof tp === 'string' && tp.length > 0 ? tp : null;
}

/** Load a bulletin by id from the warm window, falling back to Mongo. */
async function loadImpl(bulletinId: string): Promise<Bulletin | null> {
  const cached = board()?.getBulletin(bulletinId);
  if (cached) return cached;
  const rows = await Bulletin.find<Bulletin>({ bulletinId });
  return rows[0] ?? null;
}

async function publishImpl(req: PublishRequest): Promise<Bulletin> {
  const author = resolveAuthorImpl();
  if (!author) {
    throw new Error(
      'BulletinApi.publish: no acting author in the execution context ' +
        '(fail closed — authorship is derived, never caller-supplied)'
    );
  }
  const b = new Bulletin();
  b.bulletinId = SecurityApi.uuid();
  b.realm = req.realm ?? 'ooc';
  b.kind = req.kind ?? 'notice';
  b.headline = req.headline;
  b.body = req.body ?? '';
  b.author = author;
  b.publishedAt = Date.now();
  b.expiresAt = req.expiresAt ?? 0;
  b.pinned = req.pinned ?? false;
  b.retracted = false;
  await b.save();
  board()?.upsert(b);
  // Phase 3: fan world.bulletin.feed ('upsert') to online viewers.
  return b;
}

async function editImpl(
  bulletinId: string,
  patch: BulletinPatch
): Promise<Bulletin | null> {
  const b = await loadImpl(bulletinId);
  if (!b) return null;
  if (patch.headline !== undefined) b.headline = patch.headline;
  if (patch.body !== undefined) b.body = patch.body;
  if (patch.realm !== undefined) b.realm = patch.realm;
  if (patch.kind !== undefined) b.kind = patch.kind;
  if (patch.pinned !== undefined) b.pinned = patch.pinned;
  if (patch.expiresAt !== undefined) b.expiresAt = patch.expiresAt;
  await b.save();
  board()?.upsert(b);
  // Phase 3: fan world.bulletin.feed ('upsert') to online viewers.
  return b;
}

async function retractImpl(bulletinId: string): Promise<Bulletin | null> {
  const b = await loadImpl(bulletinId);
  if (!b) return null;
  // Soft delete: the row stays in Mongo (archive truthfulness), but the
  // window filters it out. No hard delete.
  b.retracted = true;
  await b.save();
  board()?.upsert(b);
  // Phase 3: fan world.bulletin.feed ('remove') to online viewers.
  return b;
}

function recentImpl(limit?: number): Bulletin[] {
  const window = board()?.recentWindow() ?? [];
  return typeof limit === 'number' && limit >= 0
    ? window.slice(0, limit)
    : window;
}

async function archiveImpl(query: ArchiveQuery): Promise<Bulletin[]> {
  const mongo: Record<string, unknown> = { retracted: false };
  if (query.realm) mongo.realm = query.realm;
  if (query.kind) mongo.kind = query.kind;
  if (typeof query.before === 'number') {
    mongo.publishedAt = { $lt: query.before };
  }
  const rows = await Bulletin.find<Bulletin>(mongo);
  rows.sort((a, b) => b.getPublishedAt() - a.getPublishedAt());
  const limit =
    typeof query.limit === 'number' && query.limit > 0
      ? Math.min(Math.floor(query.limit), ARCHIVE_MAX_LIMIT)
      : ARCHIVE_DEFAULT_LIMIT;
  return rows.slice(0, limit);
}

/**
 * BulletinLogic — the hot-reloadable logic singleton behind
 * {@link BulletinApi}.
 *
 * Lives at `/obj/api/bulletin` (a stateless `Stuff` singleton, no backing
 * `Template`); `BulletinApi`'s public statics forward here via
 * `StuffApi.singletonSync`. The reference data is the `bulletins` collection;
 * the warm window lives on the {@link BulletinBoard} singleton. Internal
 * sub-logic lives in module-private free functions so there are no
 * intra-singleton `this.x()` calls to trip the gate; each public method
 * carries the `FromModule` gate.
 *
 * @internal
 */
@Unshadowable
export class BulletinLogic extends Idea {
  /** See {@link BulletinApi.publish}. */
  @CallSecurity(BulletinApiCallers)
  public publish(req: PublishRequest): Promise<Bulletin> {
    return publishImpl(req);
  }

  /** See {@link BulletinApi.edit}. */
  @CallSecurity(BulletinApiCallers)
  public edit(
    bulletinId: string,
    patch: BulletinPatch
  ): Promise<Bulletin | null> {
    return editImpl(bulletinId, patch);
  }

  /** See {@link BulletinApi.retract}. */
  @CallSecurity(BulletinApiCallers)
  public retract(bulletinId: string): Promise<Bulletin | null> {
    return retractImpl(bulletinId);
  }

  /** See {@link BulletinApi.recent}. */
  @CallSecurity(BulletinApiCallers)
  public recent(limit?: number): Bulletin[] {
    return recentImpl(limit);
  }

  /** See {@link BulletinApi.archive}. */
  @CallSecurity(BulletinApiCallers)
  public archive(query: ArchiveQuery): Promise<Bulletin[]> {
    return archiveImpl(query);
  }

  /**
   * See {@link BulletinApi.boot}. Idempotent warm/activation seam. The
   * board warms via its manifest `postRegister`; the frame fan-out is
   * inline (added Phase 3), so there is no event tap to install here. Kept
   * for call-site symmetry with the other `*Api.boot()` seams.
   */
  @CallSecurity(BulletinApiCallers)
  public boot(): void {
    // Nothing to install yet (see the doc comment).
  }
}
