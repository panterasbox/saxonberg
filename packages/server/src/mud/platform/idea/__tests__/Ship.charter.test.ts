import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Ship from '../Ship';
import BerthExit from '../BerthExit';
import AshoreExit from '../AshoreExit';
import Quay from '../../location/Quay';
import { BerthKeeperMixin } from '../../../lib/expanse/BerthKeeper';
import { LineFrameMixin, type BarWater } from '../../../lib/expanse/LineFrame';
import { Idea } from '../../../lib/stuff/Idea';
import { WorldClockApi } from '../../../api/worldclock';
import { Quantity } from '../../../lib/quantity';
import Shore from '../../location/Shore';
import Bollard from '../../thing/Bollard';
import Good from '../../thing/Good';
import { MooringLineMixin, type Moorer } from '../../../lib/spatial/MooringLine';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { PersistableApi } from '../../../api/persistable';
import { NavigationApi } from '../../../api/navigation';
import { ZoneApi } from '../../../api/zone';
import { MixinApi } from '../../../api/mixin';
import { MessageApi } from '../../../api/message';
import CharterBook from '../../thing/CharterBook';
import { makeStuffAtPath } from '../../../lib/security/__tests__/test-setup';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Container } from '../../../lib/spatial/Container';

/**
 * ⭐ The charter and the master's helm (harbors P12, P23): only her master
 * — whoever holds her company's `master` seat — or her charterer takes her
 * helm; a charter is refused while her own master is aboard on shift or
 * somebody else has her; it ends as she makes fast at a KEPT quay, its
 * world's days (a day begun is a day owed) billed to her, owed by the
 * charterer, who still answers for her until it is paid. A course for a
 * node is laid from beyond hail of its harbor: the keeper is asked at the
 * arrival, and a refusal leaves her lying off.
 */

const QUAY = '/test/harbor/quay';
const DECK = '/test/hesper/deck';
const SHIP = '/test/hesper/structure';
const RIVER = '/test/river';

/** The end of a test line, ashore: leaving its bollard's room lifts it off. */
class TestEnd extends Good {
  public line: TestLine | null = null;
  public bollardRoom: Stuff | null = null;
  public onMoved(_from: (Stuff & Container) | null, to: (Stuff & Container) | null): void {
    if (this.line === null || to === null || to === this.bollardRoom) return;
    const line = this.line;
    this.line = null;
    void line.endLifted();
  }
}

/** A real line by the kernel protocol: its end is a TestEnd beside the bollard. */
class TestLine extends MooringLineMixin(Good) {
  public length = 30;
  public override lineLengthM(): number {
    return this.length;
  }
  protected override async mintMooringEnd(bollard: Stuff, _ship: Moorer): Promise<Stuff | null> {
    const shore = MixinApi.isContainable(bollard) ? bollard.getContainer() : null;
    if (shore === null) return null;
    const end = makeStuffAtPath(() => new TestEnd(), '/test/line-end');
    ContainmentApi.move(end, shore);
    end.bollardRoom = shore;
    end.line = this;
    return end;
  }
}

/** A quay with a book: records what it is asked and told; refuses as the test sets. */
class KeptQuay extends BerthKeeperMixin(Quay) {
  public calls: string[] = [];
  public refuseAdmit: string | null = null;
  public refuseClearance: string | null = null;
  public override async admit(_ship: Stuff, _nowS: number): Promise<string | null> {
    this.calls.push('admit');
    return this.refuseAdmit;
  }
  public override async madeFast(_ship: Stuff, _nowS: number): Promise<void> {
    this.calls.push('madeFast');
  }
  public override async clearance(_ship: Stuff, _nowS: number): Promise<string | null> {
    this.calls.push('clearance');
    return this.refuseClearance;
  }
  public override async release(_ship: Stuff, _nowS: number): Promise<void> {
    this.calls.push('release');
  }
}

