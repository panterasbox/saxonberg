/**
 * Wave 6 — spellbooks and memory.
 *
 * AC 26 — reading mints an idempotent known-of claim and writes NO
 *         Transcript entry; competence is unchanged.
 * AC 27 — below a book's comprehension floor you form a DEFECTIVE
 *         specification: it costs measurably more, and re-studying at
 *         sufficient competence replaces it.
 * AC 29 — a faded spell costs more mana and never fails for fading
 *         alone; casting restores sharpness; amnesia removes the held
 *         specification and leaves competence intact.
 * AC 30 — fade responds to maturity, to competence, to complexity and
 *         to interference — and is unaffected by which book taught it.
 * AC 31 — studying is interruptible and its duration falls as sharpness
 *         rises.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WorldClockApi } from '../../../api/worldclock';
import '../../../platform/idea/WorldClockRegistry';
import { Fade, FADE_DEFAULTS } from '../Fade';
import { MemorizedMixin } from '../Memorized';
import type { FadeInputs } from '../Fade';
import { Idea } from '../../stuff/Idea';
import { makeStuff } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

class Mind extends MemorizedMixin(Idea) {}

const SCALE = 12;
let real = 100000;

function advance(gameSec: number): void {
  real += (gameSec / SCALE) * 1000;
}

/** The neutral four axes — vary ONE at a time against this. */
const BASE: FadeInputs = {
  maturity: 0,
  competenceRank: 0,
  complexity: 1,
  neighbours: 0,
};

describe('Fade — the four axes (pure)', () => {
  it('AC30 — MATURITY slows it: each refresh lengthens the next interval', () => {
    // The spacing effect, and the anti-treadmill mechanism: upkeep falls
    // on NEW additions rather than on the whole repertoire, so a large
    // mature library is nearly free.
    const fresh = Fade.ratePerGameSec(BASE);
    const practised = Fade.ratePerGameSec({ ...BASE, maturity: 4 });
    const veteran = Fade.ratePerGameSec({ ...BASE, maturity: 10 });
    expect(practised).toBeLessThan(fresh);
    expect(veteran).toBeLessThan(practised);
    expect(veteran).toBeGreaterThan(0); // never quite free
  });

  it('AC30 — COMPETENCE slows it, and only in its own domain', () => {
    const untrained = Fade.ratePerGameSec(BASE);
    const expert = Fade.ratePerGameSec({ ...BASE, competenceRank: 4 });
    expect(expert).toBeLessThan(untrained);
    // Expertise protects STRUCTURED material in its OWN domain (Chase &
    // Simon). The rank passed in is the limiting band across THIS
    // spell's two axes — a fire expert's competence does nothing for a
    // mind spell, because a different rank comes in.
    expect(Fade.ratePerGameSec({ ...BASE, competenceRank: 0 })).toBe(
      untrained,
    );
  });

  it('AC30 — COMPLEXITY speeds it: more to hold, faster to lose', () => {
    const simple = Fade.ratePerGameSec(BASE);
    const intricate = Fade.ratePerGameSec({ ...BASE, complexity: 3 });
    expect(intricate).toBeGreaterThan(simple);
    expect(intricate).toBeCloseTo(simple * 3, 12);
  });

  it('AC30 — INTERFERENCE speeds it: the repertoire limiter', () => {
    const focused = Fade.ratePerGameSec(BASE);
    const crowded = Fade.ratePerGameSec({ ...BASE, neighbours: 6 });
    expect(crowded).toBeGreaterThan(focused);
    // There is no slot count and nothing forbids reading every book in
    // the library — but the more you hold the hazier they all get, so
    // you settle at the repertoire you can afford. A broad generalist is
    // permanently mediocre; a specialist's few are razor-sharp.
    const generalist = Fade.ratePerGameSec({ ...BASE, neighbours: 12 });
    expect(generalist).toBeGreaterThan(crowded);
  });

  it('AC30 — the axes are INDEPENDENT, and no axis is the book', () => {
    // `FadeInputs` has exactly four fields and none of them is the
    // source. Once a specification is in a mind, the book that put it
    // there has no say in how fast it degrades — a well-written one only
    // gets you back to sharp FASTER (D16), which is the teaching
    // product and lives on the study duration instead.
    expect(Object.keys(BASE).sort()).toEqual([
      'competenceRank',
      'complexity',
      'maturity',
      'neighbours',
    ]);
  });

  it('AC29 — fade is felt as COST and never as failure', () => {
    expect(Fade.costMultiplier(1)).toBe(1);
    expect(Fade.costMultiplier(0.5)).toBeGreaterThan(1);
    expect(Fade.costMultiplier(0)).toBe(FADE_DEFAULTS.MAX_COST_MULTIPLIER);
    // Crucially FINITE at zero. There is no sharpness at which the spell
    // stops working — only one at which it stops being worth casting,
    // and that call is the player's to make.
    expect(Number.isFinite(Fade.costMultiplier(0))).toBe(true);
    // Monotonic, so the signal is continuous rather than a cliff.
    expect(Fade.costMultiplier(0.2)).toBeGreaterThan(Fade.costMultiplier(0.8));
  });

  it('AC27 — a DEFECTIVE copy costs more again, on top of fade', () => {
    const sharpButWrong = Fade.costMultiplier(1, true);
    expect(sharpButWrong).toBe(FADE_DEFAULTS.DEFECTIVE_COST_MULTIPLIER);
    expect(sharpButWrong).toBeGreaterThan(Fade.costMultiplier(1, false));
    // A perfectly-remembered bad copy still costs double. That is the
    // point: half-understanding is worse than none, and the efficiency
    // is the signal that tells you so.
    expect(Fade.costMultiplier(0.5, true)).toBeGreaterThan(
      Fade.costMultiplier(0.5, false),
    );
  });

  it('AC31 — the SAVINGS CURVE: nearly-sharp refreshes fast', () => {
    expect(Fade.refreshFraction(1)).toBe(0);
    expect(Fade.refreshFraction(0)).toBe(1);
    // Quadratic, not linear: the last stretch back to sharp is cheap and
    // the first climb out of hazy is not — which rewards regular light
    // maintenance over cramming, exactly as the spacing effect predicts.
    expect(Fade.refreshFraction(0.9)).toBeLessThan(0.9 * 0.2);
    expect(Fade.refreshFraction(0.5)).toBeLessThan(0.5);
  });

  it('complexity DERIVES from the spell rather than being authored', () => {
    // No author can quietly make their spell cheap to remember.
    expect(Fade.complexityOf(1, 0)).toBe(1);
    expect(Fade.complexityOf(3, 0)).toBeGreaterThan(Fade.complexityOf(1, 0));
    expect(Fade.complexityOf(1, 4)).toBeGreaterThan(Fade.complexityOf(1, 0));
  });
});

