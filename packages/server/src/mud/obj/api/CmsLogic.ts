// CmsLogic — the hot-reloadable logic singleton behind CmsApi. (Doc
// comment lives on the class declaration below so @internal lands on the
// reflection TypeDoc emits, not on the module.)

import { Idea } from '../../lib/stuff/Idea';
import { CallSecurity, Unshadowable } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import { SourceTreeApi, SourceTreeSandboxError } from '../../api/source-tree';
import { TemplateApi } from '../../api/template';
import { HotReloadApi } from '../../api/hot-reload';
import { AccessApi } from '../../api/access';
import { ZoneApi } from '../../api/zone';
import { StuffApi } from '../../api/stuff';
import { Template } from '../../lib/stuff/Template';
import { Zone } from '../../lib/zone/Zone';
import { CmsError } from '../../api/cms';
import type { Stuff } from '../../lib/stuff/Stuff';
import type {
  CmsBackend,
  CmsNodeKind,
  CmsTreeEntry,
  CmsTreeListing,
  CmsReadResult,
  CmsStatResult,
  CmsWriteResult,
} from '@saxonberg/types';

const CmsApiCallers = SecurityPolicies.FromModule('mud/api/cms#CmsApi');

/** Last segment of a backend path, for display. Root → ''. */
function lastSegment(path: string): string {
  const trimmed = path.endsWith('/') ? path.slice(0, -1) : path;
  const idx = trimmed.lastIndexOf('/');
  return idx >= 0 ? trimmed.slice(idx + 1) : trimmed;
}

/** Editor language hint from a source file extension. */
function languageForPath(path: string): string {
  if (path.endsWith('.ts') || path.endsWith('.tsx')) return 'typescript';
  if (path.endsWith('.json')) return 'json';
  if (path.endsWith('.yaml') || path.endsWith('.yml')) return 'yaml';
  return 'plaintext';
}

/**
 * Keep only the *immediate* children of `parent` from a descendant
 * listing: a descendant `/a/b/c` is an immediate child of `/a/b` iff
 * its remainder after the `parent + '/'` prefix has no further `/`.
 * Root `/` treats every top-level template `/x` as immediate.
 */
function immediateChildPath(parent: string, descendant: string): boolean {
  const prefix = parent === '/' ? '/' : parent + '/';
  if (!descendant.startsWith(prefix)) return false;
  const remainder = descendant.slice(prefix.length);
  return remainder.length > 0 && !remainder.includes('/');
}

/**
 * Content-tree write gate — verbatim from
 * `WriteController._gateContentWrite`. Live-at-path Zone →
 * `canMutateZone`; else `can(actor, 'write', liveAtTarget)`.
 * Returns null on allow, a human-readable reason on deny.
 */
async function gateContentWrite(
  actor: Stuff | null,
  target: string
): Promise<string | null> {
  const liveAtTarget = StuffApi.findByTemplatePath<Stuff>(target) ?? null;
  if (liveAtTarget instanceof Zone) {
    if (!(await AccessApi.canMutateZone(actor, liveAtTarget))) {
      return "you don't have permission to mutate that zone";
    }
    return null;
  }
  if (!(await AccessApi.can(actor, 'write', liveAtTarget))) {
    return "you don't have permission to write there";
  }
  return null;
}

/**
 * Source-tree write gate — verbatim from
 * `WriteController._gateSourceWrite`. `isDeveloper(actor)` AND
 * `can(actor, 'write', resolveSourceFolderZone(path))`.
 * Returns null on allow, a human-readable reason on deny.
 */
async function gateSourceWrite(
  actor: Stuff | null,
  sourceLogical: string
): Promise<string | null> {
  if (!(await AccessApi.isDeveloper(actor))) {
    return "you don't have permission to write source";
  }
  const resource = await AccessApi.resolveSourceFolderZone(sourceLogical);
  if (!(await AccessApi.can(actor, 'write', resource))) {
    return "you don't have permission to write to that source slice";
  }
  return null;
}

