/**
 * `rent canoe for 2 days` — ⭐ a boat let by the day (harbors B3, P18;
 * review 1: the shed's hire book). The hire book prices her kind
 * (`HireBook.rates`); the hirer pays `n × rate` to the house up front (the
 * book is the venue); she is put on hire to them — custody, never title.
 * ⭐ Her hire is the ONE record (review 2): the book keeps no copy and reads
 * its boats out off the boats. Every refusal comes before any money moves.
 */

import '../../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi, type MockInstance } from 'vitest';
import RentController from '../RentController';
import HireBook from '../../../../thing/HireBook';
import { HirableMixin } from '../../../../../lib/retail/Hirable';
import Good from '../../../../thing/Good';
import Avatar from '../../../../agent/PrimaryAvatar';
import { StuffApi } from '../../../../../api/stuff';
import { EmploymentApi } from '../../../../../api/employment';
import { ContainmentApi } from '../../../../../api/containment';
import { MixinApi } from '../../../../../api/mixin';
import { PersistableApi } from '../../../../../api/persistable';
import { WorldClockApi } from '../../../../../api/worldclock';
import { ExecutionContextApi } from '../../../../../api/execution-context';
import { CommandApi, type CommandContext } from '../../../../../api/command';
import { CommandDefinition } from '../../../../../lib/command/CommandDefinition';
import Place from '../../../../../lib/stuff/Place';
import { makeStuff, makeStuffAtPath, withRootContext } from '../../../../../lib/security/__tests__/test-setup';
import type { Stuff } from '../../../../../lib/stuff/Stuff';

class Canoe extends HirableMixin(Good) {}

const CANOE = '/test/thing/canoe';
const BOOK = '/test/put-in/hire-book';
const LANDING = '/test/put-in';
const DAY_S = 86_400;
const NOW_S = 1_000_000;

function shed(rates: Record<string, number> = { [CANOE]: 3 }): { book: HireBook; landing: Place; canoe: Canoe } {
  const landing = makeStuffAtPath(() => new Place(), LANDING);
  const book = makeStuffAtPath(() => {
    const b = new HireBook();
    b.setRates(rates);
    return b;
  }, BOOK);
  ContainmentApi.move(book as never, landing as never);
  const canoe = makeStuffAtPath(() => new Canoe(), CANOE);
  ContainmentApi.move(canoe as never, landing as never);
  return { book, landing, canoe };
}

function hirer(): Avatar {
  const av = makeStuffAtPath(() => new Avatar(), '/platform/agent/Avatar/ann');
  av.setPlayerId('ann');
  return av;
}

