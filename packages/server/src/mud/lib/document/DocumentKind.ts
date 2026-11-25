/**
 * DocumentKind — what one document KIND is: the value read from a `kind`
 * declaration document at `<root>/kinds/<kind>`.
 *
 * ⭐ Kinds are FREE TEXT. Nothing in code lists them; whoever owns a kind
 * ships its declaration (a pack's `content/kinds/<kind>.yaml`, or an author
 * saving one under their own extent), and the leaf is the kind's name. Title
 * on the declaration's path governs who may change it — the ordinary path
 * rule. The one kind code knows by name is **`kind`** itself
 * ({@link DocumentKind.BOOTSTRAP}).
 *
 * A declaration composes **traits** — ten of them, each parameterized by
 * data — plus an optional `fields:` schema:
 *
 * | trait | says |
 * |---|---|
 * | `shipped` | packs ship it: `{ dir, ext?, vanish? }`, or `{ in-tree: cmd }` (any `cmd/` dir in a tree, the path content-relative) |
 * | `catalogued` | a service reads it: `{ by: <singleton path>, load: per-path \| whole \| boot }` — the service's `forget` is how an edit goes live, its `parse` how a document's meaning is checked |
 * | `keyworded` | what words find one: `{ keywords?: <field>, leaf?: bool, unique?: bool }` |
 * | `titled` | what one is called: `{ field }` |
 * | `dated` | when it happened: `{ field, unit?: game-s \| real-ms, indexed?: bool }` |
 * | `filed` | written only by its transport (`register`, `business`, …) |
 * | `paper` | read as paper through a Liquid template: `{ template }` |
 * | `ledger` | writes may add, never alter: `immutable`, or `{ grows: [field…] }` |
 * | `tree` | `{ parent: folder \| <field> }` — parent, ancestors, nearest |
 * | `secret` | never listed, never paper, never in the CMS tree; read by exact path only |
 *
 * ⚠ **No trait is a class a document becomes.** A trait may name a SERVICE
 * that reads the kind (`catalogued.by`) and a filed kind names a write
 * TRANSPORT (closed — each is a security path); nothing else in a
 * declaration is code.
 *
 * ⭐ Pure and import-free — the installer, the schema scripts and the lint
 * gates read declarations off disk through this class, before anything is
 * wired.
 */

import { GrammarApi } from '../../api/grammar';

/** What the installer does when a shipped kind's file vanishes from its pack. */
export type DocumentVanishPolicy = 'delete' | 'archive' | 'keep';

/** A value a document's catalogue card may hold — what one index can order and compare. */
export type DocumentKeyValue = string | number | boolean | Array<string | number>;

/** The file extensions a shipped kind may use. */
export type DocumentExt = 'yaml' | 'msh' | 'md';

/** How a catalogue fills: one path at a time, the whole kind at once, or at boot. */
export type CatalogueLoad = 'per-path' | 'whole' | 'boot';

/**
 * The write transports a `filed` kind may name — each a narrow,
 * security-checked path in `DocumentApi`. Closed: a pack declares that its
 * kind is register-filed; it cannot invent a transport.
 */
export const FILING_TRANSPORTS = [
  'register',
  'business',
  'release',
  'instrument',
  'map',
  'stream-token',
  'program',
  'berth',
  'edition',
] as const;
export type FilingTransport = (typeof FILING_TRANSPORTS)[number];

/** The ten trait names — the whole vocabulary. */
export const DOCUMENT_TRAITS = [
  'shipped',
  'catalogued',
  'keyworded',
  'titled',
  'dated',
  'filed',
  'paper',
  'ledger',
  'tree',
  'secret',
] as const;
export type DocumentTrait = (typeof DOCUMENT_TRAITS)[number];

/** A field type a `fields:` schema may name. */
export const FIELD_TYPES = ['string', 'number', 'boolean', 'list', 'map', 'any'] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

/** One field of a kind's schema. */
export interface FieldSpec {
  type: FieldType;
  required: boolean;
  /** The card key this field is indexed under (`DocumentApi.findByKey`). */
  index?: string;
  /** The card value when the field is absent (an indexed boolean's `false`). */
  default?: DocumentKeyValue;
}

export interface ShippedTrait {
  /** A top-level dir of a pack's `content/` — or absent for an in-tree kind. */
  dir?: string;
  /** Any dir of this name anywhere in a tree (command views' `cmd`). */
  inTree?: string;
  ext: DocumentExt;
  vanish: DocumentVanishPolicy;
}

