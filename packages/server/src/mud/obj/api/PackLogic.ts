// PackLogic — the hot-reloadable logic singleton behind PackApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { basename, dirname, join, relative } from 'path';
import YAML from 'yaml';
import { ApiLogic } from '../../lib/stuff/ApiLogic';
import { NameBank } from '../../lib/species/NameBank';
import { CallSecurity, Unshadowable } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import { Collections } from '../../lib/persistence/Collections';
import { PersistApi } from '../../api/persist';
import { StuffApi } from '../../api/stuff';
import { QuantityApi } from '../../api/quantity';
import { TemplateApi } from '../../api/template';
import type { PackManifest, PackReconcileResult } from '../../api/pack';

const PackApiCallers = SecurityPolicies.FromModule('/api/pack#PackApi');

/** A pack resolved to its on-disk root + parsed manifest. */
interface ResolvedPack {
  manifest: PackManifest;
  /** Absolute pack root (the dir holding `pack.yaml`). */
  root: string;
  /** Absolute `content/` root (the namespace-mirror). */
  contentRoot: string;
}

/** A parsed `domain`-kind content file. */
interface DomainFile {
  /** Derived template path (`/obj/material/spirit/gin`). */
  path: string;
  /** Backing class path. */
  class: string;
  hydratorClass?: string;
  data: Record<string, unknown>;
  /** Pack-relative file path, for diagnostics. */
  relFile: string;
}

/** A parsed `name-bank`-kind content file (one bank). */
interface NameBankFile {
  /** Bank key — the file's basename (`common.yaml` → `common`). */
  key: string;
  given: string[];
  surname: string[];
  style?: string;
  /** Pack-relative file path, for diagnostics. */
  relFile: string;
}

/** The classified content of a pack's `content/` tree. */
interface PackContent {
  domain: DomainFile[];
  /** Absolute path to `content/quantity/quantity-tags.yaml`, or null. */
  quantityYaml: string | null;
  /** Parsed `content/name-banks/*.yaml`, one per bank (empty when absent). */
  nameBanks: NameBankFile[];
}

// --- discovery -------------------------------------------------------------

/**
 * `server`'s own `package.json` — the single source of truth for which
 * packs this build ships. Relative climb from this module mirrors
 * `SeederManager`'s `join(here, '../mud/seeds')` precedent:
 * `src/mud/obj/api/PackLogic.ts` → `packages/server/package.json`.
 */
function serverPackageJsonPath(): string {
  return join(
    dirname(fileURLToPath(import.meta.url)),
    '../../../../package.json',
  );
}

/** Pack package names = `server`'s `@saxonberg/content-*` dependencies. */
function packNamesFromServerDeps(): string[] {
  const raw = readFileSync(serverPackageJsonPath(), 'utf-8');
  const pkg = JSON.parse(raw) as { dependencies?: Record<string, string> };
  const deps = pkg.dependencies ?? {};
  return Object.keys(deps)
    .filter((n) => n.startsWith('@saxonberg/content-'))
    .sort();
}

/** Resolve a pack package name to its on-disk root via module resolution. */
function resolvePackRootByName(pkgName: string): string {
  const req = createRequire(import.meta.url);
  return dirname(req.resolve(`${pkgName}/package.json`));
}

/** Parse + validate a pack root's `pack.yaml`. */
function readManifest(root: string): PackManifest {
  const file = join(root, 'pack.yaml');
  const raw = readFileSync(file, 'utf-8');
  const parsed = YAML.parse(raw) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`PackApi: malformed manifest at ${file}: expected an object`);
  }
  const m = parsed as Record<string, unknown>;
  if (typeof m.id !== 'string' || m.id.length === 0) {
    throw new Error(`PackApi: manifest at ${file} is missing a string 'id'`);
  }
  if (typeof m.version !== 'string') {
    throw new Error(`PackApi: manifest at ${file} is missing a string 'version'`);
  }
  const dependsOn = m.dependsOn ?? [];
  if (
    !Array.isArray(dependsOn) ||
    dependsOn.some((d) => typeof d !== 'string')
  ) {
    throw new Error(
      `PackApi: manifest at ${file} has a malformed 'dependsOn' (want string[])`,
    );
  }
  return {
    id: m.id,
    version: m.version,
    description: typeof m.description === 'string' ? m.description : undefined,
    dependsOn: dependsOn as string[],
  };
}

