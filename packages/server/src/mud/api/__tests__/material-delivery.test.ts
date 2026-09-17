/**
 * ⭐⭐ **Material enters the blow**, and the preview and the fight agree.
 *
 * `MaterialApi.materialScale` has always priced what a blow lands ON —
 * the covering stack reads it on every attenuation — and
 * `previewBandImpl` has always folded it for weapons too, so `analyze
 * response` was already telling players that a bronze blade is worse
 * than a steel one. The FIGHT was not reading it, so it was not true: a
 * bronze sword and a steel sword of equal grade and condition delivered
 * identically, and the instrument and the exchange disagreed.
 *
 * ⚠ The asymmetry was deliberate and is now retired. It was defensible
 * while every shipped weapon was steel and material was decoration; it
 * is not defensible in a game whose metal chain exists so that WHICH
 * METAL YOU MADE is a decision worth making.
 *
 * ⭐ **Steel is the reference**, which is what makes the change safe:
 * `materialScale(steel) === 1` on every channel, so every shipped gym
 * matchup is byte-identical and only non-steel implements move. The gym
 * was run either side of the fold and its results are unchanged.
 */

import '../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MaterialApi } from '../material';
import { StuffApi } from '../stuff';
import Material from '../../lib/material/Material';
import { Quantity } from '../../lib/quantity';
import { makeStuff } from '../../lib/security/__tests__/test-setup';
import type { Channel } from '../../lib/material/Channel';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

/** A Material with just the mechanical props the height function reads. */
function mkMat(hardness: number, toughness: number): Material {
  const m = makeStuff(() => new Material());
  m.setHardness(Quantity.of(hardness, 'MPa'));
  m.setToughness(Quantity.of(toughness, 'MJ/m³'));
  return m;
}

// The shipped magnitudes, as the base-library authors them.
const steel = () => mkMat(600, 200);
const iron = () => mkMat(350, 120);
const bronze = () => mkMat(250, 90);
const copper = () => mkMat(150, 110);
const castIron = () => mkMat(700, 15);
const CHANNELS: readonly Channel[] = ['edge', 'point', 'blunt'];

describe('the material a weapon is made of', () => {
  beforeEach(() => StuffApi.clearAll());
  afterEach(() => StuffApi.clearAll());

  it('⭐⭐ STEEL IS THE REFERENCE — exactly 1.0 on every channel', () => {
    // This is the whole reason the fold is safe to land: every weapon
    // the gym benches is steel, so nothing shipped moved. Asserted, not
    // assumed.
    for (const channel of CHANNELS) {
      expect(MaterialApi.materialScale(steel(), channel), channel).toBeCloseTo(1, 9);
    }
  });

  it('⭐⭐ an iron blade is honestly worse than a steel one, and by how much', () => {
    const ironEdge = MaterialApi.materialScale(iron(), 'edge');
    const steelEdge = MaterialApi.materialScale(steel(), 'edge');
    expect(ironEdge).toBeLessThan(steelEdge);
    // ⭐ The requirement the whole build exists for, as a number: iron
    // delivers about 83 % of steel on an edge. Enough to feel, not
    // enough to make an iron sword a joke — which is right, because
    // people fought with iron swords for a thousand years.
    expect(ironEdge / steelEdge).toBeCloseTo(0.833, 2);
  });

  it('⭐ …and the ladder runs the way the metallurgy says it does', () => {
    const edge = (m: Material): number => MaterialApi.materialScale(m, 'edge');
    // Steel over iron over bronze over copper: the chain's own order,
    // falling out of hardness against the reference and nothing else.
    expect(edge(steel())).toBeGreaterThan(edge(iron()));
    expect(edge(iron())).toBeGreaterThan(edge(bronze()));
    expect(edge(bronze())).toBeGreaterThan(edge(copper()));
  });

  it('⚠ cast iron takes a fine EDGE and is useless everywhere else', () => {
    // ⭐ The honest shape of brittleness in two numbers, and it is why
    // the refusal to forge a pig is a refusal about WORKING it rather
    // than about how it would perform. Hardness is not the whole of a
    // weapon.
    expect(MaterialApi.materialScale(castIron(), 'edge'))
      .toBeGreaterThan(MaterialApi.materialScale(steel(), 'edge'));
    expect(MaterialApi.materialScale(castIron(), 'blunt'))
      .toBeLessThan(MaterialApi.materialScale(steel(), 'blunt'));
  });

  it('⚠⚠ a NULL material is zero here — and the delivery fold must not use it', () => {
    /*
     * ⭐⭐ **The same number means two different things on the two sides
     * of a blow, and conflating them cost a real regression.**
     *
     * On the COVERING side a null material is *no covering*, and no
     * covering protects nothing — so zero is exactly right, and that is
     * what this function has always returned.
     *
     * On the DELIVERY side the weapon is PRESENT; what is missing is
     * our knowledge of what it is made of. Scaling by zero there lets
     * one unauthored content field silently delete combat, which is
     * what happened: two fixture blades in `CombatLogic.hooks` carry no
     * material and stopped drawing blood at all the moment the fold
     * landed. `instrumentDeliveryScale` therefore GUARDS the null and
     * leaves the scale neutral — which also makes the fold's blast
     * radius the smallest honest one, because before it material was
     * ignored entirely.
     */
    for (const channel of CHANNELS) {
      expect(MaterialApi.materialScale(null, channel), channel).toBe(0);
    }
  });

  it('⭐⭐ the fight reads the SAME formula the preview does, not a copy of it', () => {
    /*
     * ⚠ The asymmetry was not really "combat ignores material" — it was
     * TWO FORMULAS that were allowed to disagree, and one of them was
     * what the player was shown. So the check that matters is structural:
     * the engine must call this method rather than re-deriving a height
     * of its own, because a second derivation is a second thing to keep
     * in step and nothing would notice when it stopped being.
     *
     * A source read, the `title.test.ts` idiom: it asserts a shape a
     * reviewer can check by reading.
     */
    const engine = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'platform', 'idea', 'api', 'CombatLogic.ts'),
      'utf8',
    );
    expect(engine).toMatch(/MaterialApi\.materialScale\(/);
    // …and the docblock that named the asymmetry is gone with it.
    expect(engine).not.toMatch(/Material \*height\* stays analyze-only/);
    // ⚠ …and the null guard is there, because without it an unauthored
    // material scales the blow to nothing. See the case above.
    expect(engine).toMatch(/if \(metal\) scale \*= MaterialApi\.materialScale/);
  });
});
