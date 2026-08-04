// PressLogic — the hot-reloadable logic singleton behind PressApi.
// (Doc comment lives on the class so @internal lands on the reflection
// TypeDoc emits, not on the module.)
//
// Following the CorpoLogic / PresenceLogic precedent, the gated public
// methods are thin forwarders to module-level `*Impl` functions; internal
// callers use the functions directly so the `FromModule` gate never sees an
// intra-singleton self-call (which it would deny).

import { ApiLogic } from '../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import { StuffApi } from '../../api/stuff';
import { SecurityApi } from '../../api/security';
import { ExecutionContextApi } from '../../api/execution-context';
import { PlayerApi } from '../../api/player';
import { MessageApi } from '../../api/message';
import { Mml } from '../../api/mml';
import { MixinApi } from '../../api/mixin';
import { MqlApi } from '../../api/mql';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../../lib/config/AppSettings';
import { DocumentApi } from '../../api/document';
import { EmploymentApi } from '../../api/employment';
import { TemplatePaths } from '../../lib/paths';
import {
  Release,
  RELEASE_DOCUMENT_KIND,
  type ReleaseData,
} from '../../lib/press/Release';
import type { Publisher } from '../../lib/press/Publisher';
import { PressApi } from '../../api/press';
import type PressBoard from '../PressBoard';
import type { Stuff } from '../../lib/stuff/Stuff';
import type {
  PublishRequest,
  ReleasePatch,
  ArchiveQuery,
} from '../../api/press';
import type { ReleaseFeedFrame, PublicReleaseRow } from '@saxonberg/types';

const PressApiCallers = SecurityPolicies.FromModule('/api/press#PressApi'
);

/** The news-ticker fan-out topic — a presence-PUBLIC OOC channel. */
const FEED_TOPIC = 'world.press.feed';

/** Default press-room page size. A press room is not an archive. */
const PRESS_ROOM_DEFAULT_LIMIT = 20;
/** Hard cap on the anonymous read. */
const PRESS_ROOM_MAX_LIMIT = 50;

/** Default archive page size when the query doesn't specify one. */
const ARCHIVE_DEFAULT_LIMIT = 30;
/** Hard cap on an archive page (a malformed `limit` can't pull the world). */
const ARCHIVE_MAX_LIMIT = 100;

