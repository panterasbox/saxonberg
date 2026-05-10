/**
 * ProseApi — Liquid-based templating for authorable prose.
 *
 * Sits between `Mml` (markup) and any prose externalized from source —
 * settings, CMS-authored location/NPC/item descriptions, prompts. Turns a
 * string template with `{{ var }}` placeholders, `{% if %}` conditionals,
 * and `| filter` chains into a finished `Mml` fragment.
 *
 * Mml-aware output rule: when an interpolated value is an `Mml` fragment
 * (or has `toMml()`), it emits verbatim; raw values get the same
 * five-entity escape `Mml.compose` uses. The render output is wrapped
 * via `Mml.fromMarkup` so callers receive a proper `Mml` value.
 *
 * Default filters registered:
 *   - Mml vocabulary: `name`, `item`, `location`, `object`, `direction`
 *   - Grammar: `cap`, `pronoun`, `article`, `possessive`
 *
 * Engine config:
 *   - `strictVariables: false` — missing var renders empty (matches
 *     the previous `Mml.format` semantics).
 *   - `strictFilters: true` — unknown filter throws, catches typos at
 *     render time rather than silently dropping output.
 *   - `ownPropertyOnly: true` — never resolve through prototype chain.
 *   - `outputEscape: outputEscapeMmlAware` — see above.
 *
 * File-loading tags (`include`, `render`, `layout`) work only with a
 * filesystem root, which we never configure — referring to them throws.
 */

import { Liquid } from 'liquidjs';
import type { Stuff } from '../lib/stuff/Stuff';
import { Mml } from './mml';
import { GrammarApi, type PronounKind } from './grammar';
import { MixinApi } from './mixin';
import { SecurityApi } from './security';

type FilterFn = (input: unknown, ...args: unknown[]) => unknown;

function outputEscapeMmlAware(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Mml) return value.toString();
  if (typeof value === 'object' && value !== null) {
    const toMml = (value as { toMml?: () => unknown }).toMml;
    if (typeof toMml === 'function') {
      const fragment = toMml.call(value);
      return fragment instanceof Mml
        ? fragment.toString()
        : Mml.escape(String(fragment));
    }
  }
  return Mml.escape(String(value));
}

const engine = new Liquid({
  strictVariables: false,
  strictFilters: true,
  ownPropertyOnly: true,
  outputEscape: outputEscapeMmlAware,
});

/**
 * Narrow an unknown Liquid input to a Stuff. Filters operating on a
 * Stuff use this as the first gate; non-Stuff inputs render empty.
 * Filters that need a more specific shape (Gendered for pronouns,
 * Named for proper-name rendering) layer a `MixinApi` predicate on
 * top.
 */
function asStuff(v: unknown): Stuff | null {
  return v && typeof v === 'object' && 'stuffId' in (v as object)
    ? (v as Stuff)
    : null;
}

// `| name` is strict — Named only. A non-Named stuff has no proper
// name to render, so the filter renders empty rather than wrapping a
// fallback string in a `<name>` tag (which would lie about identity).
engine.registerFilter('name', (v) => {
  const s = asStuff(v);
  return s && MixinApi.isNamed(s) ? Mml.name(s) : '';
});

// `| item`, `| location`, `| object` accept any Stuff. The underlying
// `Mml.*` factories already drop to a sensible last-stitch fallback
// (`'an item'`, `'somewhere'`, `'something'`) via
// `DescribeApi.getDisplayName` when neither Named nor Visible is
// present — so the filter is the right place to let that fallback
// surface rather than swallowing the call.
engine.registerFilter('item', (v) => {
  const s = asStuff(v);
  return s ? Mml.item(s) : '';
});
engine.registerFilter('location', (v) => {
  const s = asStuff(v);
  return s ? Mml.location(s) : '';
});
engine.registerFilter('object', (v) => {
  const s = asStuff(v);
  return s ? Mml.object(s) : '';
});
engine.registerFilter('direction', (v) =>
  v == null || v === '' ? '' : Mml.direction(String(v)),
);

// Grammar filters.
engine.registerFilter('cap', (v) =>
  v == null ? '' : GrammarApi.cap(String(v)),
);
engine.registerFilter('pronoun', (v, kind) => {
  const s = asStuff(v);
  if (!s || !MixinApi.isGendered(s)) return '';
  return GrammarApi.pronoun(s, (kind ?? 'subj') as PronounKind);
});
engine.registerFilter('possessive', (v) => {
  const s = asStuff(v);
  return s && MixinApi.isGendered(s) ? GrammarApi.possessive(s) : '';
});
// `| article` accepts any Stuff; `GrammarApi.article` already returns
// `'a'` as the last-stitch default when the display name is missing.
engine.registerFilter('article', (v) => {
  const s = asStuff(v);
  return s ? GrammarApi.article(s) : '';
});

// Quantity rendering. Two flavors mirror the call-site intent split
// in `quantities-requirements.md` §6.4:
//   - `quantity`           — tag-flavored markup (default for prose).
//   - `quantity_canonical` — canonical-flavored markup (instrument /
//                            analyze readouts).
// Both produce `<quantity unit value [tag]>inner</quantity>` markup.
engine.registerFilter('quantity', (v) => {
  if (v && typeof v === 'object' && 'toMml' in (v as object)) {
    const fragment = (v as { toMml: () => unknown }).toMml();
    return fragment instanceof Mml ? fragment : '';
  }
  return '';
});
engine.registerFilter('quantity_canonical', (v) => {
  if (v && typeof v === 'object' && 'formatMml' in (v as object)) {
    const fragment = (v as { formatMml: () => unknown }).formatMml();
    return fragment instanceof Mml ? fragment : '';
  }
  return '';
});

/**
 * A compiled Liquid prose template. Created via `Prose.parse`; the
 * private constructor enforces that path so callers can't hand us
 * an arbitrary AST.
 */
export class Prose {
  private constructor(
    private readonly source: string,
    private readonly compiled: ReturnType<typeof engine.parse>,
  ) {}

  /** Compile a template once for repeated rendering. */
  static parse(source: string): Prose {
    return new Prose(source, engine.parse(source));
  }

  /**
   * Render against a variable bag. Mml fragments interpolate verbatim;
   * raw strings are escaped. Result is a finished Mml fragment.
   */
  render(vars: Record<string, unknown>): Mml {
    const rendered = engine.renderSync(this.compiled, vars);
    return Mml.fromMarkup(String(rendered ?? ''));
  }

  /** The original template source. */
  toString(): string {
    return this.source;
  }
}

export class ProseApi {
  /**
   * One-shot: parse and render. Use `Prose.parse` + `render` for hot
   * paths where the template source is constant — the compiled form
   * skips re-parsing on every call.
   */
  static format(source: string, vars: Record<string, unknown>): Mml {
    return Prose.parse(source).render(vars);
  }

  /**
   * Register a custom filter usable as `{{ x | name }}` (with optional
   * args: `{{ x | name: 'arg' }}`). Filters that return Mml fragments
   * compose with the Mml-aware output handler; raw-string returns get
   * five-entity escaping.
   */
  static registerFilter(name: string, fn: FilterFn): void {
    engine.registerFilter(name, fn);
  }
}

SecurityApi.decorateApiClass(ProseApi);
