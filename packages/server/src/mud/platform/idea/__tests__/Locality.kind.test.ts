/**
 * A Locality's kind is DERIVED from its address depth, and it may withhold
 * what a first visit teaches (navigation-server D3).
 */

import '../../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import Locality from '../Locality';
import { makeStuff } from '../../../lib/security/__tests__/test-setup';

function locality(address: string): Locality {
  const l = makeStuff(() => new Locality());
  l.setAddress(address);
  return l;
}

describe('Locality kind and what it teaches', () => {
  it('depth 1 a realm, 2 a settlement, 3+ a district', () => {
    expect(locality('terminus').getKind()).toBe('realm');
    expect(locality('terminus/city').getKind()).toBe('settlement');
    expect(locality('terminus/city/campus').getKind()).toBe('district');
    expect(locality('a/b/c/d').getKind()).toBe('district');
  });

  it('teaches government and kind by default, and may withhold either', () => {
    const l = locality('terminus');
    expect(l.getLearnable()).toEqual(['government', 'kind']);
    l.setLearnable(['kind', 'secrets']);
    expect(l.getLearnable()).toEqual(['kind']);
  });
});