export interface CataloguedTrait {
  by: string;
  load: CatalogueLoad;
}

export interface KeywordedTrait {
  /** The data field holding extra keywords (default `keywords`). */
  keywords: string;
  /** Whether the path's leaf answers (default yes). */
  leaf: boolean;
  /** Whether a word must mean one document across every pack (default no). */
  unique: boolean;
}

export interface DatedTrait {
  field: string;
  unit: 'game-s' | 'real-ms';
  indexed: boolean;
}

export type LedgerTrait = { mode: 'immutable' } | { mode: 'grows'; grows: readonly string[] };

export interface DocumentTraits {
  shipped?: ShippedTrait;
  catalogued?: CataloguedTrait;
  keyworded?: KeywordedTrait;
  titled?: { field: string };
  dated?: DatedTrait;
  filed?: FilingTransport;
  paper?: { template: string };
  ledger?: LedgerTrait;
  tree?: { parent: string };
  secret?: true;
}

/** The leading article a bare title drops (`The Hesper` → `hesper`). */

export class DocumentKind {
  /**
   * ⭐ The one kind code knows by name: `kind`, the declaration of every
   * other kind. Shipped from every pack's `content/kinds/`, served by the
   * kind catalogue (resident — every write asks its kind), named by leaf
   * and unique (a kind's name is global), titled.
   */
  static readonly BOOTSTRAP_NAME = 'kind';

  static readonly BOOTSTRAP: DocumentKind = new DocumentKind('kind', {
    title: 'Document kind',
    traits: {
      shipped: { dir: 'kinds' },
      catalogued: { by: '/platform/idea/DocumentKindCatalogue', load: 'boot' },
      keyworded: { unique: true },
      titled: { field: 'title' },
    },
    fields: {
      title: { type: 'string', required: true },
      traits: { type: 'map', required: true },
      fields: { type: 'map' },
    },
  });

  private readonly name: string;
  private readonly title: string;
  private readonly traits: Readonly<DocumentTraits>;
  private readonly fields: ReadonlyMap<string, FieldSpec>;

  /**
   * Read a declaration's data (`name` is its leaf). Throws naming what is
   * wrong — an unknown trait or parameter is an error, never ignored.
   */
  constructor(name: string, data: Record<string, unknown>) {
    const where = `kind '${name}'`;
    if (!/^[a-z][a-z0-9-]*$/.test(name)) {
      throw new Error(`${where}: a kind's name is lowercase words joined by '-'`);
    }
    const rawTraits = data.traits ?? {};
    if (!isRecord(rawTraits)) throw new Error(`${where}: traits must be a map`);
    for (const k of Object.keys(data)) {
      if (k !== 'title' && k !== 'traits' && k !== 'fields') {
        throw new Error(`${where}: unknown key '${k}' (title, traits, fields)`);
      }
    }
    const traits: DocumentTraits = {};
    for (const [trait, value] of Object.entries(rawTraits)) {
      if (!(DOCUMENT_TRAITS as readonly string[]).includes(trait)) {
        throw new Error(`${where}: unknown trait '${trait}' (${DOCUMENT_TRAITS.join(', ')})`);
      }
      parseTrait(where, trait as DocumentTrait, value, traits);
    }
    this.name = name;
    this.title = typeof data.title === 'string' && data.title !== '' ? data.title : name;
    this.traits = traits;
    this.fields = parseFields(where, data.fields);
  }

  /** The kind's name — the declaration's leaf. */
  getName(): string {
    return this.name;
  }

  /** The kind's own title (what `ls <root>/kinds` prints). */
  getTitle(): string {
    return this.title;
  }

  /** Whether the declaration composes `trait`. */
  has(trait: DocumentTrait): boolean {
    return this.traits[trait] !== undefined;
  }

  /** How packs ship it, or null for a runtime-only kind. */
  shipped(): ShippedTrait | null {
    return this.traits.shipped ?? null;
  }

  /** The singleton path of the service that reads it, or null. */
  servedBy(): string | null {
    return this.traits.catalogued?.by ?? null;
  }

  /** How its catalogue fills, or null when it has none. */
  catalogueLoad(): CatalogueLoad | null {
    return this.traits.catalogued?.load ?? null;
  }

  /** The transport that alone may write it, or null for a plain-saved kind. */
  filedBy(): FilingTransport | null {
    return this.traits.filed ?? null;
  }

  /** Whether it is never listed, never paper, never in the CMS tree. */
  isSecret(): boolean {
    return this.traits.secret === true;
  }

