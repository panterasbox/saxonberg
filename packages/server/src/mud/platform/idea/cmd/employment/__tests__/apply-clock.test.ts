/**
 * ⭐⭐ **`apply` and `clock`** — the two acts that make a labor market a
 * thing a player can walk into (trades-and-labor D12/D15).
 *
 * `apply` — the player moves first, and **every refusal names the number
 * and what lifts it**. A refusal you cannot answer is not a rule, it is
 * a wall (`docs/antipatterns.md § A bare COUNT as a permanent gate`).
 *
 * `clock` — a shift is something you CHOOSE to start. Being taken on
 * puts you on the chart, not on the clock; the wage settles at
 * `clock off` for the game-hours actually stood.
 */

import '../../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ApplyController from '../ApplyController';
import ClockController from '../ClockController';
import BusinessEntity from '../../../Business';
import { ContractApi } from '../../../../../api/contract';
import { EmploymentApi } from '../../../../../api/employment';
import { StuffApi } from '../../../../../api/stuff';
import { ContainmentApi } from '../../../../../api/containment';
import { ExecutionContextApi } from '../../../../../api/execution-context';
import { MessageApi } from '../../../../../api/message';
import { WorldClockApi } from '../../../../../api/worldclock';
import { CommandApi, type CommandContext } from '../../../../../api/command';
import { CommandDefinition } from '../../../../../lib/command/CommandDefinition';
import type { Mml } from '../../../../../api/mml';
import { Idea } from '../../../../../lib/stuff/Idea';
import Location from '../../../../../lib/stuff/Location';
import { CommandGiverMixin } from '../../../../../lib/command/CommandGiver';
import { SensorMixin } from '../../../../../lib/message/Sensor';
import { ContainerMixin } from '../../../../../lib/spatial/Container';
import { ContainableMixin } from '../../../../../lib/spatial/Containable';
import { NamedMixin } from '../../../../../lib/description/Named';
import { EmployedMixin } from '../../../../../lib/employment/Employed';
import { AdvancementMixin } from '../../../../../lib/advancement/Advancement';
import type { CompetenceBandName } from '../../../../../lib/advancement/CompetenceBand';
import type { Stuff } from '../../../../../lib/stuff/Stuff';
import {
  makeStuff,
  makeStuffAtPath,
  withRootContext,
} from '../../../../../lib/security/__tests__/test-setup';

const SHOP = '/stuff/test/apply/location/shop';
const YARD = '/stuff/test/apply/location/yard';
const BIZ = '/stuff/test/apply/idea/business';
const ALICE = '/platform/agent/Avatar/alice';

class Room extends NamedMixin(ContainerMixin(Location)) {
  static _mixinName = 'ApplyRoom';
}
class Person extends AdvancementMixin(
  EmployedMixin(
    SensorMixin(CommandGiverMixin(ContainerMixin(ContainableMixin(NamedMixin(Idea))))),
  ),
) {
  static _mixinName = 'ApplyPerson';
  private band: CompetenceBandName = 'untrained';
  setBand(b: CompetenceBandName): void {
    this.band = b;
  }
  async competenceBandFor(): Promise<CompetenceBandName> {
    return this.band;
  }
}

let shop: Room;
let yard: Room;
let biz: BusinessEntity;
let alice: Person;
let said: string;

function capture(): void {
  said = '';
  vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
    const b: Record<string, unknown> = {};
    b.topic = () => b;
    b.toSelf = (body: Mml) => {
      said += `${body.toString()}\n`;
      return b;
    };
    b.toPeers = () => b;
    b.send = () => {};
    return b as never;
  });
}

function ctx(room: Room, text: string): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: alice as never,
    location: room as never,
    commandText: text,
    executionId: 't',
    commandId: 't',
    verb: text.split(' ')[0]!,
    command: CommandDefinition.fromYaml(
      `verbs: [${text.split(' ')[0]!}]\ncontroller: NoopController\ndescription: stub\n`,
      '<test>',
    ),
  });
}

