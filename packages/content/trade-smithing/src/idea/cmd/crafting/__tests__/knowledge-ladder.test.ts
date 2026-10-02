/**
 * The generalized knowledge ladder — the wiki-parity test. A character
 * with zero chronicle rows completes the smithing by-hand path start to
 * finish (the long way is open); `forge` declines before and works after
 * the one verified by-hand performance; a *watching* bystander gains the
 * known-of claim but `forge` still declines for them (information buys
 * optimization, never competence); `order` works for everyone
 * throughout. The same deed gate is asserted for cooking in the cooking pack's `knowledge-gate.test.ts`. Craft-resolve
 * appends Transcript rows against the seeded disciplines at the authored
 * difficulty; recipes authoring no discipline (the bar's) append
 * nothing.
 */

import "@saxonberg/server/test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ForgeController from '../ForgeController';
import HeatController from '@saxonberg/server/mud/platform/idea/cmd/crafting/HeatController';
import HammerController from '../HammerController';
import QuenchController from '../QuenchController';
import { SchedulerApi } from '@saxonberg/server/mud/api/scheduler';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { ExecutionContextApi } from '@saxonberg/server/mud/api/execution-context';
import { CraftingApi } from '@saxonberg/server/mud/api/crafting';
import { RecipeKnowledge } from '@saxonberg/server/mud/lib/script/RecipeKnowledge';
import { EmployedMixin } from '@saxonberg/server/mud/lib/employment/Employed';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import Material from '@saxonberg/server/mud/lib/material/Material';
import Ingot from '@saxonberg/server/mud/platform/thing/Ingot';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { CommandContext } from '@saxonberg/server/mud/api/command';
import BusinessEntity from '@saxonberg/server/mud/platform/idea/Business';
import {
  TestActor,
  TestKnife,
  IRON,
  standUpBranchHarness,
  type BranchHarness,
  makeContext,
  ref,
  many,
  completeStep,
  makeLitForge,
  makeTool,
} from '@saxonberg/server/mud/platform/idea/cmd/crafting/__tests__/branch-fixtures';
import {
  makeStuff,
  makeStuffAtPath,
} from '@saxonberg/server/mud/lib/security/__tests__/test-setup';

class TestSmithNpc extends EmployedMixin(TestActor) {
  static _mixinName = 'TestSmithNpcLadder';
  // ⭐ Stands in for an on-shift holder of a `fulfills` seat. The real
  // read is three conditions (on shift · the seat marks `fulfills` · the
  // house operates where you stand) and is proved as a truth table in
  // `lib/employment/__tests__/conferral.test.ts`; here the fulfiller is
  // scenery, so the seam is stubbed exactly as the old `MakerMixin`
  // conferral was.
  isFulfilling(): boolean {
    return true;
  }

  /**
   * ⭐⭐ And the competence seam, stubbed the same way — because the
   * agent-coordination build made the maker's ABILITY part of the answer.
   *
   * `canMake` asks two questions: have you made this before (a chronicle
   * deed), or did your **dossier** license work of this difficulty
   * (`seededBandFor`). A stand-in with no dossier answers the FLOOR, which
   * licenses nothing — so without this the smithy's smith cannot forge, and
   * that is correct rather than a bug: an authored person who was never
   * written as a smith is not one.
   *
   * A real `Cast` row carries `competence:` and the seeder writes the claim
   * rows this folds. Here the fulfiller is scenery, so it asserts its band
   * directly.
   */
  async seededBandFor(): Promise<'expert'> {
    return 'expert';
  }
}

/**
 * ⭐⭐ The stand-in smith needs a HOUSE. Under the agent-coordination build
 * *which* able maker serves is the house's decision — `resolveMaker` hands
 * the able set to `house.callFor(...)` — so a fulfilling maker with no
 * resolvable organization is refused rather than served, and `order` is not
 * "ungated" so much as *answered by a house*.
 *
 * ⚠ The claim this test makes is unchanged and still the right one: a
 * patron who has never forged anything can ORDER a belt-knife, because the
 * deed gate applies to the MAKER and not to the person asking. What changed
 * is that the maker has to belong to somebody.
 */
