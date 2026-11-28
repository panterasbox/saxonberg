/**
 * Authored decay, per part (decomposition W1: D1–D4, D10, D11) — a row's
 * `decay:` seeded by the REAL applier at mint: it caps a part's condition,
 * fails a part through the shipped failure path, costs a corroded part its
 * metal, holds against a mend, is cleared only by what cures it, survives
 * a capture → restore of a kept container, and is never re-seeded.
 */
import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { withSaveMany } from '../../persistence/__tests__/pm-fake';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import Tool from '../../../platform/thing/Tool';
import Assembly from '../../../platform/thing/Assembly';
import Metal from '../../../platform/idea/material/Metal';
import Wood from '../../../platform/idea/material/Wood';
import TemplateApplier from '../../../platform/idea/TemplateApplier';
import { Idea } from '../../stuff/Idea';
import { PersistableMixin } from '../../persistence/Persistable';
import { ContainerMixin } from '../../spatial/Container';
import { StuffApi } from '../../../api/stuff';
import { PersistableApi } from '../../../api/persistable';
import { ContainmentApi } from '../../../api/containment';
import { ParcelApi } from '../../../api/parcel';
import { Template } from '../../stuff/Template';
import { Document } from '../../persistence/Document';
import { PersistenceManager } from '../../../../backend/PersistenceManager';
import { Quantity } from '../../quantity';
import type { FieldMeta } from '../../mixin';
import type { MendRecord } from '../../material/Durable';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import { rememberShippedJoints } from './joint-fixtures';

const IRON = '/stuff/idea/material/_test/dc-iron';
const ASH = '/stuff/idea/material/_test/dc-ash';
const GLASS = '/stuff/idea/material/_test/dc-glass';
const PICK = '/x/thing/dc-pick';
const ANCHOR = '/x/thing/dc-anchor';

/** Part rows' masses — what `CraftingApi.unitMassOf` reads. */
const MASS: Record<string, number> = {
  '/x/thing/head': 1.8,
  '/x/thing/haft': 0.8,
  '/x/thing/shank': 220,
  '/x/thing/stock': 60,
  '/x/thing/ring': 20,
};

const PICK_BILL = {
  parts: [
    { part: 'head', template: '/x/thing/head', count: 1, role: 'structural', material: IRON },
    { part: 'haft', template: '/x/thing/haft', count: 1, role: 'structural', material: ASH },
  ],
  joints: [{ key: 'hafting', method: '/platform/joints/wedged', members: ['head', 'haft'] }],
};

const ANCHOR_BILL = {
  parts: [
    { part: 'shank', template: '/x/thing/shank', count: 1, role: 'structural' },
    { part: 'stock', template: '/x/thing/stock', count: 1, role: 'structural' },
    { part: 'ring', template: '/x/thing/ring', count: 1, role: 'fastener' },
  ],
};

function materials(): void {
  makeStuffAtPath(() => {
    const m = new Metal();
    m.setName('iron');
    m.setTags(['metal', 'ferrous']);
    m.setHardness(Quantity.of(600, 'MPa'));
    m.setToughness(Quantity.of(200, 'MJ/m³'));
    m.setDegradation({ corrosion: { perYear: 0.04, product: 'rust' } });
    return m;
  }, IRON);
  makeStuffAtPath(() => {
    const w = new Wood();
    w.setName('ash');
    w.setTags(['wood', 'organic']);
    w.setHardness(Quantity.of(40, 'MPa'));
    w.setToughness(Quantity.of(60, 'MJ/m³'));
    w.setDegradation({ rot: { perYear: 0.06 }, mold: { perYear: 0.06 } });
    return w;
  }, ASH);
  // A material with no decay at all.
  makeStuffAtPath(() => {
    const w = new Wood();
    w.setName('glassy');
    return w;
  }, GLASS);
}

const applier = (): TemplateApplier => makeStuff(() => new TemplateApplier());

/** A pick minted from a row carrying `decay` — the applier's phase 3. */
async function mintPick(decay: unknown, path = PICK): Promise<Tool> {
  const t = makeStuffAtPath(() => new Tool(), path);
  t.setMass(Quantity.of(2.6, 'kg'));
  t.setMaterial(StuffApi.findByTemplatePath(IRON) as never);
  t.setCapabilities(['digging']);
  await applier().apply(t, { bill: PICK_BILL, ...(decay === undefined ? {} : { decay }) }, { mode: 'mint' });
  return t;
}