/** Resolve a pack root dir to a {@link ResolvedPack}. */
function resolvePack(root: string): ResolvedPack {
  const manifest = readManifest(root);
  return { manifest, root, contentRoot: join(root, 'content') };
}

/**
 * Order packs so every pack's `dependsOn` ids precede it. Stable
 * (input order breaks ties); throws on an unsatisfiable cycle. With one
 * pack this is a passthrough.
 */
function orderByDependsOn(packs: ResolvedPack[]): ResolvedPack[] {
  const byId = new Map(packs.map((p) => [p.manifest.id, p]));
  const ordered: ResolvedPack[] = [];
  const done = new Set<string>();
  const visiting = new Set<string>();
  const visit = (p: ResolvedPack): void => {
    if (done.has(p.manifest.id)) return;
    if (visiting.has(p.manifest.id)) {
      throw new Error(
        `PackApi: dependency cycle through pack '${p.manifest.id}'`,
      );
    }
    visiting.add(p.manifest.id);
    for (const depId of p.manifest.dependsOn) {
      const dep = byId.get(depId);
      if (dep) visit(dep); // unknown deps: ignored in v1 (single-pack scope)
    }
    visiting.delete(p.manifest.id);
    done.add(p.manifest.id);
    ordered.push(p);
  };
  for (const p of packs) visit(p);
  return ordered;
}

/** Discover + order the shipped packs (or use explicit roots for tests). */
function discover(packRoots?: string[]): ResolvedPack[] {
  const roots =
    packRoots ?? packNamesFromServerDeps().map(resolvePackRootByName);
  return orderByDependsOn(roots.map(resolvePack));
}

// --- content walk ----------------------------------------------------------

/** Map a content file to its template path: `content/obj/x.yaml` → `/obj/x`. */
function fileToTemplatePath(contentRoot: string, file: string): string {
  const rel = relative(contentRoot, file).replace(/\.yaml$/, '');
  return '/' + rel.split(/[\\/]/).join('/');
}

/** Recursively yield `.yaml` files under `dir` (skips dotfiles). */
function* walkYaml(dir: string): Generator<string> {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.startsWith('.')) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) yield* walkYaml(full);
    else if (st.isFile() && entry.endsWith('.yaml')) yield full;
  }
}

/** Classify a pack's `content/` tree by subdir convention. */
function readContent(pack: ResolvedPack): PackContent {
  const domain: DomainFile[] = [];
  // `content/obj/` — a pack ships CONTENT, and content is instanceable.
  // Was `content/lib/` before the lib/obj taxonomy refactor; renaming this
  // is what makes pack rows land outside the substrate namespace.
  const domainRoot = join(pack.contentRoot, 'obj');
  for (const file of walkYaml(domainRoot)) {
    const raw = readFileSync(file, 'utf-8');
    const parsed = YAML.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error(
        `PackApi: pack '${pack.manifest.id}': malformed content at ${file}`,
      );
    }
    const doc = parsed as Record<string, unknown>;
    if (typeof doc.class !== 'string') {
      throw new Error(
        `PackApi: pack '${pack.manifest.id}': content at ${file} is missing a string 'class'`,
      );
    }
    domain.push({
      path: fileToTemplatePath(pack.contentRoot, file),
      class: doc.class,
      hydratorClass:
        typeof doc.hydratorClass === 'string' ? doc.hydratorClass : undefined,
      data:
        doc.data && typeof doc.data === 'object' && !Array.isArray(doc.data)
          ? (doc.data as Record<string, unknown>)
          : {},
      relFile: relative(pack.root, file),
    });
  }
  const nameBanks: NameBankFile[] = [];
  const nbRoot = join(pack.contentRoot, 'name-banks');
  for (const file of walkYaml(nbRoot)) {
    const raw = readFileSync(file, 'utf-8');
    const parsed = YAML.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error(
        `PackApi: pack '${pack.manifest.id}': malformed name bank at ${file}`,
      );
    }
    const doc = parsed as Record<string, unknown>;
    nameBanks.push({
      key: basename(file).replace(/\.yaml$/, ''),
      given: stringArray(doc.given),
      surname: stringArray(doc.surname),
      style: typeof doc.style === 'string' ? doc.style : undefined,
      relFile: relative(pack.root, file),
    });
  }

  const quantityYaml = join(pack.contentRoot, 'quantity', 'quantity-tags.yaml');
  return {
    domain,
    quantityYaml: existsSync(quantityYaml) ? quantityYaml : null,
    nameBanks,
  };
}

