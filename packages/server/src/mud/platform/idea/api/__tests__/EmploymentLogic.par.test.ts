/**
 * The par manifest and the perception-scoped stock sheet — libations D7.
 *
 * Proves: par lines round-trip on the Business and `house par` edits
 * them (unit from the level suffix, `0` strikes); the sheet counts only
 * what the viewer perceives — a bottle in a closed chest is not on it —
 * summing litres for `L`, kg by density for `kg`, and discrete goods (by
 * material tag or a named category) for `count`.
 */

import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EmploymentApi } from '../../../../api/employment';
import { BankingApi } from '../../../../api/banking';
import { ContainmentApi } from '../../../../api/containment';
import { StuffApi } from '../../../../api/stuff';
import { ExecutionContextApi } from '../../../../api/execution-context';
import { CommandApi, type CommandContext } from '../../../../api/command';
import { CommandDefinition } from '../../../../lib/command/CommandDefinition';
import BusinessEntity from '../../Business';
import HouseController from '../../cmd/banking/HouseController';
import Chest from '../../../thing/Chest';
import Material from '../../../../lib/material/Material';
import { BulkableMixin } from '../../../../lib/bulk/Bulkable';
import { TangibleMixin } from '../../../../lib/material/Tangible';
import { EmployedMixin } from '../../../../lib/employment/Employed';
import { CommandGiverMixin } from '../../../../lib/command/CommandGiver';
import { SensorMixin } from '../../../../lib/message/Sensor';
import { ContainerMixin } from '../../../../lib/spatial/Container';
import { ContainableMixin } from '../../../../lib/spatial/Containable';
import { NamedMixin } from '../../../../lib/description/Named';
import { Idea } from '../../../../lib/stuff/Idea';
import Location from '../../../../lib/stuff/Location';
import { Quantity } from '../../../../lib/quantity';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import {
  makeStuff,
  makeStuffAtPath,
  withRootContext,
} from '../../../../lib/security/__tests__/test-setup';

const BIZ = '/stuff/test/bar/business';
const DAVE = '/platform/agent/Avatar/dave';

class Keeper extends EmployedMixin(
  SensorMixin(CommandGiverMixin(ContainerMixin(ContainableMixin(NamedMixin(Idea))))),
) {
  static _mixinName = 'Keeper';
}
class Bottle extends BulkableMixin(ContainableMixin(NamedMixin(Idea))) {
  static _mixinName = 'TestBottle';
}
class Lime extends TangibleMixin(ContainableMixin(NamedMixin(Idea))) {
  static _mixinName = 'TestLime';
}
class Coupe extends ContainableMixin(NamedMixin(Idea)) {
  static _mixinName = 'TestCoupe';
  getCategory(): string {
    return 'coupe';
  }
}

function material(path: string, tags: string[], densityKgM3 = 1000): Material {
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(path.split('/').pop() ?? 'stuff');
    m.setKeywords(tags);
    m.setTags(tags);
    m.setDensity(Quantity.of(densityKgM3, 'kg/m³'));
    return m;
  }, path) as unknown as Material;
}

function bottle(m: Material, litres: number): Bottle {
  return makeStuff(() => {
    const b = new Bottle();
    b.setName('bottle');
    b.interiorBulk = true;
    b.setInteriorCapacity(Quantity.of(1, 'L'));
    b.setBulkMaterial('interior', m);
    b.setBulkAmount('interior', Quantity.of(litres, 'L'));
    return b;
  });
}

function seedBusiness(): BusinessEntity {
  const b = makeStuffAtPath(() => new BusinessEntity(), BIZ);
  b.proprietorPath = DAVE;
  b.banksAt = BankingApi.defaultCustodianBank();
  b.positions = [];
  b.operatingLocations = ['/stuff/test/bar/room'];
  return b;
}

function ctx(giver: Keeper, loc: Location, text: string): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: giver as never,
    location: loc as never,
    commandText: text,
    executionId: 't',
    commandId: 't',
    verb: 'house',
    command: CommandDefinition.fromYaml(
      'verbs: [house]\ncontroller: NoopController\ndescription: stub\n',
      '<test>',
    ),
  });
}

function asActor<T>(actor: Stuff, fn: () => Promise<T>): Promise<T> {
  return withRootContext(null, 'par.test', () => {
    ExecutionContextApi.tagActingAuthor(actor);
    return fn();
  });
}