/**
 * CmsLogic — the hot-reloadable logic singleton behind {@link CmsApi}.
 *
 * Lives at `/obj/api/cms` (a stateless `Stuff` singleton, no backing
 * `Template`); `CmsApi`'s public statics forward here via
 * `StuffApi.singletonSync`. Any module that grabs this singleton and
 * calls a method other than through the Api gets `SecurityError`.
 *
 * Stateless by construction (no `PostRegistrationMixin`): it composes
 * `SourceTreeApi`, `TemplateApi`, `HotReloadApi`, and `AccessApi`. The
 * write gates mirror `WriteController._gateContentWrite` /
 * `_gateSourceWrite` verbatim and live as module-private free
 * functions (no intra-singleton self-calls, same pattern as
 * `SourceTreeLogic`'s `sandboxRoot()`).
 *
 * The `FromModule` gate is applied per public method, not at the class
 * level.
 *
 * @internal
 */
@Unshadowable
export class CmsLogic extends Idea {
  /** See {@link CmsApi.listTree}. */
  @CallSecurity(CmsApiCallers)
  public async listTree(
    _actor: Stuff | null,
    backend: CmsBackend,
    path: string
  ): Promise<CmsTreeListing> {
    if (backend === 'content') {
      const descendants = await Template.findDescendants(path);
      const entries: CmsTreeEntry[] = [];
      for (const tpl of descendants) {
        if (!immediateChildPath(path, tpl.path)) continue;
        const isFolder = await ZoneApi.isFolderClass(tpl.class);
        entries.push({
          backend: 'content',
          path: tpl.path,
          name: lastSegment(tpl.path),
          kind: isFolder ? 'folder' : 'leaf',
        });
      }
      return { backend, path, entries };
    }
    // source
    const abs = SourceTreeApi.resolvePath('/', path, { home: '/' });
    const dirEntries = await SourceTreeApi.list(abs);
    const entries: CmsTreeEntry[] = dirEntries.map((ent) => ({
      backend: 'source' as const,
      path: SourceTreeApi.toDisplayPath(ent.absolutePath),
      name: ent.name,
      kind: (ent.isDir ? 'folder' : 'leaf') as CmsNodeKind,
    }));
    return { backend, path, entries };
  }

  /** See {@link CmsApi.read}. */
  @CallSecurity(CmsApiCallers)
  public async read(
    _actor: Stuff | null,
    backend: CmsBackend,
    path: string
  ): Promise<CmsReadResult> {
    if (backend === 'content') {
      const tpl = await Template.findByPath(path);
      if (!tpl) {
        throw new CmsError('not-found', `no template at ${path}`);
      }
      if (await ZoneApi.isFolderClass(tpl.class)) {
        throw new CmsError(
          'invalid',
          'folders have no editable body; list it instead'
        );
      }
      return {
        backend,
        path,
        kind: 'leaf',
        body: JSON.stringify(tpl.data, null, 2),
        language: 'json',
        templateMeta: {
          class: tpl.class,
          ...(tpl.hydratorClass !== undefined
            ? { hydratorClass: tpl.hydratorClass }
            : {}),
        },
      };
    }
    // source
    const abs = SourceTreeApi.resolvePath('/', path, { home: '/' });
    if (await SourceTreeApi.isDir(abs)) {
      throw new CmsError(
        'invalid',
        'directories have no editable body; list it instead'
      );
    }
    if (!(await SourceTreeApi.isFile(abs))) {
      throw new CmsError('not-found', `no file at ${path}`);
    }
    const body = await SourceTreeApi.read(abs);
    return {
      backend,
      path,
      kind: 'leaf',
      body,
      language: languageForPath(path),
    };
  }

