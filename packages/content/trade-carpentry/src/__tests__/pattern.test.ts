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

class TestHands extends ContainerMixin(Good) {
  static _mixinName = 'TestPatternHands';
}

const OAK = '/stuff/idea/material/_pattern/oak';
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
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    plan.onComplete();
    for (let i = 0; i < 6; i++) await new Promise((r) => setTimeout(r, 0));
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
    expect(noEdge.ok).toBe(false);
    const knife = makeStuff(() => new Tool());
    knife.setCapabilities(['cutting']);
    const noMetal = await board.carvePlanFor({ actor: hands, word: 'pattern', knife, of: thing, forWord: '' });
    expect(noMetal.ok).toBe(false);
    if (!noMetal.ok) expect(noMetal.reason).toBe('no-metal');
  });
});
