/**
 * `<composition>` — **the live architecture panel**, and the reason
 * the wiki is not just a help system with prose.
 *
 * ```
 * <composition kind="template" of="/obj/material/oak"/>
 * <composition kind="mixin"    of="CombustibleMixin"/>
 * <composition kind="command"  of="inventory/plant.yaml"/>
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
 */
const INVERSE_SCAN_CAP = 400;

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
 * the reference's shape, because `of="/obj/material/oak"` is
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
    rows.push(row(field, value, SpoilerLevels.ofField(ctor, field)));
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
  if (raw === null || raw === undefined || raw === '') return null;
  if (Array.isArray(raw)) {
    const items = raw.filter((v) => v !== null && v !== undefined);
    return items.length ? items.map((v) => String(v)).join(', ') : null;
  }
  if (typeof raw === 'boolean') return raw ? 'yes' : 'no';
  if (typeof raw === 'object') {
    const keys = Object.keys(raw as Record<string, unknown>);
    if (!keys.length) return null;
    return keys.map((k) => `${k}: ${String((raw as Record<string, unknown>)[k])}`).join(', ');
  }
  const unit = unitOf(entry);
  if (typeof raw === 'number' && unit) {
    // `28 %` reads wrong; every other unit wants the space.
    return unit === '%' ? `${raw}%` : `${raw} ${unit}`;
  }
  return String(raw);
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
  const owners = await classesComposing(name, ctx);
  if (owners.exemplar) {
    const meta = MixinApi.getAllFieldMeta(owners.exemplar);
    const own = Object.keys(meta).sort();
    if (own.length) {
      rows.push(row('fields', own.join(', '), SpoilerLevels.OPEN));
    }
  }

  // ⭐ The inverse: what in this world composes it. The question a
  // template page structurally cannot answer.
  rows.push(
    row(
      'composed by',
      owners.paths.length ? owners.paths.join(', ') : '(nothing yet)',
      SpoilerLevels.OPEN,
    ),
  );
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
): Promise<{ paths: string[]; exemplar: AnyConstructor | null; truncated: boolean }> {
  const templates = await Template.findDescendants('/obj');
  const paths: string[] = [];
  let exemplar: AnyConstructor | null = null;
  const seen = new Map<string, AnyConstructor | null>();
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
      seen.set(classPath, await loadClass(classPath));
    }
    const ctor = seen.get(classPath) ?? null;
    if (!ctor) continue;
    const composes = MixinApi.queryMixins(ctor).some(
      (m) => m._mixinName === mixinName,
    );
    if (!composes) continue;
    if (!exemplar) exemplar = ctor;
    paths.push(tpl.path);
  }
  // The component READS the budget; it does not spend it (D-5).
  void ctx.budget;
  return { paths: paths.sort(), exemplar, truncated };
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
    children: [cell('th', a, SpoilerLevels.OPEN), cell('th', b, SpoilerLevels.OPEN)],
  };
}

/**
 * One field row, at `level`.
 *
 * The level wraps the WHOLE row, including the field's name: on a
 * creature whose `fireVulnerability` is a spoiler, the *existence* of
 * that field is the reveal as much as its value is.
 */
function row(label: string, value: string, level: SpoilerLevel): MmlNode {
  const tr: MmlNode = {
    kind: 'tag',
    tag: 'tr',
    attrs: {},
    children: [cell('td', label, level), cell('td', value, level)],
  };
  if (level === SpoilerLevels.OPEN) return tr;
  return {
    kind: 'tag',
    tag: 'spoiler',
    attrs: { level: String(level) },
    children: [tr],
  };
}

function cell(tag: 'td' | 'th', text: string, _level: SpoilerLevel): MmlNode {
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