function reasons(c: CommandContext): string[] {
  return (c.getNotes?.() ?? [])
    .filter((n) => n.kind === 'controller-rejected')
    .map((n) => (n as { reason?: string }).reason ?? '');
}

async function apply(
  model: Record<string, unknown> = {},
  room: Room = shop,
): Promise<CommandContext> {
  const c = ctx(room, 'apply');
  await withRootContext(null, 'apply.test', () => {
    ExecutionContextApi.tagActingAuthor(alice as never);
    return makeStuff(() => new ApplyController()).execute(model as never, c);
  });
  return c;
}

async function clock(
  sub: string,
  room: Room = shop,
): Promise<CommandContext> {
  const c = ctx(room, `clock ${sub}`);
  await withRootContext(null, 'clock.test', () => {
    ExecutionContextApi.tagActingAuthor(alice as never);
    return makeStuff(() => new ClockController()).execute(
      { subcommand: sub } as never,
      c,
    );
  });
  return c;
}

function seat(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    key: 'hand',
    noun: 'hand',
    label: 'hauling and shelving',
    wageRate: 4,
    headcount: 1,
    ...over,
  };
}

beforeEach(() => {
  StuffApi.clearAll();
  capture();
  shop = makeStuffAtPath(() => {
    const r = new Room();
    r.setName('the shop');
    return r;
  }, SHOP);
  yard = makeStuffAtPath(() => {
    const r = new Room();
    r.setName('the yard');
    return r;
  }, YARD);
  biz = makeStuffAtPath(() => new BusinessEntity(), BIZ);
  biz.positions = [seat()] as never;
  biz.operatingLocations = [SHOP];
  alice = makeStuffAtPath(() => {
    const a = new Person();
    a.setName('alice');
    return a;
  }, ALICE);
  ContainmentApi.move(alice as never, shop as never);
});

afterEach(() => vi.restoreAllMocks());

describe('⭐ apply — the player moves first', () => {
  it('takes the one opening going here, and says the job is not yet the shift', async () => {
    const c = await apply();
    expect(reasons(c)).toEqual([]);
    expect(said).toMatch(/taken on as hand/);
    expect(said).toMatch(/clock on/);
    expect(biz.holdersOf('hand')).toContain(ALICE);
    expect(biz.openingsFor('hand')).toBe(0);
  });

  it('refuses where nothing is going, and says so plainly', async () => {
    const c = await apply({}, yard);
    expect(reasons(c)).toEqual(['no-opening']);
    expect(said).toMatch(/no work going here/i);
  });

  it('⚠ names what IS going when the seat asked for is not', async () => {
    const c = await apply({ position: 'tailor' });
    expect(reasons(c)).toEqual(['no-opening']);
    expect(said).toMatch(/Going: hand/);
  });

  it('refuses ambiguously and names both openings with what each asks', async () => {
    biz.positions = [
      seat(),
      seat({ key: 'clerk', noun: 'clerk', requires: { gigs: 1 } }),
    ] as never;
    const c = await apply();
    expect(reasons(c)).toEqual(['ambiguous-opening']);
    expect(said).toMatch(/hand — no prerequisite/);
    expect(said).toMatch(/clerk — one completed gig/);
  });

  it('⭐⭐ a gigs refusal names BOTH numbers and the shortfall', async () => {
    biz.positions = [seat({ requires: { gigs: 2 } })] as never;
    vi.spyOn(ContractApi, 'settledGigsBy').mockResolvedValue(0);
    const c = await apply();
    expect(reasons(c)).toEqual(['gigs']);
    expect(said).toMatch(/ask for 2 completed gigs; you have 0/);
    expect(said).toMatch(/Finish 2 more/);
    expect(biz.holdersOf('hand')).toEqual([]);
  });

  it('⭐⭐ a band refusal names the discipline, both bands, and the lift', async () => {
    biz.positions = [
      seat({ key: 'tailor', noun: 'tailor', requires: { discipline: 'tailoring', band: 'competent' } }),
    ] as never;
    const c = await apply();
    expect(reasons(c)).toEqual(['band']);
    expect(said).toMatch(/competent hand at tailoring; you are untrained/);
    expect(said).toMatch(/Practising lifts it/);
  });

  it('…and doing the thing LIFTS it — the same act, taken', async () => {
    biz.positions = [
      seat({ key: 'tailor', noun: 'tailor', requires: { discipline: 'tailoring', band: 'competent' } }),
    ] as never;
    alice.setBand('competent');
    const c = await apply();
    expect(reasons(c)).toEqual([]);
    expect(biz.holdersOf('tailor')).toContain(ALICE);
  });
});

