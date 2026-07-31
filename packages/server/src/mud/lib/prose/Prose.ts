/**
 * Prose — a compiled prose template (the prose subsystem's value
 * object).
 *
 * Sits between `Mml` (markup) and any prose externalized from source —
 * settings, CMS-authored location/NPC/item descriptions, prompts. Turns
 * a string template with `{{ var }}` placeholders, `{% if %}`
 * conditionals, and `| filter` chains into a finished `Mml` fragment.
 * The author-facing face is {@link ProseApi}.
 *
 * **The engine is not here.** The Liquid instance, the default filter
 * set (`name` / `item` / `location` / `object` / `direction`; `cap` /
 * `pronoun` / `article` / `possessive`; the quantity filters), the
 * Mml-aware output escaping and the engine config all live in
 * `obj/api/ProseLogic.ts` — `liquidjs` is outside `src/mud/`, so only
 * the Api tier may import it (docs/architecture.md § The import
 * boundary). Edit filters and engine options there, not here.
 *
 * What remains here is the value object: a source string, an opaque
 * compiled handle, and the `Mml`-typed render surface callers speak.
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