  /** The keyword trait, or null. */
  keyworded(): Readonly<KeywordedTrait> | null {
    return this.traits.keyworded ?? null;
  }

  /** Whether a word of this kind must mean one document across every pack. */
  isUnique(): boolean {
    return this.traits.keyworded?.unique === true;
  }

  /** The date trait, or null. */
  dated(): Readonly<DatedTrait> | null {
    return this.traits.dated ?? null;
  }

  /** The paper template, or null. */
  paperTemplate(): string | null {
    return this.traits.paper?.template ?? null;
  }

  /** The ledger rule, or null. */
  ledger(): LedgerTrait | null {
    return this.traits.ledger ?? null;
  }

  /** The tree's parent rule (`folder` or a field), or null. */
  treeParent(): string | null {
    return this.traits.tree?.parent ?? null;
  }

  /**
   * ⭐ The tree's parent of one document, or null at a root: its `tree`
   * field when that names a parent, else the folder rule — the path one
   * segment up, unless that is the kind's shipped dir itself. Null for a
   * kind that is not a tree.
   */
  parentOf(path: string, data: Record<string, unknown>): string | null {
    const rule = this.traits.tree?.parent;
    if (rule === undefined) return null;
    if (rule !== 'folder') {
      const named = data[rule];
      if (typeof named === 'string' && named !== '') return named;
    }
    const up = path.slice(0, path.lastIndexOf('/'));
    const dir = this.traits.shipped?.dir;
    if (up === '' || (dir !== undefined && up.endsWith(`/${dir}`))) return null;
    return up;
  }

  /** The schema, field by field. */
  getFields(): ReadonlyMap<string, FieldSpec> {
    return this.fields;
  }

  /** What one document of this kind is called: its title field, else its leaf. */
  titleOf(path: string, data: Record<string, unknown>): string {
    const field = this.traits.titled?.field;
    const v = field ? data[field] : undefined;
    return typeof v === 'string' && v.trim() !== '' ? v.trim() : leafOf(path);
  }

  /**
   * The words one document answers to — derived, never stored: the leaf
   * (unless switched off), its keywords field, and its title with and
   * without a leading article when it is also `titled`. Lower-cased,
   * deduplicated, in that order. Empty for a kind that is not keyworded.
   */
  keywordsOf(path: string, data: Record<string, unknown>): string[] {
    const k = this.traits.keyworded;
    if (!k) return [];
    const out: string[] = [];
    const add = (w: unknown): void => {
      if (typeof w !== 'string') return;
      const word = w.trim().toLowerCase();
      if (word !== '' && !out.includes(word)) out.push(word);
    };
    if (k.leaf) add(leafOf(path));
    const field = data[k.keywords];
    if (Array.isArray(field)) field.forEach(add);
    else add(field);
    const titleField = this.traits.titled?.field;
    if (titleField && typeof data[titleField] === 'string') {
      const t = data[titleField];
      add(t);
      add(GrammarApi.withoutArticle(t));
    }
    return out;
  }

  /** When one document happened (in the trait's unit), or null. */
  dateOf(data: Record<string, unknown>): number | null {
    const field = this.traits.dated?.field;
    const v = field ? data[field] : undefined;
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
  }

  /**
   * ⭐ The catalogue card a document carries — the keys it can be found by
   * besides its path, derived from `data` on every write and never
   * authored: every indexed field that has a value (or its default), the
   * date under `date` when `dated.indexed`, and every keyword under `word`
   * (a string for one, a list for several). ⚠ Throws on an empty path.
   */
  cardOf(path: string, data: Record<string, unknown>): Record<string, DocumentKeyValue> {
    if (!path) {
      throw new Error(`a ${this.name} document has no path — the path is its identity`);
    }
    const card: Record<string, DocumentKeyValue> = {};
    for (const [field, spec] of this.fields) {
      if (!spec.index) continue;
      const v = data[field];
      if (isKeyValue(v) && v !== '') card[spec.index] = v;
      else if (spec.default !== undefined) card[spec.index] = spec.default;
    }
    if (this.traits.dated?.indexed) {
      const d = this.dateOf(data);
      if (d !== null) card.date = d;
    }
    const words = this.keywordsOf(path, data);
    if (words.length === 1) card.word = words[0]!;
    else if (words.length > 1) card.word = words;
    return card;
  }

