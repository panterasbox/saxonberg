/**
 * The open working — ⭐ **the wall is a section, and the arithmetic on it is
 * the whole build.**
 *
 * What this pins, and the order is the order the lessons arrive in:
 *
 *  1. **Overburden is the gate.** At a fresh collar only the drift is open,
 *     and asking for stone refuses in words that say what to dig instead.
 *  2. **The tool is the constraint**, and the GROUND names it — a spade will
 *     not win granite and a pick will not shift drift, and one verb serves
 *     both because the refusal carries the lesson.
 *  3. **The floor drops a lift at a time** and exposes more bands, which is
 *     how a pit gets deeper; working a wall band retreats it and deepens
 *     nothing, which is how a pit gets wider.
 *  4. ⚠ **There is no face above you.** The collar rule is structural — the
 *     column is only sampled at `z ≤ 0` — and `dig up` says so.
 *  5. **The floor stops at the water**, and below it is somebody else's
 *     build.
 *  6. ⭐⭐ **320 units is CORRECT, and the ledger is authorable**, which is
 *     what lets a venue ship a worked-out face as a ROW rather than as a
 *     grind. This file asserts both halves: the number, and that a seeded
 *     ledger reads as worked out.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import OpenWorkingLocation from '../location/OpenWorking';
import { LIFT_M, OPEN_WORKING_MIXIN, type OpenWorking } from '../lib/OpenWorking';
import Deposit from '@saxonberg/content-ground/src/idea/Deposit';
import CartesianZone from '@saxonberg/server/mud/platform/idea/location/CartesianZone';
import Material from '@saxonberg/server/mud/platform/idea/material/Material';
import ToolItem from '@saxonberg/server/mud/platform/thing/ToolItem';
import Thing from '@saxonberg/server/mud/lib/stuff/Thing';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { CommandApi } from '@saxonberg/server/mud/api/command';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { Document } from '@saxonberg/server/mud/lib/persistence/Document';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import {
  makeStuff,
  makeStuffAtPath,
} from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Tooled } from '@saxonberg/server/mud/lib/craft/Tooled';
import type { WorkPlan, WorkRefusal } from '@saxonberg/server/mud/lib/ground/Workable';

const ZONE = '/world/fx-quarry/quarry';
const DEPOSIT = '/world/fx-quarry/idea/deposit/fx';
const DRIFT = '/stuff/idea/material/bulk/drift';
const CLAY = '/stuff/idea/material/earth/clay';
const GRANITE = '/stuff/idea/material/rock/granite';
const LIMESTONE = '/stuff/idea/material/rock/limestone';
const SPOIL_ROW = '/trade/quarrying/thing/spoil';
const BLOCK_ROW = '/trade/quarrying/thing/block';

let zone: CartesianZone;
let actor: Stuff;
let column: Deposit;

/** Materials, stated rather than loaded — a band is its tags and hardness. */
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
  mat(CLAY, 'clay', ['earth', 'solid'], 3);
  mat(GRANITE, 'granite', ['rock', 'igneous'], 200);
  mat(LIMESTONE, 'limestone', ['rock', 'carbonate', 'flux'], 120);
}

/**
 * A working over a stated column.
 *
 * ⭐ Literal rows, deliberately: this IS the second-pit claim — a working
 * anywhere is a row for what the ground holds plus a row for the place, with
 * no code. Everything below runs on a column that exists only here.
 */
let cellSeq = 0;

function seedColumn(): Deposit {
  const deposit = makeStuffAtPath(() => new Deposit(), DEPOSIT);
  deposit.setName('fx');
  deposit.setStratigraphy([
    { toZ: -1, host: DRIFT, wins: SPOIL_ROW },
    { toZ: -2, host: CLAY },
    { toZ: -6, host: GRANITE, wins: BLOCK_ROW },
    { toZ: -9, host: LIMESTONE },
    { toZ: -400, host: GRANITE },
  ]);
  deposit.setWaterTable(-12);
  return deposit;
}

