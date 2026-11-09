/**
 * ArchetypeCatalogue — singleton Idea owning the runtime archetype index.
 *
 * Lives at `/platform/idea/ArchetypeCatalogue` (the `RecipeCatalogue`
 * shape). The source of truth is `documents {kind: 'archetype'}` (each
 * industry pack ships its own under `content/archetypes/`); this
 * catalogue warms a transient cache from it and resolves archetypes by
 * id. The installer's go-live re-warms it after a live `pack sync`
 * touches the kind.
 *
 * Read-only reference surface (an archetype is public knowledge — the
 * floor an industry states), so methods are ungated — the
 * `TopicCatalogue` precedent.
 *
 * Not a persisted record — the seed YAML is `{ class:
 * /platform/idea/ArchetypeCatalogue, data: {} }`.
 */

import { Idea } from '../../lib/stuff/Idea';
import { Archetype } from '../../lib/archetype/Archetype';
import { DocumentApi } from '../../api/document';
import { DocumentNotResidentError, type VetoResult } from '../../lib/errors';
import { Recipe } from '../../lib/craft/Recipe';
import type { EvictionContext } from '../../lib/stuff/Stuff';

const ArchetypeCatalogueBase = Idea;

export default class ArchetypeCatalogue extends ArchetypeCatalogueBase {
  /** Residency veto — a load-bearing process-lifetime singleton is never culled. */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'system singleton; never culled' };
  }

  /** archetypeId → Archetype. `null` = not yet warmed. */
  private cache: Map<string, Archetype> | null = null;

  /** Resolve an archetype by id, or null. */
  public getArchetype(archetypeId: string): Archetype | null {
    this.ensureCache();
    return this.cache!.get(archetypeId) ?? null;
  }

  /** Every known archetype. */
  public allArchetypes(): readonly Archetype[] {
    this.ensureCache();
    return [...this.cache!.values()];
  }

  public override async onCreate(_context?: unknown): Promise<void> {
    // ⭐ An industry archetype's floor derives from its industry's recipes,
    // so the archetypes are live only when the recipe dictionary is.
    await Recipe.loadDictionary();
    await this.warm();
  }

  /** (Re)build the cache from `documents {kind: archetype}`. */
  public async warm(): Promise<void> {
    const docs = await DocumentApi.listOfKind('archetype');
    const cache = new Map<string, Archetype>();
    for (const doc of docs) {
      try {
        const a = Archetype.fromDocument(doc);
        cache.set(a.getArchetypeId(), a);
      } catch (err) {
        // A malformed row never takes the catalogue down: skip it loudly.
        console.warn(`ArchetypeCatalogue: skipping ${doc.getPath()}: ${(err as Error).message}`);
      }
    }
    this.cache = cache;
  }

  private ensureCache(): void {
    // Never "empty": reached only through `StuffApi.singleton`, whose
    // `onCreate` warms it. A cold sync read is an engine defect.
    if (this.cache === null) {
      throw new DocumentNotResidentError('archetype', '/platform/idea/ArchetypeCatalogue');
    }
  }

  /** Singleton refusal (mirrors RecipeCatalogue). */
  public canDestruct(): VetoResult {
    return {
      ok: false,
      reason:
        'ArchetypeCatalogue is a system singleton and cannot be destructed; ' +
        'use forceDestruct (admin-gated) if you really mean it',
    };
  }
}
