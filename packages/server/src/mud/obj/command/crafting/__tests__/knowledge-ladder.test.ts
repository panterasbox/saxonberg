/**
 * The generalized knowledge ladder — the wiki-parity test. A character
 * with zero chronicle rows completes the smithing by-hand path start to
 * finish (the long way is open); `forge` declines before and works after
 * the one verified by-hand performance; a *watching* bystander gains the
 * known-of claim but `forge` still declines for them (information buys
 * optimization, never competence); `order` works for everyone
 * throughout. The same deed gate is asserted for cooking. Craft-resolve
 * appends Transcript rows against the seeded disciplines at the authored
 * difficulty; recipes authoring no discipline (the bar's) append
 * nothing.
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ForgeController from '../ForgeController';
import CookController from '../CookController';
import HeatController from '../HeatController';
import HammerController from '../HammerController';
import QuenchController from '../QuenchController';
import { SchedulerApi } from '../../../../api/scheduler';
import { WorldClockApi } from '../../../../api/worldclock';
import { StuffApi } from '../../../../api/stuff';
import { ContainmentApi } from '../../../../api/containment';
import { ExecutionContextApi } from '../../../../api/execution-context';
import { CraftingApi } from '../../../../api/crafting';
import { AdvancementApi } from '../../../../api/advancement';
import { RecipeKnowledge } from '../../../../lib/script/RecipeKnowledge';
import { MakerMixin } from '../../../../lib/craft/Maker';
import { Quantity } from '../../../../lib/quantity';
import Material from '../../../../lib/material/Material';
import Ingot from '../../../Ingot';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { CommandContext } from '../../../../api/command';
import {
  TestActor,
  TestKnife,
  IRON,
  standUpBranchHarness,
  type BranchHarness,
  makeContext,
  ref,
  completeStep,
  makeLitForge,
  makeTool,
} from './branch-fixtures';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../../../lib/security/__tests__/test-setup';

class TestSmithNpc extends MakerMixin(TestActor) {
  static _mixinName = 'TestSmithNpcLadder';
  getConferredMixinNames(): readonly string[] {
    return ['MakerMixin'];
  }
}

/** Run a controller execute with `who` tagged as the acting author. */
async function executeAs(
  who: Stuff,
  fn: () => void | Promise<void>,
): Promise<void> {
  await ExecutionContextApi.runRoot(null, 'test', async () => {
    ExecutionContextApi.tagActingAuthor(who);
    await fn();
  });
}

let seq = 0;
let harness: BranchHarness;
let room: TestActor;
let builder: TestActor;
let bystander: TestActor;

function makeIngot(): Ingot {
  const i = makeStuff(() => new Ingot());
  i.setMass(Quantity.of(0.5, 'kg'));
  i.setMaterial(
    StuffApi.findByTemplatePath<Material>(IRON) as unknown as Material,
  );
  return i;
}

/** Stand the smithy up: hot forge, hammer, anvil. */
function standUpSmithy(): void {
  ContainmentApi.move(makeLitForge(true), room);
  ContainmentApi.move(makeTool('striking'), room);
  ContainmentApi.move(makeTool('anvil'), room);
}

async function tryForge(who: Stuff): Promise<CommandContext> {
  const ctx = makeContext(who, room, 'forge knife');
  await executeAs(who, () =>
    makeStuff(() => new ForgeController()).execute(
      { item: 'knife' } as never,
      ctx,
    ),
  );
  return ctx;
}

function rejectedWith(ctx: CommandContext, reason: string): boolean {
  return ctx
    .getNotes()
    .some(
      (n) =>
        n.kind === 'controller-rejected' &&
        (n as { reason?: string }).reason === reason,
    );
}

beforeEach(async () => {
  harness = await standUpBranchHarness();
  room = makeStuff(() => new TestActor());
  builder = makeStuffAtPath(() => new TestActor(), `/obj/Avatar/lb-${seq++}`);
  bystander = makeStuffAtPath(() => new TestActor(), `/obj/Avatar/lw-${seq++}`);
  ContainmentApi.move(builder, room);
  ContainmentApi.move(bystander, room);
});

afterEach(() => {
  SchedulerApi._clearAllForTesting();
  WorldClockApi._resetForTesting();
  vi.restoreAllMocks();
});

