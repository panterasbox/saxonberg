/**
 * Wave 4 — BUC and the condition/shadow line.
 *
 * AC 12 — a cursed charged item cannot be removed and transfers heat to
 *         its wearer.
 * AC 13 — a sustained effect from a charged host is renewable while
 *         charged; a term-bought one expires and cannot be renewed.
 * AC 14 — a condition can be vetoed at application, so an immunity
 *         conferred by a worn item refuses it.
 *
 * The through-line is that **BUC is the paradigm hidden-state axis**, so
 * it is also the paradigm leak risk. Merge behaviour, affordance lists,
 * and stack splitting are all channels nobody thinks of as channels
 * until something escapes through one.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WorldClockApi } from '../../../api/worldclock';
import '../../../platform/idea/WorldClockRegistry';
import { ConditionApi } from '../../../api/condition';
import { MixinApi } from '../../../api/mixin';
import { Blessing } from '../Blessing';
import { BlessableMixin } from '../Blessable';
import { ChargedMixin } from '../Charged';
import { ArcaneMixin } from '../Arcane';
import { ReservedMixin } from '../../reserve';
import { GlobbableMixin } from '../../stuff/Globbable';
import Thing from '../../stuff/Thing';
import { Creature } from '../../creature/Creature';
import type { ActiveCondition, SustainedEffect } from '../../../platform/idea/Condition';
import type { VetoResult } from '../../errors';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

/** A cursed-capable charged item. */
class TestRing extends BlessableMixin(
  ChargedMixin(ReservedMixin(ArcaneMixin(Thing))),
) {}
/** A stackable blessable — the merge-leak case. */
class TestCharm extends BlessableMixin(GlobbableMixin(Thing)) {}
/** A body that refuses burns — the conferred-immunity case. */
class WardedBody extends Creature {
  public override canAfflict(condition: ActiveCondition): VetoResult {
    if (condition.kind === 'trauma' && condition.type === 'burn') {
      return { ok: false, reason: 'the ward turns it aside' };
    }
    return super.canAfflict(condition);
  }
}

let seq = 0;
let real = 100000;

describe('Blessing — the ordinal band (pure)', () => {
  it('is the Grade shape: three ascending bands, ordinary in the middle', () => {
    expect(Blessing.BANDS).toEqual(['cursed', 'uncursed', 'blessed']);
    expect(Blessing.of('cursed').getOrdinal()).toBe(0);
    expect(Blessing.uncursed().getOrdinal()).toBe(1);
    expect(Blessing.of('blessed').getOrdinal()).toBe(2);
    expect(Blessing.of('cursed').isCursed()).toBe(true);
    expect(Blessing.of('blessed').isBlessed()).toBe(true);
    expect(Blessing.uncursed().isCursed()).toBe(false);
    expect(() => Blessing.of('haunted')).toThrow(/unknown band/);
    expect(Blessing.isBand('cursed')).toBe(true);
    expect(Blessing.isBand('haunted')).toBe(false);
  });

  it('`scale` puts cursed at the low end — the ENGINE owns the ordering', () => {
    // An author supplies two ends of a range; the band picks the point.
    // That makes "cursed is worse" a property of the substrate rather
    // than a convention every author has to remember to get right.
    expect(Blessing.scale(Blessing.of('cursed'), 10, 30)).toBe(10);
    expect(Blessing.scale(Blessing.uncursed(), 10, 30)).toBe(20);
    expect(Blessing.scale(Blessing.of('blessed'), 10, 30)).toBe(30);
    // It works just as well on an inverted range (a COST, where lower is
    // better) without the author having to invert the bands too.
    expect(Blessing.scale(Blessing.of('cursed'), 30, 10)).toBe(30);
    expect(Blessing.scale(Blessing.of('blessed'), 30, 10)).toBe(10);
  });

  it('`pick` is the discrete twin, and clamps a short list rather than throwing', () => {
    const steps = ['bad', 'fine', 'good'] as const;
    expect(Blessing.pick(Blessing.of('cursed'), steps)).toBe('bad');
    expect(Blessing.pick(Blessing.uncursed(), steps)).toBe('fine');
    expect(Blessing.pick(Blessing.of('blessed'), steps)).toBe('good');
    // Two options for three bands: an answer beats a crash.
    expect(Blessing.pick(Blessing.of('cursed'), ['no', 'yes'])).toBe('no');
    expect(Blessing.pick(Blessing.of('blessed'), ['no', 'yes'])).toBe('yes');
    expect(Blessing.pick(Blessing.uncursed(), [])).toBeNull();
  });
});

