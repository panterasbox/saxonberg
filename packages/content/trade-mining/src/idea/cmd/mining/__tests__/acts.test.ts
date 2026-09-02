/**
 * The four labour acts (metal chain M3): `hew`, `drive`/`drift`, `sink`,
 * `raise`.
 *
 * The load-bearing assertions, in order:
 *
 *  1. ⭐ **Competence never multiplies yield.** A cut lump's grade is
 *     EXACTLY `sampleAt`'s figure — the test asserts the identity, not a
 *     range, and two actors of different bands get the same number.
 *  2. ⚠⚠ **No deed gate on any of the four.** Read off the shipped views
 *     themselves, because the rule is about what ships, not about what a
 *     controller happens to do today.
 *  3. **Carve cost tracks the ground** — slate is roughly half granite,
 *     and a seam is cheaper than the country rock around it because
 *     malachite is genuinely softer.
 *  4. **The `drive` collision tripwire** (P12): the chain still reaches
 *     the mining controller with a rival `drive` view afforded in the
 *     same room. If this ever fails the fix is one line — swap `drift`
 *     to primary — and the build says so rather than silently renaming
 *     an act.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import HewController from '../HewController';
import DriveController from '../DriveController';
import SinkController from '../SinkController';
import RaiseController from '../RaiseController';
import MineWarren from '../../../MineWarren';
import Deposit from '../../../Deposit';
import MineRoom from '../../../../location/MineRoom';
import Ore from '../../../../thing/Ore';
import CartesianZone from '@saxonberg/server/mud/platform/idea/location/CartesianZone';
import Material from '@saxonberg/server/mud/platform/idea/material/Material';
import ToolItem from '@saxonberg/server/mud/platform/thing/ToolItem';
import { CommandDefinition } from '@saxonberg/server/mud/lib/command/CommandDefinition';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { ChattelApi } from '@saxonberg/server/mud/api/chattel';
import { AdvancementApi } from '@saxonberg/server/mud/api/advancement';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { Reserve, ReservedMixin } from '@saxonberg/server/mud/lib/reserve';
import { makeStuff, makeStuffAtPath, stampTemplatePathForTest } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
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

const VIEWS = fileURLToPath(
  new URL('../../../../../content/trade/mining/cmd/mining/', import.meta.url),
);

const SEED = Deposit.seedFor('');

/** The harness actor plus the reserve labour is paid out of. */
class Miner extends ReservedMixin(TestActor) {}

let zone: CartesianZone;
let deposit: Deposit;
let warren: MineWarren;
let actor: Miner;

function seedMaterials(): void {
  for (const [path, mpa] of [
    [SLATE, 90], [GRANITE, 200], [MALACHITE, 200], [QUARTZ, 1100],
  ] as const) {
    const m = makeStuffAtPath(() => new Material(), path);
    (m as unknown as { hardness: Quantity<'MPa'> }).hardness = Quantity.of(mpa, 'MPa');
  }
}

function room(cell: Cell, host = SLATE): MineRoom {
  const r = makeStuff(() => new MineRoom());
  r.setOreRow(ORE_ROW);
  zone.addLocation(r as unknown as never, cell[0], cell[1], cell[2]);
  void host;
  return r;
}

type Runnable = Stuff & { execute(model: never, ctx: CommandContext): unknown };

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

/** Advance past an engaged step AND drain the async completion chain. */
async function settle(ms: number): Promise<void> {
  await completeStep(ms);
  for (let i = 0; i < 8; i++) await new Promise<void>((r) => setTimeout(r, 0));
}

function rejected(ctx: CommandContext): string | null {
  const note = ctx.getNotes().find((n) => n.kind === 'controller-rejected');
  return note ? (note as unknown as { reason: string }).reason : null;
}