  /** What is wrong with `data` against the schema — empty when it conforms. */
  fieldFailures(data: Record<string, unknown>): string[] {
    const out: string[] = [];
    for (const [field, spec] of this.fields) {
      const v = data[field];
      if (v === undefined || v === null) {
        if (spec.required) out.push(`'${field}' is required`);
        continue;
      }
      if (!fitsType(v, spec.type)) out.push(`'${field}' must be a ${spec.type}`);
      else if (spec.required && spec.type === 'string' && (v as string).trim() === '') {
        out.push(`'${field}' must not be empty`);
      }
    }
    return out;
  }

  /**
   * What a save of `after` over the stored `before` would alter that the
   * ledger forbids — empty when the write only adds. An immutable kind
   * refuses any second write; a growing field may only gain entries at its
   * end, every earlier entry unchanged.
   */
  ledgerFailures(before: Record<string, unknown> | null, after: Record<string, unknown>): string[] {
    const rule = this.traits.ledger;
    if (!rule || before === null) return [];
    if (rule.mode === 'immutable') return ['it is written once; a new version is a new path'];
    const out: string[] = [];
    for (const field of rule.grows) {
      const was = before[field];
      if (was === undefined || was === null) continue;
      const now = after[field];
      if (!Array.isArray(was) || !Array.isArray(now)) {
        out.push(`'${field}' must stay a list`);
        continue;
      }
      if (now.length < was.length) {
        out.push(`'${field}' would lose ${was.length - now.length} entr${was.length - now.length === 1 ? 'y' : 'ies'}`);
        continue;
      }
      for (let i = 0; i < was.length; i++) {
        if (canonical(was[i]) !== canonical(now[i])) {
          out.push(`'${field}' entry ${i + 1} would change`);
          break;
        }
      }
    }
    return out;
  }
}

// --- parsing ----------------------------------------------------------------

function parseTrait(where: string, trait: DocumentTrait, value: unknown, out: DocumentTraits): void {
  const bad = (why: string): never => {
    throw new Error(`${where}: ${trait}: ${why}`);
  };
  switch (trait) {
    case 'shipped': {
      const v = recordOf(value, bad);
      onlyKeys(v, ['dir', 'in-tree', 'ext', 'vanish'], bad);
      const dir = optString(v.dir, 'dir', bad);
      const inTree = optString(v['in-tree'], 'in-tree', bad);
      if ((dir === undefined) === (inTree === undefined)) bad('names exactly one of dir, in-tree');
      const ext = (v.ext ?? 'yaml') as DocumentExt;
      if (!['yaml', 'msh', 'md'].includes(ext)) bad(`ext '${String(v.ext)}' (yaml, msh, md)`);
      const vanish = (v.vanish ?? 'delete') as DocumentVanishPolicy;
      if (!['delete', 'archive', 'keep'].includes(vanish)) bad(`vanish '${String(v.vanish)}' (delete, archive, keep)`);
      out.shipped = { ...(dir ? { dir } : {}), ...(inTree ? { inTree } : {}), ext, vanish };
      return;
    }
    case 'catalogued': {
      const v = recordOf(value, bad);
      onlyKeys(v, ['by', 'load'], bad);
      const by = optString(v.by, 'by', bad) ?? bad('names its service: by');
      if (!by.startsWith('/')) bad(`by '${by}' is not an absolute path`);
      const load = (v.load ?? 'per-path') as CatalogueLoad;
      if (!['per-path', 'whole', 'boot'].includes(load)) bad(`load '${String(v.load)}' (per-path, whole, boot)`);
      out.catalogued = { by, load };
      return;
    }
    case 'keyworded': {
      const v = value === true ? {} : recordOf(value, bad);
      onlyKeys(v, ['keywords', 'leaf', 'unique'], bad);
      out.keyworded = {
        keywords: optString(v.keywords, 'keywords', bad) ?? 'keywords',
        leaf: optBool(v.leaf, 'leaf', bad) ?? true,
        unique: optBool(v.unique, 'unique', bad) ?? false,
      };
      return;
    }
    case 'titled': {
      const v = recordOf(value, bad);
      onlyKeys(v, ['field'], bad);
      out.titled = { field: optString(v.field, 'field', bad) ?? bad('names its field') };
      return;
    }
    case 'dated': {
      const v = recordOf(value, bad);
      onlyKeys(v, ['field', 'unit', 'indexed'], bad);
      const unit = (v.unit ?? 'game-s') as DatedTrait['unit'];
      if (unit !== 'game-s' && unit !== 'real-ms') bad(`unit '${String(v.unit)}' (game-s, real-ms)`);
      out.dated = {
        field: optString(v.field, 'field', bad) ?? bad('names its field'),
        unit,
        indexed: optBool(v.indexed, 'indexed', bad) ?? false,
      };
      return;
    }
    case 'filed': {
      if (typeof value !== 'string' || !(FILING_TRANSPORTS as readonly string[]).includes(value)) {
        bad(`'${String(value)}' is not a transport (${FILING_TRANSPORTS.join(', ')})`);
      }
      out.filed = value as FilingTransport;
      return;
    }
    case 'paper': {
      const v = recordOf(value, bad);
      onlyKeys(v, ['template'], bad);
      out.paper = { template: optString(v.template, 'template', bad) ?? bad('names its template') };
      return;
    }
    case 'ledger': {
      if (value === 'immutable') {
        out.ledger = { mode: 'immutable' };
        return;
      }
      const v = recordOf(value, bad);
      onlyKeys(v, ['grows'], bad);
      if (!Array.isArray(v.grows) || v.grows.length === 0 || !v.grows.every((f) => typeof f === 'string')) {
        bad('is immutable, or { grows: [field…] }');
      }
      out.ledger = { mode: 'grows', grows: [...(v.grows as string[])] };
      return;
    }
    case 'tree': {
      const v = recordOf(value, bad);
      onlyKeys(v, ['parent'], bad);
      out.tree = { parent: optString(v.parent, 'parent', bad) ?? bad('names its parent: folder or a field') };
      return;
    }
    case 'secret': {
      if (value !== true) bad('is true or absent');
      out.secret = true;
      return;
    }
  }
}

