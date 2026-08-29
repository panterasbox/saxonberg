/**
 * CraftingLogic — the libations substrate over the resolve path:
 *
 *   - the glass POOL: a bulk output is claimed from reach (the first
 *     clean, empty instance of the recipe's template), never cloned; the
 *     pool bounds service (`no-glass`), and a washed glass serves again;
 *   - the recipe substrate: garnish (a thing IN the glass), ice (the
 *     latent plateau — colder, and diluting as game-time passes),
 *     technique (shaken colder + wetter than stirred; a muddler stamps
 *     `muddled`), the dash (a 1 mL slot), carbonation (an input tag rides
 *     the payload), and `press` (an item-fed bulk output at its portion).
 *
 * Synthetic fixtures throughout (no shipped content is named).
 */

import '../../../../../test-bootstrap';
import WorldClockRegistry from '../../WorldClockRegistry';
import { TemplatePaths } from '../../../../lib/paths';
import { Template } from '../../../../lib/stuff/Template';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CraftingApi, type CraftRequest } from '../../../../api/crafting';
import { StuffApi } from '../../../../api/stuff';
import { ContainmentApi } from '../../../../api/containment';
import { BulkableApi } from '../../../../api/bulk';
import { ExecutionContextApi } from '../../../../api/execution-context';
import { WorldClockApi } from '../../../../api/worldclock';
import { PersistenceManager } from '../../../../../backend/PersistenceManager';
import { Quantity } from '../../../../lib/quantity';
import Material from '../../../../lib/material/Material';
import Thing from '../../../../lib/stuff/Thing';
import { Idea } from '../../../../lib/stuff/Idea';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { ContainerMixin } from '../../../../lib/spatial/Container';
import { ContainableMixin } from '../../../../lib/spatial/Containable';
import { MakerMixin } from '../../../../lib/craft/Maker';
import GradedReceptacle from '../../../thing/GradedReceptacle';
import Receptacle from '../../../thing/Receptacle';
import CraftedDrink from '../../../thing/CraftedDrink';
import GlassRack from '../../../thing/GlassRack';
import ToolItem from '../../../thing/ToolItem';
import RecipeCatalogue from '../../RecipeCatalogue';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../../../lib/security/__tests__/test-setup';

class TestRoom extends ContainerMixin(Idea) {}
class TestBartender extends MakerMixin(ContainerMixin(ContainableMixin(Idea))) {}

const M = '/stuff/idea/material/_test/lib';
const GIN = `${M}/gin`;
const VERMOUTH = `${M}/vermouth`;
const RUM = `${M}/rum`;
const LIME_JUICE = `${M}/lime-juice`;
const TONIC = `${M}/tonic`;
const BITTERS = `${M}/bitters`;
const ICE = `${M}/ice`;
const OLIVE = `${M}/olive`;
const MINT = `${M}/mint`;
const LIME = `${M}/lime`;
const COUPE = '/stuff/thing/_test/lib/coupe';
const CAN = '/stuff/thing/_test/lib/can';
const CAN_OF_COLA = '/stuff/thing/_test/lib/can-of-cola';
const HIGHBALL = '/stuff/thing/_test/lib/highball';
const JUICE_BOTTLE = '/stuff/thing/_test/lib/juice-bottle';
const DAVE = '/stuff/agent/_test/lib/dave';
const BLEND = '/platform/idea/material/blend';

let store: Record<string, Record<string, unknown>[]>;
let now = 1000;

function registerMaterial(
  path: string,
  name: string,
  tags: string[],
  extra: (m: Material) => void = () => {},
): void {
  makeStuffAtPath(() => {
    const m = new Material();
    m.setName(name);
    m.setTags(tags);
    m.setKeywords([name]);
    m.setDensity(Quantity.of(1000, 'kg/m³'));
    m.setSpecificHeat(Quantity.of(4186, 'J/(kg·K)'));
    extra(m);
    return m;
  }, path);
}

