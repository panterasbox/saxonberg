/**
 * ⭐ A herd grazes a FIELD (tracts build D34): its line is written
 * `<tract>#<fieldKey>` and read back to the same field fixture — the
 * tract by its path when it is the one authored tract.
 */
import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { CirculationWarren } from '@saxonberg/server/mud/lib/location/CirculationWarren';
import HerdRegistry from '../idea/HerdRegistry';
import Tract from '@saxonberg/content-trade-farming/src/location/Tract';
import Field from '@saxonberg/content-trade-farming/src/thing/Field';
import { makeStuff, makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';

const REGISTRY_PATH = '/trade/ranching/idea/HerdRegistry';
const TRACT_PATH = '/world/_test/farm/location/home-field';

function tractWith(keys: string[], key?: string): Tract {
  const tract = makeStuffAtPath(() => new Tract(), TRACT_PATH);
  if (key) tract.setPersistenceKey(key);
  tract.setAreaM2(1000);
  tract.fields = keys.map((key) => ({ key, name: `the ${key}`, share: 1 / keys.length }));
  for (const spec of tract.fields) {
    const field = makeStuff(() => new Field());
    tract.addFixture(field, `field:${spec.key}`);
    field.configureField(spec, 1000 / keys.length);
  }
  return tract;
}

describe("a herd's line names a field", () => {
  afterEach(() => StuffApi.clearAll());

  it('⭐ writes <tract>#<key> and reads back the same field', async () => {
    const registry = makeStuffAtPath(() => new HerdRegistry(), REGISTRY_PATH);
    const tract = tractWith(['gate-end', 'far-side']);
    const far = tract.fieldByKey('far-side')!;
    const ref = registry.refOf(far);
    expect(ref).toBe(`${TRACT_PATH}#far-side`);
    expect(await registry.fieldOf(ref)).toBe(far);
  });

  it('a key the tract does not have names nothing', async () => {
    const registry = makeStuffAtPath(() => new HerdRegistry(), REGISTRY_PATH);
    tractWith(['sward']);
    expect(await registry.fieldOf(`${TRACT_PATH}#gone`)).toBeNull();
    expect(await registry.fieldOf(TRACT_PATH)).toBeNull();
  });
});

/**
 * ⭐ A farm sold off a layout holds a KEYED copy of each tract
 * (`<row>#<lot>/<leaf>`), and the herd's line names the copy. It is found
 * through the farm that owns it (`CirculationWarren.admitFor`, which
 * admits the holding — waking it when it sleeps), never by a scan of the
 * row's instances.
 */
describe("a herd's line names a field on a keyed tract copy", () => {
  const KEY = '/world/_test/farm/lots/lot-7/lower-meadow';

  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('⭐ resolves through the farm while its tract copy is live', async () => {
    const registry = makeStuffAtPath(() => new HerdRegistry(), REGISTRY_PATH);
    const tract = tractWith(['gate-end', 'far-side'], KEY);
    const admit = vi.spyOn(CirculationWarren, 'admitFor').mockResolvedValue(tract as never);
    const scan = vi.spyOn(StuffApi, 'findAllByTemplatePath');
    const far = tract.fieldByKey('far-side')!;
    const ref = registry.refOf(far);
    expect(ref).toBe(`${TRACT_PATH}#${KEY}#far-side`);
    expect(await registry.fieldOf(ref)).toBe(far);
    expect(admit).toHaveBeenCalledWith(KEY);
    expect(scan).not.toHaveBeenCalled();
  });

  it('⭐⭐ resolves while the farm is ASLEEP — admitting it stands the copy up', async () => {
    const registry = makeStuffAtPath(() => new HerdRegistry(), REGISTRY_PATH);
    // Nothing is standing: the tract exists only once the farm is admitted.
    expect(StuffApi.findAllByTemplatePath(TRACT_PATH)).toHaveLength(0);
    const admit = vi
      .spyOn(CirculationWarren, 'admitFor')
      .mockImplementation(async () => tractWith(['gate-end', 'far-side'], KEY) as never);
    const field = await registry.fieldOf(`${TRACT_PATH}#${KEY}#far-side`);
    expect(admit).toHaveBeenCalledWith(KEY);
    expect(field).toBeInstanceOf(Field);
    expect(field!.getFieldKey()).toBe('far-side');
    expect(field!.getTract()?.getDurableHandle()).toBe(`${TRACT_PATH}#${KEY}`);
  });

  it("the farm's entry room, or another copy, is not the tract the line names", async () => {
    const registry = makeStuffAtPath(() => new HerdRegistry(), REGISTRY_PATH);
    const other = tractWith(['far-side'], '/world/_test/farm/lots/lot-8/lower-meadow');
    vi.spyOn(CirculationWarren, 'admitFor').mockResolvedValue(other as never);
    expect(await registry.fieldOf(`${TRACT_PATH}#${KEY}#far-side`)).toBeNull();
  });

  it('a key no institution covers names nothing', async () => {
    const registry = makeStuffAtPath(() => new HerdRegistry(), REGISTRY_PATH);
    vi.spyOn(CirculationWarren, 'admitFor').mockResolvedValue(null);
    expect(await registry.fieldOf(`${TRACT_PATH}#${KEY}#far-side`)).toBeNull();
  });
});