/** Coerce a parsed YAML value to a string[] (non-strings dropped). */
function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string');
}

// --- requires-kernel -------------------------------------------------------

/**
 * Resolve every distinct backing class the pack's content names, before any
 * write. Aborts the install if one is missing — the enforced content-pack ↔
 * mod boundary (a pack assumes its classes exist).
 */
async function assertClassesResolve(
  packId: string,
  files: DomainFile[],
): Promise<void> {
  const classes = new Map<string, string>(); // classPath -> first relFile
  for (const f of files) {
    if (!classes.has(f.class)) classes.set(f.class, f.relFile);
    if (f.hydratorClass && !classes.has(f.hydratorClass)) {
      classes.set(f.hydratorClass, f.relFile);
    }
  }
  for (const [classPath, relFile] of classes) {
    try {
      await StuffApi.loadClassByPath(classPath);
    } catch (cause) {
      throw new Error(
        `PackApi: pack '${packId}' requires class '${classPath}' which does ` +
          `not resolve (content file: ${relFile}). Install aborted — a ` +
          `content pack assumes its classes exist (see content-packs.md). ` +
          `[${cause instanceof Error ? cause.message : String(cause)}]`,
      );
    }
  }
}

// --- reconcile -------------------------------------------------------------

/** Order-insensitive deep equality for stored vs file `data`. */
function canonical(value: unknown): string {
  const seen = new WeakSet<object>();
  const norm = (v: unknown): unknown => {
    if (v === null || typeof v !== 'object') return v;
    if (seen.has(v as object)) return null;
    seen.add(v as object);
    if (Array.isArray(v)) return v.map(norm);
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v as Record<string, unknown>).sort()) {
      out[k] = norm((v as Record<string, unknown>)[k]);
    }
    return out;
  };
  return JSON.stringify(norm(value));
}

/** The row shape PackLogic writes (a `domain` template row + the stamp). */
interface DomainRow extends Record<string, unknown> {
  _id?: string;
  path: string;
  class: string;
  hydratorClass?: string;
  data: Record<string, unknown>;
  sourcePack: string;
}

/**
 * Reconcile the `domain`-kind files: make the DB match the pack for rows
 * stamped `packId`, adopting any pre-existing unstamped row at a pack path.
 * Returns the change lists. Writes flow through the {@link PersistApi}
 * chokepoint (`lint:pm`); `save` is `$set`-by-`_id` (update/adopt) or insert.
 */