function makeBottle(materialPath: string, amountL: number, band = 'fair') {
  const b = makeStuff(() => new GradedReceptacle());
  (b as unknown as { interiorBulk: boolean }).interiorBulk = true;
  (b as unknown as { interiorMaterial: string }).interiorMaterial = materialPath;
  b.setInteriorCapacity(Quantity.of(5, 'L'));
  b.setInteriorAmount(Quantity.of(amountL, 'L'));
  b.setGradeBand(band);
  return b;
}

/** An ungraded holder (the ice bin) — a plain Receptacle. */
function makeHolder(materialPath: string, amountL: number) {
  const b = makeStuff(() => new Receptacle());
  (b as unknown as { interiorBulk: boolean }).interiorBulk = true;
  (b as unknown as { interiorMaterial: string }).interiorMaterial = materialPath;
  b.setInteriorCapacity(Quantity.of(20, 'L'));
  b.setInteriorAmount(Quantity.of(amountL, 'L'));
  return b;
}

function makeGlass(path: string, capacityL = 0.4): CraftedDrink {
  const g = makeStuffAtPath(() => new CraftedDrink(), path);
  (g as unknown as { interiorBulk: boolean }).interiorBulk = true;
  g.setInteriorCapacity(Quantity.of(capacityL, 'L'));
  return g;
}

function makeItem(materialPath: string): Thing {
  const t = makeStuff(() => new Thing());
  t.setShortDescription(`an ${materialPath.split('/').pop()}`);
  t.setMass(Quantity.of(0.02, 'kg'));
  t.setMaterial(StuffApi.findByTemplatePath<Material>(materialPath)!);
  return t;
}

function makeTool(cap: string) {
  const t = makeStuff(() => new ToolItem());
  t.setCapabilities([cap]);
  return t;
}

async function craftAs(principal: Stuff, req: CraftRequest) {
  return ExecutionContextApi.runRoot(null, 'test', () => {
    ExecutionContextApi.tagActingAuthor(principal);
    return CraftingApi.craft(req);
  }) as ReturnType<typeof CraftingApi.craft>;
}

let room: TestRoom;
let dave: TestBartender;

const slot = (o: Stuff) => BulkableApi.slotFor(o, undefined)!;
const tempK = (o: Stuff) => (o as unknown as CraftedDrink).getTemperature().rawValue();

