/**
 * ⭐ The harbor's book and its posted criteria (harbors P7, P8, P10, P11):
 * a hail is answered by the criteria IN ORDER — the office open, the water
 * over the bar at the tide against her draft, a quay with room by her
 * length, dues owed — and the first that fails sends her to the roads,
 * citing itself. The office is open while anybody holding the
 * harbormaster's seat is on shift; a quay without room refuses her at the
 * mooring act; and nothing but the clock and the book changes an answer.
 *
 * Synthetic fixtures (`/test/**`): a fake river whose bar reads a settable
 * tide, two quays, a house with the seat rostered six till eight.
 */
import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { PersistableApi } from '@saxonberg/server/mud/api/persistable';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Idea } from '@saxonberg/server/mud/lib/stuff/Idea';
import { LineFrameMixin, type BarWater } from '@saxonberg/server/mud/lib/expanse/LineFrame';
import Ship from '@saxonberg/server/mud/platform/idea/Ship';
import Business from '@saxonberg/server/mud/platform/idea/Business';
import { makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import Harbor from '../idea/Harbor';
import HarborQuay from '../location/HarborQuay';

const HARBOR = '/test/port/idea/harbor';
const TOWN = '/test/port/town-quay';
const FISH = '/test/port/fish-quay';
const WORKS = '/test/port/idea/works';
const RIVER = '/test/river';
const KEEPER = '/test/port/agent/harbormaster';

const DAY = 86_400;
const HOUR = 3_600;
/** Day 10 of the world at `h` o'clock. */
const at = (h: number): number => 10 * DAY + h * HOUR;

/** A river whose bar reads whatever tide the test sets. */
class TestRiver extends LineFrameMixin(Idea) {
  public channelM = 3.9;
  public levelM = 0;
  public nextHighS = at(15);
  public override async barWater(_nowS: number): Promise<BarWater | null> {
    return {
      depthM: this.channelM + this.levelM,
      tide: { atS: 0, rangeM: 3, rising: true, nextHighS: this.nextHighS, nextLowS: this.nextHighS + 6 * HOUR, streamMps: 0 },
    };
  }
}

let fixtures: Map<string, Stuff>;
let harbor: Harbor;
let river: TestRiver;
let town: HarborQuay;
let works: Business;
let told: string[];

function ship(path: string, name: string, lengthM: number, draftM: number): Ship {
  const s = makeStuffAtPath(() => new Ship(), path);
  s.setName(name);
  s.setHull({ draftM, beamM: lengthM / 5, lengthM });
  fixtures.set(path, s as unknown as Stuff);
  return s;
}

function quay(path: string): HarborQuay {
  const q = makeStuffAtPath(() => new HarborQuay(), path);
  q.setHarbor(HARBOR);
  q.setFrameSite({ frame: RIVER, cite: 'estuary-0.5,left' });
  fixtures.set(path, q as unknown as Stuff);
  return q;
}

beforeEach(() => {
  StuffApi.clearAll();
  fixtures = new Map();
  told = [];
  river = makeStuffAtPath(() => new TestRiver(), RIVER);
  fixtures.set(RIVER, river as unknown as Stuff);
  town = quay(TOWN);
  quay(FISH);
  works = makeStuffAtPath(() => new Business(), WORKS);
  works.positions = [{ key: 'harbormaster', label: 'keeping the book', noun: 'harbormaster', headcount: 1 } as never];
  works.rosterSlots = [
    { positionKey: 'harbormaster', assignee: KEEPER, schedule: [{ days: [0, 1, 2, 3, 4, 5, 6], hours: [6, 20] }] },
  ];
  fixtures.set(WORKS, works as unknown as Stuff);
  harbor = makeStuffAtPath(() => new Harbor(), HARBOR);
  harbor.setQuays([
    { place: TOWN, lengthM: 70, berthDepthM: 1.5 },
    { place: FISH, lengthM: 25, berthDepthM: 1.2 },
  ]);
  harbor.setSeat({ business: WORKS, positionKey: 'harbormaster' });
  harbor.setRates({ duesPerMeterPerDay: 0.25 });
  harbor.setExempt(['/test/ships/ferry']);
  fixtures.set(HARBOR, harbor as unknown as Stuff);
  vi.spyOn(StuffApi, 'singleton').mockImplementation((async (p: string) => {
    const s = fixtures.get(p);
    if (!s) throw new Error(`no fixture ${p}`);
    return s;
  }) as never);
  vi.spyOn(PersistableApi, 'capture').mockResolvedValue(undefined as never);
  vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
    const b: Record<string, unknown> = {};
    b.topic = () => b;
    b.toSelf = (m: { toString(): string }) => {
      told.push(m.toString());
      return b;
    };
    b.send = () => {};
    return b as never;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('the office keeps the harbormaster’s hours (P11)', () => {
  it('⭐ open while the rostered holder is on shift, closed out of it', async () => {
    expect(await harbor.isOpen(at(6))).toBe(true);
    expect(await harbor.isOpen(at(12))).toBe(true);
    expect(await harbor.isOpen(at(19.5))).toBe(true);
    expect(await harbor.isOpen(at(20))).toBe(false);
    expect(await harbor.isOpen(at(23))).toBe(false);
    expect(await harbor.isOpen(at(5))).toBe(false);
  });

  it('⭐ a player holding the seat on shift opens it out of the roster’s hours', async () => {
    const player = makeStuffAtPath(() => new Ship(), '/test/player') as unknown as Stuff;
    const onShift = { value: true };
    (player as unknown as { isOnShiftFor: (p: string) => boolean }).isOnShiftFor = (p: string) => p === WORKS && onShift.value;
    vi.spyOn(works, 'holdersOf').mockReturnValue([KEEPER, '/test/player']);
    vi.spyOn(StuffApi, 'findByIdentityPath').mockImplementation(((id: string) => (id === '/test/player' ? [player] : [])) as never);
    const isEmployed = MixinApi.isEmployed.bind(MixinApi);
    vi.spyOn(MixinApi, 'isEmployed').mockImplementation(((x: Stuff) => x === player || isEmployed(x)) as never);
    expect(await harbor.isOpen(at(23))).toBe(true);
    onShift.value = false;
    expect(await harbor.isOpen(at(23))).toBe(false);
  });
});

describe('a hail is answered by the posted criteria, in order (P7)', () => {
  it('⭐ the office closed comes first — before the bar and before room', async () => {
    const coaster = ship('/test/ships/coaster', 'the Coaster', 90, 3.6);
    river.levelM = -1.5; // low water, and too long for any quay
    const a = await harbor.answerHail(coaster as unknown as Stuff, at(23));
    expect(a).toMatchObject({ kind: 'roads', criterion: 'closed' });
    expect(a.words).toMatch(/office is closed/);
    expect(a.words).toMatch(/opens in about 7 hours/);
  });

  it('⭐ open, the water over the bar against her draft comes next — and only the clock changes it', async () => {
    const coaster = ship('/test/ships/coaster', 'the Coaster', 90, 3.6);
    river.levelM = -1.5; // 2.4 m over the bar; she wants 4.1
    const low = await harbor.answerHail(coaster as unknown as Stuff, at(9));
    expect(low).toMatchObject({ kind: 'roads', criterion: 'bar' });
    expect(low.words).toMatch(/2\.4 m over the bar and she wants 4\.1/);
    expect(low.words).toMatch(/high water in about 6 hours/);
    river.levelM = 1.5; // the flood — and now she is too long for any quay
    const high = await harbor.answerHail(coaster as unknown as Stuff, at(15));
    expect(high).toMatchObject({ kind: 'roads', criterion: 'no-room' });
  });

  it('⭐ a quay with room by her length, in the order posted; the book holds the room it gave', async () => {
    const hesper = ship('/test/ships/hesper', 'the Hesper', 30, 1.2);
    const ketch = ship('/test/ships/ketch', 'the Ketch', 20, 1.8);
    const coaster = ship('/test/ships/coaster', 'the Coaster', 35, 3.6);
    river.levelM = 1.5;
    expect(await harbor.answerHail(hesper as unknown as Stuff, at(12))).toMatchObject({ kind: 'quay', quay: TOWN });
    expect(await harbor.answerHail(ketch as unknown as Stuff, at(12))).toMatchObject({ kind: 'quay', quay: TOWN });
    // 70 − 30 − 20 = 20 left on the Town Quay; 25 on the Fish Quay: 35 fits neither.
    const third = await harbor.answerHail(coaster as unknown as Stuff, at(12));
    expect(third).toMatchObject({ kind: 'roads', criterion: 'no-room' });
    expect(third.words).toMatch(/no berth long enough for her — she is 35 m/);
    // Hailing again gives her the berth she was given, not a second one.
    expect(await harbor.answerHail(hesper as unknown as Stuff, at(13))).toMatchObject({ kind: 'quay', quay: TOWN });
    expect(harbor.getBook(at(13)).filter((r) => r.ship === '/test/ships/hesper')).toHaveLength(1);
  });

  it('⭐ dues owed come last: a ship that left owing is sent to the roads until they are paid', async () => {
    const hesper = ship('/test/ships/hesper', 'the Hesper', 30, 1.2);
    river.levelM = 0;
    expect(await harbor.answerHail(hesper as unknown as Stuff, at(8))).toMatchObject({ kind: 'quay', quay: TOWN });
    harbor.madeFast(hesper as unknown as Stuff, TOWN, at(9));
    harbor.release(hesper as unknown as Stuff, at(9) + 2 * DAY + HOUR); // three days begun
    expect(harbor.duesOwedBy(hesper as unknown as Stuff, at(12) + 5 * DAY)).toBe(Math.ceil(3 * 30 * 0.25));
    const again = await harbor.answerHail(hesper as unknown as Stuff, at(12) + 5 * DAY);
    expect(again).toMatchObject({ kind: 'roads', criterion: 'dues' });
    expect(again.words).toMatch(/owes 23 in dues/);
    harbor.settleDues(hesper as unknown as Stuff, at(12) + 5 * DAY);
    expect(harbor.duesOwedBy(hesper as unknown as Stuff, at(12) + 5 * DAY)).toBe(0);
    expect(await harbor.answerHail(hesper as unknown as Stuff, at(12) + 5 * DAY)).toMatchObject({ kind: 'quay', quay: TOWN });
  });

  it('dues accrue a day begun at a time, by her length, asleep or awake — and the city’s own craft owe none', () => {
    const smack = ship('/test/ships/smack', 'the Smack', 9, 1.2);
    const ferry = ship('/test/ships/ferry', 'the Ferry', 38, 0.25);
    harbor.madeFast(smack as unknown as Stuff, FISH, at(10));
    harbor.madeFast(ferry as unknown as Stuff, TOWN, at(10));
    expect(harbor.duesOwedBy(smack as unknown as Stuff, at(10))).toBe(0);
    expect(harbor.duesOwedBy(smack as unknown as Stuff, at(10) + 60)).toBe(3); // 1 day × 9 m × 0.25 = 2.25 → 3
    expect(harbor.duesOwedBy(smack as unknown as Stuff, at(10) + 24 * DAY)).toBe(54);
    expect(harbor.duesOwedBy(ferry as unknown as Stuff, at(10) + 24 * DAY)).toBe(0);
  });
});

describe('the quay asks the book at the mooring act (P7)', () => {
  it('⭐ a ship that never hailed is told to; one given another quay is told which', async () => {
    const hesper = ship('/test/ships/hesper', 'the Hesper', 30, 1.2);
    expect(await town.admit(hesper as unknown as Stuff, at(12))).toMatch(/Hail the office first/);
    harbor.assign(hesper as unknown as Stuff, FISH, at(12));
    // 30 m does not fit the 25 m Fish Quay: the harbormaster's act refuses it.
    expect(harbor.getBook(at(12))).toHaveLength(0);
    expect(harbor.assign(hesper as unknown as Stuff, FISH, at(12))).toMatch(/not room for her/);
    expect(harbor.assign(hesper as unknown as Stuff, TOWN, at(12))).toBeNull();
    expect(await town.admit(hesper as unknown as Stuff, at(12))).toBeNull();
  });

  it('⭐ a quay without room by length refuses her', async () => {
    const a = ship('/test/ships/a', 'the Alpha', 40, 1.5);
    const b = ship('/test/ships/b', 'the Bravo', 35, 1.5);
    expect(harbor.assign(a as unknown as Stuff, TOWN, at(12))).toBeNull();
    harbor.madeFast(a as unknown as Stuff, TOWN, at(12));
    expect(harbor.roomAt(harbor.quaySpec(TOWN)!)).toBe(30);
    expect(harbor.assign(b as unknown as Stuff, TOWN, at(12))).toMatch(/not room for her/);
    expect(await town.admit(b as unknown as Stuff, at(12))).toMatch(/Hail the office first/);
  });

  it('an assignment she never takes up lapses, and the city’s craft need none', async () => {
    const hesper = ship('/test/ships/hesper', 'the Hesper', 30, 1.2);
    const ferry = ship('/test/ships/ferry', 'the Ferry', 38, 0.25);
    expect(harbor.assign(hesper as unknown as Stuff, TOWN, at(8))).toBeNull();
    expect(harbor.getBook(at(19))).toHaveLength(1);
    expect(harbor.getBook(at(21))).toHaveLength(0);
    expect(await town.admit(ferry as unknown as Stuff, at(21))).toBeNull();
  });

  it('casting off clean closes her line; the berth depth is the harbor’s posted fact', async () => {
    const hesper = ship('/test/ships/hesper', 'the Hesper', 30, 1.2);
    harbor.madeFast(hesper as unknown as Stuff, TOWN, at(9));
    harbor.settleDues(hesper as unknown as Stuff, at(9) + HOUR);
    harbor.release(hesper as unknown as Stuff, at(9) + 2 * HOUR);
    expect(harbor.getBook(at(10))).toHaveLength(0);
    expect(town.berthDepthM()).toBe(1.5);
  });
});

describe('a player keeping the office is told of a hail (P8)', () => {
  it('the answer goes to a player holder on shift', async () => {
    const hesper = ship('/test/ships/hesper', 'the Hesper', 30, 1.2);
    const player = makeStuffAtPath(() => new Ship(), '/test/player') as unknown as Stuff;
    (player as unknown as { isOnShiftFor: (p: string) => boolean }).isOnShiftFor = () => true;
    vi.spyOn(works, 'holdersOf').mockReturnValue([KEEPER, '/test/player']);
    vi.spyOn(StuffApi, 'findByIdentityPath').mockImplementation(((id: string) => (id === '/test/player' ? [player] : [])) as never);
    vi.spyOn(MixinApi, 'isEmployed').mockImplementation(((x: Stuff) => x === player) as never);
    vi.spyOn(MixinApi, 'isHasInteractive').mockImplementation(((x: Stuff) => x === player) as never);
    vi.spyOn(MixinApi, 'isSensor').mockImplementation(((x: Stuff) => x === player) as never);
    const answer = await harbor.answerHail(hesper as unknown as Stuff, at(12));
    await harbor.tellKeepers(hesper as unknown as Stuff, answer, at(12));
    expect(told.join('\n')).toMatch(/the Hesper hails the harbor office/);
  });
});

describe('dues, clearance and the bills paid at the office (A2, P13)', () => {
  /** Make `who` hold `positionKey` at `house` (on shift or not), as the Employed face says. */
  function employ(who: Stuff, house: string, positionKey: string, onShift = true): void {
    const w = who as unknown as Record<string, unknown>;
    w.getEmployment = (p: string) => (p === house ? { positionKey, status: onShift ? 'on-shift' : 'off-shift' } : undefined);
    w.isOnShiftFor = (p: string) => p === house && onShift;
    const isEmployed = MixinApi.isEmployed.bind(MixinApi);
    vi.spyOn(MixinApi, 'isEmployed').mockImplementation(((x: Stuff) => x === who || isEmployed(x)) as never);
  }

  it('⭐ dues stamp forward on the BOOK: a ship nobody has loaded since she made fast still owes every day begun', async () => {
    const smack = ship('/test/ships/smack', 'the Smack', 9, 1.2);
    harbor.madeFast(smack as unknown as Stuff, FISH, at(10));
    // She sleeps: nothing about her runs. The book alone says what she owes.
    fixtures.delete('/test/ships/smack');
    expect(harbor.duesOwedOn('/test/ships/smack', at(10) + 2 * DAY + HOUR)).toBe(Math.ceil(3 * 9 * 0.25));
    // Loaded again, her dues are what the book says.
    fixtures.set('/test/ships/smack', smack as unknown as Stuff);
    expect(harbor.duesOwedBy(smack as unknown as Stuff, at(10) + 2 * DAY + HOUR)).toBe(7);
  });

  it('⭐ clearance refuses her while she owes, citing the amount — and passes once paid', async () => {
    const hesper = ship('/test/ships/hesper', 'the Hesper', 30, 1.2);
    harbor.madeFast(hesper as unknown as Stuff, TOWN, at(9));
    expect(await harbor.clearance(hesper as unknown as Stuff, at(9))).toBeNull();
    const held = await town.clearance(hesper as unknown as Stuff, at(9) + 2 * HOUR);
    expect(held).toMatch(/owes 8 in harbor dues/);
    expect(held).toMatch(/pay office/);
    expect(held).toMatch(/Anyone aboard may still go ashore/);
    // A bill she carries holds her too.
    hesper.owe({ to: '/test/line/desk', amountMinor: 12, reason: "for the Hesper's charter" });
    harbor.settleDues(hesper as unknown as Stuff, at(9) + 2 * HOUR);
    expect(await harbor.clearance(hesper as unknown as Stuff, at(9) + 3 * HOUR)).toMatch(/owes 12 on her bills/);
    hesper.settleOwed({ to: '/test/line/desk', amountMinor: 12, reason: "for the Hesper's charter" });
    expect(await harbor.clearance(hesper as unknown as Stuff, at(9) + 3 * HOUR)).toBeNull();
  });

  it('⭐ the bills are her master’s: dues to the office first, then what she carries; paying stamps them off', async () => {
    harbor.setOffice('/test/port/office');
    const hesper = ship('/test/ships/hesper', 'the Hesper', 30, 1.2);
    hesper.setHouse('/test/ships/hesper/company');
    harbor.madeFast(hesper as unknown as Stuff, TOWN, at(9));
    hesper.owe({ to: '/test/line/desk', amountMinor: 12, reason: "for the Hesper's charter" });
    const master = makeStuffAtPath(() => new Ship(), '/test/master') as unknown as Stuff;
    const stranger = makeStuffAtPath(() => new Ship(), '/test/stranger') as unknown as Stuff;
    employ(master, '/test/ships/hesper/company', 'master');
    expect(await harbor.billsFor(stranger, at(9) + HOUR)).toEqual([]);
    const bills = await harbor.billsFor(master, at(9) + HOUR);
    expect(bills.map((b) => [b.to, b.amountMinor])).toEqual([
      ['/test/port/office', 8],
      ['/test/line/desk', 12],
    ]);
    expect(bills[0]!.reason).toMatch(/harbor dues for the Hesper/);
    await harbor.onPaid(bills[0]!, at(9) + HOUR);
    expect(harbor.duesOwedBy(hesper as unknown as Stuff, at(9) + HOUR)).toBe(0);
    await harbor.onPaid(bills[1]!, at(9) + HOUR);
    expect(hesper.getOwed()).toEqual([]);
    expect(await harbor.clearance(hesper as unknown as Stuff, at(9) + HOUR)).toBeNull();
  });
});

describe('the harbormaster’s call — the NPC’s and no other (A2, P8, P11)', () => {
  function keeper(onShift: boolean, positionKey = 'harbormaster'): Stuff {
    const who = makeStuffAtPath(() => new Ship(), '/test/keeper') as unknown as Stuff;
    const w = who as unknown as Record<string, unknown>;
    w.getEmployment = (p: string) => (p === WORKS ? { positionKey, status: onShift ? 'on-shift' : 'off-shift' } : undefined);
    w.isOnShiftFor = (p: string) => p === WORKS && onShift;
    const isEmployed = MixinApi.isEmployed.bind(MixinApi);
    vi.spyOn(MixinApi, 'isEmployed').mockImplementation(((x: Stuff) => x === who || isEmployed(x)) as never);
    return who;
  }

  it('⭐ only a holder of the seat ON SHIFT keeps the harbor', () => {
    expect(harbor.keptBy(keeper(true))).toBe(true);
    expect(harbor.keptBy(keeper(false))).toBe(false);
    expect(harbor.keptBy(keeper(true, 'harbor'))).toBe(false);
  });

  it('⭐ a quay the criteria refuse is refused, citing the criterion; one they allow is written', async () => {
    const by = keeper(true);
    const hesper = ship('/test/ships/hesper', 'the Hesper', 30, 1.2);
    const coaster = ship('/test/ships/coaster', 'the Coaster', 35, 3.6);
    vi.spyOn(hesper, 'aboard').mockResolvedValue([]);
    vi.spyOn(coaster, 'aboard').mockResolvedValue([]);
    river.levelM = -1.5;
    expect(await harbor.assignBy(coaster, TOWN, by, at(9))).toMatch(/^The bar: .*2\.4 m over the bar/);
    river.levelM = 1.5;
    expect(await harbor.assignBy(coaster, FISH, by, at(9))).toMatch(/no room for her at .*25 m is free and she is 35 m/);
    expect(await harbor.assignBy(hesper, TOWN, by, at(9))).toBeNull();
    expect(harbor.getBook(at(9)).map((r) => [r.name, r.quay])).toEqual([['the Hesper', TOWN]]);
    // 40 m left: the coaster fits the Town Quay now.
    expect(await harbor.assignBy(coaster, TOWN, by, at(9))).toBeNull();
    // Off shift, nothing.
    expect(await harbor.assignBy(hesper, FISH, keeper(false), at(9))).toMatch(/do not keep this harbor/);
  });

  it('⭐ dues owed refuse a berth; a ship made fast is never moved or sent away', async () => {
    const by = keeper(true);
    const hesper = ship('/test/ships/hesper', 'the Hesper', 30, 1.2);
    vi.spyOn(hesper, 'aboard').mockResolvedValue([]);
    harbor.madeFast(hesper as unknown as Stuff, TOWN, at(9));
    expect(await harbor.assignBy(hesper, FISH, by, at(10))).toMatch(/lies alongside .* already/);
    expect(await harbor.sendToRoads(hesper, by, at(10))).toMatch(/is not sent to the roads/);
    harbor.release(hesper as unknown as Stuff, at(10)); // left owing a day
    expect(await harbor.assignBy(hesper, TOWN, by, at(11))).toMatch(/owes 8 in dues/);
  });

  it('⭐ the roads: a ship sent there is named by the book and can be called in again', async () => {
    const by = keeper(true);
    const ketch = ship('/test/ships/ketch', 'the Ketch', 20, 1.8);
    vi.spyOn(ketch, 'aboard').mockResolvedValue([]);
    river.levelM = 1.5;
    expect(await harbor.answerHail(ketch as unknown as Stuff, at(9))).toMatchObject({ kind: 'quay', quay: TOWN });
    expect(await harbor.sendToRoads(ketch, by, at(9))).toBeNull();
    expect(harbor.getBook(at(9))).toEqual([]);
    expect(harbor.roadsHails(at(9)).map((h) => h.name)).toEqual(['the Ketch']);
    expect(await harbor.shipNamed('ketch', at(10))).toBe(ketch);
    expect(await harbor.shipNamed('the ketch', at(10))).toBe(ketch);
    expect(await harbor.quayNamed('fish-quay')).toBe(FISH);
    expect(await harbor.isRoadsWord('the roads')).toBe(true);
    expect(await harbor.assignBy(ketch, FISH, by, at(10))).toBeNull();
    expect(harbor.roadsHails(at(10))).toEqual([]);
    expect(await town.admit(ketch as unknown as Stuff, at(10))).toMatch(/gave her .*not this quay/);
  });
});
