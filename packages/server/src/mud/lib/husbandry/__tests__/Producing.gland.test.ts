/**
 * ⭐ A gland is a part (organism-biology D2): the tap is read off the body,
 * and wounding the gland stops what it makes — the fill is scaled by the
 * part's own function band (full 1 · impaired ½ · failing/lost 0).
 */
import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProducingMixin } from '../Producing';
import { Creature } from '../../../lib/creature/Creature';
import Species from '../../../platform/idea/species/Species';
import BodyPlan from '../../../platform/idea/species/BodyPlan';
import type { TapSpec } from '../../../platform/idea/species/Species';
import { StuffApi } from '../../../api/stuff';
import { WorldClockApi } from '../../../api/worldclock';
import { Quantity } from '../../../lib/quantity';
import { makeStuff, makeStuffAtPath } from '../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import WorldClockRegistry from '../../../platform/idea/WorldClockRegistry';
import { setFlatParts } from '../../species/__tests__/flat-body';

const DAY = 86_400;
const SPECIES = '/stuff/idea/species/_test/glanded';
const PLAN = '/stuff/idea/species/BodyPlan/_test-glanded';
const FLESH = '/stuff/idea/material/tissue/flesh';

const MILK: TapSpec = { key: 'milk', yieldRow: '/x/milk', perGameDay: 10, behaviour: 'accrue', windowDays: 10 };

class TestBeast extends ProducingMixin(Creature) {}

describe('a gland is a part', () => {
  let clock: ReturnType<typeof vi.spyOn>;
  let base: number;

  beforeEach(() => {
    installV1QuantityMarshallers();
    makeStuffAtPath(() => new WorldClockRegistry(), '/platform/idea/WorldClockRegistry');
    const plan = makeStuffAtPath(() => new BodyPlan(), PLAN);
    setFlatParts(plan, [
      { key: 'body.torso', parent: null, tissues: [{ tissuePath: FLESH, share: 0.9 }] },
      { key: 'body.torso.udder', parent: 'body.torso', tissues: [{ tissuePath: FLESH, share: 0.1 }], produces: [MILK] },
    ]);
    makeStuffAtPath(() => {
      const s = new Species();
      s._bodyPlanPath = PLAN;
      return s;
    }, SPECIES);
    base = WorldClockApi.getNow().rawValue();
    clock = vi.spyOn(WorldClockApi, 'getNow');
    clock.mockReturnValue(Quantity.of(base, 's'));
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  const beast = (): TestBeast => {
    const b = makeStuff(() => {
      const x = new TestBeast();
      x.setLifecycleState('alive');
      x._speciesPath = SPECIES;
      return x;
    });
    b.reconcileProduction();
    return b;
  };

  it('⭐ the tap is read off the body: the udder makes milk', () => {
    expect(beast().taps().map((t) => t.key)).toEqual(['milk']);
  });

  it('⭐⭐ a wounded udder fills less, and a lost one fills nothing', () => {
    const whole = beast();
    const lost = beast();
    lost.severPart('body.torso.udder');
    clock.mockReturnValue(Quantity.of(base + DAY, 's'));
    expect(whole.standingIn('milk')).toBeGreaterThan(5);
    expect(lost.standingIn('milk')).toBe(0);
  });
});