beforeEach(async () => {
  store = { recipes: [] };
  StuffApi.clearAll();
  const pm = PersistenceManager.get();
  vi.spyOn(pm, 'isConnected').mockReturnValue(true);
  vi.spyOn(pm, 'find').mockImplementation(
    async (col: string, query: Record<string, unknown>) => {
      if (col === 'documents' && query.kind === 'recipe') {
        return (store['recipes'] ?? []).map((d) => ({
          path: `/_test/recipes/${String(d.recipeId)}`,
          owner: '/_test',
          kind: 'recipe',
          data: d,
        })) as never;
      }
      return [] as never;
    },
  );
  now = 1000;
  WorldClockApi._resetForTesting();
  WorldClockApi._setNowProviderForTesting(() => now);
  // `clearAll` wiped the registry's template-path entry while the logic
  // holds its (test-mode) pointer; Thermal's reconcile looks the entry up
  // before reading the clock, so stand a registered one up again.
  if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) {
    makeStuffAtPath(() => new WorldClockRegistry(), TemplatePaths.worldClockRegistry);
  }

  registerMaterial(BLEND, 'mixed drink', ['cocktail']);
  registerMaterial(GIN, 'gin', ['gin', 'spirit']);
  registerMaterial(VERMOUTH, 'vermouth', ['vermouth']);
  registerMaterial(RUM, 'rum', ['rum', 'spirit']);
  registerMaterial(LIME_JUICE, 'lime juice', ['lime-juice', 'juice']);
  registerMaterial(TONIC, 'tonic', ['tonic', 'mixer', 'carbonated']);
  registerMaterial(BITTERS, 'bitters', ['bitters']);
  registerMaterial(OLIVE, 'olive', ['olive', 'garnish']);
  registerMaterial(MINT, 'mint', ['mint', 'herb']);
  registerMaterial(LIME, 'lime', ['lime', 'citrus']);
  registerMaterial(ICE, 'ice', ['ice'], (m) => {
    m.setDensity(Quantity.of(917, 'kg/m³'));
    m.setMeltingPoint(Quantity.of(273, 'K'));
    m.setLatentHeatOfFusion(Quantity.of(334000, 'J/kg'));
  });

  store.recipes!.push(
    {
      recipeId: 'martini',
      name: 'Martini',
      keywords: ['martini'],
      inputSlots: [
        { slot: 'base', category: 'gin', minGrade: 'fair', measureL: 0.06 },
        { slot: 'mod', category: 'vermouth', minGrade: 'fair', measureL: 0.01 },
      ],
      toolCapabilities: ['mixing-glass'],
      outputTemplate: COUPE,
      garnish: { category: 'olive' },
    },
    {
      // A fill: the output is the EMPTY VESSEL row, and the pool must
      // accept a drained product of the same kind.
      recipeId: 'refill',
      name: 'Refill',
      keywords: ['refill'],
      inputSlots: [
        { slot: 'base', category: 'gin', minGrade: 'fair', measureL: 0.05 },
      ],
      toolCapabilities: ['mixing-glass'],
      outputTemplate: CAN,
    },
    {
      recipeId: 'gin-tonic',
      name: 'Gin & Tonic',
      keywords: ['gt'],
      inputSlots: [
        { slot: 'base', category: 'gin', minGrade: 'fair', measureL: 0.05 },
        { slot: 'mixer', category: 'tonic', minGrade: 'fair', measureL: 0.15 },
      ],
      toolCapabilities: [],
      outputTemplate: HIGHBALL,
      ice: 'cubes',
    },
    {
      recipeId: 'daiquiri-shaken',
      name: 'Daiquiri',
      keywords: ['daiquiri'],
      inputSlots: [
        { slot: 'base', category: 'rum', minGrade: 'fair', measureL: 0.06 },
        { slot: 'sour', category: 'lime-juice', minGrade: 'fair', measureL: 0.03 },
      ],
      toolCapabilities: ['shaker'],
      outputTemplate: COUPE,
    },
    {
      recipeId: 'daiquiri-stirred',
      name: 'Stirred Daiquiri',
      keywords: ['stirred-daiquiri'],
      inputSlots: [
        { slot: 'base', category: 'rum', minGrade: 'fair', measureL: 0.06 },
        { slot: 'sour', category: 'lime-juice', minGrade: 'fair', measureL: 0.03 },
      ],
      toolCapabilities: ['mixing-glass'],
      outputTemplate: COUPE,
    },
    {
      recipeId: 'mojito',
      name: 'Mojito',
      keywords: ['mojito'],
      inputSlots: [
        { slot: 'base', category: 'rum', minGrade: 'fair', measureL: 0.05 },
        { slot: 'herb', category: 'mint', minGrade: 'fair', kind: 'item', count: 1 },
      ],
      toolCapabilities: ['muddler'],
      outputTemplate: HIGHBALL,
    },
    {
      recipeId: 'pink-gin',
      name: 'Pink Gin',
      keywords: ['pink-gin'],
      inputSlots: [
        { slot: 'base', category: 'gin', minGrade: 'fair', measureL: 0.06 },
        { slot: 'dash', category: 'bitters', minGrade: 'fair', measureL: 0.001 },
      ],
      toolCapabilities: [],
      outputTemplate: COUPE,
    },
    {
      recipeId: 'press-lime',
      name: 'Lime Juice',
      keywords: ['press-lime'],
      inputSlots: [
        { slot: 'fruit', category: 'lime', minGrade: 'fair', kind: 'item', count: 1 },
      ],
      toolCapabilities: ['juicer'],
      outputTemplate: JUICE_BOTTLE,
      outputPortionL: 0.03,
    },
  );
  const catalogue = makeStuffAtPath(
    () => new RecipeCatalogue(),
    '/platform/idea/RecipeCatalogue',
  );
  await catalogue.warm();

  room = makeStuff(() => new TestRoom());
  dave = makeStuffAtPath(() => new TestBartender(), DAVE);
  ContainmentApi.move(dave, room);
  for (const b of [
    makeBottle(GIN, 1),
    makeBottle(VERMOUTH, 1),
    makeBottle(RUM, 1),
    makeBottle(LIME_JUICE, 1),
    makeBottle(TONIC, 2),
    makeBottle(BITTERS, 0.1),
  ]) {
    ContainmentApi.move(b, room);
  }
  ContainmentApi.move(makeTool('mixing-glass'), room);
  ContainmentApi.move(makeTool('shaker'), room);
});

afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
});

describe('the glass pool (1c)', () => {
  it('claims a clean coupe from the rack, bounds service at the pool, serves again after a wash', async () => {
    const rack = makeStuff(() => new GlassRack());
    ContainmentApi.move(rack, room);
    const a = makeGlass(COUPE);
    const b = makeGlass(COUPE);
    ContainmentApi.move(a, rack);
    ContainmentApi.move(b, rack);
    ContainmentApi.move(makeItem(OLIVE), room);
    ContainmentApi.move(makeItem(OLIVE), room);
    ContainmentApi.move(makeItem(OLIVE), room);

    const first = await craftAs(dave, { recipeRef: 'martini', makerMode: 'self' });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    // Claimed, not cloned: the output IS one of the rack's glasses.
    expect([a, b]).toContain(first.output);
    expect((first.output as CraftedDrink).isSoiled()).toBe(true);
    // And it's a stamped, filled drink.
    expect(slot(first.output).getAmount().rawValue()).toBeGreaterThan(0.06);
    expect((first.output as CraftedDrink).getRecipe()).toBe('martini');

    const second = await craftAs(dave, { recipeRef: 'martini', makerMode: 'self' });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.output).not.toBe(first.output);

    // The pool is dry: the third declines diegetically, and nothing was
    // consumed for it.
    const gin = room
      .getContents()
      .find((c) => BulkableApi.slotFor(c, undefined)?.getMaterialPath() === GIN)!;
    const third = await craftAs(dave, { recipeRef: 'martini', makerMode: 'self' });
    expect(third).toMatchObject({ ok: false, reason: 'no-glass', detail: COUPE });
    expect(slot(gin).getAmount().rawValue()).toBeCloseTo(1 - 0.12, 6);

    // A washed glass (emptied, clean) is claimable again.
    const used = first.output as CraftedDrink;
    slot(used).setAmount(Quantity.of(0, 'L'));
    slot(used).setMaterial(null);
    for (const c of [...used.getContents()]) StuffApi.destruct(c);
    // `wash` is the sanctioned cleaner (its controller test covers it);
    // here the test models "washed" by the field, not the gated setter.
    (used as unknown as { soiled: boolean }).soiled = false;
    expect(used.isClaimable()).toBe(true);
    const fourth = await craftAs(dave, { recipeRef: 'martini', makerMode: 'self' });
    expect(fourth.ok).toBe(true);
    if (!fourth.ok) return;
    expect(fourth.output).toBe(used);
  });

  it('a soiled or non-empty glass is never claimed; a glass of another form is not the pool', async () => {
    const wrong = makeGlass(HIGHBALL);
    ContainmentApi.move(wrong, room);
    const dirty = makeGlass(COUPE);
    (dirty as unknown as { soiled: boolean }).soiled = true;
    ContainmentApi.move(dirty, room);
    ContainmentApi.move(makeItem(OLIVE), room);
    const out = await craftAs(dave, { recipeRef: 'martini', makerMode: 'self' });
    expect(out).toMatchObject({ ok: false, reason: 'no-glass' });
  });
});