const LADDER_HOUSE = '/world/terminus/hearthworks/idea/business-ladder-test';

function standUpLadderHouse(maker: Stuff): void {
  const house = makeStuffAtPath(() => new BusinessEntity(), LADDER_HOUSE);
  house.positions = [
    { key: 'smith', label: 'at the anvil', wageRate: 1, fulfills: ['smithing'] },
  ];
  house.setCall('rota');
  (maker as unknown as { employments: unknown[] }).employments = [
    {
      organizationPath: LADDER_HOUSE,
      positionKey: 'smith',
      status: 'on-shift',
      hiredAt: 0,
      onShiftSince: 0,
    },
  ];
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

/** Stand the smithy up: hot forge, hammer, anvil — the last two also
 * handed back, because the by-hand steps declare them as args and a
 * controller test skips the binder. */
function standUpSmithy(): { striker: Stuff; anvil: Stuff } {
  const striker = makeTool('striking');
  const anvil = makeTool('anvil');
  ContainmentApi.move(makeLitForge(true), room);
  ContainmentApi.move(striker, room);
  ContainmentApi.move(anvil, room);
  return { striker, anvil };
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
  builder = makeStuffAtPath(() => new TestActor(), `/platform/agent/Avatar/lb-${seq++}`);
  bystander = makeStuffAtPath(() => new TestActor(), `/platform/agent/Avatar/lw-${seq++}`);
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
    const smithy = standUpSmithy();

    // Zero chronicle rows: the one-shot declines — the book (or wiki)
    // isn't enough.
    ContainmentApi.move(makeIngot(), room);
    expect(rejectedWith(await tryForge(builder), 'not-learned')).toBe(true);

    // `order` works for everyone throughout — a present maker fulfills.
    // ⭐ Still the right claim, and sharper now: the deed gate applies to the
    // MAKER, never to the person asking. A patron who has never forged
    // anything orders a belt-knife and gets one, because a competent smith
    // is standing there. What the build added is that the smith has to
    // belong to a house (which calls them) and has to be able (which the
    // stubs above supply).
    const ladderSmith = makeStuffAtPath(
      () => new TestSmithNpc(),
      '/obj/_test/ladder-smith',
    );
    standUpLadderHouse(ladderSmith as unknown as Stuff);
    ContainmentApi.move(ladderSmith, room);
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
          {
            target: ref(workpiece, 'ingot'),
            striker: many(smithy.striker),
            anvil: many(smithy.anvil),
          } as never,
          makeContext(builder, room, 'step'),
        ),
      );
      await completeStep(ms);
    }
    // The performance minted the can-make deed for the builder…
    expect(await builder.hasDone(RecipeKnowledge.madeKey('belt-knife'))).toBe(true);
    // …and the shorthand now works.
    ContainmentApi.move(makeIngot(), room);
    const earned = await tryForge(builder);
    expect(rejectedWith(earned, 'not-learned')).toBe(false);
    expect(builder.getContents().some((c) => c instanceof TestKnife)).toBe(
      true,
    );

    // The watcher gained the claim (knows OF it) — but not the deed.
    expect(await bystander.hasClaimed(RecipeKnowledge.knownKey('belt-knife'))).toBe(true);
    expect(await bystander.hasDone(RecipeKnowledge.madeKey('belt-knife'))).toBe(false);
    ContainmentApi.move(makeIngot(), room);
    expect(rejectedWith(await tryForge(bystander), 'not-learned')).toBe(true);
  });

  it('craft-resolve appends Transcript deeds at the authored difficulty; bar rows never do', async () => {
    standUpSmithy();
    ContainmentApi.move(makeIngot(), room);
    await builder.recordChronicleOnce(
      RecipeKnowledge.madeKey('belt-knife'),
      RecipeKnowledge.madeEntry('Belt Knife'),
    );
    const ctx = await tryForge(builder);
    expect(ctx.getNotes().some((n) => n.kind === 'controller-rejected')).toBe(
      false,
    );

    const rows = await builder.transcriptEntries('smithing');
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
