/**
 * ⭐ A sheet of paper: it folds to octavo and no
 * further, writing wants ink and size, two sheets with different words do
 * not stack, soaked it pulps, burnt it reads as ash, torn its halves keep
 * the halves of the words.
 */
import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Sheet from '../Sheet';
import Holder from '../../../lib/stuff/Holder';
import Good from '../../../lib/stuff/Good';
import Fiber from '../../idea/material/Fiber';
import Residue from '../../idea/material/Residue';
import { BulkableMixin } from '../../../lib/bulk/Bulkable';
import { Quantity } from '../../../lib/quantity';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { MessageApi } from '../../../api/message';
import { makeStuff, makeStuffAtPath, stampTemplatePathForTest } from '../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';

class Pot extends BulkableMixin(Good) {
  static _mixinName = 'SheetTestInkPot';
}

const INK = '/stuff/idea/material/_sheet/ink';
const PAPER = '/stuff/idea/material/_sheet/paper';
const ASH = '/stuff/idea/material/_sheet/ash';
const SHEET_ROW = '/test/thing/sheet';

function material(path: string, tags: string[]): void {
  makeStuffAtPath(() => {
    // Paper is cellulose (a fibre, which can be sodden); ink and ash are residues.
    const m = path === PAPER ? new Fiber() : new Residue();
    m.setName(path.split('/').pop()!);
    m.setDensity(Quantity.of(900, 'kg/m³'));
    m.setTags(tags);
    return m;
  }, path);
}

function sheet(opts: { sized?: boolean; quantity?: number } = {}): Sheet {
  const s = makeStuff(() => {
    const x = new Sheet();
    x.setMass(Quantity.of(0.005, 'kg'));
    x.setMaterial(StuffApi.findByTemplatePath<Fiber>(PAPER)!);
    x.setWritingRoom(200);
    x.sized = opts.sized ?? true;
    if (opts.quantity) x.setQuantity(opts.quantity);
    return x;
  });
  stampTemplatePathForTest(s, SHEET_ROW);
  return s;
}

function inkPot(litres = 0.05): Pot {
  return makeStuff(() => {
    const p = new Pot();
    p.setMass(Quantity.of(0.2, 'kg'));
    p.interiorBulk = true;
    p.setInteriorCapacity(Quantity.of(0.1, 'L'));
    p.setBulkMaterial('interior', StuffApi.findByTemplatePath<Fiber>(INK)!);
    p.setBulkAmount('interior', Quantity.of(litres, 'L'));
    return p;
  });
}

function writer(...things: Array<Sheet | Pot>): Holder {
  const h = makeStuff(() => new Holder());
  for (const t of things) ContainmentApi.move(t, h);
  return h;
}

beforeEach(() => {
  installV1QuantityMarshallers();
  const scene = { topic: () => scene, toSelf: () => scene, toPeers: () => scene, send: () => undefined };
  vi.spyOn(MessageApi, 'scene').mockReturnValue(scene as never);
  material(INK, ['ink']);
  material(PAPER, ['paper', 'cellulose']);
  StuffApi.findByTemplatePath<Fiber>(PAPER)!.setWetStrength(0.1);
  material(ASH, ['residue']);
});

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('⭐ folding', () => {
  it('folds sheet → folio → quarto → octavo, and a fourth fold will not go', () => {
    const s = sheet();
    expect(s.format()).toBe('sheet');
    expect(s.foldRefusal()).toBeNull();
    s.fold();
    expect(s.format()).toBe('folio');
    expect(s.isFolded()).toBe(true);
    s.fold();
    s.fold();
    expect(s.format()).toBe('octavo');
    expect(s.foldRefusal()).toMatchObject({ reason: 'will-not-fold-again' });
    s.unfold();
    expect(s.format()).toBe('sheet');
    expect(s.isFolded()).toBe(false);
  });
});

