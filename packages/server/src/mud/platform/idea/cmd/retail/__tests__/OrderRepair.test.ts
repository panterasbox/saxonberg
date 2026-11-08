/**
 * `order repair <thing>` — the paid mend is somebody's WORK (repair W3,
 * D12, AC 5–7).
 *
 * The orchestration, with the hand, the diagnosis and the mend stubbed at
 * the Api (their own suites prove them; the drive proves the live wiring):
 * nobody on shift refuses in words and takes nothing; a hand quotes fault
 * by fault BEFORE money is taken, and the price differs by fault; no
 * answer and a "no" take nothing; a "yes" mends as THE HAND and collects
 * the quote — once; a piece-rate hand is paid for the piece.
 */

import '../../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import OrderController from '../OrderController';
import Tariff from '../../../../thing/Tariff';
import { CraftingApi, NOBODY_TO_WORK } from '../../../../../api/crafting';
import type { Fault, RepairOutcome, DiagnoseOutcome } from '../../../../../api/crafting';
import { MessageApi } from '../../../../../api/message';
import { MqlApi } from '../../../../../api/mql';
import { PricedOfferMixin } from '../../../../../lib/commerce/PricedOffer';
import { WashPolicy } from '../../../../../lib/cleanliness/WashPolicy';
import Garment from '../../../../thing/equipment/Garment';
import { BankingApi } from '../../../../../api/banking';
import { StuffApi } from '../../../../../api/stuff';
import { Character } from '../../../../../lib/character/Character';
import { Idea } from '../../../../../lib/stuff/Idea';
import { makeStuff, stampTemplatePathForTest } from '../../../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import type { CommandContext } from '../../../../../api/command';
import type { MqlOneResult } from '../../../../../api/mql';
import type { Stuff } from '../../../../../lib/stuff/Stuff';

class TestCharacter extends Character {}

let lines: string[];
let notes: { kind: string; reason?: string }[];

function silence(): void {
  vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
    const b: Record<string, unknown> = {};
    b.topic = () => b;
    b.toSelf = (m: unknown) => {
      lines.push(String(m));
      return b;
    };
    b.toPeers = () => b;
    b.send = () => {};
    return b as never;
  });
}

function slate(): Tariff {
  const t = makeStuff(() => new Tariff());
  stampTemplatePathForTest(t, '/test/smithy/tariff');
  t.services = { repair: 'repair' };
  t.setPrice('repair', 5);
  t.setPrice('reforge', 12);
  return t;
}

const fault = (over: Partial<Fault>): Fault => ({
  part: 'head', kind: 'worn', named: 'head', action: 'mended', discipline: 'smithing',
  band: 'expert', mendable: true, result: 'sound', stockKg: 0.2, ...over,
});

function ctx(giver: Stuff, answer: boolean | null): CommandContext {
  const interactive =
    answer === null ? undefined : { promptConfirm: vi.fn(async () => answer) };
  const note = (n: { kind: string; reason?: string }) => notes.push(n);
  return {
    commandGiver: giver,
    location: null,
    note,
    interactive,
    // The real guard's shape (D23): nobody to ask → `needs-input`.
    requireInteractive: (what: string) => {
      if (interactive) return interactive;
      note({ kind: 'command-rejected', reason: 'needs-input', detail: `order needs ${what} when run from a script` } as never);
      return null;
    },
  } as unknown as CommandContext;
}

async function order(t: Tariff, giver: Stuff, answer: boolean | null): Promise<void> {
  await makeStuff(() => new OrderController()).execute(
    {
      counter: { stuff: [t], raw: '' },
      menu: undefined,
      cocktail: 'repair',
      subject: { stuff: pick, raw: 'pick' } as MqlOneResult,
      brand: undefined,
    } as never,
    ctx(giver, answer),
  );
}

let pick: Stuff;
let berta: Stuff;
let giver: Stuff;

