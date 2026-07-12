/**
 * BlueprintCatalogue — singleton Idea owning the runtime blueprint index.
 *
 * Lives at `/obj/BlueprintCatalogue` (the singleton-in-`obj/` convention,
 * sibling to `RecipeCatalogue` / `TopicCatalogue`). The source of truth is
 * the `blueprints` collection of {@link Blueprint} Documents (seeded by
 * `BlueprintSeeder` at boot — a derived skeleton + a curated overlay); this
 * catalogue warms a transient cache from it and resolves blueprints by id +
 * signature.
 *
 * Read-only reference surface (blueprints are public composition metadata,
 * like recipes/topics), so methods are ungated — the `RecipeCatalogue`
 * precedent. The gating lives one layer up on `StudioApi`/`StudioLogic`
 * (the CmsLogic-gates-while-the-catalogue-is-ungated split).
 *
 * `upsert` keeps the cache consistent after a live `publishBlueprint` without
 * a full re-warm.
 *
 * Not a persisted record — the seed YAML is `{ class: /obj/BlueprintCatalogue,
 * data: {} }`; the cache is rebuilt on demand from the collection.
 */

import { Idea } from '../lib/stuff/Idea';
import { PostRegistrationMixin } from '../lib/stuff/PostRegistration';
import { Blueprint } from '../lib/studio/Blueprint';
import type { VetoResult } from '../lib/errors';
import type { EvictionContext } from '../lib/stuff/Stuff';

const BlueprintCatalogueBase = PostRegistrationMixin(Idea);

export default class BlueprintCatalogue extends BlueprintCatalogueBase {
  /**
   * Residency veto — a load-bearing process-lifetime singleton is never
   * culled by the self-eviction sweep.
   */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'system singleton; never culled' };
  }

  /** blueprintId → Blueprint. `null` = not yet warmed. */
  private cache: Map<string, Blueprint> | null = null;

  /** signature → blueprintId (the dedup index). */
  private bySignature: Map<string, string> = new Map();

  /** Resolve a blueprint by its durable id, or null. */
  public getBlueprint(blueprintId: string): Blueprint | null {
    this.ensureCache();
    return this.cache!.get(blueprintId) ?? null;
  }

  /** Resolve a blueprint by its structural signature, or null. */
  public findBySignature(signature: string): Blueprint | null {
    this.ensureCache();
    const id = this.bySignature.get(signature);
    return id ? (this.cache!.get(id) ?? null) : null;
  }

  /** Every known blueprint. */
  public allBlueprints(): readonly Blueprint[] {
    this.ensureCache();
    return [...this.cache!.values()];
  }

  /** Whether `blueprintId` is known. */
  public knows(blueprintId: string): boolean {
    this.ensureCache();
    return this.cache!.has(blueprintId);
  }

  /**
   * Fold a just-persisted blueprint into the live cache + signature index
   * (a `publishBlueprint` maintenance hook, so a fresh publish is visible
   * without a full re-warm).
   */
  public upsert(blueprint: Blueprint): void {
    this.ensureCache();
    const id = blueprint.getBlueprintId();
    if (!id) return;
    this.cache!.set(id, blueprint);
    const sig = blueprint.getSignature();
    if (sig) this.bySignature.set(sig, id);
  }

  public override async postRegister(_context?: unknown): Promise<void> {
    await this.warm();
  }

  /** (Re)build the cache + signature index from the `blueprints` collection. */
  public async warm(): Promise<void> {
    const blueprints = await Blueprint.find<Blueprint>({});
    const cache = new Map<string, Blueprint>();
    const bySignature = new Map<string, string>();
    for (const bp of blueprints) {
      const id = bp.getBlueprintId();
      if (!id) continue;
      cache.set(id, bp);
      const sig = bp.getSignature();
      if (sig) bySignature.set(sig, id);
    }
    this.cache = cache;
    this.bySignature = bySignature;
  }

  private ensureCache(): void {
    // A read before warm may start empty so the resolve surface returns null
    // rather than throwing. `== null` also covers an instance whose field
    // initializers didn't run (HMR / white-box construction).
    if (this.cache == null) this.cache = new Map();
    if (this.bySignature == null) this.bySignature = new Map();
  }

  /** Singleton refusal (mirrors RecipeCatalogue / TopicCatalogue). */
  public canDestruct(): VetoResult {
    return {
      ok: false,
      reason:
        'BlueprintCatalogue is a system singleton and cannot be destructed; ' +
        'use forceDestruct (admin-gated) if you really mean it',
    };
  }
}
