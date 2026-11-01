/**
 * `rent canoe for 2 days` — ⭐ a boat let by the day (harbors B3, P18).
 * The counter prices her kind (`Stock.rates`); the hirer pays `n × rate`
 * to the house up front; she is put on hire to them — custody, never
 * title — and the counter keeps its copy so the shed's `look` can name a
 * boat out past her day. Every refusal comes before any money moves.
 */

import '../../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi, type MockInstance } from 'vitest';
import RentController from '../RentController';
import StockBase from '../../../../../lib/retail/Stock';
import { HirableMixin } from '../../../../../lib/retail/Hirable';
import Good from '../../../../thing/Good';
import Avatar from '../../../../agent/PrimaryAvatar';
import { StuffApi } from '../../../../../api/stuff';
import { EmploymentApi } from '../../../../../api/employment';
import { ContainmentApi } from '../../../../../api/containment';
import { WorldClockApi } from '../../../../../api/worldclock';
import { ExecutionContextApi } from '../../../../../api/execution-context';
import { CommandApi, type CommandContext } from '../../../../../api/command';
import { CommandDefinition } from '../../../../../lib/command/CommandDefinition';
import Place from '../../../../../lib/stuff/Place';
import { makeStuff, makeStuffAtPath, withRootContext } from '../../../../../lib/security/__tests__/test-setup';
import type { Stuff } from '../../../../../lib/stuff/Stuff';

class Stock extends StockBase {}
class Canoe extends HirableMixin(Good) {}

const CANOE = '/test/thing/canoe';
const COUNTER = '/test/put-in/counter';
const LANDING = '/test/put-in';
const DAY_S = 86_400;
const NOW_S = 1_000_000;

function shed(rates: Record<string, number> = { [CANOE]: 3 }): { stock: Stock; landing: Place; canoe: Canoe } {
  const landing = makeStuffAtPath(() => new Place(), LANDING);
  const stock = makeStuffAtPath(() => {
    const s = new Stock();
    s.setRates(rates);
    s.discipline = 'scrum';
    s.attendDurationMs = 0;
    s.staffingPolicy = 'self-service';
    s.serverPositionKeys = ['keeper'];
    s.businessPath = '/test/put-in/outfit';
    return s;
  }, COUNTER);
  ContainmentApi.move(stock as never, landing as never);
  const canoe = makeStuffAtPath(() => new Canoe(), CANOE);
  ContainmentApi.move(canoe as never, landing as never);
  return { stock, landing, canoe };
}

function hirer(): Avatar {
  const av = makeStuffAtPath(() => new Avatar(), '/platform/agent/Avatar/ann');
  av.setPlayerId('ann');
  return av;
}

async function rent(av: Avatar, stock: Stock, boat: Stuff, days?: string): Promise<CommandContext> {
  const ctx = CommandApi.createCommandContext({
    commandGiver: av as never,
    location: makeStuff(() => new Place()) as never,
    commandSource: stock as never,
    commandText: `rent canoe${days ? ` for ${days}` : ''}`,
    executionId: 't',
    commandId: 't',
    verb: 'rent',
    command: CommandDefinition.fromYaml('verbs: [rent]\ncontroller: NoopController\ndescription: stub\n', '<test>'),
  });
  await withRootContext(null, 'rent.test', () => {
    ExecutionContextApi.tagActingAuthor(av);
    return makeStuff(() => new RentController()).execute(
      { boat: { stuff: boat as never, raw: 'canoe' }, days, counter: { stuff: stock as never, raw: '' } } as never,
      ctx,
    );
  });
  return ctx;
}

function rejection(ctx: CommandContext): string | null {
  return (ctx.getNotes().find((n) => n.kind === 'controller-rejected') as { reason?: string } | undefined)?.reason ?? null;
}

