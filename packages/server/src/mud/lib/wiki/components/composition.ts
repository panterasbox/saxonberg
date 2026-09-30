/**
 * `<composition>` — **the live architecture panel**, and the reason
 * the wiki is not just a help system with prose.
 *
 * ```
 * <composition kind="template" of="/stuff/idea/material/oak"/>
 * <composition kind="mixin"    of="CombustibleMixin"/>
 * <composition kind="command"  of="platform/cmd/inventory/plant.yaml"/>
 * ```
 *
 * In this engine a thing's behaviour **is** its mixin composition, so
 * an article can carry the thing's real architecture beside its
 * authored prose — derived at read time, and therefore incapable of
 * going stale (criterion 12).
 *
 * ## Three kinds, three genuinely different questions
 *
 * | kind | the panel answers |
 * |---|---|
 * | `template` | *what is this thing made of* |
 * | `mixin` | *what does this capability provide — and **what in the world has it*** |
 * | `command` | *what can I type, and what gates it* |
 *
 * ⭐ **The mixin panel's inverse view is the labour-facing one.** A
 * template page asks *what does oak compose?*; a mixin page asks *what
 * composes `Combustible`?* — which is the question **what in this
 * world can burn**, and it cannot be answered from any single template.
 * That inverse is a thing the wiki can do that a help page cannot, and
 * it is why the subject is a typed reference rather than a bare path.
 *
 * ## ⚠ It annotates; it never gates
 *
 * Every node it emits carries the level its FIELD declares
 * (`SpoilerLevels.ofField`), and the component **never asks who is
 * reading** — it cannot, because `ComponentContext` has no reader. The
 * pipeline does the omission afterwards. That is C1, and it is what
 * makes criterion 27 hold without this file containing a single
 * capability check.
 *
 * ## ⚠ Why not `StudioApi.describeMixin`
 *
 * The plan called for it, and it cannot be used: `describeMixin` and
 * `describeClass` are **read-gated on the author tier** via
 * `getActingAuthor`, so an ordinary reader would be denied. Worse, the
 * component receives no reader, so it could not even explain the
 * refusal. The ungated `MixinApi` introspection below answers the same
 * questions for any reader, which is the correct behaviour for an
 * encyclopedia.
 *
 * ## When the subject disappears
 *
 * The CMS renames and deletes templates; articles point at paths; so an
 * article will outlive its subject. **The page still renders** — the
 * prose is the article, the panel was always derived. A dangling
 * subject yields an inline note where the panel was, the page turns up
 * in `wiki dangling`, and nothing 500s (criterion 65).
 */

import { CommandApi } from '../../../api/command';
import {
  MixinApi,
  type AnyConstructor,
  type FieldMetaEntry,
} from '../../../api/mixin';
import type { MmlNode } from '../../../api/mml';
import { StuffApi } from '../../../api/stuff';
import { Template } from '../../stuff/Template';
import { SpoilerLevels, type ComponentContext, type SpoilerLevel } from '../render';

/** What the panel was asked to describe. */
type Kind = 'template' | 'mixin' | 'command';

const KINDS: readonly Kind[] = ['template', 'mixin', 'command'];

/**
 * How many classes the mixin inverse will scan before giving up.
 *
 * ⚠ A silent cap would be a lie: "what can burn" answering "these
 * twelve things" when it means "the first twelve I looked at" is worse
 * than refusing. So the cap is reported in the panel when it bites.
 *
 * ⚠⚠ **1000, because the content tree named 683 distinct `class:` paths
 * on 2026-09-28** and 400 truncated silently-but-for-the-note the
 * moment the scan root was corrected. A truncated inverse is the one
 * failure a reader cannot detect from the answer: *what can burn* reads
 * like a complete list whatever it contains. Raise this before the
 * class count reaches it, or memoize the index.
 */
const INVERSE_SCAN_CAP = 1000;

/**
 * How many matching template paths the inverse will list individually
 * before it answers by CLASS alone.
 *
 * ⚠ This is a READABILITY bound, not a correctness one — the class line
 * above it is always complete, and the count says how many rows it
 * stands for. It exists because `Chattel`'s 470 paths in one cell blew
 * the 2 s component budget and printed a render failure into the page.
 */
const INVERSE_ROW_LIST_CAP = 40;


