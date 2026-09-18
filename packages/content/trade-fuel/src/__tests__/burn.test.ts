/**
 * The burn (metal chain F2) — ⭐⭐ **airflow is the decision, and the
 * failure mode is the point.**
 *
 * Charring is not lighting a fire; it is running a fire that is
 * deliberately starving. The collier's whole job is holding the draught
 * between two ways of losing everything, and the assertions here are that
 * both ways are REAL:
 *
 *  - too much air → **ash**, and a week's cutting is gone;
 *  - too little → **half-burnt brands**, worth a fraction;
 *  - between them → charcoal, and dead centre is the best burn there is.
 *
 * ⚠ It is a THRESHOLD, never a roll. The collier's uncertainty is
 * epistemic: the number was always going to do this, and a collier who
 * learns where the band is gets it right every time. What competence
 * buys is knowing what to set, not being allowed to.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import CharcoalPit, { CHARS_FROM, CHARS_TO } from '../thing/CharcoalPit';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { makeStuff } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';

const PACK = fileURLToPath(new URL('../../', import.meta.url));

function row(rel: string): Record<string, unknown> {
  return YAML.parse(readFileSync(`${PACK}content/${rel}`, 'utf8')) as Record<string, unknown>;
}

function clamp(): CharcoalPit {
  const p = makeStuff(() => new CharcoalPit());
  p.setYieldRatio(0.35);
  return p;
}

describe('the charcoal burn', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    installV1QuantityMarshallers();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('⭐ a well-tended burn yields charcoal at the authored ratio', () => {
    const pit = clamp();
    const centre = (CHARS_FROM + CHARS_TO) / 2;
    pit.setDraught(centre);
    expect(pit.outcomeFor()).toBe('charcoal');
    // Dead centre is full efficiency: 20 lengths × 0.35.
    expect(pit.yieldFor(20)).toBe(7);
  });

  it('⚠ TOO MUCH air yields ash and nothing else — the whole burn is lost', () => {
    const pit = clamp();
    pit.setDraught(CHARS_TO + 0.05);
    expect(pit.outcomeFor()).toBe('ash');
    expect(pit.yieldFor(20)).toBe(0);
  });

  it('⚠ TOO LITTLE yields half-burnt brands — drawn too tight, worth a fraction', () => {
    const pit = clamp();
    pit.setDraught(CHARS_FROM - 0.05);
    expect(pit.outcomeFor()).toBe('brands');
    expect(pit.yieldFor(20)).toBe(0);
  });

  it('⭐ inside the band the yield still VARIES — there is a right answer and a nearly-right one', () => {
    const pit = clamp();
    const centre = (CHARS_FROM + CHARS_TO) / 2;
    pit.setDraught(centre);
    const best = pit.yieldFor(40);
    pit.setDraught(CHARS_FROM + 0.01);
    const edge = pit.yieldFor(40);
    expect(edge).toBeGreaterThan(0);
    expect(edge).toBeLessThan(best);
    // …which is what makes a burn worth WATCHING rather than setting and
    // walking away.
  });

  it('⚠ it is a THRESHOLD, never a roll: a hundred evaluations, one answer', () => {
    const pit = clamp();
    pit.setDraught(0.5);
    const answers = new Set<string>();
    const yields = new Set<number>();
    for (let i = 0; i < 100; i++) {
      answers.add(pit.outcomeFor());
      yields.add(pit.yieldFor(20));
    }
    expect(answers.size).toBe(1);
    expect(yields.size).toBe(1);
  });

  it('the draught is clamped to a fraction — a row cannot author 300% open', () => {
    const pit = clamp();
    pit.setDraught(5);
    expect(pit.getDraught()).toBe(1);
    pit.setDraught(-1);
    expect(pit.getDraught()).toBe(0);
  });

  it('the clamp is a Furnace and a Container — it holds a charge and holds a heat', () => {
    const pit = clamp();
    expect(MixinApi.isFurnace(pit)).toBe(true);
    expect(MixinApi.isContainer(pit)).toBe(true);
  });

  it('⭐ charcoal reaches copper and wood does not — the reason the trade exists', () => {
    const clampRow = row('trade/fuel/thing/clamp.yaml').data as Record<string, number>;
    // Copper melts at 1358 K. Charcoal's burn heat clears it; wood's
    // ~1200 K does not, which is the whole reason a metal age needs a
    // collier standing between the wood and the smelter.
    expect(clampRow.burnTemperatureK).toBeGreaterThan(1358);
  });

  it('⚠ charcoal’s fuel value and ignition read off the MATERIAL, never authored twice', () => {
    const product = row('trade/fuel/thing/charcoal.yaml').data as Record<string, unknown>;
    expect(product._materialPath).toBe('/stuff/idea/material/organic/charcoal');
    // The thing row says WHICH material it is and stops there.
    expect(product).not.toHaveProperty('autoignitionPoint');
    expect(product).not.toHaveProperty('fuelValue');
    const material = row('stuff/idea/material/organic/charcoal.yaml').data as Record<string, unknown>;
    expect(material.autoignitionPoint).toBe(620);
    expect((material.tags as string[])).toContain('fuel');
  });

  it('⭐ the three outcomes all have rows, so a lost burn is a THING you can see', () => {
    for (const rel of [
      'trade/fuel/thing/charcoal.yaml',
      'trade/fuel/thing/brands.yaml',
      'trade/fuel/thing/ash.yaml',
    ]) {
      expect(row(rel).class).toBe('/platform/thing/Provision');
    }
    // …and the two failures are visibly WORSE, not merely different.
    expect((row('trade/fuel/thing/brands.yaml').data as Record<string, string>).gradeBand).toBe('poor');
    expect((row('trade/fuel/thing/ash.yaml').data as Record<string, string>).gradeBand).toBe('poor');
  });
});
