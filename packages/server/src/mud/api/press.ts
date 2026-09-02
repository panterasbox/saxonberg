/**
 * PressApi — the gated surface for the press substrate: what publishers
 * put out, and the news ticker that carries it.
 *
 * A {@link Release} is a **`StoredDocument` in the path-addressed tree**
 * (`kind: 'release'`, under its publisher's declared feed branch), owned
 * by the publisher organization rather than by the person who wrote it.
 * The {@link PressBoard} singleton is a warm cache over that tree and owns
 * the live window. This surface is the publish/edit/retract write path
 * plus the `recent` (window) and `archive` (paged history) reads.
 *
 * The publishing **author** is resolved from the execution context inside
 * the logic (never caller-supplied — the gated-API actor-from-context
 * rule); the publishing **organization** is named by the caller, because
 * a person may hold a position at more than one publisher and picking one
 * for them would turn a refusal into a silent downgrade.
 *
 * Thin forwarding shell: the logic lives in the hot-reloadable
 * {@link PressLogic} singleton at `/platform/idea/api/press`, reached
 * synchronously via `StuffApi.singletonSync`. `dest /platform/idea/api/press`
 * reloads it.
 */

import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { PressLogic } from '../platform/idea/api/PressLogic';
import { Release, type ReleaseKind } from '../lib/press/Release';
import type {
  ReleaseRealm,
  ReleaseVisibility,
} from '../lib/press/Publisher';
import type { Stuff } from '../lib/stuff/Stuff';
import type { ReleaseRow, PublicReleaseRow } from '@saxonberg/types';
import { fileURLToPath } from 'url';
import { SecurityApi } from './security';

export { Release };
export type { ReleaseRealm, ReleaseKind, ReleaseVisibility };
// The wire projection now lives in `@saxonberg/types` (the shared client
// surface landed in Phase 3); re-exported here for server callers that
// import it from the Api face.
export type { ReleaseRow, PublicReleaseRow };

/**
 * The publish request — everything an author supplies. The author is NOT a
 * field here: it is derived from the execution context inside the logic.
 */
export interface PublishRequest {
  /**
   * The publisher organization's durable templatePath. Required and never
   * defaulted: which masthead a release goes out under is the caller's
   * statement, not something the engine guesses.
   */
  publisher: string;
  headline: string;
  body?: string;
  kind?: ReleaseKind;
  pinned?: boolean;
  /** Expiry, epoch-ms; `0` / omitted = never expires. */
  expiresAt?: number;
  /**
   * A **narrowing** of the publisher's declared reach; omitted = inherit
   * it. ⚠ There is no widening direction — a `public` here on a `members`
   * publisher is clamped back, by a max over the ordinal rather than by a
   * check that could be forgotten.
   */
  visibility?: ReleaseVisibility;
  /** Where a `repost`'s substance came from. */
  source?: string;
}

// ⚠ `realm` is deliberately NOT a publish field. It derives from the
// publisher, so there is one source rather than a copy that drifts — and
// nobody can claim to speak in-fiction on an operator's feed.

/** The editable subset of a release (the `edit` patch). */
export interface ReleasePatch {
  headline?: string;
  body?: string;
  kind?: ReleaseKind;
  pinned?: boolean;
  expiresAt?: number;
  /** `null` clears the narrowing (back to inheriting the publisher's). */
  visibility?: ReleaseVisibility | null;
  source?: string;
}

/** The archive query — realm/kind filters + `before`/`limit` paging. */
export interface ArchiveQuery {
  realm?: ReleaseRealm;
  kind?: ReleaseKind;
  /** Only rows published strictly before this epoch-ms cursor. */
  before?: number;
  /** Page size (clamped by the logic). */
  limit?: number;
}

const LOGIC_PATH = '/platform/idea/api/press';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../platform/idea/api/PressLogic', import.meta.url)
);

