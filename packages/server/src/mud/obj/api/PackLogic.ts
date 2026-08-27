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
import { CommandApi } from '../../api/command';
import { NON_TEMPLATE_DIRS, TemplatePaths, TITLE_ROOTS } from '../../lib/paths';
import { Emote } from '../../lib/social/Emote';
import { Recipe } from '../../lib/craft/Recipe';
import { AppSettings } from '../../lib/config/AppSettings';
import { GroupApi } from '../../api/group';
import { ParcelApi } from '../../api/parcel';
import { AccessApi } from '../../api/access';
import { EmploymentApi } from '../../api/employment';
import { MixinApi } from '../../api/mixin';
import { LandUses } from '../../lib/parcel/LandUse';
import type { ParcelOwner, TitleClaim } from '../../lib/parcel/ParcelRecord';
import type { GroupRole } from '../../lib/social/Group';
import type RecipeCatalogue from '../RecipeCatalogue';
import type BlueprintCatalogue from '../BlueprintCatalogue';
import WikiRegistry, { WikiConflict } from '../WikiRegistry';
import type { WikiPage, WikiSubject } from '../../lib/wiki/WikiPage';
import type SubjectCatalogue from '../SubjectCatalogue';
import type ChannelCatalogue from '../ChannelCatalogue';
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
  PackRequires,
  PackRequiresResult,
  RequiredGroup,
  RequiredTitle,
  PackBootEntry,
  PackMaintainers,
  PackBootManifestEntry,
  PackProvisionReport,
  PackMaintainersInfo,
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
const GATED_DOCUMENT_KINDS: ReadonlySet<DeclaredDocumentKind> = new Set<DeclaredDocumentKind>([]);

/**
 * Per-kind shape validation at `read`: what the retired seeders checked
 * before inserting, moved to the pack boundary so a malformed file fails
 * the pack before any write. A kind with no entry is stored as parsed.
 */
const DOCUMENT_VALIDATORS: Record<string, (data: Record<string, unknown>) => void> = {
  emote: (d) => void Emote.fromData(d),
  recipe: (d) => void Recipe.fromData(d),
  'command-view': (d) => {
    const trail = CommandApi.validateCommandView(d);
    if (trail !== null) throw new Error(`does not conform to the command schema:\n${trail}`);
  },
};

/**
 * A command view's document path is the VIEW KEY's path (no `root`
 * join). ONE rule: an engine key (`perception/look.yaml`, read from
 * `content/cmd/`) lives at `/cmd/<key>`; a content-tree key — a
 * locality's `world/<sphere>/<locality>/cmd/<verb>.yaml`, an industry's
 * `trade/<industry>/cmd/<verb>.yaml` — lives at `/<key>`. The two are told
 * apart by the key's FIRST segment: `cmd` is the engine tree, anything
 * else is a template tree carrying its own `cmd/` views. The dispatcher's
 * key, so `CommandApi.reload` finds it by the same string.
 */
function commandViewPathOf(relKey: string): string {
  return isContentTreeViewKey(relKey) ? `/${relKey}` : `/cmd/${relKey}`;
}

/** Is `relKey` a content-tree view key (`<tree>/…/cmd/<verb>`), not an engine key? */
function isContentTreeViewKey(relKey: string): boolean {
  const parts = relKey.split('/');
  return parts.length > 1 && parts[0] !== 'cmd' && parts.slice(0, -1).includes('cmd');
}

/** The declared kinds the document reader/strategies serve today. */
function activeDocumentKinds(): DocumentKindSpec[] {
  return (Object.keys(DOCUMENT_KINDS) as DeclaredDocumentKind[])
    .filter((k) => !GATED_DOCUMENT_KINDS.has(k))
    .map((k) => DOCUMENT_KINDS[k]);
}

/**
 * One `content/settings/<section>.yaml` — the `app-settings.yaml` shape
 * verbatim (`{ settings: [{key, value}] }`), the merge-missing kind.
 */
interface SettingsFile {
  /** Record key: `/settings/<basename>`. */
  key: string;
  entries: Array<{ key: string; value: string }>;
  relFile: string;
}

/**
 * One `content/subjects/<name>.yaml` — a forum/chat Subject the pack
 * ships (requirements D6): the title, an optional audience group (by
 * name), and which surfaces to light, with optional name overrides.
 */
interface SubjectFile {
  /** Record key: `/subjects/<basename>`. */
  key: string;
  name: string;
  description: string;
  /** A managed group NAME the subject's audience binds to; absent = open. */
  audienceGroup?: string;
  board: boolean;
  channel: boolean;
  /** Effective surface names (the title unless overridden). */
  channelName: string;
  boardName: string;
  relFile: string;
}

/** The rendered, hash-preimage shape of a subject — file side and DB side alike. */
interface SubjectBody extends Record<string, unknown> {
  name: string;
  description: string;
  audience: string;
  board: boolean;
  channel: boolean;
  channelName: string;
  boardName: string;
}

/** A wiki page's frontmatter (the pack file's `---` block). */
interface WikiFront extends Record<string, unknown> {
  title: string;
  subject?: WikiSubject | null;
  tags?: string[];
  related?: string[];
  spoilerLevel?: 0 | 1 | 2 | 3;
}

/**
 * One `content/wiki/<namespace>/<slug>.md` — YAML frontmatter + a
 * markdown body (the article dialect, what `wiki edit` takes), the
 * CAS-submitted `wiki` kind (requirements D9).
 */
interface WikiFile {
  /** Record key: `/wiki/<namespace>/<slug>`. */
  key: string;
  namespace: string;
  slug: string;
  front: WikiFront;
  body: string;
  relFile: string;
}

/** The classified content of a pack's `content/` tree. */
interface PackContent {
  /** The manifest `root` — document paths and owners derive from it. */
  root: string;
  domain: DomainFile[];
  /** Parsed `content/settings/*.yaml` (the merge-missing kind). */
  settings: SettingsFile[];
  /** Parsed `content/subjects/*.yaml` (the archive-never-reap kind). */
  subjects: SubjectFile[];
  /** Parsed `content/wiki/<ns>/<slug>.md` (the CAS kind). */
  wiki: WikiFile[];
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
 * packs this build ships. Relative climb from this module:
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
/** The closed manifest key set — anything else is a typo, and a typo is an error. */
const MANIFEST_KEYS: ReadonlySet<string> = new Set([
  'id', 'version', 'description', 'dependsOn', 'root', 'requires', 'boot', 'maintainers',
]);
const BOOT_ROLES: ReadonlySet<string> = new Set(['sync-read', 'producer']);
const GROUP_ROLES: ReadonlySet<string> = new Set(['owner', 'admin', 'member']);

/** The default maintainers group for a pack that names none. */
function defaultMaintainers(id: string): PackMaintainers {
  return { group: `${id}-maintainers` };
}

function isAbsolutePath(v: unknown): v is string {
  return typeof v === 'string' && v.startsWith('/') && v.length > 1 && !v.endsWith('/');
}

function readRequires(m: Record<string, unknown>, file: string): PackRequires {
  const out: PackRequires = { groups: [], title: [] };
  if (m.requires === undefined) return out;
  const r = m.requires;
  if (!r || typeof r !== 'object' || Array.isArray(r)) {
    throw new Error(`PackApi: manifest at ${file} has a malformed 'requires' (want an object)`);
  }
  const req = r as Record<string, unknown>;
  for (const k of Object.keys(req)) {
    if (k !== 'groups' && k !== 'title') {
      throw new Error(`PackApi: manifest at ${file} has an unknown key 'requires.${k}' (known: groups, title)`);
    }
  }
  const groups = req.groups ?? [];
  if (!Array.isArray(groups)) {
    throw new Error(`PackApi: manifest at ${file} has a malformed 'requires.groups' (want a list)`);
  }
  for (const g of groups as Array<Record<string, unknown>>) {
    if (!g || typeof g.name !== 'string' || g.name.length === 0) {
      throw new Error(`PackApi: manifest at ${file}: every requires.groups entry needs a 'name'`);
    }
    if (typeof g.purpose !== 'string' || g.purpose.trim().length === 0) {
      throw new Error(`PackApi: manifest at ${file}: group '${g.name}' needs a 'purpose'`);
    }
    const entry: RequiredGroup = { name: g.name, purpose: g.purpose.trim() };
    if (g.owner !== undefined) {
      const o = g.owner as Record<string, unknown> | null;
      if (!o || typeof o !== 'object' || typeof o.office !== 'string' || o.office.length === 0) {
        throw new Error(`PackApi: manifest at ${file}: group '${g.name}' owner must be { office: <key> }`);
      }
      entry.owner = { office: o.office };
    }
    if (g.members !== undefined) {
      if (!Array.isArray(g.members)) {
        throw new Error(`PackApi: manifest at ${file}: group '${g.name}' members must be a list`);
      }
      entry.members = (g.members as Array<Record<string, unknown>>).map((mm) => {
        if (!mm || typeof mm.id !== 'string' || mm.id.length === 0) {
          throw new Error(`PackApi: manifest at ${file}: group '${g.name}' has a member without an 'id'`);
        }
        if (mm.role !== undefined && !(typeof mm.role === 'string' && GROUP_ROLES.has(mm.role))) {
          throw new Error(`PackApi: manifest at ${file}: member '${mm.id}' of '${g.name}' has an unknown role`);
        }
        const member: { id: string; role?: GroupRole } = { id: mm.id };
        if (mm.role !== undefined) member.role = mm.role as GroupRole;
        return member;
      });
    }
    out.groups.push(entry);
  }
  const title = req.title ?? [];
  if (!Array.isArray(title)) {
    throw new Error(`PackApi: manifest at ${file} has a malformed 'requires.title' (want a list)`);
  }
  for (const t of title as Array<Record<string, unknown>>) {
    if (!t || !isAbsolutePath(t.extent)) {
      throw new Error(`PackApi: manifest at ${file}: every requires.title entry needs an absolute 'extent'`);
    }
    const entry: RequiredTitle = { extent: t.extent };
    if (t.holder !== undefined) {
      const h = t.holder as Record<string, unknown> | null;
      if (h && typeof h === 'object' && typeof h.group === 'string' && h.group.length > 0) {
        entry.holder = { group: h.group };
      } else if (h && typeof h === 'object' && isAbsolutePath(h.organization)) {
        entry.holder = { organization: h.organization };
      } else {
        throw new Error(
          `PackApi: manifest at ${file}: title '${t.extent}' holder must be { group: <name> } or { organization: </path> }`,
        );
      }
    }
    if (t.landUse !== undefined) {
      if (typeof t.landUse !== 'string' || !LandUses.isLandUse(t.landUse)) {
        throw new Error(
          `PackApi: manifest at ${file}: title '${t.extent}' declares unknown landUse ` +
            `'${String(t.landUse)}' (expected one of ${LandUses.ALL.join(', ')})`,
        );
      }
      entry.landUse = t.landUse;
    }
    if (t.areaM2 !== undefined) {
      if (typeof t.areaM2 !== 'number' || !(t.areaM2 > 0)) {
        throw new Error(`PackApi: manifest at ${file}: title '${t.extent}' has a non-positive areaM2`);
      }
      entry.areaM2 = t.areaM2;
    }
    if (t.parentParcel !== undefined) {
      if (!isAbsolutePath(t.parentParcel)) {
        throw new Error(`PackApi: manifest at ${file}: title '${t.extent}' has a malformed parentParcel`);
      }
      entry.parentParcel = t.parentParcel;
    }
    out.title.push(entry);
  }
  return out;
}

function readBoot(m: Record<string, unknown>, file: string): PackBootEntry[] {
  if (m.boot === undefined) return [];
  if (!Array.isArray(m.boot)) {
    throw new Error(`PackApi: manifest at ${file} has a malformed 'boot' (want a list)`);
  }
  return (m.boot as Array<Record<string, unknown>>).map((b) => {
    if (!b || typeof b !== 'object') {
      throw new Error(`PackApi: manifest at ${file}: every boot entry is an object`);
    }
    for (const k of Object.keys(b)) {
      if (!['template', 'role', 'reason', 'dependsOn'].includes(k)) {
        throw new Error(
          `PackApi: manifest at ${file}: boot entry has an unknown key '${k}' (known: template, role, reason, dependsOn)`,
        );
      }
    }
    if (!isAbsolutePath(b.template)) {
      throw new Error(`PackApi: manifest at ${file}: every boot entry needs an absolute 'template'`);
    }
    if (typeof b.role !== 'string' || !BOOT_ROLES.has(b.role)) {
      throw new Error(`PackApi: manifest at ${file}: boot entry '${b.template}' role must be sync-read or producer`);
    }
    if (typeof b.reason !== 'string' || b.reason.trim().length === 0) {
      throw new Error(`PackApi: manifest at ${file}: boot entry '${b.template}' needs a 'reason'`);
    }
    const entry: PackBootEntry = { template: b.template, role: b.role as PackBootEntry['role'], reason: b.reason.trim() };
    if (b.dependsOn !== undefined) {
      if (!Array.isArray(b.dependsOn) || b.dependsOn.some((d) => typeof d !== 'string')) {
        throw new Error(`PackApi: manifest at ${file}: boot entry '${b.template}' dependsOn must be string[]`);
      }
      entry.dependsOn = b.dependsOn as string[];
    }
    return entry;
  });
}

function readMaintainers(m: Record<string, unknown>, id: string, file: string): PackMaintainers {
  if (m.maintainers === undefined) return defaultMaintainers(id);
  const v = m.maintainers;
  if (typeof v === 'string' && v.length > 0) return { group: v };
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    const o = v as Record<string, unknown>;
    if (typeof o.group === 'string' && o.group.length > 0 && o.organization === undefined) {
      return { group: o.group };
    }
    if (isAbsolutePath(o.organization) && o.group === undefined) {
      return { organization: o.organization };
    }
  }
  throw new Error(
    `PackApi: manifest at ${file} has a malformed 'maintainers' (want a group name, { group: <name> } or { organization: </path> })`,
  );
}

