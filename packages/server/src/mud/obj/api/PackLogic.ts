// PackLogic — the hot-reloadable logic singleton behind PackApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { basename, dirname, join, relative } from 'path';
import YAML from 'yaml';
import { ApiLogic } from '../../lib/stuff/ApiLogic';
import { NameBank } from '../../lib/species/NameBank';
import { DescriptorBank } from '../../lib/identification/DescriptorBank';
import { Appearance } from '../../lib/identification/Appearance';
import { CallSecurity, Unshadowable } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import { Collections } from '../../lib/persistence/Collections';
import { TOPIC_ROOTS } from '@saxonberg/types';
import Topic from '../Topic';
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

/**
 * One parsed `content/descriptor-banks/*.yaml` — the pool an
 * unidentified item of that class draws its appearance from. Two
 * DECORATIVE axes whose product is the bank's depth; the
 * `lint:descriptors` build check proves them disjoint from the
 * materials vocabulary. See magic-items D32.
 */
interface DescriptorBankFile {
  /** Bank key — the file's basename, and the item class (`potion`). */
  key: string;
  primary: string[];
  secondary: string[];
  primaryAxis: string;
  secondaryAxis: string;
  /** Class-level prose for an unidentified item; `{descriptor}` interpolates. */
  unidentifiedLong: string;
  /** Class-level examinable parts an unidentified item shows. */
  unidentifiedDetails: Record<string, string>;
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
  /** Parsed `content/descriptor-banks/*.yaml`, one per item class. */
  descriptorBanks: DescriptorBankFile[];
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

  // Descriptor banks — the `name-banks` shape verbatim, one kind over.
  const descriptorBanks: DescriptorBankFile[] = [];
  const dbRoot = join(pack.contentRoot, 'descriptor-banks');
  for (const file of walkYaml(dbRoot)) {
    const raw = readFileSync(file, 'utf-8');
    const parsed = YAML.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error(
        `PackApi: pack '${pack.manifest.id}': malformed descriptor bank at ${file}`,
      );
    }
    const doc = parsed as Record<string, unknown>;
    descriptorBanks.push({
      key: basename(file).replace(/\.yaml$/, ''),
      primary: stringArray(doc.primary),
      secondary: stringArray(doc.secondary),
      primaryAxis: typeof doc.primaryAxis === 'string' ? doc.primaryAxis : '',
      secondaryAxis:
        typeof doc.secondaryAxis === 'string' ? doc.secondaryAxis : '',
      unidentifiedLong:
        typeof doc.unidentifiedLong === 'string'
          ? doc.unidentifiedLong.trim()
          : '',
      unidentifiedDetails: stringMap(doc.unidentifiedDetails),
      relFile: relative(pack.root, file),
    });
  }

  const quantityYaml = join(pack.contentRoot, 'quantity', 'quantity-tags.yaml');
  return {
    domain,
    quantityYaml: existsSync(quantityYaml) ? quantityYaml : null,
    nameBanks,
    descriptorBanks,
  };
}

/** Coerce a parsed YAML value to a string[] (non-strings dropped). */
function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string');
}

/** A `key: text` block, with non-string values dropped. */
function stringMap(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v === 'string' && v.trim().length > 0) out[k] = v.trim();
  }
  return out;
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

/**
 * ⚠ **Gate pack-declared topics before anything is written.**
 *
 * The topic vocabulary is deliberately **open** — a pack adds a topic
 * by shipping a `/obj/Topic/<key>` row like any other content, and no
 * mechanism was needed to allow it. Two things are *not* open:
 *
 *  - **Roots are closed.** A pack-minted root would mean a player's
 *    mute of `sense` stops catching everything sense-shaped, and
 *    subtree-mute integrity is the whole reason topics form a tree
 *    rather than a flat tag set. Content maps onto an existing leaf and
 *    distinguishes itself with facets; it adds a leaf only when the
 *    *subject* genuinely differs.
 * Key *ownership* needs nothing here: {@link reconcileDomain} already
 * refuses to let one pack clobber a path another pack owns, for every
 * path. Re-checking it for topics would be a second implementation of
 * a rule the first already enforces.
 *
 * Throws rather than warns: a reconcile that half-applied a pack with
 * an illegal topic would leave the vocabulary in a state the build-time
 * gate cannot see and the runtime diagnostic can only report after the
 * fact.
 */