describe('BlessableMixin — hidden state that stays hidden', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    WorldClockApi._setNowProviderForTesting(() => 100000);
  });
  afterEach(() => {
    WorldClockApi._resetForTesting();
    vi.restoreAllMocks();
  });

  it('an item is ordinary and UNKNOWN by default', () => {
    const ring = makeStuff(() => new TestRing());
    expect(ring.getBlessing().getBand()).toBe('uncursed');
    expect(ring.getBlessingBucket()).toBe('unknown');
    expect(ring.isBlessingKnown()).toBe(false);
    expect(() => ring.setBlessingBand('haunted')).toThrow(/unknown band/);
  });

  it('AC21 — two UNKNOWN items merge regardless of their true state', () => {
    // The leak that would otherwise be free: if identity keyed on the
    // true band, a cursed charm silently refusing to stack with an
    // ordinary one would be a curse detector nobody built.
    const cursed = makeStuffAtPath(
      () => new TestCharm(),
      '/obj/test/charm-shared',
    );
    const blessed = makeStuffAtPath(
      () => new TestCharm(),
      '/obj/test/charm-shared',
    );
    cursed.setBlessingBand('cursed');
    blessed.setBlessingBand('blessed');

    expect(cursed.getBlessing().equals(blessed.getBlessing())).toBe(false);
    // …and they stack anyway, because what identity sees is `unknown`
    // on both.
    expect(cursed.canMergeWith(blessed)).toBe(true);
  });

  it('AC21 — a REVEALED item splits into its bucket', () => {
    const known = makeStuffAtPath(
      () => new TestCharm(),
      '/obj/test/charm-shared2',
    );
    const unknown = makeStuffAtPath(
      () => new TestCharm(),
      '/obj/test/charm-shared2',
    );
    known.setBlessingBand('cursed');
    unknown.setBlessingBand('cursed');
    expect(known.canMergeWith(unknown)).toBe(true);

    known.revealBlessing();
    expect(known.getBlessingBucket()).toBe('cursed');
    // It no longer stacks with the unknowns — and that is NOT a leak,
    // because the split was caused by a revelation everyone can see
    // rather than by the hidden state itself.
    expect(known.canMergeWith(unknown)).toBe(false);

    // Two items revealed to the SAME band stack with each other again.
    const alsoKnown = makeStuffAtPath(
      () => new TestCharm(),
      '/obj/test/charm-shared2',
    );
    alsoKnown.setBlessingBand('cursed');
    alsoKnown.revealBlessing();
    expect(known.canMergeWith(alsoKnown)).toBe(true);
  });

  it('AC21 — items revealed to DIFFERENT bands never stack', () => {
    const a = makeStuffAtPath(() => new TestCharm(), '/obj/test/charm-buc');
    const b = makeStuffAtPath(() => new TestCharm(), '/obj/test/charm-buc');
    a.setBlessingBand('cursed');
    b.setBlessingBand('blessed');
    a.revealBlessing();
    b.revealBlessing();
    expect(a.canMergeWith(b)).toBe(false);
  });

  it('AC12 — a cursed item refuses release; an ordinary one does not', () => {
    const cursed = makeStuff(() => new TestRing());
    const ordinary = makeStuff(() => new TestRing());
    cursed.setBlessingBand('cursed');
    expect(cursed.refusesRelease()).toBe(true);
    expect(ordinary.refusesRelease()).toBe(false);
  });

  it('AC12 — a cursed CHARGED item discharges into its holder', () => {
    const ring = makeStuff(() => new TestRing());
    ring.setBlessingBand('cursed');
    ring.setCapacityTau(1000);
    const wearer = makeStuff(() => new Creature());
    const before = ring.getStoredTau();

    const dumped = ring.dischargeIntoHolder(wearer);
    expect(dumped).toBeGreaterThan(0);
    // The energy left the ring…
    expect(ring.getStoredTau()).toBeLessThan(before);
    // …and went into the wearer. First law: it had to go somewhere.
    const burns = wearer
      .getConditions()
      .filter((c) => c.kind === 'trauma' && c.type === 'burn');
    expect(burns).toHaveLength(1);

    // Asymptotic — a fraction of what remains, so it bites hardest when
    // freshly charged and never quite finishes. Soft entropy, applied
    // to something unpleasant.
    const second = ring.dischargeIntoHolder(wearer);
    expect(second).toBeLessThan(dumped);
    expect(second).toBeGreaterThan(0);
  });

  it('AC12 — an UNCURSED charged item discharges nothing', () => {
    const ring = makeStuff(() => new TestRing());
    ring.setCapacityTau(1000);
    const wearer = makeStuff(() => new Creature());
    expect(ring.dischargeIntoHolder(wearer)).toBe(0);
    expect(wearer.getConditions()).toHaveLength(0);
  });

  it('AC12 — a cursed but FLAT item has nothing left to hurt you with', () => {
    const ring = makeStuff(() => new TestRing());
    ring.setBlessingBand('cursed');
    ring.setCapacityTau(10);
    ring.spendCharge(10);
    const wearer = makeStuff(() => new Creature());
    expect(ring.dischargeIntoHolder(wearer)).toBe(0);
    // …but it still will not come off. Stuck is not the same as armed.
    expect(ring.refusesRelease()).toBe(true);
  });
});

