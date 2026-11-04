/**
 * `buy rowboat` at the put-in — ⭐ a boat is an ordinary good that is
 * already there (harbors review 1). Too big for any shelf, she lies on the
 * shingle, the house's; the counter prices her (`prices`, no line), and a
 * sale settles, transfers her title and leaves her where she lies — her
 * bow line in her. Finite: a boat sold is not the house's to sell again,
 * and nothing restocks her.
 */

import '../../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi, type MockInstance } from 'vitest';
import BuyController from '../BuyController';
import StockBase from '../../../../../lib/retail/Stock';
import { HirableMixin } from '../../../../../lib/retail/Hirable';
import Good from '../../../../thing/Good';
import Avatar from '../../../../agent/PrimaryAvatar';
import { StuffApi } from '../../../../../api/stuff';
import { EmploymentApi } from '../../../../../api/employment';
import { ContainmentApi } from '../../../../../api/containment';
import { AppApi } from '../../../../../api/app';
import { ExecutionContextApi } from '../../../../../api/execution-context';
import { CommandApi, type CommandContext } from '../../../../../api/command';
import { CommandDefinition } from '../../../../../lib/command/CommandDefinition';
import Place from '../../../../../lib/stuff/Place';
import { makeStuff, makeStuffAtPath, withRootContext } from '../../../../../lib/security/__tests__/test-setup';
import type { ChattelOwner } from '../../../../../api/chattel';

class Stock extends StockBase {}
class Rowboat extends HirableMixin(Good) {}

const ROWBOAT = '/test/thing/rowboat';
const HOUSE = '/test/put-in/outfit';

function putIn(): { stock: Stock; landing: Place; boat: Rowboat } {
  const landing = makeStuff(() => new Place());
  const stock = makeStuffAtPath(() => {
    const s = new Stock();
    s.setPrice(ROWBOAT, 160);
    s.discipline = 'scrum';
    s.attendDurationMs = 0;
    s.staffingPolicy = 'self-service';
    s.serverPositionKeys = ['keeper'];
    s.businessPath = HOUSE;
    return s;
  }, '/test/put-in/counter');
  ContainmentApi.move(stock as never, landing as never);
  const boat = makeStuffAtPath(() => new Rowboat(), ROWBOAT);
  ContainmentApi.move(boat as never, landing as never);
  return { stock, landing, boat };
}

async function buy(stock: Stock, thing = 'rowboat'): Promise<CommandContext> {
  const av = makeStuffAtPath(() => new Avatar(), '/platform/agent/Avatar/ann');
  av.setPlayerId('ann');
  const ctx = CommandApi.createCommandContext({
    commandGiver: av as never,
    location: makeStuff(() => new Place()) as never,
    commandSource: stock as never,
    commandText: `buy ${thing}`,
    executionId: 't',
    commandId: 't',
    verb: 'buy',
    command: CommandDefinition.fromYaml('verbs: [buy]\ncontroller: NoopController\ndescription: stub\n', '<test>'),
  });
  await withRootContext(null, 'buy-where-it-lies.test', () => {
    ExecutionContextApi.tagActingAuthor(av);
    return makeStuff(() => new BuyController()).execute({ counter: { stuff: stock as never, raw: '' }, thing } as never, ctx);
  });
  return ctx;
}

function rejection(ctx: CommandContext): string | null {
  return (ctx.getNotes().find((n) => n.kind === 'controller-rejected') as { reason?: string } | undefined)?.reason ?? null;
}

describe('buy — a boat sold where she lies (harbors review 1)', () => {
  let settle: MockInstance<typeof EmploymentApi.settleSale>;
  let owners: Map<Rowboat, ChattelOwner | null>;

  beforeEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
    vi.spyOn(AppApi, 'setting').mockImplementation((() => '') as never);
    vi.spyOn(EmploymentApi, 'ensureOperatorAt').mockResolvedValue(null as never);
    settle = vi.spyOn(EmploymentApi, 'settleSale').mockResolvedValue({ tail: '(paid)', receipt: { method: 'cash' } } as never);
    // The title registry, in memory: a transfer is what `stampedOwner` reads back.
    owners = new Map();
    vi.spyOn(Rowboat.prototype, 'stampedOwner').mockImplementation(function (this: Rowboat) {
      return owners.get(this) ?? null;
    });
    vi.spyOn(Rowboat.prototype, 'transferChattel').mockImplementation(async function (this: Rowboat, to) {
      owners.set(this, { kind: 'player', templatePath: to.getIdentityPath() ?? '' });
      return { ok: true, chattelId: 'c1' };
    });
    vi.spyOn(Rowboat.prototype, 'followCustody').mockResolvedValue(undefined);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('⭐ the house\'s boat on the shingle is sold at the counter\'s price, her title to the buyer — and she stays where she lies', async () => {
    const { stock, landing, boat } = putIn();
    const ctx = await buy(stock);
    expect(rejection(ctx)).toBeNull();
    expect(settle).toHaveBeenCalledTimes(1);
    expect(settle.mock.calls[0]![1]).toBe(160);
    expect(boat.stampedOwner()).toEqual({ kind: 'player', templatePath: '/platform/agent/Avatar/ann' });
    expect(boat.getContainer()).toBe(landing);
    expect(boat.followCustody).toHaveBeenCalled();
  });

  it('⭐ finite: once she is sold there is none of the house\'s to sell — and the counter says so', async () => {
    const { stock } = putIn();
    await buy(stock);
    settle.mockClear();
    const ctx = await buy(stock);
    expect(rejection(ctx)).toBe('sold-out');
    expect(settle).not.toHaveBeenCalled();
  });

  it('⚠ a boat out on hire, or stamped to somebody else, is not the house\'s to sell', async () => {
    const { stock, boat } = putIn();
    owners.set(boat, { kind: 'player', templatePath: '/platform/agent/Avatar/bob' });
    expect(rejection(await buy(stock))).toBe('sold-out');
    owners.set(boat, null);
    boat.hire = { id: 'h', by: '/platform/agent/Avatar/bob', byName: 'Bob', untilS: 1, home: '/x', letter: '/y' };
    expect(rejection(await buy(stock))).toBe('sold-out');
    expect(settle).not.toHaveBeenCalled();
  });

  it('a boat stamped to the house itself is the house\'s to sell', async () => {
    const { stock, boat } = putIn();
    owners.set(boat, { kind: 'organization', templatePath: HOUSE });
    expect(rejection(await buy(stock))).toBeNull();
  });

  it('the counter offers what it prices to sell where it lies', () => {
    const { stock } = putIn();
    expect(stock.offers('rowboat')).toBe(true);
    expect(stock.offers('canoe')).toBe(false);
  });
});