async function validatePackTopics(
  packId: string,
  files: DomainFile[],
): Promise<void> {
  const topicFiles = files.filter((f) =>
    f.path.startsWith(Topic.TEMPLATE_PATH_PREFIX),
  );
  if (topicFiles.length === 0) return;

  const roots = new Set<string>(TOPIC_ROOTS);
  for (const f of topicFiles) {
    const key = f.path.slice(Topic.TEMPLATE_PATH_PREFIX.length);
    const root = key.split('.')[0] ?? key;
    if (!roots.has(root)) {
      throw new Error(
        `pack '${packId}' declares topic '${key}', whose root '${root}' ` +
          `is not one of the ${TOPIC_ROOTS.length} core roots ` +
          `(${TOPIC_ROOTS.join(', ')}). Content packs may add topic ` +
          `LEAVES under a core root, never a new root — a pack-minted ` +
          `root breaks subtree muting for every player.`,
      );
    }
    if (!key.includes('.')) {
      throw new Error(
        `pack '${packId}' declares topic '${key}', which is a root. ` +
          `Packs may add leaves only.`,
      );
    }
  }
}


// --- the per-kind strategy -------------------------------------------------

/** The DB collections a shipped content kind lands in. */
type KindName = 'domain' | 'name-banks' | 'descriptor-banks';

/**
 * The per-kind reconcile strategy — the content-pack-units Part C
 * interface, kept module-private. Every shipped kind is the same
 * ownership-scoped insert/update/adopt/delete loop; what differs is the
 * TARGET collection, the KEY a row is found by, the rendered ROW, the
 * hash preimage, and the go-live side effect. One `reconcileKind`
 * drives all of them, so the reconcile policy is written once.
 */
interface KindStrategy<F> {
  kind: KindName;
  /** TARGET collection. */
  collection: Collections;
  /**
   * The install-record key — the file's content-root-relative path with
   * a leading slash and no `.yaml`. For the domain kind this IS the
   * template path; for a bank it is `/name-banks/<key>`. One uniform
   * address for every kind (`pack diff <id> <path>`).
   */
  recordKeyOf(f: F): string;
  /** The record key of a stored row (the inverse of `recordKeyOf`). */
  recordKeyOfRow(row: Record<string, unknown>): string;
  /** The query that finds a row at this file's key. */
  dbKeyQuery(f: F): Record<string, unknown>;
  /** The full row to write (stamp included). */
  rowOf(f: F, packId: string): Record<string, unknown>;
  /** The hash preimage — rendered content only; never `_id`, stamps, keys. */
  canonicalBody(rowOrFile: Record<string, unknown>): string;
  /** The human label for the refusal message. */
  noun: string;
}

/** The row shape PackLogic writes (a `content` template row + the stamp). */
interface DomainRow extends Record<string, unknown> {
  _id?: string;
  path: string;
  class: string;
  hydratorClass?: string;
  data: Record<string, unknown>;
  sourcePack: string;
}

/**
 * The domain-kind preimage: `{class, hydratorClass, data}` only. Adding a
 * field to the row shape means deciding here whether it is content (in)
 * or bookkeeping (out) — `_id`, `path`, `sourcePack`, timestamps are out.
 * `JSON.stringify` drops `undefined`, so absent-vs-undefined normalizes
 * identically on the file side and the BSON round-trip side.
 */
