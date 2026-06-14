// SourceTreeLogic — the hot-reloadable logic singleton behind
// SourceTreeApi. (Doc comment lives on the class declaration below so
// @internal lands on the reflection TypeDoc emits, not on the module.)

import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Idea } from '../../lib/stuff/Idea';
import { CallSecurity, Unshadowable } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import { SourceTreeSandboxError } from '../../lib/shell/SourceTreeSandboxError';
import type { DirEntry } from '../../api/source-tree';

const SourceTreeApiCallers = SecurityPolicies.FromModule(
  'mud/api/source-tree#SourceTreeApi'
);

/**
 * Cached sandbox root. Computed once per process from the location of
 * THIS module — `dist/` and `src/` both resolve to the same `packages/`
 * ancestor, so the cache is correct across both build artifacts and dev
 * mode. Module-private (process-wide memo, not instance state) so the
 * stateless logic singleton stays stateless across `dest` reloads.
 */
let rootCache: string | null = null;

/**
 * SourceTreeLogic — the hot-reloadable logic singleton behind
 * {@link SourceTreeApi}.
 *
 * Lives at `/obj/api/source-tree` (a stateless `Stuff` singleton, no
 * backing `Template`); `SourceTreeApi`'s public statics forward here via
 * `StuffApi.singletonSync`. Any module that grabs this singleton and
 * calls a method other than through the Api gets `SecurityError`.
 *
 * Stateless by construction (no `PostRegistrationMixin`): the sandbox
 * root is memoised in the module-private `rootCache`, not on the
 * instance. The discovery body shared by `getSandboxRoot`, `resolvePath`,
 * and `toDisplayPath` lives in the module-private `sandboxRoot` free
 * function (off-class, ungated, un-callable from outside), so those
 * methods don't make intra-singleton `this.getSandboxRoot()` self-calls
 * that the gate would deny.
 *
 * The `FromModule` gate is applied **per public method**, not at the
 * class level — see {@link MaterialLogic} for why.
 *
 * @internal
 */
@Unshadowable
export class SourceTreeLogic extends Idea {
  /** See {@link SourceTreeApi.getSandboxRoot}. */
  @CallSecurity(SourceTreeApiCallers)
  public getSandboxRoot(): string {
    return sandboxRoot();
  }

  /** See {@link SourceTreeApi.resolvePath}. */
  @CallSecurity(SourceTreeApiCallers)
  public resolvePath(
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
    const root = sandboxRoot();
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

  /** See {@link SourceTreeApi.joinLogical}. */
  @CallSecurity(SourceTreeApiCallers)
  public joinLogical(
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

  /** See {@link SourceTreeApi.toDisplayPath}. */
  @CallSecurity(SourceTreeApiCallers)
  public toDisplayPath(absolute: string): string {
    const root = sandboxRoot();
    if (absolute === root) return '/';
    if (!absolute.startsWith(root + path.sep)) {
      throw new SourceTreeSandboxError(
        `'${absolute}' is not inside the sandbox root`,
      );
    }
    const tail = absolute.slice(root.length).replaceAll(path.sep, '/');
    return tail.startsWith('/') ? tail : '/' + tail;
  }

  /** See {@link SourceTreeApi.exists}. */
  @CallSecurity(SourceTreeApiCallers)
  public async exists(absolutePath: string): Promise<boolean> {
    try {
      await fs.access(absolutePath);
      return true;
    } catch {
      return false;
    }
  }

  /** See {@link SourceTreeApi.isFile}. */
  @CallSecurity(SourceTreeApiCallers)
  public async isFile(absolutePath: string): Promise<boolean> {
    try {
      const stat = await fs.stat(absolutePath);
      return stat.isFile();
    } catch {
      return false;
    }
  }

  /** See {@link SourceTreeApi.isDir}. */
  @CallSecurity(SourceTreeApiCallers)
  public async isDir(absolutePath: string): Promise<boolean> {
    try {
      const stat = await fs.stat(absolutePath);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  /** See {@link SourceTreeApi.read}. */
  @CallSecurity(SourceTreeApiCallers)
  public async read(absolutePath: string): Promise<string> {
    return fs.readFile(absolutePath, 'utf8');
  }

  /** See {@link SourceTreeApi.list}. */
  @CallSecurity(SourceTreeApiCallers)
  public async list(absolutePath: string): Promise<DirEntry[]> {
    const ents = await fs.readdir(absolutePath, { withFileTypes: true });
    return ents.map((ent) => ({
      name: ent.name,
      absolutePath: path.join(absolutePath, ent.name),
      isFile: ent.isFile(),
      isDir: ent.isDirectory(),
    }));
  }

  /** See {@link SourceTreeApi.write}. */
  @CallSecurity(SourceTreeApiCallers)
  public async write(absolutePath: string, content: string): Promise<void> {
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, content, 'utf8');
  }

  /** See {@link SourceTreeApi.mkdir}. */
  @CallSecurity(SourceTreeApiCallers)
  public async mkdir(absolutePath: string): Promise<void> {
    await fs.mkdir(absolutePath, { recursive: true });
  }

  /** See {@link SourceTreeApi.rm}. */
  @CallSecurity(SourceTreeApiCallers)
  public async rm(
    absolutePath: string,
    opts: { recursive?: boolean } = {},
  ): Promise<void> {
    await fs.rm(absolutePath, {
      recursive: !!opts.recursive,
      force: true,
    });
  }

  /** See {@link SourceTreeApi.cp}. */
  @CallSecurity(SourceTreeApiCallers)
  public async cp(src: string, dst: string): Promise<void> {
    await fs.cp(src, dst, { recursive: true });
  }

  /** See {@link SourceTreeApi.mv}. */
  @CallSecurity(SourceTreeApiCallers)
  public async mv(src: string, dst: string): Promise<void> {
    await fs.rename(src, dst);
  }
}

/**
 * Return the absolute path to the sandbox root. Memoised in
 * `rootCache`. Module-private — shared by `getSandboxRoot`,
 * `resolvePath`, and `toDisplayPath` so there are no intra-singleton
 * self-calls.
 *
 * Discovery: walk up from this module's directory until we find a
 * directory named `packages`; its parent is the sandbox root. The walk
 * stops at the filesystem root if no `packages` ancestor is found, in
 * which case we throw — the shell's code tree is meaningless without
 * one.
 */
function sandboxRoot(): string {
  if (rootCache !== null) return rootCache;
  const here = path.dirname(fileURLToPath(import.meta.url));
  let dir = here;
  while (path.basename(dir) !== 'packages') {
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error(
        `SourceTreeApi: could not locate a 'packages' ancestor of ` +
          `${here} — sandbox root is undefined`,
      );
    }
    dir = parent;
  }
  rootCache = dir;
  return dir;
}

/**
 * Strip a leading `/` from a cwd value before joining onto the sandbox
 * root with `path.resolve`. Sandbox cwds use leading `/` for "relative
 * to sandbox root" semantics; the resolver uses OS conventions where a
 * leading `/` means absolute.
 */
function stripCwdLeadingSlash(cwd: string): string {
  if (cwd.startsWith('/')) return cwd.slice(1);
  return cwd;
}
