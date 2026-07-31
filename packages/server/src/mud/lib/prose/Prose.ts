/**
 * Prose — a compiled Liquid prose template (the prose subsystem's
 * value object).
 *
 * Sits between `Mml` (markup) and any prose externalized from source —
 * settings, CMS-authored location/NPC/item descriptions, prompts. Turns
 * a string template with `{{ var }}` placeholders, `{% if %}`
 * conditionals, and `| filter` chains into a finished `Mml` fragment.
 * The author-facing face is {@link ProseApi}, which forwards here.
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

import { Mml } from '../../api/mml';
import { ProseApi, type CompiledProse } from '../../api/prose';

/** A Liquid filter: takes the piped input plus any `: arg`s. */
export type FilterFn = (input: unknown, ...args: unknown[]) => unknown;

/**
 * A compiled prose template. Created via `Prose.parse`; the private
 * constructor enforces that path so callers can't hand us an arbitrary
 * AST.
 *
 * The template *engine* lives in `ProseLogic` — `liquidjs` is a
 * dependency outside the tree, so it may only be imported from the Api
 * tier (docs/architecture.md § The import boundary). What stays here is
 * the value object: a source string, an opaque compiled handle, and the
 * Mml-typed render surface callers actually speak.
 */
export class Prose {
  private constructor(
    private readonly source: string,
    private readonly compiled: CompiledProse,
  ) {}

  /** Compile a template once for repeated rendering. */
  static parse(source: string): Prose {
    return new Prose(source, ProseApi.compile(source));
  }

  /**
   * Register a custom filter on the shared prose engine, usable as
   * `{{ x | name }}` (with optional args: `{{ x | name: 'arg' }}`).
   * Filters that return Mml fragments compose with the Mml-aware
   * output handler; raw-string returns get five-entity escaping.
   * Exposed to authors through {@link ProseApi.registerFilter}.
   */
  static registerFilter(name: string, fn: FilterFn): void {
    ProseApi.registerFilter(name, fn);
  }

  /**
   * Render against a variable bag. Mml fragments interpolate verbatim;
   * raw strings are escaped. Result is a finished Mml fragment.
   */
  render(vars: Record<string, unknown>): Mml {
    return Mml.fromMarkup(ProseApi.renderCompiled(this.compiled, vars));
  }

  /** The original template source. */
  toString(): string {
    return this.source;
  }
}