async function reconcileDomain(
  packId: string,
  files: DomainFile[],
): Promise<Pick<PackReconcileResult, 'inserted' | 'updated' | 'adopted' | 'deleted'>> {
  const inserted: string[] = [];
  const updated: string[] = [];
  const adopted: string[] = [];
  const deleted: string[] = [];

  const stampedRows = (await PersistApi.find(Collections.Domain, {
    sourcePack: packId,
  })) as DomainRow[];
  const stampedByPath = new Map(stampedRows.map((r) => [r.path, r]));
  const filePaths = new Set(files.map((f) => f.path));

  for (const f of files) {
    const row: DomainRow = {
      path: f.path,
      class: f.class,
      data: f.data,
      sourcePack: packId,
    };
    if (f.hydratorClass) row.hydratorClass = f.hydratorClass;

    const stamped = stampedByPath.get(f.path);
    if (stamped) {
      // (a) we already own this path — update only if it actually differs.
      const same =
        canonical(stamped.data) === canonical(f.data) &&
        stamped.class === f.class &&
        (stamped.hydratorClass ?? undefined) === f.hydratorClass;
      if (!same) {
        await PersistApi.save(Collections.Domain, { ...row, _id: stamped._id });
        updated.push(f.path);
      }
      continue;
    }

    const existing = (await PersistApi.find(Collections.Domain, {
      path: f.path,
    })) as DomainRow[];
    const prior = existing[0];
    if (prior) {
      // (b) a row exists at this path. Adopt it iff unstamped; refuse to
      // clobber another pack's content.
      if (prior.sourcePack && prior.sourcePack !== packId) {
        throw new Error(
          `PackApi: pack '${packId}' wants path '${f.path}' but it is owned ` +
            `by pack '${prior.sourcePack}'`,
        );
      }
      await PersistApi.save(Collections.Domain, { ...row, _id: prior._id });
      adopted.push(f.path);
    } else {
      // (c) nothing here — insert (no _id → insertOne).
      await PersistApi.save(Collections.Domain, row);
      inserted.push(f.path);
    }
  }

  // Delete our stamped rows whose file vanished.
  for (const r of stampedRows) {
    if (!filePaths.has(r.path) && r._id) {
      await PersistApi.delete(Collections.Domain, r._id);
      deleted.push(r.path);
    }
  }

  return { inserted, updated, adopted, deleted };
}

/** The row shape PackLogic writes for a name bank (a flat `Document` + stamp). */
interface NameBankRow extends Record<string, unknown> {
  _id?: string;
  key: string;
  given: string[];
  surname: string[];
  style?: string;
  sourcePack: string;
}

/**
 * Reconcile the `name-bank`-kind files into the `name_banks` collection,
 * keyed on bank `key` (the file basename). Same ownership-scoped
 * insert/update/adopt/delete contract as {@link reconcileDomain}, but
 * over a flat `Document` row rather than a path-addressed template. Banks
 * are immutable reference data the char-gen suggester unions by key —
 * after a sync writes any change, {@link NameBank.clearCache} drops the
 * resolution cache so the edit is live.
 */
async function reconcileNameBanks(
  packId: string,
  files: NameBankFile[],
): Promise<Pick<PackReconcileResult, 'inserted' | 'updated' | 'adopted' | 'deleted'>> {
  const inserted: string[] = [];
  const updated: string[] = [];
  const adopted: string[] = [];
  const deleted: string[] = [];

  const stampedRows = (await PersistApi.find(Collections.NameBanks, {
    sourcePack: packId,
  })) as NameBankRow[];
  const stampedByKey = new Map(stampedRows.map((r) => [r.key, r]));
  const fileKeys = new Set(files.map((f) => f.key));

  for (const f of files) {
    const row: NameBankRow = {
      key: f.key,
      given: f.given,
      surname: f.surname,
      sourcePack: packId,
    };
    if (f.style !== undefined) row.style = f.style;

    const stamped = stampedByKey.get(f.key);
    if (stamped) {
      const same =
        canonical({
          given: stamped.given,
          surname: stamped.surname,
          style: stamped.style ?? undefined,
        }) === canonical({ given: f.given, surname: f.surname, style: f.style });
      if (!same) {
        await PersistApi.save(Collections.NameBanks, { ...row, _id: stamped._id });
        updated.push(f.key);
      }
      continue;
    }

    const existing = (await PersistApi.find(Collections.NameBanks, {
      key: f.key,
    })) as NameBankRow[];
    const prior = existing[0];
    if (prior) {
      if (prior.sourcePack && prior.sourcePack !== packId) {
        throw new Error(
          `PackApi: pack '${packId}' wants name bank '${f.key}' but it is ` +
            `owned by pack '${prior.sourcePack}'`,
        );
      }
      await PersistApi.save(Collections.NameBanks, { ...row, _id: prior._id });
      adopted.push(f.key);
    } else {
      await PersistApi.save(Collections.NameBanks, row);
      inserted.push(f.key);
    }
  }

  for (const r of stampedRows) {
    if (!fileKeys.has(r.key) && r._id) {
      await PersistApi.delete(Collections.NameBanks, r._id);
      deleted.push(r.key);
    }
  }

  return { inserted, updated, adopted, deleted };
}

