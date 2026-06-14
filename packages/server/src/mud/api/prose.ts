/**
 * ProseApi — author-facing face for Liquid-based prose templating.
 *
 * The templating engine, its default filter vocabulary, and the
 * compiled-template value object {@link Prose} live in
 * `lib/prose/Prose.ts`; this Api is the thin, security-gated surface
 * authors call. `Prose` is value re-exported here so callers reach the
 * compiled-template type through its face.
 *
 * See [prose.md](../../docs/subsystems/prose.md) for the rendering
 * contract (Mml-aware output, engine config, default filters).
 */

import type { Mml } from './mml';
import { Prose, type FilterFn } from '../lib/prose/Prose';
import { SecurityApi } from './security';

export { Prose } from '../lib/prose/Prose';

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
    Prose.registerFilter(name, fn);
  }
}

SecurityApi.decorateApiClass(ProseApi);