function readManifest(root: string): PackManifest {
  const file = join(root, 'pack.yaml');
  const raw = readFileSync(file, 'utf-8');
  const parsed = YAML.parse(raw) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`PackApi: malformed manifest at ${file}: expected an object`);
  }
  const m = parsed as Record<string, unknown>;
  for (const k of Object.keys(m)) {
    if (!MANIFEST_KEYS.has(k)) {
      throw new Error(
        `PackApi: manifest at ${file} has an unknown key '${k}' (known: ${[...MANIFEST_KEYS].join(', ')})`,
      );
    }
  }
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
    requires: readRequires(m, file),
    boot: readBoot(m, file),
    maintainers: readMaintainers(m, m.id, file),
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
  // Pack zero sorts first regardless (a stable tiebreak): its claims are
  // the hosts every other pack's coverage rides on.
  packs = [...packs].sort((a, b) =>
    a.manifest.id === PLATFORM_PACK ? -1 : b.manifest.id === PLATFORM_PACK ? 1 : 0,
  );
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

const PLATFORM_PACK = 'platform';

/**
 * The D10 install filter: `SAXONBERG_PACKS=platform,expression` (comma-
 * separated ids; unset = every discovered pack). Applied AFTER ordering;
 * an id no shipped pack provides throws at boot. Read from the ambient
 * environment (obj/api is the importing tier; a global is not an import).
 */
function packFilter(): ReadonlySet<string> | null {
  const raw = process.env.SAXONBERG_PACKS;
  if (raw === undefined || raw.trim().length === 0) return null;
  return new Set(raw.split(',').map((s) => s.trim()).filter((s) => s.length > 0));
}

/** Discover + order the shipped packs (or use explicit roots for tests). */
function discover(packRoots?: string[]): ResolvedPack[] {
  const roots =
    packRoots ?? packNamesFromServerDeps().map(resolvePackRootByName);
  const ordered = orderByDependsOn(roots.map(resolvePack));
  const filter = packFilter();
  if (!filter) return ordered;
  const known = new Set(ordered.map((p) => p.manifest.id));
  for (const id of filter) {
    if (!known.has(id)) {
      throw new Error(`PackApi: SAXONBERG_PACKS names '${id}', which no shipped pack provides`);
    }
  }
  return ordered.filter((p) => filter.has(p.manifest.id));
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
  const files: Array<{ file: string; relKey: string }> = [];
  for (const file of walkFiles(dir, spec.ext)) {
    if (spec.kind === 'command-view' && basename(file) === 'command.schema.json') continue;
    if (spec.kind === 'command-view' && relative(dir, file).split(/[\\/]/).includes('__tests__')) continue;
    const rel = relative(dir, file).replace(new RegExp(`\\.${spec.ext}$`), '');
    files.push({ file, relKey: rel.split(/[\\/]/).join('/') });
  }
  if (spec.kind === 'command-view') {
    // A content tree's own command views: `content/<tree>/**/cmd/<verb>.yaml`
    // (a locality's `world/<sphere>/<locality>/cmd/`, an industry's
    // `trade/<industry>/cmd/`), keyed `<tree>/<…>/cmd/<verb>` — the same
    // rule for every template tree (the template walk skips `cmd`).
    for (const e of readdirSync(pack.contentRoot, { withFileTypes: true })) {
      if (!e.isDirectory() || e.name.startsWith('.')) continue;
      if (e.name === 'cmd' || nonTemplateDirs().has(e.name)) continue;
      for (const file of walkFiles(join(pack.contentRoot, e.name), 'yaml')) {
        const rel = relative(pack.contentRoot, file).split(/[\\/]/).join('/');
        const parts = rel.split('/');
        if (!parts.slice(0, -1).includes('cmd')) continue;
        files.push({ file, relKey: rel.replace(/\.yaml$/, '') });
      }
    }
  }
  for (const { file, relKey } of files) {
    const name = basename(relKey);
    const key =
      spec.kind === 'command-view' ? commandViewPathOf(relKey) : `/${spec.contentDir}/${relKey}`;
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
      path: spec.kind === 'command-view' ? commandViewPathOf(relKey) : root + key,
      data,
      relFile: relative(pack.root, file),
    });
  }
  return out;
}

/** Classify a pack's `content/` tree by subdir convention. */
/** The non-template kind dirs (`lib/paths.ts` `NON_TEMPLATE_DIRS`, enumerated by kind). */
function nonTemplateDirs(): ReadonlySet<string> {
  return NON_TEMPLATE_DIRS;
}

function readContent(pack: ResolvedPack): PackContent {
  const domain: DomainFile[] = [];
  // The template kind is EVERY `.yaml` under `content/` outside the
  // declared non-template kind dirs (wave 3): a pack ships a row at the
  // path its file mirrors, wherever in the tree that path lives —
  // `content/corpo/aevex.yaml` → `/corpo/aevex`, `content/home.yaml` →
  // `/home`, `content/wiki/main.yaml` → `/wiki/main` (the namespace ZONE
  // rows; the wiki PAGES beside them are `.md`, a different extension,
  // read by the wiki kind below). `cmd/` is skipped at ANY depth — a
  // command view has no `class:` and is the command-view document kind.
  const kindDirs = nonTemplateDirs();
  const topLevel = readdirSync(pack.contentRoot, { withFileTypes: true }).filter(
    (e) => !e.name.startsWith('.'),
  );
  const templateFiles: string[] = [];
  const cmdOnly = new Set(['cmd']);
  for (const e of topLevel) {
    const full = join(pack.contentRoot, e.name);
    if (e.isDirectory()) {
      if (kindDirs.has(e.name) || e.name === 'cmd') continue;
      templateFiles.push(...walkFiles(full, 'yaml', cmdOnly));
    } else if (e.isFile() && e.name.endsWith('.yaml')) {
      templateFiles.push(full);
    }
  }
  for (const file of templateFiles) {
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

  // Settings — `{ settings: [{key, value}] }` per section file.
  const settings: SettingsFile[] = [];
  for (const file of walkYaml(join(pack.contentRoot, 'settings'))) {
    const doc = readYamlObject(pack, file, 'settings file');
    const raw = Array.isArray(doc.settings) ? (doc.settings as unknown[]) : null;
    if (!raw) {
      throw new Error(
        `PackApi: pack '${pack.manifest.id}': settings file at ${file} needs a 'settings' list`,
      );
    }
    const entries: Array<{ key: string; value: string }> = [];
    for (const e of raw) {
      const entry = e as Record<string, unknown> | null;
      if (!entry || typeof entry.key !== 'string' || entry.key.length === 0) {
        throw new Error(
          `PackApi: pack '${pack.manifest.id}': malformed entry in ${file}: missing 'key'`,
        );
      }
      entries.push({ key: entry.key, value: String(entry.value ?? '') });
    }
    settings.push({
      key: `/settings/${basename(file).replace(/\.yaml$/, '')}`,
      entries,
      relFile: relative(pack.root, file),
    });
  }

  // Subjects — the D6 shape.
  const subjects: SubjectFile[] = [];
  for (const file of walkYaml(join(pack.contentRoot, 'subjects'))) {
    const doc = readYamlObject(pack, file, 'subject');
    if (typeof doc.name !== 'string' || doc.name.trim().length === 0) {
      throw new Error(
        `PackApi: pack '${pack.manifest.id}': subject at ${file} is missing a string 'name'`,
      );
    }
    const name = doc.name.trim();
    const surface = (v: unknown): { on: boolean; name?: string } => {
      if (v === true) return { on: true };
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        const n = (v as { name?: unknown }).name;
        return { on: true, name: typeof n === 'string' ? n : undefined };
      }
      return { on: false };
    };
    const board = surface(doc.board);
    const channel = surface(doc.channel);
    const audience = doc.audience as { group?: unknown } | undefined;
    const audienceGroup =
      audience && typeof audience === 'object' && typeof audience.group === 'string'
        ? audience.group
        : undefined;
    subjects.push({
      key: `/subjects/${basename(file).replace(/\.yaml$/, '')}`,
      name,
      description: typeof doc.description === 'string' ? doc.description.trim() : '',
      ...(audienceGroup !== undefined ? { audienceGroup } : {}),
      board: board.on,
      channel: channel.on,
      channelName: channel.name ?? name,
      boardName: board.name ?? name,
      relFile: relative(pack.root, file),
    });
  }

  // Wiki pages — frontmatter + markdown body, one per `<ns>/<slug>.md`.
  const wiki: WikiFile[] = [];
  const wikiRoot = join(pack.contentRoot, 'wiki');
  for (const file of walkFiles(wikiRoot, 'md')) {
    const rel = relative(wikiRoot, file).replace(/\.md$/, '').split(/[\\/]/);
    if (rel.length !== 2) {
      throw new Error(
        `PackApi: pack '${pack.manifest.id}': wiki page at ${file} must be content/wiki/<namespace>/<slug>.md`,
      );
    }
    const [namespace, slug] = rel as [string, string];
    const { front, body } = splitFrontmatter(readFileSync(file, 'utf-8'), pack.manifest.id, file);
    wiki.push({ key: `/wiki/${namespace}/${slug}`, namespace, slug, front, body, relFile: relative(pack.root, file) });
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
    settings,
    subjects,
    wiki,
    documents,
    quantityYaml: existsSync(quantityYaml) ? quantityYaml : null,
    descriptorBanks,
  };
}