function working(opts?: {
  floorDepthM?: number;
  wonByBand?: Record<string, number>;
  faceRunM?: number;
  waterTable?: number;
}): Stuff & OpenWorking {
  // ⚠ ONE deposit per test, not one per pit: `makeStuffAtPath` at a path
  // that already holds a row replaces it, and the pit that resolved the
  // first one then reads a column nobody owns — which surfaces as a refusal
  // with no reason a reader could find.
  if (opts?.waterTable !== undefined) column.setWaterTable(opts.waterTable);

  const pit = makeStuff(() => new OpenWorkingLocation()) as unknown as Stuff &
    OpenWorking;
  pit.faceRunM = opts?.faceRunM ?? 20;
  pit.floorDepthM = opts?.floorDepthM ?? 0;
  pit.wonByBand = opts?.wonByBand ?? {};
  // ⚠ Its own cell each time: two pits in one cell means the second evicts
  // the first out of the zone, and a working with no zone resolves no
  // column — which reads as a refusal for a reason no test could see.
  cellSeq += 1;
  zone.addLocation(pit as unknown as never, cellSeq, 0, 0);
  return pit;
}

/** A tool offering exactly the capabilities named. */
function tool(...capabilities: string[]): Stuff & Tooled {
  const t = makeStuff(() => {
    const item = new ToolItem();
    item.capabilities = capabilities;
    return item;
  }) as unknown as Stuff;
  return t as Stuff & Tooled;
}

const spade = () => tool('digging');
const pick = () => tool('winning', 'striking');

beforeEach(() => {
  StuffApi.clearAll();
  installV1QuantityMarshallers();
  vi.restoreAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  Document.setMarshallerResolver(
    () => undefined,
    async () => undefined,
  );
  seedMaterials();
  cellSeq = 0;
  zone = makeStuffAtPath(() => new CartesianZone(), ZONE);
  zone.setCellSize(10);
  (zone as unknown as { deposit: string }).deposit = DEPOSIT;
  column = seedColumn();
  actor = makeStuff(() => new Thing()) as unknown as Stuff;
  // The won goods are cloned; a bare harness has no rows, so the mint is
  // stubbed to a plain Thing. What the tests are about is the LEDGER.
  vi.spyOn(StuffApi, 'clone').mockImplementation((async () =>
    makeStuff(() => new Thing())) as never);
});

describe('the wall is a section through the ground', () => {
  it('⭐⭐ at a fresh collar only the DRIFT is open — overburden is the gate', async () => {
    const pit = working();
    const faces = await pit.exposedBands();
    expect(faces).toHaveLength(1);
    expect(faces[0]!.hostPath).toBe(DRIFT);
    expect(faces[0]!.earth).toBe(true);
    expect(faces[0]!.floor).toBe(true);
    expect(await pit.isBuried()).toBe(true);
  });

  it('…and asking for stone under it refuses in words that say what to dig', async () => {
    const pit = working();
    const out = (await pit.planWork(actor, pick(), 'granite')) as WorkRefusal;
    expect(out.kind).toBe('refusal');
    expect(out.reason).toBe('under-overburden');
    // ⭐ The lesson, not a wall: it names the thing to do next.
    expect(out.prose.toLowerCase()).toMatch(/floor has to come down|drift/);
  });

  it('⚠ a word that names nothing in the column is a DIFFERENT refusal', async () => {
    // Two absences that must not share a sentence: a band that exists and is
    // buried is a lesson; a word that names nothing is a mistake.
    const pit = working();
    const out = (await pit.planWork(actor, spade(), 'gold')) as WorkRefusal;
    expect(out.reason).toBe('no-such-face');
  });

  it('⚠⚠ there is NO FACE ABOVE YOU — the collar rule, stated', async () => {
    const pit = working({ floorDepthM: 3 });
    for (const word of ['up', 'above', 'sky']) {
      const out = (await pit.planWork(actor, pick(), word)) as WorkRefusal;
      expect(out.reason, word).toBe('no-face-above');
      expect(out.prose).toMatch(/nothing over your head but sky/);
    }
  });
});

