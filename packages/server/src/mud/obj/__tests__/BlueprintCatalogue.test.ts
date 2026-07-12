/**
 * BlueprintCatalogue — the runtime blueprint index singleton.
 *
 * Covers `warm()` from the `blueprints` collection, the id + signature
 * resolves, `allBlueprints`, and the `upsert` live-maintenance hook. No
 * Mongo: `Blueprint.find` is stubbed (the `RecipeCatalogue` shape). The
 * catalogue is constructed as a plain instance — the residency/lifecycle
 * refusals are asserted structurally, not through boot.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import BlueprintCatalogue from '../BlueprintCatalogue';
import { Blueprint } from '../../lib/studio/Blueprint';

function makeBlueprint(
  blueprintId: string,
  signature: string,
  name: string
): Blueprint {
  const bp = new Blueprint();
  bp.blueprintId = blueprintId;
  bp.signature = signature;
  bp.name = name;
  bp.baseClass = 'Idea';
  bp.mixinNames = signature.split('|')[1]?.split(',').filter(Boolean) ?? [];
  return bp;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('BlueprintCatalogue.warm', () => {
  let catalogue: BlueprintCatalogue;

  beforeEach(() => {
    catalogue = Object.create(
      BlueprintCatalogue.prototype
    ) as BlueprintCatalogue;
  });

  it('indexes blueprints by id and signature', async () => {
    vi.spyOn(Blueprint, 'find').mockResolvedValue([
      makeBlueprint('a', 'Idea|NamedMixin', 'Named Thing'),
      makeBlueprint('b', 'Thing|BulkableMixin', 'Bucket'),
    ] as unknown as Blueprint[]);

    await catalogue.warm();

    expect(catalogue.getBlueprint('a')?.getName()).toBe('Named Thing');
    expect(catalogue.findBySignature('Thing|BulkableMixin')?.getBlueprintId()).toBe(
      'b'
    );
    expect(catalogue.allBlueprints()).toHaveLength(2);
    expect(catalogue.knows('a')).toBe(true);
    expect(catalogue.knows('zzz')).toBe(false);
  });

  it('returns null for unknown id / signature before warm', () => {
    expect(catalogue.getBlueprint('nope')).toBeNull();
    expect(catalogue.findBySignature('nope')).toBeNull();
    expect(catalogue.allBlueprints()).toEqual([]);
  });

  it('upsert folds a fresh blueprint into both indexes', async () => {
    vi.spyOn(Blueprint, 'find').mockResolvedValue([] as unknown as Blueprint[]);
    await catalogue.warm();

    const bp = makeBlueprint('c', 'Idea|VisibleMixin', 'Visible Thing');
    catalogue.upsert(bp);

    expect(catalogue.getBlueprint('c')).toBe(bp);
    expect(catalogue.findBySignature('Idea|VisibleMixin')).toBe(bp);
  });
});

describe('BlueprintCatalogue lifecycle refusals', () => {
  it('refuses eviction and destruction (system singleton)', () => {
    const catalogue = Object.create(
      BlueprintCatalogue.prototype
    ) as BlueprintCatalogue;
    expect(catalogue.canEvict({} as never).ok).toBe(false);
    expect(catalogue.canDestruct().ok).toBe(false);
  });
});
