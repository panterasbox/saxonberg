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
import { ExecutionContextApi } from '../../api/execution-context';
import { ZoneApi } from '../../api/zone';
import { StuffApi } from '../../api/stuff';
import { ScriptApi } from '../../api/script';
import { DocumentApi } from '../../api/document';
import { Template } from '../../lib/stuff/Template';
import { StoredDocument } from '../../lib/document/StoredDocument';
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
 * A stored document's editable body + editor language, by `kind`. A
 * `script` kind is plain-text source (`data.source`, the code surface);
 * any other kind is its `data` pretty-printed as JSON. The `kind` is the
 * metadata that decides the treatment — the generic store stays opaque.
 */
function documentBody(doc: StoredDocument): { body: string; language: string } {
  if (doc.getKind() === 'script') {
    const source = doc.getData().source;
    return {
      body: typeof source === 'string' ? source : '',
      language: 'plaintext',
    };
  }
  return { body: JSON.stringify(doc.getData(), null, 2), language: 'json' };
}

/**
 * The CMS source backend is rooted at the **mudlib** (`packages/server/
 * src/mud`) — authors edit game content, not client/build scaffolding.
 * Source paths in the CMS are relative to this root (`/api/cms.ts`, not
 * `/server/src/mud/api/cms.ts`), and colocated `__tests__` folders are
 * hidden from the tree.
 */
const SOURCE_ROOT_DISPLAY = '/server/src/mud';

/** Hidden in the CMS source tree: colocated test folders. */
function isHiddenSourceEntry(name: string): boolean {
  return name === '__tests__';
}

/**
 * Resolve a CMS-relative source path (rooted at the mudlib) to an absolute
 * filesystem path, enforcing it stays within the mud root. A `..` that
 * climbs out of mud throws `SourceTreeSandboxError` (REST → 400), the same
 * shape as a sandbox escape — mud is a hard boundary, not just the start
 * folder.
 */
function sourceAbs(cmsPath: string): string {
  const display =
    cmsPath === '/' ? SOURCE_ROOT_DISPLAY : SOURCE_ROOT_DISPLAY + cmsPath;
  const abs = SourceTreeApi.resolvePath('/', display, { home: '/' });
  const rootAbs = SourceTreeApi.resolvePath('/', SOURCE_ROOT_DISPLAY, {
    home: '/',
  });
  if (abs !== rootAbs && !abs.startsWith(rootAbs + '/')) {
    throw new SourceTreeSandboxError(
      `path '${cmsPath}' resolves outside the source root`
    );
  }
  return abs;
}

/** Map an absolute path under the mud root back to a CMS-relative path. */
function sourceCmsPath(abs: string): string {
  const display = SourceTreeApi.toDisplayPath(abs);
  if (display === SOURCE_ROOT_DISPLAY) return '/';
  return display.startsWith(SOURCE_ROOT_DISPLAY + '/')
    ? display.slice(SOURCE_ROOT_DISPLAY.length)
    : display;
}

/**
 * Content-tree write gate — verbatim from
 * `WriteController._gateContentWrite`. Live-at-path Zone →
 * `canMutateZone`; else `can(actor, 'write', liveAtTarget)`.
 * Returns null on allow, a human-readable reason on deny.
 */
/**
 * Validate that every `behaviors[].brain` path in a content template's
 * `data` resolves to a real brain module (`export const brain`). The
 * **save-gate half** of brain-path validation (the other half is
 * resolution-time, in `BehavedMixin`): a typo'd or dangling brain path
 * is rejected at author time rather than silently no-op'ing at spawn.
 * No-op for templates without a `behaviors:` list.
 */
async function validateBehaviorPaths(
  data: Record<string, unknown>
): Promise<void> {
  const behaviors = data.behaviors;
  if (!Array.isArray(behaviors)) return;
  for (const entry of behaviors) {
    if (!entry || typeof entry !== 'object') continue;
    const brainPath = (entry as { brain?: unknown }).brain;
    if (typeof brainPath !== 'string') continue;
    // 'brain' is the brain category's marker export (see lib/behavior).
    const resolved = await StuffApi.resolveExport(brainPath, 'brain');
    if (!resolved) {
      throw new CmsError('invalid', `unresolvable brain path: ${brainPath}`);
    }
  }
}

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
 * The acting principal for a CMS operation — resolved from the **execution
 * context** (`ExecutionContextApi.getActingAuthor`: the command-frame giver
 * on the in-game path, or the `tagActingAuthor` stamp a backend transport
 * boundary planted on the REST path), **NEVER a caller-supplied argument**.
 *
 * This is the load-bearing anti-spoof property: the CMS API takes no
 * `actor` parameter, so a caller who holds a reference to a privileged
 * Avatar (via MQL / `findByTemplatePath` / `self`) cannot substitute it for
 * the gate's subject. A context with no derivable actor (no command frame,
 * no stamp, or a forced / cross-actor chain) yields `null` → every gate
 * fails closed. Mirrors the provenance/standing pattern (derive from
 * context, never trust the call argument).
 */
