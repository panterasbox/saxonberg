/**
 * ⭐⭐ **The help-wanted sign** (trades-and-labor D11) — the room's `look`
 * prints what the venue is hiring for.
 *
 * There is no sign OBJECT, no mixin and no host field. The notice is
 * DERIVED from the live business's `openings()`, which is itself derived
 * (`headcount − holders`), so **a venue with an open seat cannot fail to
 * advertise** and a filled one cannot go on advertising. The puddle line
 * is the precedent: a room-level line a subsystem read contributes.
 *
 * ⚠ Live businesses only. Standing a house up is an economic act — its
 * roster ticks, its wages flow — and walking into a room must not be
 * one. The authoring rule that makes that honest (an advertising house
 * is a `boot:` producer of its own pack) is `lint:openings`'s.
 */

import '../../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import LookController from '../LookController';
import BusinessEntity from '../../../Business';
import { EmploymentApi } from '../../../../../api/employment';
import { StuffApi } from '../../../../../api/stuff';
import { ContainmentApi } from '../../../../../api/containment';
import { ExecutionContextApi } from '../../../../../api/execution-context';
import { MessageApi } from '../../../../../api/message';
import type { Mml } from '../../../../../api/mml';
import { CommandApi, type CommandContext } from '../../../../../api/command';
import { CommandDefinition } from '../../../../../lib/command/CommandDefinition';
import { Idea } from '../../../../../lib/stuff/Idea';
import Location from '../../../../../lib/stuff/Location';
import { CommandGiverMixin } from '../../../../../lib/command/CommandGiver';
import { SensorMixin } from '../../../../../lib/message/Sensor';
import { ContainerMixin } from '../../../../../lib/spatial/Container';
import { ContainableMixin } from '../../../../../lib/spatial/Containable';
import { NamedMixin } from '../../../../../lib/description/Named';
import { VisibleMixin } from '../../../../../lib/description/Visible';
import { EmployedMixin } from '../../../../../lib/employment/Employed';
import type { Stuff } from '../../../../../lib/stuff/Stuff';
import {
  makeStuff,
  makeStuffAtPath,
  withRootContext,
} from '../../../../../lib/security/__tests__/test-setup';

const SHOP = '/stuff/test/sign/location/shop';
const COUNTER = '/stuff/test/sign/thing/counter';
const BIZ = '/stuff/test/sign/idea/business';
const ALICE = '/platform/agent/Avatar/alice';

class Room extends VisibleMixin(NamedMixin(ContainerMixin(Location))) {
  static _mixinName = 'SignRoom';
}
class Counter extends ContainableMixin(NamedMixin(Idea)) {
  static _mixinName = 'SignCounter';
}
class Browser extends EmployedMixin(
  SensorMixin(CommandGiverMixin(ContainerMixin(ContainableMixin(NamedMixin(Idea))))),
) {
  static _mixinName = 'SignBrowser';
}

let shop: Room;
let biz: BusinessEntity;
let alice: Browser;

function seat(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    key: 'hand',
    noun: 'hand',
    label: 'hauling and shelving',
    wageRate: 4,
    headcount: 1,
    requires: { gigs: 2 },
    ...over,
  };
}

function ctx(): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: alice as never,
    location: shop as never,
    commandText: 'look',
    executionId: 't',
    commandId: 't',
    verb: 'look',
    command: CommandDefinition.fromYaml(
      'verbs: [look]\ncontroller: NoopController\ndescription: stub\n',
      '<test>',
    ),
  });
}

/** What `look` actually put on the wire for the actor, as one string. */
async function lookText(): Promise<string> {
  let captured = '';
  vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
    const b: Record<string, unknown> = {};
    b.topic = () => b;
    b.toSelf = (body: Mml) => {
      captured += `${body.toString()}\n`;
      return b;
    };
    b.toPeers = () => b;
    b.send = () => {};
    return b as never;
  });
  const c = ctx();
  await withRootContext(null, 'sign.test', () => {
    ExecutionContextApi.tagActingAuthor(alice as never);
    // Bare `look`: the dispatcher's `$focus` default resolves to the
    // room, and the controller takes the room branch when the target IS
    // the location.
    return makeStuff(() => new LookController()).execute(
      { target: { stuff: shop, raw: '' } } as never,
      c,
    );
  });
  return captured;
}

beforeEach(() => {
  StuffApi.clearAll();
  shop = makeStuffAtPath(() => {
    const r = new Room();
    r.setName('the shop');
    r.setLongDescription('A plank counter and shelves.');
    return r;
  }, SHOP);
  const counter = makeStuffAtPath(() => {
    const c = new Counter();
    c.setName('counter');
    return c;
  }, COUNTER);
  ContainmentApi.move(counter as never, shop as never);
  biz = makeStuffAtPath(() => new BusinessEntity(), BIZ);
  biz.positions = [seat()] as never;
  biz.operatingLocations = [COUNTER];
  alice = makeStuffAtPath(() => {
    const a = new Browser();
    a.setName('alice');
    return a;
  }, ALICE);
  ContainmentApi.move(alice as never, shop as never);
});

afterEach(() => vi.restoreAllMocks());

describe('⭐⭐ the sign is derived — a venue with an open seat cannot fail to advertise', () => {
  it('an open seat on a business operating a FIXTURE in the room is advertised', () => {
    const notices = EmploymentApi.noticesAt(shop as unknown as Stuff);
    expect(notices).toHaveLength(1);
    expect(notices[0]!.describe()).toMatch(/HELP WANTED — hand/);
    expect(notices[0]!.describe()).toMatch(/two completed gigs asked/);
  });

  it('a business operating the ROOM directly is advertised too', () => {
    biz.operatingLocations = [SHOP];
    expect(EmploymentApi.noticesAt(shop as unknown as Stuff)).toHaveLength(1);
  });

  it('⭐ a FILLED seat stops advertising, with nothing decremented', () => {
    alice.employments = [
      {
        organizationPath: BIZ,
        positionKey: 'hand',
        status: 'employed',
        hiredAt: 0,
        onShiftSince: null,
      },
    ];
    expect(EmploymentApi.noticesAt(shop as unknown as Stuff)).toEqual([]);
  });

  it('a seat with no headcount is not an opening', () => {
    biz.positions = [seat({ headcount: undefined })] as never;
    expect(EmploymentApi.noticesAt(shop as unknown as Stuff)).toEqual([]);
  });

  it('⚠ a CLOSED house is not hiring', () => {
    biz.setClosed(true);
    expect(EmploymentApi.noticesAt(shop as unknown as Stuff)).toEqual([]);
  });

  it('a room with no business costs a miss and says nothing', () => {
    const elsewhere = makeStuffAtPath(() => {
      const r = new Room();
      r.setName('elsewhere');
      return r;
    }, '/stuff/test/sign/location/elsewhere');
    expect(EmploymentApi.noticesAt(elsewhere as unknown as Stuff)).toEqual([]);
    expect(EmploymentApi.noticesAt(null)).toEqual([]);
  });

  it('⭐ the LOOK prints it — the puddle precedent, on the room body', async () => {
    const text = await lookText();
    expect(text).toContain('A notice here:');
    expect(text).toContain('HELP WANTED');
    expect(text).toContain('two completed gigs asked');
  });

  it('⚠ and stops printing it the moment the seat is filled', async () => {
    alice.employments = [
      {
        organizationPath: BIZ,
        positionKey: 'hand',
        status: 'employed',
        hiredAt: 0,
        onShiftSince: null,
      },
    ];
    expect(await lookText()).not.toContain('HELP WANTED');
  });
});
