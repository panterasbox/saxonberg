/**
 * check-condition-arms — the shapes the census must COUNT and the shapes
 * it must IGNORE (the shipped-broken-gate clause: a gate proven only by
 * staying green may have silently stopped matching; assert it FIRES).
 *
 * ⚠ The must-not-fire half is not hypothetical. The first cut of this
 * gate counted `MagicLogic.execRelieve` (the dispel selection) and
 * `AssessController.execute` (the readout) as arms — both genuinely
 * discriminate the condition collection and iterate it, and neither
 * advances any state. That is what the progression test exists for.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { armsIn } from '../check-condition-arms';

const FIXTURE = fileURLToPath(
  new URL('../__fixtures__/condition-arm-shapes.ts.txt', import.meta.url),
);

function names(): string[] {
  const src = readFileSync(FIXTURE, 'utf8');
  return armsIn('fixture/Fixture.ts', src).map((a) => `${a.fn}:${a.name}`);
}

describe('check-condition-arms fixture shapes', () => {
  it('counts a discriminated subset iterated inside a reconcile*', () => {
    expect(names()).toContain('reconcileAlpha:alphas');
    expect(names()).toContain('reconcileBeta:betas');
  });

  it('counts a subset outside reconcile* when the loop advances over time', () => {
    expect(names()).toContain('stepGamma:gammas');
  });

  it('counts an inline time-advancing loop with no bound subset', () => {
    expect(names().some((n) => n.startsWith('stepDelta:'))).toBe(true);
  });

  it('IGNORES a dispel-style selection that advances nothing', () => {
    expect(names().some((n) => n.startsWith('execRelieve:'))).toBe(false);
  });

  it('IGNORES an assess-style readout', () => {
    expect(names().some((n) => n.startsWith('readout:'))).toBe(false);
  });

  it('IGNORES a lookup helper and a bulk clear', () => {
    expect(names().some((n) => n.startsWith('findAffliction:'))).toBe(false);
    expect(names().some((n) => n.startsWith('clearAll:'))).toBe(false);
  });

  it('finds exactly the four arm shapes and nothing else', () => {
    expect(names()).toHaveLength(4);
  });
});
