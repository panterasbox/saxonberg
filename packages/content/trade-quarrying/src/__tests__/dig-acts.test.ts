/**
 * ⭐⭐ **`dig` through the CONTROLLER and the ENGAGEMENT** — the gap the live
 * drive found, closed where it is cheap to keep closed.
 *
 * `OpenWorking.test.ts` calls `planWork`/`completeWork` directly and passes:
 * the arithmetic is right. What it cannot see is everything between a player's
 * word and that arithmetic — the controller's resolution ladder, the engaged
 * step, and whether the **effect actually lands when the timer does**. The
 * first drive run said *"You set into the drift, cutting and casting back."*
 * and then the clay band was still buried three swings later, which is a verb
 * that looks like it works.
 *
 * ⚠ So this file drives the controller and SETTLES the engagement, which is
 * the shape `trade-mining`'s `acts.test.ts` uses for exactly the same reason —
 * the mining acts shipped a completion that never ran and a live drive is what
 * found it.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import DigController from '@saxonberg/server/mud/platform/idea/cmd/ground/DigController';
import SplitController from '@saxonberg/server/mud/platform/idea/cmd/ground/SplitController';
import OpenWorkingLocation from '../location/OpenWorking';
import Block from '../thing/Block';
import { LIFT_M, type OpenWorking } from '../lib/Working';
import Deposit from '@saxonberg/content-ground/src/idea/Deposit';
import CartesianZone from '@saxonberg/server/mud/platform/idea/location/CartesianZone';
import Material from '@saxonberg/server/mud/platform/idea/material/Material';
import ToolItem from '@saxonberg/server/mud/platform/thing/ToolItem';
import Thing from '@saxonberg/server/mud/lib/stuff/Thing';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { Document } from '@saxonberg/server/mud/lib/persistence/Document';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import {
  TestActor,
  standUpBranchHarness,
  makeContext,
  completeStep,
} from '@saxonberg/server/mud/platform/idea/cmd/crafting/__tests__/branch-fixtures';
import {
  makeStuff,
  makeStuffAtPath,
} from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { CommandContext } from '@saxonberg/server/mud/api/command';

const ZONE = '/world/fx-dig/quarry';
const DEPOSIT = '/world/fx-dig/idea/deposit/fx';
const DRIFT = '/stuff/idea/material/bulk/drift';
const CLAY = '/stuff/idea/material/earth/clay';
const GRANITE = '/stuff/idea/material/rock/granite';
const SPOIL_ROW = '/trade/quarrying/thing/spoil';
const BLOCK_ROW = '/trade/quarrying/thing/block';
const PIECE_ROW = '/trade/quarrying/thing/piece';

let zone: CartesianZone;
let room: TestActor;
let actor: TestActor;
let pit: Stuff & OpenWorking;
let seq = 0;

function seedMaterials(): void {
  const mat = (path: string, name: string, tags: string[], mpa: number): void => {
    const m = makeStuffAtPath(() => new Material(), path) as unknown as Material & {
      hardness: Quantity<'MPa'>;
    };
    m.setName(name);
    m.setTags(tags);
    m.hardness = Quantity.of(mpa, 'MPa');
  };
  mat(DRIFT, 'drift', ['earth', 'mixture'], 2);
  mat(CLAY, 'clay', ['earth', 'solid', 'clay'], 3);
  mat(GRANITE, 'granite', ['rock', 'igneous'], 200);
}

type Runnable = Stuff & { execute(model: never, ctx: CommandContext): unknown };

async function run(
  Controller: new () => Runnable,
  model: Record<string, unknown>,
  text: string,
): Promise<CommandContext> {
  const ctx = makeContext(actor as unknown as Stuff, room as unknown as Stuff, text);
  await makeStuff<Runnable>(() => new Controller()).execute(model as never, ctx);
  return ctx;
}

/**
 * ⚠⚠ **Advance past the engaged step AND drain the completion chain.** The
 * `onComplete` callback fires when the timer lands; the effect (the mint, the
 * chattel stamp with its registry write) is several awaits past it. A single
 * macrotask drain lands between the two and reads the ledger unchanged — which
 * is how a verb that does nothing passes a test.
 */
async function settle(ms = 60_000): Promise<void> {
  await completeStep(ms);
  for (let i = 0; i < 12; i++) await new Promise<void>((r) => setTimeout(r, 0));
}

function rejected(ctx: CommandContext): string | null {
  const note = ctx.getNotes().find((n) => n.kind === 'controller-rejected');
  return note ? (note as unknown as { reason: string }).reason : null;
}

const tool = (...caps: string[]): { raw: string; stuff: Stuff } => {
  const t = makeStuff(() => {
    const i = new ToolItem();
    i.capabilities = caps;
    return i;
  }) as unknown as Stuff;
  ContainmentApi.move(t as Stuff & Containable, actor as unknown as Stuff & Container);
  return { raw: caps[0] ?? 'tool', stuff: t };
};