describe('⭐ writing on paper', () => {
  it('refuses with no ink in hand', () => {
    const s = sheet();
    const h = writer(s);
    expect(s.writeOn(h, 'hello')).toMatchObject({ ok: false, reason: 'no-ink' });
  });

  it('an unsized sheet drinks the ink — the line bleeds', () => {
    const s = sheet({ sized: false });
    const h = writer(s, inkPot());
    expect(s.writeOn(h, 'hello')).toMatchObject({ ok: false, reason: 'bleeds' });
  });

  it('a sized sheet takes the ink, and the pot gives some up', () => {
    const s = sheet();
    const pot = inkPot(0.05);
    const h = writer(s, pot);
    expect(s.writeOn(h, 'meet me at the anchor').ok).toBe(true);
    expect(s.getMarkText()).toBe('meet me at the anchor');
    expect(pot.getBulkAmount('interior').rawValue()).toBeLessThan(0.05);
  });

  it('⭐ two sheets with different words are different goods — written never merges into blank', () => {
    const a = sheet();
    const b = sheet();
    expect(a.canMergeWith(b)).toBe(true);
    a.setMarkText('a letter');
    expect(a.canMergeWith(b)).toBe(false);
  });

  it('⭐ a sheet is a leaf: what is written on it keeps its hand, and a reader sees it as they know the writer', () => {
    const s = sheet();
    const h = makeStuffAtPath(() => new Holder(), '/platform/agent/Avatar/marty');
    ContainmentApi.move(s, h);
    ContainmentApi.move(inkPot(), h);
    expect(s.writeOn(h, 'meet me at noon').ok).toBe(true);
    expect(s.getMarkText()).toBe('meet me at noon');
    expect(s.getPassages()).toEqual([{ text: 'meet me at noon', hand: h.getIdentityPath() }]);
    expect(s.readFor(h)).toBe('(in your hand) meet me at noon');
    const stranger = makeStuffAtPath(() => new Holder(), '/platform/agent/Avatar/stranger');
    expect(s.readFor(stranger)).toBe('(in a hand you do not know) meet me at noon');
  });

  it('the same words in two different hands are two different papers', () => {
    const a = sheet();
    const b = sheet();
    a.takePassages([{ text: 'noon', hand: '/platform/agent/Avatar/ann' }], 10);
    b.takePassages([{ text: 'noon', hand: '/platform/agent/Avatar/bob' }], 10);
    expect(a.canMergeWith(b)).toBe(false);
    b.takePassages([{ text: 'noon', hand: '/platform/agent/Avatar/ann' }], 10);
    expect(a.canMergeWith(b)).toBe(true);
  });

  it('a printed sheet takes no handwriting', () => {
    const s = sheet();
    s.bindTo('/x/editions/abc', 0);
    const h = writer(s, inkPot());
    expect(s.writeOn(h, 'hello')).toMatchObject({ ok: false, reason: 'printed' });
  });
});

describe('⭐ paper fails', () => {
  it('soaked through, it gives way — paper is weak wet (the material decides)', () => {
    const s = sheet();
    s.wet(0.3);
    expect(s.isSodden()).toBe(false);
    s.wet(0.7);
    expect(s.isSodden()).toBe(true);
  });

  it('burnt to its char material, the words read as ash', () => {
    const s = sheet();
    s.setMarkText('a secret');
    s.setCharMaterialPath(ASH);
    expect(s.getMarkText()).toBe('a secret');
    s.setMaterial(StuffApi.findByTemplatePath<Fiber>(ASH)!);
    expect(s.getMarkText()).toMatch(/ash/);
  });
});

describe('⭐ tearing', () => {
  it('tears into two halves, each with the half of the words it held, bound to nothing', async () => {
    const s = sheet();
    const h = writer(s);
    s.setMarkText('the first half | the second half');
    const origClone = StuffApi.clone.bind(StuffApi);
    vi.spyOn(StuffApi, 'clone').mockImplementation(async (path: string) => {
      if (path === SHEET_ROW) return sheet() as never;
      return origClone(path);
    });
    const out = await s.tear(h);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    const [left, right] = out.made as Sheet[];
    expect(left!.getMarkText()).toBe('the first half |');
    expect(right!.getMarkText()).toBe('the second half');
    expect(left!.torn && right!.torn).toBe(true);
    expect(right!.getContainer()).toBe(h);
  });

  it('⭐ handwriting tears between its passages, each half keeping its hands — and the second half is made FROM the sheet', async () => {
    const s = sheet();
    const h = writer(s);
    s.takePassages([
      { text: 'Doc Brown', hand: '/platform/agent/Avatar/ann' },
      { text: '1640 Riverside', hand: '/platform/agent/Avatar/bob' },
    ], 50);
    const clone = vi.spyOn(StuffApi, 'clone').mockImplementation(async () => sheet() as never);
    const out = await s.tear(h);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(clone.mock.calls[0]?.[2]).toMatchObject({ madeFrom: s });
    const [left, right] = out.made as Sheet[];
    expect(left!.getPassages()).toEqual([{ text: 'Doc Brown', hand: '/platform/agent/Avatar/ann' }]);
    expect(right!.getPassages()).toEqual([{ text: '1640 Riverside', hand: '/platform/agent/Avatar/bob' }]);
    expect(right!.getMarkText()).toBe('1640 Riverside');
  });
});
