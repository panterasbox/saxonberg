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
  ({
    stuffId: id,
    isConcealed: () => concealed,
    // A concealed thing is unseen unless THIS viewer perceives it (the
    // `perceives` rule); these fakes are concealed past anyone's eye.
    getConcealment: () => (concealed ? 'buried' : 'obvious'),
  }) as unknown as Stuff;

const shirt = thing('shirt');
const sword = thing('sword');
const pack = thing('pack');
const implant = thing('implant');
const coin = thing('coin');
const hiddenKnife = thing('knife', true);

const slots: Record<string, { accepts: string; userFacingDetail?: string; bodyPart?: string }> = {
  torso: { accepts: 'WearableMixin' },
  legs: { accepts: 'WearableMixin' },
  hand: { accepts: 'WieldableMixin', bodyPart: 'body.arm.right.hand' },
  back: { accepts: 'SlottableMixin', userFacingDetail: 'back' },
  brain: { accepts: 'SlottableMixin', bodyPart: 'body.head' },
};
const person = {
  stuffId: 'person',
  isAgent: () => true,
  getAllOccupants: () => new Map<string, Set<Stuff>>([
    ['torso', new Set([shirt])],
    // ⭐ A garment over two slots (a diving dress) is an occupant of both.
    ['legs', new Set([shirt])],
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
  // ⚠ Meaning changed at size-and-carrying W3 (D23): `visibleContentsOf`
  // is a GROUPING of what `perceives` admits; the person/pockets rule and
  // the shut-lid rule are `perceives`' rule 2 now, which reads real
  // containment — `perceives.holders.test.ts` pins them on real bodies
  // (another person's hands and outer layers, never their pockets; a shut
  // box; a glass jar), and the grouping over a stranger and a shut chest.
  it('your own: everything, pockets and implant as carried; concealed stays concealed', () => {
    const v = PerceptionApi.visibleContentsOf(person, person);
    expect(ids(v.worn)).toEqual(['pack', 'shirt']);
    expect(ids(v.held)).toEqual(['sword']);
    expect(ids(v.carried)).toEqual(['coin', 'implant']);
  });

});

describe('PerceptionApi.isAnotherPerson (client-surface W0)', () => {
  it('a person other than the viewer is; yourself and a chest are not', () => {
    expect(PerceptionApi.isAnotherPerson(stranger, person)).toBe(true);
    expect(PerceptionApi.isAnotherPerson(person, person)).toBe(false);
    expect(PerceptionApi.isAnotherPerson(stranger, chest)).toBe(false);
  });
});
