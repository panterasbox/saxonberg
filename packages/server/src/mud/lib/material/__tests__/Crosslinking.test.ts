/**
 * ⭐⭐ The cure's curve, printed — the table a reviewer reads (rubber
 * build, D9). Sulfur fraction × temperature × time decides which of four
 * materials comes out, and how good a cure is.
 */

import { describe, it, expect } from 'vitest';
import { Crosslinking, type CrosslinkSpec } from '../Crosslinking';

const SPEC: CrosslinkSpec = {
  agent: 'sulfur',
  referenceK: 418,
  zK: 12,
  fullDoseS: 1800,
  agentOptimum: 0.03,
  agentOver: 0.2,
  scorchAboveK: 455,
  products: {
    under: '/stuff/idea/material/organic/raw-rubber',
    cured: '/stuff/idea/material/organic/rubber',
    over: '/stuff/idea/material/organic/ebonite',
    scorched: '/stuff/idea/material/organic/rubber-scorched',
  },
};

const cure = new Crosslinking(SPEC);

describe('the cure', () => {
  it('prints the curve', () => {
    const rows: string[] = [];
    for (const agent of [0.01, 0.02, 0.03, 0.05, 0.1, 0.25]) {
      for (const heldK of [400, 418, 440, 470]) {
        for (const holdS of [600, 1800, 3600, 7200]) {
          const o = cure.outcome({ agentFraction: agent, heldK, holdS });
          rows.push(
            `${(agent * 100).toFixed(0).padStart(3)}% S  ${heldK} K  ${String(holdS).padStart(5)} s  →  ` +
              `${o.kind.padEnd(8)} ${o.grade.getBand().padEnd(6)} degree ${o.degree.toFixed(2)}`,
          );
        }
      }
    }
    console.log(`\nthe cure:\n${rows.join('\n')}`);
    expect(rows.length).toBe(96);
  });

  it('3 % sulfur at 418 K for 30 minutes → rubber, fine', () => {
    const o = cure.outcome({ agentFraction: 0.03, heldK: 418, holdS: 1800 });
    expect(o.kind).toBe('cured');
    expect(o.materialPath).toBe(SPEC.products.cured);
    expect(o.grade.getBand()).toBe('fine');
  });

  it('1 % for ten minutes → under-cured: it stays raw rubber, weeping', () => {
    const o = cure.outcome({ agentFraction: 0.01, heldK: 418, holdS: 600 });
    expect(o.kind).toBe('under');
    expect(o.materialPath).toBe(SPEC.products.under);
  });

  it('25 % for an hour → ebonite', () => {
    const o = cure.outcome({ agentFraction: 0.25, heldK: 418, holdS: 3600 });
    expect(o.kind).toBe('over');
    expect(o.materialPath).toBe(SPEC.products.over);
  });

  it('the good charge held too hot → scorched, and graded poor', () => {
    const o = cure.outcome({ agentFraction: 0.03, heldK: 470, holdS: 1800 });
    expect(o.kind).toBe('scorched');
    expect(o.grade.getBand()).toBe('poor');
  });

  it('heat buys time: ten minutes twelve degrees hotter is a full cure', () => {
    const o = cure.outcome({ agentFraction: 0.03, heldK: 430, holdS: 180 });
    expect(o.kind).toBe('cured');
  });

  it('a spec that cannot be evaluated is refused at the row', () => {
    expect(() => new Crosslinking({ ...SPEC, zK: 0 })).toThrow(RangeError);
    expect(() => new Crosslinking({ ...SPEC, agentOver: 0.01 })).toThrow(RangeError);
    expect(() => new Crosslinking({ ...SPEC, agent: '' })).toThrow(RangeError);
  });
});
