import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Ship from '../Ship';
import BerthExit from '../BerthExit';
import AshoreExit from '../AshoreExit';
import Quay from '../../location/Quay';
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
 * ⭐ The way aboard is named for her (harbors P4–P6): a ship made fast at a
 * landing puts a `BerthExit` on it and her lines' ends round its bollards;
 * casting off takes both away; lifting her last line off unmoors her; and a
 * restart puts it all back from the two facts she keeps.
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

let quay: Quay;
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

function ends(room: Stuff & Container): TestEnd[] {
  return room.getContents().filter((x): x is TestEnd => x instanceof TestEnd);
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
  quay = makeStuffAtPath(() => new Quay(), QUAY);
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

describe('a ship made fast (harbors P4–P6)', () => {
  it('⭐ coming alongside puts a way aboard named for her on the quay, and her lines round its bollards', async () => {
    bollardOn(quay);
    bollardOn(quay);
    lineOn(deck);
    lineOn(deck);
    const words = await ship.comeAlongside(QUAY);
    expect(words).toMatch(/made fast round the bollards/);
    expect(ship.isMoored()).toBe(true);
    expect(ship.getBerth()).toBe(QUAY);
    const way = quay.getExit('hesper');
    expect(way).toBeInstanceOf(BerthExit);
    expect(way!.getDestinationTemplatePath()).toBe(DECK);
    // ⭐ Her lines' ends are real things on the quay, one round each bollard.
    expect(ends(quay)).toHaveLength(2);
    // The way leads aboard her deck.
    expect(await way!.resolveDestination()).toBe(deck);
  });

  it('⭐ the quay reads who is alongside off her way — and stops when she goes', async () => {
    bollardOn(quay);
    lineOn(deck);
    const look = (): string =>
      MixinApi.getAllMarkupAugmenters(Quay).reduce((t, aug) => aug(t, quay, quay), 'A quay.');
    expect(look()).toBe('A quay.');
    await ship.comeAlongside(QUAY);
    expect(look()).toMatch(/Alongside: the Hesper\./);
    await ship.castOff();
    expect(look()).toBe('A quay.');
  });

  it('⭐ casting off brings her lines in and takes the way away', async () => {
    bollardOn(quay);
    lineOn(deck);
    await ship.comeAlongside(QUAY);
    await ship.castOff();
    expect(quay.getExit('hesper')).toBeUndefined();
    expect(ends(quay)).toHaveLength(0);
    expect(ship.isMoored()).toBe(false);
    expect(ship.getBerth()).toBeNull();
  });

  it('⭐ with no line aboard she cannot make fast, and lies off in words', async () => {
    bollardOn(quay);
    expect(await ship.comeAlongside(QUAY)).toMatch(/no lines to make fast/);
    expect(quay.getExit('hesper')).toBeUndefined();
    expect(ship.isMoored()).toBe(false);
  });

  it('a line too short to reach the quay is not a mooring line for her', async () => {
    bollardOn(quay);
    lineOn(deck, 1);
    expect(await ship.linesAboard()).toHaveLength(0);
  });

  it('with no bollard ashore there is nothing to make fast round', async () => {
    lineOn(deck);
    expect(await ship.comeAlongside(QUAY)).toMatch(/nothing at .* to make a line fast round/);
    expect(ship.isMoored()).toBe(false);
  });

  it('⭐ a course for a landing with no line aboard is refused before it is laid', async () => {
    ship.setLine(RIVER);
    ship.setLinePosition({ course: 'test', km: 1, across: 10 });
    const steered = vi.spyOn(Object.getPrototypeOf(Ship.prototype), 'steer');
    const r = await ship.steer({ speedKn: 5, direction: 'upstream', toward: QUAY });
    expect(r).toEqual({ refused: 'She has no lines to make fast.' });
    expect(steered).not.toHaveBeenCalled();
    // A course for no landing asks nothing of her lines.
    expect(await ship.mooringRefusal(null)).toBeNull();
  });

  it('⭐ lifting one line off the bollard leaves her held by the other; lifting the last sets her adrift', async () => {
    bollardOn(quay);
    lineOn(deck);
    lineOn(deck);
    await ship.comeAlongside(QUAY);
    const hand = makeStuffAtPath(() => new Shore(), '/test/hand') as unknown as Stuff & Container;
    vi.spyOn(ship, 'aboard').mockResolvedValue([deck as unknown as Stuff]);
    const [first, second] = ends(quay);
    ContainmentApi.move(first!, hand);
    await Promise.resolve();
    expect(ship.isMoored()).toBe(true);
    expect(quay.getExit('hesper')).toBeInstanceOf(BerthExit);
    ContainmentApi.move(second!, hand);
    await new Promise((r) => setTimeout(r, 0));
    expect(ship.isMoored()).toBe(false);
    expect(quay.getExit('hesper')).toBeUndefined();
    expect(told.join(' ')).toMatch(/She is adrift/);
  });

  it('⭐ her deck’s `ashore` leads to the landing she is made fast at', async () => {
    bollardOn(quay);
    lineOn(deck);
    await ship.comeAlongside(QUAY);
    vi.spyOn(NavigationApi, 'structureAt').mockResolvedValue(ship as never);
    const ashore = await deck.installExit<AshoreExit>('/platform/idea/exits/ashore', {
      direction: 'ashore',
      source: deck as unknown as Stuff & Container,
      destinationPath: '/somewhere/else',
    });
    expect(await ashore.resolveDestination()).toBe(quay);
    // ⭐ The gangway's lock is hers, read by both faces (P9) — and leaving never refuses.
    ashore.lock();
    expect(ship.isGangwayLocked()).toBe(true);
    expect((quay.getExit('hesper') as BerthExit).isLocked()).toBe(true);
  });

  it('⭐⭐ restart: loaded from her record, she makes fast again where she was (the wake, not the read)', async () => {
    bollardOn(quay);
    lineOn(deck);
    lineOn(deck);
    await ship.comeAlongside(QUAY);
    // The process ends: the ends ashore and the way were runtime.
    StuffApi.destruct(ship as unknown as Stuff);
    for (const e of ends(quay)) StuffApi.destruct(e);
    expect(quay.getExit('hesper')).toBeUndefined();
    // Her record: moored at the quay.
    const back = newShip();
    rooms.set(SHIP, back as unknown as Stuff);
    back.setBerth(QUAY);
    back.setMoored(true);
    await back.onRestored();
    expect(quay.getExit('hesper')).toBeInstanceOf(BerthExit);
    expect(ends(quay)).toHaveLength(2);
    expect(back.getBerth()).toBe(QUAY);
  });

  it('⭐ an authored mooring is made when she is first stood up (seed)', async () => {
    bollardOn(quay);
    lineOn(deck);
    ship.setBerth(QUAY);
    ship.setMoored(true);
    await ship.seedBornWith();
    expect(quay.getExit('hesper')).toBeInstanceOf(BerthExit);
    expect(ends(quay)).toHaveLength(1);
  });

  it('⭐ a landing being used asks the frame’s ships, and the one made fast there puts her way back', async () => {
    bollardOn(quay);
    lineOn(deck);
    ship.setBerth(QUAY);
    ship.setMoored(true);
    const frame = { craft: () => [ship], onSiteStood: async () => undefined, getTemplatePath: () => RIVER };
    vi.spyOn(quay, 'liveSiteFrame').mockResolvedValue(frame as never);
    quay.setFrameSite({ frame: RIVER, cite: 'x+0.1,left' });
    await quay.frameSiteStood();
    expect(quay.getExit('hesper')).toBeInstanceOf(BerthExit);
  });
});
