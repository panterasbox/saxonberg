/**
 * A heap of ash reads its strength in words (potash D1, AC 12).
 *
 * ⭐ A raked heap's grade IS its strength: the burner writes the alkali
 * share as the heap's composition and the heap re-grades itself. A
 * refined product (black salts, pearl ash) leaves `gradedByStrength` off —
 * its entry is a purity and its grade comes from the chain that made it.
 */
import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, afterEach } from 'vitest';
import Ash from '../thing/Ash';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { makeStuff } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';

const POTASH = '/stuff/idea/material/mineral/potash';

function heap(fraction: number, graded = true): Ash {
  const a = makeStuff(() => new Ash());
  a.setGradedByStrength(graded);
  a.setAlloying([{ materialPath: POTASH, fraction }]);
  return a;
}

describe('a heap of ash', () => {
  afterEach(() => StuffApi.clearAll());

  it('⭐ pine ash is poor and grey; oak fair; beech fine and pale', () => {
    expect(heap(0.08).getGrade().getBand()).toBe('poor');
    expect(heap(0.15).getGrade().getBand()).toBe('fair');
    expect(heap(0.18).getGrade().getBand()).toBe('fine');
    expect(heap(0.08).strengthLine()).toMatch(/grey and gritty/);
    expect(heap(0.18).strengthLine()).toMatch(/strong ash/);
  });

  it('⭐ the strength is read off the heap, and no number reaches the look line', () => {
    for (const f of [0.02, 0.08, 0.15, 0.18, 0.25, 0.6]) {
      const a = heap(f);
      expect(a.strength()).toBeCloseTo(f, 6);
      expect(a.strengthLine()).not.toMatch(/\d/);
    }
  });

  it('a refined product keeps the grade it was given', () => {
    const cake = makeStuff(() => new Ash());
    cake.setGradeBand('poor');
    cake.setAlloying([{ materialPath: POTASH, fraction: 0.65 }]);
    expect(cake.getGrade().getBand()).toBe('poor');
    expect(cake.strengthLine()).toBe('');
    expect(heap(0.65, false).strength()).toBeCloseTo(0.65, 6);
  });
});