/** The live PressBoard singleton, or `null` before it warms. */
function board(): PressBoard | null {
  return (
    (StuffApi.findByTemplatePath(
      TemplatePaths.pressBoard
    ) as PressBoard | null) ?? null
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

/**
 * Fan one already-composed release-feed frame out to every online viewer,
 * presence-PUBLIC: OOC-public, identical for every viewer (NO per-viewer
 * lensing), so the caller composes the payload exactly once. Per-viewer
 * isolation: a bad recipient never aborts the scan. The `sendRosterImpl`
 * precedent, on the `world.press.feed` topic. Unlike the roster (which
 * taps externally-emitted presence events in `SocialApi.boot()`), the
 * release trigger originates inside the mutators below, so this fan is
 * called inline (no event tap).
 */
function fanFeedImpl(frame: ReleaseFeedFrame): void {
  for (const viewer of PlayerApi.getAllAvatars()) {
    if (viewer.isDestroyed() || !viewer.isConnected()) continue;
    try {
      MessageApi.scene(viewer)
        .topic(FEED_TOPIC)
        .toSelf(Mml.fromMarkup(''), frame)
        .send();
    } catch {
      // best-effort relay — drop this viewer, continue the scan
    }
  }
}

/**
 * Every release in the tree — the archive's input, and `load`'s fallback.
 * ⚠ Filtered by `Release.publishedByOwner`: the tree is a shared store, so
 * a `kind: 'release'` document nobody published is not a release. Same
 * filter the warm window applies, in one place.
 */
async function allReleasesImpl(): Promise<Release[]> {
  const docs = await DocumentApi.listOfKind(RELEASE_DOCUMENT_KIND);
  return docs
    .map((doc) => Release.fromDocument(doc))
    .filter((r) => Release.publishedByOwner(r));
}

/** Load a release by id from the warm window, falling back to the tree. */
async function loadImpl(releaseId: string): Promise<Release | null> {
  const cached = board()?.getRelease(releaseId);
  if (cached) return cached;
  const all = await allReleasesImpl();
  return all.find((r) => r.getReleaseId() === releaseId) ?? null;
}

/**
 * Resolve the publisher organization a release is published as. Fails
 * closed: an unresolvable path, or one that is not a publisher, is no
 * publisher at all.
 */
function resolvePublisherImpl(path: string): (Stuff & Publisher) | null {
  if (path.length === 0) return null;
  const organization = StuffApi.findByTemplatePath(path);
  if (!organization || !MixinApi.isPublisher(organization)) return null;
  return organization;
}

/**
 * Persist a release through the **narrow named write transport**, which
 * stamps the publisher organization as the document's owner.
 *
 * ⚠ Not `DocumentApi.save`: that gates on self-home / covering zone /
 * slice-walk, which admits the *parcel owner* rather than the comms
 * director, and making every comms director a landowner is obviously
 * wrong. The transport is gated to this module alone and takes the
 * publisher rather than an owner string — see `DocumentApi.saveRelease`.
 */
async function writeReleaseImpl(
  publisher: Stuff & Publisher,
  release: Release,
): Promise<void> {
  await DocumentApi.saveRelease(
    publisher,
    release.getPath(),
    release.serialize() as unknown as Record<string, unknown>,
  );
}

/**
 * ⭐ Does the acting principal hold **any** publishing position, anywhere?
 * A boolean for affordance — it selects nothing, which is what keeps it
 * from being the banned pick-a-publisher helper: that shape turns a
 * refusal into a downgrade. The per-publisher check in `publishImpl`
 * stays authoritative.
 *
 * Publishers are enumerated viewer-blind over the `PublisherMixin`
 * marker (the `allBusinesses` precedent) — whether you hold a job is not
 * a question about what you can see.
 */
function holdsAnyPublishingPositionImpl(principal: Stuff | null): boolean {
  if (principal === null) return false;
  const publishers = MqlApi.resolveMany('world:[mixin.PublisherMixin]', {
    commandGiver: null,
    scope: 'world',
  }).stuff;
  for (const organization of publishers) {
    if (!MixinApi.isOrganization(organization)) continue;
    if (EmploymentApi.mayPublishAs(principal, organization)) return true;
  }
  return false;
}

async function publishImpl(req: PublishRequest): Promise<Release> {
  const acting = ExecutionContextApi.getActingAuthor() as Stuff | null;
  const author = resolveAuthorImpl();
  if (!author) {
    throw new Error(
      'PressApi.publish: no acting author in the execution context ' +
        '(fail closed — authorship is derived, never caller-supplied)'
    );
  }
  const publisher = resolvePublisherImpl(req.publisher);
  if (!publisher) {
    throw new Error(
      `PressApi.publish: ${req.publisher || '(none)'} is not a publisher`
    );
  }
  const feed = publisher.getFeedPath();
  if (feed.length === 0) {
    throw new Error(
      `PressApi.publish: ${req.publisher} authors no feedPath — a publisher ` +
        'must name the branch its releases live under'
    );
  }

  // ⭐ The entitlement, BEFORE anything is minted or persisted: a refusal
  // writes nothing at all. Holding the organization's appointing
  // authority does not pass this — appointment and exercise are different
  // powers, and the committee that fills the press office's positions
  // cannot publish through it by virtue of being the committee.
  if (
    !MixinApi.isOrganization(publisher) ||
    !EmploymentApi.mayPublishAs(acting, publisher)
  ) {
    throw new Error(
      `PressApi.publish: you hold no publishing position at ${req.publisher}`
    );
  }

  const releaseId = SecurityApi.uuid();
  const data: ReleaseData = {
    releaseId,
    kind: req.kind ?? 'notice',
    headline: req.headline,
    body: req.body ?? '',
    author,
    publishedAt: Date.now(),
    expiresAt: req.expiresAt ?? 0,
    pinned: req.pinned ?? false,
    retracted: false,
    visibility: req.visibility ?? null,
    source: req.source ?? '',
  };
  const release = Release.of(
    `${feed}/${releaseId}`,
    publisher.getTemplatePath() ?? '',
    data
  );
  await writeReleaseImpl(publisher, release);
  board()?.upsert(release);
  fanFeedImpl({
    kind: 'release',
    action: 'upsert',
    row: PressApi.toRow(release),
  });
  return release;
}

async function editImpl(
  releaseId: string,
  patch: ReleasePatch
): Promise<Release | null> {
  const existing = await loadImpl(releaseId);
  if (!existing) return null;
  const publisher = resolvePublisherImpl(existing.getOwner());
  if (!publisher) return null;
  const updated = existing.withPatch({
    ...(patch.headline !== undefined ? { headline: patch.headline } : {}),
    ...(patch.body !== undefined ? { body: patch.body } : {}),
    ...(patch.kind !== undefined ? { kind: patch.kind } : {}),
    ...(patch.pinned !== undefined ? { pinned: patch.pinned } : {}),
    ...(patch.expiresAt !== undefined ? { expiresAt: patch.expiresAt } : {}),
    ...(patch.visibility !== undefined ? { visibility: patch.visibility } : {}),
    ...(patch.source !== undefined ? { source: patch.source } : {}),
  });
  await writeReleaseImpl(publisher, updated);
  board()?.upsert(updated);
  // If the edit pushed the row out of the live window (e.g. `--expires` set
  // to the past), fan a `remove` so clients — which don't filter on expiry —
  // drop it; otherwise fan the updated row. Mirrors `recentWindow`'s liveness.
  const live = !updated.isRetracted() && !updated.isExpiredAt(Date.now());
  fanFeedImpl(
    live
      ? { kind: 'release', action: 'upsert', row: PressApi.toRow(updated) }
      : { kind: 'release', action: 'remove', releaseId }
  );
  return updated;
}

async function retractImpl(releaseId: string): Promise<Release | null> {
  const existing = await loadImpl(releaseId);
  if (!existing) return null;
  const publisher = resolvePublisherImpl(existing.getOwner());
  if (!publisher) return null;
  // Soft delete: the document stays (archive truthfulness), but the window
  // filters it out. No hard delete.
  const updated = existing.withPatch({ retracted: true });
  await writeReleaseImpl(publisher, updated);
  board()?.upsert(updated);
  fanFeedImpl({ kind: 'release', action: 'remove', releaseId });
  return updated;
}

function recentImpl(limit?: number): Release[] {
  const window = board()?.recentWindow() ?? [];
  return typeof limit === 'number' && limit >= 0
    ? window.slice(0, limit)
    : window;
}

/**
 * The paged archive. Filtering moved from a Mongo query to a JS filter
 * over the tree read — the same `documents` full-scan `findByPrefix`
 * already does for a store this size, and the filter/ordering/clamp
 * semantics are unchanged.
 */
async function archiveImpl(query: ArchiveQuery): Promise<Release[]> {
  const rows = (await allReleasesImpl()).filter((r) => {
    if (r.isRetracted()) return false;
    if (query.realm && r.getRealm() !== query.realm) return false;
    if (query.kind && r.getKind() !== query.kind) return false;
    if (typeof query.before === 'number' && r.getPublishedAt() >= query.before) {
      return false;
    }
    return true;
  });
  rows.sort((a, b) => b.getPublishedAt() - a.getPublishedAt());
  const limit =
    typeof query.limit === 'number' && query.limit > 0
      ? Math.min(Math.floor(query.limit), ARCHIVE_MAX_LIMIT)
      : ARCHIVE_DEFAULT_LIMIT;
  return rows.slice(0, limit);
}

/**
 * The publisher organizations the anonymous front page shows, in the
 * order the setting lists them.
 *
 * ⚠ **An entry that does not resolve is skipped AND logged.** A typo
 * would otherwise empty the front page with no signal, and "looking
 * deliberate while empty" is exactly this surface's failure mode. There is
 * no publisher catalogue behind this: the list is short and enumerated, so
 * each entry is resolved by path — a warm catalogue would be machinery
 * with no query to serve.
 */
function frontPagePublishersImpl(): Array<Stuff & Publisher> {
  let raw = '';
  try {
    raw = AppApi.setting(AppSettingKeys.pressFrontPage);
  } catch {
    return [];
  }
  const out: Array<Stuff & Publisher> = [];
  for (const entry of raw.split(',')) {
    const path = entry.trim();
    if (path.length === 0) continue;
    const publisher = resolvePublisherImpl(path);
    if (!publisher) {
      console.warn(
        `PressApi: press.frontPage names '${path}', which is not a live ` +
          `publisher organization — skipped`
      );
      continue;
    }
    out.push(publisher);
  }
  return out;
}

/**
 * The anonymous press room: the warm window, narrowed by **two
 * independent filters**, then sliced.
 *
 * ⚠ The two filters are `placement` (is this publisher on the front page?)
 * and `permission` (is this release publicly visible?). They are separate
 * questions and stay separately applied — a publisher can be public and
 * off the front page, and a listed publisher can still have a
 * members-only release. Collapsing them makes placement imply permission.
 *
 * The visibility clamp is applied by `Release.getVisibility()`, so nothing
 * out here ever sees an unresolved visibility: this is an already-filtered
 * read, not a predicate somebody could call the wrong way round.
 */
function pressRoomImpl(limit?: number): PublicReleaseRow[] {
  const listed = new Map(
    frontPagePublishersImpl().map((p) => [
      (p as Stuff).getTemplatePath() ?? '',
      p,
    ])
  );
  if (listed.size === 0) return [];

  const size =
    typeof limit === 'number' && limit > 0
      ? Math.min(Math.floor(limit), PRESS_ROOM_MAX_LIMIT)
      : PRESS_ROOM_DEFAULT_LIMIT;

  const out: PublicReleaseRow[] = [];
  for (const release of board()?.recentWindow() ?? []) {
    const publisher = listed.get(release.getPublisher());
    if (!publisher) continue; // placement
    if (release.getVisibility() !== 'public') continue; // permission
    const source = release.getSource();
    out.push({
      releaseId: release.getReleaseId(),
      publisher: release.getPublisher(),
      publisherLabel: publisher.getLabel(),
      realm: release.getRealm(),
      kind: release.getKind(),
      ...(source.length > 0 ? { source } : {}),
      headline: release.getHeadline(),
      body: release.getBody(),
      publishedAt: release.getPublishedAt(),
      pinned: release.isPinned(),
    });
    if (out.length >= size) break;
  }
  return out;
}

/**
 * PressLogic — the hot-reloadable logic singleton behind
 * {@link PressApi}.
 *
 * Lives at `/obj/api/press` (a stateless `Stuff` singleton, no backing
 * `Template`); `PressApi`'s public statics forward here via
 * `StuffApi.singletonSync`. Releases live in the **document tree**
 * (`kind: 'release'`, under each publisher's declared feed branch); the
 * warm window lives on the {@link PressBoard} singleton. Internal
 * sub-logic lives in module-private free functions so there are no
 * intra-singleton `this.x()` calls to trip the gate; each public method
 * carries the `FromModule` gate.
 *
 * ⚠⚠ **This module is the sole admitted caller of
 * `DocumentApi.saveRelease`**, the ownership-bypassing write transport.
 * That gate is the transport's blast radius.
 *
 * @internal
 */
@Unshadowable
export class PressLogic extends ApiLogic {
  /** See {@link PressApi.publish}. */
  @CallSecurity(PressApiCallers)
  public publish(req: PublishRequest): Promise<Release> {
    return publishImpl(req);
  }

  /** See {@link PressApi.edit}. */
  @CallSecurity(PressApiCallers)
  public edit(
    releaseId: string,
    patch: ReleasePatch
  ): Promise<Release | null> {
    return editImpl(releaseId, patch);
  }

  /** See {@link PressApi.retract}. */
  @CallSecurity(PressApiCallers)
  public retract(releaseId: string): Promise<Release | null> {
    return retractImpl(releaseId);
  }

  /** See {@link PressApi.holdsAnyPublishingPosition}. */
  @CallSecurity(PressApiCallers)
  public holdsAnyPublishingPosition(principal: Stuff | null): boolean {
    return holdsAnyPublishingPositionImpl(principal);
  }

  /** See {@link PressApi.recent}. */
  @CallSecurity(PressApiCallers)
  public recent(limit?: number): Release[] {
    return recentImpl(limit);
  }

  /** See {@link PressApi.pressRoom}. */
  @CallSecurity(PressApiCallers)
  public pressRoom(limit?: number): PublicReleaseRow[] {
    return pressRoomImpl(limit);
  }

  /** See {@link PressApi.archive}. */
  @CallSecurity(PressApiCallers)
  public archive(query: ArchiveQuery): Promise<Release[]> {
    return archiveImpl(query);
  }

  /**
   * See {@link PressApi.boot}. Idempotent warm/activation seam. The
   * board warms via its manifest `postRegister`; the frame fan-out is
   * inline (added Phase 3), so there is no event tap to install here. Kept
   * for call-site symmetry with the other `*Api.boot()` seams.
   */
  @CallSecurity(PressApiCallers)
  public boot(): void {
    // Nothing to install yet (see the doc comment).
  }
}
