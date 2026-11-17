/**
 * ⭐⭐ The wake matrix (crowded-rooms W2, D1/D2): a dependency is the Stuff
 * that was read, with the fields that were read.
 *
 * For every field a card can show (`REF_FIELDS` ∪ `DETAIL_FIELDS`) a
 * scripted mutation on a thing:
 *   (a) wakes a subject-bound subscription on the thing;
 *   (b) wakes one on its PLACE exactly when the place's projection shows
 *       that field of it (its `contents` rows are `REF_FIELDS`);
 *   (c) wakes nothing bound to another thing in the same place;
 *   (d) wakes nothing in another place.
 * A field with no mutation here is listed by name as a residual, so a new
 * field without a row fails. Plus: a desk ↔ floor move wakes the room's
 * card and the desk's both ways; a newcomer wakes a `here:i` subscription
 * that declared no flag; a viewer who learns a name re-projects THEIR row
 * and nobody else's.
 *
 * A wake is counted as a re-resolve (`collectProjections` — one per
 * resolve-and-project).
 */
import '../../../test-bootstrap';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MqlSubscriptionApi, REF_FIELDS, DETAIL_FIELDS } from '../mql-subscription';
import { EventApi } from '../event';
import { StuffApi } from '../stuff';
import { ShadowApi } from '../shadow';
import { ContainmentApi } from '../containment';
import { Stuff } from '../../lib/stuff/Stuff';
import EventRegistry from '../../platform/idea/EventRegistry';
import Interactive from '../../platform/idea/Interactive';
import Avatar from '../../platform/agent/PrimaryAvatar';
import Good from '../../lib/stuff/Good';
import Place from '../../lib/stuff/Place';
import { ContainerMixin } from '../../lib/spatial/Container';
import { PlacingMixin } from '../../lib/spatial/Placing';
import { Placements } from '../../lib/spatial/Placement';
import { NamedMixin } from '../../lib/description/Named';

class Thing extends NamedMixin(Good) {
  static _mixinName = 'WakeMatrixThing';
}
class Box extends ContainerMixin(NamedMixin(Good)) {
  static _mixinName = 'WakeMatrixBox';
}
class Desk extends PlacingMixin(NamedMixin(Good)) {
  static _mixinName = 'WakeMatrixDesk';
}

async function bootRegistry(): Promise<void> {
  const reg = await StuffApi.create(() => {
    const r = new EventRegistry();
    Stuff._stampTemplatePath(r, '/platform/idea/EventRegistry');
    return r;
  });
  StuffApi.unregister(reg);
  StuffApi.register(reg);
  EventApi._setRegistryForTesting(reg);
}

async function good<T extends Good & { setName(n: string): void }>(make: () => T, name: string, into: Stuff): Promise<T> {
  const g = await StuffApi.create(make);
  g.setName(name);
  g.setShortDescription(`a ${name}`);
  g.setKeywords([name]);
  ContainmentApi.move(g, into as never);
  return g;
}

async function viewerIn(place: Place, name: string, sock: string): Promise<{ avatar: Avatar; interactive: Interactive }> {
  const avatar = await StuffApi.create(() => new Avatar());
  avatar.setName(name);
  ContainmentApi.move(avatar, place);
  const interactive = await StuffApi.create(
    () => new Interactive(sock, `sess-${sock}`, { _id: `u-${sock}` } as never),
  );
  interactive.transferTo(avatar);
  vi.spyOn(avatar, 'onEnvelope').mockImplementation(() => undefined);
  return { avatar, interactive };
}

/** Subscribe, then count re-resolves across `mutate` (and its drain). */
async function wakes(
  interactive: Interactive,
  req: { subjectId?: string; query?: string; cardinality?: 'one' | 'many'; fields: readonly string[] },
  mutate: () => void | Promise<void>,
): Promise<number> {
  const id = `s${Math.random().toString(36).slice(2)}`;
  MqlSubscriptionApi.handleSubscribe({
    interactive,
    subscriptionId: id,
    query: req.query ?? '',
    cardinality: req.cardinality ?? 'one',
    fields: [...req.fields],
    ...(req.subjectId !== undefined ? { subjectId: req.subjectId } : {}),
    silent: true,
  });
  await MqlSubscriptionApi._drainScheduledForTesting();
  const spy = vi.spyOn(MqlSubscriptionApi, 'collectProjections');
  await mutate();
  await MqlSubscriptionApi._drainScheduledForTesting();
  const n = spy.mock.calls.length;
  spy.mockRestore();
  interactive.cancelMqlSubscription(id);
  return n;
}

