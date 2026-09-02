/**
 * Ground support (metal chain M4): the timber set, `shore`, the refusal,
 * and loose falling.
 *
 * ⭐⭐ **The safety model, stated once and asserted here: ground cannot
 * kill, and no character can be trapped.** A fall blocks a FACE, never a
 * room; every exit stays open; the cost is a shift's work and a bruise.
 * The one lethal hazard in this build is air (M5), and it is lethal
 * because it carries a free continuous warning, an obvious unilateral
 * escape, and needs no rescue.
 *
 * ⭐ And the second design assertion: **shoring is the provisioning
 * act.** The act that makes the ground safe is the act that writes the
 * record — so *"a working persists iff it is shored"* needs no separate
 * bookkeeping.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ShoreController from '../ShoreController';
import HewController from '../HewController';
import DriveController from '../DriveController';
import TimberSet from '../../../../thing/TimberSet';
import MineWarren from '../../../MineWarren';
import Deposit from '../../../Deposit';
import MineRoom from '../../../../location/MineRoom';
import Ore from '../../../../thing/Ore';
import CartesianZone from '@saxonberg/server/mud/platform/idea/location/CartesianZone';
import Material from '@saxonberg/server/mud/platform/idea/material/Material';
import PersistentHydrator from '@saxonberg/server/mud/platform/idea/persistence/PersistentHydrator';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { ChattelApi } from '@saxonberg/server/mud/api/chattel';
import { ConditionApi } from '@saxonberg/server/mud/api/condition';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { Reserve, ReservedMixin } from '@saxonberg/server/mud/lib/reserve';
import { VitalsMixin } from '@saxonberg/server/mud/lib/vitals/Vitals';
import {
  makeStuff,
  makeStuffAtPath,
  stampTemplatePathForTest,
} from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { Document } from '@saxonberg/server/mud/lib/persistence/Document';
import {
  TestActor,
  makeContext,
  completeStep,
  standUpBranchHarness,
} from '@saxonberg/server/mud/platform/idea/cmd/crafting/__tests__/branch-fixtures';
import type { CommandContext } from '@saxonberg/server/mud/api/command';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { Cell } from '../../../../location/Working';

const ZONE = '/world/fx-mine/mine';
const DEPOSIT = '/world/fx-mine/idea/deposit/fx';
const WARREN = '/world/fx-mine/idea/fx-warren';
const ORE_ROW = '/world/fx-mine/thing/copper-ore';
const SLATE = '/stuff/idea/material/rock/slate';
const GRANITE = '/stuff/idea/material/rock/granite';
const MALACHITE = '/stuff/idea/material/mineral/malachite';
const QUARTZ = '/stuff/idea/material/mineral/quartz';
const TYPE_ROWS = {
  face: '/world/fx-mine/location/face',
  junction: '/world/fx-mine/location/junction',
  stope: '/world/fx-mine/location/stope',
  fall: '/world/fx-mine/location/fall',
};

/** The harness actor, plus the reserve labour is paid out of and a body
 *  a bruise can land on. */
class Miner extends VitalsMixin(ReservedMixin(TestActor)) {}
type Runnable = Stuff & { execute(model: never, ctx: CommandContext): unknown };

let zone: CartesianZone;
let warren: MineWarren;
let actor: Miner;

async function settle(ms: number): Promise<void> {
  await completeStep(ms);
  for (let i = 0; i < 8; i++) await new Promise<void>((r) => setTimeout(r, 0));
}

function room(cell: Cell): MineRoom {
  const r = makeStuff(() => new MineRoom());
  r.setOreRow(ORE_ROW);
  stampTemplatePathForTest(r, TYPE_ROWS.face);
  zone.addLocation(r as unknown as never, cell[0], cell[1], cell[2]);
  return r;
}

async function run(
  Controller: new () => Runnable,
  model: Record<string, unknown>,
  where: Stuff,
  text: string,
): Promise<CommandContext> {
  const ctx = makeContext(actor as unknown as Stuff, where, text);
  await makeStuff<Runnable>(() => new Controller()).execute(model as never, ctx);
  return ctx;
}

function rejected(ctx: CommandContext): string | null {
  const note = ctx.getNotes().find((n) => n.kind === 'controller-rejected');
  return note ? (note as unknown as { reason: string }).reason : null;
}

function timber(): TimberSet {
  return makeStuff(() => new TimberSet());
}