/** Re-hydrate / destruct live singletons after a sync's reconcile. */
async function rehydrate(
  changedPaths: string[],
  deletedPaths: string[],
): Promise<number> {
  let count = 0;
  for (const path of changedPaths) {
    for (const inst of StuffApi.findAllByTemplatePath(path)) {
      await TemplateApi.restoreFromTemplate(inst);
      count++;
    }
  }
  for (const path of deletedPaths) {
    for (const inst of StuffApi.findAllByTemplatePath(path)) {
      StuffApi.destruct(inst);
    }
  }
  return count;
}

/**
 * The single reconcile implementation, shared by `install` (boot) and
 * `sync` (verb). The only difference is the `rehydrate` tail.
 */
async function reconcilePack(
  pack: ResolvedPack,
  opts: { rehydrate: boolean },
): Promise<PackReconcileResult> {
  if (!PersistApi.isConnected()) {
    throw new Error(
      `PackApi: cannot install pack '${pack.manifest.id}' — no DB connection`,
    );
  }
  const content = readContent(pack);

  // requires-kernel: resolve all referenced classes before any write.
  await assertClassesResolve(pack.manifest.id, content.domain);

  const { inserted, updated, adopted, deleted } = await reconcileDomain(
    pack.manifest.id,
    content.domain,
  );

  const nb = await reconcileNameBanks(pack.manifest.id, content.nameBanks);
  const nameBanks =
    nb.inserted.length + nb.updated.length + nb.adopted.length;
  // Banks are cached by key on first resolve; a live sync that changed any
  // bank must drop the cache so the edit reaches the next char-gen suggest.
  if (
    opts.rehydrate &&
    nameBanks + nb.deleted.length > 0
  ) {
    NameBank.clearCache();
  }

  let quantityTables = 0;
  if (content.quantityYaml) {
    const result = opts.rehydrate
      ? QuantityApi.reloadTagTables(content.quantityYaml)
      : QuantityApi.loadTagTables(content.quantityYaml);
    quantityTables = result.registered.length;
  }

  let rehydrated = 0;
  if (opts.rehydrate) {
    rehydrated = await rehydrate([...inserted, ...updated, ...adopted], deleted);
  }

  return {
    packId: pack.manifest.id,
    inserted,
    updated,
    adopted,
    deleted,
    quantityTables,
    nameBanks,
    rehydrated,
  };
}

/**
 * PackLogic — the hot-reloadable logic singleton behind {@link PackApi}.
 *
 * A stateless `Stuff` singleton (no `PostRegistrationMixin`) at
 * `/obj/api/pack`. All real work lives in module-level functions (the
 * `CraftingLogic` precedent) so there are no intra-singleton `this.x()`
 * calls to trip the gate; each public method carries the `FromModule` gate.
 *
 * @internal
 */
@Unshadowable
export class PackLogic extends ApiLogic {
  /** See {@link PackApi.install}. */
  @CallSecurity(PackApiCallers)
  public async install(
    packRoots?: string[],
  ): Promise<PackReconcileResult[]> {
    const results: PackReconcileResult[] = [];
    for (const pack of discover(packRoots)) {
      results.push(await reconcilePack(pack, { rehydrate: false }));
    }
    return results;
  }

  /** See {@link PackApi.sync}. */
  @CallSecurity(PackApiCallers)
  public async sync(
    packId: string,
    packRoot?: string,
  ): Promise<PackReconcileResult> {
    const pack = packRoot
      ? resolvePack(packRoot)
      : discover().find((p) => p.manifest.id === packId);
    if (!pack) {
      throw new Error(`PackApi: no shipped pack with id '${packId}'`);
    }
    return reconcilePack(pack, { rehydrate: true });
  }

  /** See {@link PackApi.discoverPacks}. */
  @CallSecurity(PackApiCallers)
  public async discoverPacks(): Promise<PackManifest[]> {
    return discover().map((p) => p.manifest);
  }
}