/** A river whose bar reads a settable tide. */
class BarRiver extends LineFrameMixin(Idea) {
  public channelM = 3.9;
  public levelM = 0;
  public nextHighS: number | null = 3 * 3600;
  public override async barWater(_nowS: number): Promise<BarWater | null> {
    return {
      depthM: this.channelM + this.levelM,
      tide: this.nextHighS === null ? null : { atS: 0, rangeM: 3, rising: true, nextHighS: this.nextHighS, nextLowS: 0, streamMps: 0 },
    };
  }
}

let quay: KeptQuay;
let deck: Shore;
let ship: Ship;
let told: string[];
const rooms = new Map<string, Stuff>();

function bollardOn(room: Stuff & Container): Bollard {
  const b = makeStuffAtPath(() => new Bollard(), '/platform/thing/bollard');
  ContainmentApi.move(b, room);
  return b;
}

function lineOn(room: Stuff & Container, length = 30): TestLine {
  const l = makeStuffAtPath(() => new TestLine(), '/stuff/thing/mooring-line');
  l.length = length;
  ContainmentApi.move(l, room);
  return l;
}


function newShip(): Ship {
  const s = makeStuffAtPath(() => new Ship(), SHIP);
  s.setName('the Hesper');
  s.setEntrance(DECK);
  return s;
}