describe('⭐⭐ the tool is the constraint, and the GROUND names it', () => {
  it('bare-handed refuses, naming what you want', async () => {
    const pit = working();
    const out = (await pit.planWork(actor, null, null)) as WorkRefusal;
    expect(out.reason).toBe('no-spade');
    expect(out.prose).toMatch(/take a spade to it/i);
  });

  it('a PICK will not shift drift', async () => {
    const pit = working();
    const out = (await pit.planWork(actor, pick(), null)) as WorkRefusal;
    expect(out.reason).toBe('no-spade');
    expect(out.prose).toMatch(/pick will not shift/i);
  });

  it('…and a SPADE will not win granite — one verb, and the refusal teaches', async () => {
    // ⭐ This pair is the whole of why `dig` absorbed `quarry`: the refusal
    // names the TOOL rather than naming another verb, so the player learns
    // the actual constraint instead of a vocabulary item.
    const pit = working({ floorDepthM: 2.5 });
    expect(await pit.isBuried()).toBe(false);
    const out = (await pit.planWork(actor, spade(), 'granite')) as WorkRefusal;
    expect(out.reason).toBe('no-pick');
    expect(out.prose).toMatch(/would want a pick/i);
    // The same face, with the right tool, plans.
    const ok = (await pit.planWork(actor, pick(), 'granite')) as WorkPlan;
    expect(ok.kind).toBe('plan');
  });

  it('the pace is the ROCK — granite is slower than drift', async () => {
    const shallow = working();
    const deep = working({ floorDepthM: 2.5 });
    const soft = (await shallow.planWork(actor, spade(), null)) as WorkPlan;
    const hard = (await deep.planWork(actor, pick(), 'granite')) as WorkPlan;
    expect(hard.durationMs).toBeGreaterThan(soft.durationMs * 5);
  });
});

describe('the floor drops, and the wall opens', () => {
  it('⭐ working the FLOOR deepens it a lift at a time and exposes more', async () => {
    const pit = working();
    const plan = (await pit.planWork(actor, spade(), null)) as WorkPlan;
    await pit.completeWork(actor, spade(), plan.token);
    expect(pit.getFloorDepthM()).toBeCloseTo(LIFT_M, 10);
    // Two lifts down through a one-metre drift and the clay is open.
    await pit.completeWork(actor, spade(), plan.token);
    const hosts = (await pit.exposedBands()).map((f) => f.hostPath);
    expect(hosts).toContain(CLAY);
  });

  it('…and working a WALL band retreats it without deepening anything', async () => {
    const pit = working({ floorDepthM: 2.5 });
    const before = pit.getFloorDepthM();
    const plan = (await pit.planWork(actor, spade(), 'drift')) as WorkPlan;
    expect(plan.kind).toBe('plan');
    await pit.completeWork(actor, spade(), plan.token);
    expect(pit.getFloorDepthM()).toBe(before);
    expect(pit.wonByBand[DRIFT]).toBe(1);
  });

  it('⚠ the floor stops at the WATER, and says so', async () => {
    // Below the water is the mining slate's — a pit that fills, and a pump.
    const pit = working({ floorDepthM: 11.75, waterTable: -12 });
    const out = (await pit.planWork(actor, pick(), null)) as WorkRefusal;
    expect(out.reason).toBe('at-the-water');
    expect(out.prose).toMatch(/pumping/);
  });
});