describe('ground support', () => {
  beforeEach(async () => {
    await standUpBranchHarness();
    installV1QuantityMarshallers();
    Document.setMarshallerResolver(() => undefined, async () => undefined);
    for (const [path, mpa] of [
      [SLATE, 90], [GRANITE, 200], [MALACHITE, 200], [QUARTZ, 1100],
    ] as const) {
      const m = makeStuffAtPath(() => new Material(), path);
      (m as unknown as { hardness: Quantity<'MPa'> }).hardness = Quantity.of(mpa, 'MPa');
    }
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(ChattelApi, 'stamp').mockResolvedValue({} as never);

    zone = makeStuffAtPath(() => new CartesianZone(), ZONE);
    zone.setCellSize(10);
    (zone as unknown as { deposit: string }).deposit = DEPOSIT;

    const d = makeStuffAtPath(() => new Deposit(), DEPOSIT);
    d.setStratigraphy([{ toZ: -4000, host: SLATE }]);
    d.setWaterTable(-450);
    d.setLode({
      through: [0, 0, -10], strike: 90, dip: 90,
      thickness: 6, strikeExtent: 2000, dipExtent: 2000, gangue: QUARTZ,
    });
    d.setZones([{ toZ: -4000, mineral: MALACHITE, meanGrade: 0.08, spread: 0.04 }]);

    warren = makeStuffAtPath(() => new MineWarren(), WARREN);
    warren.setTypeRows(TYPE_ROWS);
    warren.setZonePath(ZONE);
    warren.setMineExtent('/world/fx-mine');

    /*
     * ⚠⚠ **The real hydrator, standing in the index before the mock
     * below can answer for it.**
     *
     * `shore` promotes a cell and writes its record, and the persistence
     * spine reaches `StuffApi.singleton(PersistentHydrator.templatePath)`
     * on the way. `singleton` falls through to `clone` on a miss — and
     * the clone mock answers for EVERY path, so it handed back a
     * `MineRoom`, and `hydrator.hydrate is not a function` escaped as an
     * unhandled rejection AFTER the test's assertions had already
     * passed. The suite went green and the package exited 1.
     *
     * ⭐ Registering the real one is the honest fix: it puts the
     * promotion through the actual hydrator rather than mocking the
     * spine out from under the act this file exists to prove.
     */
    makeStuffAtPath(() => new PersistentHydrator(), PersistentHydrator.templatePath);

    vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string) => {
      if (path === ORE_ROW) return makeStuff(() => new Ore()) as unknown as Stuff;
      const r = makeStuff(() => new MineRoom());
      r.setOreRow(ORE_ROW);
      stampTemplatePathForTest(r, path);
      return r as unknown as Stuff;
    }) as never);

    actor = makeStuff(() => new Miner());
    actor.setReserve(
      new Reserve('endurance', Quantity.of(100, '%'), Quantity.of(100, '%'), 'body', 'collapse'),
    );
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('a timber set is a THING — it wears, and its condition is what the working counts', async () => {
    const here = room([0, 0, -1]);
    const set = timber();
    expect(MixinApi.isTool(set) && set.hasCapability('timber-set')).toBe(true);
    expect(MixinApi.isDurable(set)).toBe(true);
    ContainmentApi.move(set as unknown as Stuff & Containable, here as unknown as Stuff & Container);
    expect(here.supportHere()).toBe(1);
    set.wear(0.5);
    expect(here.supportHere()).toBeCloseTo(0.5, 6);
    // …so `repair` — the shipped economy, untouched — is the answer.
    set.setCondition(1);
    expect(here.supportHere()).toBe(1);
  });

  it('⭐ shoring PROMOTES the cell: the act that makes ground safe is the act that writes the record', async () => {
    const here = (await warren.carve([0, 0, -1], 'face'))! as unknown as MineRoom;
    expect(warren.tierOf([0, 0, -1])).toBe('provisional');
    ContainmentApi.move(actor as unknown as Stuff & Containable, here as unknown as Stuff & Container);
    ContainmentApi.move(timber() as unknown as Stuff & Containable, actor as unknown as Stuff & Container);

    const ctx = await run(ShoreController as never, {}, here as unknown as Stuff, 'shore');
    expect(rejected(ctx)).toBeNull();
    await settle(60000);
    expect(warren.tierOf([0, 0, -1])).toBe('held');
    expect(here.supportHere()).toBe(1);
  });

  it('shoring with no timber declines and says where to get some', async () => {
    const here = room([0, 0, -1]);
    ContainmentApi.move(actor as unknown as Stuff & Containable, here as unknown as Stuff & Container);
    const ctx = await run(ShoreController as never, {}, here as unknown as Stuff, 'shore');
    expect(rejected(ctx)).toBe('no-timber');
  });

  it('⚠ an unshored heading refuses further driving; shoring clears the refusal', async () => {
    const here = room([0, 0, -1]);
    warren.addMember(here as unknown as Stuff & Container);
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]) room([dx!, dy!, -1]);
    ContainmentApi.move(actor as unknown as Stuff & Containable, here as unknown as Stuff & Container);

    expect((await here.stabilityAt()).state).toBe('bad');
    expect(rejected(await run(DriveController as never, { direction: 'up' }, here as unknown as Stuff, 'drive up')))
      .toBe('bad-ground');

    ContainmentApi.move(timber() as unknown as Stuff & Containable, actor as unknown as Stuff & Container);
    await run(ShoreController as never, {}, here as unknown as Stuff, 'shore');
    await settle(60000);
    ContainmentApi.move(timber() as unknown as Stuff & Containable, actor as unknown as Stuff & Container);
    await run(ShoreController as never, {}, here as unknown as Stuff, 'shore');
    await settle(60000);
    expect((await here.stabilityAt()).state).not.toBe('bad');
    expect(rejected(await run(DriveController as never, { direction: 'up' }, here as unknown as Stuff, 'drive up')))
      .toBeNull();
  });

  it('a DECAYED set re-raises the refusal — a rotten prop is worth less than a sound one', async () => {
    const here = room([0, 0, -1]);
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]) room([dx!, dy!, -1]);
    const a = timber(); const b = timber();
    for (const t of [a, b]) {
      ContainmentApi.move(t as unknown as Stuff & Containable, here as unknown as Stuff & Container);
    }
    expect((await here.stabilityAt()).state).not.toBe('bad');
    a.setCondition(0.05);
    b.setCondition(0.05);
    expect((await here.stabilityAt()).state).toBe('bad');
  });

  it('⭐ the free telegraph rides the SAME threshold as the refusal, so they cannot drift apart', async () => {
    const here = room([0, 0, -1]);
    expect(await here.groundTelegraph()).toBeNull();
    expect((await here.stabilityAt()).state).toBe('sound');
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) room([dx!, dy!, -1]);
    expect((await here.stabilityAt()).state).toBe('working');
    expect(await here.groundTelegraph()).not.toBeNull();
  });

  it('⚠⚠ a fall blocks ONE FACE, the room stays traversable, and nobody can be trapped or killed', async () => {
    const here = room([0, 0, -1]);
    // Four open sides: the ground is bad — but we shore just enough to
    // work, so the state is `working` and the telegraph has already fired.
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) room([dx!, dy!, -1]);
    const state = (await here.stabilityAt()).state;
    expect(state).toBe('working');
    expect(await here.groundTelegraph()).not.toBeNull();

    // Undercut the face: worked out but for the last lump.
    const faces = await here.facesOf();
    const target = faces.find((f) => f.kind === 'seam' && !f.open)!;
    here.recordWinning(target.direction, (target.remaining ?? 1) - 1);

    const hurt = vi.spyOn(ConditionApi, 'inflict').mockReturnValue({} as never);
    ContainmentApi.move(actor as unknown as Stuff & Containable, here as unknown as Stuff & Container);
    await run(HewController as never, { face: target.direction }, here as unknown as Stuff, `hew ${target.direction}`);
    await settle(60000);

    // The face blocked…
    expect(here.getBlockedFaces()).toContain(target.direction);
    // …and NOTHING else did. Every exit the room had, it still has, and
    // the character is standing in it.
    expect([...here.getExits().keys()].length).toBe(0);
    expect((here as unknown as Stuff & Container).getContents()).toContain(
      actor as unknown as Stuff,
    );
    // A bruise, through the shipped harm channel — never a killing blow.
    expect(hurt).toHaveBeenCalled();
    const spec = hurt.mock.calls[0]![1] as { mechanism: string; energy: number };
    expect(spec.mechanism).toBe('blunt');
    expect(spec.energy).toBeLessThan(100);
  });

  it('a blocked face is CLEARED by the same act, and then works again', async () => {
    const here = room([0, 0, -1]);
    ContainmentApi.move(actor as unknown as Stuff & Containable, here as unknown as Stuff & Container);
    const faces = await here.facesOf();
    const target = faces.find((f) => f.kind === 'seam' && !f.open)!;
    here.blockFace(target.direction);
    expect((await here.facesOf()).find((f) => f.direction === target.direction)!.blocked).toBe(true);

    await run(HewController as never, { face: target.direction }, here as unknown as Stuff, `hew ${target.direction}`);
    await settle(60000);
    expect(here.getBlockedFaces()).not.toContain(target.direction);
    // …and clearing it won no ore: the swing went on the wrong rock.
    expect(
      (here as unknown as Stuff & Container).getContents().some((c) => c instanceof Ore),
    ).toBe(false);
  });

  it('sound ground never runs, however hard the face is worked', async () => {
    const here = room([0, 0, -1]); // no neighbours, no span
    expect((await here.stabilityAt()).state).toBe('sound');
    ContainmentApi.move(actor as unknown as Stuff & Containable, here as unknown as Stuff & Container);
    const faces = await here.facesOf();
    const target = faces.find((f) => f.kind === 'seam' && !f.open)!;
    for (let i = 0; i < (target.remaining ?? 1); i++) {
      await run(HewController as never, { face: target.direction }, here as unknown as Stuff, 'hew');
      await settle(60000);
    }
    expect(here.getBlockedFaces()).toEqual([]);
  });
});
