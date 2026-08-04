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
 * {@link PressLogic} singleton at `/obj/api/press`, reached
 * synchronously via `StuffApi.singletonSync`. `dest /obj/api/press`
 * reloads it.
 */

import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { PressLogic } from '../obj/api/PressLogic';
import { Release, type ReleaseKind } from '../lib/press/Release';
import type { ReleaseRealm } from '../lib/press/Publisher';
import type { ReleaseRow } from '@saxonberg/types';
import { fileURLToPath } from 'url';
import { SecurityApi } from './security';

export { Release };
export type { ReleaseRealm, ReleaseKind };
// The wire projection now lives in `@saxonberg/types` (the shared client
// surface landed in Phase 3); re-exported here for server callers that
// import it from the Api face.
export type { ReleaseRow };

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
  realm?: ReleaseRealm;
  kind?: ReleaseKind;
  pinned?: boolean;
  /** Expiry, epoch-ms; `0` / omitted = never expires. */
  expiresAt?: number;
}

/** The editable subset of a release (the `edit` patch). */
export interface ReleasePatch {
  headline?: string;
  body?: string;
  realm?: ReleaseRealm;
  kind?: ReleaseKind;
  pinned?: boolean;
  expiresAt?: number;
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

const LOGIC_PATH = '/obj/api/press';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../obj/api/PressLogic', import.meta.url)
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
   * Boot seam (idempotent). A thin warm/activation mirror of the other
   * `*Api.boot()` call sites — the board itself warms via its manifest
   * `postRegister`, and the frame fan-out is inline (Phase 3), so there is
   * no event tap to install. Wired from `AppBootstrap.run()`.
   */
  public static boot(): void {
    logic().boot();
  }

  /**
   * Publish a new release. The author is resolved from the execution
   * context (the publishing avatar's durable `templatePath`) — never
   * caller-supplied. Returns the persisted {@link Release}.
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
    return {
      releaseId: release.getReleaseId(),
      realm: release.getRealm(),
      kind: release.getKind(),
      headline: release.getHeadline(),
      body: release.getBody(),
      author: author.length > 0 ? author : undefined,
      publishedAt: release.getPublishedAt(),
      pinned: release.isPinned(),
      expiresAt: expiresAt > 0 ? expiresAt : undefined,
    };
  }
}

SecurityApi.decorateApiClass(PressApi);
