/**
 * ⭐ A herd grazes a FIELD (tracts build D34): its line is written
 * `<tract>#<fieldKey>` and read back to the same field fixture — the
 * tract by its path when it is the one authored tract.
 */
import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, afterEach } from 'vitest';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import HerdRegistry from '../idea/HerdRegistry';
import Tract from '@saxonberg/content-trade-farming/src/location/Tract';
import Field from '@saxonberg/content-trade-farming/src/thing/Field';
import { makeStuff, makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';

const REGISTRY_PATH = '/trade/ranching/idea/HerdRegistry';
const TRACT_PATH = '/world/_test/farm/location/home-field';

function tractWith(keys: string[]): Tract {
  const tract = makeStuffAtPath(() => new Tract(), TRACT_PATH);
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
