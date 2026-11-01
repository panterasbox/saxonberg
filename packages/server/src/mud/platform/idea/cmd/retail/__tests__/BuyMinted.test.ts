/**
 * `buy smack` — ⭐ a line built to order (harbors B2, P17). The counter
 * prices a kind it cannot shelve; the sale asks her buyer for a NAME the
 * register does not have (asked again while it does), and only then takes
 * the money, mints her keyed by a fresh serial, and commissions her.
 *
 * The world around the controller is stubbed: the commissioning itself is
 * `Ship.commission`'s and is pinned in `Ship.register.test.ts`.
 */

import '../../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi, type MockInstance } from 'vitest';
import BuyController from '../BuyController';
import StockBase from '../../../../../lib/retail/Stock';
import Ship from '../../../Ship';
import Avatar from '../../../../agent/PrimaryAvatar';
import { StuffApi } from '../../../../../api/stuff';
import { EmploymentApi } from '../../../../../api/employment';
import { GovernmentApi } from '../../../../../api/government';
import { ShipRegisterApi } from '../../../../../api/ship-register';
import { PersistableApi } from '../../../../../api/persistable';
import { BankingApi } from '../../../../../api/banking';
import { ContainmentApi } from '../../../../../api/containment';
import { ExecutionContextApi } from '../../../../../api/execution-context';
import { CommandApi, type CommandContext } from '../../../../../api/command';
import { CommandDefinition } from '../../../../../lib/command/CommandDefinition';
import Place from '../../../../../lib/stuff/Place';
import { makeStuff, makeStuffAtPath, withRootContext } from '../../../../../lib/security/__tests__/test-setup';
import type { GovernmentDescriptor } from '../../../Government';
import type { Stuff } from '../../../../../lib/stuff/Stuff';

class Stock extends StockBase {}

const KIND = '/test/ship/smack';
const QUAY = '/test/yard/quay';
const COUNTER = '/test/yard/counter';

const GOV: GovernmentDescriptor = {
  key: 'test-city', name: 'the City of Test', description: '', charter: '', treasury: '',
  departments: [], seats: [], standards: [], shipRegister: '/platform/idea/ShipRegister/test-city',
};

function yard(): Stock {
  const stock = makeStuffAtPath(() => {
    const s = new Stock();
    s.setStockLines([{ itemTemplatePath: KIND, par: 1, minted: true, deliversTo: QUAY }]);
    s.setPrice(KIND, 5000);
    s.discipline = 'line';
    s.attendDurationMs = 0;
    s.staffingPolicy = 'self-service';
    s.serverPositionKeys = ['shipwright'];
    return s;
  }, COUNTER);
  const shed = makeStuff(() => new Place());
  ContainmentApi.move(stock as never, shed as never);
  return stock;
}

function buyer(names: Array<string | Error>): { av: Avatar; ask: ReturnType<typeof vi.fn> } {
  const av = makeStuffAtPath(() => new Avatar(), '/platform/agent/Avatar/ann');
  av.setPlayerId('ann');
  const ask = vi.fn();
  for (const n of names) {
    if (n instanceof Error) ask.mockRejectedValueOnce(n);
    else ask.mockResolvedValueOnce(n);
  }
  vi.spyOn(av, 'getInteractives').mockReturnValue(new Set([{ promptText: ask, sendMessage: vi.fn() } as never]));
  return { av, ask };
}

async function buy(av: Avatar, stock: Stock, thing = 'smack'): Promise<CommandContext> {
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
  await withRootContext(null, 'buy-minted.test', () => {
    ExecutionContextApi.tagActingAuthor(av);
    return makeStuff(() => new BuyController()).execute(
      { counter: { stuff: stock as never, raw: '' }, thing } as never,
      ctx,
    );
  });
  return ctx;
}

function rejection(ctx: CommandContext): string | null {
  return (ctx.getNotes().find((n) => n.kind === 'controller-rejected') as { reason?: string } | undefined)?.reason ?? null;
}