async function rent(av: Avatar, book: HireBook, boat: Stuff, days?: string): Promise<CommandContext> {
  const ctx = CommandApi.createCommandContext({
    commandGiver: av as never,
    location: makeStuff(() => new Place()) as never,
    commandSource: book as never,
    commandText: `rent canoe${days ? ` for ${days}` : ''}`,
    executionId: 't',
    commandId: 't',
    verb: 'rent',
    command: CommandDefinition.fromYaml('verbs: [rent]\ncontroller: NoopController\ndescription: stub\n', '<test>'),
  });
  await withRootContext(null, 'rent.test', () => {
    ExecutionContextApi.tagActingAuthor(av);
    return makeStuff(() => new RentController()).execute(
      { boat: { stuff: boat as never, raw: 'canoe' }, days, book: { stuff: book as never, raw: '' } } as never,
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
    vi.spyOn(PersistableApi, 'capture').mockResolvedValue(undefined as never);
    vi.spyOn(WorldClockApi, 'getNow').mockReturnValue({ rawValue: () => NOW_S } as never);
    settle = vi.spyOn(EmploymentApi, 'settleSale').mockResolvedValue({ tail: '(paid)', receipt: { method: 'cash' } } as never);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('⭐ two days cost two days\' hire, paid to the house; she is out on hire to the hirer, due back in two days', async () => {
    const { book, canoe } = shed();
    const av = hirer();
    const ctx = await rent(av, book, canoe, '2 days');
    expect(rejection(ctx)).toBeNull();
    expect(settle).toHaveBeenCalledTimes(1);
    expect(settle.mock.calls[0]![0]).toBe(BOOK);
    expect(settle.mock.calls[0]![1]).toBe(6);
    expect(canoe.hiredBy()).toBe('/platform/agent/Avatar/ann');
    expect(canoe.hiredUntilS()).toBe(NOW_S + 2 * DAY_S);
    expect(canoe.home()).toBe(LANDING);
    expect(canoe.hiredFrom()).toBe(BOOK);
    // ⭐ The book reads her out off her own hire — it wrote nothing.
    expect(book.hiresOut().map((h) => h.boat)).toEqual([canoe]);
  });

  it('without `for`, a day; in words, as many', async () => {
    const { book, canoe } = shed();
    await rent(hirer(), book, canoe);
    expect(settle.mock.calls[0]![1]).toBe(3);
    canoe.endHire();
    await rent(hirer(), book, canoe, 'three days');
    expect(settle.mock.calls[1]![1]).toBe(9);
  });

  it('⭐ the hire book\'s page names what it lets, and a boat out past her day — and forgets her when she is home', async () => {
    const { book, canoe } = shed();
    await rent(hirer(), book, canoe, '1 day');
    expect(book.getLong()).toMatch(/For hire: canoe \(3 a day\)\./);
    expect(book.getLong()).not.toMatch(/past its day/);
    vi.mocked(WorldClockApi.getNow).mockReturnValue({ rawValue: () => NOW_S + 4 * DAY_S } as never);
    expect(book.getLong()).toMatch(/a canoe out with .*, 3 days past its day/);
    canoe.endHire();
    expect(book.hiresOut()).toEqual([]);
    expect(book.getLong()).not.toMatch(/past its day/);
  });

  it('⚠ refused before any money moves: a kind the house does not let; a boat out already; a span that is not days', async () => {
    const none = shed({});
    expect(rejection(await rent(hirer(), none.book, none.canoe))).toBe('not-let');
    StuffApi.clearAll();
    const { book, canoe } = shed();
    expect(rejection(await rent(hirer(), book, canoe, 'a while'))).toBe('bad-days');
    await rent(hirer(), book, canoe);
    settle.mockClear();
    expect(rejection(await rent(hirer(), book, canoe))).toBe('out-on-hire');
    expect(settle).not.toHaveBeenCalled();
  });

  it('⚠ a boat not lying at the book\'s landing is not let from it', async () => {
    const { book, canoe } = shed();
    const elsewhere = makeStuff(() => new Place());
    ContainmentApi.move(canoe as never, elsewhere as never);
    expect(rejection(await rent(hirer(), book, canoe))).toBe('not-here');
    expect(settle).not.toHaveBeenCalled();
  });

  it('⚠ a boat somebody bought is theirs, not the house\'s to let', async () => {
    const { book, canoe } = shed();
    vi.spyOn(canoe, 'stampedOwner').mockReturnValue({ kind: 'player', templatePath: '/platform/agent/Avatar/bob' });
    expect(rejection(await rent(hirer(), book, canoe))).toBe('not-the-houses');
    expect(settle).not.toHaveBeenCalled();
  });

  it('⚠ a rate is a positive whole number a day', () => {
    const s = makeStuff(() => new HireBook());
    expect(() => s.setRates({ [CANOE]: 0 })).toThrow(/positive whole/);
    expect(() => s.setRates({ [CANOE]: 2.5 })).toThrow(/positive whole/);
    expect(() => s.setRates([1])).toThrow(/expected/);
  });

  it('⚠ a closed house lets nothing', async () => {
    const { book, canoe } = shed();
    vi.mocked(EmploymentApi.ensureOperatorAt).mockResolvedValue({ isClosed: () => true, getIdentityPath: () => '/test/put-in/outfit' } as never);
    vi.spyOn(MixinApi, 'isBusiness').mockReturnValue(true);
    expect(rejection(await rent(hirer(), book, canoe))).toBe('unattended');
    expect(settle).not.toHaveBeenCalled();
  });

  it('⭐ the house\'s own boat is let; a boat stamped to the house is still the house\'s', async () => {
    const { book, canoe } = shed();
    vi.mocked(EmploymentApi.ensureOperatorAt).mockResolvedValue({ isClosed: () => false, getIdentityPath: () => '/test/put-in/outfit' } as never);
    vi.spyOn(MixinApi, 'isBusiness').mockReturnValue(true);
    vi.spyOn(canoe, 'stampedOwner').mockReturnValue({ kind: 'organization', templatePath: '/test/put-in/outfit' });
    expect(rejection(await rent(hirer(), book, canoe))).toBeNull();
  });

  it('⭐ one record of a hire: the book persists nothing, and a boat let from another book is not on its page', async () => {
    const { book, canoe } = shed();
    expect(MixinApi.isPersistable(book as never)).toBe(false);
    await rent(hirer(), book, canoe, '1 day');
    const other = makeStuffAtPath(() => {
      const b = new HireBook();
      b.setRates({ [CANOE]: 3 });
      return b;
    }, '/test/elsewhere/hire-book');
    expect(other.hiresOut()).toEqual([]);
    vi.mocked(WorldClockApi.getNow).mockReturnValue({ rawValue: () => NOW_S + 4 * DAY_S } as never);
    expect(other.getLong()).not.toMatch(/past its day/);
    expect(book.getLong()).toMatch(/past its day/);
  });

  it('⛔ nothing but `rent` puts a boat on hire', () => {
    const { canoe } = shed();
    expect(() => canoe.hireTo(hirer(), NOW_S + DAY_S, LANDING, BOOK)).toThrow();
  });
});
