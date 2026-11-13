/**
 * ⭐ The `cultivation` need (tracts build D36). A property of the GROUND:
 * the space's parcel must admit the scale, and at field scale the ground
 * must be marked into fields. Before this build the need had no evaluator
 * at all and fell through to the cold-storage rung — it could never be
 * met.
 */
import '../../../../test-bootstrap';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { Archetype } from '../Archetype';
import { ParcelApi } from '../../../api/parcel';
import { SoilMixin } from '../../husbandry/Soil';
import { ReservedMixin } from '../../reserve/Reserved';
import { ContainerMixin } from '../../spatial/Container';
import { Idea } from '../../stuff/Idea';
import type { Stuff } from '../../stuff/Stuff';
import type { Soil } from '../../husbandry/Soil';
import { makeStuffAtPath } from '../../security/__tests__/test-setup';

class Ground extends SoilMixin(ReservedMixin(ContainerMixin(Idea))) {
  public parts: (Stuff & Soil)[] = [];
  public override soilParts(): readonly (Stuff & Soil)[] {
    return this.parts;
  }
  public override soilPartNoun(): string {
    return 'field';
  }
}
class Part extends SoilMixin(ReservedMixin(Idea)) {}

const FARM = Archetype.fromData({
  archetypeId: 'test-farm',
  label: 'a farm',
  capabilities: [{ key: 'ground', needs: { cultivation: 'field' } }],
}, '/test/archetypes/test-farm');
const GARDEN = Archetype.fromData({
  archetypeId: 'test-garden',
  label: 'a garden',
  capabilities: [{ key: 'ground', needs: { cultivation: 'bed' } }],
}, '/test/archetypes/test-garden');

describe('Archetype — the cultivation need', () => {
  afterEach(() => vi.restoreAllMocks());

  it('⭐ field scale is met by marked fields on farmland, and says how many', () => {
    vi.spyOn(ParcelApi, 'cultivationScaleAt').mockReturnValue('field');
    const bench = makeStuffAtPath(() => new Ground(), '/world/_test/bench');
    bench.parts = [
      makeStuffAtPath(() => new Part(), '/world/_test/a'),
      makeStuffAtPath(() => new Part(), '/world/_test/b'),
    ];
    const s = FARM.satisfies(bench);
    expect(s.satisfied).toBe(true);
    expect(s.rows[0]!.by).toMatch(/two fields marked/);
  });

  it('zoned farmland with nothing marked is not yet a farm', () => {
    vi.spyOn(ParcelApi, 'cultivationScaleAt').mockReturnValue('field');
    const bench = makeStuffAtPath(() => new Ground(), '/world/_test/bench2');
    expect(FARM.satisfies(bench).satisfied).toBe(false);
  });

  it('a residential garden admits beds and never fields', () => {
    vi.spyOn(ParcelApi, 'cultivationScaleAt').mockReturnValue('bed');
    const garden = makeStuffAtPath(() => new Ground(), '/world/_test/garden');
    garden.parts = [makeStuffAtPath(() => new Part(), '/world/_test/c')];
    expect(FARM.satisfies(garden).satisfied).toBe(false);
    expect(GARDEN.satisfies(garden).satisfied).toBe(true);
  });

  it('wild ground admits neither', () => {
    vi.spyOn(ParcelApi, 'cultivationScaleAt').mockReturnValue('none');
    const pen = makeStuffAtPath(() => new Ground(), '/world/_test/pen');
    expect(GARDEN.satisfies(pen).satisfied).toBe(false);
  });
});
