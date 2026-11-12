/**
 * ⭐ The Old Steading's paddock gate against the shipped rows (size and
 * carrying W7, drive 18): the gate's authored opening, the mule's species
 * (mass, stature) and the pannier row's box are read off disk, and a body of
 * those numbers passes the gate bare and is refused with a pannier pair hung
 * from its pack saddle — *its canvas panniers won't go through*. A row edit
 * that would let a laden mule through the gate (or stop a bare one) fails
 * here, before a drive does.
 */
import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { dirname, join } from 'path';
import YAML from 'yaml';
import CartesianZone from '../../../platform/idea/location/CartesianZone';
import Location from '../../../lib/location/Location';
import Exit from '../../../lib/boundary/Exit';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { Placements } from '../../../lib/spatial/Placement';
import { buildAllModes } from '../../../lib/locomotion/__tests__/test-helpers';
import { installForms } from '../../../lib/spatial/__tests__/size-fixture';
import { installV1QuantityMarshallers } from '../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { makeBody, pack, wornGarment } from '../../../lib/slot/__tests__/carrying-fixture';
import { makeStuff } from '../../../lib/security/__tests__/test-setup';

const req = createRequire(import.meta.url);
const root = (pkg: string): string => join(dirname(req.resolve(`${pkg}/package.json`)), 'content');
const row = (pkg: string, ...path: string[]): { data: Record<string, unknown> } =>
  YAML.parse(readFileSync(join(root(pkg), ...path), 'utf-8')) as { data: Record<string, unknown> };

describe('the steading paddock gate (drive 18)', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    installForms();
    buildAllModes();
  });
  afterEach(() => StuffApi.clearAll());

  it('⭐ a bare mule passes; a mule with its pannier pair does not, and says why', async () => {
    const yard = row('@saxonberg/content-newbie-wilds', 'world', 'newbie-wilds', 'steading', 'yard.yaml');
    const opening = (yard.data['exits'] as Record<string, { opening: { width: number; height: number } }>)['north']!
      .opening;
    const species = row(
      '@saxonberg/content-transport',
      'stuff/idea/species/animalia/chordata/mammalia/perissodactyla/equidae/equus/asinus-mulus.yaml',
    );
    const pannierRow = row('@saxonberg/content-trade-tanning', 'trade/tanning/thing/pannier.yaml');
    const box = pannierRow.data['dimensions'] as { width: number; depth: number; height: number };
    expect(opening.width).toBe(0.8);

    const zone = makeStuff(() => new CartesianZone());
    const here = makeStuff(() => new Location());
    const paddock = makeStuff(() => new Location());
    zone.addLocation(here, 0, 0, 0);
    zone.addLocation(paddock, 0, 1, 0);
    const gate = makeStuff(() => new Exit({ direction: 'north', source: here, destination: paddock, media: ['ground'] }));
    gate.setOpening(opening);
    await here.addExit(gate);
    const { me: mule, plan } = makeBody({
      mass: species.data['adultMass'] as number,
      stature: species.data['stature'] as number,
      hands: false,
    });
    ContainmentApi.move(mule, here);
    const saddle = await wornGarment(mule, plan, 'pack saddle', 'back', [Placements.FROM], 7);
    expect((await gate.canTraverse(mule, 'walk')).ok).toBe(true);

    for (let i = 0; i < 2; i++) {
      const p = pack('pannier', 3, [box.width, box.depth, box.height]);
      p.setShortDescription(pannierRow.data['shortDescription'] as string);
      ContainmentApi.move(p, saddle, 'from');
    }
    const refused = await gate.canTraverse(mule, 'walk');
    expect(refused.ok).toBe(false);
    expect(refused.context?.['about']).toBe("its canvas panniers won't go through — take them off first.");
  });
});
