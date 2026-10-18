/**
 * ⭐⭐ AC 10 + AC 9's second half — the bond penalty pays in DEPTH (silk W4).
 *
 * In one madder bath, alum-mordanted: degummed silk comes up deep; linen
 * with no tannin comes up at half the depth (cellulose holds no metal);
 * raw silk still in its gum comes up thin too. Real `dye` controller, real
 * bath, real dye stack; the bath is a plain bulk vessel holding the
 * madder material.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Good from '@saxonberg/server/mud/platform/thing/Good';
import Material from '@saxonberg/server/mud/platform/idea/material/Material';
import Location from '@saxonberg/server/mud/lib/stuff/Location';
import { DyedMixin } from '@saxonberg/server/mud/lib/material/Dyed';
import { BulkableMixin } from '@saxonberg/server/mud/lib/bulk/Bulkable';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { SchedulerApi } from '@saxonberg/server/mud/api/scheduler';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { makeStuff, makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import {
  TestActor,
  makeContext,
  completeStep,
  standUpBranchHarness,
} from '@saxonberg/server/mud/platform/idea/cmd/crafting/__tests__/branch-fixtures';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { CommandContext } from '@saxonberg/server/mud/api/command';
import DyeController from '../idea/cmd/dyeing/DyeController';
import Dyestuff from '../idea/Dyestuff';

class Cloth extends DyedMixin(Good) {
  static _mixinName = 'DepthTestCloth';
}
class Bath extends BulkableMixin(Good) {
  static _mixinName = 'DepthTestBath';
}

const MADDER = '/trade/farming/idea/material/madder';
const fibres = {
  silk: { path: '/trade/sericulture/idea/material/silk', tags: ['fibre', 'protein'] },
  linen: { path: '/stuff/idea/material/textile/linen', tags: ['fibre', 'cellulose'] },
  rawSilk: { path: '/trade/sericulture/idea/material/raw-silk', tags: ['fibre', 'protein', 'gummed'] },
};

let room: Location;
let dyer: TestActor;
let sent: string[];

function material(path: string, name: string, tags: string[]): Material {
  return (
    StuffApi.findByTemplatePath<Material>(path) ??
    makeStuffAtPath(() => {
      const m = new Material();
      m.setName(name);
      m.setTags(tags);
      return m;
    }, path)
  );
}

function bath(): Bath {
  const b = makeStuff(() => new Bath());
  (b as unknown as { interiorBulk: boolean }).interiorBulk = true;
  b.setInteriorCapacity(Quantity.of(20, 'L'));
  b.setBulkMaterial('interior', material(MADDER, 'madder', ['dyestuff']));
  b.setBulkAmount('interior', Quantity.of(20, 'L'));
  ContainmentApi.move(b, room as never);
  return b;
}

/** A piece of `fibre`, mordanted with alum (the pending zero-strength entry). */
function cloth(fibre: keyof typeof fibres): Cloth {
  const c = makeStuff(() => new Cloth());
  c.setMaterial(material(fibres[fibre].path, fibre, fibres[fibre].tags));
  c.applyDye({ dyestuff: '/trade/dyeing/idea/material/alum', mordant: 'alum', strength: 0 });
  ContainmentApi.move(c, dyer as never);
  return c;
}

async function dye(c: Cloth, b: Bath): Promise<number> {
  const ctx: CommandContext = makeContext(dyer as unknown as Stuff, room as unknown as Stuff, 'dye');
  await makeStuff(() => new DyeController()).execute(
    { target: { stuff: c, raw: 'cloth' }, bath: { stuff: [b], raw: '' } } as never,
    ctx,
  );
  await completeStep(DyeController.BASE_MS * 2);
  const top = c.getDyeStack().at(-1)!;
  return top.strength;
}

beforeEach(async () => {
  await standUpBranchHarness();
  sent = [];
  room = makeStuff(() => new Location());
  dyer = makeStuff(() => new TestActor());
  ContainmentApi.move(dyer as never, room as never);
  makeStuffAtPath(() => {
    const d = new Dyestuff();
    d.setKey('madder');
    d.setMaterialPath(MADDER);
    d.setChemistry('mordant');
    d.setShades([
      { mordant: 'alum', colour: 'a clear red', fastness: 0.8, transmitR: 0.9, transmitG: 0.2, transmitB: 0.2 },
    ]);
    return d;
  }, '/trade/dyeing/idea/dyestuff/madder');
  vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
    const chain = {
      topic: () => chain,
      toSelf: (m: unknown) => {
        sent.push(String(m));
        return chain;
      },
      toPeers: () => chain,
      send: () => {},
    };
    return chain as never;
  });
});
afterEach(() => {
  SchedulerApi._clearAllForTesting();
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('dye depth pays the bond penalty', () => {
  it('⭐ AC 10 — alum-mordanted silk takes madder deeper than un-tannined linen', async () => {
    const silk = await dye(cloth('silk'), bath());
    const linen = await dye(cloth('linen'), bath());
    expect(silk).toBeGreaterThan(0);
    expect(linen).toBeCloseTo(silk / 2, 6);
  });

  it('⭐ AC 9 — raw silk still in its gum dyes thin, and is told why', async () => {
    const silk = await dye(cloth('silk'), bath());
    const raw = await dye(cloth('rawSilk'), bath());
    expect(raw).toBeCloseTo(silk / 2, 6);
    expect(sent.join(' ')).toMatch(/still in its gum/);
  });
});
