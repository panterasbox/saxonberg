import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PerceptionApi } from '../../../../api/perception';
import { MixinApi } from '../../../../api/mixin';
import type { Stuff } from '../../../../lib/stuff/Stuff';

/**
 * ⭐ ONE rule for what you may see of what something holds (maritime
 * revision 2) — `look` and `inventory` both read it. On a person: what
 * they wear and hold, ⛔ never pockets or an implant; your own:
 * everything; a container: everything if open, nothing if shut.
 */
const thing = (id: string, concealed = false): Stuff =>
  ({ stuffId: id, isConcealed: () => concealed }) as unknown as Stuff;

const shirt = thing('shirt');
const sword = thing('sword');
const pack = thing('pack');
const implant = thing('implant');
const coin = thing('coin');
const hiddenKnife = thing('knife', true);

const slots: Record<string, { accepts: string; userFacingDetail?: string; bodyPart?: string }> = {
  torso: { accepts: 'WearableMixin' },
  hand: { accepts: 'WieldableMixin', bodyPart: 'body.arm.right.hand' },
  back: { accepts: 'SlottableMixin', userFacingDetail: 'back' },
  brain: { accepts: 'SlottableMixin', bodyPart: 'body.head' },
};
const person = {
  stuffId: 'person',
  isAgent: () => true,
  getAllOccupants: () => new Map<string, Set<Stuff>>([
    ['torso', new Set([shirt])],
    ['hand', new Set([sword])],
    ['back', new Set([pack])],
    ['brain', new Set([implant])],
  ]),
  getSlotSpec: (n: string) => slots[n] ?? null,
  getContents: () => [shirt, sword, pack, implant, coin, hiddenKnife],
} as unknown as Stuff;
let open = true;
const chest = {
  stuffId: 'chest',
  isAgent: () => false,
  isOpen: () => open,
  getContents: () => [coin, hiddenKnife],
} as unknown as Stuff;
const stranger = thing('stranger');

beforeEach(() => {
  open = true;
  vi.spyOn(MixinApi, 'isContainer').mockImplementation(((x: unknown) => x === person || x === chest) as never);
  vi.spyOn(MixinApi, 'isSlotted').mockImplementation(((x: unknown) => x === person) as never);
  vi.spyOn(MixinApi, 'isSealable').mockImplementation(((x: unknown) => x === chest) as never);
  vi.spyOn(MixinApi, 'isConcealable').mockReturnValue(true);
});
afterEach(() => vi.restoreAllMocks());

const ids = (xs: Stuff[]): string[] => xs.map((x) => x.stuffId).sort();

describe('PerceptionApi.visibleContentsOf', () => {
  it('⭐⭐ on another person: what they wear (and a pack on their back) and what they hold — never pockets, never an implant', () => {
    const v = PerceptionApi.visibleContentsOf(stranger, person);
    expect(ids(v.worn)).toEqual(['pack', 'shirt']);
    expect(ids(v.held)).toEqual(['sword']);
    expect(v.carried).toEqual([]);
  });

  it('your own: everything, pockets and implant as carried; concealed stays concealed', () => {
    const v = PerceptionApi.visibleContentsOf(person, person);
    expect(ids(v.worn)).toEqual(['pack', 'shirt']);
    expect(ids(v.held)).toEqual(['sword']);
    expect(ids(v.carried)).toEqual(['coin', 'implant']);
  });

  it('an open container: its contents; a shut one: nothing, and says so', () => {
    expect(ids(PerceptionApi.visibleContentsOf(stranger, chest).carried)).toEqual(['coin']);
    open = false;
    const shut = PerceptionApi.visibleContentsOf(stranger, chest);
    expect(shut.shut).toBe(true);
    expect(shut.carried).toEqual([]);
  });
});
