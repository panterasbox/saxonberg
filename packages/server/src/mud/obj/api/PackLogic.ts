// PackLogic — the hot-reloadable logic singleton behind PackApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import {
  readFileSync,
  readdirSync,
  statSync,
  existsSync,
  writeFileSync,
  mkdirSync,
} from 'fs';
import { createHash } from 'crypto';
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
import {
  DOCUMENT_KINDS,
  type DeclaredDocumentKind,
  type DocumentKindSpec,
  type DocumentVanishPolicy,
} from '../../lib/document/DocumentKinds';
import { TOPIC_ROOTS } from '@saxonberg/types';
import Topic from '../Topic';
import { PersistApi } from '../../api/persist';
import { StuffApi } from '../../api/stuff';
import { QuantityApi } from '../../api/quantity';
import { TemplateApi } from '../../api/template';
import { ExecutionContextApi } from '../../api/execution-context';
import { DiagnosticApi } from '../../api/diagnostics';
import { SoulApi } from '../../api/soul';
import { TemplatePaths } from '../../lib/paths';
import { Emote } from '../../lib/social/Emote';
import { Recipe } from '../../lib/craft/Recipe';
import type RecipeCatalogue from '../RecipeCatalogue';
import type {
  PackManifest,
  PackReconcileResult,
  PackFailure,
  PackInstallRecord,
  PackConflict,
  PackStatusReport,
  PackDryRunReport,
  PackPlannedAction,
  PackDiffReport,
  PackDiffEntry,
  PackDiffBody,
  PackResolveMode,
} from '../../api/pack';

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

/**
 * A parsed document-kind content file (one `documents` row). The same
 * shape for every declared kind: a yaml file's object is `data`; an
 * `.msh` file is `data: { source }` verbatim.
 */
interface DocumentFile {
  /** Record key: `/<contentDir>/<rel-no-ext>` (`/emotes/grin`, `/msh/daiquiri`). */
  key: string;
  /** The row path: the pack `root` + key (command-view: the view key's doc path). */
  path: string;
  data: Record<string, unknown>;
  /** Pack-relative file path, for diagnostics. */
  relFile: string;
}

/**
 * Document kinds whose reader is not yet un-gated: the vocabulary
 * declares them (indexes + reset policy), but their files are still read
 * by another strategy (`name-bank` → the legacy `nameBankStrategy` until
 * step 3 of wave 2) or not at all (`command-view` until step 9). One set
 * drives the reader, the flat-key check and `strategyForKey` alike, so
 * no kind is ever claimed by two strategies.
 */
const GATED_DOCUMENT_KINDS: ReadonlySet<DeclaredDocumentKind> = new Set<DeclaredDocumentKind>([
  'command-view', // step 9
]);

/**
 * Per-kind shape validation at `read`: what the retired seeders checked
 * before inserting, moved to the pack boundary so a malformed file fails
 * the pack before any write. A kind with no entry is stored as parsed.
 */
const DOCUMENT_VALIDATORS: Record<string, (data: Record<string, unknown>) => void> = {
  emote: (d) => void Emote.fromData(d),
  recipe: (d) => void Recipe.fromData(d),
};

/** The declared kinds the document reader/strategies serve today. */
function activeDocumentKinds(): DocumentKindSpec[] {
  return (Object.keys(DOCUMENT_KINDS) as DeclaredDocumentKind[])
    .filter((k) => !GATED_DOCUMENT_KINDS.has(k))
    .map((k) => DOCUMENT_KINDS[k]);
}

/** The classified content of a pack's `content/` tree. */
interface PackContent {
  /** The manifest `root` — document paths and owners derive from it. */
  root: string;
  domain: DomainFile[];
  /** Parsed document-kind files, by kind (absent kinds are absent keys). */
  documents: Map<string, DocumentFile[]>;
  /** Absolute path to `content/quantity/quantity-tags.yaml`, or null. */
  quantityYaml: string | null;
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
  const docRoot = m.root ?? `/${m.id}`;
  if (
    typeof docRoot !== 'string' ||
    !docRoot.startsWith('/') ||
    docRoot.length < 2 ||
    docRoot.endsWith('/')
  ) {
    throw new Error(
      `PackApi: manifest at ${file} has a malformed 'root' (want an absolute path like '/${m.id}')`,
    );
  }
  return {
    id: m.id,
    version: m.version,
    description: typeof m.description === 'string' ? m.description : undefined,
    dependsOn: dependsOn as string[],
    root: docRoot,
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

/**
 * Recursively yield `.<ext>` files under `dir` (skips dotfiles). A dir
 * named in `skipDirs` is not descended — the domain walk skips `cmd`
 * (a locality's command views are the command-view kind, not templates).
 */
function* walkFiles(
  dir: string,
  ext: string,
  skipDirs: ReadonlySet<string> = new Set(),
): Generator<string> {
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
    if (st.isDirectory()) {
      if (skipDirs.has(entry)) continue;
      yield* walkFiles(full, ext, skipDirs);
    } else if (st.isFile() && entry.endsWith(`.${ext}`)) yield full;
  }
}

/** Recursively yield `.yaml` files under `dir` (skips dotfiles). */
function* walkYaml(dir: string): Generator<string> {
  yield* walkFiles(dir, 'yaml');
}

/** Parse one YAML file to a plain object, or throw a pack-labelled error. */
function readYamlObject(pack: ResolvedPack, file: string, what: string): Record<string, unknown> {
  const raw = readFileSync(file, 'utf-8');
  const parsed = YAML.parse(raw) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(
      `PackApi: pack '${pack.manifest.id}': malformed ${what} at ${file}`,
    );
  }
  return parsed as Record<string, unknown>;
}

/**
 * Read one declared document kind's files from `content/<contentDir>/`.
 * A `.yaml` file's object becomes `data` (a flat-key kind whose file
 * omits the natural key gets it from the basename; a key that disagrees
 * with the basename fails at `read`); an `.msh` file becomes
 * `data: { source }` verbatim (the retired ScriptSeeder's shape). Never a
 * glob over `content/` — each kind's dir is enumerated by the table.
 */
