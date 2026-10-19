/**
 * ⭐ `inventory [<thing>]` — the LEDGER (maritime revision 2): complete
 * and grouped, through the one visibility rule `look` reads too; `look
 * in <thing>` is the same ledger, and `look` itself summarises past four.
 */

import '../../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import InventoryController from '../InventoryController';
import LookController from '../../perception/LookController';
import QueryController from '../../perception/QueryController';
import { MqlApi } from '../../../../../api/mql';
import { ContainmentApi } from '../../../../../api/containment';
import { StuffApi } from '../../../../../api/stuff';
import { MessageApi } from '../../../../../api/message';
import { PerceptionApi, type VisibleContents } from '../../../../../api/perception';
import type { Mml } from '../../../../../api/mml';
import { CommandApi, type CommandContext } from '../../../../../api/command';
import { CommandDefinition } from '../../../../../lib/command/CommandDefinition';
import { Idea } from '../../../../../lib/stuff/Idea';
import Place from '../../../../../lib/stuff/Place';
import { CommandGiverMixin } from '../../../../../lib/command/CommandGiver';
import { SensorMixin } from '../../../../../lib/message/Sensor';
import { ContainerMixin } from '../../../../../lib/spatial/Container';
import { ContainableMixin } from '../../../../../lib/spatial/Containable';
import { NamedMixin } from '../../../../../lib/description/Named';
import { VisibleMixin } from '../../../../../lib/description/Visible';
import { PerceptibleMixin } from '../../../../../lib/description/Perceptible';
import type { Stuff } from '../../../../../lib/stuff/Stuff';
import { makeStuff, withRootContext } from '../../../../../lib/security/__tests__/test-setup';

class Body extends PerceptibleMixin(VisibleMixin(SensorMixin(CommandGiverMixin(ContainerMixin(ContainableMixin(NamedMixin(Idea))))))) {
  static _mixinName = 'LedgerBody';
}
const named = (n: string): Stuff => makeStuff(() => { const b = new Body(); b.setName(n); return b; });

let me: Body;
let other: Body;
let said: string[];
let visible: VisibleContents;

function ctx(verb: string): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: me as never,
    location: makeStuff(() => new Place()) as never,
    commandText: verb, executionId: 't', commandId: 't', verb,
    command: CommandDefinition.fromYaml(`verbs: [${verb}]\ncontroller: X\ndescription: d\n`, '<t>'),
  });
}

beforeEach(() => {
  StuffApi.clearAll();
  said = [];
  me = makeStuff(() => { const b = new Body(); b.setName('Me'); return b; });
  other = makeStuff(() => { const b = new Body(); b.setName('Ruth'); return b; });
  visible = { worn: [], held: [], carried: [], shut: false };
  vi.spyOn(PerceptionApi, 'visibleContentsOf').mockImplementation(() => visible);
  vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
    const b: Record<string, unknown> = {};
    b.topic = () => b;
    b.meta = () => b;
    b.toSelf = (m: Mml) => { said.push(m.toString()); return b; };
    b.toPeers = () => b;
    b.send = () => {};
    return b as never;
  });
});
afterEach(() => vi.restoreAllMocks());

const inventory = (target?: Stuff): Promise<void> =>
  withRootContext(null, 'ledger.test', async () => {
    makeStuff(() => new InventoryController()).execute(
      (target ? { target: { stuff: target, raw: 'x' } } : {}) as never, ctx('inventory'),
    );
  });

describe('inventory', () => {
  it('⭐ yourself: grouped — wearing, holding, carrying', async () => {
    visible = { worn: [named('shirt')], held: [named('sword')], carried: [named('coin')], shut: false };
    await inventory();
    expect(said.join('\n')).toMatch(/You are wearing: [^\n]*shirt[^]*You are holding: [^\n]*sword[^]*You are carrying: [^\n]*coin/);
  });

  it('⭐ another person: what they wear and hold, through the one rule', async () => {
    visible = { worn: [named('cloak')], held: [named('lantern')], carried: [], shut: false };
    await inventory(other);
    const out = said.join('\n');
    expect(out).toMatch(/Wearing: [^\n]*cloak/);
    expect(out).toMatch(/Holding: [^\n]*lantern/);
    expect(PerceptionApi.visibleContentsOf).toHaveBeenCalledWith(me, other);
  });

  it('a shut container refuses in words', async () => {
    visible = { worn: [], held: [], carried: [], shut: true };
    await inventory(other);
    expect(said.join('\n')).toMatch(/is shut/);
  });

  it('nothing at all: says so', async () => {
    await inventory();
    expect(said.join('\n')).toMatch(/You are not carrying anything/);
  });
});

describe('look and the ledger', () => {
  const look = (model: unknown): Promise<void> =>
    withRootContext(null, 'ledger.test', async () => {
      await makeStuff(() => new LookController()).execute(model as never, ctx('look'));
    });

  it('⭐ `look in <thing>` is the same ledger', async () => {
    visible = { worn: [], held: [], carried: [named('lime')], shut: false };
    await look({ target: { stuff: other, raw: 'crate', prep: 'in' } });
    expect(said.join('\n')).toMatch(/In it: [^\n]*lime/);
  });

  it('⭐⭐ `look` at a person shows what they wear and hold — and summarises past four', async () => {
    other.setKeywords(['ruth']);
    visible = {
      worn: ['a', 'b', 'c', 'd', 'e', 'f'].map((n) => named(`ring ${n}`)),
      held: [named('lantern')],
      carried: [],
      shut: false,
    };
    await look({ target: { stuff: other, raw: 'ruth' } });
    const out = said.join('\n');
    expect(out).toMatch(/Wearing: [^\n]*ring a[^\n]*ring d[^\n]*and 2 more things — `inventory ruth`/);
    expect(out).not.toMatch(/ring e/);
    expect(out).toMatch(/Holding: [^\n]*lantern/);
  });
});

describe('`query --ledger` and a shut holder (maritime revision 2′)', () => {
  const query = (model: unknown): Promise<void> =>
    withRootContext(null, 'ledger.test', async () => {
      await makeStuff(() => new QueryController()).execute(model as never, ctx('query'));
    });

  it('⭐ `query --ledger bob:i` is the same grouped ledger `inventory bob` gives — of just what the query named', async () => {
    const ring = named('ring');
    const lantern = named('lantern');
    const hat = named('hat');
    for (const x of [ring, lantern, hat]) ContainmentApi.move(x as never, other as never);
    visible = { worn: [ring, hat], held: [lantern], carried: [], shut: false };
    await query({ set: { stuff: [ring, lantern], raw: 'ruth:i:[keyword.ring],ruth:i:[keyword.lantern]' }, ledger: true });
    const out = said.join('\n');
    expect(out).toMatch(/Wearing: [^\n]*ring/);
    expect(out).toMatch(/Holding: [^\n]*lantern/);
    expect(out).not.toMatch(/hat/);
  });

  it('⭐ an empty query into something shut says it is shut — not "nothing there"', async () => {
    visible = { worn: [], held: [], carried: [], shut: true };
    vi.spyOn(MqlApi, 'resolveOne').mockReturnValue({ stuff: other } as never);
    await query({ set: { stuff: [], raw: 'chest:i' } });
    expect(said.join("\n")).toMatch(/ is shut\./);
  });

  it('an empty set otherwise: nothing there', async () => {
    await query({ set: { stuff: [], raw: 'all brass' } });
    expect(said.join('\n')).toMatch(/You see nothing there/);
  });
});
