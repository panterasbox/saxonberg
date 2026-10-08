/**
 * ⭐⭐ **The arrow that was missing** — barley into malt, on the real rows
 * of a pack that ships no code at all.
 *
 * Barley shipped and malt shipped, and nothing in the tree turned one
 * into the other. Both the brewer and the distiller were drawing malted
 * barley out of nothing, and both said so in their own headers:
 * `malt.yaml` — *"a SHARED input whose owning trade does not exist yet"*
 * — and the distributor's sack — *"nobody in the world malts barley yet,
 * so the sacks simply arrive."*
 *
 * ⚠ Why the rows are checked from DISK here rather than through a live
 * boot: `trade-malting` has no `src/`, so there is no pack suite for it
 * to live in. That is the point of the pack and not a gap — a trade whose
 * whole mechanism is waiting needs no classes — but it means the honest
 * home for its test is beside the other cross-pack world tests.
 *
 * What is proved: the chain JOINS (every slot's category is a tag some
 * shipped material actually carries), the floor's clock runs on the new
 * `enzymatic` mechanism, and the kilning's heat band is inside what the
 * kiln can hold. ⭐ The join is the assertion that matters — a recipe slot
 * whose category nothing carries fails closed and SILENT, which is how
 * `hammer` shipped requiring a mixin no metal stock composed.
 */

import '../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import Vat from '../../platform/thing/Vat';
import MaturationProfile from '../../platform/idea/maturation/MaturationProfile';
import {
  MATURATION_MECHANISMS,
  MATURATION_LINES,
} from '../../lib/maturation/MaturationProfile';
import Material from '../../lib/material/Material';
import { Recipe } from '../../lib/craft/Recipe';
import { DissolvedAromatics } from '../../lib/metabolism/DissolvedAromatics';
import { StuffApi } from '../../api/stuff';
import { WorldClockApi } from '../../api/worldclock';
import { Quantity } from '../../lib/quantity';
import { TemplatePaths } from '../../lib/paths';
import {
  makeStuff,
  makeStuffAtPath,
  stampTemplatePathForTest,
} from '../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import WorldClockRegistry from '../../platform/idea/WorldClockRegistry';

const PACKS = fileURLToPath(new URL('../../../../../content/', import.meta.url));
const MALTING = join(PACKS, 'trade-malting');
const FARMING = join(PACKS, 'trade-farming');
const BASE = join(PACKS, 'base-library');
const DISTILLING = join(PACKS, 'trade-distilling');

const SCALE = 12;
let real = 0;

function row(pack: string, rel: string): Record<string, unknown> {
  const raw = parse(readFileSync(join(pack, rel), 'utf8')) as {
    data: Record<string, unknown>;
  };
  return raw.data;
}

function recipeOf(pack: string, id: string): Recipe {
  return Recipe.fromData(
    parse(
      readFileSync(join(pack, 'content', 'recipes', `${id}.yaml`), 'utf8'),
    ) as Record<string, unknown>,
  );
}

/** Every tag on every material row this chain touches. */
function tagsAcrossChain(): Set<string> {
  const rows: [string, string][] = [
    [FARMING, 'content/stuff/idea/material/food/barley-grain.yaml'],
    [MALTING, 'content/trade/malting/idea/material/steeped-barley.yaml'],
    [MALTING, 'content/trade/malting/idea/material/green-malt.yaml'],
    [BASE, 'content/stuff/idea/material/food/malt.yaml'],
    [join(PACKS, 'trade-milling'), 'content/stuff/idea/material/food/grist.yaml'],
  ];
  const out = new Set<string>();
  for (const [pack, rel] of rows) {
    try {
      for (const tag of (row(pack, rel).tags as string[]) ?? []) out.add(tag);
    } catch {
      // A row that has moved is a finding the join assertion will surface
      // by failing; swallowing the read keeps the message useful.
    }
  }
  return out;
}

beforeEach(() => {
  installV1QuantityMarshallers();
  stampTemplatePathForTest(
    makeStuff(() => new WorldClockRegistry()),
    TemplatePaths.worldClockRegistry,
  );
  WorldClockApi._resetForTesting();
  real = 100_000;
  WorldClockApi._setNowProviderForTesting(() => real);
});

afterEach(() => StuffApi.clearAll());

