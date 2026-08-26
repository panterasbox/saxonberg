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
import type { EmoteCatalogueEntry } from '@saxonberg/types';
import type { EmoteSpec } from '../obj/SoulCatalogue';
import { SoulLogic } from '../obj/api/SoulLogic';
import { fileURLToPath } from 'url';
import { SecurityApi } from './security';

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
   * Every emote a term finds — by canonical verb, tag, or `searchTerms`.
   * The lookup face; nothing found here dispatches by the term.
   */
  static search(term: string): Promise<Emote[]> {
    return logic().search(term);
  }

  /**
   * The catalogue projected for the client's emote picker — canonical
   * verbs, their emoji and search terms, and each emote's declared grammar
   * slots in declaration order.
   *
   * ⭐ **The read face, and deliberately ungated.** `soul list` is the
   * AUTHOR face and keeps `requiresCoreAccess`; seeing the palette you
   * can already type is not authoring it. Rides
   * `ConnectionEstablishedPayload.emoteCatalogue`, cached by the client
   * for the session exactly as `topicCatalogue` is.
   */
  static snapshot(): Promise<EmoteCatalogueEntry[]> {
    return logic().snapshot();
  }

  /**
   * Hard-invalidate the cache. Used by the wizard `reload` flow.
   */
  static invalidateCache(): Promise<void> {
    return logic().invalidateCache();
  }
}

SecurityApi.decorateApiClass(SoulApi);
