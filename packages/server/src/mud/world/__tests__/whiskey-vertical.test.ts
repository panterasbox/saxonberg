/**
 * ⭐⭐⭐ **The whole vertical, as ONE continuous sequence** — barley to a
 * bottle somebody gets ill from, on the real shipped rows, with every
 * handoff asserted where it actually happens.
 *
 * ## Why this file exists even though the halves were already tested
 *
 * `malting-chain.test.ts` proves the malting rows JOIN. `whiskey-run.test.ts`
 * proves the still runs and the cask ages. Both pass, and between them they
 * still left the question that matters unanswered: **does the output of each
 * step actually satisfy the input of the next one, in sequence, with nothing
 * hand-fed in the middle?**
 *
 * ⚠⚠ That gap is exactly how `feel`/`taste` shipped without ever running and
 * how the reference-Idea roster went inert three separate times: every piece
 * tested, no piece connected. A chain of eight links each proved in isolation
 * is not a proved chain — it is eight proofs and an assumption.
 *
 * So each step here **consumes what the previous step produced**, read back
 * out of the world rather than re-stated. Where a step is somebody else's
 * trade (the mill), its row is the thing under test: the tag it emits must be
 * the tag the next slot asks for.
 *
 * ## The eight links
 *
 *   barley → steeped → green malt → malt → grist → wort → wash
 *          → new-make (the CUT) → whiskey
 *
 * The clock-driven links (floor, ferment, cask) run on the pinned world clock;
 * the volume-driven link (the cut) runs on draws. ⭐ Those are the two
 * different engines this build put beside each other, and this is the only
 * test where they meet in sequence.
 */

import '../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import Vat from '../../platform/thing/Vat';
import CraftVessel from '../../platform/thing/CraftVessel';
import MaturationProfile from '../../platform/idea/maturation/MaturationProfile';
import FractionSchedule from '../../platform/idea/fractionation/FractionSchedule';
import Material from '../../lib/material/Material';
import { Recipe } from '../../lib/craft/Recipe';
import { StuffApi } from '../../api/stuff';
import { BulkableApi } from '../../api/bulk';
import { WorldClockApi } from '../../api/worldclock';
import { Quantity } from '../../lib/quantity';
import { Grade } from '../../lib/craft/Grade';
import { TemplatePaths } from '../../lib/paths';
import {
  makeStuff,
  makeStuffAtPath,
  stampTemplatePathForTest,
} from '../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import WorldClockRegistry from '../../platform/idea/WorldClockRegistry';
import Still from '../../../../../content/trade-distilling/src/thing/Still';

const PACKS = fileURLToPath(new URL('../../../../../content/', import.meta.url));
const MALTING = join(PACKS, 'trade-malting');
const MILLING = join(PACKS, 'trade-milling');
const DISTILLING = join(PACKS, 'trade-distilling');
const FARMING = join(PACKS, 'trade-farming');
const BASE = join(PACKS, 'base-library');

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

/** Stand an authored Material row up at a path, and return its tags. */
function material(pack: string, rel: string, path: string): string[] {
  const d = row(pack, rel);
  makeStuffAtPath(() => {
    const m = new Material();
    m.setName(String(d.name));
    m.setTags((d.tags as string[]) ?? []);
    m.setEdibility(d.edibility === true);
    if (d.toxicity) m.setToxicity(d.toxicity as never);
    m.setNutrients((d.nutrients as string[]) ?? []);
    if (d.nutrientAmounts) {
      m.setNutrientAmounts(d.nutrientAmounts as Record<string, number>);
    }
    return m;
  }, path);
  return (d.tags as string[]) ?? [];
}

/** Stand an authored MaturationProfile row up at its own path. */
function profile(pack: string, rel: string, path: string): MaturationProfile {
  const d = row(pack, rel);
  return makeStuffAtPath(() => {
    const p = new MaturationProfile();
    p.setKey(String(d.key));
    p.setMechanism(d.mechanism as never);
    p.setInputCategory(String(d.inputCategory));
    p.setProductMaterial(String(d.productMaterial));
    p.setRatePerDay(Number(d.ratePerDay));
    if (d.stallBelowK !== undefined) p.setStallBelowK(Number(d.stallBelowK));
    if (d.happyK !== undefined) p.setHappyK(Number(d.happyK));
    if (d.damageAboveK !== undefined) p.setDamageAboveK(Number(d.damageAboveK));
    if (d.killK !== undefined) p.setKillK(Number(d.killK));
    if (d.sealedOnly === true) p.setSealedOnly(true);
    if (d.turnDays !== undefined) p.setTurnDays(Number(d.turnDays));
    // ⚠ Read from the ROW. A helper that stands a profile up field by
    // field goes stale SILENTLY the moment the row gains one.
    if (d.productAtFraction !== undefined) {
      p.productAtFraction = Number(d.productAtFraction);
    }
    return p;
  }, path);
}