describe('buy — a ship built to order (harbors B2)', () => {
  let settle: MockInstance<typeof EmploymentApi.settleSale>;
  let commission: MockInstance<Ship['commission']>;
  let seed: MockInstance<typeof PersistableApi.restoreOrSeed>;

  beforeEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
    vi.spyOn(EmploymentApi, 'ensureOperatorAt').mockResolvedValue(null as never);
    vi.spyOn(GovernmentApi, 'subjectTo').mockResolvedValue([GOV]);
    vi.spyOn(GovernmentApi, 'getGovernment').mockReturnValue(GOV);
    vi.spyOn(ShipRegisterApi, 'keepsRegister').mockResolvedValue(true);
    vi.spyOn(ShipRegisterApi, 'isNameTaken').mockImplementation(async (_g: string, n: string) => n.toLowerCase() === 'gull');
    vi.spyOn(BankingApi, 'canSettle').mockReturnValue(true);
    settle = vi.spyOn(EmploymentApi, 'settleSale').mockResolvedValue({ tail: '(paid)', receipt: { method: 'cash' } } as never);
    vi.spyOn(StuffApi, 'classForRef').mockResolvedValue(Ship as never);
    vi.spyOn(StuffApi, 'clone').mockImplementation((async () => makeStuffAtPath(() => new Ship(), KIND)) as never);
    seed = vi.spyOn(PersistableApi, 'restoreOrSeed').mockResolvedValue(false);
    commission = vi.spyOn(Ship.prototype, 'commission').mockResolvedValue('She is entered.');
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('⭐ a taken name is refused and asked again; then she is paid for, minted by a fresh serial, and commissioned', async () => {
    const stock = yard();
    const { av, ask } = buyer(['the Gull', 'Tern']);
    const ctx = await buy(av, stock);
    expect(rejection(ctx)).toBeNull();
    expect(ask).toHaveBeenCalledTimes(2);
    expect(settle).toHaveBeenCalledTimes(1);
    expect(settle.mock.calls[0]![1]).toBe(5000);
    expect(typeof seed.mock.calls[0]![1]).toBe('string');
    expect(commission).toHaveBeenCalledWith(av, 'Tern', QUAY, 'test-city');
    // Nothing was shelved: a minted line restocks nothing.
    await stock.reset();
    expect((stock as unknown as { getContents(): Stuff[] }).getContents()).toHaveLength(0);
  });

  it('⚠ unnamed, she is not sold — no money moves', async () => {
    const stock = yard();
    const { av } = buyer([new Error('cancelled')]);
    const ctx = await buy(av, stock);
    expect(rejection(ctx)).toBe('unnamed');
    expect(settle).not.toHaveBeenCalled();
    expect(commission).not.toHaveBeenCalled();
  });

  it('⚠ where nobody keeps a register, no ship is sold — asked before her name, and before the money', async () => {
    vi.mocked(ShipRegisterApi.keepsRegister).mockResolvedValue(false);
    const stock = yard();
    const { av, ask } = buyer(['Tern']);
    const ctx = await buy(av, stock);
    expect(rejection(ctx)).toBe('no-register');
    expect(ask).not.toHaveBeenCalled();
    expect(settle).not.toHaveBeenCalled();
  });

  it('⚠ a minted line names where it is delivered, and has no source', () => {
    const s = makeStuff(() => new Stock());
    expect(() => s.setStockLines([{ itemTemplatePath: KIND, par: 1, minted: true }])).toThrow(/deliversTo/);
    expect(() => s.setStockLines([{ itemTemplatePath: KIND, par: 1, deliversTo: QUAY }])).toThrow(/minted/);
    expect(() =>
      s.setStockLines([{ itemTemplatePath: KIND, par: 1, minted: true, deliversTo: QUAY, from: { supplier: '/x' } }]),
    ).toThrow(/no from/);
  });
});
