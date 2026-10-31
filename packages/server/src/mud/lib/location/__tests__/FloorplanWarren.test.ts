/**
 * FloorplanWarren — the floorplan, the keyed rooms and the shell clock
 * lifted to the kernel (harbors P1), over SYNTHETIC fixtures under
 * `/test/**` (lint:test-content: kernel tests never name /world/).
 *
 * What a house and a ship share: the whole-warren wake over
 * `(scope = row, key = <key>/<leaf>)` records, the intra-plan wiring,
 * the plan's own frame, the whole-warren capture that a re-wake
 * restores (born-with props land once and the shell's state comes back
 * unchanged), revert, the weathering clock across a game year at the
 * residence rate, and the hooks a subclass speaks through.
 */

import '../../../../test-bootstrap';
import { KERNEL_CONTENT_ROWS } from '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FloorplanWarren, type UpkeepWords } from '../FloorplanWarren';
import PersistentLocation from '../../../platform/location/PersistentLocation';
import Thing from '../../../platform/thing/Thing';
import Tool from '../../../platform/thing/Tool';
import { ContainmentApi } from '../../../api/containment';
import type { Containable } from '../../spatial/Containable';
import TemplateApplier from '../../../platform/idea/TemplateApplier';
import { Document } from '../../persistence/Document';
import { StuffApi } from '../../../api/stuff';
import { AppApi } from '../../../api/app';
import { MixinApi } from '../../../api/mixin';
import { PersistableApi } from '../../../api/persistable';
import { WorldClockApi } from '../../../api/worldclock';
import { Quantity } from '../../quantity';
import type { Stuff } from '../../stuff/Stuff';
import type { Container } from '../../spatial/Container';
import type { Exitable } from '../../boundary/Exitable';
import { PersistenceManager } from '../../persistence/__tests__/backend-store';
import { makeStuffAtPath } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

type MemberStuff = Stuff & Container;

interface Doc extends Record<string, unknown> {
  _id?: string;
}

const PLAN = '/test/fp/plan';
const DECK = '/test/fp/deck';
const HOLD = '/test/fp/hold';
const CLEAT = '/test/fp/cleat';
const KEY = '/test/fp/vessel-1';
const DAY = 86_400;

/** A ship-shaped consumer: its own words, nothing else. */
class TestFloorplan extends FloorplanWarren {
  static _mixinName = 'FPTestWarren';
  public reconciled = 0;
  protected async reconcile(): Promise<void> {
    this.reconciled += 1;
  }
  public override upkeepWords(): UpkeepWords {
    return {
      ...super.upkeepWords(),
      declining: 'The seams are opening.',
      failed: 'She is weeping at every seam.',
    };
  }
}

/** The base's own words — no override. */
class PlainFloorplan extends FloorplanWarren {
  static _mixinName = 'FPPlainWarren';
  protected async reconcile(): Promise<void> {}
}

let store: Map<string, Doc[]>;
let idCounter = 0;

function col(name: string): Doc[] {
  let arr = store.get(name);
  if (!arr) {
    arr = [];
    store.set(name, arr);
  }
  return arr;
}

function installStore(): void {
  store = new Map();
  idCounter = 0;
  const content = col('content');
  const add = (path: string, cls: string, data: Record<string, unknown> = {}) =>
    content.push({ _id: `d-${++idCounter}`, path, class: cls, data });
  add(TemplateApplier.templatePath, TemplateApplier.templatePath);
  for (const row of KERNEL_CONTENT_ROWS) {
    content.push({ _id: `d-${++idCounter}`, ...row });
  }
  add(DECK, '/platform/location/PersistentLocation', {
    shortDescription: 'the deck',
    props: [CLEAT],
  });
  add(HOLD, '/platform/location/PersistentLocation', {
    shortDescription: 'the hold',
  });
  add(CLEAT, '/platform/thing/Thing', { shortDescription: 'a cleat' });

  const save = vi.fn(async (c: string, doc: Doc) => {
    const arr = col(c);
    if (doc._id) {
      const i = arr.findIndex((d) => d._id === doc._id);
      if (i >= 0) arr[i] = { ...doc };
      else arr.push({ ...doc });
      return doc._id;
    }
    const id = String(++idCounter);
    arr.push({ ...doc, _id: id });
    return id;
  });
  const find = vi.fn(async (c: string, q: Record<string, unknown>) => {
    const arr = col(c);
    const keys = Object.keys(q);
    if (keys.length === 0) return arr.slice();
    return arr.filter((d) =>
      keys.every((k) => {
        const stored = d[k];
        if (Array.isArray(stored)) return stored.includes(q[k]);
        return stored === q[k];
      }),
    );
  });
  const findById = vi.fn(
    async (c: string, id: string) => col(c).find((d) => d._id === id) ?? null,
  );
  const del = vi.fn(async (c: string, id: string) => {
    const arr = col(c);
    const i = arr.findIndex((d) => d._id === id);
    if (i >= 0) arr.splice(i, 1);
  });
  vi.spyOn(PersistenceManager, 'get').mockReturnValue({
    save,
    find,
    findById,
    delete: del,
    isConnected: () => true,
  } as unknown as PersistenceManager);
  installV1QuantityMarshallers();
  Document.setMarshallerResolver(
    () => undefined,
    async () => undefined,
  );
}

