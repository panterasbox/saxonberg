/**
 * ProseApi — author-facing face for Liquid-based prose templating.
 *
 * The templating engine, its default filter vocabulary, and the
 * compiled-template value object {@link Prose} live in
 * `lib/prose/Prose.ts`; this Api is the thin, security-gated surface
 * authors call. `Prose` is value re-exported here so callers reach the
 * compiled-template type through its face.
 *
 * This Api is a thin forwarding shell: the logic lives in the
 * hot-reloadable {@link ProseLogic} singleton at `/obj/api/prose`,
 * reached synchronously via `StuffApi.singletonSync`. `dest
 * /obj/api/prose` reloads it.
 *
 * See [prose.md](../../docs/subsystems/prose.md) for the rendering
 * contract (Mml-aware output, engine config, default filters).
 */

import type { Mml } from './mml';
import type { FilterFn } from '../lib/prose/Prose';
import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { SecurityApi } from './security';
import { ProseLogic } from '../obj/api/ProseLogic';
import { fileURLToPath } from 'url';

export { Prose } from '../lib/prose/Prose';

const LOGIC_PATH = '/obj/api/prose';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../obj/api/ProseLogic', import.meta.url)
);

/** Resolve the HMR-able ProseLogic singleton (sync). */
function logic(): ProseLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'ProseLogic'
      ) as typeof ProseLogic | null) ?? ProseLogic)()
  );
}

export class ProseApi {
  /**
   * One-shot: parse and render. Use `Prose.parse` + `render` for hot
   * paths where the template source is constant — the compiled form
   * skips re-parsing on every call.
   */
  static format(source: string, vars: Record<string, unknown>): Mml {
    return logic().format(source, vars);
  }

  /**
   * Register a custom filter usable as `{{ x | name }}` (with optional
   * args: `{{ x | name: 'arg' }}`). Filters that return Mml fragments
   * compose with the Mml-aware output handler; raw-string returns get
   * five-entity escaping.
   */
  static registerFilter(name: string, fn: FilterFn): void {
    logic().registerFilter(name, fn);
  }
}

SecurityApi.decorateApiClass(ProseApi);
