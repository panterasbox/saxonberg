/**
 * Blood.blend — pouring one unit into another (blood build D4). Equal
 * labelled type is kept; anything else becomes `mixed`, which is
 * compatible with nobody (the anti-laundering rule).
 */

import { describe, it, expect } from 'vitest';
import { Blood } from '../Blood';
import type { BloodUnit } from '../Blood';

const S = '/stuff/idea/species/test/human';
const unit = (
  type: BloodUnit['type'],
  labelled = true,
  speciesPath = S,
  system?: string,
): BloodUnit => ({
  speciesPath,
  system,
  type,
  labelled,
  donorIdentityPath: '/who/' + type,
});

describe('Blood.blend', () => {
  it('same type + both labelled → kept, labelled', () => {
    const out = new Blood(unit('A')).blend(unit('A'));
    expect(out.type).toBe('A');
    expect(out.labelled).toBe(true);
  });

  it('same type but one unlabelled → kept type, unlabelled', () => {
    const out = new Blood(unit('A', true)).blend(unit('A', false));
    expect(out.type).toBe('A');
    expect(out.labelled).toBe(false);
  });

  it('different ABO → mixed, unlabelled', () => {
    const out = new Blood(unit('A')).blend(unit('B'));
    expect(out.type).toBe('mixed');
    expect(out.labelled).toBe(false);
  });

  it('different species with no declared system → mixed (own-path fallback)', () => {
    const out = new Blood(unit('O')).blend(unit('O', true, '/x/wolf'));
    expect(out.type).toBe('mixed');
  });

  it('⭐ different species sharing a system + same ABO → kept (D3)', () => {
    const human = unit('O', true, '/x/human', 'hominid');
    const dwarf = unit('O', true, '/x/dwarf', 'hominid');
    const out = new Blood(human).blend(dwarf);
    expect(out.type).toBe('O');
    expect(out.labelled).toBe(true);
  });

  it('different systems → mixed even when ABO matches', () => {
    const human = unit('O', true, '/x/human', 'hominid');
    const elf = unit('O', true, '/x/elf', 'fae');
    expect(new Blood(human).blend(elf).type).toBe('mixed');
  });

  it('mixed poured into anything stays mixed', () => {
    expect(new Blood(unit('mixed')).blend(unit('A')).type).toBe('mixed');
  });
});