describe('⭐⭐ depletion: the number is correct, and the LEDGER is authorable', () => {
  it('a 4 m granite band on a 20 m run holds 320 units — and that is right', async () => {
    // 160 m³ of rock, and a real quarryman cut a few blocks a day. Shrinking
    // it so one session could exhaust a face would be the world lying about
    // scale, which is what the pedagogy lens exists to catch.
    const pit = working({ floorDepthM: 2.5 });
    const granite = (await pit.exposedBands()).find((f) => f.hostPath === GRANITE)!;
    expect(granite.capacity).toBe(320);
  });

  it('…so a SEEDED ledger is how a worked-out face gets into the world', async () => {
    // The lesson moves into a row: a venue authors a played-out working
    // beside the fresh one, and a person learns what one reads like by
    // walking thirty yards. Zero grinding, zero new code.
    const pit = working({
      floorDepthM: 2.5,
      wonByBand: { [DRIFT]: 999, [CLAY]: 999, [GRANITE]: 999 },
    });
    const granite = (await pit.exposedBands()).find((f) => f.hostPath === GRANITE)!;
    expect(pit.remainingIn(granite)).toBe(0);
    const out = (await pit.planWork(actor, pick(), 'granite')) as WorkRefusal;
    expect(out.reason).toBe('worked-out');
    expect(out.prose).toMatch(/worked out/);
  });

  it('the capacity scales with the pit’s own run, not with the game’s', async () => {
    // `faceRunM` is *how much ground inside this claim*, so a narrow pit is
    // genuinely a smaller resource than a wide one on the same band.
    const narrow = working({ floorDepthM: 2.5, faceRunM: 5 });
    const wide = working({ floorDepthM: 2.5, faceRunM: 40 });
    const a = (await narrow.exposedBands()).find((f) => f.hostPath === GRANITE)!;
    const b = (await wide.exposedBands()).find((f) => f.hostPath === GRANITE)!;
    expect(b.capacity).toBe(a.capacity * 8);
  });
});

describe('the credit, and what it is FOR', () => {
  it('⭐⭐ the WORKING names the Discipline — which is how a platform verb earns a trade’s', async () => {
    const pit = working({ floorDepthM: 2.5 });
    const plan = (await pit.planWork(actor, pick(), 'granite')) as WorkPlan;
    const result = await pit.completeWork(actor, pick(), plan.token);
    expect(result.credit?.discipline).toBe('quarrying');
    // Difficulty is the ROCK's, read at the moment of the act.
    expect(result.credit?.difficulty).toBe('hard');
  });

  it('…and turning over drift is an EASY deed, on the same verb', async () => {
    const pit = working();
    const plan = (await pit.planWork(actor, spade(), null)) as WorkPlan;
    const result = await pit.completeWork(actor, spade(), plan.token);
    expect(result.credit?.discipline).toBe('quarrying');
    expect(result.credit?.difficulty).toBe('easy');
  });
});

describe('the shape the kernel talks to', () => {
  it('a working answers `Diggable`, and composes the mixin under its own name', () => {
    const pit = working();
    expect(MixinApi.isActive(pit as unknown as Stuff, OPEN_WORKING_MIXIN)).toBe(true);
    expect((pit as unknown as { diggable: boolean }).diggable).toBe(true);
    expect(typeof pit.planWork).toBe('function');
    expect(typeof pit.completeWork).toBe('function');
  });

  it('⚠⚠ and it affords NO verb of THIS TRADE — the pack ships none', () => {
    // ⭐ The consequence worth stating: a working that afforded its own verb
    // would mean the next open-air working (a chalk pit, a gravel pit, a
    // saltern face) needed a CLASS. `dig` comes from the spade in your hand,
    // `split` from the block on the floor, `fire` from the kiln — so the next
    // one is rows.
    //
    // ⚠ Asserted as *no quarrying view anywhere in the chain*, not as
    // *undefined*: a Location legitimately contributes the kernel's own
    // surface, and this claim is about the TRADE.
    const contributed = CommandApi.collectContributions(
      OpenWorkingLocation as never,
      'self',
    )
      .concat(CommandApi.collectContributions(OpenWorkingLocation as never, 'environment'))
      .concat(CommandApi.collectContributions(OpenWorkingLocation as never, 'inventory'))
      .concat(CommandApi.collectContributions(OpenWorkingLocation as never, 'peers'))
      .flatMap((d) => d.verbs);
    for (const verb of ['quarry', 'strip', 'win', 'pare']) {
      expect(contributed, verb).not.toContain(verb);
    }
  });
});