export const component = class WikiComposition {
  static label = 'composition';

  static async render(
    props: Readonly<Record<string, string>>,
    _children: readonly MmlNode[],
    ctx: ComponentContext,
  ): Promise<readonly MmlNode[]> {
    const ref = (props.of ?? '').trim();
    if (!ref) return [note('<composition> needs an `of`')];
    const kind = resolveKind(props.kind, ref);
    if (!kind) {
      return [
        note(
          `<composition> kind must be one of ${KINDS.join(', ')}` +
            ` (got '${props.kind}')`,
        ),
      ];
    }
    try {
      switch (kind) {
        case 'template':
          return await describeTemplate(ref);
        case 'mixin':
          return await describeMixin(ref, ctx);
        case 'command':
          return describeCommand(ref);
      }
    } catch (err) {
      // Never fatal: the prose is the article, the panel was always
      // derived. The pipeline would catch a throw anyway; catching here
      // lets the note name the SUBJECT rather than the component.
      return [note(`could not describe '${ref}': ${message(err)}`)];
    }
  }
};

/**
 * Decide the kind. Explicit `kind=` wins; absent, it is inferred from
 * the reference's shape, because `of="/stuff/idea/material/oak"` is
 * unambiguous and making authors type `kind="template"` for the common
 * case is friction for nothing.
 */
function resolveKind(declared: string | undefined, ref: string): Kind | null {
  const k = (declared ?? '').trim().toLowerCase();
  if (k) return (KINDS as readonly string[]).includes(k) ? (k as Kind) : null;
  if (ref.startsWith('/')) return 'template';
  if (ref.endsWith('.yaml')) return 'command';
  if (/Mixin$/.test(ref)) return 'mixin';
  return 'template';
}

// ── template: what is this thing made of ──

async function describeTemplate(path: string): Promise<MmlNode[]> {
  const tpl = await Template.findByPath(path);
  if (!tpl) {
    // Criterion 65: a dangling subject is a NOTE, not a failure. An
    // article about a thing that was removed is still a legitimate
    // historical article; it just has no live thing to describe.
    return [note(`no template at '${path}' — it may have been renamed or removed`)];
  }
  const classPath = tpl.class;
  if (!classPath) return [note(`'${path}' declares no class`)];
  const ctor = await loadClass(classPath);
  if (!ctor) return [note(`'${path}' names a class that will not load: ${classPath}`)];

  const mixins = MixinApi.queryMixins(ctor)
    .map((m) => m._mixinName)
    .filter((n): n is string => typeof n === 'string');
  const meta = MixinApi.getAllFieldMeta(ctor);
  const data = (tpl.data ?? {}) as Record<string, unknown>;

  const rows: MmlNode[] = [
    headerRow('Property', 'Value'),
    // The class is the LINEAGE and the path is the IDENTITY — the two
    // axes the whole taxonomy turns on, so the panel names both.
    row('class', classPath, SpoilerLevels.OPEN),
    row('composes', mixins.length ? mixins.join(', ') : '(none)', SpoilerLevels.OPEN),
  ];

  // ⭐ The VALUE the template declares, not the field's storage class.
  //
  // This panel is a **game reference**; the schema view belongs to
  // `help` and the generated API docs. It shipped rendering each
  // field's declaration metadata, which on a material meant a column
  // reading `persistent` twenty-six times — every field on `Material`
  // declares exactly `{ persistent: true }` — while discarding the
  // `marshaller`, which is the UNIT and the one thing a reader wants
  // beside a number.
  //
  // It also left `spoiler` guarding nothing: a field declared level 3
  // so a creature's weakness stays hidden was hiding the word
  // "persistent". Putting real values in the panel is what makes the
  // reveal model's per-field level mean something.
  //
  // Iterated over the DECLARED fields rather than the data's own keys,
  // so the enumerating snapshot audit still covers everything a panel
  // can surface — a stray key in a `data:` block cannot slip a value
  // onto a page without a declared level.
  for (const field of Object.keys(meta).sort()) {
    const value = formatValue(data[field], meta[field]);
    // A field the template never set has no value to report. Showing
    // it empty pads the panel with rows that say nothing; oak declares
    // no melting point because wood chars rather than melts, and a
    // blank row states that no better than its absence does.
    if (value === null) continue;
    rows.push(
      row(
        field,
        value,
        SpoilerLevels.ofField(ctor, field),
        SpoilerLevels.ofFieldName(ctor, field),
      ),
    );
  }

  return [table(rows)];
}