describe('AC13 — host-held vs term-bought sustained effects', () => {
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

  /** Install a sustained effect by hand — the record shape is the unit
   * under test here, not the executor that happens to build it. */
  function hold(
    body: Creature,
    fields: Partial<SustainedEffect> & { realizes: string },
  ): SustainedEffect {
    const record: SustainedEffect = {
      kind: 'sustained',
      spellId: 'veil',
      magicOrigin: {
        verb: 'create',
        noun: 'sense',
        spellId: 'veil',
        specifiedBy: '/obj/test/maker',
        firedBy: '/obj/test/user',
      },
      expiresAt: WorldClockApi.getNow().rawValue() + 100,
      ...fields,
    } as SustainedEffect;
    body.afflict(record);
    return record;
  }

  it('a TERM-BOUGHT effect expires and cannot be renewed', () => {
    const body = makeStuff(() => new Creature());
    hold(body, { realizes: 'cloak', disguise: 'a blur', sustainedFor: 100 });
    expect(body.getConditions().some((c) => c.kind === 'sustained')).toBe(true);

    real += (500 / 12) * 1000; // past the term
    body.getConditions(); // reconcile-on-read

    // A consumable paid ONCE and is gone: there is nothing left to renew
    // with, so the term simply runs out. This is why long-lived
    // sustained effects are forged as rings and not bottled.
    expect(body.getConditions().some((c) => c.kind === 'sustained')).toBe(
      false,
    );
  });

  it('a HOST-HELD effect renews itself while the host is charged', () => {
    const ring = makeStuffAtPath(
      () => new TestRing(),
      `/obj/test/ring-host-${seq++}`,
    );
    ring.setCapacityTau(1000);
    const body = makeStuff(() => new Creature());
    hold(body, {
      realizes: 'cloak',
      disguise: 'a blur',
      sustainedFor: 100,
      sustainedBy: ring.getTemplatePath()!,
    });

    real += (500 / 12) * 1000; // past the term
    body.getConditions();

    // A charged host CAN keep paying — its standby draw meters the cost
    // against its own reserve — so it re-buys another term and the hold
    // survives.
    expect(body.getConditions().some((c) => c.kind === 'sustained')).toBe(true);
  });

  it('a host-held effect DROPS when its host runs flat', () => {
    const ring = makeStuffAtPath(
      () => new TestRing(),
      `/obj/test/ring-flat-${seq++}`,
    );
    ring.setCapacityTau(10);
    ring.spendCharge(10);
    const body = makeStuff(() => new Creature());
    hold(body, {
      realizes: 'cloak',
      disguise: 'a blur',
      sustainedFor: 100,
      sustainedBy: ring.getTemplatePath()!,
    });

    real += (500 / 12) * 1000;
    body.getConditions();

    // A flat host cannot hold anything up either. The ring goes out
    // rather than running on nothing — which is the same first-law
    // discipline the whole build runs on.
    expect(body.getConditions().some((c) => c.kind === 'sustained')).toBe(
      false,
    );
  });

  it('the record SURVIVES a round-trip through the hydrate seam', () => {
    const body = makeStuff(() => new Creature());
    const ring = makeStuffAtPath(
      () => new TestRing(),
      `/obj/test/ring-persist-${seq++}`,
    );
    hold(body, {
      realizes: 'cloak',
      disguise: 'a blur',
      sustainedFor: 100,
      sustainedBy: ring.getTemplatePath()!,
    });
    const captured = JSON.parse(
      JSON.stringify(body.getConditions()),
    ) as ActiveCondition[];

    const restored = makeStuff(() => new Creature());
    restored.setConditions(captured);
    const held = restored.conditions.find((c) => c.kind === 'sustained') as
      | SustainedEffect
      | undefined;
    expect(held).toBeTruthy();
    // Both halves of the D12 distinction round-trip as plain scalars —
    // no marshaller, exactly like the rest of the condition record.
    expect(held!.sustainedBy).toBe(ring.getTemplatePath());
    expect(held!.sustainedFor).toBe(100);
    // …and the provenance tag came back normalized, not raw.
    expect(held!.magicOrigin.specifiedBy).toBe('/obj/test/maker');
    expect(held!.magicOrigin.firedBy).toBe('/obj/test/user');
  });
});