function readDocumentKind(pack: ResolvedPack, spec: DocumentKindSpec): DocumentFile[] {
  const out: DocumentFile[] = [];
  const dir = join(pack.contentRoot, spec.contentDir);
  const root = pack.manifest.root;
  for (const file of walkFiles(dir, spec.ext)) {
    const rel = relative(dir, file).replace(new RegExp(`\\.${spec.ext}$`), '');
    const relKey = rel.split(/[\\/]/).join('/');
    const name = basename(relKey);
    const key = `/${spec.contentDir}/${relKey}`;
    let data: Record<string, unknown>;
    if (spec.ext === 'yaml') {
      data = readYamlObject(pack, file, `${spec.kind} document`);
      const nk = spec.naturalKey;
      if (nk !== null) {
        if (data[nk] === undefined) data[nk] = name;
        else if (String(data[nk]) !== name) {
          throw new Error(
            `PackApi: pack '${pack.manifest.id}': ${spec.kind} document at ${file} ` +
              `declares ${nk} '${String(data[nk])}' but its file name says '${name}' ` +
              `— the basename IS the key`,
          );
        }
      }
      try {
        DOCUMENT_VALIDATORS[spec.kind]?.(data);
      } catch (err) {
        throw new Error(
          `PackApi: pack '${pack.manifest.id}': ${spec.kind} document at ${file}: ${(err as Error).message}`,
        );
      }
    } else {
      data = { source: readFileSync(file, 'utf-8') };
    }
    out.push({
      key,
      path: root + key,
      data,
      relFile: relative(pack.root, file),
    });
  }
  return out;
}

