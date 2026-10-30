/**
 * ⭐ The founder's pattern (ceramics D23): `carve pattern of <thing> from
 * <board> for <metal>` — the BOARD plans it, and what comes out carries the
 * thing's impression cut oversize by the metal's own shrinkage, so a cast
 * from it comes out true.
 */
import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Board from '../thing/Board';
import Pattern from '../thing/Pattern';
import Good from '@saxonberg/server/mud/lib/stuff/Good';
import Material from '@saxonberg/server/mud/platform/idea/material/Material';
import Tool from '@saxonberg/server/mud/platform/thing/Tool';
import { ContainerMixin } from '@saxonberg/server/mud/lib/spatial/Container';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MaterialApi } from '@saxonberg/server/mud/api/material';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { PersistableApi } from '@saxonberg/server/mud/api/persistable';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { makeStuff, makeStuffAtPath, stampTemplatePathForTest } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { Grade } from '@saxonberg/server/mud/lib/craft/Grade';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { BiomeApi } from '@saxonberg/server/mud/api/biome';
import { Evaporation } from '@saxonberg/server/mud/lib/material/Evaporation';

class TestHands extends ContainerMixin(Good) {
  static _mixinName = 'TestPatternHands';
}

const OAK = '/stuff/idea/material/_pattern/oak';
const GREEN_OAK = '/stuff/idea/material/_pattern/seasoning-oak';
const BRONZE = '/stuff/idea/material/_pattern/bronze';
const SWORD = '/stuff/thing/_pattern/sword';

function material(path: string, setup: (m: Material) => void): Material {
  const found = StuffApi.findByTemplatePath<Material>(path);
  if (found) return found;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(path.split('/').pop()!);
    setup(m);
    return m;
  }, path) as unknown as Material;
}

