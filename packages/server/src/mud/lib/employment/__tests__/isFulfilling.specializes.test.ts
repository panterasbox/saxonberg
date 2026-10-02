/**
 * `isFulfilling` and the **specialization walk**.
 *
 * ⚠⚠ The requirements doc for this build asserted *"mixology already
 * specializes bartending, so seat eligibility is untouched"* — and that was
 * **false against the shipped code**, which did an exact
 * `serves.includes(discipline)`. The moment the cocktails moved to
 * `mixology`, every bartender seat in the realm would have stopped
 * fulfilling every cocktail: the seat says `bartending`, the recipe says
 * `mixology`, and `order` answers *"There's no one on hand to make that"*
 * in a bar with four barkeeps standing in it.
 *
 * The walk goes UP from the recipe's discipline. ⭐ A seat listing the
 * parent covers the child; a seat listing the child does **not** cover the
 * parent, because specialization runs one way — a house that hires a
 * mixologist has not thereby said it wants somebody to pull pints.
 */
/**
 * ⚠ Paths are synthetic (`/test/**`). A kernel test proves the KERNEL, so it
 * must not name shipped content — a test of real rows lives beside them
 * (`src/mud/world/**`). `lint:test-content` enforces it, and caught these
 * four on their first run.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Idea } from '../../stuff/Idea';
import { ContainerMixin } from '../../spatial/Container';
import { ContainableMixin } from '../../spatial/Containable';
import { EmployedMixin } from '../Employed';
import BusinessEntity from '../../../platform/idea/Business';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { TemplatePaths } from '../../paths';
import { makeStuffAtPath } from '../../security/__tests__/test-setup';

const HOUSE = '/test/idea/house';
const BAR = '/test/location/floor';

class Room extends ContainerMixin(ContainableMixin(Idea)) {
  static _mixinName = 'Room';
}
class Worker extends EmployedMixin(ContainableMixin(Idea)) {
  static _mixinName = 'Worker';
}

/**
 * A stand-in catalogue at the real template path, so the duck-typed read in
 * `Employed.ts` finds it exactly as it finds the live one.
 */
class FakeCatalogue extends Idea {
  static _mixinName = 'FakeCatalogue';
  public edges: Record<string, string[]> = {};
  public getSpecializes(key: string): string[] {
    return this.edges[key] ?? [];
  }
}

function seat(fulfills: string[]): { house: BusinessEntity; who: Worker } {
  const house = makeStuffAtPath(() => new BusinessEntity(), HOUSE);
  house.positions = [
    { key: 'bartender', label: 'tending bar', wageRate: 1, fulfills },
  ];
  house.operatingLocations = [BAR];
  const room = makeStuffAtPath(() => new Room(), BAR);
  const who = makeStuffAtPath(() => new Worker(), '/test/agent/holder');
  ContainmentApi.move(who as never, room as never);
  (who as unknown as { employments: unknown[] }).employments = [
    {
      organizationPath: HOUSE,
      positionKey: 'bartender',
      status: 'on-shift',
      hiredAt: 0,
      onShiftSince: 0,
    },
  ];
  return { house, who };
}

let catalogue: FakeCatalogue;

beforeEach(() => {
  StuffApi.clearAll();
  catalogue = makeStuffAtPath(
    () => new FakeCatalogue(),
    TemplatePaths.disciplineCatalogue,
  ) as FakeCatalogue;
  catalogue.edges = { mixology: ['bartending'] };
});

afterEach(() => vi.restoreAllMocks());

describe('the walk', () => {
  it('an exact match still fulfils, as it always did', () => {
    const { who } = seat(['bartending']);
    expect(who.isFulfilling('bartending')).toBe(true);
  });

  it('⭐⭐ a BARTENDING seat fulfils a MIXOLOGY recipe — the whole point', () => {
    const { who } = seat(['bartending']);
    expect(who.isFulfilling('mixology')).toBe(true);
  });

  it('⭐ but a MIXOLOGY seat does NOT fulfil a BARTENDING recipe', () => {
    const { who } = seat(['mixology']);
    expect(who.isFulfilling('mixology')).toBe(true);
    // Specialization runs one way. A house that hires a mixologist has not
    // thereby said it wants somebody to pull pints.
    expect(who.isFulfilling('bartending')).toBe(false);
  });

  it('walks more than one rung', () => {
    catalogue.edges = { flair: ['mixology'], mixology: ['bartending'] };
    const { who } = seat(['bartending']);
    expect(who.isFulfilling('flair')).toBe(true);
  });

  it('⚠ refuses an unrelated discipline — the walk is not a yes-machine', () => {
    const { who } = seat(['bartending']);
    expect(who.isFulfilling('smithing')).toBe(false);
  });

  it('⚠⚠ terminates on a mis-authored CYCLE rather than hanging a read that runs on every order', () => {
    catalogue.edges = { a: ['b'], b: ['a'] };
    const { who } = seat(['bartending']);
    expect(who.isFulfilling('a')).toBe(false);
  });

  it('falls back to the exact match when no catalogue is warm', () => {
    StuffApi.unregister(catalogue as never);
    const { who } = seat(['bartending']);
    expect(who.isFulfilling('bartending')).toBe(true);
    // ⚠ Degrades to the OLD behaviour rather than throwing: a boot without
    // the catalogue should serve less, not crash the rail.
    expect(who.isFulfilling('mixology')).toBe(false);
  });
});
