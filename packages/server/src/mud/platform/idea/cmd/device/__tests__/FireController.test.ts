/**
 * `fire` / `burn` — ⭐⭐ **the charge decides, and the recipes do the work.**
 *
 * The claim this file exists to hold is *not* that lime burns. It is that
 * **nothing in the controller names lime**: the set of firings is the set of
 * recipe rows whose input slots the chamber's contents satisfy. So the test
 * authors **its own firing**, out of its own material, and asserts that a
 * chamber it has never heard of fires it. If somebody ever adds a branch on
 * a product to `FireController`, this file goes green and the claim quietly
 * stops being true — so it also asserts the inverse: a charge matching *no*
 * row is refused, and a chamber holding two different firings is refused
 * rather than averaged.
 *
 * Plus the two gates that cost the smelt a browser session to find:
 *
 *  - ⚠⚠ **unlit is COLD, not cool** — `getHeldTemperatureK()` never consults
 *    `lit`, so a stone-cold chamber reports its full figure. Answering that
 *    with *"work the bellows"* sends a player in a circle.
 *  - **too cold with the bellows already going** is the FUEL's fault, and the
 *    refusal says so instead of asking for the draught twice.
 */

import '../../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import FireController from '../FireController';
import Oven from '../../../../thing/Oven';
import Thing from '../../../../../lib/stuff/Thing';
import Material from '../../../../../lib/material/Material';
import { Reserve } from '../../../../../lib/reserve';
import { Quantity } from '../../../../../lib/quantity';
import { StuffApi } from '../../../../../api/stuff';
import { ContainmentApi } from '../../../../../api/containment';
import { MixinApi } from '../../../../../api/mixin';
import { CommandApi } from '../../../../../api/command';
import { ExecutionContextApi } from '../../../../../api/execution-context';
import type { CommandContext } from '../../../../../api/command';
import {
  TestActor,
  standUpBranchHarness,
  makeContext,
  completeStep,
  registerMaterial,
  branchRecipeRows,
} from '../../crafting/__tests__/branch-fixtures';
import RecipeCatalogue from '../../../RecipeCatalogue';
import {
  makeStuff,
  makeStuffAtPath,
  stampTemplatePathForTest,
} from '../../../../../lib/security/__tests__/test-setup';

/** The test's own stone, its own firing, and its own product row. */
const STONE_M = '/stuff/idea/material/_test/fire-stone';
const CLAYISH_M = '/stuff/idea/material/_test/fire-clayish';
const PRODUCT_ROW = '/stuff/thing/_test/fire-product';
const OTHER_ROW = '/stuff/thing/_test/fire-other';

let room: TestActor;
let actor: TestActor;
let kiln: Oven;

/**
 * A chamber. ⭐ A bare `Oven`, with nothing quarrying-shaped about it —
 * because the claim is that the verb lives on the APPLIANCE and the trade
 * ships none of this.
 */
function makeKiln(opts: { holdK: number; lit: boolean; bellows?: boolean }): Oven {
  return makeStuff(() => {
    const o = new Oven();
    o.setBurnTemperatureK(opts.holdK);
    o.setBellowsMultiplier(1);
    o.setReserve(
      new Reserve('fuel', Quantity.of(100, '%'), Quantity.of(100, '%'), 'combustion', null),
    );
    o.setBellowsActive(opts.bellows ?? false);
    // ⚠ `lit` defaults to TRUE on `FurnaceMixin` (a campfire seed starts
    // lit), so the unlit case has to be set explicitly — which is exactly
    // why the smelt's unlit branch had no coverage for three builds: every
    // fixture in the tree happened to be lit by accident.
    o._setLit(opts.lit);
    return o;
  });
}

/** A lump of something, by material path. */
function lumpOf(path: string, kg = 5): Thing {
  const t = makeStuff(() => new Thing());
  t.setMass(Quantity.of(kg, 'kg'));
  t.setMaterial(StuffApi.findByTemplatePath<Material>(path) as unknown as Material);
  return t;
}

