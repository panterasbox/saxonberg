/**
 * ⭐ Paper goods (paper D19, D20): a bag or carton torn open, or soaked
 * through, spills what it held; a label pasted with starch paste lets go
 * when the jar is wet, one pasted with casein holds.
 */
import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { ScheduleApi } from '@saxonberg/server/mud/api/schedule';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import Material from '@saxonberg/server/mud/lib/material/Material';
import Holder from '@saxonberg/server/mud/lib/stuff/Holder';
import Good from '@saxonberg/server/mud/lib/stuff/Good';
import Sheet from '@saxonberg/server/mud/platform/thing/Sheet';
import { BulkableMixin } from '@saxonberg/server/mud/lib/bulk/Bulkable';
import { makeStuff, makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import Packet from '../thing/Packet';

class Pot extends BulkableMixin(Good) {
  static _mixinName = 'PaperGoodsTestPot';
}

const PASTE = '/trade/papermaking/idea/material/_test/paste';
const PAPER = '/trade/papermaking/idea/material/_test/paper';
const CASEIN = '/trade/papermaking/idea/material/_test/casein';

beforeEach(() => {
  installV1QuantityMarshallers();
  for (const [path, resistsDamp] of [[PASTE, 0], [CASEIN, 0.8]] as const) {
    makeStuffAtPath(() => {
      const m = new Material();
      m.setName(path.split('/').pop()!);
      m.setDensity(Quantity.of(1100, 'kg/m³'));
      m.setAdhesive({ strength: 0.5, reversible: 'never', resistsDamp });
      return m;
    }, path);
  }
  makeStuffAtPath(() => {
    const m = new Material();
    m.setName('paper');
    m.setDensity(Quantity.of(800, 'kg/m³'));
    m.setWetStrength(0.1);
    return m;
  }, PAPER);
  vi.spyOn(ScheduleApi, 'schedule').mockImplementation(((_ms: number, fn: () => void) => {
    fn();
    return {} as never;
  }) as typeof ScheduleApi.schedule);
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

function bagWith(): { room: Holder; bag: Packet; apple: Holder } {
  const room = makeStuff(() => new Holder());
  const bag = makeStuff(() => {
    const b = new Packet();
    b.setMaterial(StuffApi.findByTemplatePath<Material>(PAPER)!);
    return b;
  });
  ContainmentApi.move(bag, room as unknown as Stuff & Container);
  const apple = makeStuff(() => new Holder());
  ContainmentApi.move(apple, bag as unknown as Stuff & Container);
  return { room, bag, apple };
}

describe('⭐ a paper bag', () => {
  it('torn open, it spills where it stood', async () => {
    const { room, bag, apple } = bagWith();
    expect((await bag.tear(room)).ok).toBe(true);
    expect(bag.isDestroyed()).toBe(true);
    expect(apple.getContainer()).toBe(room);
  });

  it('soaked through, it gives way and spills', async () => {
    const { room, bag, apple } = bagWith();
    bag.wet(0.5);
    expect(bag.isDestroyed()).toBe(false);
    bag.wet(0.4);
    await new Promise((r) => setTimeout(r, 0));
    expect(bag.isDestroyed()).toBe(true);
    expect(apple.getContainer()).toBe(room);
  });
});

describe('⭐ a pasted label stands the damp as its glue does', () => {
  async function labelled(glue: string): Promise<Good> {
    const jar = makeStuff(() => new Good());
    const pot = makeStuff(() => {
      const p = new Pot();
      p.interiorBulk = true;
      p.setInteriorCapacity(Quantity.of(1, 'L'));
      p.setBulkMaterial('interior', StuffApi.findByTemplatePath<Material>(glue)!);
      p.setBulkAmount('interior', Quantity.of(0.5, 'L'));
      return p;
    });
    const label = makeStuff(() => new Sheet());
    label.setMarkText('plum jam');
    const out = await jar.pasteOn(label, pot);
    expect(out.ok).toBe(true);
    expect(label.isDestroyed()).toBe(true);
    expect(jar.getCoats('outside')[0]?.marks).toBe('plum jam');
    return jar;
  }

  it('starch paste lets go when the jar is wet; casein holds', async () => {
    const paste = await labelled(PASTE);
    const casein = await labelled(CASEIN);
    paste.wet(0.6);
    casein.wet(0.6);
    expect(paste.releaseDampGlue()).toBe(1);
    expect(paste.getCoats('outside')).toHaveLength(0);
    expect(casein.releaseDampGlue()).toBe(0);
    expect(casein.getCoats('outside')[0]?.marks).toBe('plum jam');
  });

  it('refuses a pot with no glue in it', async () => {
    const jar = makeStuff(() => new Good());
    const empty = makeStuff(() => new Pot());
    const label = makeStuff(() => new Sheet());
    expect(await jar.pasteOn(label, empty)).toMatchObject({ ok: false, reason: 'not-glue' });
  });
});
