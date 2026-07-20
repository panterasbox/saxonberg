/**
 * SourceTreeApi — file-system surface for the on-server shell's
 * `code` tree.
 *
 * Wraps `node:fs/promises` with a single sandbox root: every operation
 * resolves paths against the configured project's `packages/`
 * directory and refuses any path that escapes it. Directory traversal
 * (`..`) is silently honoured by Node's `path.resolve`; the sandbox
 * check after resolution is what catches escape attempts.
 *
 * Exposed surface:
 *   - read / list / exists / isFile / isDir — read-only ops backing
 *     the `cat` / `ls` / `cd` controllers
 *   - write / mkdir / rm / cp / mv — mutating ops backing the `write`
 *     / `mkdir` / `rm` / `cp` / `mv` controllers (step 3)
 *   - resolvePath — `~` expansion + relative-against-cwd + sandbox
 *     enforcement; the entry point every controller threads input
 *     through before reaching for fs
 *
 * v1 surface deliberately does NOT include streaming or large-payload
 * framing — those land alongside the client-side editor handoff.
 *
 * Thin, security-gated forwarding shell: the logic lives in the
 * hot-reloadable {@link SourceTreeLogic} singleton at
 * `/obj/api/source-tree`, reached synchronously via
 * `StuffApi.singletonSync`. `dest /obj/api/source-tree` reloads it.
 */

import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { SourceTreeLogic } from '../obj/api/SourceTreeLogic';
import { fileURLToPath } from 'url';

export { SourceTreeSandboxError } from '../lib/shell/SourceTreeSandboxError';

/**
 * Anatomy of one entry returned by `list()`. Mirrors the slice of
 * `fs.Dirent` we actually use; keeping it narrow keeps callers from
 * coupling to Node's API beyond what they need.
 */
export interface DirEntry {
  /** File name (no path). */
  name: string;
  /** Absolute path inside the sandbox. */
  absolutePath: string;
  isFile: boolean;
  isDir: boolean;
}

const LOGIC_PATH = '/obj/api/source-tree';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../obj/api/SourceTreeLogic', import.meta.url)
);

/** Resolve the HMR-able SourceTreeLogic singleton (sync). */
function logic(): SourceTreeLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'SourceTreeLogic'
      ) as typeof SourceTreeLogic | null) ?? SourceTreeLogic)()
  );
}

export class SourceTreeApi {
  /**
   * Return the absolute path to the sandbox root. Memoised.
   *
   * Discovery: walk up until we find a directory named `packages`;
   * its parent is the sandbox root. The walk stops at the filesystem
   * root if no `packages` ancestor is found, in which case we throw —
   * the shell's code tree is meaningless without one.
   */
  public static getSandboxRoot(): string {
    return logic().getSandboxRoot();
  }

  /**
   * Resolve an absolute path inside the sandbox.
   *
   * Pipeline:
   *   1. `~` (alone or as a leading segment) expands to `home`.
   *   2. Relative paths resolve against `cwd`.
   *   3. The result is normalised (collapsing `..` / `.` segments).
   *   4. The normalised result must lie inside `getSandboxRoot()`;
   *      otherwise throws `SourceTreeSandboxError`.
   *
   * `cwd` and `home` are themselves treated as already-sandboxed
   * paths — callers are expected to maintain that invariant by
   * routing every cwd write through `resolvePath`.
   */
  public static resolvePath(
    cwd: string,
    input: string,
    opts: { home?: string } = {},
  ): string {
    return logic().resolvePath(cwd, input, opts);
  }

  /**
   * Pure logical-path resolution for tree-shaped paths. Same `~` and
   * cwd-relative semantics as {@link resolvePath}, but without the
   * filesystem sandbox check — used for the template tree where
   * paths are virtual identifiers, not OS file paths.
   *
   * Returns a normalised absolute path beginning with `/`. The
   * absence of a sandbox means a `..` segment can resolve to a
   * shorter path, even all the way up to `/`. Callers that need a
   * specific bound enforce it themselves.
   */
  public static joinLogical(
    cwd: string,
    input: string,
    opts: { home?: string } = {},
  ): string {
    return logic().joinLogical(cwd, input, opts);
  }

  /**
   * Convert an absolute sandbox-rooted path back to its display
   * form (`/<sub-path>`). Inverse of the leading-`/` semantics in
   * `resolvePath` — used by controllers when echoing a normalised
   * path back to the player.
   */
  public static toDisplayPath(absolute: string): string {
    return logic().toDisplayPath(absolute);
  }

  public static async exists(absolutePath: string): Promise<boolean> {
    return logic().exists(absolutePath);
  }

  public static async isFile(absolutePath: string): Promise<boolean> {
    return logic().isFile(absolutePath);
  }

  public static async isDir(absolutePath: string): Promise<boolean> {
    return logic().isDir(absolutePath);
  }

  public static async read(absolutePath: string): Promise<string> {
    return logic().read(absolutePath);
  }

  public static async list(absolutePath: string): Promise<DirEntry[]> {
    return logic().list(absolutePath);
  }

  public static async write(
    absolutePath: string,
    content: string,
  ): Promise<void> {
    return logic().write(absolutePath, content);
  }

  public static async mkdir(absolutePath: string): Promise<void> {
    return logic().mkdir(absolutePath);
  }

  public static async rm(
    absolutePath: string,
    opts: { recursive?: boolean } = {},
  ): Promise<void> {
    return logic().rm(absolutePath, opts);
  }

  public static async cp(src: string, dst: string): Promise<void> {
    return logic().cp(src, dst);
  }

  public static async mv(src: string, dst: string): Promise<void> {
    return logic().mv(src, dst);
  }
}
