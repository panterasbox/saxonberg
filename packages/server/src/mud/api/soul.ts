/**
 * SoulApi — thin facade over the SoulCatalogue singleton.
 *
 * Stable caller-facing surface for verbs and controllers: `resolve` on
 * the dispatch hot path, `mint` / `edit` / `delete` / `all` for the
 * `soul <subcommand>` authoring suite. The state lives on the
 * `/obj/SoulCatalogue` Stuff (HMR-able, lifecycle-tracked, security-
 * proxied); the Api carries no state of its own.
 *
 * Cross-cutting Apis end with `SecurityApi.decorateApiClass` so the
 * external security gate fires before delegating to the catalogue.
 */

import { StuffApi } from './stuff';
import { SecurityApi } from './security';
import type { Emote } from '../lib/social/Emote';
import type SoulCatalogue from '../obj/SoulCatalogue';
import type { EmoteSpec } from '../obj/SoulCatalogue';
import { TemplatePaths } from '../lib/paths';

const CATALOGUE_PATH = TemplatePaths.soulCatalogue;

export class SoulApi {
  /** Catalogue reference, cached after the first resolution. */
  static #catalogueRef: SoulCatalogue | null = null;

  static async resolve(verb: string): Promise<Emote | null> {
    const cat = await SoulApi.#requireCatalogue();
    return cat.resolve(verb);
  }

  static async mint(spec: EmoteSpec): Promise<Emote> {
    const cat = await SoulApi.#requireCatalogue();
    return cat.mint(spec);
  }

  static async edit(verb: string, patch: Partial<EmoteSpec>): Promise<Emote> {
    const cat = await SoulApi.#requireCatalogue();
    return cat.edit(verb, patch);
  }

  static async delete(verb: string): Promise<boolean> {
    const cat = await SoulApi.#requireCatalogue();
    return cat.delete(verb);
  }

  static async all(): Promise<Emote[]> {
    const cat = await SoulApi.#requireCatalogue();
    return cat.all();
  }

  /**
   * Hard-invalidate the cache. Used by the wizard `reload` flow.
   */
  static async invalidateCache(): Promise<void> {
    const cat = await SoulApi.#requireCatalogue();
    cat.invalidateCache();
  }

  static async #requireCatalogue(): Promise<SoulCatalogue> {
    if (SoulApi.#catalogueRef) return SoulApi.#catalogueRef;
    const cat = StuffApi.findByTemplatePath<SoulCatalogue>(CATALOGUE_PATH);
    if (cat) {
      SoulApi.#catalogueRef = cat;
      return cat;
    }
    // Bootstrap may not have warmed the catalogue yet in some test
    // contexts; resolve lazily through the singleton helper.
    const lazy = await StuffApi.singleton<SoulCatalogue>(CATALOGUE_PATH);
    SoulApi.#catalogueRef = lazy;
    return lazy;
  }
}

SecurityApi.decorateApiClass(SoulApi);