async function fire(): Promise<CommandContext> {
  const context = makeContext(actor, room, 'fire');
  await ExecutionContextApi.runRoot(null, 'test', async () => {
    ExecutionContextApi.tagActingAuthor(actor);
    // `fire.yaml` binds the chamber; a controller test skips the binder.
    await makeStuff(() => new FireController()).execute(
      { kiln: { stuff: kiln, raw: 'kiln' } } as never,
      context,
    );
  });
  return context;
}

/** Advance past the firing AND drain the async completion chain. */
async function draw(): Promise<void> {
  await completeStep(200_000);
  for (let i = 0; i < 8; i++) await new Promise<void>((r) => setTimeout(r, 0));
}

function declinedFor(context: CommandContext): string | undefined {
  return context.getNotes().find((n) => n.kind === 'controller-rejected')
    ?.reason;
}

/** What the chamber holds, by template path. */
function drawnFrom(k: Oven): string[] {
  return k
    .getContents()
    .map((c) => c.getTemplatePath() ?? '')
    .filter((p) => p !== '');
}

beforeEach(async () => {
  const harness = await standUpBranchHarness();

  // ⭐⭐ THE TEST'S OWN FIRING. Nothing in the controller knows either of
  // these words, and that is the whole assertion: a pack ships a row and the
  // verb finds it.
  registerMaterial(STONE_M, 'test stone', ['rock', '_test-flux'], {
    keywords: ['stone'],
  });
  registerMaterial(CLAYISH_M, 'test clayish', ['earth', '_test-clayish'], {
    keywords: ['clayish'],
  });
  harness.store['recipes'] = [
    ...branchRecipeRows(),
    {
      recipeId: 'test-burn',
      name: 'Test burn',
      keywords: ['testburn'],
      inputSlots: [
        { slot: 'charge', category: '_test-flux', minGrade: 'poor', kind: 'item', count: 2 },
      ],
      toolCapabilities: [],
      outputTemplate: PRODUCT_ROW,
      outputMaterial: '',
      outputApplication: 'tangible',
      requiresHeatK: 1170,
      maxHeatK: 1900,
      difficulty: 'standard',
      discipline: 'quarrying',
    },
    {
      recipeId: 'test-other',
      name: 'Test other',
      keywords: ['testother'],
      inputSlots: [
        { slot: 'charge', category: '_test-clayish', minGrade: 'poor', kind: 'item', count: 1 },
      ],
      toolCapabilities: [],
      outputTemplate: OTHER_ROW,
      outputMaterial: '',
      outputApplication: 'tangible',
      requiresHeatK: 1100,
      maxHeatK: 1900,
      difficulty: 'standard',
      discipline: 'quarrying',
    },
  ];
  const catalogue = StuffApi.findByTemplatePath<RecipeCatalogue>(
    '/platform/idea/RecipeCatalogue',
  )!;
  catalogue.invalidateCache();
  await catalogue.warm();

  const realClone = StuffApi.clone;
  vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string) => {
    if (path === PRODUCT_ROW || path === OTHER_ROW) {
      const p = makeStuff(() => new Thing());
      stampTemplatePathForTest(p, path);
      p.setMass(Quantity.of(2, 'kg'));
      p.setShortDescription(path === PRODUCT_ROW ? 'burnt thing' : 'other thing');
      return p;
    }
    return realClone.call(StuffApi, path);
  }) as never);

  room = makeStuff(() => new TestActor());
  actor = makeStuffAtPath(() => new TestActor(), '/platform/agent/Avatar/burner-1');
  ContainmentApi.move(actor, room);
  kiln = makeKiln({ holdK: 1500, lit: true });
  ContainmentApi.move(kiln, room);
});

afterEach(() => vi.restoreAllMocks());