function actingActor(): Stuff | null {
  return (ExecutionContextApi.getActingAuthor() as Stuff | null) ?? null;
}

/**
 * Read/list gate on the context-derived actor. The CMS is authoring-tier:
 * source (engine TS) is developer-only; content (templates) is author-tier.
 * Throws `CmsError('denied')` on failure (null actor fails closed).
 */
async function gateRead(backend: CmsBackend): Promise<void> {
  const actor = actingActor();
  // source (engine TS) is developer-only; content (templates) and document
  // (the owned-JSON store — scripts + future kinds) are author-tier.
  const ok =
    backend === 'source'
      ? await AccessApi.isDeveloper(actor)
      : await AccessApi.isAuthor(actor);
  if (!ok) {
    throw new CmsError(
      'denied',
      backend === 'source'
        ? 'you must be a developer to browse source'
        : backend === 'document'
          ? 'you must be an author to browse documents'
          : 'you must be an author to browse content'
    );
  }
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
    backend: CmsBackend,
    path: string
  ): Promise<CmsTreeListing> {
    await gateRead(backend);
    if (backend === 'content') {
      // Immediate children of `path`. A child is either a real template doc
      // at depth+1, or a SYNTHETIC namespace folder for an intermediate
      // segment that has no template of its own (e.g. `/obj` is browsable
      // even though only `/obj/X` templates exist) — without this, most
      // engine content is unreachable from the root.
      const descendants = await Template.findDescendants(path);
      const prefix = path === '/' ? '/' : path + '/';
      const realAtChild = new Map<string, Template>();
      const hasDeeper = new Set<string>();
      for (const tpl of descendants) {
        if (!tpl.path.startsWith(prefix)) continue;
        const remainder = tpl.path.slice(prefix.length);
        if (remainder.length === 0) continue;
        const slash = remainder.indexOf('/');
        const seg = slash === -1 ? remainder : remainder.slice(0, slash);
        const childPath = (path === '/' ? '' : path) + '/' + seg;
        if (slash === -1) realAtChild.set(childPath, tpl);
        else hasDeeper.add(childPath);
      }
      const entries: CmsTreeEntry[] = [];
      for (const childPath of new Set([
        ...realAtChild.keys(),
        ...hasDeeper,
      ])) {
        const tpl = realAtChild.get(childPath);
        const kind: CmsNodeKind = !tpl
          ? 'folder' // synthetic namespace node — no template doc here
          : (await ZoneApi.isFolderClass(tpl.class)) || hasDeeper.has(childPath)
            ? 'folder'
            : 'leaf';
        entries.push({
          backend: 'content',
          path: childPath,
          name: lastSegment(childPath),
          kind,
        });
      }
      // Folders first, then leaves; alphabetical within each.
      entries.sort((a, b) =>
        a.kind === b.kind
          ? a.name.localeCompare(b.name)
          : a.kind === 'folder'
            ? -1
            : 1
      );
      return { backend, path, entries };
    }
    if (backend === 'document') {
      // Immediate children of `path` over the path-addressed document
      // store: a doc one segment deep is a leaf; a deeper one contributes
      // a synthetic folder (mirrors the content tree's namespace folders).
      const docs = await DocumentApi.list(path);
      const prefix = path === '/' ? '/' : path + '/';
      const leafAtChild = new Set<string>();
      const folders = new Set<string>();
      for (const doc of docs) {
        if (!doc.getPath().startsWith(prefix)) continue;
        const remainder = doc.getPath().slice(prefix.length);
        if (remainder.length === 0) continue;
        const slash = remainder.indexOf('/');
        const seg = slash === -1 ? remainder : remainder.slice(0, slash);
        const childPath = (path === '/' ? '' : path) + '/' + seg;
        if (slash === -1) leafAtChild.add(childPath);
        else folders.add(childPath);
      }
      const entries: CmsTreeEntry[] = [];
      for (const childPath of new Set([...leafAtChild, ...folders])) {
        entries.push({
          backend: 'document',
          path: childPath,
          name: lastSegment(childPath),
          kind: folders.has(childPath) ? 'folder' : 'leaf',
        });
      }
      entries.sort((a, b) =>
        a.kind === b.kind
          ? a.name.localeCompare(b.name)
          : a.kind === 'folder'
            ? -1
            : 1
      );
      return { backend, path, entries };
    }
    // source — rooted at the mudlib; test folders hidden
    const abs = sourceAbs(path);
    const dirEntries = await SourceTreeApi.list(abs);
    const entries: CmsTreeEntry[] = dirEntries
      .filter((ent) => !isHiddenSourceEntry(ent.name))
      .map((ent) => ({
        backend: 'source' as const,
        path: sourceCmsPath(ent.absolutePath),
        name: ent.name,
        kind: (ent.isDir ? 'folder' : 'leaf') as CmsNodeKind,
      }));
    return { backend, path, entries };
  }

  /** See {@link CmsApi.read}. */
  @CallSecurity(CmsApiCallers)
  public async read(
    backend: CmsBackend,
    path: string
  ): Promise<CmsReadResult> {
    await gateRead(backend);
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
    if (backend === 'document') {
      const doc = await DocumentApi.read(path);
      if (!doc) throw new CmsError('not-found', `no document at ${path}`);
      // The record's `kind` drives the editable body + editor language
      // (script → plain-text source; other kinds → pretty-printed JSON).
      const { body, language } = documentBody(doc);
      return { backend, path, kind: 'leaf', body, language };
    }
    // source — rooted at the mudlib
    const abs = sourceAbs(path);
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
    backend: CmsBackend,
    path: string
  ): Promise<CmsStatResult> {
    await gateRead(backend);
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
    if (backend === 'document') {
      const doc = await DocumentApi.read(path);
      return doc
        ? { backend, path, exists: true, kind: 'leaf' }
        : { backend, path, exists: false };
    }
    // source — rooted at the mudlib
    const abs = sourceAbs(path);
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
    backend: CmsBackend,
    path: string,
    body: string
  ): Promise<CmsWriteResult> {
    // The acting principal is derived from context inside the private
    // writers (via the gate helpers), never passed by the caller.
    const actor = actingActor();
    if (backend === 'content') {
      return this._writeContent(actor, path, body);
    }
    if (backend === 'document') {
      return this._writeDocument(path, body);
    }
    return this._writeSource(actor, path, body);
  }

  /**
   * Document write, routed by the record's `kind`. A **script** kind
   * (the only runtime-CREATABLE kind today — scripts are runtime-authored)
   * goes through `ScriptApi.saveScript`, the script chokepoint: it persists
   * the source as `kind: 'script'` `data: { source }`, gates on owner
   * access, records provenance, and runs the script go-live (invalidate the
   * AST cache). Any other (existing) kind writes its edited JSON body back
   * via `DocumentApi.save` under its current kind — that path has no live
   * consumer to re-hydrate yet (dorm etc. land later). A denial surfaces as
   * `CmsError('denied')`; invalid JSON for a non-script kind as
   * `CmsError('invalid')`. Both derive the actor from context (anti-spoof).
   */
  private async _writeDocument(
    path: string,
    body: string
  ): Promise<CmsWriteResult> {
    const existing = await DocumentApi.read(path);
    // New docs default to the script kind (the runtime-authored one);
    // creating other kinds via the CMS is out of scope for v1.
    const kind = existing?.getKind() ?? 'script';
    if (kind === 'script') {
      try {
        await ScriptApi.saveScript(path, body);
      } catch (err) {
        throw new CmsError('denied', (err as Error).message);
      }
      return {
        backend: 'document',
        path,
        reloaded: true,
        reloadDetail: 're-resolves on next invocation',
      };
    }
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
    try {
      await DocumentApi.save(path, kind, data);
    } catch (err) {
      throw new CmsError('denied', (err as Error).message);
    }
    return { backend: 'document', path, reloaded: false, reloadDetail: 'saved' };
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

    // Reject content that references a non-existent brain before it
    // can go live (the save-gate half of brain-path validation).
    await validateBehaviorPaths(data);

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
    // Gate on the mud-rooted source location (isDeveloper is checked
    // first, so non-developers are denied before any filesystem work).
    const display =
      path === '/' ? SOURCE_ROOT_DISPLAY : SOURCE_ROOT_DISPLAY + path;
    const denial = await gateSourceWrite(actor, display);
    if (denial) throw new CmsError('denied', denial);

    // sourceAbs throws SourceTreeSandboxError on escape (mud boundary or
    // sandbox) — let it propagate; the REST layer maps it to 400.
    const abs = sourceAbs(path);
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