/** Split `---\n<yaml>\n---\n<body>` into a validated frontmatter + the body verbatim. */
function splitFrontmatter(
  text: string,
  packId: string,
  file: string,
): { front: WikiFront; body: string } {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text);
  if (!m) {
    throw new Error(`PackApi: pack '${packId}': wiki page at ${file} has no frontmatter block`);
  }
  const parsed = YAML.parse(m[1]!) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`PackApi: pack '${packId}': malformed frontmatter at ${file}`);
  }
  const raw = parsed as Record<string, unknown>;
  if (typeof raw.title !== 'string' || raw.title.trim().length === 0) {
    throw new Error(`PackApi: pack '${packId}': wiki page at ${file} needs a string 'title'`);
  }
  const front: WikiFront = { title: raw.title.trim() };
  if (raw.subject !== undefined) front.subject = (raw.subject ?? null) as WikiSubject | null;
  if (Array.isArray(raw.tags)) front.tags = stringArray(raw.tags);
  if (Array.isArray(raw.related)) front.related = stringArray(raw.related);
  if (typeof raw.spoilerLevel === 'number' && [0, 1, 2, 3].includes(raw.spoilerLevel)) {
    front.spoilerLevel = raw.spoilerLevel as 0 | 1 | 2 | 3;
  }
  return { front, body: m[2] ?? '' };
}

/** The inverse of {@link splitFrontmatter} — what `--export` writes. */
function renderFrontmatter(front: WikiFront, body: string): string {
  const out: Record<string, unknown> = { title: front.title };
  if (front.subject) out.subject = front.subject;
  if (front.tags && front.tags.length > 0) out.tags = front.tags;
  if (front.related && front.related.length > 0) out.related = front.related;
  if (front.spoilerLevel) out.spoilerLevel = front.spoilerLevel;
  return `---\n${YAML.stringify(out)}---\n${body}`;
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
    // Pack zero SHIPS the seven root descriptors (content-packs wave 3):
    // the closed root set is `TOPIC_ROOTS` in code, and the platform's
    // rows are its descriptors, not new roots. Every other pack adds
    // leaves only.
    if (!key.includes('.') && packId !== PLATFORM_PACK) {
      throw new Error(
        `pack '${packId}' declares topic '${key}', which is a root. ` +
          `Packs may add leaves only.`,
      );
    }
  }
}


// --- the per-kind strategy -------------------------------------------------

/** The DB collections a shipped content kind lands in. */
type KindName = 'domain' | 'descriptor-banks' | 'document' | 'settings' | 'subject' | 'wiki';

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
   * KEY + COLLISION CLASS for a file that claims SEVERAL flat keys (a
   * settings file claims every key it carries; a subject claims its
   * title and its surface names). Takes precedence over `flatKeyOf`.
   */
  flatKeysOf?(f: F): string[];
  /**
   * Load this pack's stamped rows, RENDERED to the hash-preimage shape,
   * when that needs async lookups (a subject's surfaces live in other
   * collections). Default: `find(collection, {sourcePack, …stampedQuery})`.
   */
  loadStamped?(packId: string): Promise<StampedRow[]>;
  /**
   * Custom writer for insert / adopt / update when a row is not one
   * `PersistApi.save` (a subject mints its surfaces too). Receives the
   * file and, for adopt/update, the existing row's `_id`.
   */
  write?(op: 'insert' | 'adopt' | 'update', f: F, packId: string, id?: string): Promise<void>;
  /** A pre-write gate over the kind's files (run at `gatePack`). */
  gate?(packId: string, files: F[]): Promise<void>;
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