describe('the knowledge ladder, generalized (wiki parity)', () => {
  it('the long way is open; the shorthand is earned; watching grants only the claim; order is ungated', async () => {
    standUpSmithy();

    // Zero chronicle rows: the one-shot declines — the book (or wiki)
    // isn't enough.
    ContainmentApi.move(makeIngot(), room);
    expect(rejectedWith(await tryForge(builder), 'not-learned')).toBe(true);

    // `order` works for everyone throughout — a present maker fulfills.
    ContainmentApi.move(
      makeStuffAtPath(() => new TestSmithNpc(), '/obj/_test/ladder-smith'),
      room,
    );
    const ordered = await ExecutionContextApi.runRoot(null, 'test', () => {
      ExecutionContextApi.tagActingAuthor(builder);
      return CraftingApi.craft({
        recipeRef: 'belt-knife',
        makerMode: 'fulfilling-bartender',
      });
    });
    expect((ordered as { ok: boolean }).ok).toBe(true);

    // The by-hand path, start to finish (bystander watching).
    const workpiece = makeIngot();
    ContainmentApi.move(workpiece, room);
    for (const [Ctor, ms] of [
      [HeatController, 4000],
      [HammerController, 5000],
      [QuenchController, 2500],
    ] as const) {
      await executeAs(builder, () =>
        makeStuff(() => new Ctor()).execute(
          { target: ref(workpiece, 'ingot') } as never,
          makeContext(builder, room, 'step'),
        ),
      );
      await completeStep(ms);
    }
    // The performance minted the can-make deed for the builder…
    expect(await RecipeKnowledge.canMake(builder, 'belt-knife')).toBe(true);
    // …and the shorthand now works.
    ContainmentApi.move(makeIngot(), room);
    const earned = await tryForge(builder);
    expect(rejectedWith(earned, 'not-learned')).toBe(false);
    expect(builder.getContents().some((c) => c instanceof TestKnife)).toBe(
      true,
    );

    // The watcher gained the claim (knows OF it) — but not the deed.
    expect(await RecipeKnowledge.knowsOf(bystander, 'belt-knife')).toBe(true);
    expect(await RecipeKnowledge.canMake(bystander, 'belt-knife')).toBe(false);
    ContainmentApi.move(makeIngot(), room);
    expect(rejectedWith(await tryForge(bystander), 'not-learned')).toBe(true);
  });

  it('the cooking one-shot rides the same deed gate', async () => {
    const declined = makeContext(builder, room, 'cook stew');
    await executeAs(builder, () =>
      makeStuff(() => new CookController()).execute(
        { dish: 'stew' } as never,
        declined,
      ),
    );
    expect(rejectedWith(declined, 'not-learned')).toBe(true);

    // With the deed minted (the by-hand mint's act), the gate opens —
    // the craft then resolves on its own merits (declines on matter, not
    // knowledge).
    await RecipeKnowledge.noteMade(builder, 'hearty-stew', 'Hearty Stew');
    const open = makeContext(builder, room, 'cook stew');
    await executeAs(builder, () =>
      makeStuff(() => new CookController()).execute(
        { dish: 'stew' } as never,
        open,
      ),
    );
    expect(rejectedWith(open, 'not-learned')).toBe(false);
  });

  it('craft-resolve appends Transcript deeds at the authored difficulty; bar rows never do', async () => {
    standUpSmithy();
    ContainmentApi.move(makeIngot(), room);
    await RecipeKnowledge.noteMade(builder, 'belt-knife', 'Belt Knife');
    const ctx = await tryForge(builder);
    expect(ctx.getNotes().some((n) => n.kind === 'controller-rejected')).toBe(
      false,
    );

    const rows = await AdvancementApi.entriesFor(builder, 'smithing');
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]).toMatchObject({
      discipline: 'smithing',
      difficulty: 'standard',
      outcome: 'success',
    });

    // No transcript row exists outside the authored disciplines — a
    // recipe with no `discipline` (every bar row) records nothing.
    const all = harness.store['transcripts'] ?? [];
    expect(
      all.every(
        (r) => r.discipline === 'smithing' || r.discipline === 'cooking',
      ),
    ).toBe(true);
  });
});