function vat(tempK: number, capacityL: number): Vat {
  const v = makeStuff(() => new Vat());
  (v as unknown as { interiorBulk: boolean }).interiorBulk = true;
  v.setInteriorCapacity(Quantity.of(capacityL, 'L'));
  v.lastAmbientK = tempK;
  v.stampedTemperatureK = tempK;
  v.setOpen(true);
  return v;
}

function pail(capacityL: number): CraftVessel {
  const p = makeStuff(() => new CraftVessel());
  (p as unknown as { interiorBulk: boolean }).interiorBulk = true;
  p.setInteriorCapacity(Quantity.of(capacityL, 'L'));
  return p;
}

function slotOf(v: unknown) {
  return BulkableApi.slotFor(v as never, undefined)!;
}

function fillWith(v: unknown, path: string, litres: number): void {
  const holder = v as unknown as {
    setBulkMaterial(a: 'interior', m: Material): void;
    setBulkAmount(a: 'interior', q: Quantity<'L'>): void;
  };
  holder.setBulkMaterial(
    'interior',
    StuffApi.findByTemplatePath<Material>(path)!,
  );
  holder.setBulkAmount('interior', Quantity.of(litres, 'L'));
}

function graded(v: unknown): {
  getGradeBand(): string;
  setGrade(g: Grade): void;
} {
  return v as { getGradeBand(): string; setGrade(g: Grade): void };
}

/** Advance the world clock, driving a host's reconcile as it goes. */
function age(host: { getMaturationPhase(): string }, gameDays: number): void {
  let remaining = gameDays * 86_400;
  while (remaining > 0) {
    const step = Math.min(3600, remaining);
    real += (step / SCALE) * 1000;
    host.getMaturationPhase();
    remaining -= step;
  }
}

const P = {
  barley: '/stuff/idea/material/food/barley-grain',
  steeped: '/trade/malting/idea/material/steeped-barley',
  green: '/trade/malting/idea/material/green-malt',
  malt: '/stuff/idea/material/food/malt',
  grist: '/stuff/idea/material/food/grist',
  wort: '/trade/distilling/idea/material/distillers-wort',
  wash: '/trade/distilling/idea/material/wash',
  newMake: '/trade/distilling/idea/material/new-make',
  stillage: '/trade/distilling/idea/material/stillage',
  whiskey: '/trade/distilling/idea/material/whiskey',
};

let tags: Record<string, string[]>;

beforeEach(() => {
  installV1QuantityMarshallers();
  stampTemplatePathForTest(
    makeStuff(() => new WorldClockRegistry()),
    TemplatePaths.worldClockRegistry,
  );
  WorldClockApi._resetForTesting();
  real = 100_000;
  WorldClockApi._setNowProviderForTesting(() => real);

  tags = {
    barley: material(FARMING, 'content/stuff/idea/material/food/barley-grain.yaml', P.barley),
    steeped: material(MALTING, 'content/trade/malting/idea/material/steeped-barley.yaml', P.steeped),
    green: material(MALTING, 'content/trade/malting/idea/material/green-malt.yaml', P.green),
    malt: material(BASE, 'content/stuff/idea/material/food/malt.yaml', P.malt),
    grist: material(MILLING, 'content/stuff/idea/material/food/grist.yaml', P.grist),
    wort: material(DISTILLING, 'content/trade/distilling/idea/material/distillers-wort.yaml', P.wort),
    wash: material(DISTILLING, 'content/trade/distilling/idea/material/wash.yaml', P.wash),
    newMake: material(DISTILLING, 'content/trade/distilling/idea/material/new-make.yaml', P.newMake),
    stillage: material(DISTILLING, 'content/trade/distilling/idea/material/stillage.yaml', P.stillage),
    whiskey: material(DISTILLING, 'content/trade/distilling/idea/material/whiskey.yaml', P.whiskey),
  };
});

afterEach(() => StuffApi.clearAll());

