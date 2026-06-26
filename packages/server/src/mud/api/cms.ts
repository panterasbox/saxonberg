/**
 * CmsApi — the gated structured surface behind the CMS editor.
 *
 * One navigation model over two backends:
 *   - `content` — `Template` docs in the `domain` collection (edit
 *     `data`), via `TemplateApi`.
 *   - `source`  — sandboxed files under `packages/`, via
 *     `SourceTreeApi`.
 *
 * Backend-discriminated node refs (`{backend, path}`); there is **no
 * merged namespace** — the unified-ness is that one Api / one explorer
 * drives both. All cross-backend dispatch, the verbatim write gating
 * (mirrored from `WriteController`), and the save→go-live split (source
 * → `HotReloadApi.reload`; content → re-hydrate live instances via
 * `TemplateApi.restoreFromTemplate`) live in the hot-reloadable
 * {@link CmsLogic} singleton at `/obj/api/cms`, reached synchronously via
 * `StuffApi.singletonSync`. `dest /obj/api/cms` reloads it.
 *
 * Thin, security-gated forwarding shell — structural copy of
 * `source-tree.ts`. The error its surface throws (`CmsError`) is homed
 * here, with the surface (a class export, allowed by export discipline).
 */

import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { SecurityApi } from './security';
import { CmsLogic } from '../obj/api/CmsLogic';
import { fileURLToPath } from 'url';
import type { Stuff } from '../lib/stuff/Stuff';
import type {
  CmsBackend,
  CmsTreeListing,
  CmsReadResult,
  CmsStatResult,
  CmsWriteResult,
} from '@saxonberg/types';

export type {
  CmsBackend,
  CmsNodeKind,
  CmsTreeEntry,
  CmsTreeListing,
  CmsReadResult,
  CmsStatResult,
  CmsWriteRequest,
  CmsWriteResult,
  CmsErrorBody,
} from '@saxonberg/types';

/**
 * The single error class the CMS surface throws for the three
 * application-level failure modes. The REST layer maps `code` to an
 * HTTP status:
 *   - `denied`    → 403
 *   - `not-found` → 404
 *   - `invalid`   → 400
 *
 * Sandbox escapes stay the existing `SourceTreeSandboxError` (which
 * propagates unchanged). No new `lib/cms/` module: this error lives
 * with the surface that throws it.
 */
export class CmsError extends Error {
  public readonly code: 'denied' | 'not-found' | 'invalid';
  constructor(code: 'denied' | 'not-found' | 'invalid', message: string) {
    super(message);
    this.name = 'CmsError';
    this.code = code;
  }
}

const LOGIC_PATH = '/obj/api/cms';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../obj/api/CmsLogic', import.meta.url)
);

/** Resolve the HMR-able CmsLogic singleton (sync). */
function logic(): CmsLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'CmsLogic'
      ) as typeof CmsLogic | null) ?? CmsLogic)()
  );
}

export class CmsApi {
  /**
   * List the immediate children of one node. `path` is `/` for a
   * backend root. Reads are not access-gated in this build (the whole
   * CMS surface is developer-tier); writes are.
   */
  public static listTree(
    actor: Stuff | null,
    backend: CmsBackend,
    path: string
  ): Promise<CmsTreeListing> {
    return logic().listTree(actor, backend, path);
  }

  /**
   * Read the editable body of one leaf. Content → pretty-printed JSON
   * of `template.data` + `templateMeta`; source → raw file bytes +
   * a language hint. Throws `CmsError('not-found')` / `('invalid')`
   * for missing/folder targets; lets `SourceTreeSandboxError`
   * propagate.
   */
  public static read(
    actor: Stuff | null,
    backend: CmsBackend,
    path: string
  ): Promise<CmsReadResult> {
    return logic().read(actor, backend, path);
  }

  /** Lightweight existence/kind probe (no body). */
  public static stat(
    actor: Stuff | null,
    backend: CmsBackend,
    path: string
  ): Promise<CmsStatResult> {
    return logic().stat(actor, backend, path);
  }

  /**
   * Author one leaf — save-is-authoritative. Gates verbatim from
   * `WriteController`, persists, then runs the per-backend go-live
   * step. Throws `CmsError('denied')` on access denial,
   * `('not-found')` for an absent content template, `('invalid')` for
   * malformed JSON; lets `SourceTreeSandboxError` propagate.
   */
  public static write(
    actor: Stuff | null,
    backend: CmsBackend,
    path: string,
    body: string
  ): Promise<CmsWriteResult> {
    return logic().write(actor, backend, path, body);
  }
}

SecurityApi.decorateApiClass(CmsApi);
