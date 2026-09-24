/**
 * `house par` — the shop's par sheet, edited over the shipped `house`
 * verb (libations D7, re-homed by trades-and-labor D4).
 *
 * ⚠ The par LINE is a `Business` field and stays kernel; the par SHEET is
 * what a shopkeeper keeps, so the verb that edits it ships here. The
 * engine half — round-tripping lines, and the perception-scoped stock
 * sheet — is proved in the kernel's `EmploymentLogic.par.test.ts`.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BankingApi } from '@saxonberg/server/mud/api/banking';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ExecutionContextApi } from '@saxonberg/server/mud/api/execution-context';
import { CommandApi, type CommandContext } from '@saxonberg/server/mud/api/command';
import { CommandDefinition } from '@saxonberg/server/mud/lib/command/CommandDefinition';
import BusinessEntity from '@saxonberg/server/mud/platform/idea/Business';
import Tablet from '@saxonberg/server/mud/platform/thing/Tablet';
import { EmployedMixin } from '@saxonberg/server/mud/lib/employment/Employed';
import { CommandGiverMixin } from '@saxonberg/server/mud/lib/command/CommandGiver';
import { SensorMixin } from '@saxonberg/server/mud/lib/message/Sensor';
import { ContainerMixin } from '@saxonberg/server/mud/lib/spatial/Container';
import { ContainableMixin } from '@saxonberg/server/mud/lib/spatial/Containable';
import { NamedMixin } from '@saxonberg/server/mud/lib/description/Named';
import { Idea } from '@saxonberg/server/mud/lib/stuff/Idea';
import Location from '@saxonberg/server/mud/lib/stuff/Location';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import {
  makeStuff,
  makeStuffAtPath,
  withRootContext,
} from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import HouseShopController from '../HouseShopController';

const BIZ = '/stuff/test/bar/business';
const DAVE = '/platform/agent/Avatar/dave';

class Keeper extends EmployedMixin(
  SensorMixin(CommandGiverMixin(ContainerMixin(ContainableMixin(NamedMixin(Idea))))),
) {
  static _mixinName = 'HouseParKeeper';
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
  return withRootContext(null, 'house-par.test', () => {
    ExecutionContextApi.tagActingAuthor(actor);
    return fn();
  });
}

describe('`house par` — the shop keeps the sheet', () => {
  beforeEach(() => StuffApi.clearAll());
  afterEach(() => vi.restoreAllMocks());

  it('house par edits the sheet — unit from the suffix, 0 strikes the line', async () => {
    const biz = seedBusiness();
    const loc = makeStuff(() => new Location());
    const dave = makeStuffAtPath(() => new Keeper(), DAVE);
    ContainmentApi.move(dave as never, loc as never);
    // The house app runs on a screen (display.md): the tablet in hand.
    const tablet = makeStuff(() => new Tablet());
    tablet.setPairing('held');
    ContainmentApi.move(tablet, dave as never);
    const run = (level: string, extra: Record<string, string> = {}) =>
      asActor(dave, () =>
        makeStuff(() => new HouseShopController()).execute(
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

});