describe('the recipe substrate (1d)', () => {
  it("a martini's olive is IN the glass and leaves with it", async () => {
    const coupe = makeGlass(COUPE);
    ContainmentApi.move(coupe, room);
    const olive = makeItem(OLIVE);
    ContainmentApi.move(olive, room);
    const out = await craftAs(dave, { recipeRef: 'martini', makerMode: 'self' });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(olive.getContainer()).toBe(coupe);
    expect(olive.isDestroyed()).toBe(false);
    expect(coupe.getLong()).toMatch(/with .*olive/);
    // Hand the glass to a patron: the olive rides along.
    const patron = makeStuff(() => new TestBartender());
    ContainmentApi.move(patron, room);
    ContainmentApi.move(coupe, patron);
    expect(olive.getContainer()).toBe(coupe);
    // Without a garnish in reach the recipe declines on its category.
    const again = await craftAs(dave, { recipeRef: 'martini', makerMode: 'self' });
    expect(again).toMatchObject({ ok: false, reason: 'insufficient-input', detail: 'olive' });
  });

  it('a G&T on the rocks is colder than its inputs, fizzing, and grows as the ice melts', async () => {
    const highball = makeGlass(HIGHBALL);
    ContainmentApi.move(highball, room);
    const bin = makeHolder(ICE, 5);
    ContainmentApi.move(bin, room);

    const out = await craftAs(dave, { recipeRef: 'gt', makerMode: 'self' });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.output).toBe(highball);
    // Ice came out of the bin (0.15 kg at 917 kg/m³).
    expect(slot(bin).getAmount().rawValue()).toBeCloseTo(5 - 0.15 / 0.917, 4);
    // The plateau, at once: a room-temperature pour over ice melts some of
    // it (0.2 L × 4186 J/K × 22 K ≈ 18 kJ ≈ 55 g) and lands at 273 K.
    expect(highball.getIceKg()).toBeLessThan(0.15);
    expect(highball.getIceKg()).toBeGreaterThan(0.05);
    expect(tempK(highball)).toBeCloseTo(273, 3);
    expect(slot(highball).getAmount().rawValue()).toBeCloseTo(
      0.2 + (0.15 - highball.getIceKg()),
      6,
    );
    // Carbonation rides the payload; the presentation reads it.
    expect(slot(highball).getPayload()?.tags).toContain('carbonated');
    expect(highball.getLong()).toMatch(/fizzing/);
    expect(highball.getLong()).toMatch(/on the rocks/);

    // Game-time passes: the room's heat melts ice into the drink.
    const before = slot(highball).getAmount().rawValue();
    const iceBefore = highball.getIceKg();
    now += 3600;
    const after = highball.getBulkAmount('interior').rawValue();
    expect(after).toBeGreaterThan(before);
    expect(highball.getIceKg()).toBeLessThan(iceBefore);
    expect(tempK(highball)).toBeCloseTo(273, 3);
    // Conservation: the litres gained are the kilograms melted.
    expect(after - before).toBeCloseTo(iceBefore - highball.getIceKg(), 6);
  });

  it('an iced recipe with no ice in reach declines on `ice`', async () => {
    ContainmentApi.move(makeGlass(HIGHBALL), room);
    const out = await craftAs(dave, { recipeRef: 'gt', makerMode: 'self' });
    expect(out).toMatchObject({ ok: false, reason: 'insufficient-input', detail: 'ice' });
  });

  it('a shaken daiquiri is colder and more dilute than a stirred one of the same inputs', async () => {
    const shakenGlass = makeGlass(COUPE);
    ContainmentApi.move(shakenGlass, room);
    const shaken = await craftAs(dave, { recipeRef: 'daiquiri', makerMode: 'self' });
    expect(shaken.ok).toBe(true);
    const stirredGlass = makeGlass(COUPE);
    ContainmentApi.move(stirredGlass, room);
    const stirred = await craftAs(dave, { recipeRef: 'stirred-daiquiri', makerMode: 'self' });
    expect(stirred.ok).toBe(true);
    expect(shakenGlass.getTechnique()).toBe('shaken');
    expect(stirredGlass.getTechnique()).toBe('stirred');
    expect(tempK(shakenGlass)).toBeLessThan(tempK(stirredGlass));
    expect(slot(shakenGlass).getAmount().rawValue()).toBeGreaterThan(
      slot(stirredGlass).getAmount().rawValue(),
    );
    expect(slot(shakenGlass).getAmount().rawValue()).toBeCloseTo(0.09 + 0.02, 6);
    expect(slot(stirredGlass).getAmount().rawValue()).toBeCloseTo(0.09 + 0.01, 6);
    expect(shakenGlass.getLong()).toMatch(/shaken, cloudy/);
  });

  it('a mojito needs a muddler and is stamped `muddled`', async () => {
    ContainmentApi.move(makeGlass(HIGHBALL), room);
    ContainmentApi.move(makeItem(MINT), room);
    const without = await craftAs(dave, { recipeRef: 'mojito', makerMode: 'self' });
    expect(without).toMatchObject({ ok: false, reason: 'missing-tool', detail: 'muddler' });
    ContainmentApi.move(makeTool('muddler'), room);
    const withIt = await craftAs(dave, { recipeRef: 'mojito', makerMode: 'self' });
    expect(withIt.ok).toBe(true);
    if (!withIt.ok) return;
    expect((withIt.output as CraftedDrink).getTechnique()).toBe('muddled');
    expect((withIt.output as CraftedDrink).getLong()).toMatch(/muddled/);
  });

  it('a dash slot at 0.001 L debits exactly one millilitre', async () => {
    ContainmentApi.move(makeGlass(COUPE), room);
    const bitters = room
      .getContents()
      .find((c) => BulkableApi.slotFor(c, undefined)?.getMaterialPath() === BITTERS)!;
    const out = await craftAs(dave, { recipeRef: 'pink-gin', makerMode: 'self' });
    expect(out.ok).toBe(true);
    expect(slot(bitters).getAmount().rawValue()).toBeCloseTo(0.1 - 0.001, 9);
  });

  it('press: an item-fed bulk recipe fills a claimed bottle at its portion', async () => {
    const bottle = makeGlass(JUICE_BOTTLE, 1);
    ContainmentApi.move(bottle, room);
    const lime = makeItem(LIME);
    ContainmentApi.move(lime, room);
    ContainmentApi.move(makeTool('juicer'), room);
    const out = await craftAs(dave, { recipeRef: 'press-lime', makerMode: 'self' });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.output).toBe(bottle);
    expect(lime.isDestroyed()).toBe(true);
    expect(slot(bottle).getAmount().rawValue()).toBeCloseTo(0.03, 6);
    expect(slot(bottle).getPayload()?.tags).toContain('lime');
    expect((bottle as CraftedDrink).getTechnique()).toBe('built');
  });
});