/** The scripted mutation for each field the matrix drives. */
const MUTATIONS: Record<string, (t: Box, w: { place: Place; desk: Desk }) => void | Promise<void>> = {
  displayName: (t) => t.setName('renamed'),
  primaryKeyword: (t) => {
    t.setKeywords(['box', 'crate']);
    t.setPrimaryKeyword('crate');
  },
  shortDescription: (t) => t.setShortDescription('a battered box'),
  longDescription: (t) => t.setLongDescription('It has seen better days.'),
  illustration: (t) => t.setIllustration('/media/box.png'),
  illustrationShape: (t) => t.setIllustrationShape('square'),
  placement: (t, w) => ContainmentApi.move(t, w.desk, Placements.ON),
  contents: async (t) => {
    const pebble = await StuffApi.create(() => new Thing());
    pebble.setName('pebble');
    ContainmentApi.move(pebble, t);
  },
};

/** Fields with no mutation scripted here, and why (a new field must be added to one list). */
const RESIDUAL: Record<string, string> = {
  quantity: 'Stackable; its fire (`setQuantity` → quantity) is covered by the stack suites',
  holds: 'static — never changes on a thing',
  details: 'Detailed; authored, no runtime mutation site fires it',
  bulkMaterial: 'Bulkable; its fires are bulkAmount/bulkMaterial on the vessel',
  mass: 'Tangible; no fire site (census: no mutation site)',
  worn: 'Attired; fires `occupants` on the wearer — a creature fixture',
  exits: 'Exitable; no fire site (census: no mutation site)',
  placed: 'the host’s own field — covered by the desk case below',
};

/** The fields a REF row of the thing depends on — what a place card shows of it. */
const REF_SHOWN = new Set(['displayName', 'primaryKeyword', 'shortDescription', 'placement']);