describe('rent — a boat by the day (harbors B3)', () => {
  let settle: MockInstance<typeof EmploymentApi.settleSale>;

  beforeEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
    vi.spyOn(EmploymentApi, 'ensureOperatorAt').mockResolvedValue(null as never);
    vi.spyOn(WorldClockApi, 'getNow').mockReturnValue({ rawValue: () => NOW_S } as never);
    settle = vi.spyOn(EmploymentApi, 'settleSale').mockResolvedValue({ tail: '(paid)', receipt: { method: 'cash' } } as never);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('⭐ two days cost two days\' hire, paid to the house; she is out on hire to the hirer, due back in two days', async () => {
    const { stock, canoe } = shed();
    const av = hirer();
    const ctx = await rent(av, stock, canoe, '2 days');
    expect(rejection(ctx)).toBeNull();
    expect(settle).toHaveBeenCalledTimes(1);
    expect(settle.mock.calls[0]![0]).toBe(COUNTER);
    expect(settle.mock.calls[0]![1]).toBe(6);
    expect(canoe.hiredBy()).toBe('/platform/agent/Avatar/ann');
    expect(canoe.hiredUntilS()).toBe(NOW_S + 2 * DAY_S);
    expect(canoe.home()).toBe(LANDING);
    expect(stock.hires).toHaveLength(1);
    expect(stock.hires[0]!.id).toBe(canoe.hire!.id);
  });

  it('without `for`, a day; in words, as many', async () => {
    const { stock, canoe } = shed();
    await rent(hirer(), stock, canoe);
    expect(settle.mock.calls[0]![1]).toBe(3);
    canoe.endHire();
    await rent(hirer(), stock, canoe, 'three days');
    expect(settle.mock.calls[1]![1]).toBe(9);
  });

  it('⭐ the shed\'s look names what it lets, and a boat out past her day — and forgets her when she is home', async () => {
    const { stock, canoe } = shed();
    await rent(hirer(), stock, canoe, '1 day');
    expect(stock.getLong()).toMatch(/For hire: canoe \(3 a day\)\./);
    expect(stock.getLong()).not.toMatch(/past its day/);
    vi.mocked(WorldClockApi.getNow).mockReturnValue({ rawValue: () => NOW_S + 4 * DAY_S } as never);
    expect(stock.getLong()).toMatch(/a canoe out with .*, 3 days past its day/);
    canoe.endHire();
    expect(stock.hires).toEqual([]);
    expect(stock.getLong()).not.toMatch(/past its day/);
  });

  it('⚠ refused before any money moves: a kind the house does not let; a boat out already; a span that is not days', async () => {
    const none = shed({});
    expect(rejection(await rent(hirer(), none.stock, none.canoe))).toBe('not-let');
    StuffApi.clearAll();
    const { stock, canoe } = shed();
    expect(rejection(await rent(hirer(), stock, canoe, 'a while'))).toBe('bad-days');
    await rent(hirer(), stock, canoe);
    settle.mockClear();
    expect(rejection(await rent(hirer(), stock, canoe))).toBe('out-on-hire');
    expect(settle).not.toHaveBeenCalled();
  });

  it('⚠ a boat not lying at the counter\'s landing is not let from it', async () => {
    const { stock, canoe } = shed();
    const elsewhere = makeStuff(() => new Place());
    ContainmentApi.move(canoe as never, elsewhere as never);
    expect(rejection(await rent(hirer(), stock, canoe))).toBe('not-here');
    expect(settle).not.toHaveBeenCalled();
  });

  it('⚠ a boat somebody bought is theirs, not the house\'s to let', async () => {
    const { stock, canoe } = shed();
    vi.spyOn(canoe, 'stampedOwner').mockReturnValue({ kind: 'player', templatePath: '/platform/agent/Avatar/bob' });
    expect(rejection(await rent(hirer(), stock, canoe))).toBe('not-the-houses');
    expect(settle).not.toHaveBeenCalled();
  });

  it('⚠ a rate is a positive whole number a day', () => {
    const s = makeStuff(() => new Stock());
    expect(() => s.setRates({ [CANOE]: 0 })).toThrow(/positive whole/);
    expect(() => s.setRates({ [CANOE]: 2.5 })).toThrow(/positive whole/);
    expect(() => s.setRates([1])).toThrow(/expected/);
  });

  it('⛔ nothing but `rent` puts a boat on hire', () => {
    const { canoe } = shed();
    expect(() => canoe.hireTo(hirer(), NOW_S + DAY_S, LANDING, COUNTER)).toThrow();
  });
});