describe('the par manifest (D7)', () => {
  beforeEach(() => StuffApi.clearAll());
  afterEach(() => vi.restoreAllMocks());

  it('par lines round-trip on the Business; setting replaces by category', () => {
    const biz = seedBusiness();
    biz.setParLine({ category: 'gin', level: 6, unit: 'L', supplier: '/x' });
    biz.setParLine({ category: 'lime', level: 24, unit: 'count' });
    biz.setParLine({ category: 'gin', level: 9, unit: 'L', minGrade: 'fine' });
    const lines = biz.getParLines();
    expect(lines.map((l) => l.category)).toEqual(['gin', 'lime']);
    expect(lines[0]!.level).toBe(9);
    expect(lines[0]!.minGrade).toBe('fine');
    expect(lines[0]!.serialize()).toEqual({ category: 'gin', level: 9, unit: 'L', minGrade: 'fine' });
    expect(biz.removeParLine('lime')).toBe(true);
    expect(biz.removeParLine('lime')).toBe(false);
    expect(biz.getParLines().length).toBe(1);
  });

  it('house par edits the sheet — unit from the suffix, 0 strikes the line', async () => {
    const biz = seedBusiness();
    const loc = makeStuff(() => new Location());
    const dave = makeStuffAtPath(() => new Keeper(), DAVE);
    ContainmentApi.move(dave as never, loc as never);
    const run = (level: string, extra: Record<string, string> = {}) =>
      asActor(dave, () =>
        makeStuff(() => new HouseController()).execute(
          { subcommand: 'par', category: 'gin', level, ...extra } as never,
          ctx(dave, loc, `house par gin ${level}`),
        ),
      );
    await run('6L', { from: '/stuff/test/distillery' });
    expect(biz.getParLines()[0]?.serialize()).toEqual({
      category: 'gin',
      level: 6,
      unit: 'L',
      supplier: '/stuff/test/distillery',
    });
    await run('5kg');
    expect(biz.getParLines()[0]?.unit).toBe('kg');
    await run('12');
    expect(biz.getParLines()[0]?.unit).toBe('count');
    await run('0');
    expect(biz.getParLines()).toEqual([]);
  });

  it('the sheet counts only what the viewer perceives: a closed chest hides its bottle', () => {
    const biz = seedBusiness();
    biz.setParLine({ category: 'gin', level: 3, unit: 'L' });
    biz.setParLine({ category: 'ice', level: 4, unit: 'kg' });
    biz.setParLine({ category: 'lime', level: 6, unit: 'count' });
    biz.setParLine({ category: 'coupe', level: 2, unit: 'count' });
    const gin = material('/stuff/test/material/gin', ['spirit', 'gin'], 940);
    const ice = material('/stuff/test/material/ice', ['ice'], 917);
    const limeFlesh = material('/stuff/test/material/lime', ['fruit', 'lime']);

    const loc = makeStuff(() => new Location());
    const mara = makeStuffAtPath(() => new Keeper(), '/platform/agent/Avatar/mara');
    ContainmentApi.move(mara as never, loc as never);

    // On the rail: 0.75 L gin; in hand: 0.5 L gin.
    ContainmentApi.move(bottle(gin, 0.75) as never, loc as never);
    ContainmentApi.move(bottle(gin, 0.5) as never, mara as never);
    // In a closed chest: 1 L gin — not on the sheet. Opened: it is.
    const chest = makeStuff(() => new Chest());
    chest.setOpen(false);
    ContainmentApi.move(chest as never, loc as never);
    ContainmentApi.move(bottle(gin, 1) as never, chest as never);
    // An ice bin: 2 L of ice ≈ 1.834 kg.
    ContainmentApi.move(bottle(ice, 2) as never, loc as never);
    // Two limes, one coupe.
    for (let i = 0; i < 2; i++) {
      const l = makeStuff(() => {
        const x = new Lime();
        x.setName('lime');
        x.setMaterial(limeFlesh);
        return x;
      });
      ContainmentApi.move(l as never, loc as never);
    }
    ContainmentApi.move(makeStuff(() => new Coupe()) as never, loc as never);

    const sheet = EmploymentApi.stockSheetFor(mara, biz);
    const by = Object.fromEntries(sheet.map((s) => [s.line.category, s]));
    expect(by.gin?.onHand).toBe(1.25);
    expect(by.gin?.shortfall).toBe(1.75);
    expect(by.ice?.onHand).toBe(1.834);
    expect(by.lime?.onHand).toBe(2);
    expect(by.lime?.shortfall).toBe(4);
    expect(by.coupe?.onHand).toBe(1);

    chest.setOpen(true);
    const again = EmploymentApi.stockSheetFor(mara, biz);
    expect(again.find((s) => s.line.category === 'gin')?.onHand).toBe(2.25);
  });
});