/**
 * Render an authored value for a reader, or `null` when there is
 * nothing to say.
 *
 * `false` and `0` are values, not absences — "edible: no" is a fact
 * about a material and the reason the emptiness test is written out
 * rather than leaning on falsiness.
 */
function formatValue(raw: unknown, entry: FieldMetaEntry | undefined): string | null {
  const unit = unitOf(entry);
  const rendered = renderValue(raw, unit, 0);
  return rendered === '' ? null : rendered;
}

/** How deep a nested authored value is spelled out before eliding. */
const MAX_VALUE_DEPTH = 2;

/**
 * Spell out an authored value, recursively.
 *
 * ⚠ Recursive because a flat `String(v)` renders a nested object as
 * `[object Object]`, which is how a bullfrog's `vitalProfile` reached a
 * live page reading `coreTemperature: [object Object], heartRate:
 * [object Object]`. A structured profile is exactly the kind of field
 * worth reading, and it was the one the panel could not say anything
 * about.
 *
 * Bounded rather than unbounded: past {@link MAX_VALUE_DEPTH} it
 * elides to `…`. An authored blob is not a place to recurse without a
 * floor, and a panel row is not a data dump — a reader who needs the
 * whole structure is asking a Studio question, not a wiki one.
 */
function renderValue(raw: unknown, unit: string | null, depth: number): string {
  if (raw === null || raw === undefined || raw === '') return '';
  if (typeof raw === 'boolean') return raw ? 'yes' : 'no';
  if (typeof raw === 'number') {
    if (!unit) return String(raw);
    // `28 %` reads wrong; every other unit wants the space.
    return unit === '%' ? `${raw}%` : `${raw} ${unit}`;
  }
  if (typeof raw !== 'object') return String(raw);
  if (depth >= MAX_VALUE_DEPTH) return '…';

  if (Array.isArray(raw)) {
    const items = raw
      .map((v) => renderValue(v, unit, depth + 1))
      .filter((v) => v !== '');
    return items.join(', ');
  }
  const entries = Object.entries(raw as Record<string, unknown>)
    .map(([k, v]) => [k, renderValue(v, null, depth + 1)] as const)
    .filter(([, v]) => v !== '');
  if (!entries.length) return '';
  const body = entries.map(([k, v]) => `${k} ${v}`).join(', ');
  // Braced only when nested, so a top-level profile reads as a list
  // rather than as JSON somebody forgot to format.
  return depth === 0 ? body : `(${body})`;
}

/**
 * The unit a field's marshaller carries, or null.
 *
 * Resolved from the marshaller SINGLETON rather than by decoding its
 * path: the path encoding (`kg/m³` → `kg-per-m3`) is the marshaller's
 * private business and re-deriving it here would be a second copy of a
 * rule that already has an owner. Best-effort throughout — a unit is a
 * courtesy, and no panel should fail to render for want of one.
 */
function unitOf(entry: FieldMetaEntry | undefined): string | null {
  const path = entry?.marshaller;
  if (typeof path !== 'string' || !path) return null;
  try {
    const m = StuffApi.findByTemplatePath(path) as
      | { getUnit?: () => string }
      | null;
    const unit = m?.getUnit?.();
    return typeof unit === 'string' && unit ? unit : null;
  } catch {
    return null;
  }
}

// ── mixin: what does this provide, and what has it ──

