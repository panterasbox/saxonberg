/**
 * A thing's size (size and carrying D1–D3): volume is mass over density,
 * the form sets the proportions, an assembly is its parts, a stack its
 * count, cloth packs with air and folds smaller — and an unknown size is
 * honestly unknown.
 */
import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StuffApi } from '../../../api/stuff';
import { StackableMixin } from '../../stuff/Stackable';
import { FoldableMixin } from '../../slot/Foldable';
import { AssembledMixin } from '../../craft/Assembled';
import { DurableMixin } from '../Durable';
import { SIZE_DEFAULTS } from '../../spatial/Dimensions';
import { installForms, material, thing, Item } from '../../spatial/__tests__/size-fixture';
import { installV1QuantityMarshallers, installV1QuantityTagTables } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import Good from '../../stuff/Good';

class Stacked extends StackableMixin(Good) {}
class Cloth extends FoldableMixin(Good) {
  static defaultShape = 'flexible';
}
class Built extends AssembledMixin(DurableMixin(Good)) {}

const OAK = '/stuff/idea/material/_size/oak';
const LINEN = '/stuff/idea/material/_size/linen';

describe('Tangible — size', () => {
  beforeEach(() => {
    installV1QuantityTagTables();
    installV1QuantityMarshallers();
    installForms();
  });
  afterEach(() => StuffApi.clearAll());

  it('volume is mass over its material density', () => {
    const oak = material(OAK, 700);
    const block = thing(() => new Item(), { material: oak, kg: 7 });
    expect(block.getVolumeM3()).toBeCloseTo(0.01);
  });

  it('an unknown size is unknown — no mass, no material', () => {
    expect(thing(() => new Item(), { kg: 3 }).getVolumeM3()).toBeNull();
    expect(thing(() => new Item(), { material: material(OAK, 700) }).getVolumeM3()).toBeNull();
    expect(thing(() => new Item(), {}).getDimensions()).toBeNull();
  });

  it('the form sets the proportions, the volume the scale', () => {
    const oak = material(OAK, 700);
    const block = thing(() => new Item(), { material: oak, kg: 21 });
    expect(block.getShapeName()).toBe('block');
    const d = block.getDimensions()!;
    expect(d.boxVolume()).toBeCloseTo(0.03);
    expect(d.height / d.width).toBeCloseTo(2);
    const pole = thing(() => new Item(), { material: oak, kg: 21, shape: 'rod' });
    expect(pole.getDimensions()!.longest() / pole.getDimensions()!.shortest()).toBeCloseTo(20);
  });

  it('an authored box wins, and refuses a zero side', () => {
    const t = thing(() => new Item(), { material: material(OAK, 700), kg: 1, box: { width: 0.1, depth: 0.2, height: 3 } });
    expect(t.hasAuthoredSize()).toBe(true);
    expect(t.getDimensions()!.longest()).toBe(3);
    expect(() => t.setDimensions({ width: 0, depth: 1, height: 1 })).toThrow();
  });

  it('a stack takes its count times one unit', () => {
    const s = thing(() => new Stacked(), { material: material(OAK, 700), kg: 0.7 });
    s.setQuantity(5);
    expect(s.getVolumeM3()).toBeCloseTo(0.005);
  });

  it('cloth packs with air, and folds smaller', () => {
    const coat = thing(() => new Cloth(), { material: material(LINEN, 1500), kg: 1.5 });
    expect(coat.getShapeName()).toBe('flexible');
    expect(coat.getPackedVolumeM3()).toBeCloseTo(0.001 * SIZE_DEFAULTS.FLEXIBLE_PACKING);
    coat.setFolded(true);
    expect(coat.getPackedVolumeM3()).toBeCloseTo(
      0.001 * SIZE_DEFAULTS.FLEXIBLE_PACKING * SIZE_DEFAULTS.FOLDED_PACKING,
    );
    // It squeezes: its fit box is its packed cube, not its flat box.
    const fit = coat.getFitBox()!;
    expect(fit.width).toBeCloseTo(fit.height);
  });

  it('an assembly is the sum of its parts as they went in', () => {
    const oak = material(OAK, 700);
    const chair = thing(() => new Built(), { material: oak, kg: 7 });
    expect(chair.getVolumeM3()).toBeCloseTo(0.01);
    chair.recordAssembly(
      [
        { part: 'leg', template: '/t/leg', count: 4, role: 'structural', material: OAK, grade: 'fair', condition: 1, failed: 0, makers: [], volumeM3: 0.004 },
        { part: 'seat', template: '/t/seat', count: 1, role: 'structural', material: OAK, grade: 'fair', condition: 1, failed: 0, makers: [], volumeM3: 0.003 },
      ],
      [],
    );
    expect(chair.getVolumeM3()).toBeCloseTo(0.007);
  });
});
