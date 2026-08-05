/**
 * **A coupling may lose energy. It may never mint any.**
 *
 * `recharge` used to move a caster's reserve into a shell at a flat
 * 1:1 on the strength of intent alone — no apparatus, no working, no
 * competence, and a perfect transfer. That last part is the one that
 * mattered: this model is denominated in real joules (1 τ ≡ 1 kJ, a
 * full reserve is about a quarter of a banana) against a conservation
 * law, and a firebolt only delivers 29.9 of the 35.2 τ it spends. A
 * perfect pump was the single free lunch in the system.
 *
 * Efficiency is now `coupling × competence`, and the invariant these
 * tests exist to pin is that **the product is always below 1** — from
 * either factor, from authored content, and from a runtime write.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { StuffApi } from '../../../api/stuff';
import { ShadowApi } from '../../../api/shadow';
import { MixinApi } from '../../../api/mixin';
import { ConduitMixin, COUPLING_GRADES } from '../Conduit';
import Thing from '../../stuff/Thing';
import { makeStuff } from '../../security/__tests__/test-setup';

class Coil extends ConduitMixin(Thing) {}

/** Mirrors `RechargeController.COMPETENCE_EFFICIENCY`. */
const COMPETENCE_EFFICIENCY = [0.4, 0.55, 0.78, 0.86, 0.92];

describe('the coupling', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });

  it('⭐ no coupling × competence pair can reach 1', () => {
    // The conservation invariant, over the whole authored space: every
    // shipped grade against every band. If this ever hits 1.0 somebody
    // has built a perpetual-motion machine out of a wand.
    for (const coupling of Object.values(COUPLING_GRADES)) {
      for (const competence of COMPETENCE_EFFICIENCY) {
        expect(coupling * competence).toBeLessThan(1);
      }
    }
    // …and the ceiling is the bench in an expert's hands.
    const best = COUPLING_GRADES.bench * Math.max(...COMPETENCE_EFFICIENCY);
    expect(best).toBeCloseTo(0.9, 1);
  });

  it('every competence band is itself a LOSS, mastery included', () => {
    // Not `potencyFactor`, which is a bonus ≥ 1 above the required
    // band. Multiplying delivered energy by that would mint joules.
    for (const c of COMPETENCE_EFFICIENCY) expect(c).toBeLessThan(1);
    // Monotone: being better is never worse.
    const sorted = [...COMPETENCE_EFFICIENCY].sort((a, b) => a - b);
    expect(COMPETENCE_EFFICIENCY).toEqual(sorted);
  });

  it('⚠ the setter CLAMPS — content cannot author a free lunch', () => {
    const coil = makeStuff(() => new Coil());
    coil.setCouplingEfficiency(2.5);
    expect(coil.getCouplingEfficiency()).toBe(1);
    coil.setCouplingEfficiency(0.85);
    expect(coil.getCouplingEfficiency()).toBeCloseTo(0.85, 5);
  });

  it('a nonsense value degrades to CRUDE, never to perfect', () => {
    // Fail-closed direction: a typo must cost the player efficiency,
    // not hand them a lossless conduit.
    for (const bad of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      const coil = makeStuff(() => new Coil());
      coil.setCouplingEfficiency(bad as number);
      expect(coil.getCouplingEfficiency()).toBe(COUPLING_GRADES.crude);
    }
  });

  it('defaults to the field grade, not to lossless', () => {
    const coil = makeStuff(() => new Coil());
    expect(coil.getCouplingEfficiency()).toBe(COUPLING_GRADES.field);
    expect(coil.getCouplingEfficiency()).toBeLessThan(1);
  });

  it('narrows through the mixin registry', () => {
    const coil = makeStuff(() => new Coil());
    const plain = makeStuff(() => new Thing());
    expect(MixinApi.isConduit(coil)).toBe(true);
    expect(MixinApi.isConduit(plain)).toBe(false);
  });

  it('the ladder is ordered — a bench beats a field coil beats a scrap', () => {
    expect(COUPLING_GRADES.crude).toBeLessThan(COUPLING_GRADES.field);
    expect(COUPLING_GRADES.field).toBeLessThan(COUPLING_GRADES.bench);
    expect(COUPLING_GRADES.bench).toBeLessThan(1);
  });
});