/** The record key of a document row: its path with the pack root stripped (command views: identity). */
function rowKeyOf(spec: DocumentKindSpec, root: string, r: Record<string, unknown>): string {
  const path = String(r.path ?? '');
  if (spec.kind === 'command-view') return path;
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

// --- the settings kind (merge-missing, requirements D5/D7) ------------------

/**
 * Settings — the `app_settings` singleton's defaults, split by section
 * file. Policy `merge-missing`: a key the singleton lacks is merged in;
 * a key the operator has tuned is never touched and never a conflict
 * (`kept`); a vanished file drops its baseline and keeps every value.
 * The baseline is the file body, so `pack diff` shows the pack default
 * against the operator's value.
 */
const settingsStrategy: KindStrategy<SettingsFile> = {
  kind: 'settings',
  collection: Collections.AppSettings,
  noun: 'settings',
  policy: 'merge-missing',
  onVanish: 'keep',
  recordKeyOf: (f) => f.key,
  recordKeyOfRow: () => '',
  dbKeyQuery: () => ({}),
  rowOf: (f) => ({ settings: f.entries }),
  canonicalBody: (r) => canonical({ settings: r.settings ?? [] }),
  flatKeysOf: (f) => f.entries.map((e) => e.key),
  exportBody: (r) => ({ settings: r.settings ?? [] }),
};

/** The `app_settings` singleton row, or null. */
async function loadSettingsSingleton(): Promise<(StampedRow & { values?: Record<string, string> }) | null> {
  const rows = (await PersistApi.find(Collections.AppSettings, {})) as Array<
    StampedRow & { values?: Record<string, string> }
  >;
  return rows[0] ?? null;
}

// --- the wiki kind (CAS submit, requirements D9) -----------------------------

/** The live page rendered to the preimage shape: `{ front, body }`. */
function wikiPageBody(page: WikiPage): { front: WikiFront; body: string } {
  const front: WikiFront = { title: page.getTitle() };
  const subject = page.getSubject();
  if (subject) front.subject = subject;
  const tags = [...page.getTags()];
  if (tags.length > 0) front.tags = tags;
  const related = [...page.getRelated()];
  if (related.length > 0) front.related = related;
  const spoiler = page.getSpoilerLevel();
  if (spoiler) front.spoilerLevel = spoiler;
  return { front, body: page.getBody() };
}

/** The file rendered to the same preimage shape. */
function wikiFileBody(f: WikiFile): { front: WikiFront; body: string } {
  const front: WikiFront = { title: f.front.title };
  if (f.front.subject) front.subject = f.front.subject;
  if (f.front.tags && f.front.tags.length > 0) front.tags = [...f.front.tags];
  if (f.front.related && f.front.related.length > 0) front.related = [...f.front.related];
  if (f.front.spoilerLevel) front.spoilerLevel = f.front.spoilerLevel;
  return { front, body: f.body };
}

/** The wiki registry (a lazy singleton — resident or minted on first use). */
async function wikiRegistry(): Promise<WikiRegistry> {
  return (
    StuffApi.findByTemplatePath<WikiRegistry>(TemplatePaths.wikiRegistry) ??
    (await WikiRegistry.instance())
  );
}

/**
 * Wiki pages — submitted through the registry's own create/edit path
 * AS the pack (`asInstaller`), never written as rows: a page has a
 * revision log and a compare-and-swap edit, and the pack is one more
 * editor. Policy `cas`; a vanished file keeps the page (`onVanish:
 * 'keep'`) — a wiki page is community property the moment it exists.
 */
const wikiStrategy: KindStrategy<WikiFile> = {
  kind: 'wiki',
  collection: Collections.Wiki,
  noun: 'wiki page',
  policy: 'cas',
  onVanish: 'keep',
  ext: 'md',
  recordKeyOf: (f) => f.key,
  recordKeyOfRow: (r) => String(r.key ?? ''),
  dbKeyQuery: (f) => ({ namespace: f.namespace, slug: f.slug }),
  rowOf: (f) => wikiFileBody(f),
  canonicalBody: (r) => canonical({ front: r.front ?? {}, body: r.body ?? '' }),
  flatKeysOf: (f) => [`${f.namespace}:${f.slug}`],
  exportBody: (r) => ({ front: r.front ?? {}, body: r.body ?? '' }),
};

/**
 * The CAS planner (wiki): resolve each page by slug OR alias (the
 * retired seeder's rename-safe rule); absent → `submit` (create);
 * present with an unchanged file → nothing; present with a changed
 * file → `submit` (edit) carrying the baseline's `rev` as the CAS
 * token — the conflict is decided at APPLY, where the registry throws;
 * present with NO baseline (a seeder-made page) → `normalize` with the
 * live `rev` (no edit submitted). A vanished file → `keep`, baseline
 * dropped.
 */
async function planCas<F>(
  strategy: KindStrategy<F>,
  files: F[],
  record: StoredRecord | null,
  pins: Set<string>,
): Promise<KindPlan<F>> {
  const actions: PlannedAction[] = [];
  // The registry is a lazy singleton: a pack shipping no pages never
  // resolves (or mints) it.
  const registry = files.length > 0 ? await wikiRegistry() : null;
  const fileKeys = new Set<string>();
  // The one CAS kind is the wiki; its files are WikiFile (kindsOf pairs them).
  const wiki = strategy as unknown as KindStrategy<WikiFile>;
  for (const f of files as unknown as WikiFile[]) {
    const key = f.key;
    fileKeys.add(key);
    if (pins.has(key)) {
      actions.push({ op: 'pinned-skip', key });
      continue;
    }
    const body = wiki.canonicalBody(wiki.rowOf(f, ''));
    const hash = hashOf(body);
    const hit = await registry!.resolve(`${f.namespace}:${f.slug}`);
    if (!hit) {
      actions.push({ op: 'submit', key, file: f, hash, body, submit: 'create' });
      continue;
    }
    const baseline = record?.rows[key] ?? null;
    if (!baseline) {
      actions.push({ op: 'normalize', key, hash, body, rev: hit.page.getRev() });
      continue;
    }
    if (hash === baseline.hash) {
      if (baseline.rev === undefined) actions.push({ op: 'normalize', key, hash, body, rev: hit.page.getRev() });
      continue;
    }
    actions.push({ op: 'submit', key, file: f, hash, body, submit: 'edit', baseRev: baseline.rev });
  }
  const label = kindLabel(strategy as KindStrategy<unknown>);
  for (const [key, baseline] of Object.entries(record?.rows ?? {})) {
    if (baseline.kind !== label || fileKeys.has(key)) continue;
    actions.push(pins.has(key) ? { op: 'pinned-skip', key } : { op: 'keep', key, dropBaseline: true });
  }
  return { strategy, actions };
}

/** Apply one wiki `submit`: create or CAS-edit through the registry AS the pack. */
async function submitWiki(
  a: PlannedAction,
  packId: string,
  now: string,
): Promise<{ rev: number } | { conflict: PackConflict }> {
  const f = a.file as WikiFile;
  const registry = await wikiRegistry();
  if (a.submit === 'create') {
    const page = await registry.createPage({
      namespace: f.namespace,
      slug: f.slug,
      title: f.front.title,
      body: f.body,
      subject: f.front.subject ?? null,
      tags: f.front.tags ?? [],
      related: f.front.related ?? [],
      spoilerLevel: f.front.spoilerLevel ?? 0,
      summary: `installed by pack ${packId}`,
      asInstaller: packId,
    });
    return { rev: page.getRev() };
  }
  const hit = await registry.resolve(`${f.namespace}:${f.slug}`);
  if (!hit) {
    // Vanished between plan and apply: create instead.
    return submitWiki({ ...a, submit: 'create' }, packId, now);
  }
  try {
    const page = await registry.editPage(hit.page, f.body, {
      baseRev: a.baseRev,
      summary: `updated by pack ${packId}`,
      asInstaller: packId,
      fields: {
        title: f.front.title,
        subject: f.front.subject ?? null,
        tags: f.front.tags ?? [],
        related: f.front.related ?? [],
        spoilerLevel: f.front.spoilerLevel ?? 0,
      },
    });
    return { rev: page.getRev() };
  } catch (err) {
    if (!(err instanceof WikiConflict)) throw err;
    const live = canonical(wikiPageBody(hit.page));
    return {
      conflict: {
        path: a.key,
        kind: 'wiki',
        detectedAt: now,
        baselineHash: a.baselineHash ?? '',
        dbHash: hashOf(live),
        packHash: a.hash!,
        reason: 'wiki-cas',
      },
    };
  }
}

// --- the subject kind (archive-never-reap, requirements D6) ----------------

/** A URL-ish slug of a title, for a stamped row whose file is gone. */
function slugOf(title: string): string {
  return title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function subjectFileBody(f: SubjectFile): SubjectBody {
  return {
    name: f.name,
    // A description lives on the BOARD (a Subject row has none), so a
    // channel-only subject cannot carry one — rendering it here would
    // read as a permanent DB divergence (`kept` every boot; found by the
    // drive: platform's 3 subjects). Both sides render it the same way.
    description: f.board ? f.description : '',
    audience: f.audienceGroup ?? '',
    board: f.board,
    channel: f.channel,
    channelName: f.channelName,
    boardName: f.boardName,
  };
}

/** A managed group's `managed:<id>` ref by NAME, or null. */
async function managedGroupRefByName(name: string): Promise<string | null> {
  const registry = await GroupApi.registry();
  const g = await registry.managed().findByName(name);
  return g?._id ? `managed:${g._id}` : null;
}

/** A managed group's name from its `managed:<id>` ref, or '' (open / unknown). */
async function managedGroupNameOf(ref: string): Promise<string> {
  if (!ref) return '';
  try {
    const { source, id } = GroupApi.parseRef(ref);
    if (source !== 'managed') return ref;
    // ⚠ By id through findById — a `{_id}` query with a string never
    // matches a real ObjectId (found by the drive: the platform pack
    // minted a duplicate "Chat" channel).
    const row = (await PersistApi.findById(Collections.Groups, id)) as { name?: string } | null;
    return row?.name ?? ref;
  } catch {
    return ref;
  }
}

type SubjectRow = StampedRow & {
  title?: string;
  owner?: string;
  groupRef?: string;
  state?: string;
  manifestations?: Array<{ surface: string; ref: string }>;
};
type SurfaceRow = StampedRow & { name?: string; description?: string; archived?: boolean };

async function surfaceRowOf(
  col: Collections,
  subject: SubjectRow,
  surface: string,
): Promise<SurfaceRow | null> {
  const ref = subject.manifestations?.find((m) => m.surface === surface)?.ref;
  if (!ref) return null;
  return ((await PersistApi.findById(col, ref)) as SurfaceRow | null) ?? null;
}

/** Render a stored Subject (+ its surfaces) to the preimage shape. */
async function renderSubjectRow(row: SubjectRow): Promise<SubjectBody> {
  const channel = await surfaceRowOf(Collections.Channels, row, 'open-chat');
  const board = await surfaceRowOf(Collections.ForumBoards, row, 'open-forum');
  const channelOn = channel !== null && channel.archived !== true;
  const boardOn = board !== null && board.archived !== true;
  const name = row.title ?? '';
  return {
    name,
    description: board?.description ?? '',
    audience: await managedGroupNameOf(row.groupRef ?? ''),
    board: boardOn,
    channel: channelOn,
    channelName: channelOn ? channel!.name ?? name : name,
    boardName: boardOn ? board!.name ?? name : name,
  };
}

/**
 * Write a subject from its file: the Subject row (owner `pack:<id>`, the
 * pack IS the author of what it ships), then each lit surface — minted
 * when missing, renamed when overridden, archived when switched off.
 * The rows are written the way the retired ChannelSeeder wrote them
 * (Documents through the PersistApi chokepoint): at boot the catalogues
 * are not yet resident, and they warm from these rows afterwards; a
 * live `pack sync` drops the resident caches in the go-live.
 */
async function writeSubject(
  f: SubjectFile,
  packId: string,
  existingId?: string,
): Promise<void> {
  const groupRef = f.audienceGroup ? await managedGroupRefByName(f.audienceGroup) : '';
  if (f.audienceGroup && !groupRef) {
    throw new Error(
      `PackApi: pack '${packId}': subject '${f.name}' names audience group '${f.audienceGroup}', which does not exist`,
    );
  }
  const existing = existingId
    ? (((await PersistApi.findById(Collections.ForumSubjects, existingId)) as SubjectRow | null) ??
      undefined)
    : undefined;
  const subjectRow: Record<string, unknown> = {
    ...(existingId ? { _id: existingId } : {}),
    title: f.name,
    owner: `pack:${packId}`,
    groupRef,
    lifecycleClass: existing?.lifecycleClass ?? 'standing',
    state: 'active',
    grain: existing?.grain ?? 'venue',
    parentSubject: existing?.parentSubject ?? null,
    boardScopedName: existing?.boardScopedName ?? null,
    // ⚠ `manifestations` is NOT set here: it is written once, at the end,
    // after every surface is settled — an earlier revision reset it to
    // `[]` on this save and, when the surface mint then threw, left the
    // Subject unlinked from a channel that still existed (found by the
    // drive: every retry tried to mint a second "Chat").
    ...(existingId ? {} : { manifestations: [] }),
    sourcePack: packId,
  };
  const subjectId = await PersistApi.save(Collections.ForumSubjects, subjectRow);
  const manifestations = [...(existing?.manifestations ?? [])];
  const ensureSurface = async (
    on: boolean,
    surface: string,
    col: Collections,
    mint: () => Record<string, unknown>,
    name: string,
    description?: string,
  ): Promise<void> => {
    const idx = manifestations.findIndex((m) => m.surface === surface);
    const ref = idx >= 0 ? manifestations[idx]!.ref : null;
    let row = ref
      ? (((await PersistApi.findById(col, ref)) as SurfaceRow | null) ?? undefined)
      : undefined;
    if (on && !row) {
      // Adopt before minting: a surface row that already points at this
      // subject (a lost manifestation link), or a legacy row by NAME
      // (the pre-Subject seeder's channels), is this surface.
      const bySubject = (await PersistApi.find(col, { subject: subjectId })) as SurfaceRow[];
      const byName = bySubject.length
        ? []
        : ((await PersistApi.find(col, { name })) as SurfaceRow[]);
      const found = bySubject[0] ?? byName[0];
      if (found?._id) {
        row = found;
        if (idx >= 0) manifestations[idx] = { surface, ref: found._id };
        else manifestations.push({ surface, ref: found._id });
        await PersistApi.save(col, { _id: found._id, subject: subjectId });
      }
    }
    if (on) {
      if (row) {
        const set: Record<string, unknown> = { _id: row._id, archived: false, name };
        if (description !== undefined) set.description = description;
        await PersistApi.save(col, set);
      } else {
        const id = await PersistApi.save(col, {
          ...mint(),
          name,
          ...(description !== undefined ? { description } : {}),
          archived: false,
        });
        manifestations.push({ surface, ref: id });
      }
    } else if (row && row.archived !== true) {
      await PersistApi.save(col, { _id: row._id, archived: true });
    }
  };
  await ensureSurface(
    f.channel,
    'open-chat',
    Collections.Channels,
    () => ({
      kind: groupRef ? 'player-created' : 'open-join-standalone',
      subject: subjectId,
      procedure: 'open',
    }),
    f.channelName,
  );
  await ensureSurface(
    f.board,
    'open-forum',
    Collections.ForumBoards,
    () => ({ subject: subjectId, organizer: 'open', override: {} }),
    f.boardName,
    f.description,
  );
  await PersistApi.save(Collections.ForumSubjects, { _id: subjectId, manifestations });
}

/** Archive a subject and its surfaces. Never a delete. */
async function archiveSubject(id: string): Promise<void> {
  const row = (await PersistApi.findById(Collections.ForumSubjects, id)) as SubjectRow | null;
  if (!row) return;
  await PersistApi.save(Collections.ForumSubjects, { _id: id, state: 'archived' });
  for (const m of row.manifestations ?? []) {
    const col = m.surface.endsWith('-chat') ? Collections.Channels : Collections.ForumBoards;
    await PersistApi.save(col, { _id: m.ref, archived: true });
  }
}

/**
 * Subjects — `forum_subjects` rows (+ their channel / board surfaces),
 * adopted by TITLE (the retired ChannelSeeder's rows), rendered to one
 * preimage shape on both sides so the three-way compares like-for-like.
 * `onVanish: 'archive'`: never reaped.
 */
function subjectStrategy(files: SubjectFile[]): KindStrategy<SubjectFile> {
  const keyByTitle = new Map(files.map((f) => [f.name.toLowerCase(), f.key]));
  return {
    kind: 'subject',
    collection: Collections.ForumSubjects,
    noun: 'subject',
    policy: 'three-way',
    onVanish: 'archive',
    recordKeyOf: (f) => f.key,
    recordKeyOfRow: (r) => {
      const title = String((r as SubjectRow).title ?? '');
      return keyByTitle.get(title.toLowerCase()) ?? `/subjects/${slugOf(title)}`;
    },
    dbKeyQuery: (f) => ({ title: f.name }),
    adoptQuery: (f) => ({ title: f.name }),
    rowOf: (f) => subjectFileBody(f),
    canonicalBody: (r) =>
      canonical(
        (r as { rendered?: SubjectBody }).rendered ??
          ({
            name: r.name,
            description: r.description,
            audience: r.audience,
            board: r.board,
            channel: r.channel,
            channelName: r.channelName,
            boardName: r.boardName,
          } as SubjectBody),
      ),
    flatKeysOf: (f) =>
      [...new Set([f.name, f.channelName, f.boardName].map((n) => n.toLowerCase()))],
    exportBody: (r) => {
      const b = ((r as { rendered?: SubjectBody }).rendered ?? r) as SubjectBody;
      const out: Record<string, unknown> = { name: b.name };
      if (b.description) out.description = b.description;
      if (b.audience) out.audience = { group: b.audience };
      if (b.board) out.board = b.boardName !== b.name ? { name: b.boardName } : true;
      if (b.channel) out.channel = b.channelName !== b.name ? { name: b.channelName } : true;
      return out;
    },
    loadStamped: async (packId) => {
      const rows = (await PersistApi.find(Collections.ForumSubjects, {
        sourcePack: packId,
      })) as SubjectRow[];
      const out: StampedRow[] = [];
      for (const r of rows) {
        out.push({ ...r, rendered: await renderSubjectRow(r), archived: r.state === 'archived' });
      }
      return out;
    },
    write: (op, f, packId, id) => writeSubject(f, packId, op === 'insert' ? undefined : id),
    archive: archiveSubject,
    gate: async (packId, fs) => {
      for (const f of fs) {
        if (f.audienceGroup && !(await managedGroupRefByName(f.audienceGroup))) {
          throw new Error(
            `PackApi: pack '${packId}': subject '${f.name}' (${f.relFile}) names audience ` +
              `group '${f.audienceGroup}', which does not exist`,
          );
        }
      }
    },
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
    requires: { groups: [], title: [] },
    boot: [],
    maintainers: defaultMaintainers(pack.manifest.id),
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
  /** The source file (kinds with a custom `write`). */
  file?: unknown;
  /** `merge`: the keys (and values) the singleton lacks. */
  missing?: Record<string, string>;
  /** `submit` (wiki): create, or a CAS edit over `baseRev`. */
  submit?: 'create' | 'edit';
  baseRev?: number;
  baselineHash?: string;
  /** The page revision the baseline is taken at (CAS kinds). */
  rev?: number;
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
  sold?: (path: string) => Promise<boolean>,
): Promise<KindPlan<F>> {
  const actions: PlannedAction[] = [];
  const pins = new Set(record?.pins ?? []);

  if (strategy.policy === 'merge-missing') {
    return planMergeMissing(strategy, files, record, pins);
  }
  if (strategy.policy === 'cas') {
    const plan = await planCas(strategy, files, record, pins);
    for (const a of plan.actions) {
      if (a.op === 'submit' && a.submit === 'edit') a.baselineHash = record?.rows[a.key]?.hash;
    }
    return plan;
  }

  const stampedRows =
    (await strategy.loadStamped?.(packId)) ??
    ((await PersistApi.find(strategy.collection, {
      sourcePack: packId,
      ...(strategy.stampedQuery?.() ?? {}),
    })) as StampedRow[]);
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
    if (strategy.kind === 'domain' && sold && (await sold(key))) {
      actions.push({ op: 'skip-sold', key });
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
          actions.push({ op: 'update', key, _id: stamped._id, row, file: f, hash: fileHash, body: fileBody });
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
        actions.push({ op: 'update', key, _id: stamped._id, row, file: f, hash: fileHash, body: fileBody });
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
      actions.push({ op: 'adopt', key, _id: prior._id, row, file: f, hash: fileHash, body: fileBody });
    } else {
      actions.push({ op: 'insert', key, row, file: f, hash: fileHash, body: fileBody });
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
      // Already archived on an earlier run: nothing to do, nothing to report.
      if ((r as { archived?: boolean }).archived !== true) {
        actions.push({ op: 'archive', key, _id: r._id });
      }
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

/**
 * The merge-missing planner (settings): no stamped rows — the target is
 * the one `app_settings` singleton. Per file: any key the singleton
 * lacks → `merge` (the baseline is the file body either way); none →
 * `keep`. A vanished file → `keep` and its baseline drops. No conflict
 * is ever emitted for this policy: an operator's value is theirs.
 */
async function planMergeMissing<F>(
  strategy: KindStrategy<F>,
  files: F[],
  record: StoredRecord | null,
  pins: Set<string>,
): Promise<KindPlan<F>> {
  const actions: PlannedAction[] = [];
  const singleton = await loadSettingsSingleton();
  const values = singleton?.values ?? {};
  const fileKeys = new Set<string>();
  for (const f of files) {
    const key = strategy.recordKeyOf(f);
    fileKeys.add(key);
    if (pins.has(key)) {
      actions.push({ op: 'pinned-skip', key });
      continue;
    }
    const row = strategy.rowOf(f, '');
    const body = strategy.canonicalBody(row);
    const hash = hashOf(body);
    const entries = (f as unknown as SettingsFile).entries;
    const missing: Record<string, string> = {};
    for (const e of entries) if (values[e.key] === undefined) missing[e.key] = e.value;
    if (Object.keys(missing).length > 0) {
      actions.push({ op: 'merge', key, hash, body, missing });
    } else {
      actions.push({ op: 'keep', key, hash, body });
    }
  }
  const label = kindLabel(strategy as KindStrategy<unknown>);
  for (const [key, baseline] of Object.entries(record?.rows ?? {})) {
    if (baseline.kind !== label || fileKeys.has(key)) continue;
    actions.push(pins.has(key) ? { op: 'pinned-skip', key } : { op: 'keep', key, dropBaseline: true });
  }
  return { strategy, actions };
}

interface AppliedKind {
  changes: KindChanges;
  kept: string[];
  /** merge-missing kinds: files whose missing keys were merged. */
  merged: string[];
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
  const packId = record.packId;
  const out: AppliedKind = {
    changes: { inserted: [], updated: [], adopted: [], deleted: [] },
    kept: [],
    merged: [],
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
      ...(a.rev !== undefined ? { rev: a.rev } : {}),
    };
  };
  for (const a of plan.actions) {
    switch (a.op) {
      case 'insert':
        if (strategy.write) await strategy.write('insert', a.file as never, packId);
        else await PersistApi.save(strategy.collection, a.row!);
        baseline(a);
        out.changes.inserted.push(a.key);
        break;
      case 'update':
        if (strategy.write) await strategy.write('update', a.file as never, packId, a._id);
        else await PersistApi.save(strategy.collection, { ...a.row!, _id: a._id });
        baseline(a);
        out.changes.updated.push(a.key);
        break;
      case 'adopt':
        if (strategy.write) await strategy.write('adopt', a.file as never, packId, a._id);
        else await PersistApi.save(strategy.collection, { ...a.row!, _id: a._id });
        baseline(a);
        out.changes.adopted.push(a.key);
        break;
      case 'merge': {
        // Re-read at apply: an earlier file of this run may have merged.
        const singleton = await loadSettingsSingleton();
        const values = { ...(singleton?.values ?? {}) };
        for (const [k, v] of Object.entries(a.missing ?? {})) {
          if (values[k] === undefined) values[k] = v;
        }
        await PersistApi.save(Collections.AppSettings, {
          ...(singleton?._id ? { _id: singleton._id } : {}),
          values,
        });
        baseline(a);
        out.merged.push(a.key);
        break;
      }
      case 'delete':
        await PersistApi.delete(strategy.collection, a._id!);
        delete record.rows[a.key];
        out.changes.deleted.push(a.key);
        break;
      case 'keep':
        if (a.dropBaseline) delete record.rows[a.key];
        else if (a.hash !== undefined) baseline(a); // merge-missing: the file is the baseline
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
      case 'submit': {
        const r = await submitWiki(a, packId, new Date().toISOString());
        if ('conflict' in r) {
          out.conflicts.push(r.conflict);
          break;
        }
        a.rev = r.rev;
        baseline(a);
        if (a.submit === 'create') out.changes.inserted.push(a.key);
        else out.changes.updated.push(a.key);
        break;
      }
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
    { strategy: settingsStrategy as KindStrategy<unknown>, files: content.settings },
    { strategy: subjectStrategy(content.subjects) as KindStrategy<unknown>, files: content.subjects },
    { strategy: wikiStrategy as KindStrategy<unknown>, files: content.wiki },
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
    settings: [],
    subjects: [],
    wiki: [],
  };
}

interface KindPlanInput<F> {
  strategy: KindStrategy<F>;
  files: F[];
}

/** The strategy a record key belongs to, by its prefix. */
function strategyForKey(key: string, content: PackContent): KindStrategy<unknown> {
  const root = content.root;
  if (key.startsWith('/descriptor-banks/')) {
    return descriptorBankStrategy as KindStrategy<unknown>;
  }
  if (key.startsWith('/settings/')) return settingsStrategy as KindStrategy<unknown>;
  if (key.startsWith('/wiki/')) return wikiStrategy as KindStrategy<unknown>;
  if (key.startsWith('/subjects/')) {
    return subjectStrategy(content.subjects) as KindStrategy<unknown>;
  }
  for (const spec of activeDocumentKinds()) {
    if (key.startsWith(`/${spec.contentDir}/`)) {
      return documentStrategy(spec, root) as KindStrategy<unknown>;
    }
  }
  return domainStrategy as KindStrategy<unknown>;
}

/**
 * The stamped DB row at a record key, rendered to the preimage shape —
 * for settings, the singleton's values for the file's keys (there is no
 * stamped row; `yours` is what the operator has).
 */
async function dbRowForKey(
  strategy: KindStrategy<unknown>,
  packId: string,
  key: string,
  file: unknown | null,
): Promise<StampedRow | null> {
  if (strategy.kind === 'wiki') {
    const f = file as WikiFile | null;
    const ref = f ? `${f.namespace}:${f.slug}` : key.replace(/^\/wiki\//, '').replace('/', ':');
    const hit = await (await wikiRegistry()).resolve(ref);
    return hit ? { key, ...wikiPageBody(hit.page) } : null;
  }
  if (strategy.kind === 'settings') {
    if (!file) return null;
    const singleton = await loadSettingsSingleton();
    const values = singleton?.values ?? {};
    return {
      settings: (file as SettingsFile).entries.map((e) => ({
        key: e.key,
        value: values[e.key] ?? '',
      })),
    };
  }
  const rows =
    (await strategy.loadStamped?.(packId)) ??
    ((await PersistApi.find(strategy.collection, {
      sourcePack: packId,
      ...(strategy.stampedQuery?.() ?? {}),
    })) as StampedRow[]);
  return rows.find((r) => strategy.recordKeyOfRow(r) === key) ?? null;
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
    if (!k.strategy.flatKeyOf && !k.strategy.flatKeysOf) continue;
    const seen = new Map<string, { packId: string; relFile: string }>();
    for (const rp of packs) {
      const files = filesOfKind(rp.content, k.strategy);
      for (const f of files) {
        const keys = k.strategy.flatKeysOf?.(f) ?? [k.strategy.flatKeyOf!(f)];
        const relFile = (f as { relFile: string }).relFile;
        for (const key of keys) {
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
    case 'settings':
      return content.settings;
    case 'subject':
      return content.subjects;
    case 'wiki':
      return content.wiki;
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

/** The manifests + shipped paths of an install set, keyed by pack id. */
interface InstallSet {
  manifests: ReadonlyMap<string, PackManifest>;
  shipped: ReadonlyMap<string, ReadonlySet<string>>;
}

function installSetOf(read: ReadPack[]): InstallSet {
  return {
    manifests: new Map(read.map((r) => [r.pack.manifest.id, r.pack.manifest])),
    shipped: new Map(read.map((r) => [r.pack.manifest.id, new Set(r.content.domain.map((d) => d.path))])),
  };
}

/** Every pre-write gate for one pack: requires-kernel (classes + requires), then topics. */
async function gatePack(rp: ReadPack, set: InstallSet = installSetOf([rp])): Promise<void> {
  const packId = rp.pack.manifest.id;
  try {
    await assertClassesResolve(packId, rp.content.domain);
    gateRequires(rp, set.manifests, set.shipped);
  } catch (err) {
    throw new PackStepError('requires-kernel', (err as Error).message);
  }
  try {
    await validatePackTopics(packId, rp.content.domain);
  } catch (err) {
    throw new PackStepError('topics', (err as Error).message);
  }
  for (const k of kindsOf(rp.content)) {
    if (!k.strategy.gate || k.files.length === 0) continue;
    try {
      await k.strategy.gate(packId, k.files);
    } catch (err) {
      throw new PackStepError('reconcile', (err as Error).message);
    }
  }
}

/** Plan every kind of a pack against its record. Reads only. */
async function planPack(
  rp: ReadPack,
  record: StoredRecord | null,
  now: string,
  sold?: (path: string) => Promise<boolean>,
): Promise<Array<KindPlan<unknown>>> {
  const plans: Array<KindPlan<unknown>> = [];
  for (const k of kindsOf(rp.content)) {
    plans.push(
      await computeKindPlan(rp.pack.manifest.id, k.strategy, k.files, record, now, sold),
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
    merged: [],
    archived: [],
    conflicts: [],
    pinnedSkipped: 0,
    normalized: 0,
    quantityTables: 0,
    documents: {},
    rehydrated: 0,
    failure: null,
    requires: emptyRequiresResult(),
    boot: { 'sync-read': 0, producer: 0 },
    staffed: false,
  };
}

function emptyRequiresResult(): PackRequiresResult {
  return {
    groupsCreated: [],
    groupsFound: [],
    titlesGranted: [],
    titlesKept: [],
    titlesMigrated: [],
    titleConflicts: [],
    membersAdded: [],
    skippedSold: [],
  };
}

// --- the requires phase (wave 3) -------------------------------------------

/** The office every default maintainers group is owned by. */
const PRIME_MINISTER = 'prime-minister';

/** The ops fallback for an unstaffed pack: the executive itself. */
const EXECUTIVE = '/compact/executive';

/** A pack plus every pack in its transitive `dependsOn` (the hosts), by manifest. */
function hostChainOf(manifest: PackManifest, all: ReadonlyMap<string, PackManifest>): PackManifest[] {
  const out: PackManifest[] = [];
  const seen = new Set<string>();
  const visit = (m: PackManifest): void => {
    if (seen.has(m.id)) return;
    seen.add(m.id);
    out.push(m);
    for (const dep of m.dependsOn) {
      const host = all.get(dep);
      if (host) visit(host);
    }
  };
  visit(manifest);
  return out;
}

/** `path` is `extent` or strictly under it. */
function underExtent(path: string, extent: string): boolean {
  return path === extent || path.startsWith(extent + '/');
}

/** The typed holder a manifest's maintainers / a title holder resolves to. */
function holderOfMaintainers(m: PackMaintainers): ParcelOwner {
  return 'group' in m
    ? { kind: 'group', name: m.group }
    : { kind: 'organization', templatePath: m.organization };
}

function holderOfTitle(t: RequiredTitle, maintainers: PackMaintainers): ParcelOwner {
  if (!t.holder) return holderOfMaintainers(maintainers);
  return 'group' in t.holder
    ? { kind: 'group', name: t.holder.group }
    : { kind: 'organization', templatePath: t.holder.organization };
}

/** A comparable key for a holder (a ref-only group keys on its ref). */
function holderKey(owner: ParcelOwner): string {
  if (owner.kind === 'group') return `group:${owner.name ?? owner.ref ?? ''}`;
  return `${owner.kind}:${owner.templatePath}`;
}

function describeHolder(owner: ParcelOwner | null): string {
  if (owner === null) return 'nobody';
  if (owner.kind === 'group') return `group '${owner.name ?? owner.ref ?? '?'}'`;
  return `${owner.kind} '${owner.templatePath}'`;
}

/**
 * Every holder a pack's rows may legitimately sit under: its maintainers,
 * its own claims' holders, and its hosts' (transitive `dependsOn`) — the
 * set the bounded reconcile compares a covering parcel's holder against.
 */
function holderSetOf(manifest: PackManifest, all: ReadonlyMap<string, PackManifest>): Set<string> {
  const keys = new Set<string>();
  for (const m of hostChainOf(manifest, all)) {
    keys.add(holderKey(holderOfMaintainers(m.maintainers)));
    for (const t of m.requires.title) keys.add(holderKey(holderOfTitle(t, m.maintainers)));
  }
  return keys;
}

/** Every extent the pack or a host claims. */
function claimedExtentsOf(manifest: PackManifest, all: ReadonlyMap<string, PackManifest>): string[] {
  const out: string[] = [];
  for (const m of hostChainOf(manifest, all)) for (const t of m.requires.title) out.push(t.extent);
  return out;
}

function underTitleRoot(path: string): boolean {
  return TITLE_ROOTS.some((r) => underExtent(path, r));
}

/**
 * Every path-addressed row a pack ships under a title root: domain
 * template paths + document paths + wiki pages.
 */
function shippedPathsOf(content: PackContent): string[] {
  const out: string[] = [];
  for (const d of content.domain) out.push(d.path);
  for (const files of content.documents.values()) {
    for (const f of files) out.push(f.path.startsWith('/') ? f.path : `/${f.path}`);
  }
  for (const w of content.wiki) out.push(`/wiki/${w.namespace}/${w.slug}`);
  return out.filter(underTitleRoot);
}

/**
 * The static half of the requires phase, run at `gatePack` (step
 * `requires-kernel`, before any write):
 *  - a `{group}` title holder is declared by this pack or a host;
 *  - an `{organization}` holder / maintainer is a row this pack or a host
 *    ships;
 *  - the NPC-only membership fence: every `members[].id` is a template
 *    path in THIS pack's domain, under one of THIS pack's own claims, in
 *    one of THIS pack's own groups;
 *  - coverage: every shipped path lies under a claim of this pack or a
 *    host. A pack whose whole host chain claims nothing is pre-wave-3
 *    shaped and passes vacuously (`lint:untitled` is the static gate).
 */
function gateRequires(
  rp: ReadPack,
  installSet: ReadonlyMap<string, PackManifest>,
  shippedByPack: ReadonlyMap<string, ReadonlySet<string>>,
): void {
  const manifest = rp.pack.manifest;
  const hosts = hostChainOf(manifest, installSet);
  const declaredGroups = new Set<string>();
  for (const m of hosts) for (const g of m.requires.groups) declaredGroups.add(g.name);
  const shippedRows = new Set<string>();
  for (const m of hosts) for (const path of shippedByPack.get(m.id) ?? []) shippedRows.add(path);

  const requireShippedOrganization = (path: string, what: string): void => {
    if (!shippedRows.has(path)) {
      throw new Error(
        `PackApi: pack '${manifest.id}' names organization '${path}' as ${what}, ` +
          `but neither it nor a dependsOn pack ships that row`,
      );
    }
  };
  if ('organization' in manifest.maintainers) {
    requireShippedOrganization(manifest.maintainers.organization, 'its maintainers');
  }
  for (const t of manifest.requires.title) {
    if (!t.holder) continue;
    if ('group' in t.holder && !declaredGroups.has(t.holder.group)) {
      throw new Error(
        `PackApi: pack '${manifest.id}' claims '${t.extent}' for group '${t.holder.group}', ` +
          `which neither it nor a dependsOn pack declares under requires.groups`,
      );
    }
    if ('organization' in t.holder) {
      requireShippedOrganization(t.holder.organization, `the holder of '${t.extent}'`);
    }
  }

  // The NPC-only membership fence.
  const ownExtents = manifest.requires.title.map((t) => t.extent);
  const ownRows = new Set(rp.content.domain.map((d) => d.path));
  for (const g of manifest.requires.groups) {
    for (const m of g.members ?? []) {
      if (!ownRows.has(m.id)) {
        throw new Error(
          `PackApi: pack '${manifest.id}' authors member '${m.id}' of group '${g.name}', ` +
            `but a pack may only enrol NPC rows it ships (the id is not a template in this pack)`,
        );
      }
      if (!ownExtents.some((e) => underExtent(m.id, e))) {
        throw new Error(
          `PackApi: pack '${manifest.id}' authors member '${m.id}' of group '${g.name}', ` +
            `but the row is outside every extent the pack itself claims`,
        );
      }
    }
  }

  // Coverage.
  const claims = claimedExtentsOf(manifest, installSet);
  if (claims.length === 0) return;
  for (const path of shippedPathsOf(rp.content)) {
    if (!claims.some((e) => underExtent(path, e))) {
      throw new Error(
        `PackApi: pack '${manifest.id}': row ${path} is outside every extent ` +
          `'${manifest.id}' or its hosts claim (${claims.join(', ')})`,
      );
    }
  }
}

/** Who is applying, as a principal Stuff (null at boot / outside a command). */
function actingPrincipal(): { getIdentityPath(): string | null } | null {
  return ExecutionContextApi.getActingAuthor() as { getIdentityPath(): string | null } | null;
}

/**
 * Stand the organizations a manifest names up BEFORE holders resolve —
 * the registry-at-boot rule applied to organizations: the requires phase
 * runs after the pack's rows are written and before `BootstrapManager`
 * clones the manifest, so `/compact/executive` is a row but not yet a
 * resident Stuff. `StuffApi.singleton` mints-if-absent; the manager
 * reuses the resident one.
 */
async function ensureOrganizationsResident(manifest: PackManifest): Promise<void> {
  const paths = new Set<string>();
  if ('organization' in manifest.maintainers) paths.add(manifest.maintainers.organization);
  for (const t of manifest.requires.title) {
    if (t.holder && 'organization' in t.holder) paths.add(t.holder.organization);
  }
  for (const path of paths) {
    if (StuffApi.findAllByTemplatePath(path).length > 0) continue;
    await StuffApi.singleton(path);
  }
}

/** Is anyone actually holding this maintainer? */
async function isStaffed(m: PackMaintainers): Promise<boolean> {
  if ('group' in m) {
    const reg = await GroupApi.registry();
    const g = await reg.managed().findByName(m.group);
    return (g?.memberIds.length ?? 0) > 0;
  }
  const org = StuffApi.findByTemplatePath(m.organization);
  if (!org || !MixinApi.isOrganization(org)) return false;
  // The head alone does not count — an office with no staff is unstaffed.
  return org.getPositions().some((p) => EmploymentApi.holdersOf(org, p.key).length > 0);
}

/**
 * The requires phase (D4): groups, memberships, titles — after the pack's
 * rows are written, before its record is saved. Adopt-by-name throughout:
 * an existing group is found and never re-owned; an existing title under
 * the same holder is kept. Bootstrap is exempt from the *precondition*
 * (who may claim), never from the checks `gateRequires` already ran.
 */
async function applyRequires(
  rp: ReadPack,
  record: StoredRecord,
  result: PackReconcileResult,
): Promise<void> {
  return applyRequiresFor(rp.pack.manifest, record, result);
}

/** The grants over a manifest — the install's and the nightly reprovision's one path. */
async function applyRequiresFor(
  manifest: PackManifest,
  record: StoredRecord,
  result: PackReconcileResult,
): Promise<void> {
  const packId = manifest.id;
  const out = result.requires;

  // 1. Groups — the maintainers group first (PM-owned), then the declared ones.
  const refs = new Map<string, string>();
  const ensure = async (name: string, owner: Parameters<typeof GroupApi.ensureGroup>[1]): Promise<string> => {
    const { ref, created } = await GroupApi.ensureGroup(name, owner);
    (created ? out.groupsCreated : out.groupsFound).push(name);
    refs.set(name, ref);
    return ref;
  };
  if ('group' in manifest.maintainers) {
    await ensure(manifest.maintainers.group, { kind: 'office', office: PRIME_MINISTER });
  }
  for (const g of manifest.requires.groups) {
    if (refs.has(g.name)) continue;
    await ensure(g.name, g.owner ? { kind: 'office', office: g.owner.office } : { kind: 'system' });
  }

  // 2. Memberships — NPC rows under the pack's own claims (fenced at the gate).
  for (const g of manifest.requires.groups) {
    const ref = refs.get(g.name);
    if (!ref) continue;
    for (const m of g.members ?? []) {
      if (await GroupApi.ensureMember(ref, m.id, m.role ?? 'member')) {
        out.membersAdded.push(`${g.name}:${m.id}`);
      }
    }
  }

  // 3. Titles.
  const principal = record.principal;
  for (const t of manifest.requires.title) {
    const holder = holderOfTitle(t, manifest.maintainers);
    if (principal !== 'bootstrap') {
      const actor = actingPrincipal();
      const admitted = actor
        ? await AccessApi.canAtPath(actor as never, 'write-template', t.extent)
        : false;
      if (!admitted) {
        throw new PackStepError(
          'requires-kernel',
          `PackApi: pack '${packId}' claims '${t.extent}', which ${principal} does not hold`,
        );
      }
    }
    const claim: TitleClaim = { extent: t.extent, holder };
    if (t.parentParcel !== undefined) claim.parentParcel = t.parentParcel;
    if (t.landUse !== undefined) claim.landUse = t.landUse as TitleClaim['landUse'];
    if (t.areaM2 !== undefined) claim.areaM2 = t.areaM2;
    const r = await ParcelApi.grant(claim);
    switch (r.outcome) {
      case 'granted': out.titlesGranted.push(t.extent); break;
      case 'kept': out.titlesKept.push(t.extent); break;
      case 'migrated': out.titlesMigrated.push(t.extent); break;
      case 'conflict':
        out.titleConflicts.push(t.extent);
        record.conflicts.push({
          path: t.extent,
          kind: 'title',
          detectedAt: record.appliedAt,
          baselineHash: '',
          dbHash: describeHolder(r.holder),
          packHash: describeHolder(holder),
          reason: 'title',
        });
        break;
    }
  }

}

/**
 * The requires phase's tail — after the pack's rows are written: stand
 * the organizations it names up (their rows now exist), then what the
 * record remembers and what the boot line reports.
 */
async function finishRequires(
  rp: ReadPack,
  record: StoredRecord,
  result: PackReconcileResult,
): Promise<void> {
  const manifest = rp.pack.manifest;
  await ensureOrganizationsResident(manifest);
  record.requires = manifest.requires;
  record.boot = manifest.boot;
  record.maintainers = manifest.maintainers;
  for (const b of manifest.boot) result.boot[b.role] += 1;
  result.staffed = await isStaffed(manifest.maintainers);
}

/**
 * The bounded-reconcile predicate (CPS:308) for one pack: a domain row
 * whose covering parcel is held by nobody in the pack's holder set was
 * SOLD out from under the pack — skipped and counted, never written. No
 * resident registry → unbounded. migration-note: a `core`-held covering
 * parcel is the retired state default, not a sale.
 */
function soldPredicateFor(
  manifest: PackManifest,
  installSet: ReadonlyMap<string, PackManifest>,
): (path: string) => Promise<boolean> {
  const holders = holderSetOf(manifest, installSet);
  return async (path: string): Promise<boolean> => {
    const covering = await ParcelApi.coveringParcelOf(path);
    const owner = covering?.getOwner() ?? null;
    if (!owner) return false;
    if (owner.kind === 'group' && owner.name === 'core') return false; // migration-note: the retired state default, not a sale
    if (holders.has(holderKey(owner))) return false;
    // A ref-only group owner: compare by its resolved name too.
    if (owner.kind === 'group' && !owner.name && owner.ref) {
      const name = await managedGroupNameOf(owner.ref);
      if (holders.has(`group:${name}`)) return false;
    }
    return true;
  };
}

/** `/cmd/perception/look` → `perception/look.yaml`; `/world/x/cmd/y` → `world/x/cmd/y.yaml`. */
function viewKeyOfDocPath(docPath: string): string {
  if (docPath.startsWith('/cmd/')) return `${docPath.slice('/cmd/'.length)}.yaml`;
  return `${docPath.replace(/^\//, '')}.yaml`;
}

/**
 * The per-document-kind go-live: what a change to rows of `kind` must
 * drop or re-warm so the edit reaches the next read without a restart.
 * A module-private switch, one case per kind as its reader lands;
 * `msh` needs nothing (`ScriptLogic` reads by path per call and drops
 * its AST cache on the CMS write path).
 */
async function invalidateDocumentKind(
  kind: string,
  changedPaths: string[] = [],
  deletedPaths: string[] = [],
): Promise<void> {
  switch (kind) {
    case 'command-view':
      // Per path: a changed view re-reads from the store; a deleted one
      // drops its cache entry (the next getCommand falls to disk).
      for (const p of changedPaths) await CommandApi.reload(p);
      for (const p of deletedPaths) CommandApi.invalidate(viewKeyOfDocPath(p));
      return;
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
    case 'blueprint': {
      const cat = StuffApi.findByTemplatePath<BlueprintCatalogue>('/obj/BlueprintCatalogue');
      if (cat) await cat.invalidateCache();
      return;
    }
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
  opts: { rehydrate: boolean; installSet?: InstallSet },
): Promise<PackReconcileResult> {
  const { pack, content } = rp;
  const packId = pack.manifest.id;
  const set = opts.installSet ?? installSetOf([rp]);
  await gatePack(rp, set);

  const prior = await loadRecord(packId);
  const now = new Date().toISOString();

  const record: StoredRecord = prior ?? freshRecord(pack);
  record.version = pack.manifest.version;
  record.appliedAt = now;
  record.principal = principalOf();
  record.status = 'applied';
  record.failure = null;
  const priorConflicts = new Set((prior?.conflicts ?? []).map((c) => c.path));
  record.conflicts = [];

  const result = emptyResult(packId);
  // The requires phase's grants come FIRST — groups, memberships, titles
  // — so a title this claim migrates or grants is in place before the
  // bounded reconcile asks who holds each row's extent.
  await applyRequires(rp, record, result);
  const plans = await planPack(rp, prior, now, soldPredicateFor(pack.manifest, set.manifests));
  const perKind = new Map<string, AppliedKind>();
  for (const plan of plans) {
    const applied = await applyKindPlan(plan, record);
    perKind.set(kindLabel(plan.strategy), applied);
    result.inserted.push(...applied.changes.inserted);
    result.updated.push(...applied.changes.updated);
    result.adopted.push(...applied.changes.adopted);
    result.deleted.push(...applied.changes.deleted);
    result.kept.push(...applied.kept);
    result.merged.push(...applied.merged);
    result.archived.push(...applied.archived);
    result.pinnedSkipped += applied.pinnedSkipped;
    result.normalized += applied.normalized;
    record.conflicts.push(...applied.conflicts);
    for (const a of plan.actions) {
      if (a.op === 'skip-sold') result.requires.skippedSold.push(a.key);
    }
  }

  // The requires phase's tail: after the rows, before the record.
  await finishRequires(rp, record, result);
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
        c.reason === 'title'
          ? `pack '${packId}': title conflict at ${c.path} — the pack claims it for ` +
            `${c.packHash} but it is held by ${c.dbHash}; the title is untouched ` +
            `(transfer it, or change the pack's claim)`
          : `pack '${packId}': conflict at ${c.path} — ` +
        (c.reason === 'both-changed'
          ? 'pack and database both changed since install'
          : c.reason === 'wiki-cas'
            ? 'the pack updated a page somebody has edited since (`pack diff` shows both bodies)'
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
    if (touched > 0 && opts.rehydrate) {
      // Live sync only: at boot the catalogues / the command preload run
      // after the install and read the rows themselves.
      const files = content.documents.get(kind) ?? [];
      const pathOf = (key: string): string =>
        files.find((f) => f.key === key)?.path ??
        (kind === 'command-view' ? key : content.root + key);
      await invalidateDocumentKind(
        kind,
        [...c.inserted, ...c.updated, ...c.adopted].map(pathOf),
        c.deleted.map(pathOf),
      );
    }
  }

  // Settings: the sync read cache is a full reload (AppApi unchanged).
  if (result.merged.length > 0) await AppSettings.warm();

  // Subjects: drop the RESIDENT catalogues' caches (at boot they are not
  // yet cloned and warm from these rows afterwards).
  const sub = perKind.get('subject');
  if (sub) {
    const c = sub.changes;
    if (c.inserted.length + c.updated.length + c.adopted.length + sub.archived.length > 0) {
      StuffApi.findByTemplatePath<SubjectCatalogue>(TemplatePaths.subjectCatalogue)?.invalidateCache();
      StuffApi.findByTemplatePath<ChannelCatalogue>(TemplatePaths.channelCatalogue)?.invalidateCache();
    }
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
  // A failed pack contributes nothing to the boot union.
  record.boot = [];
  await saveRecord(record);
  console.error(
    `PackApi: pack '${pack.manifest.id}' FAILED at step '${failure.step}' — ` +
      `booting without it: ${failure.error}`,
  );
  const result = emptyResult(pack.manifest.id);
  result.failure = failure;
  return result;
}

/**
 * The boot union: every applied record's `boot[]`, in install order. A
 * template two packs both list is an error naming both.
 */
async function bootManifestImpl(packRoots?: string[]): Promise<PackBootManifestEntry[]> {
  const records = (await PersistApi.find(Collections.PackInstalls, {})) as unknown as StoredRecord[];
  const byId = new Map(records.map((r) => [r.packId, r]));
  // Install order where the pack is still shipped; recorded-only packs last.
  const order = discover(packRoots).map((p) => p.manifest.id);
  // Under `SAXONBERG_PACKS` the filtered-out packs are IGNORED — not
  // installed, not booted — even when an earlier unfiltered boot left
  // their records behind. Only an unfiltered boot carries recorded-only
  // (no longer shipped) packs forward.
  const ids = packFilter()
    ? order.filter((id) => byId.has(id))
    : [
        ...order.filter((id) => byId.has(id)),
        ...[...byId.keys()].filter((id) => !order.includes(id)).sort(),
      ];
  const out: PackBootManifestEntry[] = [];
  const seen = new Map<string, string>();
  for (const id of ids) {
    const r = byId.get(id)!;
    if (r.status !== 'applied') continue;
    for (const e of r.boot ?? []) {
      const prior = seen.get(e.template);
      if (prior !== undefined) {
        throw new Error(
          `PackApi: boot template '${e.template}' is listed by both pack '${prior}' and pack '${id}'`,
        );
      }
      seen.set(e.template, id);
      const entry: PackBootManifestEntry = { templatePath: e.template, packId: id, role: e.role };
      if (e.dependsOn) entry.dependsOn = e.dependsOn;
      out.push(entry);
    }
  }
  return out;
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
    const set = installSetOf(read);

    for (const rp of read) {
      const id = rp.pack.manifest.id;
      const flatFailure = flat.get(id);
      if (flatFailure) {
        results.set(id, await recordFailure(rp.pack, new PackStepError(flatFailure.step, flatFailure.error, flatFailure.file)));
        continue;
      }
      try {
        results.set(id, await reconcilePack(rp, { rehydrate: false, installSet: set }));
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
    return reconcilePack(rp, { rehydrate: true, installSet: installSetOf([...siblings, rp]) });
  }

  /** See {@link PackApi.discoverPacks}. */
  @CallSecurity(PackApiCallers)
  public async discoverPacks(): Promise<PackManifest[]> {
    return discover().map((p) => p.manifest);
  }

  /** See {@link PackApi.contentRoots}. */
  @CallSecurity(PackApiCallers)
  public contentRoots(): string[] {
    return discover().map((p) => p.contentRoot);
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
      const maintainers = r?.maintainers ?? m?.maintainers ?? null;
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
        maintainers: maintainers
          ? {
              group: 'group' in maintainers ? maintainers.group : maintainers.organization,
              staffed: await isStaffed(maintainers),
            }
          : null,
        titleConflicts: (r?.conflicts ?? []).filter((c) => c.reason === 'title').map((c) => c.path),
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
      const strategy = strategyForKey(key, content);
      const baseline = record?.rows[key] ?? null;
      const file = fileForKey(content, key);
      const theirsBody = file ? strategy.canonicalBody(strategy.rowOf(file, packId)) : null;
      const dbRow = await dbRowForKey(strategy, packId, key, file);
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
    const strategy = strategyForKey(path, content);
    const file = fileForKey(content, path);
    const dbRow = await dbRowForKey(strategy, packId, path, file);

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
      if (strategy.kind === 'settings') {
        // Take the pack: every key of the file at the pack's value.
        const singleton = await loadSettingsSingleton();
        const values = { ...(singleton?.values ?? {}) };
        for (const e of (file as SettingsFile).entries) values[e.key] = e.value;
        await PersistApi.save(Collections.AppSettings, {
          ...(singleton?._id ? { _id: singleton._id } : {}),
          values,
        });
        await AppSettings.warm();
      } else if (strategy.kind === 'wiki') {
        // Take the pack: an edit over the CURRENT rev (the history keeps
        // both), or a create when the page is gone.
        const f = file as WikiFile;
        const registry = await wikiRegistry();
        const hit = await registry.resolve(`${f.namespace}:${f.slug}`);
        const page = hit
          ? await registry.editPage(hit.page, f.body, {
              baseRev: hit.page.getRev(),
              summary: `pack resolve --take-pack (${packId})`,
              asInstaller: packId,
              fields: {
                title: f.front.title,
                subject: f.front.subject ?? null,
                tags: f.front.tags ?? [],
                related: f.front.related ?? [],
                spoilerLevel: f.front.spoilerLevel ?? 0,
              },
            })
          : await registry.createPage({
              namespace: f.namespace,
              slug: f.slug,
              title: f.front.title,
              body: f.body,
              subject: f.front.subject ?? null,
              tags: f.front.tags ?? [],
              related: f.front.related ?? [],
              spoilerLevel: f.front.spoilerLevel ?? 0,
              summary: `pack resolve --take-pack (${packId})`,
              asInstaller: packId,
            });
        record.rows[path] = { kind: kindLabel(strategy), hash: hashOf(body), body, rev: page.getRev() };
        record.conflicts = record.conflicts.filter((c) => c.path !== path);
        await saveRecord(record);
        const r = emptyResult(packId);
        r.updated.push(path);
        return r;
      } else if (strategy.write) {
        await strategy.write(dbRow?._id ? 'update' : 'insert', file, packId, dbRow?._id);
      } else {
        await PersistApi.save(strategy.collection, dbRow?._id ? { ...row, _id: dbRow._id } : row);
      }
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
    // A text kind exports its text verbatim, not YAML: `.msh` its source,
    // `.md` its frontmatter + markdown body.
    writeFileSync(
      target,
      ext === 'msh'
        ? String(body.source ?? '')
        : ext === 'md'
          ? renderFrontmatter(body.front as WikiFront, String(body.body ?? ''))
          : YAML.stringify(body),
    );
    return null;
  }

  /** See {@link PackApi.bootManifest}. */
  @CallSecurity(PackApiCallers)
  public async bootManifest(packRoots?: string[]): Promise<PackBootManifestEntry[]> {
    return bootManifestImpl(packRoots);
  }

  /** See {@link PackApi.provision}. */
  @CallSecurity(PackApiCallers)
  public async provision(packId: string): Promise<PackProvisionReport> {
    const record = await loadRecord(packId);
    if (!record) throw new Error(`PackApi: no install record for pack '${packId}'`);
    const m = record.maintainers ?? defaultMaintainers(packId);
    const reg = await GroupApi.registry();
    const membersOfGroup = async (name: string): Promise<string[]> =>
      (await reg.managed().findByName(name))?.memberIds ?? [];
    const groups: PackProvisionReport['groups'] = [];
    for (const g of record.requires?.groups ?? []) {
      groups.push({ name: g.name, members: (await membersOfGroup(g.name)).length });
    }
    const titles: PackProvisionReport['titles'] = [];
    for (const t of record.requires?.title ?? []) {
      const owner = await ParcelApi.ownerOf(t.extent);
      const covering = await ParcelApi.coveringParcelOf(t.extent);
      const wanted = holderOfTitle(t, m);
      const held = covering?.getExtent() === t.extent;
      const outcome = !held || owner === null ? 'unheld' : holderKey(owner) === holderKey(wanted) ? 'held' : 'conflict';
      titles.push({ extent: t.extent, holder: describeHolder(owner), outcome });
    }
    const members = 'group' in m ? await membersOfGroup(m.group) : [];
    return {
      packId,
      maintainers: {
        group: 'group' in m ? m.group : m.organization,
        staffed: await isStaffed(m),
        members,
      },
      groups,
      titles,
    };
  }

  /** See {@link PackApi.staff}. */
  @CallSecurity(PackApiCallers)
  public async staff(packId: string, memberPath: string): Promise<boolean> {
    const record = await loadRecord(packId);
    if (!record) throw new Error(`PackApi: no install record for pack '${packId}'`);
    const m = record.maintainers ?? defaultMaintainers(packId);
    if ('organization' in m) {
      throw new Error(
        `PackApi: pack '${packId}' is maintained by organization '${m.organization}' — ` +
          `appoint through the organization, not the pack`,
      );
    }
    const { ref } = await GroupApi.ensureGroup(m.group, { kind: 'office', office: PRIME_MINISTER });
    return GroupApi.ensureMember(ref, memberPath, 'member');
  }

  /** See {@link PackApi.reprovision}. */
  @CallSecurity(PackApiCallers)
  public async reprovision(): Promise<string[]> {
    const records = (await PersistApi.find(Collections.PackInstalls, {})) as unknown as StoredRecord[];
    const lines: string[] = [];
    for (const record of records) {
      if (record.status !== 'applied') continue;
      const manifest: PackManifest = {
        id: record.packId,
        version: record.version,
        dependsOn: [],
        root: `/${record.packId}`,
        requires: record.requires ?? { groups: [], title: [] },
        boot: record.boot ?? [],
        maintainers: record.maintainers ?? defaultMaintainers(record.packId),
      };
      const result = emptyResult(record.packId);
      const principal = record.principal;
      record.principal = 'bootstrap';
      try {
        await applyRequiresFor(manifest, record, result);
      } finally {
        record.principal = principal;
      }
      const r = result.requires;
      const line =
        `PackApi: reprovisioned '${record.packId}' — ${r.groupsCreated.length} group(s) re-minted, ` +
        `${r.titlesGranted.length} title(s) re-granted, ${r.titlesKept.length} kept, ${r.titleConflicts.length} conflict`;
      console.info(line);
      lines.push(line);
    }
    return lines;
  }

  /** See {@link PackApi.orphans}. */
  @CallSecurity(PackApiCallers)
  public async orphans(): Promise<string[]> {
    const rows = (await PersistApi.find(Collections.Content, {})) as StampedRow[];
    return rows
      .filter((r) => !r.sourcePack)
      .map((r) => String(r.path ?? ''))
      .filter((p) => p.length > 0)
      .sort();
  }

  /** See {@link PackApi.maintainersOf}. */
  @CallSecurity(PackApiCallers)
  public async maintainersOf(packId: string): Promise<PackMaintainersInfo | null> {
    const record = await loadRecord(packId);
    const m = record?.maintainers ?? discover().find((p) => p.manifest.id === packId)?.manifest.maintainers;
    if (!m) return null;
    return { maintainers: m, staffed: await isStaffed(m), fallback: { organization: EXECUTIVE } };
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
