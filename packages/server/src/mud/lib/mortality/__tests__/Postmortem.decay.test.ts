/**
 * The corpse's own clock.
 *
 * A dead body runs on game-time whether or not anyone is watching and
 * whether or not the person who used to live in it ever returns. That
 * independence is what makes forensics a discipline rather than a flavour
 * string: the cause is stamped ground truth, the readable signs rot, and
 * the gap between them is where an examiner can be wrong.
 *
 * It also decides when the world may reclaim the body — by *withdrawing an
 * objection* rather than destroying anything.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Creature } from '../../creature/Creature';
import { MORTALITY_DEFAULTS } from '../MortalArc';
import { WorldClockApi } from '../../../api/worldclock';
import '../../../platform/idea/WorldClockRegistry';
import { StuffApi } from '../../../api/stuff';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import Material from '../../material/Material';
import { Quantity } from '../../quantity';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import { Freshness } from '../../material/Freshness';
import { MixinApi } from '../../../api/mixin';

const SCALE = 12;
let real = 0;

/** Advance game-time by `gameSec`. */
function advance(gameSec: number): void {
  real += (gameSec / SCALE) * 1000;
}

const STAGE = MORTALITY_DEFAULTS.DECAY_STAGE_SEC;

function corpse(): Creature {
  const c = makeStuff(() => new Creature());
  c.setLifecycleState('dead');
  c.setCauseOfDeath('exsanguination');
  c.markDeceasedAt(WorldClockApi.getNow().rawValue());
  return c;
}

describe('PostmortemMixin — the corpse clock', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    real = 100000;
    WorldClockApi._setNowProviderForTesting(() => real);
  });
  afterEach(() => WorldClockApi._resetForTesting());

  it('walks the decay stages in order and never walks back', () => {
    const c = corpse();
    expect(c.getDecayStage()).toBe('fresh');

    advance(STAGE + 1);
    expect(c.getDecayStage()).toBe('stale');

    advance(STAGE);
    expect(c.getDecayStage()).toBe('decomposed');

    advance(STAGE);
    expect(c.getDecayStage()).toBe('spent');

    // Terminal — it stays there.
    advance(STAGE * 100);
    expect(c.getDecayStage()).toBe('spent');
  });

  it('forensic readability falls monotonically to nothing', () => {
    const c = corpse();
    const readings: number[] = [c.getForensicReadability()];
    for (let i = 0; i < 3; i++) {
      advance(STAGE + 1);
      readings.push(c.getForensicReadability());
    }

    for (let i = 1; i < readings.length; i++) {
      expect(readings[i]!).toBeLessThan(readings[i - 1]!);
    }
    expect(readings[0]).toBe(1);
    expect(readings[readings.length - 1]).toBe(0);
  });

  it('the cause stamp does NOT rot — evidence degrades, the answer key does not', () => {
    // The whole pedagogy of forensics lives in this gap.
    const c = corpse();
    advance(STAGE * 10);
    expect(c.getDecayStage()).toBe('spent');
    expect(c.getForensicReadability()).toBe(0);
    expect(c.getCauseOfDeath()).toBe('exsanguination');
  });

  it('vetoes eviction until spent, then withdraws the objection', () => {
    const c = corpse();
    const ctx = { idleMs: 10_000_000, reason: 'idle' as const };

    expect(c.canEvict(ctx).ok).toBe(false);
    advance(STAGE + 1);
    expect(c.canEvict(ctx).ok).toBe(false);
    advance(STAGE * 2 + 1);
    expect(c.getDecayStage()).toBe('spent');
    // Not destroyed — merely no longer objecting. The ordinary residency
    // sweep decides from here.
    expect(c.canEvict(ctx).ok).toBe(true);
  });

  it('⭐ freshnessLoad — the flesh spoils on the shipped law, from the moment of death (fishing D9)', () => {
    const c = corpse();
    const flesh = makeStuffAtPath(() => {
      const m = new Material();
      m.setName('test-flesh');
      m.setSpoilActivationEnergy(Quantity.of(60_000, 'J/mol'));
      m.setWaterActivity(0.99);
      return m;
    }, '/test/mortality/flesh') as unknown as Material;
    if (MixinApi.isTangible(c)) c.setMaterial(flesh);
    const material = MixinApi.isTangible(c) ? c.getMaterial() : null;
    expect(material).toBe(flesh);
    expect(c.freshnessLoad()).toBeCloseTo(Freshness.inoculum(), 9);
    advance(6 * 3600);
    const load = c.freshnessLoad();
    expect(load).toBeGreaterThan(Freshness.inoculum());
    // The same arithmetic butchering runs on a cut, at the same inputs.
    expect(load).toBeCloseTo(
      Freshness.advance(Freshness.inoculum(), c.sinceDeath()!, material, Freshness.hostTemperatureK(c)),
      9,
    );
    advance(6 * 3600);
    expect(c.freshnessLoad()).toBeGreaterThan(load);
  });

  it('freshnessLoad is 0 on a living body', () => {
    const c = makeStuff(() => new Creature());
    expect(c.freshnessLoad()).toBe(0);
  });

  it('is completely inert on a LIVING body', () => {
    const alive = makeStuff(() => new Creature());
    alive.setLifecycleState('alive');
    advance(STAGE * 10);

    expect(alive.getDecayStage()).toBe('fresh');
    expect(alive.getForensicReadability()).toBe(1);
    expect(alive.getPostmortemProgressions()).toEqual([]);
    expect(alive.canEvict({ idleMs: 1, reason: 'idle' }).ok).toBe(true);
  });

  it('fills the postmortem-progression seam vitals.md reserved', () => {
    const c = corpse();
    expect(c.getPostmortemProgressions()).toEqual(['fresh']);
    advance(STAGE + 1);
    expect(c.getPostmortemProgressions()).toEqual(['fresh', 'stale']);
  });

  it('the time of death is stamped once and never re-stamped', () => {
    const c = corpse();
    const first = c.diedAtGameSec;
    advance(STAGE * 2);
    c.markDeceasedAt(WorldClockApi.getNow().rawValue());
    expect(c.diedAtGameSec).toBe(first);
  });

  it('a corpse cools toward ambient without any postmortem code', () => {
    // Algor mortis is free: a body that stops regulating drifts through
    // the shipped Thermal layer. Nothing here drives it.
    const c = corpse();
    expect(c.getVitalSign('coreTemperature').rawValue()).toBeGreaterThan(0);
    expect(StuffApi.findById(c.stuffId)).toBe(c);
  });
});