async function describeMixin(
  name: string,
  ctx: ComponentContext,
): Promise<MmlNode[]> {
  const rows: MmlNode[] = [headerRow('Capability', name)];

  // The forward view: what the mixin itself declares.
  //
  // ⚠⚠ **The MIXIN's own `fieldMeta`, not the exemplar's.** This read
  // `MixinApi.getAllFieldMeta(exemplar)` until 2026-09-29, which is the
  // whole composed class — so `wiki branded` listed 80 fields including
  // `_bloodPressureDiastolic` and `_spo2`, because the first class it
  // happened to find composing `Branded` was a kept animal. A
  // capability page that names another capability's fields is worse
  // than one that names none: a reader has no way to tell which of the
  // eighty the page is actually about.
  const owners = await classesComposing(name, ctx);
  if (owners.exemplar) {
    const layer = MixinApi.queryMixins(owners.exemplar).find(
      (m) => m._mixinName === name,
    ) as { fieldMeta?: Record<string, unknown> } | undefined;
    const own = Object.keys(layer?.fieldMeta ?? {}).sort();
    if (own.length) {
      rows.push(row('fields', own.join(', '), SpoilerLevels.OPEN));
    }
  }

  // ⭐ The inverse: what in this world composes it. The question a
  // template page structurally cannot answer.
  //
  // ⚠⚠ **Answered by CLASS when the list is long, and that is not a
  // truncation.** Until 2026-09-29 this emitted every matching template
  // path comma-joined into one cell. That is fine for `Atmospheric`
  // (7 rows) and it blew the 2 s component budget for `Chattel` (470
  // rows over 73 classes, ~21 000 characters) — the panel rendered
  // `<composition> failed` INSIDE the page, which reads to a player
  // exactly like a capability nothing composes. The base-class
  // narrowing's own drive caught it, because its assertions are written
  // as *contains X and does not contain Y* and the positive half fired.
  //
  // ⭐ The class list is also the better answer to the question. *What
  // in this world can be owned* is 73 kinds of thing, not 470
  // individual rows, and a kind is what an author composes. The rows are
  // still listed whole while they fit.
  if (owners.byClass.size === 0) {
    rows.push(row('composed by', '(nothing yet)', SpoilerLevels.OPEN));
  } else {
    const classes = [...owners.byClass.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([cls, n]) => (n > 1 ? `${cls} (${n})` : cls));
    rows.push(row('composed by', classes.join(', '), SpoilerLevels.OPEN));
    rows.push(
      row(
        'rows',
        owners.paths.length <= INVERSE_ROW_LIST_CAP
          ? owners.paths.join(', ')
          : `${owners.paths.length} across ${owners.byClass.size} classes ` +
            `— too many to list; the classes are above`,
        SpoilerLevels.OPEN,
      ),
    );
  }
  if (owners.truncated) {
    rows.push(
      row(
        'note',
        `list truncated at ${INVERSE_SCAN_CAP} classes scanned`,
        SpoilerLevels.OPEN,
      ),
    );
  }
  return [table(rows)];
}

/**
 * Every template path whose backing class composes `mixinName`.
 *
 * Scans the `domain` templates rather than the source tree, and that
 * is the right corpus: the question is *what in this WORLD can burn*,
 * not *what classes exist*. A class nothing instantiates is not part
 * of the answer.
 */
async function classesComposing(
  mixinName: string,
  ctx: ComponentContext,
): Promise<{
  paths: string[];
  byClass: Map<string, number>;
  exemplar: AnyConstructor | null;
  truncated: boolean;
}> {
  // ⚠⚠ The root is `/` — every namespace. This read `'/obj'` from the
  // component's first commit and `/obj` has never held a row (the path
  // pattern is `<root>/<branch>/`), so the inverse answered
  // "(nothing yet)" for every mixin in the game while looking healthy.
  // `findDescendants` is a `^prefix/` regex, so `'/'` is the whole tree.
  const templates = await Template.findDescendants('/');
  const paths: string[] = [];
  const byClass = new Map<string, number>();
  let exemplar: AnyConstructor | null = null;
  // `classPath → its mixin NAMES`, built once per class and reused for
  // every row of that class.
  //
  // ⚠⚠ **Per render, deliberately not across renders.** The prototype
  // walk was being redone once per TEMPLATE — 1922 walks over 684
  // distinct classes — which is the waste, not the module import (ESM
  // caches that). Caching the constructors across renders instead would
  // want a hot-reload invalidation hook that does not exist, and a wiki
  // panel that has gone stale is precisely the kind of lie this
  // component was built to make impossible.
  const seen = new Map<string, AnyConstructor | null>();
  const mixinsOf = new Map<string, Set<string>>();
  let scanned = 0;
  let truncated = false;

  for (const tpl of templates) {
    const classPath = tpl.class;
    if (!classPath) continue;
    if (!seen.has(classPath)) {
      if (scanned >= INVERSE_SCAN_CAP) {
        truncated = true;
        break;
      }
      scanned += 1;
      const loaded = await loadClass(classPath);
      seen.set(classPath, loaded);
      if (loaded) {
        mixinsOf.set(
          classPath,
          new Set(
            MixinApi.queryMixins(loaded)
              .map((m) => m._mixinName)
              .filter((n): n is string => typeof n === 'string' && n !== ''),
          ),
        );
      }
    }
    const ctor = seen.get(classPath) ?? null;
    if (!ctor) continue;
    if (!mixinsOf.get(classPath)?.has(mixinName)) continue;
    if (!exemplar) exemplar = ctor;
    paths.push(tpl.path);
    byClass.set(classPath, (byClass.get(classPath) ?? 0) + 1);
  }
  // The component READS the budget; it does not spend it (D-5).
  void ctx.budget;
  return { paths: paths.sort(), byClass, exemplar, truncated };
}

