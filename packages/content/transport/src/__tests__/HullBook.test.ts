/**
 * `buy smack` at the yard — ⭐ a ship is TITLE sold off a finite hull book
 *. The book asks her buyer for a NAME the register does
 * not have (asked again while it does), and only then takes the money,
 * mints her by a fresh serial and commissions her; the slot is sold and
 * stays sold; a sold-out yard refuses.
 *
 * The world around the book is stubbed: the commissioning itself is
 * `Ship.commission`'s and is pinned in `Ship.register.test.ts`.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi, type MockInstance } from 'vitest';
import Ship from '@saxonberg/server/mud/platform/idea/Ship';
import ShipRegister from '@saxonberg/server/mud/platform/idea/ShipRegister';
import Avatar from '@saxonberg/server/mud/platform/agent/PrimaryAvatar';
import type { GovernmentDescriptor } from '@saxonberg/server/mud/platform/idea/Government';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { EmploymentApi } from '@saxonberg/server/mud/api/employment';
import { GovernmentApi } from '@saxonberg/server/mud/api/government';
import { PersistableApi } from '@saxonberg/server/mud/api/persistable';
import { BankingApi } from '@saxonberg/server/mud/api/banking';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import Place from '@saxonberg/server/mud/lib/stuff/Place';
import type { SaleOutcome } from '@saxonberg/server/mud/lib/retail/ForSale';
import { makeStuff, makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import HullBook from '../thing/HullBook';

const KIND = '/test/ship/smack';
const QUAY = '/test/yard/quay';
const BOOK = '/test/yard/hull-book';

const GOV: GovernmentDescriptor = {
  key: 'test-city', name: 'the City of Test', description: '', charter: '', treasury: '',
  departments: [], seats: [], standards: [], shipRegister: '/platform/idea/ShipRegister/test-city',
};

function yard(slots = ['the near stocks', 'the far stocks']): HullBook {
  const book = makeStuffAtPath(() => {
    const b = new HullBook();
    b.setHulls(slots.map((slot) => ({ slot, kind: KIND, priceMinor: 5000 })));
    b.setQuay(QUAY);
    return b;
  }, BOOK);
  const shed = makeStuff(() => new Place());
  ContainmentApi.move(book as never, shed as never);
  return book;
}

function buyer(names: Array<string | Error>): { av: Avatar; ask: ReturnType<typeof vi.fn> } {
  const av = makeStuffAtPath(() => new Avatar(), '/platform/agent/Avatar/ann');
  av.setPlayerId('ann');
  const ask = vi.fn();
  for (const n of names) {
    if (n instanceof Error) ask.mockRejectedValueOnce(n);
    else ask.mockResolvedValueOnce(n);
  }
  return { av, ask };
}

function reason(out: SaleOutcome): string | null {
  return out.ok ? null : ((out.note as { reason?: string }).reason ?? null);
}

describe('buy smack — the yard\'s hull book', () => {
  let settle: MockInstance<typeof EmploymentApi.settleSale>;
  let commission: MockInstance<Ship['commission']>;
  let clone: MockInstance<typeof StuffApi.clone>;
  let seed: MockInstance<typeof PersistableApi.restoreOrSeed>;
  let register: ShipRegister;

  beforeEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
    vi.spyOn(EmploymentApi, 'ensureOperatorAt').mockResolvedValue(null as never);
    vi.spyOn(GovernmentApi, 'subjectTo').mockResolvedValue([GOV]);
    vi.spyOn(GovernmentApi, 'getGovernment').mockReturnValue(GOV);
    // The register the government over the yard keeps — reached by its row.
    register = makeStuffAtPath(() => new ShipRegister(), GOV.shipRegister!);
    register.setGovernment('test-city');
    vi.spyOn(register, 'isNameTaken').mockImplementation(async (n: string) => n.toLowerCase() === 'gull');
    vi.spyOn(BankingApi, 'canSettle').mockReturnValue(true);
    settle = vi.spyOn(EmploymentApi, 'settleSale').mockResolvedValue({ tail: '(paid)', receipt: { method: 'cash' } } as never);
    vi.spyOn(StuffApi, 'classForRef').mockResolvedValue(Ship as never);
    clone = vi.spyOn(StuffApi, 'clone').mockImplementation((async () => makeStuff(() => new Ship())) as never);
    seed = vi.spyOn(PersistableApi, 'restoreOrSeed').mockResolvedValue(false);
    vi.spyOn(PersistableApi, 'capture').mockResolvedValue(undefined as never);
    commission = vi.spyOn(Ship.prototype, 'commission').mockResolvedValue('She is entered.');
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('⭐ a taken name is refused and asked again; then she is paid for, minted `<kind>/<serial>`, commissioned at the quay — and her slot is sold', async () => {
    const book = yard();
    const { av, ask } = buyer(['the Gull', 'Tern']);
    const out = await book.sell({ buyer: av, word: 'smack', ask });
    expect(reason(out)).toBeNull();
    expect(ask).toHaveBeenCalledTimes(2);
    expect(settle).toHaveBeenCalledTimes(1);
    expect(settle.mock.calls[0]![0]).toBe(BOOK);
    expect(settle.mock.calls[0]![1]).toBe(5000);
    const serial = seed.mock.calls[0]![1] as string;
    expect(clone.mock.calls[0]![2]).toEqual({ asIdentityPath: `${KIND}/${serial}` });
    expect(commission).toHaveBeenCalledWith(av, 'Tern', QUAY, register);
    expect(book.getSold()).toEqual([expect.objectContaining({ slot: 'the near stocks', ship: `${KIND}/${serial}`, name: 'Tern', buyer: '/platform/agent/Avatar/ann' })]);
    expect(book.onTheStocks().map((h) => h.slot)).toEqual(['the far stocks']);
    expect(book.getLong()).toMatch(/On the stocks: a smack on the far stocks \(5000\)\. Sold off the near stocks: the smack Tern\./);
  });

  it('⭐ two hulls, two sales; then the yard has no hull on the stocks — and nothing moves', async () => {
    const book = yard();
    const one = buyer(['Tern']);
    await book.sell({ buyer: one.av, word: 'smack', ask: one.ask });
    const two = buyer(['Skua']);
    await book.sell({ buyer: two.av, word: 'smack', ask: two.ask });
    expect(book.onTheStocks()).toEqual([]);
    settle.mockClear();
    commission.mockClear();
    const { av, ask } = buyer(['Auk']);
    const out = await book.sell({ buyer: av, word: 'smack', ask });
    expect(reason(out)).toBe('sold-out');
    expect(out.ok ? '' : String(out.line)).toMatch(/no hull on the stocks/);
    expect(ask).not.toHaveBeenCalled();
    expect(settle).not.toHaveBeenCalled();
    expect(commission).not.toHaveBeenCalled();
    expect(book.getLong()).toMatch(/Every hull in it is sold\./);
  });

  it('⚠ the money does not come: the slot goes back on the stocks', async () => {
    const book = yard(['the near stocks']);
    settle.mockResolvedValueOnce(null);
    const { av, ask } = buyer(['Tern']);
    expect(reason(await book.sell({ buyer: av, word: 'smack', ask }))).toBe('insufficient-funds');
    expect(book.onTheStocks()).toHaveLength(1);
    expect(commission).not.toHaveBeenCalled();
  });

  it('⚠ unnamed, she is not sold — no money moves', async () => {
    const book = yard();
    const { av, ask } = buyer([new Error('cancelled')]);
    expect(reason(await book.sell({ buyer: av, word: 'smack', ask }))).toBe('unnamed');
    expect(settle).not.toHaveBeenCalled();
    expect(book.onTheStocks()).toHaveLength(2);
  });

  it('⚠ nobody to name her (a script): no sale', async () => {
    const book = yard();
    expect(reason(await book.sell({ buyer: buyer([]).av, word: 'smack', ask: null }))).toBe('no-namer');
    expect(settle).not.toHaveBeenCalled();
  });

  it('⚠ where nobody keeps a register, no ship is sold — asked before her name, and before the money', async () => {
    vi.mocked(GovernmentApi.subjectTo).mockResolvedValue([{ ...GOV, shipRegister: '' }]);
    const book = yard();
    const { av, ask } = buyer(['Tern']);
    expect(reason(await book.sell({ buyer: av, word: 'smack', ask }))).toBe('no-register');
    expect(ask).not.toHaveBeenCalled();
    expect(settle).not.toHaveBeenCalled();
  });

  it('⚠ a closed yard sells nothing', async () => {
    vi.mocked(EmploymentApi.ensureOperatorAt).mockResolvedValue({ isClosed: () => true } as never);
    vi.spyOn(MixinApi, 'isBusiness').mockReturnValue(true);
    const book = yard();
    const { av, ask } = buyer(['Tern']);
    expect(reason(await book.sell({ buyer: av, word: 'smack', ask }))).toBe('unattended');
    expect(ask).not.toHaveBeenCalled();
  });

  it('the book offers what it lists, sold out or not, and nothing else', async () => {
    const book = yard(['the near stocks']);
    expect(book.offers('smack')).toBe(true);
    expect(book.offers('near stocks')).toBe(true);
    expect(book.offers('rowboat')).toBe(false);
    expect(reason(await book.sell({ buyer: buyer([]).av, word: 'rowboat', ask: null }))).toBe('not-on-shelf');
  });

  it('⚠ a hull names her slot (once), her kind and a whole price', () => {
    const b = makeStuff(() => new HullBook());
    expect(() => b.setHulls([{ slot: '', kind: KIND, priceMinor: 1 }])).toThrow(/slot/);
    expect(() => b.setHulls([{ slot: 'a', kind: KIND, priceMinor: 2.5 }])).toThrow(/whole/);
    expect(() => b.setHulls([{ slot: 'a', kind: KIND, priceMinor: 1 }, { slot: 'a', kind: KIND, priceMinor: 1 }])).toThrow(/two hulls/);
  });
});
