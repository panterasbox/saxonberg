// SoulLogic — the hot-reloadable logic singleton behind SoulApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { ApiLogic } from '../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import { StuffApi } from '../../api/stuff';
import { TemplatePaths } from '../../lib/paths';
import type { Emote } from '../../lib/social/Emote';
import type { EmoteCatalogueEntry } from '@saxonberg/types';
import type SoulCatalogue from '../SoulCatalogue';
import type { EmoteSpec } from '../SoulCatalogue';

const CATALOGUE_PATH = TemplatePaths.soulCatalogue;

const SoulApiCallers = SecurityPolicies.FromModule('/api/soul#SoulApi');

/**
 * Resolve the pinned `SoulCatalogue` singleton (the state home), warming
 * it lazily through the async `singleton()` clone path when bootstrap
 * hasn't seeded it yet (test contexts). Module-level cache mirrors the
 * former `SoulApi.#catalogueRef` — it survives the logic singleton's
 * `dest`/recreate.
 */
let catalogueRef: SoulCatalogue | null = null;
async function requireCatalogue(): Promise<SoulCatalogue> {
  if (catalogueRef) return catalogueRef;
  const cat = StuffApi.findByTemplatePath<SoulCatalogue>(CATALOGUE_PATH);
  if (cat) {
    catalogueRef = cat;
    return cat;
  }
  const lazy = await StuffApi.singleton<SoulCatalogue>(CATALOGUE_PATH);
  catalogueRef = lazy;
  return lazy;
}

/**
 * SoulLogic — the hot-reloadable logic singleton behind {@link SoulApi}.
 *
 * Lives at `/obj/api/soul`. Holds the catalogue-resolution + forwarding;
 * the state lives on the pinned `/obj/SoulCatalogue` singleton, whose
 * methods are gated to admit this logic singleton
 * (`FromTemplate('/obj/api/soul')`). Each method is gated
 * `FromModule('/api/soul#SoulApi')` (the Api is the only caller; no
 * intra-singleton self-calls).
 *
 * @internal
 */
@Unshadowable
export class SoulLogic extends ApiLogic {
  /** See {@link SoulApi.resolve}. */
  @CallSecurity(SoulApiCallers)
  public async resolve(verb: string): Promise<Emote | null> {
    return (await requireCatalogue()).resolve(verb);
  }

  /** See {@link SoulApi.mint}. */
  @CallSecurity(SoulApiCallers)
  public async mint(spec: EmoteSpec): Promise<Emote> {
    return (await requireCatalogue()).mint(spec);
  }

  /** See {@link SoulApi.edit}. */
  @CallSecurity(SoulApiCallers)
  public async edit(verb: string, patch: Partial<EmoteSpec>): Promise<Emote> {
    return (await requireCatalogue()).edit(verb, patch);
  }

  /** See {@link SoulApi.delete}. */
  @CallSecurity(SoulApiCallers)
  public async delete(verb: string): Promise<boolean> {
    return (await requireCatalogue()).delete(verb);
  }

  /** See {@link SoulApi.all}. */
  @CallSecurity(SoulApiCallers)
  public async all(): Promise<Emote[]> {
    return (await requireCatalogue()).all();
  }

  /** See {@link SoulApi.snapshot}. */
  @CallSecurity(SoulApiCallers)
  public async snapshot(): Promise<EmoteCatalogueEntry[]> {
    return (await requireCatalogue()).snapshot();
  }

  /** See {@link SoulApi.invalidateCache}. */
  @CallSecurity(SoulApiCallers)
  public async invalidateCache(): Promise<void> {
    (await requireCatalogue()).invalidateCache();
  }
}
