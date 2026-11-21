/**
 * ⭐⭐ The batch's verdict is the CONTENTS' (matter-model-overlaps D2), read
 * off the payload by the holder rung — on ANY holder, crafted or not — and
 * a crafted vessel in use still says its OWN making on its own line
 * (`help pour`: *the vessel keeps its own making*).
 */
import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import Good from '../../stuff/Good';
import Material from '../../material/Material';
import { BulkableMixin } from '../Bulkable';
import { CraftedMixin } from '../../craft/Crafted';
import { Grade } from '../../craft/Grade';
import { Quantity } from '../../quantity';
import { StuffApi } from '../../../api/stuff';
import CraftVessel from '../../../platform/thing/CraftVessel';
import { makeStuff, makeStuffAtPath, stampTemplatePathForTest } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

/** A plain bottle nobody is recorded as making: holds liquid, nothing more. */
class PlainBottle extends BulkableMixin(Good) {
  static _mixinName = 'BatchVerdictPlainBottle';
}
/** A maker: anything with a name. */
class Maker extends CraftedMixin(Good) {
  static _mixinName = 'BatchVerdictMaker';
}

const GIN = '/stuff/idea/material/_verdict/gin';

function gin(): Material {
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName('gin');
    m.setTags(['liquid']);
    m.setDensity(Quantity.of(950, 'kg/m³'));
    return m;
  }, GIN) as unknown as Material;
}

function holding<T extends Good>(v: T, payload: Record<string, unknown> | null): T {
  const b = v as unknown as {
    interiorBulk: boolean;
    setInteriorCapacity(q: Quantity<'L'>): void;
    setBulkMaterial(a: 'interior', m: Material | null): void;
    setBulkAmount(a: 'interior', q: Quantity<'L'>): void;
    setBulkPayload(a: 'interior', p: unknown): void;
  };
  b.interiorBulk = true;
  b.setInteriorCapacity(Quantity.of(1, 'L'));
  b.setBulkMaterial('interior', StuffApi.findByTemplatePath<Material>(GIN) as unknown as Material);
  b.setBulkAmount('interior', Quantity.of(0.7, 'L'));
  b.setBulkPayload('interior', payload);
  return v;
}

describe('⭐⭐ the batch verdict is the contents\', on any holder', () => {
  let distiller: Maker;
  beforeEach(() => {
    StuffApi.clearAll();
    installV1QuantityMarshallers();
    gin();
    distiller = makeStuff(() => new Maker());
    stampTemplatePathForTest(distiller, '/stuff/agent/_verdict/hester');
    vi.spyOn(distiller, 'getPresentation').mockReturnValue('Hester');
    vi.spyOn(distiller, 'describeFor').mockReturnValue('a woman');
  });

  it('⭐ fine gin in a bottle NOBODY made still reads as the distiller\'s fine gin', () => {
    const bottle = makeStuff(() => holding(new PlainBottle(), { grade: 'fine', maker: '/stuff/agent/_verdict/hester' }));
    const viewer = makeStuff(() => new Maker());
    const look = bottle.getMarkupLong(viewer, {});
    expect(look).toContain('What is in it looks fine: clean, balanced, and well made. Made by a woman.');
    expect(look).not.toMatch(/\bIt looks\b/);
  });

  it('ungraded contents say nothing — water nobody made has nothing to be judged on', () => {
    const bottle = makeStuff(() => holding(new PlainBottle(), null));
    expect(bottle.getMarkupLong(makeStuff(() => new Maker()), {})).not.toMatch(/looks/);
  });

  it('⭐ a crafted vessel in use says its OWN making beside the batch\'s', () => {
    const glass = makeStuff(() => holding(new CraftVessel(), { grade: 'exceptional', maker: '/stuff/agent/_verdict/hester' }));
    glass.stamp({ maker: '', grade: Grade.of('poor'), recipe: 'glass', craftedAt: 0 });
    const look = glass.getMarkupLong(makeStuff(() => new Maker()), {});
    expect(look).toContain('What is in it looks exceptional');
    expect(look).toContain('It looks poor: cloudy and carelessly put together.');
  });
});
