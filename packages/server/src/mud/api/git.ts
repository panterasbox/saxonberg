/**
 * GitApi — the gated in-runtime VCS surface: turn runtime source edits
 * into commits pushed to GitLab, without opening any new authorization
 * surface. Every operation is scoped to the files the acting avatar could
 * write directly (the same `can('write', resolveSourceFolderZone(path))`
 * gate the source-write path uses); reads are wizard-tier.
 *
 * Two surfaces drive this one gated core — the `git` shell verb and the
 * CMS git panel — neither reimplements the mechanism or the gate. The
 * acting principal is derived inside {@link GitLogic} from the execution
 * context (`getActingAuthor`), **never a caller-supplied argument**, so a
 * privileged-Avatar reference cannot be substituted for the gate's
 * subject. The shared push credential (`GITLAB_PUSH_TOKEN`) and the
 * synthetic per-avatar commit author-email are hard-derived inside the
 * logic, never caller-supplied.
 *
 * Thin, security-gated forwarding shell — structural copy of
 * `source-tree.ts` / `diagnostics.ts`. The mechanism lives in the
 * hot-reloadable {@link GitLogic} singleton at `/obj/api/git`, reached
 * synchronously via `StuffApi.singletonSync`. `dest /obj/api/git` reloads
 * it. The error its surface throws (`GitError`) is homed here (a class
 * export, allowed by export discipline), so `GitRoutes` can
 * `instanceof`-narrow without importing the logic.
 */

import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { GitLogic } from '../obj/api/GitLogic';
import { fileURLToPath } from 'url';
import type {
  GitStatusResult,
  GitDiffResult,
  GitLogEntry,
  GitPublishResult,
  GitRevertResult,
  GitErrorCode,
} from '@saxonberg/types';

export type {
  GitFileStatus,
  GitStatusResult,
  GitDiffResult,
  GitLogEntry,
  GitPublishResult,
  GitRevertResult,
  GitErrorCode,
  GitErrorBody,
} from '@saxonberg/types';

/**
 * The single error class the git surface throws. The REST layer maps
 * `code` to an HTTP status:
 *   - `denied`        → 403
 *   - `bad-ref`       → 400
 *   - `nothing-to-do` → 400
 *   - `conflict`      → 409
 *   - `push-rejected` → 409
 *   - `not-a-repo`    → 404
 *
 * No new `lib/git/` module: this error lives with the surface that
 * throws it. **A `GitError` message must never carry the push token** —
 * `GitLogic` sanitizes any underlying git output before wrapping it.
 */
export class GitError extends Error {
  public readonly code: GitErrorCode;
  constructor(code: GitErrorCode, message: string) {
    super(message);
    this.name = 'GitError';
    this.code = code;
  }
}

const LOGIC_PATH = '/obj/api/git';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../obj/api/GitLogic', import.meta.url)
);

/** Resolve the HMR-able GitLogic singleton (sync). */
function logic(): GitLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'GitLogic'
      ) as typeof GitLogic | null) ?? GitLogic)()
  );
}

export class GitApi {
  private constructor() {}

  /**
   * The working-tree status: current branch, tracking/divergence summary,
   * the dirty set, and non-blocking warnings. Wizard-tier (reads engine
   * source state). Throws `GitError('not-a-repo')` off a git working
   * tree, `GitError('denied')` for a non-wizard.
   *
   * Takes **no `actor` argument by design** — the acting principal is
   * resolved from the execution context inside the logic.
   */
  public static status(): Promise<GitStatusResult> {
    return logic().status();
  }

  /**
   * A unified diff of the working tree, optionally scoped to one path
   * (repo-relative or source-logical — both are accepted and normalized).
   * Wizard-tier.
   */
  public static diff(pathArg?: string): Promise<GitDiffResult> {
    return logic().diff(pathArg);
  }

  /** Recent commits (whole-branch, or path-filtered). Wizard-tier. */
  public static log(opts?: {
    limit?: number;
    pathArg?: string;
  }): Promise<GitLogEntry[]> {
    return logic().log(opts);
  }

  /**
   * Snapshot-and-push: stage **only** the dirty files in zones the actor
   * may write, commit them `--author`'d to the acting avatar, and push the
   * current branch. Files the actor may not write are left dirty
   * (`skippedPaths`). A push rejection (protected branch / non-fast-forward)
   * leaves the commit durable locally (`pushed:false`, re-pushable). Write
   * tier.
   */
  public static publish(message: string): Promise<GitPublishResult> {
    return logic().publish(message);
  }

  /**
   * Additive rollback: revert a commit, scoped to files the actor may
   * write. A commit touching **any** path outside the actor's write
   * permission is rejected (`GitError('denied')`); no partial revert.
   * Write tier.
   */
  public static revert(sha: string): Promise<GitRevertResult> {
    return logic().revert(sha);
  }
}
