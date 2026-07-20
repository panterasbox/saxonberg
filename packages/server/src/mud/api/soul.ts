/**
 * SoulApi — thin facade over the SoulCatalogue singleton.
 *
 * Stable caller-facing surface for verbs and controllers: `resolve` on
 * the dispatch hot path, `mint` / `edit` / `delete` / `all` for the
 * `soul <subcommand>` authoring suite. The state lives on the
 * `/obj/SoulCatalogue` Stuff; the orchestration (catalogue resolution +
 * forwarding) lives in the hot-reloadable {@link SoulLogic} singleton at
 * `/obj/api/soul`, reached synchronously via `StuffApi.singletonSync`.
 * The Api carries no state of its own.
 */

import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import type { Emote } from '../lib/social/Emote';
import type { EmoteSpec } from '../obj/SoulCatalogue';
import { SoulLogic } from '../obj/api/SoulLogic';
import { fileURLToPath } from 'url';

export type { EmoteSpec } from '../obj/SoulCatalogue';

const LOGIC_PATH = '/obj/api/soul';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../obj/api/SoulLogic', import.meta.url)
);

/** Resolve the HMR-able SoulLogic singleton (sync). */
function logic(): SoulLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(LOGIC_CLASS_FILE, 'SoulLogic') as
        | typeof SoulLogic
        | null) ?? SoulLogic)()
  );
}

export class SoulApi {
  static resolve(verb: string): Promise<Emote | null> {
    return logic().resolve(verb);
  }

  static mint(spec: EmoteSpec): Promise<Emote> {
    return logic().mint(spec);
  }

  static edit(verb: string, patch: Partial<EmoteSpec>): Promise<Emote> {
    return logic().edit(verb, patch);
  }

  static delete(verb: string): Promise<boolean> {
    return logic().delete(verb);
  }

  static all(): Promise<Emote[]> {
    return logic().all();
  }

  /**
   * Hard-invalidate the cache. Used by the wizard `reload` flow.
   */
  static invalidateCache(): Promise<void> {
    return logic().invalidateCache();
  }
}