describe('the chamber, the charge and the heat', () => {
  it('an empty chamber is refused, and told to load it', async () => {
    expect(declinedFor(await fire())).toBe('no-charge');
  });

  it('⭐⭐ a charge the test INVENTED fires — the recipes do the work', async () => {
    // Two lumps of a material this file made up, against a recipe this file
    // made up, in a bare `Oven`. Nothing in `FireController` names any of it.
    ContainmentApi.move(lumpOf(STONE_M), kiln);
    ContainmentApi.move(lumpOf(STONE_M), kiln);
    const context = await fire();
    expect(declinedFor(context)).toBeUndefined();
    await draw();
    expect(drawnFrom(kiln)).toContain(PRODUCT_ROW);
  });

  it('⭐ the RATIO is the row’s: two in, one out, and the odd one stays', async () => {
    // A charge of five against `count: 2` yields two and leaves one, which is
    // what a lime-burner's odd stone actually does. Authored in the row, not
    // in the controller.
    for (let i = 0; i < 5; i++) ContainmentApi.move(lumpOf(STONE_M), kiln);
    await fire();
    await draw();
    const left = drawnFrom(kiln).filter((p) => p === PRODUCT_ROW);
    expect(left).toHaveLength(2);
    // One unfired stone is still in there.
    const stones = kiln
      .getContents()
      .filter(
        (c) => MixinApi.isTangible(c) && c.hasMaterialTag('_test-flux'),
      );
    expect(stones).toHaveLength(1);
  });

  it('a charge matching NO row is refused — heat is not what it wants', async () => {
    registerMaterial('/stuff/idea/material/_test/inert', 'inert', ['rock'], {
      keywords: ['inert'],
    });
    ContainmentApi.move(lumpOf('/stuff/idea/material/_test/inert'), kiln);
    expect(declinedFor(await fire())).toBe('no-firing');
  });

  it('⚠ TWO firings in one chamber is refused rather than averaged', async () => {
    ContainmentApi.move(lumpOf(STONE_M), kiln);
    ContainmentApi.move(lumpOf(STONE_M), kiln);
    ContainmentApi.move(lumpOf(CLAYISH_M), kiln);
    expect(declinedFor(await fire())).toBe('mixed-charge');
  });

  it('⚠⚠ an UNLIT chamber is refused for being COLD, not for the draught', async () => {
    // `getHeldTemperatureK()` is `burnTemperatureK × bellows` and never
    // consults `lit`, so a stone-cold chamber reports its full figure. The
    // smelt shipped this refusal the wrong way round and it took a browser
    // session to find: a player told to work the bellows was told by the
    // bellows that air without fire moves nothing.
    kiln = makeKiln({ holdK: 1500, lit: false });
    ContainmentApi.move(kiln, room);
    ContainmentApi.move(lumpOf(STONE_M), kiln);
    ContainmentApi.move(lumpOf(STONE_M), kiln);
    expect(declinedFor(await fire())).toBe('not-lit');
  });

  it('a lit chamber too cool for the firing says how short it is', async () => {
    // A bread oven cannot burn lime, and the difference between baking and
    // calcining stops being a class name and becomes a temperature.
    kiln = makeKiln({ holdK: 500, lit: true });
    ContainmentApi.move(kiln, room);
    ContainmentApi.move(lumpOf(STONE_M), kiln);
    ContainmentApi.move(lumpOf(STONE_M), kiln);
    expect(declinedFor(await fire())).toBe('insufficient-heat');
  });

  it('the charge is CONSUMED, and only as much of it as the firing took', async () => {
    const a = lumpOf(STONE_M);
    const b = lumpOf(STONE_M);
    const spare = lumpOf(STONE_M);
    for (const l of [a, b, spare]) ContainmentApi.move(l, kiln);
    await fire();
    await draw();
    // Two went; the third is still standing.
    const gone = [a, b, spare].filter((l) => l.isDestroyed());
    expect(gone).toHaveLength(2);
  });

  it('⭐⭐ the affordance: the APPLIANCE carries `fire`, beside its own five', () => {
    // ⭐ The doctrine this verb rides, and it was already written on
    // `FurnaceMixin`: *"the fire-appliance verbs are afforded by the
    // appliance."* Five verbs hung off it; firing a loaded chamber is the
    // sixth. ⚠ The plan had it afforded by an open WORKING instead, which
    // would have meant a potter's shed needed its own class to fire a pot.
    const verbs = CommandApi.collectContributions(Oven, 'peers')
      .map((d) => d.verbs)
      .flat();
    expect(verbs).toContain('fire');
    expect(verbs).toContain('burn');
    // …beside the five that were already there.
    for (const v of ['ignite', 'douse', 'pump', 'heat', 'boil']) {
      expect(verbs, v).toContain(v);
    }
  });
});
