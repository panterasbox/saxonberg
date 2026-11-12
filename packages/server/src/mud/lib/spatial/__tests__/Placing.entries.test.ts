/**
 * ⭐ A `placements` entry is a bare member path or a named region (size and
 * carrying D26): a bare string reads exactly as every shipped host wrote it;
 * a named entry is keyed by its name and sits the member's way; a class may
 * say its honest default is nothing.
 */
import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { Placements } from '../Placement';
import { installForms, thing, place, Item, Surface } from './size-fixture';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import { PlacingMixin } from '../Placing';
import Good from '../../stuff/Good';

/** A host whose class offers nothing until its row says (the Garment shape). */
class Bare extends PlacingMixin(Good) {
  static override defaultPlacements: readonly string[] = [];
}

describe('Placing — entries (D26)', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    installForms();
  });
  afterEach(() => StuffApi.clearAll());

  it('a host that says nothing is a surface; a bare string entry is unchanged', async () => {
    const desk = thing(() => new Surface(), { kg: 10 });
    expect(desk.getPlacements()).toEqual([Placements.ON]);
    await desk.setPlacements([Placements.ON, Placements.FROM]);
    expect(desk.getPlacements()).toEqual([Placements.ON, Placements.FROM]);
    expect(desk.getPlacementEntry(Placements.FROM)).toEqual({ member: Placements.FROM });
    expect(desk.namedRegions()).toEqual([]);
    expect(desk.resolvePlacement('on')).toBe(Placements.ON);
  });

  it('a named entry is keyed by its name and sits its member\'s way', async () => {
    const range = thing(() => new Surface(), { kg: 80 });
    await range.setPlacements([
      { member: Placements.ON, name: 'front plate' },
      { member: Placements.ON, name: 'back plate' },
    ]);
    expect(range.getPlacements()).toEqual(['front plate', 'back plate']);
    expect(range.namedRegions()).toEqual(['front plate', 'back plate']);
    expect(range.placementOf('back plate').getPrepositions()[0]).toBe('on');
    ContainmentApi.move(range, place(4, 'ceiling', 'walled'));
    const pot = thing(() => new Item(), { kg: 1 });
    ContainmentApi.move(pot, range, 'back plate');
    expect(range.getPlaced('back plate')).toEqual([pot]);
    expect(range.getPlaced('front plate')).toEqual([]);
    // Two named regions sharing a word: `put pot on range` asks by name.
    const choice = range.placementFor('on');
    expect(choice).toMatchObject({ ok: false, reason: 'preposition-ambiguous', regions: ['front plate', 'back plate'] });
  });

  it('a class whose honest default is nothing offers nothing', async () => {
    const b = thing(() => new Bare(), { kg: 1 });
    expect(b.getPlacements()).toEqual([]);
    expect(b.placementFor('on')).toMatchObject({ ok: false, reason: 'wrong-preposition', takes: [] });
    await b.setPlacements([Placements.FROM]);
    expect(b.getPlacements()).toEqual([Placements.FROM]);
  });

  it('an entry with no member is refused where it is authored', () => {
    const b = thing(() => new Bare(), { kg: 1 });
    expect(() => b.setPlacements([{ member: '' }])).toThrow(/names no member/);
  });
});
