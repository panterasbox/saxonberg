/**
 * ⭐ A die (ceramics S16): a blank struck on it takes its device when the
 * blow beats the blank's stiffness, and the token carries whose die it was.
 */
import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Die from '../Die';
import Ingot from '@saxonberg/server/mud/platform/thing/Ingot';
import Good from '@saxonberg/server/mud/lib/stuff/Good';
import Material from '@saxonberg/server/mud/platform/idea/material/Material';
import { ContainerMixin } from '@saxonberg/server/mud/lib/spatial/Container';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { PersistableApi } from '@saxonberg/server/mud/api/persistable';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { makeStuff, makeStuffAtPath, stampTemplatePathForTest } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';

class TestRoom extends ContainerMixin(Good) {
  static _mixinName = 'TestDieRoom';
}

const PEWTER = '/stuff/idea/material/_die/pewter';
const STEEL = '/stuff/idea/material/_die/steel';
const TOKEN = '/trade/smelting/thing/_test/token';

function metal(path: string, hardness: number): Material {
  const found = StuffApi.findByTemplatePath<Material>(path);
  if (found) return found;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(path.split('/').pop()!);
    m.setTags(['metal']);
    m.setDensity(Quantity.of(7900, 'kg/m³'));
    m.setHardness(Quantity.of(hardness, 'MPa'));
    m.setMeltingPoint(Quantity.of(1700, 'K'));
    return m;
  }, path) as unknown as Material;
}

function blank(matPath: string, room: TestRoom): Ingot {
  const b = makeStuff(() => new Ingot());
  b.setMaterial(StuffApi.findByTemplatePath<Material>(matPath)!);
  b.setMass(Quantity.of(0.02, 'kg'));
  ContainmentApi.move(b, room);
  return b;
}

describe('a striking die (ceramics S16)', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._setNowProviderForTesting(() => 5000);
    metal(PEWTER, 45);
    metal(STEEL, 600);
    vi.spyOn(PersistableApi, 'captureHostOf').mockResolvedValue(undefined as never);
    vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string) => {
      const t = makeStuff(() => new Ingot());
      stampTemplatePathForTest(t, path);
      return t;
    }) as unknown as typeof StuffApi.clone);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    WorldClockApi._resetForTesting();
  });

  it('⭐ a soft blank takes the device, and the token says whose die struck it', async () => {
    const room = makeStuff(() => new TestRoom());
    const die = makeStuff(() => new Die());
    die.setStrikes(TOKEN);
    die.setMaker('/platform/agent/Avatar/the-founder');
    const b = blank(PEWTER, room);
    const by = makeStuff(() => new TestRoom());
    await die.strikeWith(b, 60, by);
    expect(b.isDestroyed()).toBe(true);
    const token = room.getContents().find((c) => c.getTemplatePath() === TOKEN) as unknown as Ingot;
    expect(token).toBeDefined();
    expect(token.getMaterial()?.getTemplatePath()).toBe(PEWTER);
    expect(token.getCastFrom()?.takenFromIdentity).toBe('/platform/agent/Avatar/the-founder');
  });

  it('a hard cold blank barely takes it — heat it, or strike harder', async () => {
    const room = makeStuff(() => new TestRoom());
    const die = makeStuff(() => new Die());
    die.setStrikes(TOKEN);
    const b = blank(STEEL, room);
    await die.strikeWith(b, 60, makeStuff(() => new TestRoom()));
    expect(b.isDestroyed()).toBe(false);
  });
});