async function mintAnchor(decay: unknown): Promise<Assembly> {
  const a = makeStuffAtPath(() => new Assembly(), ANCHOR);
  a.setMass(Quantity.of(300, 'kg'));
  a.setMaterial(StuffApi.findByTemplatePath(IRON) as never);
  await applier().apply(a, { bill: ANCHOR_BILL, decay }, { mode: 'mint' });
  return a;
}

const RECORD: MendRecord = {
  at: 1, by: '/x/agent/smith', byName: 'Smith', band: 'expert', discipline: 'smithing', kind: 'mended', result: 'sound',
};

beforeEach(() => {
  StuffApi.clearAll();
  rememberShippedJoints();
  materials();
  vi.spyOn(StuffApi, 'ensureConstituent').mockResolvedValue();
  vi.spyOn(Template, 'findByPath').mockImplementation(async (p: string) =>
    (MASS[p] !== undefined ? { path: p, class: '/platform/thing/Good', data: { mass: MASS[p] } } : null) as never,
  );
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('a row with `decay:` mints decayed', () => {
  it('⭐ a punky haft caps the part and the whole; the head is untouched', async () => {
    const p = await mintPick({ haft: { rot: 'punky' } });
    const haft = p.getLine('haft')!;
    expect(haft.decay).toEqual([{ mechanism: 'rot', band: 'punky' }]);
    expect(haft.condition).toBeCloseTo(0.15, 9);
    expect(p.getLine('head')!.condition).toBe(1);
    expect(p.getCondition()).toBeCloseTo(0.15, 9);
    expect(p.getDecayMarks('haft')).toEqual([{ mechanism: 'rot', band: 'punky' }]);
    expect(p.getDecayMarks()).toEqual([]);
    expect(p.mendCeiling('haft')).toEqual({ ceiling: 0.15, cure: 'fit' });
  });

  it('a failing band fails the part through the shipped failure path', async () => {
    const p = await mintPick({ haft: { rot: 'rotted through' } });
    expect(p.getLine('haft')!.failed).toBe(1);
    expect(p.failedLines().map((l) => l.part)).toEqual(['haft']);
    expect(p.isBroken()).toBe(true);
    expect(p.hasCapability('digging')).toBe(false);
  });

  it('a one-piece Assembly takes `whole` on its own gauge', async () => {
    const bar = makeStuffAtPath(() => new Assembly(), '/x/thing/dc-bar');
    bar.setMass(Quantity.of(10, 'kg'));
    bar.setMaterial(StuffApi.findByTemplatePath(IRON) as never);
    await applier().apply(bar, { decay: { whole: { corrosion: 'pitted' } } }, { mode: 'mint' });
    expect(bar.isOnePiece()).toBe(true);
    expect(bar.getDecayMarks()).toEqual([{ mechanism: 'corrosion', band: 'pitted' }]);
    expect(bar.getCondition()).toBeCloseTo(0.35, 9);
    // ⭐ Rust costs metal: 15 % of a 10 kg bar.
    expect(bar.getMass().rawValue()).toBeCloseTo(8.5, 9);
    expect(bar.getDryMass().rawValue()).toBeCloseTo(8.5, 9);
    expect(bar.mendCeiling()).toEqual({ ceiling: 0.35, cure: 'none' });
  });
});

describe('refusals name the row, the part and the reason', () => {
  it('⭐ the wrong mechanism for the material: iron does not rot', async () => {
    await expect(mintPick({ head: { rot: 'soft' } })).rejects.toThrow(
      /dc-pick: decay\.head — iron does not suffer rot/,
    );
  });

  it('an unknown band, an unknown mechanism', async () => {
    await expect(mintPick({ haft: { rot: 'pitted' } })).rejects.toThrow(/decay\.haft — 'pitted' is not a band of rot/);
    await expect(mintPick({ haft: { woodworm: 'riddled' } })).rejects.toThrow(/'woodworm' is not a decay mechanism/);
  });

  it('a key that is neither a bill part nor `whole`', async () => {
    await expect(mintPick({ blade: { corrosion: 'bloom' } })).rejects.toThrow(
      /decay\.blade — not a part of it \(its parts: head, haft; or 'whole'\)/,
    );
  });

  it('a part on a thing of one piece', async () => {
    const bar = makeStuffAtPath(() => new Assembly(), '/x/thing/dc-one');
    bar.setMaterial(StuffApi.findByTemplatePath(IRON) as never);
    await expect(applier().apply(bar, { decay: { blade: { corrosion: 'bloom' } } }, { mode: 'mint' })).rejects.toThrow(
      /decay\.blade — not a part of it \(it is one piece/,
    );
  });

  it('a bill part named `whole`', async () => {
    const t = makeStuffAtPath(() => new Tool(), '/x/thing/dc-odd');
    t.setMaterial(StuffApi.findByTemplatePath(IRON) as never);
    const bill = { parts: [{ part: 'whole', template: '/x/thing/head', count: 1, role: 'structural' }] };
    await expect(applier().apply(t, { bill, decay: { whole: { corrosion: 'bloom' } } }, { mode: 'mint' })).rejects.toThrow(
      /names a part 'whole'/,
    );
  });

  it('a material that does not break down; a thing with no material', async () => {
    const bar = makeStuffAtPath(() => new Assembly(), '/x/thing/dc-glass');
    bar.setMaterial(StuffApi.findByTemplatePath(GLASS) as never);
    await expect(applier().apply(bar, { decay: { whole: { rot: 'soft' } } }, { mode: 'mint' })).rejects.toThrow(
      /glassy does not suffer rot/,
    );
    const bare = makeStuffAtPath(() => new Assembly(), '/x/thing/dc-bare');
    await expect(applier().apply(bare, { decay: { whole: { rot: 'soft' } } }, { mode: 'mint' })).rejects.toThrow(
      /decay\.whole — it has no material to decay/,
    );
  });

  it('fade on a thing that is not dyed', async () => {
    makeStuffAtPath(() => {
      const w = new Wood();
      w.setName('linenish');
      w.setDegradation({ fade: { perYear: 0.03 } });
      return w;
    }, '/stuff/idea/material/_test/dc-linen');
    const bar = makeStuffAtPath(() => new Assembly(), '/x/thing/dc-fade');
    bar.setMaterial(StuffApi.findByTemplatePath('/stuff/idea/material/_test/dc-linen') as never);
    await expect(applier().apply(bar, { decay: { whole: { fade: 'faded' } } }, { mode: 'mint' })).rejects.toThrow(
      /fade is a dyed thing's/,
    );
  });
});

describe('the decay behaves', () => {
  it('⭐⭐ a punky haft fails on the third blow (D14), and the tool is broken', async () => {
    const p = await mintPick({ haft: { rot: 'punky' } });
    p.wear(0.02, 'shock');
    p.wear(0.02, 'shock');
    expect(p.getLine('haft')!.failed).toBe(0);
    expect(p.isBroken()).toBe(false);
    p.wear(0.02, 'shock');
    expect(p.getLine('haft')!.failed).toBe(1);
    expect(p.isBroken()).toBe(true);
    expect(p.hasCapability('digging')).toBe(false);
    // The head never took the jar.
    expect(p.getLine('head')!.condition).toBe(1);
  });

  it('⭐ fit (a whole new member) restores the part and clears its decay', async () => {
    const p = await mintPick({ haft: { rot: 'punky' } });
    for (let i = 0; i < 3; i++) p.wear(0.02, 'shock');
    p.replaceMembers('haft', 1, { material: ASH, grade: 'fair', maker: '/x/agent/joiner' });
    const haft = p.getLine('haft')!;
    expect(haft.failed).toBe(0);
    expect(haft.condition).toBe(1);
    expect(haft.decay).toBeUndefined();
    expect(p.isBroken()).toBe(false);
    expect(p.getCondition()).toBe(1);
  });

  it('⭐ a pitted part is lighter by its share, and a mend does not put the metal back', async () => {
    const a = await mintAnchor({ stock: { corrosion: 'pitted' } });
    // 60 kg stock × 0.15.
    expect(a.getLine('stock')!.lostKg).toBeCloseTo(9, 9);
    expect(a.getLostMass()).toBeCloseTo(9, 9);
    expect(a.getMass().rawValue()).toBeCloseTo(291, 9);
    expect(a.getLine('stock')!.condition).toBeCloseTo(0.35, 9);
    a.mendLine('stock', { ceiling: 1, gradeLoss: 0, slackens: false, record: RECORD });
    // ⭐ The ceiling holds while the mark stands, and the weight stays gone.
    expect(a.getLine('stock')!.condition).toBeCloseTo(0.35, 9);
    expect(a.getMass().rawValue()).toBeCloseTo(291, 9);
    // setCondition and restoreAll hold the ceiling too.
    a.setCondition(1);
    expect(a.getLine('stock')!.condition).toBeCloseTo(0.35, 9);
    expect(a.getLine('shank')!.condition).toBe(1);
    a.restoreAll('/x/agent/smith');
    expect(a.getLine('stock')!.condition).toBeCloseTo(0.35, 9);
  });

  it('a mend below the ceiling mends up to it, and no further', async () => {
    const a = await mintAnchor({ stock: { corrosion: 'bloom' } });
    a.wearLine('stock', 0.5);
    expect(a.getLine('stock')!.condition).toBeCloseTo(0.4, 9);
    a.mendLine('stock', { ceiling: 1, gradeLoss: 0, slackens: false, record: RECORD });
    expect(a.getLine('stock')!.condition).toBeCloseTo(0.9, 9);
    expect(a.mendCeiling('stock')).toEqual({ ceiling: 0.9, cure: 'brush' });
  });

  it('⭐ a reforge (new stock) clears the mark and the loss', async () => {
    const a = await mintAnchor({ stock: { corrosion: 'eaten through' } });
    expect(a.getLine('stock')!.failed).toBe(1);
    expect(a.getLine('stock')!.lostKg).toBeCloseTo(30, 9);
    a.mendLine('stock', { ceiling: 1, gradeLoss: 0, slackens: false, reforged: true, record: { ...RECORD, kind: 'reforged' } });
    const stock = a.getLine('stock')!;
    expect(stock.failed).toBe(0);
    expect(stock.condition).toBe(1);
    expect(stock.decay).toBeUndefined();
    expect(stock.lostKg).toBeUndefined();
    expect(a.getMass().rawValue()).toBeCloseTo(300, 9);
  });

  it('a decayed whole and a decayed part, together', async () => {
    const a = await mintAnchor({ whole: { corrosion: 'flaking' }, ring: { corrosion: 'bloom' } });
    expect(a.getDecayMarks()).toEqual([{ mechanism: 'corrosion', band: 'flaking' }]);
    expect(a.getDecayMarks('ring')).toEqual([{ mechanism: 'corrosion', band: 'bloom' }]);
    // Ring: 20 kg × 0 (bloom); whole: 300 kg × 0.03.
    expect(a.getLostMass()).toBeCloseTo(9, 9);
    expect(a.getCondition()).toBeCloseTo(0.6, 9);
  });

  it('⭐ the failure word of a failed-by-decay line is the mark’s', async () => {
    const a = await mintAnchor({ stock: { corrosion: 'eaten through' } });
    const text = a.getMarkupLong(a);
    expect(text).toMatch(/The stock is eaten through with rust\./);
  });
});

describe('once — never re-decayed', () => {
  it('⭐ a go-live on the row changes nothing (phase 3 is mint-only)', async () => {
    const p = await mintPick({ haft: { rot: 'punky' } });
    for (let i = 0; i < 3; i++) p.wear(0.02, 'shock');
    p.replaceMembers('haft', 1, { material: ASH, grade: 'fair', maker: '/x/agent/joiner' });
    await applier().apply(p, { bill: PICK_BILL, decay: { haft: { rot: 'punky' } } }, { mode: 'go-live' });
    expect(p.getLine('haft')!.decay).toBeUndefined();
    expect(p.getLine('haft')!.condition).toBe(1);
  });

  describe('⭐⭐ capture → restore of a kept container', () => {
    class Room extends PersistableMixin(ContainerMixin(Idea)) {
      static fieldMeta: FieldMeta = {};
    }
    let snapshots: Record<string, unknown>[];

    beforeEach(() => {
      installV1QuantityMarshallers();
      Document.setMarshallerResolver(
        () => undefined,
        async () => undefined,
      );
      snapshots = [];
      vi.spyOn(PersistenceManager, 'get').mockReturnValue(
        withSaveMany({
          isConnected: () => true,
          save: vi.fn(async (col: string, doc: Record<string, unknown>) => {
            if (col !== 'holder_snapshots') return 'id';
            const i = snapshots.findIndex((d) => d.scope === doc.scope && d.owner === doc.owner);
            if (i >= 0) snapshots[i] = { ...doc, _id: snapshots[i]!._id };
            else snapshots.push({ ...doc, _id: String(snapshots.length + 1) });
            return 'id';
          }),
          find: vi.fn(async (col: string, q: Record<string, unknown>) =>
            col === 'holder_snapshots' ? snapshots.filter((d) => Object.entries(q).every(([k, v]) => d[k] === v)) : [],
          ),
          findById: vi.fn(),
          delete: vi.fn(),
        }) as unknown as PersistenceManager,
      );
      vi.spyOn(ParcelApi, 'ownerOf').mockResolvedValue({ kind: 'group', name: 'g' });
      // ⭐ The restart's clone is a MINT of the row: phase 3 runs, so the
      // restored good is seeded first and its record overlays the seed.
      vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string) => {
        if (path === PICK) return mintPick({ haft: { rot: 'punky' } });
        if (path === ANCHOR) return mintAnchor({ stock: { corrosion: 'pitted' }, whole: { corrosion: 'bloom' } });
        throw new Error(`no row ${path}`);
      }) as unknown as typeof StuffApi.clone);
      makeStuffAtPath(() => new TemplateApplier(), TemplateApplier.templatePath);
    });

    async function restart(): Promise<Room> {
      StuffApi.clearAll();
      rememberShippedJoints();
      materials();
      installV1QuantityMarshallers();
      makeStuffAtPath(() => new TemplateApplier(), TemplateApplier.templatePath);
      const again = makeStuffAtPath(() => new Room(), '/w/dc-room');
      await PersistableApi.materialize(again);
      return again;
    }

    it('a re-hafted pick does NOT come back punky', async () => {
      const room = makeStuffAtPath(() => new Room(), '/w/dc-room');
      const p = await mintPick({ haft: { rot: 'punky' } });
      for (let i = 0; i < 3; i++) p.wear(0.02, 'shock');
      p.replaceMembers('haft', 1, { material: ASH, grade: 'fair', maker: '/x/agent/joiner' });
      ContainmentApi.move(p, room);
      await PersistableApi.capture(room);

      const again = await restart();
      const back = again.getContents().find((c): c is Tool => c instanceof Tool)!;
      expect(back).toBeDefined();
      expect(back.getLine('haft')!.decay).toBeUndefined();
      expect(back.getLine('haft')!.condition).toBe(1);
      expect(back.isBroken()).toBe(false);
    });

    it('an unrepaired one comes back as it was — marks, ceiling and lost metal', async () => {
      const room = makeStuffAtPath(() => new Room(), '/w/dc-room');
      const a = await mintAnchor({ stock: { corrosion: 'pitted' }, whole: { corrosion: 'bloom' } });
      ContainmentApi.move(a, room);
      await PersistableApi.capture(room);

      const again = await restart();
      const back = again.getContents().find((c): c is Assembly => c instanceof Assembly)!;
      expect(back.getDecayMarks('stock')).toEqual([{ mechanism: 'corrosion', band: 'pitted' }]);
      expect(back.getDecayMarks()).toEqual([{ mechanism: 'corrosion', band: 'bloom' }]);
      expect(back.getMass().rawValue()).toBeCloseTo(291, 9);
      expect(back.getCondition()).toBeCloseTo(0.35, 9);
    });

    it('⭐ a whole whose mark was cleared is not re-capped by the seeded one', async () => {
      const room = makeStuffAtPath(() => new Room(), '/w/dc-room');
      const a = await mintAnchor({ stock: { corrosion: 'pitted' }, whole: { corrosion: 'bloom' } });
      // As a wire brush will leave it (W4's act, not built yet): the bloom
      // gone, the whole mended. Runtime state, not authoring.
      (a as unknown as { decayMarks: unknown[] }).decayMarks = [];
      a.setCondition(1);
      expect(a.getWearCondition()).toBe(1);
      ContainmentApi.move(a, room);
      await PersistableApi.capture(room);

      const again = await restart();
      const back = again.getContents().find((c): c is Assembly => c instanceof Assembly)!;
      expect(back.getDecayMarks()).toEqual([]);
      expect(back.getWearCondition()).toBe(1);
    });
  });
});