function parseFields(where: string, raw: unknown): Map<string, FieldSpec> {
  const out = new Map<string, FieldSpec>();
  if (raw === undefined || raw === null) return out;
  if (!isRecord(raw)) throw new Error(`${where}: fields must be a map`);
  for (const [name, spec] of Object.entries(raw)) {
    const bad = (why: string): never => {
      throw new Error(`${where}: field '${name}': ${why}`);
    };
    const s = typeof spec === 'string' ? { type: spec } : recordOf(spec, bad);
    onlyKeys(s, ['type', 'required', 'index', 'default'], bad);
    const type = (s.type ?? 'any') as FieldType;
    if (!(FIELD_TYPES as readonly string[]).includes(type)) bad(`type '${String(s.type)}' (${FIELD_TYPES.join(', ')})`);
    const index = optString(s.index, 'index', bad);
    if (index === 'word' || index === 'date') bad(`index '${index}' is the card's own key`);
    if (s.default !== undefined && !isKeyValue(s.default)) bad('default must be a string, number, boolean or list');
    out.set(name, {
      type,
      required: optBool(s.required, 'required', bad) ?? false,
      ...(index ? { index } : {}),
      ...(s.default !== undefined ? { default: s.default as DocumentKeyValue } : {}),
    });
  }
  return out;
}

// --- small readers ----------------------------------------------------------

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function recordOf(v: unknown, bad: (why: string) => never): Record<string, unknown> {
  return isRecord(v) ? v : bad('must be a map');
}

function onlyKeys(v: Record<string, unknown>, allowed: readonly string[], bad: (why: string) => never): void {
  for (const k of Object.keys(v)) if (!allowed.includes(k)) bad(`unknown parameter '${k}' (${allowed.join(', ')})`);
}

function optString(v: unknown, what: string, bad: (why: string) => never): string | undefined {
  if (v === undefined) return undefined;
  return typeof v === 'string' && v !== '' ? v : bad(`${what} must be a word`);
}

function optBool(v: unknown, what: string, bad: (why: string) => never): boolean | undefined {
  if (v === undefined) return undefined;
  return typeof v === 'boolean' ? v : bad(`${what} must be true or false`);
}

function isKeyValue(v: unknown): v is DocumentKeyValue {
  if (typeof v === 'string' || typeof v === 'boolean') return true;
  if (typeof v === 'number') return Number.isFinite(v);
  return Array.isArray(v) && v.every((x) => typeof x === 'string' || (typeof x === 'number' && Number.isFinite(x)));
}

function fitsType(v: unknown, type: FieldType): boolean {
  switch (type) {
    case 'string':
      return typeof v === 'string';
    case 'number':
      return typeof v === 'number' && Number.isFinite(v);
    case 'boolean':
      return typeof v === 'boolean';
    case 'list':
      return Array.isArray(v);
    case 'map':
      return isRecord(v);
    case 'any':
      return true;
  }
}

function leafOf(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}

function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  if (isRecord(v)) {
    return `{${Object.keys(v)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(v) ?? 'undefined';
}
