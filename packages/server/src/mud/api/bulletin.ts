/**
 * BulletinApi — the gated surface for the bulletin substrate: the
 * staff→player broadcast feed (the news ticker).
 *
 * A {@link Bulletin} is authored reference data (the `Recipe` / `Emote`
 * shape); the {@link BulletinBoard} singleton owns the live window; the
 * archive lives in Mongo. This surface is the publish/edit/retract write
 * path plus the `recent` (window) and `archive` (paged history) reads. The
 * publishing author is resolved from the execution context inside the logic
 * (never caller-supplied — the gated-API actor-from-context rule).
 *
 * Thin forwarding shell: the logic lives in the hot-reloadable
 * {@link BulletinLogic} singleton at `/obj/api/bulletin`, reached
 * synchronously via `StuffApi.singletonSync`. `dest /obj/api/bulletin`
 * reloads it.
 */

import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { SecurityApi } from './security';
import { BulletinLogic } from '../obj/api/BulletinLogic';
import {
  Bulletin,
  type BulletinRealm,
  type BulletinKind,
} from '../lib/bulletin/Bulletin';
import { fileURLToPath } from 'url';

export { Bulletin };
export type { BulletinRealm, BulletinKind };

/**
 * The publish request — everything an author supplies. The author is NOT a
 * field here: it is derived from the execution context inside the logic.
 */
export interface PublishRequest {
  headline: string;
  body?: string;
  realm?: BulletinRealm;
  kind?: BulletinKind;
  pinned?: boolean;
  /** Expiry, epoch-ms; `0` / omitted = never expires. */
  expiresAt?: number;
}

/** The editable subset of a bulletin (the `edit` patch). */
export interface BulletinPatch {
  headline?: string;
  body?: string;
  realm?: BulletinRealm;
  kind?: BulletinKind;
  pinned?: boolean;
  expiresAt?: number;
}

/** The archive query — realm/kind filters + `before`/`limit` paging. */
export interface ArchiveQuery {
  realm?: BulletinRealm;
  kind?: BulletinKind;
  /** Only rows published strictly before this epoch-ms cursor. */
  before?: number;
  /** Page size (clamped by the logic). */
  limit?: number;
}

/**
 * The client-facing projection of a bulletin — retracted rows are never
 * projected. (Relocates to `@saxonberg/types` when the wire surface lands
 * in Phase 3.)
 */
export interface BulletinRow {
  bulletinId: string;
  realm: BulletinRealm;
  kind: BulletinKind;
  headline: string;
  body: string;
  author?: string;
  publishedAt: number;
  pinned: boolean;
  expiresAt?: number;
}

const LOGIC_PATH = '/obj/api/bulletin';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../obj/api/BulletinLogic', import.meta.url)
);

/** Resolve the HMR-able BulletinLogic singleton (sync). */
function logic(): BulletinLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'BulletinLogic'
      ) as typeof BulletinLogic | null) ?? BulletinLogic)()
  );
}

export class BulletinApi {
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
   * Publish a new bulletin. The author is resolved from the execution
   * context (the publishing avatar's durable `templatePath`) — never
   * caller-supplied. Returns the persisted {@link Bulletin}.
   */
  public static publish(req: PublishRequest): Promise<Bulletin> {
    return logic().publish(req);
  }

  /**
   * Edit an existing bulletin in place (by id), merging `patch`. Returns
   * the updated {@link Bulletin}, or `null` if no such id.
   */
  public static edit(
    bulletinId: string,
    patch: BulletinPatch
  ): Promise<Bulletin | null> {
    return logic().edit(bulletinId, patch);
  }

  /**
   * Retract a bulletin (by id) — a **soft** delete: the row is kept in
   * Mongo but excluded from the live window. Returns the retracted
   * {@link Bulletin}, or `null` if no such id.
   */
  public static retract(bulletinId: string): Promise<Bulletin | null> {
    return logic().retract(bulletinId);
  }

  /** The live ticker window (pins-first, recency-ordered), optionally sliced. */
  public static recent(limit?: number): Bulletin[] {
    return logic().recent(limit);
  }

  /** The paged archive over Mongo (realm/kind filtered, recency-desc). */
  public static archive(query: ArchiveQuery): Promise<Bulletin[]> {
    return logic().archive(query);
  }
}

SecurityApi.decorateApiClass(BulletinApi);