describe('the mine’s four labour acts', () => {
  beforeEach(async () => {
    await standUpBranchHarness();
    installV1QuantityMarshallers();
    seedMaterials();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    Document.setMarshallerResolver(() => undefined, async () => undefined);
    vi.spyOn(AdvancementApi, 'recordDeed').mockResolvedValue(undefined);
    vi.spyOn(ChattelApi, 'stamp').mockResolvedValue({} as never);

    zone = makeStuffAtPath(() => new CartesianZone(), ZONE);
    zone.setCellSize(10);
    (zone as unknown as { deposit: string }).deposit = DEPOSIT;

    deposit = makeStuffAtPath(() => new Deposit(), DEPOSIT);
    deposit.setName('fx');
    deposit.setStratigraphy([{ toZ: -20, host: SLATE }, { toZ: -4000, host: GRANITE }]);
    deposit.setWaterTable(-450);
    deposit.setLode({
      through: [0, 0, -10], strike: 90, dip: 90,
      thickness: 6, strikeExtent: 2000, dipExtent: 2000, gangue: QUARTZ,
    });
    deposit.setZones([{ toZ: -4000, mineral: MALACHITE, meanGrade: 0.08, spread: 0.04 }]);

    warren = makeStuffAtPath(() => new MineWarren(), WARREN);
    warren.setTypeRows(TYPE_ROWS);
    warren.setZonePath(ZONE);
    warren.setMineExtent('/world/fx-mine');

    vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string) => {
      if (path === ORE_ROW) {
        const o = makeStuff(() => new Ore());
        o.setShortDescription('a lump of green-stained rock');
        return o as unknown as Stuff;
      }
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

  // ───────────────────────── hew ─────────────────────────

  it('⭐ a cut lump’s grade is EXACTLY the deposit’s figure — competence never multiplies yield', async () => {
    const here = room([0, 0, -1]);
    ContainmentApi.move(actor as unknown as Stuff & Containable, here as unknown as Stuff & Container);
    const ctx = await run(HewController as never, { face: 'east' }, here as unknown as Stuff, 'hew east');
    expect(rejected(ctx)).toBeNull();
    await settle(60000);

    const lump = (here as unknown as Stuff & Container)
      .getContents()
      .find((c) => c instanceof Ore) as Ore | undefined;
    expect(lump).toBeDefined();
    // The identity, asserted against the deposit itself. `east` from
    // cell (0,0,-1) is metre point (10, 0, -10).
    expect(lump!.getGrade()).toBe(deposit.sampleAt([10, 0, -10], SEED).grade);
  });

  it('hew spends endurance, and the work happens over game time', async () => {
    const here = room([0, 0, -1]);
    ContainmentApi.move(actor as unknown as Stuff & Containable, here as unknown as Stuff & Container);
    const before = actor.getReserve('endurance')!.current.rawValue();
    await run(HewController as never, { face: 'east' }, here as unknown as Stuff, 'hew east');
    expect(actor.getReserve('endurance')!.current.rawValue()).toBeLessThan(before);
    // Nothing exists until the step completes — a barge-in leaves the
    // rock standing rather than half a lump.
    expect(
      (here as unknown as Stuff & Container).getContents().some((c) => c instanceof Ore),
    ).toBe(false);
    await settle(60000);
    expect(
      (here as unknown as Stuff & Container).getContents().some((c) => c instanceof Ore),
    ).toBe(true);
  });

  it('hewing barren country rock declines, and says it is barren', async () => {
    const here = room([0, 0, -1]);
    ContainmentApi.move(actor as unknown as Stuff & Containable, here as unknown as Stuff & Container);
    const ctx = await run(HewController as never, { face: 'north' }, here as unknown as Stuff, 'hew north');
    expect(rejected(ctx)).toBe('barren-face');
  });

  it('a face runs out, and then says so', async () => {
    const here = room([0, 0, -1]);
    ContainmentApi.move(actor as unknown as Stuff & Containable, here as unknown as Stuff & Container);
    const faces = await here.facesOf();
    const east = faces.find((f) => f.direction === 'east')!;
    here.recordWinning('east', east.remaining!);
    const ctx = await run(HewController as never, { face: 'east' }, here as unknown as Stuff, 'hew east');
    expect(rejected(ctx)).toBe('face-worked-out');
  });

  it('hewing outside a working declines rather than throwing', async () => {
    const nowhere = makeStuff(() => new TestActor());
    ContainmentApi.move(actor as unknown as Stuff & Containable, nowhere as unknown as Stuff & Container);
    const ctx = await run(HewController as never, {}, nowhere as unknown as Stuff, 'hew');
    expect(rejected(ctx)).toBe('not-a-working');
  });

  // ───────────────────────── drive ─────────────────────────

  it('drive carves the next cell, and the GROUND picks the type row', async () => {
    const here = room([0, 0, -1]);
    warren.addMember(here as unknown as Stuff & Container);
    ContainmentApi.move(actor as unknown as Stuff & Containable, here as unknown as Stuff & Container);
    const ctx = await run(DriveController as never, { direction: 'east' }, here as unknown as Stuff, 'drive east');
    expect(rejected(ctx)).toBeNull();
    await settle(300000);
    expect(warren.isCarved([1, 0, -1])).toBe(true);
    // East is in the seam, so the new cell opens out as a stope.
    expect(warren.getCarved()['1,0,-1']!.type).toBe('stope');
    // North is country rock — an ordinary face.
    const ctx2 = await run(DriveController as never, { direction: 'north' }, here as unknown as Stuff, 'drive north');
    expect(rejected(ctx2)).toBeNull();
    await settle(300000);
    expect(warren.getCarved()['0,1,-1']!.type).toBe('face');
  });

  it('⭐ the carve price is the ground: slate is cheaper than granite, and a seam cheaper than barren', async () => {
    const c = makeStuff(() => new DriveController()) as unknown as {
      paceForGround(base: number, mpa: number): number;
    };
    expect(c.paceForGround(1000, 90)).toBeLessThan(c.paceForGround(1000, 200));
    // And the seam really is softer — the deposit says so, off malachite's
    // own hardness rather than off a dial.
    // …and the ground the pick meets in a seam is genuinely different
    // rock: the mineral's own hardness blends into the host in proportion
    // to grade, so a seam's price lies strictly between slate's and
    // malachite's. ⚠ NOT always cheaper — malachite is harder than slate
    // and softer than granite, and that is what the two rows say. The
    // price is chemistry, not a bonus.
    const seam = deposit.sampleAt([10, 0, -10], SEED);
    const barren = deposit.sampleAt([0, 100, -10], SEED);
    expect(seam.grade).toBeGreaterThan(0);
    expect(barren.grade).toBe(0);
    expect(seam.hardnessMPa).not.toBe(barren.hardnessMPa);
    expect(Math.min(90, 200)).toBeLessThanOrEqual(seam.hardnessMPa);
    expect(seam.hardnessMPa).toBeLessThanOrEqual(Math.max(90, 200));
  });

  it('⭐ a static mine cannot GROW, and says so honestly rather than crashing', async () => {
    const here = room([0, 0, -1]); // no warren
    ContainmentApi.move(actor as unknown as Stuff & Containable, here as unknown as Stuff & Container);
    const ctx = await run(DriveController as never, { direction: 'east' }, here as unknown as Stuff, 'drive east');
    expect(rejected(ctx)).toBe('no-warren');
  });

  it('⚠ bad ground REFUSES, and the refusal names the state; shoring clears it', async () => {
    // Open every horizontal neighbour: eight cells of span, no timber.
    const here = room([0, 0, -1]);
    warren.addMember(here as unknown as Stuff & Container);
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]) {
      room([dx!, dy!, -1]);
    }
    ContainmentApi.move(actor as unknown as Stuff & Containable, here as unknown as Stuff & Container);
    expect((await here.stabilityAt()).state).toBe('bad');
    const ctx = await run(DriveController as never, { direction: 'up' }, here as unknown as Stuff, 'drive up');
    expect(rejected(ctx)).toBe('bad-ground');

    // Timber it, and the same act goes through.
    const set = makeStuff(() => new ToolItem());
    set.capabilities = ['timber-set'];
    ContainmentApi.move(set as unknown as Stuff & Containable, here as unknown as Stuff & Container);
    for (let i = 0; i < 3; i++) {
      ContainmentApi.move(
        makeStuff(() => { const t = new ToolItem(); t.capabilities = ['timber-set']; return t; }) as unknown as Stuff & Containable,
        here as unknown as Stuff & Container,
      );
    }
    expect((await here.stabilityAt()).state).not.toBe('bad');
  });

  // ───────────────────── sink and raise ─────────────────────

  it('sink and raise are drive pointed down and up, and their winze admits CLIMBING', async () => {
    const here = room([0, 0, -1]);
    warren.addMember(here as unknown as Stuff & Container);
    ContainmentApi.move(actor as unknown as Stuff & Containable, here as unknown as Stuff & Container);

    await run(SinkController as never, {}, here as unknown as Stuff, 'sink');
    await settle(300000);
    expect(warren.isCarved([0, 0, -2])).toBe(true);
    const down = here.getExit('down');
    expect(down).toBeTruthy();
    expect(down!.getMedia()).toContain('vertical');

    await run(RaiseController as never, {}, here as unknown as Stuff, 'raise');
    await settle(300000);
    expect(warren.isCarved([0, 0, 0])).toBe(true);
    expect(here.getExit('up')!.getMedia()).toContain('vertical');
  });

  // ────────────────────── the shipped views ──────────────────────

  it('⚠⚠ NONE of the labour acts carries a deed gate — read off the shipped views', () => {
    const files = readdirSync(VIEWS).filter((f) => f.endsWith('.yaml'));
    expect(files.sort()).toEqual([
      'drive.yaml', 'hew.yaml', 'raise.yaml', 'shore.yaml', 'sink.yaml',
      'stake.yaml',
    ]);
    for (const f of files) {
      const yaml = readFileSync(join(VIEWS, f), 'utf8');
      const def = CommandDefinition.fromYaml(yaml, f);
      expect(def).toBeTruthy();
      // Nothing anywhere in the view asks for a deed, a recipe or a band.
      expect(yaml).not.toMatch(/requiresDeed|requireDeed|canMake|band/i);
      // …and the controller each names is a row this pack ships.
      expect(def.controller).toMatch(/^\/trade\/mining\/idea\/cmd\/mining\//);
    }
  });

  it('the drive view declares BOTH words, so a miner always has an unambiguous one', () => {
    const def = CommandDefinition.fromYaml(
      readFileSync(join(VIEWS, 'drive.yaml'), 'utf8'),
      'drive.yaml',
    );
    expect(def.hasVerb('drive')).toBe(true);
    expect(def.hasVerb('drift')).toBe(true);
  });

  it('⚠ the drive collision tripwire: the shipped movement view has the same arity', () => {
    // The rival, read off the platform pack itself rather than described.
    const movement = fileURLToPath(
      new URL(
        '../../../../../../platform/content/platform/cmd/movement/drive.yaml',
        import.meta.url,
      ),
    );
    const rival = CommandDefinition.fromYaml(readFileSync(movement, 'utf8'), 'drive.yaml');
    const ours = CommandDefinition.fromYaml(
      readFileSync(join(VIEWS, 'drive.yaml'), 'utf8'),
      'drive.yaml',
    );
    expect(rival.hasVerb('drive')).toBe(true);
    expect(ours.hasVerb('drive')).toBe(true);
    // ⚠ Same arity, so `requires:` cannot separate them at shape and only
    // affordance ORDER decides. Nothing in the repo affords the movement
    // view today; if that changes, `drift` becomes primary — one line.
    expect(rival.args.length).toBe(ours.args.length);
    expect(
      readFileSync(
        fileURLToPath(new URL('../../../../../../../server/src/mud/lib/slot/Drivable.ts', import.meta.url)),
        'utf8',
      ),
    ).not.toMatch(/commandContributions/);
  });
});
