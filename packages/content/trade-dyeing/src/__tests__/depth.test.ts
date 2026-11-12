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
import Herb from '@saxonberg/server/mud/platform/idea/material/Herb';
import Place from '@saxonberg/server/mud/lib/stuff/Place';
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
import DyeBath from '../lib/DyeBath';
import MordantController from '../idea/cmd/dyeing/MordantController';

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

let room: Place;
let dyer: TestActor;
let sent: string[];

function material(path: string, name: string, tags: string[]): Herb {
  return (
    StuffApi.findByTemplatePath<Herb>(path) ??
    makeStuffAtPath(() => {
      const m = new Herb();
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
  await completeStep(DyeBath.DYE_BASE_MS * 2);
  const top = c.getDyeStack().at(-1)!;
  return top.strength;
}

beforeEach(async () => {
  await standUpBranchHarness();
  sent = [];
  room = makeStuff(() => new Place());
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

describe('⭐ C9 — the mordant is the bath, and a dose is spent (controller-liquidity W11)', () => {
  const ALUM = '/trade/dyeing/idea/material/alum';
  function alumBath(litres: number): Bath {
    const b = makeStuff(() => new Bath());
    (b as unknown as { interiorBulk: boolean }).interiorBulk = true;
    b.setInteriorCapacity(Quantity.of(20, 'L'));
    b.setBulkMaterial('interior', material(ALUM, 'alum', ['mordant', 'mineral', 'brightening']));
    b.setBulkAmount('interior', Quantity.of(litres, 'L'));
    ContainmentApi.move(b, room as never);
    return b;
  }
  function bare(): Cloth {
    const c = makeStuff(() => new Cloth());
    c.setMaterial(material(fibres.silk.path, 'silk', fibres.silk.tags));
    ContainmentApi.move(c, dyer as never);
    return c;
  }
  async function mordant(c: Cloth, b: Bath, named = false): Promise<CommandContext> {
    const ctx = makeContext(dyer as unknown as Stuff, room as unknown as Stuff, 'mordant');
    await makeStuff(() => new MordantController()).execute(
      { target: { stuff: c, raw: 'cloth' }, bath: { stuff: [b], raw: '', ...(named ? { prep: 'in' } : {}) } } as never,
      ctx,
    );
    await completeStep(DyeBath.MORDANT_BASE_MS * 2);
    return ctx;
  }

  it('an alum bath lays alum on the cloth and gives up a dose', async () => {
    const c = bare();
    const b = alumBath(5);
    await mordant(c, b);
    expect(c.getDyeStack().at(-1)).toMatchObject({ mordant: 'alum', strength: 0, dyestuff: ALUM });
    expect(b.getBulkAmount('interior').rawValue()).toBeCloseTo(5 - DyeBath.MORDANT_DOSE_L, 6);
  });

  it('a madder bath is not a mordant; a dry tub cannot take a piece', async () => {
    const c = bare();
    // Bare, a madder bath is not chosen at all; named, it says why.
    expect((await mordant(c, bath())).getNotes().map((n) => (n as { reason?: string }).reason)).toContain('no-bath');
    const notes = (await mordant(c, bath(), true)).getNotes().map((n) => (n as { reason?: string }).reason);
    expect(notes).toContain('not-a-mordant');
    const thin = (await mordant(c, alumBath(0.5))).getNotes().map((n) => (n as { reason?: string }).reason);
    expect(thin).toContain('too-little');
    expect(c.getDyeStack()).toHaveLength(0);
  });
});
