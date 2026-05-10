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
 */

import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SecurityApi } from './security';

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

/**
 * Thrown when an operation's resolved path escapes the configured
 * sandbox root.
 */
export class SourceTreeSandboxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SourceTreeSandboxError';
  }
}

export class SourceTreeApi {
  /**
   * Cached sandbox root. Computed once per process from the location
   * of this module — `dist/` and `src/` both resolve to the same
   * `packages/` ancestor, so the cache is correct across both build
   * artifacts and dev mode.
   */
  static #root: string | null = null;

  /**
   * Return the absolute path to the sandbox root. Memoised.
   *
   * Discovery: walk up from `__dirname` (this module's directory)
   * until we find a directory named `packages`; its parent is the
   * sandbox root. The walk stops at the filesystem root if no
   * `packages` ancestor is found, in which case we throw — the
   * shell's code tree is meaningless without one.
   */
  public static getSandboxRoot(): string {
    if (SourceTreeApi.#root !== null) return SourceTreeApi.#root;
    const here = path.dirname(fileURLToPath(import.meta.url));
    let dir = here;
    while (true) {
      const base = path.basename(dir);
      if (base === 'packages') {
        SourceTreeApi.#root = dir;
        return dir;
      }
      const parent = path.dirname(dir);
      if (parent === dir) {
        throw new Error(
          `SourceTreeApi: could not locate a 'packages' ancestor of ` +
            `${here} — sandbox root is undefined`,
        );
      }
      dir = parent;
    }
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
    const home = opts.home ?? '/';
    let candidate = input;
    if (candidate === '~') {
      candidate = home;
    } else if (candidate.startsWith('~/')) {
      candidate = path.posix.join(home, candidate.slice(2));
    }
    const root = SourceTreeApi.getSandboxRoot();
    const isAbsolute =
      candidate.startsWith('/') || path.isAbsolute(candidate);
    // Inside the sandbox, paths are always rooted at `root` — a
    // leading '/' means "relative to the sandbox root," not OS
    // root. Strip it before joining so `path.resolve` doesn't
    // treat it as absolute.
    const stripped = candidate.startsWith('/')
      ? candidate.slice(1)
      : candidate;
    const cwdRelative = isAbsolute
      ? path.resolve(root, stripped)
      : path.resolve(root, stripCwdLeadingSlash(cwd), stripped);
    const normalised = path.resolve(cwdRelative);
    if (
      normalised !== root &&
      !normalised.startsWith(root + path.sep)
    ) {
      throw new SourceTreeSandboxError(
        `path '${input}' resolves outside the sandbox root`,
      );
    }
    return normalised;
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
    const home = opts.home ?? '/';
    let candidate = input;
    if (candidate === '~') {
      candidate = home;
    } else if (candidate.startsWith('~/')) {
      candidate = path.posix.join(home, candidate.slice(2));
    }
    const joined = candidate.startsWith('/')
      ? candidate
      : path.posix.join(cwd === '' ? '/' : cwd, candidate);
    const normalised = path.posix.normalize(joined);
    // path.posix.normalize('//') → '//', collapse to '/'.
    if (normalised === '/.' || normalised === '') return '/';
    if (normalised === '//') return '/';
    return normalised;
  }

  /**
   * Convert an absolute sandbox-rooted path back to its display
   * form (`/<sub-path>`). Inverse of the leading-`/` semantics in
   * `resolvePath` — used by controllers when echoing a normalised
   * path back to the player.
   */
  public static toDisplayPath(absolute: string): string {
    const root = SourceTreeApi.getSandboxRoot();
    if (absolute === root) return '/';
    if (!absolute.startsWith(root + path.sep)) {
      throw new SourceTreeSandboxError(
        `'${absolute}' is not inside the sandbox root`,
      );
    }
    const tail = absolute.slice(root.length).replaceAll(path.sep, '/');
    return tail.startsWith('/') ? tail : '/' + tail;
  }

  public static async exists(absolutePath: string): Promise<boolean> {
    try {
      await fs.access(absolutePath);
      return true;
    } catch {
      return false;
    }
  }

  public static async isFile(absolutePath: string): Promise<boolean> {
    try {
      const stat = await fs.stat(absolutePath);
      return stat.isFile();
    } catch {
      return false;
    }
  }

  public static async isDir(absolutePath: string): Promise<boolean> {
    try {
      const stat = await fs.stat(absolutePath);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  public static async read(absolutePath: string): Promise<string> {
    return fs.readFile(absolutePath, 'utf8');
  }

  public static async list(absolutePath: string): Promise<DirEntry[]> {
    const ents = await fs.readdir(absolutePath, { withFileTypes: true });
    return ents.map((ent) => ({
      name: ent.name,
      absolutePath: path.join(absolutePath, ent.name),
      isFile: ent.isFile(),
      isDir: ent.isDirectory(),
    }));
  }

  public static async write(
    absolutePath: string,
    content: string,
  ): Promise<void> {
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, content, 'utf8');
  }

  public static async mkdir(absolutePath: string): Promise<void> {
    await fs.mkdir(absolutePath, { recursive: true });
  }

  public static async rm(
    absolutePath: string,
    opts: { recursive?: boolean } = {},
  ): Promise<void> {
    await fs.rm(absolutePath, {
      recursive: !!opts.recursive,
      force: true,
    });
  }

  public static async cp(
    src: string,
    dst: string,
  ): Promise<void> {
    await fs.cp(src, dst, { recursive: true });
  }

  public static async mv(src: string, dst: string): Promise<void> {
    await fs.rename(src, dst);
  }
}

/**
 * Strip a leading `/` from a cwd value before joining onto the
 * sandbox root with `path.resolve`. Sandbox cwds use leading `/`
 * for "relative to sandbox root" semantics; the resolver uses OS
 * conventions where a leading `/` means absolute.
 */
function stripCwdLeadingSlash(cwd: string): string {
  if (cwd.startsWith('/')) return cwd.slice(1);
  return cwd;
}

SecurityApi.decorateApiClass(SourceTreeApi);