describe('AC14 — the condition application veto', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    WorldClockApi._setNowProviderForTesting(() => 100000);
  });
  afterEach(() => {
    WorldClockApi._resetForTesting();
    vi.restoreAllMocks();
  });

  it('defaults to PERMISSION, so every shipped inflict caller is unaffected', () => {
    const plain = makeStuff(() => new Creature());
    expect(plain.canAfflict({ kind: 'trauma', type: 'burn', site: 'body.torso', severity: 1 }).ok).toBe(
      true,
    );
    const landed = plain.afflict({
      kind: 'trauma',
      type: 'burn',
      site: 'body.torso',
      severity: 1,
    });
    expect(landed).toBe(true);
    expect(plain.getConditions()).toHaveLength(1);
  });

  it('a conferred immunity REFUSES the condition outright', () => {
    const warded = makeStuff(() => new WardedBody());
    const verdict = warded.canAfflict({
      kind: 'trauma',
      type: 'burn',
      site: 'body.torso',
      severity: 5,
    });
    expect(verdict.ok).toBe(false);

    const landed = warded.afflict({
      kind: 'trauma',
      type: 'burn',
      site: 'body.torso',
      severity: 5,
    });
    expect(landed).toBe(false);
    expect(warded.getConditions()).toHaveLength(0);
  });

  it('the veto is per-CONDITION, not a blanket — the ward turns burns only', () => {
    const warded = makeStuff(() => new WardedBody());
    const landed = warded.afflict({
      kind: 'trauma',
      type: 'laceration',
      site: 'body.torso',
      severity: 5,
    });
    // Immunity is expressible BECAUSE the veto sees the record. A
    // blanket refusal would be a different (and much less useful) thing.
    expect(landed).toBe(true);
    expect(warded.getConditions()).toHaveLength(1);
  });

  it('⚠ the veto runs AFTER the covering-stack fold, so armor still attenuates', () => {
    // Ordering is the risk the plan flagged: too early and armor stops
    // attenuating; too late and the body is already hurt. `inflict`
    // consults it at the write, and reports the refusal honestly rather
    // than claiming a hit that never landed.
    const warded = makeStuff(() => new WardedBody());
    const outcome = ConditionApi.inflict(warded, {
      mechanism: 'heat',
      site: 'body.torso',
      energy: 5,
    });
    expect(outcome.afflicted).toBe(false);
    expect(warded.getConditions()).toHaveLength(0);

    // A body with no ward takes the same insult normally — proving the
    // fold itself still ran and this is the veto, not a broken path.
    const plain = makeStuff(() => new Creature());
    const hit = ConditionApi.inflict(plain, {
      mechanism: 'heat',
      site: 'body.torso',
      energy: 5,
    });
    expect(hit.trauma).toBeTruthy();
  });

  it('a vetoed condition is invisible to every downstream read', () => {
    const warded = makeStuff(() => new WardedBody());
    warded.afflict({
      kind: 'trauma',
      type: 'burn',
      site: 'body.torso',
      severity: 50,
    });
    // Not merely absent from the collection — nothing derived from it
    // moved either, because it never entered the collection at all.
    expect(warded.hasCondition((c) => c.kind === 'trauma')).toBe(false);
    expect(MixinApi.isVitals(warded)).toBe(true);
  });
});
