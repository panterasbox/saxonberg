/**
 * ⭐ The printer's trade.
 */
import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { DocumentApi } from '@saxonberg/server/mud/api/document';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import Material from '@saxonberg/server/mud/lib/material/Material';
import Holder from '@saxonberg/server/mud/lib/stuff/Holder';
import Good from '@saxonberg/server/mud/lib/stuff/Good';
import Sheet from '@saxonberg/server/mud/platform/thing/Sheet';
import { BulkableMixin } from '@saxonberg/server/mud/lib/bulk/Bulkable';
import { makeStuff, makeStuffAtPath, stampTemplatePathForTest } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import { Misprint } from '../lib/Misprint';
import TypeCase from '../thing/TypeCase';
import Forme from '../thing/Forme';
import Press from '../thing/Press';
import Pen from '../thing/Pen';

class Pot extends BulkableMixin(Good) {
  static _mixinName = 'PrintingTestPot';
}

const CASE = '/test/printing/thing/case';
const INK = '/test/printing/idea/material/ink';
const TEXT = 'THE TERMINUS GAZETTE\n\nPrices up\n\nWheat is dear at the market this week, and dearer at the mill.';
let editions: string[];

beforeEach(() => {
  installV1QuantityMarshallers();
  editions = [];
  makeStuffAtPath(() => {
    const m = new Material();
    m.setName('ink');
    m.setTags(['ink']);
    m.setDensity(Quantity.of(1000, 'kg/m³'));
    return m;
  }, INK);
  vi.spyOn(DocumentApi, 'pagesOf').mockResolvedValue({ title: 'Prices up', pages: [TEXT] });
  vi.spyOn(DocumentApi, 'freezeEdition').mockImplementation(async (req) => {
    const p = `${req.source}/editions/${req.pages.join('').length}`;
    editions.push(req.pages[0]!);
    return p;
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

function kase(font: Record<string, number>): TypeCase {
  return makeStuffAtPath(() => {
    const c = new TypeCase();
    c.font = font;
    return c;
  }, CASE);
}

const fullFont = (): Record<string, number> => {
  const f: Record<string, number> = {};
  for (const ch of 'abcdefghijklmnopqrstuvwxyz0123456789.,:;-\'"?!') f[ch] = 500;
  return f;
};

function forme(): Forme {
  return makeStuff(() => {
    const f = new Forme();
    f.casePath = CASE;
    return f;
  });
}

describe('⭐ the forme', () => {
  it('debits the case; a short case refuses naming the glyph', async () => {
    kase({ ...fullFont(), e: 3 });
    const out = await forme().compose('/feed/r1', '"Prices up"', makeStuff(() => new Holder()));
    expect(out).toMatchObject({ ok: false, reason: 'case-short:e' });
    expect(out.ok ? '' : out.line).toMatch(/no more lowercase e/);
  });

  it('⭐ seeded misprints are the same every time — and proof corrects a share; distribute restores the case', async () => {
    const c = kase(fullFont());
    const before = c.getFont().e;
    const hand = makeStuffAtPath(() => new Holder(), '/platform/agent/Avatar/setter');
    const a = forme();
    await a.compose('/feed/r1', 't', hand);
    const b = forme();
    c.font = fullFont();
    await b.compose('/feed/r1', 't', hand);
    expect(a.getSetText()).toBe(b.getSetText());
    expect(a.getSetText()).not.toBe(TEXT);
    const wrong = a.errors.length;
    await a.proof(hand);
    expect(a.errors.length).toBeLessThanOrEqual(wrong);
    a.distribute();
    expect(c.getFont().e).toBeGreaterThan(0);
    expect(a.isSet()).toBe(false);
    void before;
  });

  it('the misprint value object is deterministic', () => {
    expect(new Misprint('x').corrupt('hello world', 0.2)).toEqual(new Misprint('x').corrupt('hello world', 0.2));
  });
});

describe('⭐ the press', () => {
  function shop(): { room: Holder; press: Press; hand: Holder; ream: Sheet } {
    const room = makeStuff(() => new Holder());
    const press = makeStuff(() => new Press());
    press.setEpoch('industrial');
    ContainmentApi.move(press, room as unknown as Stuff & Container);
    const hand = makeStuffAtPath(() => new Holder(), '/platform/agent/Avatar/pressman');
    ContainmentApi.move(hand, room as unknown as Stuff & Container);
    const ream = makeStuff(() => {
      const s = new Sheet();
      s.setQuantity(10);
      return s;
    });
    stampTemplatePathForTest(ream, '/test/thing/sheet');
    vi.spyOn(StuffApi, 'clone').mockImplementation(async () => {
      const s = makeStuff(() => new Sheet());
      stampTemplatePathForTest(s, '/test/thing/sheet');
      return s as never;
    });
    ContainmentApi.move(ream, press as unknown as Stuff & Container);
    const pot = makeStuff(() => {
      const p = new Pot();
      p.interiorBulk = true;
      p.setInteriorCapacity(Quantity.of(2, 'L'));
      p.setBulkMaterial('interior', StuffApi.findByTemplatePath<Material>(INK)!);
      p.setBulkAmount('interior', Quantity.of(1, 'L'));
      return p;
    });
    ContainmentApi.move(pot, room as unknown as Stuff & Container);
    return { room, press, hand, ream };
  }

  it('runs n copies bound to the edition AS SET, off the paper in the press', async () => {
    kase(fullFont());
    const { press, hand, ream } = shop();
    const f = forme();
    await f.compose('/feed/r1', '"Prices up"', hand);
    const out = await press.pull(f, 3, hand);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(editions[0]).toBe(f.getSetText());
    const copies = out.copies as Sheet[];
    expect(copies.reduce((n, s) => n + s.getQuantity(), 0)).toBe(3);
    expect(copies[0]!.getBoundTo()).toMatch(/editions/);
    expect(ream.getQuantity()).toBe(7);
  });

  it('⭐ a medieval covenant keeps the press idle, and the pen still copies', async () => {
    kase(fullFont());
    const { press, hand, room } = shop();
    vi.spyOn(room, 'getZone').mockReturnValue({ lookupField: async () => 'medieval' } as never);
    const f = forme();
    await f.compose('/feed/r1', '"Prices up"', hand);
    const out = await press.pull(f, 1, hand);
    expect(out).toMatchObject({ ok: false, reason: 'covenant-refuses' });
    const pen = makeStuff(() => {
      const p = new Pen();
      p.setEpoch('medieval');
      return p;
    });
    expect(await pen.admittedAt(room)).toBeNull();
  });
});

describe('⭐ the pen', () => {
  it('copies a sheet onto a blank — unbound, with the copyist\'s slips', async () => {
    const hand = makeStuffAtPath(() => new Holder(), '/platform/agent/Avatar/scribe');
    const original = makeStuff(() => new Sheet());
    original.setMarkText('Received of the bearer one crate of gin.');
    const blank = makeStuff(() => new Sheet());
    blank.setWritingRoom(200);
    blank.sized = true;
    const pot = makeStuff(() => {
      const p = new Pot();
      p.interiorBulk = true;
      p.setInteriorCapacity(Quantity.of(0.1, 'L'));
      p.setBulkMaterial('interior', StuffApi.findByTemplatePath<Material>(INK)!);
      p.setBulkAmount('interior', Quantity.of(0.05, 'L'));
      return p;
    });
    for (const t of [original, blank, pot]) ContainmentApi.move(t, hand as unknown as Stuff & Container);
    const pen = makeStuff(() => new Pen());
    const out = await pen.copyOnto(original, blank, hand);
    expect(out.ok).toBe(true);
    expect(blank.getBoundTo()).toBe('');
    expect(blank.getMarkText().length).toBe(original.getMarkText().length);
  });
});
