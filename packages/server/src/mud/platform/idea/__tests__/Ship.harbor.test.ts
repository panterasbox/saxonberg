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
import { makeStuffAtPath } from '../../../lib/security/__tests__/test-setup';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Container } from '../../../lib/spatial/Container';

/**
 * ⭐ A ship and the harbor, by the kernel's protocols only (harbors P7, P10):
 * a kept berth (`BerthKeeper`) is asked to admit her before her course for
 * it is laid and to clear her before she leaves it, is told when she makes
 * fast and when she casts off; and the bar's window is her draft against
 * the water over it at the tide — low water refuses the deep ship, the
 * flood admits her, the shallow one crosses at any tide.
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

describe('a kept berth is asked, by the protocol, at every act (harbors P7)', () => {
  beforeEach(() => {
    vi.spyOn(WorldClockApi, 'getNow').mockReturnValue(Quantity.of(10 * 86_400, 's') as never);
  });

  it('⭐ a course for a kept berth asks it to admit her BEFORE the course is laid — a refusal is instant', async () => {
    lineOn(deck);
    ship.setLine(RIVER);
    ship.setLinePosition({ course: 'test', km: 1, across: 10 });
    quay.refuseAdmit = 'The harbor office has not given her a berth. Hail the office first.';
    const steered = vi.spyOn(Object.getPrototypeOf(Ship.prototype), 'steer');
    const r = await ship.steer({ speedKn: 5, direction: 'upstream', toward: QUAY });
    expect(r).toEqual({ refused: quay.refuseAdmit });
    expect(steered).not.toHaveBeenCalled();
    expect(quay.calls).toEqual(['admit']);
  });

  it('⭐ making fast tells the book her time alongside starts; casting off tells it the berth is free', async () => {
    bollardOn(quay);
    lineOn(deck);
    await ship.comeAlongside(QUAY);
    expect(quay.calls).toEqual(['madeFast']);
    await ship.castOff();
    expect(quay.calls).toEqual(['madeFast', 'release']);
  });

  it('⭐ leaving a kept berth asks it to clear her first; a refusal keeps her made fast (and never the people)', async () => {
    bollardOn(quay);
    lineOn(deck);
    await ship.comeAlongside(QUAY);
    quay.refuseClearance = 'She owes 8 in dues.';
    ship.setLine(RIVER);
    ship.setLinePosition({ course: 'test', km: 1, across: 10 });
    const r = await ship.steer({ speedKn: 5, direction: 'downstream' });
    expect(r).toEqual({ refused: 'She owes 8 in dues.' });
    expect(ship.isMoored()).toBe(true);
    expect(quay.getExit('hesper')).toBeInstanceOf(BerthExit);
  });

  it('restored where she lay, the book is told she is there', async () => {
    bollardOn(quay);
    lineOn(deck);
    ship.setBerth(QUAY);
    ship.setMoored(true);
    await ship.onRestored();
    expect(quay.calls).toEqual(['madeFast']);
  });
});

describe('⭐ the tide’s window at the bar (harbors P10)', () => {
  it('her draft and the margin under her keel against the water over the bar — two drafts, low and high water', async () => {
    const river = makeStuffAtPath(() => new BarRiver(), '/test/bar-river');
    const coaster = newShip();
    coaster.setHull({ draftM: 3.6, beamM: 7, lengthM: 35 });
    const smack = makeStuffAtPath(() => new Ship(), '/test/smack/structure');
    smack.setHull({ draftM: 1.2, beamM: 3, lengthM: 9 });
    // Low water: 3.9 − 1.5 = 2.4 m over the bar.
    river.levelM = -1.5;
    const low = (await coaster.barClearance(river, 0))!;
    expect(low.depthM).toBeCloseTo(2.4, 9);
    expect(low.wantsM).toBeCloseTo(4.1, 9);
    expect(low.clearanceM).toBeCloseTo(-1.7, 9);
    expect((await smack.barClearance(river, 0))!.clearanceM).toBeCloseTo(0.7, 9);
    expect(await smack.barRefusal(river, 0)).toBeNull();
    expect(await coaster.barRefusal(river, 0)).toBe(
      'There is 2.4 m over the bar and she wants 4.1. Not until the flood — high water in about 3 hours.',
    );
    // The flood: 3.9 + 1.5 = 5.4 m — nothing but the clock changed.
    river.levelM = 1.5;
    expect((await coaster.barClearance(river, 0))!.clearanceM).toBeCloseTo(1.3, 9);
    expect(await coaster.barRefusal(river, 0)).toBeNull();
  });

  it('an untidal bar too shallow for her says so without a flood to wait for', async () => {
    const river = makeStuffAtPath(() => new BarRiver(), '/test/bar-river');
    river.nextHighS = null;
    river.channelM = 2;
    const coaster = newShip();
    coaster.setHull({ draftM: 3.6, beamM: 7, lengthM: 35 });
    expect(await coaster.barRefusal(river, 0)).toMatch(/She cannot cross it\./);
  });
});