describe('⭐⭐⭐ barley to whiskey, one continuous chain on the shipped rows', () => {
  it('every handoff joins: each step\'s OUTPUT is the next step\'s INPUT', () => {
    // ⚠ The assertion the two half-tests could not make. Each link is read
    // off the row that actually decides it — a recipe's slot category, a
    // profile's inputCategory, a schedule's inputCategory — and compared
    // against the TAGS of the material the previous step emits. A link that
    // did not join would fail CLOSED and SILENT in play.
    const steep = recipeOf(MALTING, 'steep-barley');
    const kiln = recipeOf(MALTING, 'kiln-malt');
    const mash = recipeOf(DISTILLING, 'wash-mash');
    const maltingProfile = row(MALTING, 'content/trade/malting/idea/maturation/malting.yaml');
    const washProfile = row(DISTILLING, 'content/trade/distilling/idea/maturation/wash.yaml');
    const washSchedule = row(DISTILLING, 'content/trade/distilling/idea/fractionation/wash.yaml');
    const aging = row(DISTILLING, 'content/trade/distilling/idea/maturation/whiskey-aging.yaml');

    const slotCat = (r: Recipe, i = 0) => r.getInputSlots()[i]!.category;

    // 1. barley → the steep
    expect(tags.barley, 'the steep asks for a tag barley does not carry')
      .toContain(slotCat(steep));
    // 2. the steep → the floor
    expect(steep.getOutputMaterial()).toBe(P.steeped);
    expect(tags.steeped).toContain(String(maltingProfile.inputCategory));
    // 3. the floor → the kiln
    expect(String(maltingProfile.productMaterial)).toBe(P.green);
    expect(tags.green).toContain(slotCat(kiln));
    // 4. the kiln → malt (the material two shipped trades already wanted)
    expect(kiln.getOutputMaterial()).toBe(P.malt);
    // 5. malt → the mill → grist.
    //
    // ⛔⛔ **This assertion could not fail, and the link it claimed to
    // prove had never run.** It read `tags.grist` against the mash slot
    // — two rows that agree about the word `grist` — and never touched a
    // mill. Meanwhile both mill rows pinned `productMaterial` to WHEAT
    // FLOUR and `ComminutingMixin` had one product per row, so a malt
    // sack ground anywhere in the realm came out as flour the mash does
    // not accept. Every grain of grist in the world came off the
    // distributor's counter, and the predecessor's live drive stopped at
    // *"There isn't enough grist."*
    //
    // ⭐ So the mill is now IN the chain: the row the quern matches for a
    // feed tagged `malt` must produce the grist the mash asks for. Pin
    // `productMaterial` again and this fails.
    const quern = row(MILLING, 'content/trade/milling/thing/quern.yaml');
    const products = (quern.products ?? []) as {
      inputTag: string;
      product: string;
    }[];
    expect(products.length, 'the quern authors no products table').toBeGreaterThan(0);
    // ⚠ `noUncheckedIndexedAccess`: the tag map is built by lookup, so
    // every entry is possibly undefined. Asserting the premise FIRST is
    // the honest fix — a missing malt row must fail as "no tags for malt"
    // rather than as a confusing find() miss below.
    expect(tags.malt, 'no tags read for the malt material').toBeTruthy();
    const maltGrind = products.find((pr) =>
      (tags.malt ?? []).includes(pr.inputTag),
    );
    expect(maltGrind, 'no mill product row matches a tag malt carries').toBeDefined();
    expect(maltGrind!.product, 'the mill does not make grist from malt')
      .toBe(P.grist);
    expect(tags.grist).toContain(slotCat(mash));
    // 6. the mash → the ferment
    expect(mash.getOutputMaterial()).toBe(P.wort);
    expect(tags.wort).toContain(String(washProfile.inputCategory));
    // 7. the ferment → the still
    expect(String(washProfile.productMaterial)).toBe(P.wash);
    expect(tags.wash).toContain(String(washSchedule.inputCategory));
    // 8. the cut → the cask
    expect(String(washSchedule.productMaterial)).toBe(P.newMake);
    expect(tags.newMake).toContain(String(aging.inputCategory));
    // …and the cask's product is what the Lounge's par line asks for.
    expect(String(aging.productMaterial)).toBe(P.whiskey);
    expect(tags.whiskey).toContain('whiskey');
  });

  it('⭐⭐ and the chain RUNS: a steeped bed becomes whiskey that poisons nobody', () => {
    // ⚠ The joins above are static. This walks the two CLOCK links and the
    // VOLUME link in sequence, each consuming what the last produced.
    profile(MALTING, 'content/trade/malting/idea/maturation/malting.yaml',
      '/trade/malting/idea/maturation/malting');
    profile(DISTILLING, 'content/trade/distilling/idea/maturation/wash.yaml',
      '/trade/distilling/idea/maturation/wash');
    profile(DISTILLING, 'content/trade/distilling/idea/maturation/whiskey-aging.yaml',
      '/trade/distilling/idea/maturation/whiskey-aging');
    const sched = row(DISTILLING, 'content/trade/distilling/idea/fractionation/wash.yaml');
    makeStuffAtPath(() => {
      const s = new FractionSchedule();
      s.setKey(String(sched.key));
      s.setInputCategory(String(sched.inputCategory));
      s.setDiscipline(String(sched.discipline));
      s.setRequiresHeatK(Number(sched.requiresHeatK));
      s.setProductMaterial(String(sched.productMaterial));
      s.setResidueMaterial(String(sched.residueMaterial));
      s.setReadBlur(Number(sched.readBlur));
      s.setGradeStretch(Number(sched.gradeStretch));
      s.setFractions(sched.fractions as never);
      return s;
    }, '/trade/distilling/idea/fractionation/wash');

    // ── LINK A: the malting floor (clock, `enzymatic`) ──
    const floor = vat(288, 60); // a cold stone floor, as the row wants
    fillWith(floor, P.steeped, 40);
    expect(floor.getMaturationPhase(), 'the floor never started').toBe('active');
    age(floor, 8);
    expect(floor.getMaturationPhase()).toBe('finished');
    expect(
      floor.getBulkMaterialPath('interior'),
      'the bed did not become green malt',
    ).toBe(P.green);

    // ⭐ The kiln is a craft step, not a clock — its heat BAND is what this
    // build asserts about it, and the kiln row sits inside it. Proved in
    // malting-chain.test.ts; the chain continues from its output.

    // ── LINK B: the wash ferment (clock, microbial) ──
    const back = vat(290, 60);
    fillWith(back, P.wort, 60);
    graded(back).setGrade(Grade.of('masterful')); // a well-made wort
    expect(back.getMaturationPhase()).toBe('active');
    age(back, 12);
    expect(back.getMaturationPhase()).toBe('finished');
    expect(back.getBulkMaterialPath('interior'), 'the wort did not ferment')
      .toBe(P.wash);

    // ── LINK C: the cut (VOLUME, not a clock) ──
    const still = makeStuff(() => new Still()) as Still & { testHeatK: number };
    still.setInteriorCapacity(Quantity.of(60, 'L'));
    still.setClosure('liquidTight');
    still.testHeatK = 290;
    (still as unknown as { reachableHeatK(): number }).reachableHeatK = () =>
      still.testHeatK;
    still.setMaker('/platform/agent/Avatar/the-distiller');

    // ⭐ The charge comes OUT OF THE FERMENT — the handoff this whole file
    // exists to make, through the real transfer primitive.
    BulkableApi.transfer(slotOf(back), slotOf(still), { kind: 'all' });
    expect(slotOf(still).getMaterialPath()).toBe(P.wash);
    expect(still.getRunPhase()).toBe('charged');

    still.testHeatK = 358; // light it
    expect(still.getRunPhase()).toBe('running');
    expect(slotOf(still).getMaterialPath()).toBe(P.newMake);

    // Throw the foreshots and heads; keep a bottle of hearts, stopping
    // short of the tails as a careful distiller does.
    const slops = pail(10);
    BulkableApi.transfer(slotOf(still), slotOf(slops), {
      kind: 'measure', litres: 1.8, mode: 'strict',
    });
    const bottle = pail(1);
    BulkableApi.transfer(slotOf(still), slotOf(bottle), {
      kind: 'measure', litres: 0.75, mode: 'strict',
    });
    expect(graded(bottle).getGradeBand()).toBe('fine');

    // ── LINK D: the cask (clock, chemical) ──
    const cask = vat(290, 25);
    BulkableApi.transfer(slotOf(still), slotOf(cask), {
      kind: 'measure', litres: 8, mode: 'strict',
    });
    expect(slotOf(cask).getMaterialPath()).toBe(P.newMake);
    cask.setOpen(false); // bung it — the profile is sealedOnly
    // ⚠ 100 game-days: the styles build halved the cask's `ratePerDay`
    // so `productAtFraction` opens a real window (drawable at ~23 days,
    // finished at ~91). The chain's claim is about the finished bottle.
    age(cask, 100);

    // ⭐⭐⭐ The end of the chain: barley's descendant is whiskey, it is as
    // good as the cut was and no better, and it carries the cut's dose.
    expect(slotOf(cask).getMaterialPath()).toBe(P.whiskey);
    expect(graded(cask).getGradeBand()).toBe('fine');
    const dose =
      slotOf(cask).getPayload()?.dissolvedToxins?.find(
        (t) => t.type === 'methanol',
      )?.amount ?? 0;
    // Trace, as the hearts authored — and a whole bottle of it is under
    // the methanol row's lowest band, which `whiskey-run.test.ts` pins.
    expect(dose).toBeGreaterThan(0);
    expect(dose).toBeLessThan(200);
  });
});