/** Resolve the HMR-able PressLogic singleton (sync). */
function logic(): PressLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'PressLogic'
      ) as typeof PressLogic | null) ?? PressLogic)()
  );
}

export class PressApi {
  private constructor() {}

  /**
   * ⭐ Does `principal` hold **any** publishing position, anywhere? The
   * affordance-level read behind `requiresPublisher`.
   *
   * ⚠ It returns a boolean and **selects nothing** — which is exactly what
   * keeps it from being the banned pick-a-publisher helper, whose shape
   * turns a refusal into a downgrade. The per-publisher check inside
   * `publish` stays authoritative.
   */
  public static holdsAnyPublishingPosition(principal: Stuff | null): boolean {
    return logic().holdsAnyPublishingPosition(principal);
  }

  /**
   * Publish a new release. The author is resolved from the execution
   * context (the publishing avatar's durable `templatePath`) — never
   * caller-supplied; the publisher is named by the caller and **checked**
   * (`mayPublishAs`) before anything is minted or persisted, so a refusal
   * writes nothing at all. Returns the persisted {@link Release}.
   */
  public static publish(req: PublishRequest): Promise<Release> {
    return logic().publish(req);
  }

  /**
   * Edit an existing release in place (by id), merging `patch`. Returns
   * the updated {@link Release}, or `null` if no such id.
   */
  public static edit(
    releaseId: string,
    patch: ReleasePatch
  ): Promise<Release | null> {
    return logic().edit(releaseId, patch);
  }

  /**
   * Retract a release (by id) — a **soft** delete: the document is kept
   * (archive truthfulness) but excluded from the live window. Returns the
   * retracted {@link Release}, or `null` if no such id.
   */
  public static retract(releaseId: string): Promise<Release | null> {
    return logic().retract(releaseId);
  }

  /** The live ticker window (pins-first, recency-ordered), optionally sliced. */
  public static recent(limit?: number): Release[] {
    return logic().recent(limit);
  }

  /**
   * ⭐ The **anonymous** press room: the warm window, filtered to the
   * publishers named in `press.frontPage` and to publicly-visible
   * releases, projected to {@link PublicReleaseRow}.
   *
   * ⚠ Two **independent** filters — placement (on the front page?) and
   * permission (publicly visible?). A publisher can be public and off the
   * front page; a listed publisher can still have a members-only release.
   *
   * ⚠ This is an already-filtered **read**, not a predicate: nothing
   * outside the logic ever sees an unresolved visibility, so there is no
   * way for a caller to get the comparison backwards. It serves the
   * window — no cursor, no paging. A press room is not an archive.
   */
  public static pressRoom(limit?: number): PublicReleaseRow[] {
    return logic().pressRoom(limit);
  }

  /** The paged archive over the tree (realm/kind filtered, recency-desc). */
  public static archive(query: ArchiveQuery): Promise<Release[]> {
    return logic().archive(query);
  }

  /**
   * Project a {@link Release} to its client-facing {@link ReleaseRow}
   * wire shape (the news-ticker row). A pure mapping — the single source of
   * the projection shared by the inline frame fan-out (PressLogic) and
   * the session-establish window (Avatar.enter). Retracted rows are never
   * passed here (the window/fan filter them upstream); `expiresAt === 0` is
   * dropped (never-expires).
   */
  public static toRow(release: Release): ReleaseRow {
    const expiresAt = release.getExpiresAt();
    const author = release.getAuthor();
    const source = release.getSource();
    return {
      releaseId: release.getReleaseId(),
      publisher: release.getPublisher(),
      realm: release.getRealm(),
      kind: release.getKind(),
      headline: release.getHeadline(),
      body: release.getBody(),
      author: author.length > 0 ? author : undefined,
      source: source.length > 0 ? source : undefined,
      publishedAt: release.getPublishedAt(),
      pinned: release.isPinned(),
      expiresAt: expiresAt > 0 ? expiresAt : undefined,
    };
  }
}

SecurityApi.decorateApiClass(PressApi);