function reset(): void {
  vi.restoreAllMocks();
  StuffApi.clearAll();
}

const FLOORPLAN = [
  {
    leaf: 'deck',
    room: DECK,
    entry: true,
    exits: [{ to: 'hold', direction: 'down' }],
  },
  { leaf: 'hold', room: HOLD },
];

/** Mint a warren at the plan path, keyed, floorplan set, awake. */
async function standUp<T extends FloorplanWarren>(
  make: () => T = () => new TestFloorplan() as unknown as T,
  floorplan: Array<Record<string, unknown>> = FLOORPLAN,
): Promise<T> {
  const w = makeStuffAtPath(make, PLAN);
  w.setFloorplan(floorplan);
  await PersistableApi.restoreOrSeed(w as unknown as Stuff, KEY);
  await w.wake();
  return w;
}

function pinClock(at: number): ReturnType<typeof vi.spyOn> {
  const clock = vi.spyOn(WorldClockApi, 'getNow');
  clock.mockReturnValue(Quantity.of(at, 's'));
  return clock;
}

describe('FloorplanWarren (harbors P1)', () => {
  beforeEach(() => {
    reset();
    installStore();
  });
  afterEach(reset);

  it('⭐ wakes whole: keyed rooms from real rows, wired, entry first', async () => {
    const w = await standUp();
    const deck = w.entryRoom()!;
    expect(deck).toBeInstanceOf(PersistentLocation);
    expect(deck.getTemplatePath()).toBe(DECK);
    expect(
      (deck as unknown as { getPersistenceKey(): string }).getPersistenceKey(),
    ).toBe(`${KEY}/deck`);
    const hold = w.roomForLeaf('hold')!;
    expect(hold.getTemplatePath()).toBe(HOLD);
    expect(w.roomForKey(`${KEY}/hold`)).toBe(hold);
    expect(w.roomKeyOf(undefined)).toBe(KEY);
    expect((deck as unknown as Exitable).getExit('down')).toBeDefined();
    expect((hold as unknown as Exitable).getExit('up')).toBeDefined();
    expect(w.getMembers()).toHaveLength(2);

    // Idempotent: a second wake reuses the live rooms.
    await w.wake();
    expect(w.roomForLeaf('hold')).toBe(hold);
    expect(w.getMembers()).toHaveLength(2);
  });

  it('⭐ lays its rooms out in its OWN frame', async () => {
    const w = await standUp();
    const cell = (r: unknown) =>
      (r as { getCoordinates(): [number, number, number] }).getCoordinates();
    expect(cell(w.entryRoom())).toEqual([0, 0, 0]);
    expect(cell(w.roomForLeaf('hold'))).toEqual([0, 0, -1]);
    expect(w.laysOutOwnFrame()).toBe(true);
  });

  it('⭐⭐ captureAll then a re-wake: the born-with prop lands ONCE and the shell comes back unchanged', async () => {
    const base = 1_000_000;
    const clock = pinClock(base);
    const w = await standUp();
    w.reconcileShell(); // stamp
    clock.mockReturnValue(Quantity.of(base + 30 * DAY, 's'));
    const before = w.reconcileShell();
    expect(before).toBeCloseTo(1 - (30 * 0.5) / 45, 5);
    const cleats = (room: MemberStuff | null) =>
      room!.getContents().filter((c) => c instanceof Thing).length;
    expect(cleats(w.entryRoom())).toBe(1);

    await w.captureAll();
    expect(col('holder_snapshots').length).toBeGreaterThanOrEqual(3);
    const deck = w.entryRoom()!;
    await StuffApi.destruct(w as unknown as Stuff);
    // The rooms followed the warren down — whole, never room-by-room.
    expect(deck.isDestroyed()).toBe(true);

    // Same moment: nothing has elapsed, so the durable state is pinned.
    const again = await standUp();
    expect(again.shellCondition).toBeCloseTo(before, 9);
    expect(again.reconcileShell()).toBeCloseTo(before, 9);
    expect(cleats(again.entryRoom())).toBe(1);
    clock.mockRestore();
  });

  it('revert deletes every record under the key', async () => {
    const w = await standUp();
    await w.captureAll();
    expect(col('holder_snapshots').length).toBeGreaterThan(0);
    const deck = w.entryRoom()!;
    await w.revert();
    expect(deck.isDestroyed()).toBe(true);
    expect(w.entryRoom()).toBeNull();
    await StuffApi.destruct(w as unknown as Stuff);
    const fresh = await standUp();
    expect(fresh.shellCondition).toBe(1);
  });

  it('⭐⭐ the clock across a game year: five bands at the residence rate, the durable pinned unchanged', async () => {
    const base = 2_000_000;
    const clock = pinClock(base);
    const w = await standUp();
    // ⚠ Two clocks: a durable good in a member room must NOT weather
    // with the shell (economy Law 2).
    const tool = makeStuffAtPath(() => new Tool(), '/test/fp/spanner');
    ContainmentApi.move(
      tool as unknown as Stuff & Containable,
      w.roomForLeaf('hold')!,
    );
    const toolBefore = tool.getCondition();
    const at = (days: number): string => {
      clock.mockReturnValue(Quantity.of(base + days * DAY, 's'));
      return w.conditionBand();
    };
    expect(at(0)).toBe('sound');
    expect(at(9)).toBe('sound'); // 0.9 exactly
    expect(at(20)).toBe('weathered');
    expect(at(45)).toBe('worn'); // half gone at daysToWorn
    expect(w.shellCondition).toBeCloseTo(0.5, 5);
    expect(at(60)).toBe('shabby');
    expect(at(90)).toBe('dilapidated');
    expect(at(365)).toBe('dilapidated');
    expect(w.shellCondition).toBe(0);
    expect(tool.getCondition()).toBe(toolBefore);

    // The upkeep act's restore — sound, stamped now.
    w.restoreShell();
    expect(w.conditionBand()).toBe('sound');
    expect(at(365 + 45)).toBe('worn');
    clock.mockRestore();
  });

  it('reads the rate from residence.weather.daysToWorn', async () => {
    const base = 3_000_000;
    const clock = pinClock(base);
    const real = AppApi.setting.bind(AppApi);
    vi.spyOn(AppApi, 'setting').mockImplementation((key: string) =>
      key === 'residence.weather.daysToWorn' ? '90' : real(key),
    );
    const w = await standUp();
    w.reconcileShell();
    clock.mockReturnValue(Quantity.of(base + 45 * DAY, 's'));
    expect(w.reconcileShell()).toBeCloseTo(0.75, 5);
    expect(w.conditionBand()).toBe('weathered');
    clock.mockRestore();
  });

  it('speaks in the subclass\'s words, and the base in its own', async () => {
    const base = 4_000_000;
    const clock = pinClock(base);
    const w = await standUp();
    w.reconcileShell();
    expect(w.conditionCause()).toBeNull();
    clock.mockReturnValue(Quantity.of(base + 30 * DAY, 's'));
    w.reconcileShell();
    expect(w.conditionCause()).toBe('The seams are opening.');
    clock.mockReturnValue(Quantity.of(base + 80 * DAY, 's'));
    w.reconcileShell();
    expect(w.conditionCause()).toBe('She is weeping at every seam.');
    clock.mockRestore();

    reset();
    installStore();
    const plain = await standUp(() => new PlainFloorplan());
    expect(plain.upkeepWords().kit).toMatch(/kit/);
  });

  it('a LOCKED edge on a warren that hangs no lock throws', async () => {
    const w = makeStuffAtPath(() => new PlainFloorplan(), PLAN);
    w.setFloorplan([
      {
        leaf: 'deck',
        room: DECK,
        entry: true,
        exits: [{ to: 'hold', direction: 'down', locked: true }],
      },
      { leaf: 'hold', room: HOLD },
    ]);
    await PersistableApi.restoreOrSeed(w as unknown as Stuff, KEY);
    await expect(w.wake()).rejects.toThrow(/hangs no lock/);
  });

  it('validates the upkeep term and never buds', async () => {
    const w = await standUp();
    expect(w.getUpkeepTerm()).toBe('owner-all');
    w.setUpkeepTerm('landlord-shell');
    expect(w.getUpkeepTerm()).toBe('landlord-shell');
    expect(() => w.setUpkeepTerm('Not A Term')).toThrow(/kebab-case/);
    expect(MixinApi.isPersistable(w)).toBe(true);
  });
});
