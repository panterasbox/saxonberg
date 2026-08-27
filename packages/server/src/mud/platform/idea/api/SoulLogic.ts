// SoulLogic — the hot-reloadable logic singleton behind SoulApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { ApiLogic } from '../../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../../lib/security/decorators';
import { SecurityPolicies } from '../../../lib/security/SecurityPolicies';
import { StuffApi } from '../../../api/stuff';
import { TemplatePaths } from '../../../lib/paths';
import type { Emote } from '../../../lib/social/Emote';
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
 * Lives at `/platform/idea/api/soul`. Holds the catalogue-resolution + forwarding;
 * the state lives on the pinned `/platform/idea/SoulCatalogue` singleton, whose
 * methods are gated to admit this logic singleton
 * (`FromTemplate('/platform/idea/api/soul')`). Each method is gated
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

  /** See {@link SoulApi.resolveAny}. */
  @CallSecurity(SoulApiCallers)
  public async resolveAny(verb: string): Promise<Emote | null> {
    return (await requireCatalogue()).resolveAny(verb);
  }

  /** See {@link SoulApi.setDisabled}. */
  @CallSecurity(SoulApiCallers)
  public async setDisabled(verb: string, flag: boolean): Promise<boolean> {
    return (await requireCatalogue()).setDisabled(verb, flag);
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

  /** See {@link SoulApi.search}. */
  @CallSecurity(SoulApiCallers)
  public async search(term: string): Promise<Emote[]> {
    return (await requireCatalogue()).search(term);
  }

  /**
   * See {@link SoulApi.snapshot}.
   *
   * ⚠ **Resolves the catalogue only if it is ALREADY resident** — the one
   * method here that does not go through `requireCatalogue`.
   *
   * Two reasons, and they point the same way. `requireCatalogue` falls
   * back to `StuffApi.singleton`, which MINTS the singleton; minting a
   * catalogue in order to read a palette off it produces an unwarmed
   * one, so the answer would be an empty list either way. And this is
   * called from `Avatar.enter`, which is *pure ceremony* — a test
   * asserts it performs no template resolution at all, and that
   * assertion is worth keeping: the login path should not be the thing
   * that decides a world singleton exists.
   *
   * So an absent catalogue answers `[]`, which is the client's honest
   * state for "no palette" and already renders as "offer no picker".
   */
  @CallSecurity(SoulApiCallers)
  public async snapshot(): Promise<EmoteCatalogueEntry[]> {
    const cat =
      catalogueRef ?? StuffApi.findByTemplatePath<SoulCatalogue>(CATALOGUE_PATH);
    if (!cat) return [];
    return cat.snapshot();
  }

  /** See {@link SoulApi.invalidateCache}. */
  @CallSecurity(SoulApiCallers)
  public async invalidateCache(): Promise<void> {
    (await requireCatalogue()).invalidateCache();
  }
}