const domainStrategy: KindStrategy<DomainFile> = {
  kind: 'domain',
  collection: Collections.Content,
  noun: 'path',
  recordKeyOf: (f) => f.path,
  recordKeyOfRow: (r) => String(r.path),
  dbKeyQuery: (f) => ({ path: f.path }),
  rowOf: (f, packId) => {
    const row: DomainRow = {
      path: f.path,
      class: f.class,
      data: f.data,
      sourcePack: packId,
    };
    if (f.hydratorClass) row.hydratorClass = f.hydratorClass;
    return row;
  },
  canonicalBody: (r) =>
    canonical({
      class: r.class,
      hydratorClass: r.hydratorClass ?? undefined,
      data: r.data ?? {},
    }),
};

interface NameBankRow extends Record<string, unknown> {
  _id?: string;
  key: string;
  given: string[];
  surname: string[];
  style?: string;
  sourcePack: string;
}

/**
 * Name banks — immutable reference data the char-gen suggester unions by
 * key — into `name_banks`, keyed on the file basename.
 */
const nameBankStrategy: KindStrategy<NameBankFile> = {
  kind: 'name-banks',
  collection: Collections.NameBanks,
  noun: 'name bank',
  recordKeyOf: (f) => `/name-banks/${f.key}`,
  recordKeyOfRow: (r) => `/name-banks/${String(r.key)}`,
  dbKeyQuery: (f) => ({ key: f.key }),
  rowOf: (f, packId) => {
    const row: NameBankRow = {
      key: f.key,
      given: f.given,
      surname: f.surname,
      sourcePack: packId,
    };
    if (f.style !== undefined) row.style = f.style;
    return row;
  },
  canonicalBody: (r) =>
    canonical({
      given: r.given ?? [],
      surname: r.surname ?? [],
      style: r.style ?? undefined,
    }),
};

/** The row shape PackLogic writes for a descriptor bank (a flat `Document` + stamp). */
interface DescriptorBankRow extends Record<string, unknown> {
  _id?: string;
  key: string;
  primary: string[];
  secondary: string[];
  primaryAxis: string;
  secondaryAxis: string;
  unidentifiedLong: string;
  unidentifiedDetails: Record<string, string>;
  sourcePack: string;
}

/**
 * Descriptor banks — the name-bank shape one kind over, into
 * `descriptor_banks`, keyed on the file basename (= the item class). A
 * much hotter read path: appearance renders on every look at every
 * unidentified item, so the cache a write drops matters more here.
 */
const descriptorBankStrategy: KindStrategy<DescriptorBankFile> = {
  kind: 'descriptor-banks',
  collection: Collections.DescriptorBanks,
  noun: 'descriptor bank',
  recordKeyOf: (f) => `/descriptor-banks/${f.key}`,
  recordKeyOfRow: (r) => `/descriptor-banks/${String(r.key)}`,
  dbKeyQuery: (f) => ({ key: f.key }),
  rowOf: (f, packId): DescriptorBankRow => ({
    key: f.key,
    primary: f.primary,
    secondary: f.secondary,
    primaryAxis: f.primaryAxis,
    secondaryAxis: f.secondaryAxis,
    unidentifiedLong: f.unidentifiedLong,
    unidentifiedDetails: f.unidentifiedDetails,
    sourcePack: packId,
  }),
  canonicalBody: (r) =>
    canonical({
      primary: r.primary ?? [],
      secondary: r.secondary ?? [],
      primaryAxis: r.primaryAxis ?? '',
      secondaryAxis: r.secondaryAxis ?? '',
      unidentifiedLong: r.unidentifiedLong ?? '',
      unidentifiedDetails: r.unidentifiedDetails ?? {},
    }),
};

type KindChanges = Pick<
  PackReconcileResult,
  'inserted' | 'updated' | 'adopted' | 'deleted'
>;

/**
 * The ONE reconcile loop, for every kind: make the DB match the pack for
 * rows stamped `packId`, adopting any pre-existing unstamped row at a
 * pack key, refusing to clobber another pack's row, deleting stamped
 * rows whose file vanished. Writes flow through the {@link PersistApi}
 * chokepoint (`lint:pm`); `save` is `$set`-by-`_id` (update/adopt) or
 * insert. Change lists are record keys.
 */