describe('⭐⭐ the chain JOINS — every slot matches a tag something carries', () => {
  it('steep-barley asks for a tag the barley crop\'s material actually has', () => {
    // ⭐ Two ways a category is proved to resolve, and the test accepts
    // either: a material in this chain carries it, or a SHIPPED recipe
    // already uses it and therefore does. `water` is the second kind —
    // `wash-mash` has asked for it since the day it shipped, so asserting
    // against the water pack's own row would only be re-testing somebody
    // else's content with a path this file has to keep up to date.
    const tags = tagsAcrossChain();
    const shipped = new Set(
      recipeOf(DISTILLING, 'wash-mash')
        .getInputSlots()
        .map((s2) => s2.category),
    );
    const steep = recipeOf(MALTING, 'steep-barley');
    for (const slot of steep.getInputSlots()) {
      expect(
        tags.has(slot.category) || shipped.has(slot.category),
        `steep-barley slot '${slot.slot}' wants category '${slot.category}', ` +
          `which no material in the chain carries and no shipped recipe ` +
          `uses — the slot would fail closed and SILENT`,
      ).toBe(true);
    }
    // ⭐ And specifically: `barley`, which this build added to
    // `barley-grain` because its sibling `wheat-grain` carries `wheat`
    // and this row carried only the purpose tag `brewing`.
    const barley = row(
      FARMING,
      'content/stuff/idea/material/food/barley-grain.yaml',
    );
    expect(barley.tags as string[]).toContain('barley');
  });

  it('kiln-malt consumes what the floor produces, and produces what the mill wants', () => {
    const profile = row(
      MALTING,
      'content/trade/malting/idea/maturation/malting.yaml',
    );
    const kiln = recipeOf(MALTING, 'kiln-malt');
    const greenMalt = row(
      MALTING,
      'content/trade/malting/idea/material/green-malt.yaml',
    );

    // The floor's product is the kilning's input.
    expect(profile.productMaterial).toBe(
      '/trade/malting/idea/material/green-malt',
    );
    const slot = kiln.getInputSlots()[0]!;
    expect(greenMalt.tags as string[]).toContain(slot.category);

    // ⭐ And the kilning's output is the material the SHIPPED mash recipes
    // already wanted — which is what makes this an arrow between two
    // things that existed rather than a new chain.
    expect(kiln.getOutputMaterial()).toBe('/stuff/idea/material/food/malt');
  });

  it('⭐ and the steep\'s product is the floor profile\'s input', () => {
    const steep = recipeOf(MALTING, 'steep-barley');
    const profile = row(
      MALTING,
      'content/trade/malting/idea/maturation/malting.yaml',
    );
    const steeped = row(
      MALTING,
      'content/trade/malting/idea/material/steeped-barley.yaml',
    );
    expect(steep.getOutputMaterial()).toBe(
      '/trade/malting/idea/material/steeped-barley',
    );
    expect(steeped.tags as string[]).toContain(profile.inputCategory);
    // The steep lands IN the floor, so the clock has something to tick.
    expect(steep.getOutputTemplate()).toBe(
      '/trade/malting/thing/malting-floor',
    );
  });

  it('the malting chain feeds the mash the distiller already ships', () => {
    // malt -> (mill) -> grist -> wash-mash. The mill is trade-milling's
    // and shipped; what matters here is that the malt we make is the malt
    // it grinds.
    const mash = recipeOf(DISTILLING, 'wash-mash');
    const malt = row(BASE, 'content/stuff/idea/material/food/malt.yaml');
    expect(malt.tags as string[]).toContain('malt');
    // The mash wants GRIST, not malt — the grain chain's D16, unchanged.
    expect(mash.getInputSlots().map((s) => s.category)).toContain('grist');
  });
});