// ── command: what can I type, and what gates it ──

function describeCommand(file: string): MmlNode[] {
  const def = CommandApi.getCommand(file);
  if (!def) {
    return [note(`no command spec '${file}' — it may have been renamed`)];
  }
  const rows: MmlNode[] = [
    headerRow('Command', def.verbs.join(', ')),
    row('description', def.description ?? '', SpoilerLevels.OPEN),
  ];
  const subs = Object.keys(def.subcommands ?? {});
  if (subs.length) {
    rows.push(row('subcommands', subs.join(', '), SpoilerLevels.OPEN));
  }
  // What gates it — the second half of the question this kind answers.
  const validators = def.validators ?? [];
  rows.push(
    row(
      'requires',
      validators.length
        ? validators.map((v) => String(v).split('/').pop()).join(', ')
        : '(nothing)',
      SpoilerLevels.OPEN,
    ),
  );
  return [table(rows)];
}

// ── node builders ──

function table(rows: MmlNode[]): MmlNode {
  return { kind: 'tag', tag: 'table', attrs: {}, children: rows };
}

function headerRow(a: string, b: string): MmlNode {
  return {
    kind: 'tag',
    tag: 'tr',
    attrs: {},
    children: [cell('th', a), cell('th', b)],
  };
}

/**
 * One field row: the name at `nameLevel`, the value at `valueLevel`.
 *
 * ⭐ **Equal levels wrap the WHOLE row**, which is the default and the
 * conservative case: on a creature whose `fireVulnerability` is a
 * spoiler, the *existence* of that field is the reveal as much as its
 * value is, and a row showing the name with an empty cell beside it
 * would announce precisely what the level was protecting.
 *
 * When a declaration splits them — `spoilerName: 0, spoiler: 1` on
 * `Material`'s measured properties — the name rides open and only the
 * value is wrapped, so a reader gets the property list with the
 * numbers collapsed rather than a table of blanks. "This material has
 * a density" is schema, and schema is what `help` publishes; the
 * number is the part worth working for.
 *
 * ⚠ That split is **opting into a redaction marker**, and it is
 * coherent only because the marker reveals nothing when the name was
 * already public. `SpoilerLevels.ofFieldName` clamps a name level
 * above its value's, so the incoherent direction cannot be declared.
 */
function row(
  label: string,
  value: string,
  valueLevel: SpoilerLevel,
  nameLevel: SpoilerLevel = valueLevel,
): MmlNode {
  if (nameLevel === valueLevel) {
    const tr: MmlNode = {
      kind: 'tag',
      tag: 'tr',
      attrs: {},
      children: [cell('td', label), cell('td', value)],
    };
    if (valueLevel === SpoilerLevels.OPEN) return tr;
    return spoiler(valueLevel, [tr]);
  }
  return {
    kind: 'tag',
    tag: 'tr',
    attrs: {},
    children: [
      wrap(nameLevel, cell('td', label)),
      wrap(valueLevel, cell('td', value)),
    ],
  };
}

/** `node`, wrapped iff `level` is above open. */
function wrap(level: SpoilerLevel, node: MmlNode): MmlNode {
  return level === SpoilerLevels.OPEN ? node : spoiler(level, [node]);
}

function spoiler(level: SpoilerLevel, children: MmlNode[]): MmlNode {
  return {
    kind: 'tag',
    tag: 'spoiler',
    attrs: { level: String(level) },
    children,
  };
}

function cell(tag: 'td' | 'th', text: string): MmlNode {
  return { kind: 'tag', tag, attrs: {}, children: [{ kind: 'text', text }] };
}

/** The inline marker a missing or broken subject renders as. */
function note(detail: string): MmlNode {
  return {
    kind: 'tag',
    tag: 'code',
    attrs: {},
    children: [{ kind: 'text', text: `[wiki: ${detail}]` }],
  };
}

/** Load a backing class, or null. Never throws. */
async function loadClass(classPath: string): Promise<AnyConstructor | null> {
  try {
    const ctor = await StuffApi.loadClassByPath(classPath);
    return typeof ctor === 'function' ? (ctor as AnyConstructor) : null;
  } catch {
    return null;
  }
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
