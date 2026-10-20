/**
 * `fire` / `burn` — ⭐⭐ **the verb holds the heat; the MATERIAL decides**
 * (ceramics M1, D4).
 *
 * Until the ceramics build this controller scanned the recipe catalogue for
 * a firing. Now firing is one rule: every body in a lit chamber banks
 * heat-work, and its material's `heatTransitions` say what that makes of
 * it. So this file authors **its own material with its own transition** and
 * asserts that a bare `Oven` turns it — by the hold, with the verb naming
 * nothing. And it holds the census: no installed recipe row still has the
 * shape the old firing path matched, so nobody quietly brings it back.
 *
 * Plus the gates that cost the smelt a browser session:
 *  - ⚠⚠ **unlit is COLD, not cool**;
 *  - an empty chamber is told to load;
 *  - the draught is an OPTION and a word from the ladder.
 */

import '../../../../../../test-bootstrap';
import { chargeHot } from '../../../../../lib/fire/__tests__/burner-fuel';
import type { Burner } from '../../../../../lib/fire/Burner';
import type { Stuff } from '../../../../../lib/stuff/Stuff';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import FireController from '../FireController';
import Oven from '../../../../thing/Oven';
import Material from '../../../../../lib/material/Material';
import { ThermalMixin } from '../../../../../lib/thermal/Thermal';
import Good from '../../../../../lib/stuff/Good';
import { Quantity } from '../../../../../lib/quantity';
import { ContainmentApi } from '../../../../../api/containment';
import { CommandApi } from '../../../../../api/command';
import { ExecutionContextApi } from '../../../../../api/execution-context';
import type { CommandContext } from '../../../../../api/command';
import {
  TestActor,
  standUpBranchHarness,
  makeContext,
  completeStep,
} from '../../crafting/__tests__/branch-fixtures';
import { makeStuff, makeStuffAtPath } from '../../../../../lib/security/__tests__/test-setup';
import WorldClockRegistry from '../../../../idea/WorldClockRegistry';

/** The test's own stone and what heat makes of it. */
const STONE_M = '/stuff/idea/material/_test/fire-stone';
const BURNT_M = '/stuff/idea/material/_test/fire-burnt';

class Lump extends ThermalMixin(Good) {
  static _mixinName = 'FireControllerTestLump';
}

let room: TestActor;
let actor: TestActor;
let kiln: Oven;

function makeKiln(opts: { holdK: number; lit: boolean }): Oven {
  return makeStuff(() => {
    const o = new Oven();
    o.setBurnTemperatureK(opts.holdK);
    o.setBellowsMultiplier(1);
    chargeHot(o as unknown as Stuff & Burner, 400);
    o.setBellowsActive(false);
    // ⚠ `lit` defaults TRUE on `BurnerMixin` — the unlit case is explicit.
    o._setLit(opts.lit);
    return o;
  });
}

function stone(kg = 5): Lump {
  return makeStuff(() => {
    const l = new Lump();
    l.setMass(Quantity.of(kg, 'kg'));
    return l;
  });
}

async function fire(model: Record<string, unknown> = {}): Promise<CommandContext> {
  const context = makeContext(actor, room, 'fire');
  await ExecutionContextApi.runRoot(null, 'test', async () => {
    ExecutionContextApi.tagActingAuthor(actor);
    await makeStuff(() => new FireController()).execute(
      { kiln: { stuff: kiln, raw: 'kiln' }, ...model } as never,
      context,
    );
  });
  return context;
}

function declinedFor(context: CommandContext): string | undefined {
  return context.getNotes().find((n) => n.kind === 'controller-rejected')?.reason;
}

let materials: { stone: Material; burnt: Material };

beforeEach(async () => {
  await standUpBranchHarness();
  // ⚠ The harness clears every Stuff; a body reads time only while the
  // clock's registry stands (`ThermalMixin.thermalNowSeconds`).
  makeStuffAtPath(() => new WorldClockRegistry(), '/platform/idea/WorldClockRegistry');
  const burnt = makeStuffAtPath(() => {
    const m = new Material();
    m.setName('test burnt');
    m.setSpecificHeat(Quantity.of(800, 'J/(kg·K)'));
    return m;
  }, BURNT_M) as unknown as Material;
  const s = makeStuffAtPath(() => {
    const m = new Material();
    m.setName('test stone');
    m.setSpecificHeat(Quantity.of(800, 'J/(kg·K)'));
    m.setThermalConductivity(Quantity.of(1, 'W/(m·K)'));
    // ⭐⭐ THE TEST'S OWN TRANSITION. Nothing in the controller knows it.
    m.setHeatTransitions([
      {
        key: 'burn',
        referenceK: 1100,
        zK: 60,
        fullDoseS: 1800,
        massRetained: 0.5,
        discipline: 'quarrying',
        ladder: [{ atDegree: 1, becomes: BURNT_M }],
      },
    ]);
    return m;
  }, STONE_M) as unknown as Material;
  materials = { stone: s, burnt };

  room = makeStuff(() => new TestActor());
  actor = makeStuffAtPath(() => new TestActor(), '/platform/agent/Avatar/burner-1');
  ContainmentApi.move(actor, room);
  kiln = makeKiln({ holdK: 1500, lit: true });
  ContainmentApi.move(kiln, room);
});