/**
 * ⭐⭐⭐ The decay band reaches the UX — the half that was missing.
 *
 * ⚠⚠ `getDecayStage()` computed four bands from the mortality build
 * onward and **had no production reader anywhere in the tree.** So two
 * of one player's corpses at different states of decay were
 * indistinguishable to a player: the same keywords (the carcass chain's
 * keyword union gave them the dead thing's name keywords too), nothing in
 * the `distinguishing` form but a worn item, and then a bare ordinal —
 * the exact *two buttons both labelled "a cane rod"* failure the fishing
 * drive caught.
 *
 * ⭐ It had to land on the PRESENTATION path rather than in a key, because
 * that is how the UX refers to things at all: keyword → the
 * `distinguishing` form → an ordinal. `PromptLogic.projectMatches` renders
 * every disambiguation choice in that form and `perceivedKeywords`
 * tokenizes it, so a player both READS the word and can TYPE it. A durable
 * timestamp can do neither, which is the whole argument.
 */
describe('⭐ the decay band is legible — and targetable', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    real = 100000;
    WorldClockApi._setNowProviderForTesting(() => real);
  });
  afterEach(() => WorldClockApi._resetForTesting());

  it('says nothing while the body is fresh', () => {
    const c = corpse();
    // ⚠ Silence is deliberate, for the same reason only a TIE gets an
    // ordinal: a word every corpse carries tells you nothing, and would
    // make `fresh` match every body in the room.
    expect(c.describeFor(undefined, 'distinguishing')).not.toMatch(/fresh/);
  });

  it('⭐⭐ names the band once the body has turned', () => {
    const c = corpse();
    advance(STAGE + 1);
    expect(c.getDecayStage()).toBe('stale');
    expect(c.describeFor(undefined, 'distinguishing')).toMatch(/stale/);

    advance(STAGE);
    expect(c.getDecayStage()).toBe('decomposed');
    expect(c.describeFor(undefined, 'distinguishing')).toMatch(/decomposed/);
  });

  it('⭐⭐ two bodies at different bands are told apart IN WORDS', () => {
    const older = corpse();
    advance(STAGE * 2 + 1);
    const fresher = corpse();

    const a = older.describeFor(undefined, 'distinguishing');
    const b = fresher.describeFor(undefined, 'distinguishing');
    // The point of the whole exercise: a player can see which is which,
    // without a path, a timestamp or an ordinal.
    expect(a).not.toBe(b);
    expect(a).toMatch(/decomposed/);
    expect(b).not.toMatch(/decomposed/);
  });

  it('⭐⭐ and the band is a TARGETING keyword, so it can be typed', () => {
    const c = corpse();
    advance(STAGE + 1);
    const viewer = makeStuff(() => new Creature());
    // `perceivedKeywords` tokenizes the distinguishing form — this is what
    // makes `butcher stale` reach the body a player is looking at.
    expect(c.perceivedKeywordsFor(viewer)).toContain('stale');
  });

  it('⚠ a LIVING creature says nothing — every creature is Postmortem', () => {
    // `PostmortemMixin` wraps `CreatureBase`, so the guard cannot be "does
    // it compose the mixin". It is `diedAtGameSec === 0` answering `fresh`,
    // and `fresh` being silent.
    const alive = makeStuff(() => new Creature());
    alive.setLifecycleState('alive');
    advance(STAGE * 3);
    expect(alive.describeFor(undefined, 'distinguishing')).not.toMatch(
      /stale|decomposed|spent/,
    );
  });
});