describe('carve pattern (ceramics D23)', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._setNowProviderForTesting(() => 7000);
    material(OAK, (m) => m.setDensity(Quantity.of(750, 'kg/m³')));
    material(GREEN_OAK, (m) => {
      m.setDensity(Quantity.of(750, 'kg/m³'));
      m.seasoningDays = 100;
    });
    const bronze = material(BRONZE, (m) => {
      m.setTags(['metal']);
      m.setDensity(Quantity.of(8800, 'kg/m³'));
      m.setMeltingPoint(Quantity.of(1220, 'K'));
      m.setThermalExpansion(1.8e-5);
    });
    vi.spyOn(MaterialApi, 'findByTag').mockReturnValue([bronze]);
    vi.spyOn(PersistableApi, 'captureHostOf').mockResolvedValue(undefined as never);
    vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string) => {
      const p = makeStuff(() => new Pattern());
      stampTemplatePathForTest(p, path);
      return p;
    }) as unknown as typeof StuffApi.clone);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    WorldClockApi._resetForTesting();
  });

  it('⭐ a board plans a pattern oversize by bronze\'s shrink; the pattern presses the SWORD\'s shape', async () => {
    const hands = makeStuff(() => new TestHands());
    const board = makeStuff(() => new Board());
    board.setMaterial(StuffApi.findByTemplatePath<Material>(OAK)!);
    board.setMass(Quantity.of(6, 'kg'));
    ContainmentApi.move(board, hands);
    const sword = makeStuff(() => new Good());
    stampTemplatePathForTest(sword, SWORD);
    sword.setMaterial(StuffApi.findByTemplatePath<Material>(BRONZE)!);
    sword.setMass(Quantity.of(1, 'kg'));
    const knife = makeStuff(() => new Tool());
    knife.setCapabilities(['cutting']);
    const plan = await board.carvePlanFor({ actor: hands, word: 'pattern', knife, of: sword, forWord: 'bronze' });
    expect(plan?.ok).toBe(true);
    if (!plan?.ok) return;
    await plan.onComplete();
    const pattern = hands.getContents().find((c) => c instanceof Pattern) as Pattern | undefined;
    expect(pattern).toBeDefined();
    const imp = pattern!.leaveImpression(0)!;
    const s = StuffApi.findByTemplatePath<Material>(BRONZE)!.castShrinkage();
    expect(s).toBeGreaterThan(0.01);
    expect(imp.kindPath).toBe(SWORD);
    expect(imp.allowance).toBeCloseTo(s, 9);
    expect(imp.volumeL).toBeCloseTo((1 / 8800) * 1000 * Math.pow(1 + s, 3), 6);
    // The board is spent.
    expect(board.isDestroyed()).toBe(true);
  });

  it('refuses without an edge, and without a metal to cut for', async () => {
    const board = makeStuff(() => new Board());
    board.setMaterial(StuffApi.findByTemplatePath<Material>(OAK)!);
    board.setMass(Quantity.of(6, 'kg'));
    const thing = makeStuff(() => new Good());
    stampTemplatePathForTest(thing, SWORD);
    thing.setMaterial(StuffApi.findByTemplatePath<Material>(OAK)!);
    thing.setMass(Quantity.of(1, 'kg'));
    const hands = makeStuff(() => new TestHands());
    const noEdge = await board.carvePlanFor({ actor: hands, word: 'pattern', knife: null, of: thing, forWord: '' });
    expect(noEdge?.ok).toBe(false);
    const knife = makeStuff(() => new Tool());
    knife.setCapabilities(['cutting']);
    const noMetal = await board.carvePlanFor({ actor: hands, word: 'pattern', knife, of: thing, forWord: '' });
    expect(noMetal?.ok).toBe(false);
    if (noMetal && !noMetal.ok) expect(noMetal.reason).toBe('no-metal');
  });

  /** A seasoned oak board in a carver's hands, a bronze sword, an edge. */
  function bench(woodPath = OAK) {
    const hands = makeStuffAtPath(() => new TestHands(), '/platform/agent/Avatar/pattern-maker');
    const board = makeStuff(() => new Board());
    board.setMaterial(StuffApi.findByTemplatePath<Material>(woodPath)!);
    board.setMass(Quantity.of(6, 'kg'));
    ContainmentApi.move(board, hands);
    const sword = makeStuff(() => new Good());
    stampTemplatePathForTest(sword, SWORD);
    sword.setMaterial(StuffApi.findByTemplatePath<Material>(BRONZE)!);
    sword.setMass(Quantity.of(1, 'kg'));
    const knife = makeStuff(() => new Tool());
    knife.setCapabilities(['cutting']);
    return { hands, board, sword, knife };
  }

  it('⭐ any word but a pattern is not the board\'s to plan — `carve peg on board` is a recipe (B103)', async () => {
    const { hands, board, knife } = bench();
    expect(await board.carvePlanFor({ actor: hands, word: 'peg', knife })).toBeNull();
  });

  it('⭐ green stock is refused: it would shrink after it was cut (B103)', async () => {
    // Still air: the board neither dries nor wets while it is asked.
    const air = new Evaporation(55, 0, 290);
    vi.spyOn(BiomeApi, 'airFor').mockImplementation((() => air) as never);
    vi.spyOn(BiomeApi, 'localHumidityFor').mockImplementation((() => air.humidityPct) as never);
    vi.spyOn(BiomeApi, 'airSegmentsFor').mockImplementation(((_s: unknown, t0: number, t1: number) => [
      { air, durationS: t1 - t0, rainMmPerH: 0 },
    ]) as never);
    const { hands, board, sword, knife } = bench(GREEN_OAK);
    board.setSeasonedFraction(0);
    const plan = await board.carvePlanFor({ actor: hands, word: 'pattern', knife, of: sword, forWord: 'bronze' });
    expect(plan && !plan.ok ? plan.reason : null).toBe('green-stock');
    board.setSeasonedFraction(1);
    const later = await board.carvePlanFor({ actor: hands, word: 'pattern', knife, of: sword, forWord: 'bronze' });
    expect(later?.ok).toBe(true);
  });

  it('⭐ a checked board makes a pattern no better than fair — weakest link (B103)', async () => {
    const { hands, board, sword, knife } = bench();
    // (Narrowed: TS loses the grade surface down this mixin chain.)
    if (!MixinApi.isGraded(board)) throw new Error('a board is graded');
    board.setGrade(Grade.of('fine'));
    board.addFlaw('check', true);
    const plan = await board.carvePlanFor({ actor: hands, word: 'pattern', knife, of: sword, forWord: 'bronze' });
    if (!plan?.ok) throw new Error('expected a plan');
    await plan.onComplete();
    const pattern = hands.getContents().find((c) => c instanceof Pattern) as Pattern;
    if (!MixinApi.isGraded(pattern)) throw new Error('a pattern is graded');
    expect(pattern.getGrade().getBand()).toBe('fair');
    expect(pattern.getMaker()).not.toBe('');
  });
});