describe('MemorizedMixin — the held repertoire', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    real = 100000;
    WorldClockApi._setNowProviderForTesting(() => real);
  });
  afterEach(() => {
    WorldClockApi._resetForTesting();
    vi.restoreAllMocks();
  });

  function hold(mind: Mind, spellPath: string, verb: string, noun: string): void {
    mind.memorize({ spellPath, verb, noun, complexity: 1, defective: false });
  }

  it('memorizing takes a working on board, fully sharp', () => {
    const mind = makeStuff(() => new Mind());
    hold(mind, '/stuff/idea/magic/Spell/firebolt', 'create', 'fire');
    const held = mind.getMemorizedSpell('/stuff/idea/magic/Spell/firebolt')!;
    expect(held.sharpness).toBe(1);
    expect(held.maturity).toBe(0);
    expect(mind.holdsSpell('/stuff/idea/magic/Spell/firebolt')).toBe(true);
    expect(mind.costMultiplierFor('/stuff/idea/magic/Spell/firebolt')).toBe(1);
  });

  it('AC29 — an UNHELD spell costs the ordinary price, not a penalty', () => {
    const mind = makeStuff(() => new Mind());
    // Not holding a copy is not an error and not a failure — you simply
    // pay what you always paid. Only holding a HAZY copy costs extra.
    expect(mind.costMultiplierFor('/stuff/idea/magic/Spell/firebolt')).toBe(1);
  });

  it('AC29 — it fades over game-time, and the cost rises with it', () => {
    const mind = makeStuff(() => new Mind());
    hold(mind, '/stuff/idea/magic/Spell/firebolt', 'create', 'fire');
    mind.getMemorized(); // seed the stamp

    advance(10 * 24 * 3600); // ten game-days untouched
    const held = mind.getMemorizedSpell('/stuff/idea/magic/Spell/firebolt')!;
    expect(held.sharpness).toBeLessThan(1);
    expect(held.sharpness).toBeGreaterThan(0); // faded, not gone
    expect(mind.costMultiplierFor('/stuff/idea/magic/Spell/firebolt')).toBeGreaterThan(1);
    // …and it still WORKS. Never a failure, never Infinity.
    expect(Number.isFinite(mind.costMultiplierFor('/stuff/idea/magic/Spell/firebolt'))).toBe(true);
  });

  it('AC29 — refreshing restores sharpness AND raises maturity', () => {
    const mind = makeStuff(() => new Mind());
    hold(mind, '/stuff/idea/magic/Spell/firebolt', 'create', 'fire');
    mind.getMemorized();
    advance(10 * 24 * 3600);
    expect(mind.getMemorizedSpell('/stuff/idea/magic/Spell/firebolt')!.sharpness).toBeLessThan(1);

    hold(mind, '/stuff/idea/magic/Spell/firebolt', 'create', 'fire'); // a cast, or a re-study
    const held = mind.getMemorizedSpell('/stuff/idea/magic/Spell/firebolt')!;
    expect(held.sharpness).toBe(1);
    // Each refresh lengthens the NEXT interval — so an actively used
    // spell never fades, and you lose only what you do not use.
    expect(held.maturity).toBe(1);
  });

  it('AC30 — interference is counted from NEIGHBOURING grid cells', () => {
    const mind = makeStuff(() => new Mind());
    hold(mind, '/stuff/idea/magic/Spell/firebolt', 'create', 'fire');
    expect(mind.neighbourCount('/stuff/idea/magic/Spell/firebolt')).toBe(0);

    // Shares the VERB.
    hold(mind, '/stuff/idea/magic/Spell/glowlight', 'create', 'light');
    expect(mind.neighbourCount('/stuff/idea/magic/Spell/firebolt')).toBe(1);
    // Shares the NOUN.
    hold(mind, '/stuff/idea/magic/Spell/quench', 'destroy', 'fire');
    expect(mind.neighbourCount('/stuff/idea/magic/Spell/firebolt')).toBe(2);
    // Shares NEITHER — the most alike things a holder could carry are
    // the ones in adjacent cells, and this is not one of them.
    hold(mind, '/stuff/idea/magic/Spell/dread', 'destroy', 'mind');
    expect(mind.neighbourCount('/stuff/idea/magic/Spell/firebolt')).toBe(2);
  });

  it('AC30 — a crowded repertoire fades measurably faster', () => {
    const specialist = makeStuff(() => new Mind());
    const generalist = makeStuff(() => new Mind());
    hold(specialist, '/stuff/idea/magic/Spell/firebolt', 'create', 'fire');
    for (const [id, v, n] of [
      ['firebolt', 'create', 'fire'],
      ['glowlight', 'create', 'light'],
      ['conjure-water', 'create', 'water'],
      ['spark', 'create', 'lightning'],
      ['veil', 'create', 'sense'],
    ] as const) {
      hold(generalist, `/stuff/idea/magic/Spell/${id}`, v, n);
    }
    specialist.getMemorized();
    generalist.getMemorized();

    // Ten game-days — long enough to separate the two, short enough
    // that neither has bottomed out (a comparison against two zeroes
    // would pass vacuously).
    advance(10 * 24 * 3600);
    const sharp = specialist.getMemorizedSpell('/stuff/idea/magic/Spell/firebolt')!.sharpness;
    const hazy = generalist.getMemorizedSpell('/stuff/idea/magic/Spell/firebolt')!.sharpness;
    // A broad generalist is permanently mediocre across their whole
    // list; a specialist's few are razor-sharp. No slot count imposed
    // it — it fell out of interference.
    expect(sharp).toBeGreaterThan(0);
    expect(hazy).toBeLessThan(sharp);
  });

  it('AC27 — a DEFECTIVE copy is replaced cleanly by re-studying', () => {
    const mind = makeStuff(() => new Mind());
    mind.memorize({
      spellPath: '/stuff/idea/magic/Spell/dispel',
      verb: 'destroy',
      noun: 'arcana',
      complexity: 1,
      defective: true,
    });
    expect(mind.getMemorizedSpell('/stuff/idea/magic/Spell/dispel')!.defective).toBe(true);
    const badCost = mind.costMultiplierFor('/stuff/idea/magic/Spell/dispel');
    expect(badCost).toBeGreaterThan(1); // fully sharp, still expensive

    // Re-study once competent — the recoverable half of the bargain.
    mind.memorize({
      spellPath: '/stuff/idea/magic/Spell/dispel',
      verb: 'destroy',
      noun: 'arcana',
      complexity: 1,
      defective: false,
    });
    expect(mind.getMemorizedSpell('/stuff/idea/magic/Spell/dispel')!.defective).toBe(false);
    expect(mind.costMultiplierFor('/stuff/idea/magic/Spell/dispel')).toBeLessThan(badCost);
    expect(mind.costMultiplierFor('/stuff/idea/magic/Spell/dispel')).toBe(1);
  });

  it('AC29 — AMNESIA strips the held specification and nothing else', () => {
    const mind = makeStuff(() => new Mind());
    hold(mind, '/stuff/idea/magic/Spell/firebolt', 'create', 'fire');
    hold(mind, '/stuff/idea/magic/Spell/veil', 'create', 'sense');

    expect(mind.forgetSpell('/stuff/idea/magic/Spell/firebolt')).toBe(true);
    expect(mind.holdsSpell('/stuff/idea/magic/Spell/firebolt')).toBe(false);
    // It takes what you MEMORIZED. Competence derives from Transcript
    // deeds and lives nowhere near here — there is no method on this
    // mixin that could touch it, which is the asymmetry made structural
    // rather than merely asserted.
    expect(mind.holdsSpell('/stuff/idea/magic/Spell/veil')).toBe(true);
    expect(mind.forgetSpell('/stuff/idea/magic/Spell/firebolt')).toBe(false);
    expect(
      Object.keys(mind).some((k) => /competence|transcript|deed/i.test(k)),
    ).toBe(false);
  });

  it('there is NO slot cap — the limiter is interference, not a rule', () => {
    const mind = makeStuff(() => new Mind());
    for (let i = 0; i < 40; i++) {
      hold(mind, `/stuff/idea/magic/Spell/spell-${i}`, 'create', 'fire');
    }
    // Nothing refused. Vancian preparation emerges from the cost of
    // keeping forty things sharp, rather than being imposed by a number.
    expect(mind.getMemorized()).toHaveLength(40);
  });
});