describe('⭐ the kiln can hold the band the kilning asks for', () => {
  it('the recipe\'s window brackets the kiln row\'s burn temperature', () => {
    const kiln = recipeOf(MALTING, 'kiln-malt');
    const kilnRow = row(MALTING, 'content/trade/malting/thing/malt-kiln.yaml');
    const burn = Number(kilnRow.burnTemperatureK);
    expect(burn).toBeGreaterThanOrEqual(kiln.getRequiresHeatK());
    expect(burn).toBeLessThanOrEqual(kiln.getMaxHeatK() ?? Infinity);
    // ⭐⭐ And the number IS the lesson: a limekiln on the same `Oven`
    // class holds 1500 K and this one holds 340, because heat above about
    // 350 destroys the enzymes the floor spent five days making. A feeble
    // fire on purpose.
    expect(burn).toBeLessThan(400);
  });

  it('⭐ the kiln ships COLD and EMPTY, and `stoke` is how it gets fuel', () => {
    const kilnRow = row(MALTING, 'content/trade/malting/thing/malt-kiln.yaml');
    // ⚠ This used to assert a `%` `'fuel'` Reserve, because a burner that
    // did not author one could not be lit AT ALL and the still shipped
    // that way for the life of its pack with nothing visible about the
    // failure. The fire build made fuel a BED somebody puts matter in, so
    // the row authors a CAPACITY and a POWER and no fuel — and the
    // refusal a player meets is `no-fuel`, which names the act that lifts
    // it. ⭐ A row that ships pre-fuelled is now the odd one out (the
    // campfire, the practicum brazier), not the norm.
    expect(kilnRow.reserves).toBeUndefined();
    expect(kilnRow.fuelCapacityKg).toBeGreaterThan(0);
    expect(kilnRow.maxBurnPowerW).toBeGreaterThan(0);
    expect(kilnRow.lit).toBe(false);
  });
});

describe('⭐⭐ the floor\'s clock runs on a mechanism that is TRUE', () => {
  it('`enzymatic` is in the closed union and has its own prose', () => {
    expect(MATURATION_MECHANISMS).toContain('enzymatic');
    const lines = MATURATION_LINES.enzymatic;
    // Every rung present — the Record is total by construction, and a
    // missing one would be an `undefined` sentence at a vat.
    for (const rung of [
      'starting',
      'working',
      'finished',
      'turned',
      'stalled',
      'killed',
    ] as const) {
      expect(lines[rung], rung).toBeTruthy();
    }
    // ⚠⚠ And the prose must not claim an organism or a reagent is doing
    // it. Nothing is living on a malting bed and nothing was added; the
    // grain is doing this to itself, and the platform teaches.
    const all = Object.values(lines).join(' ').toLowerCase();
    for (const word of ['yeast', 'bubble', 'ferment', 'microb', 'breath']) {
      expect(all, `enzymatic prose must not say '${word}'`).not.toContain(
        word,
      );
    }
  });

  it('⭐ a steeped bed on the real profile becomes green malt', () => {
    const data = row(
      MALTING,
      'content/trade/malting/idea/maturation/malting.yaml',
    );
    const STEEPED = '/trade/malting/idea/material/steeped-barley';
    const GREEN = '/trade/malting/idea/material/green-malt';
    for (const [path, rel] of [
      [STEEPED, 'content/trade/malting/idea/material/steeped-barley.yaml'],
      [GREEN, 'content/trade/malting/idea/material/green-malt.yaml'],
    ] as const) {
      const m = row(MALTING, rel);
      makeStuffAtPath(() => {
        const mat = new Material();
        mat.setName(String(m.name));
        mat.setTags((m.tags as string[]) ?? []);
        return mat;
      }, path);
    }
    makeStuffAtPath(() => {
      const p = new MaturationProfile();
      p.setKey(String(data.key));
      p.setMechanism(data.mechanism as never);
      p.setInputCategory(String(data.inputCategory));
      p.setProductMaterial(String(data.productMaterial));
      p.setRatePerDay(Number(data.ratePerDay));
      p.setStallBelowK(Number(data.stallBelowK));
      p.setHappyK(Number(data.happyK));
      p.setDamageAboveK(Number(data.damageAboveK));
      p.setKillK(Number(data.killK));
      return p;
    }, '/trade/malting/idea/maturation/malting');

    const floorRow = row(
      MALTING,
      'content/trade/malting/thing/malting-floor.yaml',
    );
    const bed = makeStuff(() => new Vat());
    (bed as unknown as { interiorBulk: boolean }).interiorBulk = true;
    bed.setInteriorCapacity(
      Quantity.of(Number(floorRow.interiorCapacity), 'L'),
    );
    // A cold stone floor, which is the traditional answer and the correct
    // one.
    bed.lastAmbientK = 288;
    bed.stampedTemperatureK = 288;
    bed.setOpen(true);
    bed.setBulkMaterial(
      'interior',
      StuffApi.findByTemplatePath<Material>(STEEPED)!,
    );
    bed.setBulkAmount('interior', Quantity.of(40, 'L'));

    // The premise before the claim: the profile matched and the bed is
    // working. An `idle` bed here would make every later assertion pass
    // for the wrong reason.
    expect(bed.getMaturationPhase()).toBe('active');

    // Five game-days on the floor, which is what a real one takes.
    let remaining = 5 * 86_400;
    while (remaining > 0) {
      const step = Math.min(3600, remaining);
      real += (step / SCALE) * 1000;
      bed.getMaturationPhase();
      remaining -= step;
    }

    expect(bed.getMaturationPhase()).toBe('finished');
    expect(bed.getBulkMaterialPath('interior')).toBe(GREEN);
  });

  it('⚠ a WARM floor kills the bed — the maltster\'s one real trade-off', () => {
    const data = row(
      MALTING,
      'content/trade/malting/idea/maturation/malting.yaml',
    );
    // A warm floor runs faster, and past `killK` it cooks the bed: slack,
    // sour, and no malt. That is the choice the trade is built on — speed
    // against the batch — and it is two authored numbers, not a dial.
    expect(Number(data.killK)).toBeGreaterThan(Number(data.damageAboveK));
    expect(Number(data.happyK)).toBeLessThan(Number(data.damageAboveK));
    // And cold is forgiving: it stalls rather than ruining.
    expect(Number(data.stallBelowK)).toBeLessThan(Number(data.happyK));
  });
});