  /** See {@link CmsApi.stat}. */
  @CallSecurity(CmsApiCallers)
  public async stat(
    _actor: Stuff | null,
    backend: CmsBackend,
    path: string
  ): Promise<CmsStatResult> {
    if (backend === 'content') {
      const tpl = await Template.findByPath(path);
      if (!tpl) return { backend, path, exists: false };
      const isFolder = await ZoneApi.isFolderClass(tpl.class);
      return {
        backend,
        path,
        exists: true,
        kind: isFolder ? 'folder' : 'leaf',
      };
    }
    // source
    const abs = SourceTreeApi.resolvePath('/', path, { home: '/' });
    if (await SourceTreeApi.isDir(abs)) {
      return { backend, path, exists: true, kind: 'folder' };
    }
    if (await SourceTreeApi.isFile(abs)) {
      return { backend, path, exists: true, kind: 'leaf' };
    }
    return { backend, path, exists: false };
  }

  /** See {@link CmsApi.write}. */
  @CallSecurity(CmsApiCallers)
  public async write(
    actor: Stuff | null,
    backend: CmsBackend,
    path: string,
    body: string
  ): Promise<CmsWriteResult> {
    if (backend === 'content') {
      return this._writeContent(actor, path, body);
    }
    return this._writeSource(actor, path, body);
  }

  /**
   * Content write: parse → recover backing class → gate → persist →
   * re-hydrate live instances. The editor edits `data` only, so the
   * existing template's `class`/`hydratorClass` round-trip unchanged.
   *
   * Private — not gated; reached only from the gated `write` on the
   * same proxy receiver.
   */
  private async _writeContent(
    actor: Stuff | null,
    path: string,
    body: string
  ): Promise<CmsWriteResult> {
    let data: Record<string, unknown>;
    try {
      const parsed = JSON.parse(body) as unknown;
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('body must be a JSON object');
      }
      data = parsed as Record<string, unknown>;
    } catch (err) {
      throw new CmsError('invalid', (err as Error).message);
    }

    const existing = await Template.findByPath(path);
    if (!existing) {
      throw new CmsError(
        'not-found',
        `no template at ${path} (creating templates is out of scope)`
      );
    }

    const denial = await gateContentWrite(actor, path);
    if (denial) throw new CmsError('denied', denial);

    await TemplateApi.saveTemplate(
      path,
      existing.class,
      data,
      existing.hydratorClass
    );

    // Go-live: re-hydrate every live clone at this path so the new
    // `data` is observable in the running world.
    const live = StuffApi.findAllByTemplatePath(path);
    for (const instance of live) {
      await TemplateApi.restoreFromTemplate(instance);
    }
    return {
      backend: 'content',
      path,
      reloaded: live.length > 0,
      reloadDetail: `re-hydrated ${live.length} live instance(s)`,
    };
  }

  /**
   * Source write: gate → resolve → write bytes → `HotReloadApi.reload`.
   * A reload failure (compile error) leaves the file persisted but not
   * live; surface both rather than 500.
   *
   * Private — not gated; reached only from the gated `write` on the
   * same proxy receiver.
   */
  private async _writeSource(
    actor: Stuff | null,
    path: string,
    body: string
  ): Promise<CmsWriteResult> {
    const denial = await gateSourceWrite(actor, path);
    if (denial) throw new CmsError('denied', denial);

    // resolvePath throws SourceTreeSandboxError on escape — let it
    // propagate; the REST layer maps it to 400 {error:'sandbox'}.
    const abs = SourceTreeApi.resolvePath('/', path, { home: '/' });
    await SourceTreeApi.write(abs, body);

    try {
      await HotReloadApi.reload(abs);
    } catch (err) {
      return {
        backend: 'source',
        path,
        reloaded: false,
        reloadDetail: (err as Error).message,
      };
    }
    return {
      backend: 'source',
      path,
      reloaded: true,
      reloadDetail: 'reloaded module',
    };
  }
}

// Re-export so the sandbox error type is reachable for narrowing at the
// REST boundary without importing api/source-tree there.
export { SourceTreeSandboxError };
