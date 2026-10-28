/**
 * `dip` — ⭐ ONE act, and the BATH plans it (ceramics D14). The kernel's
 * default bath is any vessel whose held material lays a coat: it lays a
 * WET coat on the dipped good's named faces. A bath that lays none says
 * so; an empty one says so; a bare `dip crock` coats every face it has.
 * (The chandler's candle — a bath that plans its own dip — is the
 * chandlery pack's suite.)
 */

import '../../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import DipController from '../DipController';
import CompoundingVessel from '../../../../thing/CompoundingVessel';
import Material from '../../../../../lib/material/Material';
import { Quantity } from '../../../../../lib/quantity';
import { ContainmentApi } from '../../../../../api/containment';
import { ExecutionContextApi } from '../../../../../api/execution-context';
import type { CommandContext } from '../../../../../api/command';
import type { Stuff } from '../../../../../lib/stuff/Stuff';
import {
  TestActor,
  standUpBranchHarness,
  makeContext,
  completeStep,
} from './branch-fixtures';
import { makeStuff, makeStuffAtPath } from '../../../../../lib/security/__tests__/test-setup';

const GLAZE = '/stuff/idea/material/_test/dip-glaze';
const WATER = '/stuff/idea/material/_test/dip-water';
const BODY = '/stuff/idea/material/_test/dip-body';

let room: TestActor;
let actor: TestActor;

const made = new Map<string, Material>();
function material(path: string, laysCoat: boolean): Material {
  const had = made.get(path);
  if (had && !had.isDestroyed()) return had;
  const m = makeStuffAtPath(() => {
    const m = new Material();
    m.setName(path.split('/').pop()!);
    m.setDensity(Quantity.of(1500, 'kg/m³'));
    m.setLaysCoat(laysCoat);
    return m;
  }, path) as unknown as Material;
  made.set(path, m);
  return m;
}

/** A vessel; `holding` fills its interior with litres of a material. */
/** A tub — the bath that plans a coat dip (`CompoundingMixin`). */
function vessel(holding?: { path: string; litres: number }): CompoundingVessel {
  const v = makeStuff(() => new CompoundingVessel());
  v.interiorBulk = true;
  v.setInteriorCapacity(Quantity.of(20, 'L'));
  v.setMass(Quantity.of(1.5, 'kg'));
  v.setMaterial(material(BODY, false));
  if (holding) {
    v.setBulkMaterial('interior', material(holding.path, holding.path === GLAZE));
    v.setBulkAmount('interior', Quantity.of(holding.litres, 'L'));
  }
  ContainmentApi.move(v, room);
  return v;
}

async function dip(target: Stuff | null, baths: Stuff[], face?: string): Promise<CommandContext> {
  const context = makeContext(actor, room, 'dip');
  await ExecutionContextApi.runRoot(null, 'test', async () => {
    ExecutionContextApi.tagActingAuthor(actor);
    await makeStuff(() => new DipController()).execute(
      {
        ...(target ? { target: { stuff: target, raw: 'crock' } } : {}),
        bath: { stuff: baths, raw: 'bucket' },
        ...(face ? { face } : {}),
      } as never,
      context,
    );
  });
  return context;
}

const refused = (c: CommandContext): string | undefined =>
  c.getNotes().find((n) => n.kind === 'controller-rejected')?.reason;

beforeEach(async () => {
  await standUpBranchHarness();
  made.clear();
  room = makeStuff(() => new TestActor());
  actor = makeStuffAtPath(() => new TestActor(), '/platform/agent/Avatar/dipper-1');
  ContainmentApi.move(actor, room);
});

afterEach(() => vi.restoreAllMocks());

describe('dip — the bath plans it', () => {
  it('⭐ a glaze bath lays a WET coat on the inside only, when told inside', async () => {
    const crock = vessel();
    const bucket = vessel({ path: GLAZE, litres: 8 });
    const ctx = await dip(crock, [bucket], 'inside');
    expect(refused(ctx)).toBeUndefined();
    await completeStep(120_000);
    expect(crock.getCoats('inside')).toHaveLength(1);
    expect(crock.getCoats('inside')[0]!.state).toBe('wet');
    expect(crock.getCoats('inside')[0]!.material).toBe(GLAZE);
    expect(crock.getCoats('outside')).toHaveLength(0);
    // The bath gave up what the skin holds.
    expect(bucket.getBulkAmount('interior').rawValue()).toBeLessThan(8);
  });

  it('a bare `dip crock` coats every face it has', async () => {
    const crock = vessel();
    const bucket = vessel({ path: GLAZE, litres: 8 });
    await dip(crock, [bucket]);
    await completeStep(120_000);
    expect(crock.getCoats('inside')).toHaveLength(1);
    expect(crock.getCoats('outside')).toHaveLength(1);
  });

  it('a water bath will not lay a coat, and says so', async () => {
    const crock = vessel();
    const tub = vessel({ path: WATER, litres: 8 });
    expect(refused(await dip(crock, [tub]))).toBe('lays-no-coat');
    expect(crock.getCoats('outside')).toHaveLength(0);
  });

  it('an empty bath: nothing to dip in', async () => {
    const crock = vessel();
    const bucket = vessel();
    expect(refused(await dip(crock, [bucket]))).toBe('nothing-to-dip-in');
  });

  it('a face word that is not a face is refused, naming the two', async () => {
    const crock = vessel();
    const bucket = vessel({ path: GLAZE, litres: 8 });
    expect(refused(await dip(crock, [bucket], 'sideways'))).toBe('bad-face');
  });

  it('the thing dipped is never its own bath', async () => {
    const crock = vessel({ path: GLAZE, litres: 2 });
    expect(refused(await dip(crock, [crock]))).toBe('nothing-to-dip-in');
  });
});