async function reconcileKind<F>(
  packId: string,
  strategy: KindStrategy<F>,
  files: F[],
): Promise<KindChanges> {
  const inserted: string[] = [];
  const updated: string[] = [];
  const adopted: string[] = [];
  const deleted: string[] = [];

  const stampedRows = (await PersistApi.find(strategy.collection, {
    sourcePack: packId,
  })) as Array<Record<string, unknown> & { _id?: string; sourcePack?: string }>;
  const stampedByKey = new Map(
    stampedRows.map((r) => [strategy.recordKeyOfRow(r), r]),
  );
  const fileKeys = new Set(files.map((f) => strategy.recordKeyOf(f)));

  for (const f of files) {
    const key = strategy.recordKeyOf(f);
    const row = strategy.rowOf(f, packId);

    const stamped = stampedByKey.get(key);
    if (stamped) {
      // (a) we already own this key — update only if it actually differs.
      if (strategy.canonicalBody(stamped) !== strategy.canonicalBody(row)) {
        await PersistApi.save(strategy.collection, { ...row, _id: stamped._id });
        updated.push(key);
      }
      continue;
    }

    const existing = (await PersistApi.find(
      strategy.collection,
      strategy.dbKeyQuery(f),
    )) as Array<Record<string, unknown> & { _id?: string; sourcePack?: string }>;
    const prior = existing[0];
    if (prior) {
      // (b) a row exists at this key. Adopt it iff unstamped; refuse to
      // clobber another pack's content.
      if (prior.sourcePack && prior.sourcePack !== packId) {
        throw new Error(
          `PackApi: pack '${packId}' wants ${strategy.noun} '${key}' but it ` +
            `is owned by pack '${prior.sourcePack}'`,
        );
      }
      await PersistApi.save(strategy.collection, { ...row, _id: prior._id });
      adopted.push(key);
    } else {
      // (c) nothing here — insert (no _id → insertOne).
      await PersistApi.save(strategy.collection, row);
      inserted.push(key);
    }
  }

  // Delete our stamped rows whose file vanished.
  for (const r of stampedRows) {
    const key = strategy.recordKeyOfRow(r);
    if (!fileKeys.has(key) && r._id) {
      await PersistApi.delete(strategy.collection, r._id);
      deleted.push(key);
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

  await validatePackTopics(pack.manifest.id, content.domain);
  const { inserted, updated, adopted, deleted } = await reconcileKind(
    pack.manifest.id,
    domainStrategy,
    content.domain,
  );

  const nb = await reconcileKind(
    pack.manifest.id,
    nameBankStrategy,
    content.nameBanks,
  );
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

  const db = await reconcileKind(
    pack.manifest.id,
    descriptorBankStrategy,
    content.descriptorBanks,
  );
  const descriptorBanks =
    db.inserted.length + db.updated.length + db.adopted.length;
  if (descriptorBanks + db.deleted.length > 0) {
    // Two caches: the bank rows themselves, and the memoized rendered
    // descriptor per (class, generation). Both would otherwise serve the
    // pre-edit pool until reboot.
    DescriptorBank.clearCache();
    Appearance.clearMemo();
  }
  // Warm the SYNC read path. Appearance renders inside `getPresentation`
  // and inside the merge ripple's `canMergeWith`, neither of which can
  // await a query — so banks are primed once here and read from cache
  // thereafter, exactly as the spell catalogue is.
  if (content.descriptorBanks.length > 0) {
    DescriptorBank.primeCache(
      content.descriptorBanks.map((f) => {
        const bank = new DescriptorBank();
        bank.key = f.key;
        bank.primary = f.primary;
        bank.secondary = f.secondary;
        bank.primaryAxis = f.primaryAxis;
        bank.secondaryAxis = f.secondaryAxis;
        bank.unidentifiedLong = f.unidentifiedLong;
        bank.unidentifiedDetails = f.unidentifiedDetails;
        return bank;
      }),
    );
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