beforeEach(() => {
  StuffApi.clearAll();
  rooms.clear();
  told = [];
  quay = makeStuffAtPath(() => new KeptQuay(), QUAY);
  deck = makeStuffAtPath(() => new Shore(), DECK);
  rooms.set(QUAY, quay as unknown as Stuff);
  rooms.set(DECK, deck as unknown as Stuff);
  ship = newShip();
  rooms.set(SHIP, ship as unknown as Stuff);
  vi.spyOn(StuffApi, 'singleton').mockImplementation((async (p: string) => {
    const s = rooms.get(p);
    if (!s) throw new Error(`no fixture ${p}`);
    return s;
  }) as never);
  vi.spyOn(StuffApi, 'clone').mockImplementation((async (row: string) => {
    if (row === '/platform/idea/exits/berth') return makeStuffAtPath(() => new BerthExit(), row);
    if (row === '/platform/idea/exits/ashore') return makeStuffAtPath(() => new AshoreExit(), row);
    throw new Error(`no row ${row}`);
  }) as never);
  // The ship's rooms and the quay are in zones of their own (a way named
  // for her crosses between them).
  vi.spyOn(ZoneApi, 'resolveZoneForPath').mockImplementation((async (p: string) => ({ zone: p.split('/')[2] })) as never);
  vi.spyOn(PersistableApi, 'capture').mockResolvedValue(undefined as never);
  vi.spyOn(NavigationApi, 'attachedTo').mockResolvedValue([]);
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


const HOUSE = '/test/hesper/idea/outfit';
const DESK = '/test/harbor/line-desk';
const DAY = 86_400;

/** A person, by an identity of their own; `seat` makes them hold a position on the house. */
function person(path: string, seat: { positionKey: string; onShift: boolean } | null = null): Stuff {
  const p = makeStuffAtPath(() => new Good(), path) as unknown as Stuff & Record<string, unknown>;
  if (seat !== null) {
    p.getEmployment = (house: string) => (house === HOUSE ? { positionKey: seat.positionKey, status: seat.onShift ? 'on-shift' : 'off-shift' } : null);
    p.isOnShiftFor = (house: string) => house === HOUSE && seat.onShift;
  }
  return p;
}

let nowS = 10 * DAY;

describe('⭐ only her master takes the helm (P12)', () => {
  beforeEach(() => {
    ship.setHouse(HOUSE);
    const isEmployed = MixinApi.isEmployed.bind(MixinApi);
    vi.spyOn(MixinApi, 'isEmployed').mockImplementation(((x: Stuff & Record<string, unknown>) => typeof x.getEmployment === 'function' || isEmployed(x)) as never);
    vi.spyOn(WorldClockApi, 'getNow').mockImplementation(() => Quantity.of(nowS, 's') as never);
    nowS = 10 * DAY;
  });

  it('a stranger may not; the seat-holder may; a boat answers anyone (the hook’s default)', () => {
    expect(ship.mayBeSteeredBy(person('/test/stranger'))).toBe(false);
    expect(ship.mayBeSteeredBy(person('/test/master', { positionKey: 'master', onShift: false }))).toBe(true);
    expect(ship.mayBeSteeredBy(person('/test/lookout', { positionKey: 'lookout', onShift: true }))).toBe(false);
  });

  it('⭐ chartered, the charterer takes her helm and answers for her; nobody else does', async () => {
    const me = person('/test/charterer');
    expect(await ship.charterTo(me, 2, DESK)).toBeNull();
    expect(ship.mayBeSteeredBy(me)).toBe(true);
    expect(ship.answersFor(me)).toBe(true);
    expect(ship.mayBeSteeredBy(person('/test/other'))).toBe(false);
    expect(ship.getCharter()).toMatchObject({ charterer: '/test/charterer', ratePerDay: 2, payTo: DESK, sinceS: 10 * DAY });
  });
});

describe('⭐ a charter is refused while she is somebody else’s (P23)', () => {
  beforeEach(() => {
    ship.setHouse(HOUSE);
    const isEmployed = MixinApi.isEmployed.bind(MixinApi);
    vi.spyOn(MixinApi, 'isEmployed').mockImplementation(((x: Stuff & Record<string, unknown>) => typeof x.getEmployment === 'function' || isEmployed(x)) as never);
    vi.spyOn(WorldClockApi, 'getNow').mockImplementation(() => Quantity.of(nowS, 's') as never);
  });

  it('⭐ her own master aboard and on shift: refused; off shift or ashore, she may be chartered', async () => {
    const master = person('/test/master', { positionKey: 'master', onShift: true });
    vi.spyOn(ship, 'aboard').mockResolvedValue([master]);
    expect(await ship.charterTo(person('/test/charterer'), 2, DESK)).toMatch(/Her master is aboard/);
    expect(ship.getCharter()).toBeNull();
    vi.spyOn(ship, 'aboard').mockResolvedValue([person('/test/master2', { positionKey: 'master', onShift: false })]);
    expect(await ship.charterTo(person('/test/charterer'), 2, DESK)).toBeNull();
  });

  it('under charter: refused to anyone else, and the charterer is told she is theirs already', async () => {
    vi.spyOn(ship, 'aboard').mockResolvedValue([]);
    expect(await ship.charterTo(person('/test/a'), 2, DESK)).toBeNull();
    expect(await ship.charterTo(person('/test/b'), 2, DESK)).toMatch(/under charter to somebody else/);
    expect(await ship.charterTo(person('/test/a'), 2, DESK)).toMatch(/is yours already/);
  });

  it('a book that posts a rate and names nowhere to pay it is an authoring error, thrown', async () => {
    vi.spyOn(ship, 'aboard').mockResolvedValue([]);
    await expect(ship.charterTo(person('/test/a'), 2, null)).rejects.toThrow(/payTo/);
  });
});

describe('⭐ the charter ends as she berths at a kept quay, its days billed (P23)', () => {
  beforeEach(() => {
    ship.setHouse(HOUSE);
    vi.spyOn(ship, 'aboard').mockResolvedValue([]);
    vi.spyOn(WorldClockApi, 'getNow').mockImplementation(() => Quantity.of(nowS, 's') as never);
    nowS = 10 * DAY;
  });

  it('⭐ two days and a bit at 2 a day: three days owed to the line, by the charterer, who still answers for her', async () => {
    const me = person('/test/charterer');
    vi.spyOn(StuffApi, 'findByIdentityPath').mockReturnValue([]);
    expect(await ship.charterTo(me, 2, DESK)).toBeNull();
    bollardOn(quay);
    lineOn(deck);
    nowS = 12.3 * DAY;
    const words = await ship.comeAlongside(QUAY);
    expect(words).toMatch(/charter of the Hesper ends as she makes fast: 3 days at 2 — 6 owed to the line/);
    expect(ship.getCharter()).toBeNull();
    expect(ship.getOwed()).toEqual([{ to: DESK, amountMinor: 6, reason: "for 3 days' charter of the Hesper", by: '/test/charterer' }]);
    // The helm is no longer theirs — but clearing her still is, until paid.
    expect(ship.mayBeSteeredBy(me)).toBe(false);
    expect(ship.answersFor(me)).toBe(true);
    expect(ship.settleOwed({ to: DESK, amountMinor: 6, reason: "for 3 days' charter of the Hesper" })).toBe(true);
    expect(ship.answersFor(me)).toBe(false);
  });

  it('a day begun is a day owed: made fast within the hour, one day', async () => {
    expect(await ship.charterTo(person('/test/charterer'), 2, DESK)).toBeNull();
    bollardOn(quay);
    lineOn(deck);
    nowS = 10 * DAY + 600;
    await ship.comeAlongside(QUAY);
    expect(ship.owedMinor()).toBe(2);
  });

  it('⭐ a plain landing is a stop, not a berth: the charter runs on', async () => {
    expect(await ship.charterTo(person('/test/charterer'), 2, DESK)).toBeNull();
    const landing = makeStuffAtPath(() => new Shore(), '/test/landing');
    rooms.set('/test/landing', landing as unknown as Stuff);
    bollardOn(landing);
    lineOn(deck);
    nowS = 11 * DAY;
    await ship.comeAlongside('/test/landing');
    expect(ship.isMoored()).toBe(true);
    expect(ship.getCharter()?.charterer).toBe('/test/charterer');
    expect(ship.getOwed()).toEqual([]);
  });
});

describe('⭐ a course for a node is laid from beyond hail; the keeper is asked at the arrival (A3)', () => {
  beforeEach(() => {
    vi.spyOn(WorldClockApi, 'getNow').mockReturnValue(Quantity.of(10 * DAY, 's') as never);
  });

  it('not given the berth, she lies off and is told why; given it, she makes fast', async () => {
    bollardOn(quay);
    lineOn(deck);
    quay.refuseAdmit = 'The harbor office has not given her a berth. Hail the office first — `hail office`.';
    const off = await ship.arriveAlongside(QUAY);
    expect(off).toBe(`She lies off. ${quay.refuseAdmit}`);
    expect(ship.isMoored()).toBe(false);
    quay.refuseAdmit = null;
    expect(await ship.arriveAlongside(QUAY)).toMatch(/made fast/);
    expect(ship.isMoored()).toBe(true);
  });

  it('⭐ a course across the chart for a node with a kept quay asks no admission before it is laid', async () => {
    lineOn(deck);
    quay.refuseAdmit = 'Hail first.';
    expect(await ship.courseRefusal(QUAY, { admit: false })).toBeNull();
    expect(quay.calls).toEqual([]);
    expect(await ship.courseRefusal(QUAY)).toBe('Hail first.');
  });
});

describe('the charter book (P23)', () => {
  it('⭐ aboard, it lets the ship it is in; at a desk, the listed one the word names', async () => {
    const hold = makeStuffAtPath(() => new Shore(), '/test/hesper/hold');
    const book = makeStuffAtPath(() => new CharterBook(), '/test/hesper/thing/charter-book');
    ContainmentApi.move(book, hold);
    vi.spyOn(NavigationApi, 'structureAt').mockImplementation((async (p: string) => (p.startsWith('/test/hesper/') ? ship : null)) as never);
    expect(await book.shipFor(null)).toBe(ship);
    expect(await book.shipFor('hesper')).toBe(ship);
    expect(await book.shipFor('kittiwake')).toMatch(/lets the Hesper, and no other/);

    const desk = makeStuffAtPath(() => new CharterBook(), '/test/harbor/thing/charter-book');
    desk.setShips([SHIP]);
    desk.setRatePerDay(2);
    desk.setRates({ [SHIP]: 3 });
    expect(await desk.shipFor('the hesper')).toBe(ship);
    expect(desk.rateFor(ship)).toBe(3);
    expect(await desk.shipFor('corrigan')).toMatch(/does not let a ship called 'corrigan'/);
  });
});