/** Classify a pack's `content/` tree by subdir convention. */
function readContent(pack: ResolvedPack): PackContent {
  const domain: DomainFile[] = [];
  // The template-kind roots — ENUMERATED, never a catch-all glob: the
  // sibling subdirs `quantity/`, `name-banks/`, `descriptor-banks/` are
  // their own kinds and must never be swept into the template kind.
  //  - `content/obj/` — instanceable substrate content (materials, biomes,
  //    species). Was `content/lib/` before the lib/obj taxonomy refactor.
  //  - `content/domain/` — a locality's content (rooms, NPCs, fixtures),
  //    the `/domain/...` namespace (newbie-wilds is the first). The units
  //    slate's "fractal under any root" end-state arrives with wave 4's
  //    path surgery; two enumerated roots is this cycle's honest shape.
  const domainRoots = [join(pack.contentRoot, 'obj'), join(pack.contentRoot, 'domain')];
  // A `cmd/` segment under `content/domain/` is a locality's command
  // views — the command-view document kind, never a template (a view
  // has no `class:` and would fail this walk).
  const skip = new Set(['cmd']);
  for (const file of domainRoots.flatMap((r) => [...walkFiles(r, 'yaml', skip)])) {
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
  // Descriptor banks — the retired name-bank strategy's shape, one kind over.
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

  // Document kinds — one enumerated reader per declared, un-gated kind.
  const documents = new Map<string, DocumentFile[]>();
  for (const spec of activeDocumentKinds()) {
    const files = readDocumentKind(pack, spec);
    if (files.length > 0) documents.set(spec.kind, files);
  }

  const quantityYaml = join(pack.contentRoot, 'quantity', 'quantity-tags.yaml');
  return {
    root: pack.manifest.root,
    domain,
    documents,
    quantityYaml: existsSync(quantityYaml) ? quantityYaml : null,
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
type KindName = 'domain' | 'descriptor-banks' | 'document';

/** The reconcile policy a kind runs under (requirements D5). */
type KindPolicy = 'three-way' | 'merge-missing' | 'cas';

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
  /**
   * For the `document` kind: WHICH document kind. Record baselines,
   * conflicts and dry-run actions carry `document:<documentKind>` as
   * their kind label so `pack diff` output names it.
   */
  documentKind?: string;
  /** TARGET collection. */
  collection: Collections;
  /** Reconcile policy (D5). Default 'three-way'. */
  policy?: KindPolicy;
  /** What a vanished file does to its row. Default 'delete'. */
  onVanish?: DocumentVanishPolicy;
  /**
   * Adoption query for an UNSTAMPED existing row — defaults to
   * `dbKeyQuery`. Flat-key document kinds override it with
   * `{kind, 'data.<naturalKey>': …}` so a migrated legacy row at a
   * provisional path is adopted in place by natural key (D3).
   */
  adoptQuery?(f: F): Record<string, unknown>;
  /**
   * Extra terms on the "rows stamped by this pack" query. ⚠ Load-bearing
   * for the `documents` collection: `{ sourcePack }` alone returns EVERY
   * kind the pack ships, and each kind would see the others' rows as its
   * own vanished files.
   */
  stampedQuery?(): Record<string, unknown>;
  /** The source-file extension `--export` writes (default `yaml`). */
  ext?: string;
  /**
   * The install-record key — the file's content-root-relative path with
   * a leading slash and no `.yaml`. For the domain kind this IS the
   * template path; for a bank it is `/descriptor-banks/<key>`. One uniform
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
  /**
   * KEY + COLLISION CLASS — set for kinds whose keys form a flat
   * namespace across the install set (the banks). Absent for the
   * path-addressed domain kind.
   */
  flatKeyOf?(f: F): string;
  /** The YAML body `--export` writes back to the workspace file. */
  exportBody(row: Record<string, unknown>): Record<string, unknown>;
  /** Archive a row (archive-never-reap kinds only). */
  archive?(id: string): Promise<void>;
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
  exportBody: (r) => {
    const out: Record<string, unknown> = { class: r.class };
    if (r.hydratorClass) out.hydratorClass = r.hydratorClass;
    out.data = r.data ?? {};
    return out;
  },
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
 * Descriptor banks — a flat-keyed bank kind, into
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
  flatKeyOf: (f) => f.key,
  exportBody: (r) => ({
    primaryAxis: r.primaryAxis ?? '',
    secondaryAxis: r.secondaryAxis ?? '',
    primary: r.primary ?? [],
    secondary: r.secondary ?? [],
    unidentifiedLong: r.unidentifiedLong ?? '',
    unidentifiedDetails: r.unidentifiedDetails ?? {},
  }),
};

/** The record key of a document row: its path with the pack root stripped. */
function rowKeyOf(spec: DocumentKindSpec, root: string, r: Record<string, unknown>): string {
  const path = String(r.path ?? '');
  void spec;
  return path.startsWith(`${root}/`) ? path.slice(root.length) : path;
}

/**
 * The document-kind strategy, one per declared kind per pack: rows in
 * `documents` at `root + key`, owned by `root`, stamped, keyed by path
 * (and adopted by natural key when the kind has one). The preimage is
 * `{ data }` only — `owner`/`path`/`kind`/`sourcePack` are bookkeeping.
 */
function documentStrategy(spec: DocumentKindSpec, root: string): KindStrategy<DocumentFile> {
  const nk = spec.naturalKey;
  return {
    kind: 'document',
    documentKind: spec.kind,
    collection: Collections.Documents,
    noun: `${spec.kind} document`,
    policy: 'three-way',
    onVanish: spec.onVanish,
    ext: spec.ext,
    recordKeyOf: (f) => f.key,
    recordKeyOfRow: (r) => rowKeyOf(spec, root, r),
    dbKeyQuery: (f) => ({ kind: spec.kind, path: f.path }),
    adoptQuery: nk ? (f) => ({ kind: spec.kind, [`data.${nk}`]: f.data[nk] }) : undefined,
    stampedQuery: () => ({ kind: spec.kind }),
    rowOf: (f, packId) => ({
      path: f.path,
      owner: root,
      kind: spec.kind,
      data: f.data,
      sourcePack: packId,
    }),
    canonicalBody: (r) => canonical({ data: r.data ?? {} }),
    flatKeyOf: nk ? (f) => String(f.data[nk]) : undefined,
    exportBody: (r) => (r.data ?? {}) as Record<string, unknown>,
  };
}

/** The kind label a baseline / conflict / dry-run action carries. */
function kindLabel(strategy: KindStrategy<unknown>): string {
  return strategy.documentKind ? `document:${strategy.documentKind}` : strategy.kind;
}

type KindChanges = Pick<
  PackReconcileResult,
  'inserted' | 'updated' | 'adopted' | 'deleted'
>;

/** The hash of a canonical body: `sha256:<hex>`. No timestamp, no randomness. */
function hashOf(body: string): string {
  return 'sha256:' + createHash('sha256').update(body).digest('hex');
}

/** Render a canonical body (compact sorted JSON) readably, for `pack diff`. */
function renderBody(body: string): string {
  try {
    return YAML.stringify(JSON.parse(body));
  } catch {
    return body;
  }
}

// --- the install record ----------------------------------------------------

/** A stored record row (the Api type plus its `_id`). */
type StoredRecord = PackInstallRecord & { _id?: string };

async function loadRecord(packId: string): Promise<StoredRecord | null> {
  const rows = (await PersistApi.find(Collections.PackInstalls, {
    packId,
  })) as unknown as StoredRecord[];
  return rows[0] ?? null;
}

/** The one record writer — every record mutation lands through here. */
async function saveRecord(record: StoredRecord): Promise<void> {
  const id = await PersistApi.save(
    Collections.PackInstalls,
    record as unknown as Record<string, unknown>,
  );
  if (!record._id) record._id = id;
}

/** Who is applying: the context-derived author, or `bootstrap` at boot. */
function principalOf(): string {
  const author = ExecutionContextApi.getActingAuthor() as {
    getTemplatePath?(): string | null;
  } | null;
  return author?.getTemplatePath?.() ?? 'bootstrap';
}

function freshRecord(pack: ResolvedPack): StoredRecord {
  return {
    packId: pack.manifest.id,
    version: pack.manifest.version,
    appliedAt: new Date().toISOString(),
    principal: principalOf(),
    status: 'applied',
    failure: null,
    parameters: {},
    rows: {},
    pins: [],
    conflicts: [],
    sideEffects: { kinds: [] },
  };
}

/** An error that knows which install step it belongs to. */
class PackStepError extends Error {
  constructor(
    public readonly step: string,
    message: string,
    public readonly file?: string,
  ) {
    super(message);
  }
}

function failureOf(err: unknown): PackFailure {
  if (err instanceof PackStepError) {
    const f: PackFailure = { step: err.step, error: err.message };
    if (err.file) f.file = err.file;
    return f;
  }
  return {
    step: 'reconcile',
    error: err instanceof Error ? err.message : String(err),
  };
}

// --- plan ------------------------------------------------------------------

type PlanOp = PackPlannedAction['op'];

interface PlannedAction {
  op: PlanOp;
  key: string;
  /** The stamped row's `_id` (update/adopt/delete/keep/conflict). */
  _id?: string;
  /** The row to write (insert/update/adopt). */
  row?: Record<string, unknown>;
  /** The hash + body the baseline becomes (insert/update/adopt/converge/normalize). */
  hash?: string;
  body?: string;
  conflict?: PackConflict;
  /** `keep` for a vanished file of an `onVanish: 'keep'` kind: drop the baseline too. */
  dropBaseline?: boolean;
  /**
   * Bookkeeping re-path (document kinds): a migrated row still at its
   * provisional path (`/emotes/grin`) moves to the pack's `root + key`
   * and owner without a content write — `path`/`owner` are not in the
   * hash preimage, so the converged / normalized / kept cell stays
   * "no content write" while the row lands where the pack says.
   */
  rekey?: { path: string; owner: string };
}

interface KindPlan<F> {
  strategy: KindStrategy<F>;
  actions: PlannedAction[];
}

type StampedRow = Record<string, unknown> & { _id?: string; sourcePack?: string };

/**
 * The pure planner: decide, for every file and every stamped row of one
 * kind, what the reconcile WOULD do — reads only. `record === null` is
 * the adoption bridge (no record yet): two-way, what-we-write wins, and
 * every row's baseline is normalized from what was written. With a
 * record, the A10.4 three-way machine runs per row:
 *
 * | file vs baseline | DB vs baseline | action |
 * |---|---|---|
 * | same | same | nothing |
 * | changed | same | update (baseline := file), silently |
 * | same | changed | keep the DB (`kept`) |
 * | changed | changed, file == DB | converge (baseline := shared), no write |
 * | changed | changed, file ≠ DB | conflict — untouched, recorded, diagnosed |
 *
 * A vanished file deletes a clean row and conflicts (`deleted-vs-edited`)
 * on an edited one. A pinned key is skipped before any comparison. A
 * stamped row with no baseline (a partial older record) is normalized
 * like adoption.
 */
async function computeKindPlan<F>(
  packId: string,
  strategy: KindStrategy<F>,
  files: F[],
  record: StoredRecord | null,
  now: string,
): Promise<KindPlan<F>> {
  const actions: PlannedAction[] = [];
  const pins = new Set(record?.pins ?? []);

  const stampedRows = (await PersistApi.find(strategy.collection, {
    sourcePack: packId,
    ...(strategy.stampedQuery?.() ?? {}),
  })) as StampedRow[];
  const stampedByKey = new Map(
    stampedRows.map((r) => [strategy.recordKeyOfRow(r), r]),
  );
  const fileKeys = new Set(files.map((f) => strategy.recordKeyOf(f)));

  for (const f of files) {
    const key = strategy.recordKeyOf(f);
    if (pins.has(key)) {
      actions.push({ op: 'pinned-skip', key });
      continue;
    }
    const row = strategy.rowOf(f, packId);
    const fileBody = strategy.canonicalBody(row);
    const fileHash = hashOf(fileBody);

    const stamped = stampedByKey.get(key);
    if (stamped) {
      const dbBody = strategy.canonicalBody(stamped);
      const dbHash = hashOf(dbBody);
      const baseline = record?.rows[key] ?? null;
      const rekey =
        strategy.kind === 'document' && stamped.path !== row.path
          ? { path: String(row.path), owner: String(row.owner ?? '') }
          : undefined;
      if (!baseline) {
        // Adoption bridge / missing baseline: two-way, the file wins,
        // and the baseline is normalized from what is written.
        if (dbHash !== fileHash) {
          actions.push({ op: 'update', key, _id: stamped._id, row, hash: fileHash, body: fileBody });
        } else {
          actions.push({ op: 'normalize', key, _id: stamped._id, hash: fileHash, body: fileBody, rekey });
        }
        continue;
      }
      const fileChanged = fileHash !== baseline.hash;
      const dbChanged = dbHash !== baseline.hash;
      if (!fileChanged && !dbChanged) {
        if (!baseline.body || rekey) {
          actions.push({ op: 'normalize', key, _id: stamped._id, hash: fileHash, body: fileBody, rekey });
        }
      } else if (fileChanged && !dbChanged) {
        actions.push({ op: 'update', key, _id: stamped._id, row, hash: fileHash, body: fileBody });
      } else if (!fileChanged && dbChanged) {
        actions.push({ op: 'keep', key, _id: stamped._id, rekey });
      } else if (fileHash === dbHash) {
        actions.push({ op: 'converge', key, _id: stamped._id, hash: fileHash, body: fileBody, rekey });
      } else {
        actions.push({
          op: 'conflict',
          key,
          _id: stamped._id,
          conflict: {
            path: key,
            kind: kindLabel(strategy as KindStrategy<unknown>),
            detectedAt: now,
            baselineHash: baseline.hash,
            dbHash,
            packHash: fileHash,
            reason: 'both-changed',
          },
        });
      }
      continue;
    }

    const existing = (await PersistApi.find(
      strategy.collection,
      strategy.adoptQuery?.(f) ?? strategy.dbKeyQuery(f),
    )) as StampedRow[];
    const prior = existing[0];
    if (prior) {
      // A row exists at this key. Adopt it iff unstamped; refuse to
      // clobber another pack's content.
      if (prior.sourcePack && prior.sourcePack !== packId) {
        throw new PackStepError(
          'reconcile',
          `PackApi: pack '${packId}' wants ${strategy.noun} '${key}' but it ` +
            `is owned by pack '${prior.sourcePack}'`,
        );
      }
      actions.push({ op: 'adopt', key, _id: prior._id, row, hash: fileHash, body: fileBody });
    } else {
      actions.push({ op: 'insert', key, row, hash: fileHash, body: fileBody });
    }
  }

  // Stamped rows whose file vanished.
  for (const r of stampedRows) {
    const key = strategy.recordKeyOfRow(r);
    if (fileKeys.has(key) || !r._id) continue;
    if (pins.has(key)) {
      actions.push({ op: 'pinned-skip', key });
      continue;
    }
    const baseline = record?.rows[key] ?? null;
    const onVanish = strategy.onVanish ?? 'delete';
    if (onVanish === 'keep') {
      // The row stays; only the baseline drops (the kind is never reaped).
      actions.push({ op: 'keep', key, _id: r._id, dropBaseline: true });
      continue;
    }
    if (onVanish === 'archive') {
      actions.push({ op: 'archive', key, _id: r._id });
      continue;
    }
    const dbBody = strategy.canonicalBody(r);
    const dbHash = hashOf(dbBody);
    if (!baseline || dbHash === baseline.hash) {
      actions.push({ op: 'delete', key, _id: r._id });
    } else {
      actions.push({
        op: 'conflict',
        key,
        _id: r._id,
        conflict: {
          path: key,
          kind: kindLabel(strategy as KindStrategy<unknown>),
          detectedAt: now,
          baselineHash: baseline.hash,
          dbHash,
          packHash: '',
          reason: 'deleted-vs-edited',
        },
      });
    }
  }

  return { strategy, actions };
}

interface AppliedKind {
  changes: KindChanges;
  kept: string[];
  /** archive-never-reap kinds: rows archived because their file vanished. */
  archived: string[];
  conflicts: PackConflict[];
  pinnedSkipped: number;
  normalized: number;
}

/** The bookkeeping `$set` of `path`/`owner` a `rekey` action carries. */
async function rekeyRow<F>(strategy: KindStrategy<F>, a: PlannedAction): Promise<void> {
  if (!a.rekey || !a._id) return;
  await PersistApi.save(strategy.collection, { _id: a._id, ...a.rekey });
}

/**
 * The write half: perform a plan's writes through the PersistApi
 * chokepoint and mutate `record.rows` to match. Never called by a dry
 * run — that is what makes dry-run's zero-write promise structural.
 */
async function applyKindPlan<F>(
  plan: KindPlan<F>,
  record: StoredRecord,
): Promise<AppliedKind> {
  const { strategy } = plan;
  const out: AppliedKind = {
    changes: { inserted: [], updated: [], adopted: [], deleted: [] },
    kept: [],
    archived: [],
    conflicts: [],
    pinnedSkipped: 0,
    normalized: 0,
  };
  const baseline = (a: PlannedAction): void => {
    record.rows[a.key] = {
      kind: kindLabel(strategy as KindStrategy<unknown>),
      hash: a.hash!,
      body: a.body!,
    };
  };
  for (const a of plan.actions) {
    switch (a.op) {
      case 'insert':
        await PersistApi.save(strategy.collection, a.row!);
        baseline(a);
        out.changes.inserted.push(a.key);
        break;
      case 'update':
        await PersistApi.save(strategy.collection, { ...a.row!, _id: a._id });
        baseline(a);
        out.changes.updated.push(a.key);
        break;
      case 'adopt':
        await PersistApi.save(strategy.collection, { ...a.row!, _id: a._id });
        baseline(a);
        out.changes.adopted.push(a.key);
        break;
      case 'delete':
        await PersistApi.delete(strategy.collection, a._id!);
        delete record.rows[a.key];
        out.changes.deleted.push(a.key);
        break;
      case 'keep':
        if (a.dropBaseline) delete record.rows[a.key];
        await rekeyRow(strategy, a);
        out.kept.push(a.key);
        break;
      case 'archive':
        // Defined by the archive-never-reap kinds (subjects, step 4); a
        // strategy that plans it must supply `archive`.
        await strategy.archive!(a._id!);
        delete record.rows[a.key];
        out.archived.push(a.key);
        break;
      case 'merge':
      case 'submit':
        throw new Error(`PackApi: op '${a.op}' has no apply for kind '${strategy.kind}'`);
      case 'converge':
        await rekeyRow(strategy, a);
        baseline(a);
        break;
      case 'normalize':
        await rekeyRow(strategy, a);
        baseline(a);
        // A pure re-path over an intact baseline is bookkeeping, not a
        // normalization the operator needs to hear about.
        if (!a.rekey || !record.rows[a.key]?.body) out.normalized++;
        break;
      case 'conflict':
        out.conflicts.push(a.conflict!);
        break;
      case 'pinned-skip':
        out.pinnedSkipped++;
        break;
    }
  }
  return out;
}

/** Every kind's strategy + the files of a pack's content for it. */
function kindsOf(content: PackContent): Array<KindPlanInput<unknown>> {
  const out: Array<KindPlanInput<unknown>> = [
    { strategy: domainStrategy as KindStrategy<unknown>, files: content.domain },
    {
      strategy: descriptorBankStrategy as KindStrategy<unknown>,
      files: content.descriptorBanks,
    },
  ];
  // Every active document kind, files or none: a kind whose files ALL
  // vanished must still be planned so its stamped rows are reaped.
  for (const spec of activeDocumentKinds()) {
    out.push({
      strategy: documentStrategy(spec, content.root) as KindStrategy<unknown>,
      files: content.documents.get(spec.kind) ?? [],
    });
  }
  return out;
}

/** The empty content (every strategy, no files) — the flat-key walk's kind list. */
function emptyContent(root: string): PackContent {
  return {
    root,
    domain: [],
    documents: new Map(activeDocumentKinds().map((s) => [s.kind, []])),
    quantityYaml: null,
    descriptorBanks: [],
  };
}

interface KindPlanInput<F> {
  strategy: KindStrategy<F>;
  files: F[];
}

/** The strategy a record key belongs to, by its prefix. */
function strategyForKey(key: string, root: string): KindStrategy<unknown> {
  if (key.startsWith('/descriptor-banks/')) {
    return descriptorBankStrategy as KindStrategy<unknown>;
  }
  for (const spec of activeDocumentKinds()) {
    if (key.startsWith(`/${spec.contentDir}/`)) {
      return documentStrategy(spec, root) as KindStrategy<unknown>;
    }
  }
  return domainStrategy as KindStrategy<unknown>;
}

/** The file (of any kind) at a record key, or null. */
function fileForKey(content: PackContent, key: string): unknown | null {
  for (const k of kindsOf(content)) {
    const hit = k.files.find((f) => k.strategy.recordKeyOf(f) === key);
    if (hit) return hit;
  }
  return null;
}

// --- flat-key uniqueness ---------------------------------------------------

/** A pack whose content has been read, ready to plan. */
interface ReadPack {
  pack: ResolvedPack;
  content: PackContent;
}

/**
 * The install-set uniqueness check (A17.2): every kind with a flat key
 * namespace (the banks — later kinds plug in by giving their strategy a
 * `flatKeyOf`) must see each key claimed once across the whole install
 * set. A second claimant marks the CLAIMING pack failed, naming the
 * kind, the key, and both `(packId, relFile)` pairs. Never first-wins,
 * never silent. Returns the failures by packId; runs before any write.
 */
function flatKeyFailures(packs: ReadPack[]): Map<string, PackFailure> {
  const failures = new Map<string, PackFailure>();
  for (const k of kindsOf(emptyContent('/'))) {
    if (!k.strategy.flatKeyOf) continue;
    const seen = new Map<string, { packId: string; relFile: string }>();
    for (const rp of packs) {
      const files = filesOfKind(rp.content, k.strategy);
      for (const f of files) {
        const key = k.strategy.flatKeyOf(f);
        const relFile = (f as { relFile: string }).relFile;
        const first = seen.get(key);
        if (!first) {
          seen.set(key, { packId: rp.pack.manifest.id, relFile });
          continue;
        }
        if (!failures.has(rp.pack.manifest.id)) {
          failures.set(rp.pack.manifest.id, {
            step: 'flat-key',
            error:
              `PackApi: pack '${rp.pack.manifest.id}' claims ${k.strategy.noun} ` +
              `key '${key}' (${relFile}) which pack '${first.packId}' ` +
              `already claims (${first.relFile}). Keys are unique across ` +
              `the install set; the second claimant fails.`,
            file: relFile,
          });
        }
      }
    }
  }
  return failures;
}

function filesOfKind(content: PackContent, strategy: KindStrategy<unknown>): unknown[] {
  switch (strategy.kind) {
    case 'domain':
      return content.domain;
    case 'descriptor-banks':
      return content.descriptorBanks;
    case 'document':
      return content.documents.get(strategy.documentKind!) ?? [];
  }
}

// --- reconcile -------------------------------------------------------------

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

/** Read a pack's content, tagging a malformed file as a `read` failure. */
function readPack(pack: ResolvedPack): ReadPack {
  try {
    return { pack, content: readContent(pack) };
  } catch (err) {
    throw new PackStepError('read', err instanceof Error ? err.message : String(err));
  }
}

/** Every pre-write gate for one pack: requires-kernel, then topics. */
async function gatePack(rp: ReadPack): Promise<void> {
  const packId = rp.pack.manifest.id;
  try {
    await assertClassesResolve(packId, rp.content.domain);
  } catch (err) {
    throw new PackStepError('requires-kernel', (err as Error).message);
  }
  try {
    await validatePackTopics(packId, rp.content.domain);
  } catch (err) {
    throw new PackStepError('topics', (err as Error).message);
  }
}

/** Plan every kind of a pack against its record. Reads only. */
async function planPack(
  rp: ReadPack,
  record: StoredRecord | null,
  now: string,
): Promise<Array<KindPlan<unknown>>> {
  const plans: Array<KindPlan<unknown>> = [];
  for (const k of kindsOf(rp.content)) {
    plans.push(
      await computeKindPlan(rp.pack.manifest.id, k.strategy, k.files, record, now),
    );
  }
  return plans;
}

function emptyResult(packId: string): PackReconcileResult {
  return {
    packId,
    inserted: [],
    updated: [],
    adopted: [],
    deleted: [],
    kept: [],
    conflicts: [],
    pinnedSkipped: 0,
    normalized: 0,
    quantityTables: 0,
    documents: {},
    rehydrated: 0,
    failure: null,
  };
}

/**
 * The per-document-kind go-live: what a change to rows of `kind` must
 * drop or re-warm so the edit reaches the next read without a restart.
 * A module-private switch, one case per kind as its reader lands;
 * `msh` needs nothing (`ScriptLogic` reads by path per call and drops
 * its AST cache on the CMS write path).
 */
async function invalidateDocumentKind(kind: string): Promise<void> {
  switch (kind) {
    case 'msh':
      return;
    case 'emote':
      // Only a RESIDENT catalogue is dropped: at boot the install runs
      // before BootstrapManager clones it, and minting it here would
      // race the manifest clone. A resident one re-warms lazily.
      if (StuffApi.findByTemplatePath(TemplatePaths.soulCatalogue)) {
        await SoulApi.invalidateCache();
      }
      return;
    case 'recipe': {
      // The recipe read surface is SYNC, so a resident catalogue is
      // re-warmed here rather than dropped.
      const cat = StuffApi.findByTemplatePath<RecipeCatalogue>('/obj/RecipeCatalogue');
      if (cat) await cat.warm();
      return;
    }
    case 'name-bank':
      // Banks are cached by key on first resolve; the edit must reach
      // the next char-gen suggest.
      NameBank.clearCache();
      return;
    default:
      return;
  }
}

/**
 * The single reconcile implementation, shared by `install` (boot) and
 * `sync` (verb): gate, plan, apply, record, side effects. The only
 * difference is the `rehydrate` tail.
 */
async function reconcilePack(
  rp: ReadPack,
  opts: { rehydrate: boolean },
): Promise<PackReconcileResult> {
  const { pack, content } = rp;
  const packId = pack.manifest.id;
  await gatePack(rp);

  const prior = await loadRecord(packId);
  const now = new Date().toISOString();
  const plans = await planPack(rp, prior, now);

  const record: StoredRecord = prior ?? freshRecord(pack);
  record.version = pack.manifest.version;
  record.appliedAt = now;
  record.principal = principalOf();
  record.status = 'applied';
  record.failure = null;
  const priorConflicts = new Set((prior?.conflicts ?? []).map((c) => c.path));
  record.conflicts = [];

  const result = emptyResult(packId);
  const perKind = new Map<string, AppliedKind>();
  for (const plan of plans) {
    const applied = await applyKindPlan(plan, record);
    perKind.set(kindLabel(plan.strategy), applied);
    result.inserted.push(...applied.changes.inserted);
    result.updated.push(...applied.changes.updated);
    result.adopted.push(...applied.changes.adopted);
    result.deleted.push(...applied.changes.deleted);
    result.kept.push(...applied.kept);
    result.pinnedSkipped += applied.pinnedSkipped;
    result.normalized += applied.normalized;
    record.conflicts.push(...applied.conflicts);
  }
  result.conflicts = record.conflicts.map((c) => c.path);

  // Adoption is loud: the one time a record is minted over a pre-record
  // DB, whatever divergence the DB held was overwritten by the file.
  if (!prior) {
    const n = Object.keys(record.rows).length;
    console.warn(
      `PackApi: pack '${packId}' — ONE-TIME adoption baseline normalized over ` +
        `${n} rows (pre-record DB); pre-existing divergence was overwritten; ` +
        `future reconciles are three-way`,
    );
  } else if (result.normalized > 0) {
    console.warn(
      `PackApi: pack '${packId}' — ${result.normalized} row(s) had no baseline; ` +
        `normalized from what was written`,
    );
  }

  // A newly-detected conflict lands one diagnostic; a persisting one does not.
  for (const c of record.conflicts) {
    if (priorConflicts.has(c.path)) continue;
    await DiagnosticApi.record({
      path: c.kind === 'domain' ? c.path : null,
      severity: 'warning',
      channel: `pack.${packId}`,
      message:
        `pack '${packId}': conflict at ${c.path} — ` +
        (c.reason === 'both-changed'
          ? 'pack and database both changed since install'
          : 'the pack dropped a row the database has edited') +
        `; run \`pack diff ${packId} ${c.path}\` / \`pack resolve ${packId} ${c.path} --take-pack|--keep --pin|--export\``,
    });
  }

  // Side effects (go-live) per document kind.
  for (const [label, applied] of perKind) {
    if (!label.startsWith('document:')) continue;
    const kind = label.slice('document:'.length);
    const c = applied.changes;
    const written = c.inserted.length + c.updated.length + c.adopted.length;
    const touched = written + c.deleted.length + applied.archived.length;
    if (touched > 0 || content.documents.has(kind)) result.documents[kind] = written;
    if (touched > 0) await invalidateDocumentKind(kind);
  }

  const db = perKind.get('descriptor-banks')!;
  const descriptorBanks =
    db.changes.inserted.length + db.changes.updated.length + db.changes.adopted.length;
  if (descriptorBanks + db.changes.deleted.length > 0) {
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

  if (content.quantityYaml) {
    const q = opts.rehydrate
      ? QuantityApi.reloadTagTables(content.quantityYaml)
      : QuantityApi.loadTagTables(content.quantityYaml);
    result.quantityTables = q.registered.length;
    if (!record.sideEffects.kinds.includes('quantity')) {
      record.sideEffects.kinds.push('quantity');
    }
  }

  await saveRecord(record);

  if (opts.rehydrate) {
    const domain = perKind.get('domain')!.changes;
    result.rehydrated = await rehydrate(
      [...domain.inserted, ...domain.updated, ...domain.adopted],
      domain.deleted,
    );
  }
  return result;
}

/** Record a pack's failure (keeping any prior baselines) and report it. */
async function recordFailure(
  pack: ResolvedPack,
  err: unknown,
): Promise<PackReconcileResult> {
  const failure = failureOf(err);
  const record = (await loadRecord(pack.manifest.id)) ?? freshRecord(pack);
  record.status = 'failed';
  record.failure = failure;
  record.appliedAt = new Date().toISOString();
  record.principal = principalOf();
  await saveRecord(record);
  console.error(
    `PackApi: pack '${pack.manifest.id}' FAILED at step '${failure.step}' — ` +
      `booting without it: ${failure.error}`,
  );
  const result = emptyResult(pack.manifest.id);
  result.failure = failure;
  return result;
}

function requireConnection(packId: string): void {
  if (!PersistApi.isConnected()) {
    throw new Error(`PackApi: cannot install pack '${packId}' — no DB connection`);
  }
}

/** Resolve a shipped pack by id (or an explicit root, for tests). */
function resolveOne(packId: string, packRoot?: string): ResolvedPack {
  const pack = packRoot
    ? resolvePack(packRoot)
    : discover().find((p) => p.manifest.id === packId);
  if (!pack) throw new Error(`PackApi: no shipped pack with id '${packId}'`);
  return pack;
}

/** The sibling packs' contents, for the flat-key check around one pack. */
function siblingsOf(pack: ResolvedPack, packRoots?: string[]): ReadPack[] {
  const out: ReadPack[] = [];
  for (const p of discover(packRoots)) {
    if (p.manifest.id === pack.manifest.id) continue;
    try {
      out.push(readPack(p));
    } catch {
      // An unreadable sibling is its own failure; it cannot claim keys.
    }
  }
  return out;
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
    const packs = discover(packRoots);
    if (packs.length > 0) requireConnection(packs[0]!.manifest.id);

    // Read every pack first: the flat-key check needs the whole install
    // set before any pack writes.
    const read: ReadPack[] = [];
    const results = new Map<string, PackReconcileResult>();
    for (const pack of packs) {
      try {
        read.push(readPack(pack));
      } catch (err) {
        results.set(pack.manifest.id, await recordFailure(pack, err));
      }
    }
    const flat = flatKeyFailures(read);

    for (const rp of read) {
      const id = rp.pack.manifest.id;
      const flatFailure = flat.get(id);
      if (flatFailure) {
        results.set(id, await recordFailure(rp.pack, new PackStepError(flatFailure.step, flatFailure.error, flatFailure.file)));
        continue;
      }
      try {
        results.set(id, await reconcilePack(rp, { rehydrate: false }));
      } catch (err) {
        // A failed pack boots WITHOUT the pack; it never bricks the boot.
        results.set(id, await recordFailure(rp.pack, err));
      }
    }
    return packs.map((p) => results.get(p.manifest.id)!);
  }

  /** See {@link PackApi.sync}. */
  @CallSecurity(PackApiCallers)
  public async sync(
    packId: string,
    packRoot?: string,
    packRoots?: string[],
  ): Promise<PackReconcileResult> {
    const pack = resolveOne(packId, packRoot);
    requireConnection(packId);
    const rp = readPack(pack);
    // An explicit root overrides discovery entirely: its siblings are the
    // explicit install set, or nothing.
    const siblings = packRoot && !packRoots ? [] : siblingsOf(pack, packRoots);
    const flat = flatKeyFailures([...siblings, rp]);
    const f = flat.get(packId);
    if (f) throw new PackStepError(f.step, f.error, f.file);
    // An operator at the keyboard: sync throws rather than recording.
    return reconcilePack(rp, { rehydrate: true });
  }

  /** See {@link PackApi.discoverPacks}. */
  @CallSecurity(PackApiCallers)
  public async discoverPacks(): Promise<PackManifest[]> {
    return discover().map((p) => p.manifest);
  }

  /** See {@link PackApi.status}. */
  @CallSecurity(PackApiCallers)
  public async status(packId?: string): Promise<PackStatusReport[]> {
    const manifests = new Map(discover().map((p) => [p.manifest.id, p.manifest]));
    const records = (await PersistApi.find(
      Collections.PackInstalls,
      {},
    )) as unknown as StoredRecord[];
    const byId = new Map(records.map((r) => [r.packId, r]));
    const ids = new Set([...manifests.keys(), ...byId.keys()]);
    const out: PackStatusReport[] = [];
    for (const id of [...ids].sort()) {
      if (packId && id !== packId) continue;
      const m = manifests.get(id);
      const r = byId.get(id);
      out.push({
        packId: id,
        discovered: m !== undefined,
        manifestVersion: m?.version ?? null,
        record: r
          ? {
              version: r.version,
              appliedAt: r.appliedAt,
              principal: r.principal,
              status: r.status,
              failure: r.failure,
              pins: r.pins,
              conflicts: r.conflicts,
            }
          : null,
      });
    }
    return out;
  }

  /** See {@link PackApi.dryRun}. Compute only — `applyKindPlan` is never called. */
  @CallSecurity(PackApiCallers)
  public async dryRun(packId: string, packRoot?: string): Promise<PackDryRunReport> {
    const pack = resolveOne(packId, packRoot);
    requireConnection(packId);
    const rp = readPack(pack);
    await gatePack(rp);
    const record = await loadRecord(packId);
    const plans = await planPack(rp, record, new Date().toISOString());
    const actions: PackPlannedAction[] = [];
    for (const plan of plans) {
      for (const a of plan.actions) {
        actions.push({ op: a.op, key: a.key, kind: kindLabel(plan.strategy) });
      }
    }
    return {
      packId,
      actions,
      conflicts: actions.filter((a) => a.op === 'conflict').map((a) => a.key),
      pinnedSkipped: actions.filter((a) => a.op === 'pinned-skip').length,
    };
  }

  /** See {@link PackApi.diff}. */
  @CallSecurity(PackApiCallers)
  public async diff(packId: string, path?: string, packRoot?: string): Promise<PackDiffReport> {
    const pack = resolveOne(packId, packRoot);
    requireConnection(packId);
    const record = await loadRecord(packId);
    const content = readContent(pack);
    const keys = path ? [path] : (record?.conflicts ?? []).map((c) => c.path);
    const entries: PackDiffEntry[] = [];
    for (const key of keys) {
      const strategy = strategyForKey(key, content.root);
      const baseline = record?.rows[key] ?? null;
      const file = fileForKey(content, key);
      const theirsBody = file ? strategy.canonicalBody(strategy.rowOf(file, packId)) : null;
      const rows = (await PersistApi.find(strategy.collection, {
        sourcePack: packId,
        ...(strategy.stampedQuery?.() ?? {}),
      })) as StampedRow[];
      const dbRow = rows.find((r) => strategy.recordKeyOfRow(r) === key) ?? null;
      const yoursBody = dbRow ? strategy.canonicalBody(dbRow) : null;
      const side = (body: string | null): PackDiffBody | null =>
        body === null ? null : { hash: hashOf(body), body: renderBody(body) };
      entries.push({
        path: key,
        kind: kindLabel(strategy),
        baseline: baseline ? { hash: baseline.hash, body: renderBody(baseline.body) } : null,
        yours: side(yoursBody),
        theirs: side(theirsBody),
      });
    }
    return { packId, entries };
  }

  /** See {@link PackApi.resolve}. */
  @CallSecurity(PackApiCallers)
  public async resolve(
    packId: string,
    path: string,
    mode: PackResolveMode,
    packRoot?: string,
  ): Promise<PackReconcileResult | null> {
    const pack = resolveOne(packId, packRoot);
    requireConnection(packId);
    const record = await loadRecord(packId);
    if (!record) throw new Error(`PackApi: pack '${packId}' has no install record`);
    const content = readContent(pack);
    const strategy = strategyForKey(path, content.root);
    const file = fileForKey(content, path);
    const rows = (await PersistApi.find(strategy.collection, {
      sourcePack: packId,
      ...(strategy.stampedQuery?.() ?? {}),
    })) as StampedRow[];
    const dbRow = rows.find((r) => strategy.recordKeyOfRow(r) === path) ?? null;

    if (mode === 'keep-pin') {
      if (!record.pins.includes(path)) record.pins.push(path);
      record.conflicts = record.conflicts.filter((c) => c.path !== path);
      await saveRecord(record);
      return null;
    }

    if (mode === 'take-pack') {
      if (!file) {
        // The pack dropped the row: taking the pack means deleting it.
        if (dbRow?._id) await PersistApi.delete(strategy.collection, dbRow._id);
        delete record.rows[path];
        record.conflicts = record.conflicts.filter((c) => c.path !== path);
        await saveRecord(record);
        const r = emptyResult(packId);
        r.deleted.push(path);
        if (strategy.kind === 'domain') r.rehydrated = await rehydrate([], [path]);
        else if (strategy.documentKind) await invalidateDocumentKind(strategy.documentKind);
        return r;
      }
      const row = strategy.rowOf(file, packId);
      const body = strategy.canonicalBody(row);
      await PersistApi.save(strategy.collection, dbRow?._id ? { ...row, _id: dbRow._id } : row);
      record.rows[path] = { kind: kindLabel(strategy), hash: hashOf(body), body };
      record.conflicts = record.conflicts.filter((c) => c.path !== path);
      await saveRecord(record);
      const r = emptyResult(packId);
      r.updated.push(path);
      if (strategy.kind === 'domain') r.rehydrated = await rehydrate([path], []);
      else if (strategy.documentKind) await invalidateDocumentKind(strategy.documentKind);
      else {
        DescriptorBank.clearCache();
        Appearance.clearMemo();
      }
      return r;
    }

    // export — the DB row back to the pack's workspace source file. The
    // conflict stays open; the next sync observes file == DB (the
    // converged cell) and clears it.
    if (!dbRow) throw new Error(`PackApi: no database row at '${path}' for pack '${packId}'`);
    const ext = strategy.ext ?? 'yaml';
    const target = join(pack.contentRoot, ...path.replace(/^\//, '').split('/')) + `.${ext}`;
    mkdirSync(dirname(target), { recursive: true });
    const body = strategy.exportBody(dbRow);
    // A text kind (`.msh`) exports its source verbatim, not YAML.
    writeFileSync(
      target,
      ext === 'msh' ? String(body.source ?? '') : YAML.stringify(body),
    );
    return null;
  }

  /** See {@link PackApi.pin}. */
  @CallSecurity(PackApiCallers)
  public async pin(packId: string, path: string): Promise<string[]> {
    const record = await loadRecord(packId);
    if (!record) throw new Error(`PackApi: pack '${packId}' has no install record`);
    if (!record.pins.includes(path)) record.pins.push(path);
    record.conflicts = record.conflicts.filter((c) => c.path !== path);
    await saveRecord(record);
    return [...record.pins];
  }

  /** See {@link PackApi.unpin}. */
  @CallSecurity(PackApiCallers)
  public async unpin(packId: string, path: string): Promise<string[]> {
    const record = await loadRecord(packId);
    if (!record) throw new Error(`PackApi: pack '${packId}' has no install record`);
    record.pins = record.pins.filter((p) => p !== path);
    await saveRecord(record);
    return [...record.pins];
  }
}