describe('⭐⭐ clock — a shift is something you choose to start', () => {
  beforeEach(async () => {
    await apply();
    said = '';
  });

  it('being taken on does NOT put you on shift', () => {
    expect(alice.isOnShift()).toBe(false);
  });

  it('clock on starts it, names the rate, and clock off ends it', async () => {
    const on = await clock('on');
    expect(reasons(on)).toEqual([]);
    expect(alice.isOnShift()).toBe(true);
    expect(said).toMatch(/clock on at/);
    said = '';
    const off = await clock('off');
    expect(reasons(off)).toEqual([]);
    expect(alice.isOnShift()).toBe(false);
    expect(said).toMatch(/clock off at/);
  });

  it('⭐ a `fulfills` seat says what the shift GRANTS — or a player never learns it', async () => {
    biz.positions = [seat({ fulfills: true })] as never;
    await clock('on');
    expect(said).toMatch(/an order here is served by/);
    expect(alice.isFulfilling()).toBe(true);
  });

  it('⭐ you must be where the house works — employer-bounded', async () => {
    ContainmentApi.move(alice as never, yard as never);
    const c = await clock('on', yard);
    expect(reasons(c)).toEqual(['not-on-premises']);
    expect(said).toMatch(/where they work/);
    expect(alice.isOnShift()).toBe(false);
  });

  it('refuses a double clock-on and a clock-off with no shift', async () => {
    await clock('on');
    said = '';
    expect(reasons(await clock('on'))).toEqual(['already-on-shift']);
    expect(said).toMatch(/already on shift/);
    await clock('off');
    said = '';
    expect(reasons(await clock('off'))).toEqual(['not-on-shift']);
  });

  it('refuses a bare `clock` with the usage', async () => {
    const c = await clock('');
    expect(reasons(c)).toEqual(['unknown-subcommand']);
    expect(said).toMatch(/clock on/);
  });

  it('⚠ the ROSTER tick leaves a clocked-on applicant alone', async () => {
    await clock('on');
    // The tick iterates roster ASSIGNMENTS. An applicant has none, so
    // nothing the clock did can be undone by it.
    expect(biz.getRosterAssignments()).toEqual([]);
    await EmploymentApi.tickRoster();
    expect(alice.isOnShift()).toBe(true);
  });

  it('⭐ the wage settles for the game-hours actually stood — refused, not silent, into the red', async () => {
    // The house authors no bank, so `clock off` cannot pay. ⭐ What it
    // must NOT do is swallow the shift: the hours stood are real, so the
    // failure has to surface rather than the clock quietly eating it.
    // (The paid path is the wage engine's own suite — the settle here is
    // the same `settleShiftWageImpl` the roster tick runs, reached by a
    // player instead of by a clock.)
    const t0 = WorldClockApi.getNow().rawValue();
    await clock('on');
    vi.spyOn(WorldClockApi, 'getNow').mockReturnValue({
      rawValue: () => t0 + 2 * 3600,
    } as never);
    await expect(clock('off')).rejects.toThrow(/authors no banksAt/);
    expect(alice.isOnShift()).toBe(true); // the shift is NOT lost
  });
});