describe('the pool matches the VESSEL KIND, not the template path', () => {
  // ⭐ A drained can of cola and a factory-fresh can are the same input
  // to a fill — which is what a real line does, and what the returns
  // loop depends on. Path-matching walked past the drained one, so an
  // emptied vessel was economically dead the moment it was emptied.
  it('a drained PRODUCT is claimable by a fill whose output is the EMPTY VESSEL row', async () => {
    // The pool holds NO factory can — only a drained can of cola, which
    // is a different template row of the same kind.
    const drained = makeGlass(CAN_OF_COLA, 0.33);
    drained.setCategory('can');
    ContainmentApi.move(drained as never, room as never);

    // The output row declares the kind (a template read in the logic).
    const spy = vi
      .spyOn(Template, 'findByPath')
      .mockResolvedValue({ data: { category: 'can' } } as never);
    try {
      const out = await craftAs(dave, { recipeRef: 'refill', makerMode: 'self' });
      expect(out.ok).toBe(true);
      if (!out.ok) return;
      expect(out.output).toBe(drained);
    } finally {
      spy.mockRestore();
    }
  });

  it('a row that declares no kind still matches by path (the shipped fallback)', async () => {
    const wrongPath = makeGlass(CAN_OF_COLA, 0.33);
    wrongPath.setCategory('can');
    ContainmentApi.move(wrongPath as never, room as never);
    // No template row → no kind → path matching → nothing to claim.
    const spy = vi.spyOn(Template, 'findByPath').mockResolvedValue(null);
    try {
      const out = await craftAs(dave, { recipeRef: 'refill', makerMode: 'self' });
      expect(out).toMatchObject({ ok: false, reason: 'no-glass' });
    } finally {
      spy.mockRestore();
    }
  });
});