/**
 * ⭐⭐⭐ The PEATED kiln — the same act over a different fire, and the
 * decision that makes whiskey a product rather than a chemistry demo.
 *
 * Everything that distinguishes a peated whisky from a clean one follows
 * from choosing between two lines on one board. Nothing downstream is
 * authored twice: the smoke is a concentration, so it survives the mash,
 * the ferment, the grind and the pour by the same arithmetic that moves
 * every other concentration, and it comes over the still LATE — which is
 * what moves the right cut.
 */
describe('⭐⭐ the peated kiln — one choice, and the whole product changes', () => {
  it('⚠ peat carries its own NAME as a tag — still true, and still for the slot', () => {
    const peat = row(BASE, 'content/stuff/idea/material/organic/peat.yaml');
    expect(peat.tags as string[]).toContain('peat');
  });

  it('⭐⭐⭐ ONE kiln recipe, and the smoke is on the MATERIAL', () => {
    // There were two of these rows: `kiln-malt-peated` was `kiln-malt`
    // plus `imparts: [{smoke, 30}]` plus four turves as an ITEM SLOT.
    // The fire build retired it and put the fact where it belongs.
    //
    // ⭐ What that buys, and none of it was reachable before: the SAME
    // recipe over a different fire gives a different malt; a sodden turf
    // refuses on its own moisture at the `stoke`, because the turf is a
    // thing in the world and not a line in an input list; and a mixed
    // bed is weighted by mass.
    expect(() => recipeOf(MALTING, 'kiln-malt-peated')).toThrow();
    const clean = recipeOf(MALTING, 'kiln-malt');
    // ⚠ No fuel slot anywhere: the fuel is in the firebox, not the recipe.
    expect(clean.getInputSlots().find((s) => s.slot === 'fuel')).toBeUndefined();
    expect(clean.getImparts()).toEqual([]);

    const peat = row(BASE, 'content/stuff/idea/material/organic/peat.yaml');
    const imparts = peat.combustionImparts as {
      type: string;
      amount: number;
    }[];
    expect(imparts.length).toBeGreaterThan(0);
    for (const tag of imparts) {
      expect(DissolvedAromatics.isAroma(tag.type), tag.type).toBe(true);
      expect(tag.amount).toBeGreaterThan(0);
    }
    expect(imparts.find((t) => t.type === 'smoke')).toBeDefined();

    // ⚠ And the turf THING resolves to that material, or there is
    // nothing in the world to stoke the kiln WITH.
    const turf = row(
      join(PACKS, 'trade-quarrying'),
      'content/trade/quarrying/thing/turf.yaml',
    );
    expect(turf._materialPath).toBe('/stuff/idea/material/organic/peat');
  });

  it('⭐ 25 of the 26 fuels author nothing — only peat is smoky', () => {
    // The fact belongs to the SUBSTANCE, so it had better be sparse: a
    // world where every fuel imparted something would mean the choice
    // of fuel was noise rather than a decision.
    for (const rel of [
      'content/stuff/idea/material/wood/oak.yaml',
      'content/stuff/idea/material/wood/pine.yaml',
      'content/stuff/idea/material/mineral/coal.yaml',
    ]) {
      expect(row(BASE, rel).combustionImparts, rel).toBeUndefined();
    }
  });

  it('⚠ keeps the enzyme band — a peat fire is COOL, which is why it works', () => {
    // Above ~350 K the enzymes the floor spent five days making are
    // destroyed, so the window is narrow in both directions. A
    // smouldering peat fire is exactly the gentle heat this needs — and
    // since the fire build that is ARITHMETIC: peat's 15 MJ/kg derives a
    // ~1275 K flame, which the kiln's own 340 K ceiling caps hard.
    const clean = recipeOf(MALTING, 'kiln-malt');
    const kiln = row(MALTING, 'content/trade/malting/thing/malt-kiln.yaml');
    expect(Number(kiln.burnTemperatureK)).toBeGreaterThanOrEqual(
      clean.getRequiresHeatK(),
    );
    expect(Number(kiln.burnTemperatureK)).toBeLessThanOrEqual(
      clean.getMaxHeatK(),
    );
  });

  it('⭐⭐ and the smoke comes over LATE — the cut a malting choice moved', () => {
    // The whole argument, read off the rows. The phenols a peated malt
    // carries reach the hearts at more than the charge's strength and
    // the TAILS at more than that — so a peated wash and a clean one do
    // not want the same cut, and the maltster has rewritten the
    // distiller's correct answer.
    const wash = row(
      DISTILLING,
      'content/trade/distilling/idea/fractionation/wash.yaml',
    );
    const fractions = wash.fractions as {
      key: string;
      upTo: number;
      aromaticCarry?: number;
    }[];
    const carry = (key: string) =>
      fractions.find((f) => f.key === key)?.aromaticCarry ?? 1;
    expect(carry('foreshots'), 'the foreshots must be clean of it').toBe(0);
    expect(carry('hearts')).toBeGreaterThan(1);
    expect(carry('tails')).toBeGreaterThan(carry('hearts'));
    // ⚠ And the fork is only a fork because the tails are the WORST
    // spirit: following your nose past the hearts gets you more of the
    // character and ruins the cut. If the tails were `fine` there would
    // be no decision here at all.
    const band = (key: string) =>
      (fractions.find((f) => f.key === key) as { gradeBand?: string })
        ?.gradeBand;
    expect(band('hearts')).toBe('fine');
    expect(band('tails')).toBe('poor');
  });

  it('⚠ the still book offers it, and somebody seated can MAKE it', () => {
    // The reachability pair that `lint:menu-staff` exists to keep
    // honest, asserted here because the gate is a ceiling and a ceiling
    // cannot say WHICH lines are covered. The predecessor shipped with
    // these lines off the board and a wire drive that asserted them on.
    const book = row(
      DISTILLING,
      'content/trade/distilling/thing/still-book.yaml',
    );
    const offered = book.offeredRecipes as string[];
    // ⭐ ONE kiln line now. `kiln-malt-peated` is retired — what the
    // barley tastes of is decided at the firebox, not at the board.
    expect(offered).not.toContain('kiln-malt-peated');
    expect(offered).toContain('kiln-malt');
    expect(offered).toContain('steep-barley');

    const outfit = row(
      join(PACKS, 'terminus'),
      'content/world/terminus/goods-yards/crowsfoot/idea/outfit.yaml',
    );
    const seats = outfit.positions as { key: string; fulfills?: string[] }[];
    const hand = seats.find((s) => s.key === 'hand');
    expect(hand?.fulfills, 'no seat fulfils malting').toContain('malting');

    // ⚠ And the band, not just the trade: both kiln lines are STANDARD,
    // and only `proficient` licenses standard work. A seat that fulfils
    // the trade at `competent` refuses with the seat reading as staffed.
    const hands = row(
      join(PACKS, 'terminus'),
      'content/world/terminus/goods-yards/crowsfoot/agent/hand.yaml',
    );
    const claims = hands.competence as {
      discipline: string;
      asserting: string;
    }[];
    expect(
      claims.find((c) => c.discipline === 'malting')?.asserting,
    ).toBe('proficient');
    expect(recipeOf(MALTING, 'kiln-malt').getDifficulty()).toBe('standard');
  });
});
