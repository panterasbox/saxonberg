/**
 * ProseApi — Liquid-based templating for authorable prose.
 *
 * Sits between `Mml` (markup) and any prose externalized from source —
 * settings, CMS-authored room/NPC/item descriptions, prompts. Turns a
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
 * Narrow an unknown Liquid input to a Stuff. Filters that operate on
 * Stuff use this as the first gate, then layer their own `MixinApi`
 * predicate to assert the specific shape they need (Named, Visible,
 * Gendered, ...). Non-Stuff inputs render empty.
 */
function asStuff(v: unknown): Stuff | null {
  return v && typeof v === 'object' && 'stuffId' in (v as object)
    ? (v as Stuff)
    : null;
}

/** True if the Stuff has a display surface (Named or Visible). */
function hasDisplaySurface(s: Stuff): boolean {
  return MixinApi.isNamed(s) || MixinApi.isVisible(s);
}

// Mml vocabulary filters — require a display-surfaced Stuff so a
// non-Named non-Visible input can't render an empty `<name>` tag.
engine.registerFilter('name', (v) => {
  const s = asStuff(v);
  return s && hasDisplaySurface(s) ? Mml.name(s) : '';
});
engine.registerFilter('item', (v) => {
  const s = asStuff(v);
  return s && hasDisplaySurface(s) ? Mml.item(s) : '';
});
engine.registerFilter('location', (v) => {
  const s = asStuff(v);
  return s && hasDisplaySurface(s) ? Mml.location(s) : '';
});
engine.registerFilter('object', (v) => {
  const s = asStuff(v);
  return s && hasDisplaySurface(s) ? Mml.object(s) : '';
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
engine.registerFilter('article', (v) => {
  const s = asStuff(v);
  return s && hasDisplaySurface(s) ? GrammarApi.article(s) : '';
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
