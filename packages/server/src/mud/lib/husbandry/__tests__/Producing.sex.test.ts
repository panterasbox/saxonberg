/**
 * ⭐ A tap has a SEX and a REST (dairy D12) — a bull is not milked, a
 * dried-off cow can be marked dry by whoever restores her record — and
 * the milker's HAND is on what they drew (dairy D11).
 */
import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProducingMixin } from '../Producing';
import { Creature } from '../../../lib/creature/Creature';
import Species from '../../../platform/idea/species/Species';
import type { TapSpec } from '../../../platform/idea/species/Species';
import { StuffApi } from '../../../api/stuff';
import { WorldClockApi } from '../../../api/worldclock';
import { Quantity } from '../../../lib/quantity';
import { makeStuff, makeStuffAtPath } from '../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import WorldClockRegistry from '../../../platform/idea/WorldClockRegistry';

const DAY = 86_400;
const SPECIES_PATH = '/stuff/idea/species/_test/milker';

const TAPS: TapSpec[] = [
  {
    key: 'milk',
    yieldRow: '/x/milk',
    perGameDay: 20,
    behaviour: 'expire',
    windowDays: 1,
    sex: 'female',
    restDays: 3,
  },
  // Wool authors no sex: either gives it.
  { key: 'wool', yieldRow: '/x/fleece', perGameDay: 0.008, behaviour: 'continuous', windowDays: 0 },
];

class TestBeast extends ProducingMixin(Creature) {}

describe('a tap has a sex and a rest', () => {
  let clock: ReturnType<typeof vi.spyOn>;
  let base: number;

  const beast = (sex: string | null): TestBeast => {
    const b = makeStuff(() => {
      const x = new TestBeast();
      x.setLifecycleState('alive');
      x._speciesPath = SPECIES_PATH;
      return x;
    });
    if (sex !== null) b.setSex(sex);
    b.reconcileProduction();
    return b;
  };
  const advance = (gameDays: number): void => {
    clock.mockReturnValue(Quantity.of(base + gameDays * DAY, 's'));
  };

  beforeEach(() => {
    installV1QuantityMarshallers();
    makeStuffAtPath(() => new WorldClockRegistry(), '/platform/idea/WorldClockRegistry');
    makeStuffAtPath(() => {
      const s = new Species();
      s.setProduction(TAPS);
      s.setSexDeterminationSystem('xy');
      return s;
    }, SPECIES_PATH);
    base = WorldClockApi.getNow().rawValue();
    clock = vi.spyOn(WorldClockApi, 'getNow');
    clock.mockReturnValue(Quantity.of(base, 's'));
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('a male refuses a female tap, in the host voice, with the reason', async () => {
    const bull = beast('male');
    advance(0.5);
    expect(bull.givesTap('milk')).toBe(false);
    const plan = await bull.planTap(bull, 'milk', null, null, null);
    expect(plan.kind).toBe('refusal');
    expect(plan.kind === 'refusal' && plan.reason).toBe('wrong-sex');
    expect(plan.kind === 'refusal' && plan.prose).not.toMatch(/\d/);
  });

  it('a female is refused nothing for her sex; a sexless tap serves either', async () => {
    const cow = beast('female');
    const bull = beast('male');
    expect(cow.givesTap('milk')).toBe(true);
    expect(bull.givesTap('wool')).toBe(true);
  });

  it('an unrecorded sex is open — the tri-state rule', () => {
    expect(beast(null).givesTap('milk')).toBe(true);
  });

  it('a bull has no milk to be in or out of', () => {
    const bull = beast('male');
    advance(0.5);
    expect(bull.productionRead().join(' ')).not.toMatch(/milk/i);
    const cow = beast('female');
    advance(0.6);
    expect(cow.productionRead().join(' ')).toMatch(/milk/i);
  });

  it('dryOff marks the tap dried off, and the window reads it', () => {
    const cow = beast('female');
    advance(0.2);
    expect(cow.isDriedOff('milk')).toBe(false);
    cow.dryOff('milk');
    expect(cow.isDriedOff('milk')).toBe(true);
    expect(cow.tapWindow('milk').reason).toBe('dried-off');
  });
});