describe('⭐⭐ the wake matrix (crowded-rooms D1/D2)', () => {
  beforeEach(async () => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
    MqlSubscriptionApi._clearAllForTesting();
    await bootRegistry();
  });

  it('every field a card shows has a scripted mutation or a named residual', () => {
    const all = new Set([...REF_FIELDS, ...DETAIL_FIELDS]);
    for (const f of all) {
      expect(f in MUTATIONS || f in RESIDUAL, `field '${f}' has no wake-matrix row`).toBe(true);
    }
  });

  for (const field of Object.keys(MUTATIONS)) {
    it(`${field}: wakes the thing’s card and (when shown) its place’s; nothing unrelated`, async () => {
      const place = await StuffApi.create(() => new Place());
      const elsewhere = await StuffApi.create(() => new Place());
      const { interactive } = await viewerIn(place, 'Alice', `a-${field}`);
      const desk = await good(() => new Desk(), 'desk', place);
      const mk = async (name: string, into: Stuff): Promise<Box> => good(() => new Box(), name, into);
      const w = { place, desk };

      const t1 = await mk('box', place);
      expect(
        await wakes(interactive, { subjectId: t1.stuffId, fields: DETAIL_FIELDS }, () => MUTATIONS[field]!(t1, w)),
        '(a) the thing’s own card',
      ).toBeGreaterThan(0);

      const t2 = await mk('box', place);
      const placeWakes = await wakes(
        interactive,
        { subjectId: place.stuffId, fields: DETAIL_FIELDS },
        () => MUTATIONS[field]!(t2, w),
      );
      if (REF_SHOWN.has(field)) expect(placeWakes, '(b) the place card shows it').toBeGreaterThan(0);
      else expect(placeWakes, '(b) the place card does not show it').toBe(0);

      const t3 = await mk('box', place);
      const other = await mk('barrel', place);
      expect(
        await wakes(interactive, { subjectId: other.stuffId, fields: DETAIL_FIELDS }, () => MUTATIONS[field]!(t3, w)),
        '(c) another thing in the same place',
      ).toBe(0);

      const t4 = await mk('box', place);
      const far = await mk('crate', elsewhere);
      expect(
        await wakes(interactive, { subjectId: far.stuffId, fields: DETAIL_FIELDS }, () => MUTATIONS[field]!(t4, w)),
        '(d) a thing in another place',
      ).toBe(0);
    });
  }

  it('a cup moved from the desk to the floor and back wakes the room’s card and the desk’s, both ways', async () => {
    const place = await StuffApi.create(() => new Place());
    const { interactive } = await viewerIn(place, 'Alice', 'desk');
    const desk = await good(() => new Desk(), 'desk', place);
    const cup = await good(() => new Thing(), 'cup', place);
    ContainmentApi.move(cup, desk, Placements.ON);
    const room = { subjectId: place.stuffId, fields: DETAIL_FIELDS };
    const onDesk = { subjectId: desk.stuffId, fields: DETAIL_FIELDS };
    expect(await wakes(interactive, room, () => ContainmentApi.move(cup, place)), 'room: desk → floor').toBeGreaterThan(0);
    expect(await wakes(interactive, onDesk, () => ContainmentApi.move(cup, desk, Placements.ON)), 'desk: floor → desk').toBeGreaterThan(0);
    expect(await wakes(interactive, onDesk, () => ContainmentApi.move(cup, place)), 'desk: desk → floor').toBeGreaterThan(0);
    expect(await wakes(interactive, room, () => ContainmentApi.move(cup, desk, Placements.ON)), 'room: floor → desk').toBeGreaterThan(0);
  });

  it('a newcomer wakes a `here:i` subscription that declared no flag; one in another place does not', async () => {
    const place = await StuffApi.create(() => new Place());
    const elsewhere = await StuffApi.create(() => new Place());
    const { interactive } = await viewerIn(place, 'Alice', 'here');
    const q = { query: 'here:i', cardinality: 'many' as const, fields: REF_FIELDS };
    expect(await wakes(interactive, q, () => good(() => new Thing(), 'stranger', place).then(() => undefined))).toBeGreaterThan(0);
    expect(await wakes(interactive, q, () => good(() => new Thing(), 'faraway', elsewhere).then(() => undefined))).toBe(0);
  });

  it('a viewer who learns who someone is re-projects THEIR row of them, and nobody else’s', async () => {
    const place = await StuffApi.create(() => new Place());
    const a = await viewerIn(place, 'Alice', 'belief-a');
    const b = await viewerIn(place, 'Bob', 'belief-b');
    const x = await viewerIn(place, 'Xan', 'belief-x');
    // A person is believed by their identity path (filed at register).
    StuffApi.unregister(x.avatar);
    Stuff._stampTemplatePath(x.avatar, '/platform/agent/Avatar/xan');
    StuffApi.register(x.avatar);
    const row = { subjectId: x.avatar.stuffId, fields: REF_FIELDS };
    const learn = (): void => a.avatar.learnIdentityOf(x.avatar, 'Xan');
    expect(await wakes(a.interactive, row, learn), 'the learner’s row').toBeGreaterThan(0);
    expect(await wakes(b.interactive, row, learn), 'another viewer’s row').toBe(0);
  });

  it('⭐ one body walking into a room of thirty wakes the thirty room cards and none of thirty bound to a barrel there', async () => {
    const place = await StuffApi.create(() => new Place());
    const barrel = await good(() => new Thing(), 'barrel', place);
    const viewers: Interactive[] = [];
    for (let i = 0; i < 30; i++) viewers.push((await viewerIn(place, `P${i}`, `crowd-${i}`)).interactive);
    for (const [i, interactive] of viewers.entries()) {
      for (const [id, subjectId] of [[`room-${i}`, place.stuffId], [`barrel-${i}`, barrel.stuffId]] as const) {
        MqlSubscriptionApi.handleSubscribe({
          interactive, subscriptionId: id, query: '', cardinality: 'one',
          fields: [...DETAIL_FIELDS], subjectId, silent: true,
        });
      }
    }
    await MqlSubscriptionApi._drainScheduledForTesting();
    const spy = vi.spyOn(MqlSubscriptionApi, 'collectProjections');
    await good(() => new Thing(), 'newcomer', place);
    // The drain is time-sliced (it gives the loop back every 20 ms), so
    // wait for it to settle, then make sure nothing more arrives.
    await expect.poll(() => spy.mock.calls.length, { timeout: 10_000, interval: 50 }).toBe(30);
    await new Promise((r) => setTimeout(r, 300));
    expect(spy.mock.calls.length, 'exactly the thirty room cards').toBe(30);
    spy.mockRestore();
  });
});