afterEach(() => vi.restoreAllMocks());

function loadStone(kg = 5): Lump {
  const l = stone(kg);
  l.setMaterial(materials.stone);
  ContainmentApi.move(l, kiln);
  return l;
}

describe('the chamber and the charge', () => {
  it('an empty chamber is refused, and told to load it', async () => {
    expect(declinedFor(await fire())).toBe('no-charge');
  });

  it('⚠⚠ an UNLIT chamber is refused for being COLD', async () => {
    kiln = makeKiln({ holdK: 1500, lit: false });
    ContainmentApi.move(kiln, room);
    loadStone();
    expect(declinedFor(await fire())).toBe('not-lit');
  });

  it('a draught that is not a word on the ladder is refused, and the ladder named', async () => {
    loadStone();
    expect(declinedFor(await fire({ draught: 'medium' }))).toBe('bad-draught');
  });

  it('⭐ `--draught low` sets the air before the hold', async () => {
    loadStone();
    expect(kiln.getDraught()).toBe(1);
    const ctx = await fire({ draught: 'low' });
    expect(declinedFor(ctx)).toBeUndefined();
    expect(kiln.getDraught()).toBeCloseTo(0.2, 6);
  });

  it('a hold that is not a duration is refused', async () => {
    loadStone();
    expect(declinedFor(await fire({ hold: 'a while' }))).toBe('bad-duration');
  });
});

describe('⭐⭐ the material decides — the verb only holds the heat', () => {
  it('a charge the test INVENTED turns, in a bare Oven, by its own transition', async () => {
    const piece = loadStone(5);
    const ctx = await fire({ hold: '3 hours' });
    expect(declinedFor(ctx)).toBeUndefined();
    await completeStep(3 * 3600 * 1000);
    for (let i = 0; i < 8; i++) await new Promise<void>((r) => setTimeout(r, 0));
    // ⭐ The same piece — identity kept — its material and mass changed.
    expect(piece.isDestroyed()).toBe(false);
    expect(piece.getMaterial()?.getTemplatePath()).toBe(BURNT_M);
    expect(piece.getMass().rawValue()).toBeCloseTo(2.5, 1);
    // …and whoever held the firing is stamped on it.
    expect(piece.getHeatWork()?.firedBy).toBe('/platform/agent/Avatar/burner-1');
  });

  it('⭐⭐ the affordance: the APPLIANCE carries `fire`, beside its own five', () => {
    const verbs = CommandApi.collectContributions(Oven, 'peers')
      .map((d) => d.verbs)
      .flat();
    expect(verbs).toContain('fire');
    expect(verbs).toContain('burn');
    for (const v of ['ignite', 'douse', 'pump', 'heat', 'boil']) {
      expect(verbs, v).toContain(v);
    }
  });
});

describe('⭐ the census — the firing rows are gone', () => {
  /**
   * The old `firingsFor` matched any row with `requiresHeatK > 0`, item
   * slots and no tools — which, it turns out, also matched eight rows other
   * verbs run (`smelt`'s charges, the smoker's cures, the chandler's wax),
   * so a shape census cannot tell a retired firing from a live one. The
   * honest census is the ROWS: every firing the one rule replaced is gone,
   * and no other verb read them.
   */
  const RETIRED = [
    'burn-lime', 'fire-pot', 'glass-batch', 'glass-batch-amber', 'remelt-cullet',
    'retort-wood', 'retort-coal', 'vulcanize', 'charcoal', 'calcine',
  ];
  it('no installed recipe row is one of the retired firings', () => {
    const contentRoot = join(__dirname, '../../../../../../../../content');
    const found: string[] = [];
    for (const pack of readdirSync(contentRoot)) {
      const dir = join(contentRoot, pack, 'content', 'recipes');
      if (!existsSync(dir)) continue;
      for (const f of readdirSync(dir)) {
        if (!f.endsWith('.yaml')) continue;
        const row = parse(readFileSync(join(dir, f), 'utf8')) as { recipeId?: string } | null;
        if (row?.recipeId && RETIRED.includes(row.recipeId)) found.push(`${pack}/${f}`);
      }
    }
    expect(found).toEqual([]);
  });
});