beforeEach(async () => {
  await standUpBranchHarness();
  installV1QuantityMarshallers();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  Document.setMarshallerResolver(
    () => undefined,
    async () => undefined,
  );
  seedMaterials();

  // The won rows, stubbed: what is under test is the LEDGER and the floor.
  vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string) => {
    const t = makeStuff(() => new Thing());
    t.setShortDescription(
      path === SPOIL_ROW
        ? 'load of spoil'
        : path === BLOCK_ROW
          ? 'block of stone'
          : path === PIECE_ROW
            ? 'piece of stone'
            : 'thing',
    );
    t.setMass(Quantity.of(10, 'kg'));
    return t;
  }) as never);

  zone = makeStuffAtPath(() => new CartesianZone(), `${ZONE}-${seq}`);
  zone.setCellSize(10);
  const depositPath = `${DEPOSIT}-${seq}`;
  (zone as unknown as { deposit: string }).deposit = depositPath;
  const deposit = makeStuffAtPath(() => new Deposit(), depositPath);
  deposit.setName('fx');
  deposit.setStratigraphy([
    { toZ: -1, host: DRIFT, wins: SPOIL_ROW },
    { toZ: -2, host: CLAY },
    { toZ: -6, host: GRANITE, wins: BLOCK_ROW },
    { toZ: -400, host: GRANITE },
  ]);
  deposit.setWaterTable(-12);
  seq += 1;

  pit = makeStuff(() => new OpenWorkingLocation()) as unknown as Stuff & OpenWorking;
  pit.faceRunM = 20;
  zone.addLocation(pit as unknown as never, 0, 0, 0);
  room = pit as unknown as TestActor;
  actor = makeStuff(() => new TestActor()) as unknown as TestActor;
  ContainmentApi.move(
    actor as unknown as Stuff & Containable,
    pit as unknown as Stuff & Container,
  );
});

afterEach(() => vi.restoreAllMocks());

describe('⭐⭐ the effect lands when the timer does', () => {
  it('bare-handed, the GROUND refuses and names the spade', async () => {
    const ctx = await run(DigController as never, {}, 'dig');
    expect(rejected(ctx)).toBe('no-spade');
  });

  it('⭐⭐ one swing with a spade DROPS THE FLOOR — the drive’s finding', async () => {
    // This is the assertion whose absence let a verb that narrates and does
    // nothing reach a live world.
    const before = pit.getFloorDepthM();
    const ctx = await run(DigController as never, { tool: tool('digging') }, 'dig');
    expect(rejected(ctx)).toBeNull();
    await settle();
    expect(
      pit.getFloorDepthM(),
      'the floor did not drop: the engaged completion never reached ' +
        '`completeWork`, or its write was lost',
    ).toBeCloseTo(before + LIFT_M, 10);
  });

  it('…and the band’s LEDGER moved with it', async () => {
    await run(DigController as never, { tool: tool('digging') }, 'dig');
    await settle();
    expect(pit.wonByBand[DRIFT]).toBe(1);
  });

  it('⭐ two swings open the CLAY band, which was buried before them', async () => {
    // The floor has to reach 1 m for the clay's top (−1) to be at or above it.
    const buried = await run(
      DigController as never,
      { target: { raw: 'clay', stuff: null }, tool: tool('digging') },
      'dig clay',
    );
    expect(rejected(buried)).toBe('under-overburden');

    for (let i = 0; i < 2; i += 1) {
      await run(DigController as never, { tool: tool('digging') }, 'dig');
      await settle();
    }
    const open = await run(
      DigController as never,
      { target: { raw: 'clay', stuff: null }, tool: tool('digging') },
      'dig clay',
    );
    expect(
      rejected(open),
      'the clay is still buried after two lifts — the floor is not dropping',
    ).toBeNull();
  });

  it('⭐ the spoil is MINTED, and it lands somewhere a person can see', async () => {
    await run(DigController as never, { tool: tool('digging') }, 'dig');
    await settle();
    const loose = (pit as unknown as Stuff & Container)
      .getContents()
      .filter((c) => c.getPresentation().includes('spoil'));
    expect(loose.length).toBeGreaterThan(0);
  });

  it('⭐⭐ and a block off the granite can be SPLIT — through the controller', async () => {
    // Down to the granite (top −2, so the floor must reach 2 m), then win one.
    for (let i = 0; i < 4; i += 1) {
      await run(DigController as never, { tool: tool('digging') }, 'dig');
      await settle();
    }
    const won = await run(
      DigController as never,
      { target: { raw: 'granite', stuff: null }, tool: tool('winning', 'striking') },
      'dig granite',
    );
    expect(rejected(won)).toBeNull();
    await settle();

    const block = (pit as unknown as Stuff & Container)
      .getContents()
      .find((c) => c.getPresentation().includes('block'));
    expect(block, 'no block came off the granite face').toBeDefined();

    // ⚠ The stub clones a plain `Thing`, so the split is driven against a real
    // `Block` standing in the room — what is under test is the CONTROLLER path.
    const real = makeStuff(() => {
      const b = new Block();
      b.setMass(Quantity.of(1375, 'kg'));
      b.setMaterial(StuffApi.findByTemplatePath<Material>(GRANITE) as Material);
      return b;
    }) as unknown as Block;
    ContainmentApi.move(
      real as unknown as Stuff & Containable,
      pit as unknown as Stuff & Container,
    );
    const before = real.getPiecesLeft();
    const split = await run(
      SplitController as never,
      {
        target: { raw: 'block', stuff: real as unknown as Stuff },
        tool: tool('striking'),
      },
      'split block',
    );
    expect(rejected(split)).toBeNull();
    await settle();
    expect(
      real.getPiecesLeft(),
      'the split narrated and took nothing off the block',
    ).toBe(before - 1);
  });

  it('⚠ `dig up` refuses through the controller too', async () => {
    const ctx = await run(
      DigController as never,
      { target: { raw: 'up', stuff: null }, tool: tool('winning') },
      'dig up',
    );
    expect(rejected(ctx)).toBe('no-face-above');
  });

  it('the credit the GROUND named reaches the transcript', async () => {
    await run(DigController as never, { tool: tool('digging') }, 'dig');
    await settle();
    expect(MixinApi.isAdvancing(actor as unknown as Stuff)).toBe(true);
  });
});