beforeEach(() => {
  installV1QuantityMarshallers();
  lines = [];
  notes = [];
  silence();
  pick = makeStuff(() => new Idea());
  vi.spyOn(pick, 'getPresentation').mockReturnValue('the pick');
  berta = makeStuff(() => new TestCharacter());
  vi.spyOn(berta, 'getPresentation').mockReturnValue('Berta');
  giver = makeStuff(() => new TestCharacter());
  vi.spyOn(MqlApi, 'resolveMany').mockReturnValue({ stuff: [pick] } as never);
  vi.spyOn(BankingApi, 'compactCurrency').mockReturnValue('zorkmid');
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('order repair — the paid mend', () => {
  it('⭐ AC6: nobody on shift is a refusal in words, and nothing is mended or taken', async () => {
    const t = slate();
    vi.spyOn(CraftingApi, 'fulfillingHand').mockResolvedValue(null);
    const repair = vi.spyOn(CraftingApi, 'repair');
    const collect = vi.spyOn(t, 'collectMinor');
    await order(t, giver, true);
    expect(lines.join(' ')).toContain(NOBODY_TO_WORK);
    expect(repair).not.toHaveBeenCalled();
    expect(collect).not.toHaveBeenCalled();
  });

  it('⭐⭐ AC5: the fault and its price are named BEFORE money; a broken head costs more than a slack joint', async () => {
    const t = slate();
    vi.spyOn(CraftingApi, 'fulfillingHand').mockResolvedValue(berta);
    vi.spyOn(t, 'canSettle').mockReturnValue(true);
    const diag = vi.spyOn(CraftingApi, 'diagnose');
    diag.mockResolvedValueOnce({
      ok: true, item: pick, hand: berta,
      faults: [fault({ part: 'hafting', kind: 'slack', named: 'hafting', action: 'tightened', stockKg: 0 })],
    } as DiagnoseOutcome);
    const collect = vi.spyOn(t, 'collectMinor');
    await order(t, giver, false);
    const slack = lines.join(' ');
    expect(slack).toMatch(/Berta looks it over\. The hafting has gone slack/);
    expect(collect).not.toHaveBeenCalled(); // declined: nothing taken

    lines = [];
    diag.mockResolvedValueOnce({
      ok: true, item: pick, hand: berta,
      faults: [fault({ kind: 'failed', action: 'reforged' })],
    } as DiagnoseOutcome);
    await order(t, giver, false);
    const broken = lines.join(' ');
    expect(broken).toMatch(/The head has failed; it wants re-forging/);
    const price = (s: string): string => /for the lot/.test(s) ? s.split('—').pop()! : s;
    expect(price(slack)).not.toBe(price(broken));
    expect(t.quoteFor([{ key: 'tighten', label: 'x', qty: 1 }]).total).toBeLessThan(
      t.quoteFor([{ key: 'reforge', label: 'x', qty: 1 }]).total,
    );
  });

  it('⭐⭐ AC6: "yes" mends as THE HAND and collects the quote, once', async () => {
    const t = slate();
    vi.spyOn(CraftingApi, 'fulfillingHand').mockResolvedValue(berta);
    vi.spyOn(t, 'canSettle').mockReturnValue(true);
    vi.spyOn(CraftingApi, 'diagnose').mockResolvedValue({
      ok: true, item: pick, hand: berta, faults: [fault({})],
    } as DiagnoseOutcome);
    const repair = vi.spyOn(CraftingApi, 'repair').mockResolvedValue({
      ok: true, item: pick, conditionBefore: 0.4, costKg: 0.2,
      mended: [{ part: 'head', kind: 'mended', discipline: 'smithing', band: 'expert', result: 'sound' }],
      skipped: [],
    } as RepairOutcome);
    const collect = vi.spyOn(t, 'collectMinor').mockResolvedValue({ paid: true, note: '(5)' });
    const flat = vi.spyOn(t, 'collect');
    await order(t, giver, true);
    expect(repair).toHaveBeenCalledWith({ item: pick, hand: berta });
    expect(collect).toHaveBeenCalledTimes(1);
    expect(collect.mock.calls[0]![0]).toBe(5);
    expect(flat).not.toHaveBeenCalled();
    expect(lines.join(' ')).toMatch(/Berta mends the pick; it is sound/);
  });

  it('a scripted caller (no one to ask) takes nothing; a quote nobody can pay is refused before the work', async () => {
    const t = slate();
    vi.spyOn(CraftingApi, 'fulfillingHand').mockResolvedValue(berta);
    vi.spyOn(CraftingApi, 'diagnose').mockResolvedValue({
      ok: true, item: pick, hand: berta, faults: [fault({})],
    } as DiagnoseOutcome);
    const repair = vi.spyOn(CraftingApi, 'repair');
    vi.spyOn(t, 'canSettle').mockReturnValue(true);
    await order(t, giver, null);
    expect(repair).not.toHaveBeenCalled();
    // ⭐ Fails CLOSED and names the answer it needed (D23).
    expect(notes.some((n) => n.reason === 'needs-input')).toBe(true);
    vi.spyOn(t, 'canSettle').mockReturnValue(false);
    await order(t, giver, true);
    expect(repair).not.toHaveBeenCalled();
    expect(lines.join(' ')).toMatch(/haven't the money/);
  });

  it('⭐ AC9: a hand who can only make it serviceable says so before taking money', async () => {
    const t = slate();
    vi.spyOn(CraftingApi, 'fulfillingHand').mockResolvedValue(berta);
    vi.spyOn(t, 'canSettle').mockReturnValue(true);
    vi.spyOn(CraftingApi, 'diagnose').mockResolvedValue({
      ok: true, item: pick, hand: berta,
      faults: [
        fault({ part: 'haft', named: 'haft', discipline: 'carpentry', band: 'novice', result: 'short' }),
        fault({ part: 'head', kind: 'failed', action: 'reforged', mendable: false, reason: 'insufficient-heat', detail: '1200' }),
      ],
    } as DiagnoseOutcome);
    await order(t, giver, false);
    const said = lines.join(' ');
    expect(said).toMatch(/The haft is worn — serviceable is the best I can do/);
    expect(said).toMatch(/The head has failed, and re-making it wants a fire hotter than any here/);
  });
});

describe('Tariff.quoteFor — a quote by diagnosis', () => {
  it('prices each line; derives an unpriced REPAIR key from `repair`; never derives any other', () => {
    const t = slate();
    const q = t.quoteFor([
      { key: 'repair', label: 'head', qty: 1 },
      { key: 'tighten', label: 'hafting', qty: 1 },
      { key: 'reforge', label: 'blade', qty: 1 },
      { key: 'wash', label: 'shirt', qty: 1 },
    ]);
    expect(q.lines.map((l) => l.price)).toEqual([5, 1, 12, null]);
    expect(q.total).toBe(18);
  });
});

describe('⭐ the board decides (controllers-are-io D11)', () => {
  it('a thing that only prices takes no orders: the mixin default refuses', async () => {
    class Shelf extends PricedOfferMixin(Idea) {}
    const shelf = makeStuff(() => new Shelf());
    expect(shelf.offersOrder('repair')).toBe(false);
    await expect(
      shelf.orderPlanFor({ by: giver, phrase: 'repair', key: 'repair', subject: null, location: null }),
    ).resolves.toMatchObject({ ok: false, reason: 'not-offered' });
  });

  it('two boards in one room: the one that takes the word, and nobody is asked', async () => {
    const other = makeStuff(() => new Tariff());
    other.setPrice("wash", 2);
    const t = slate();
    expect(other.offersOrder('repair')).toBe(false);
    expect(t.offersOrder('repair')).toBe(true);
    const context = ctx(giver, true);
    vi.spyOn(CraftingApi, 'fulfillingHand').mockResolvedValue(berta);
    vi.spyOn(t, 'canSettle').mockReturnValue(true);
    vi.spyOn(CraftingApi, 'diagnose').mockResolvedValue({
      ok: true, item: pick, hand: berta, faults: [fault({})],
    } as DiagnoseOutcome);
    vi.spyOn(CraftingApi, 'repair').mockResolvedValue({ ok: true, mended: [] } as never);
    vi.spyOn(t, 'collectMinor').mockResolvedValue({ paid: false, note: null });
    await makeStuff(() => new OrderController()).execute(
      {
        counter: { stuff: [other, t], raw: '' },
        cocktail: 'repair',
        subject: { stuff: pick, raw: 'pick' } as MqlOneResult,
      } as never,
      context,
    );
    expect(notes.map((n) => n.reason)).not.toContain('needs-input-choice');
    expect(lines.join(' ')).toMatch(/looks it over/);
  });

  it('⚠ a hot wash that shrinks a thing a little is no ruin (the before-record, 12c)', async () => {
    const g = makeStuff(() => new Garment());
    vi.spyOn(g as unknown as { washSite: () => unknown }, 'washSite').mockReturnValue({
      band: 'clean',
      damage: ['shrunk'],
    });
    const out = await g.launderBy(new WashPolicy('novice'), {
      hand: berta,
      customer: giver,
      hardnessDgh: 0,
      cleansers: [],
    });
    expect(out.ruined).toEqual([]);
  });
});

