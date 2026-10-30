/**
 * ⭐ A form is five classes × a capacity × a proportion (ceramics S4): words
 * are rows, sizes are parametric, and a word nobody knows is refused naming
 * the classes — never bound silently.
 */

import { describe, it, expect } from 'vitest';
import { FormGrammar, ParsedForm, type FormWord } from '../FormSpec';

const word = (key: string, formClass: FormWord['formClass'], capacityL: number, extra: Partial<FormWord> = {}): FormWord => ({
  key,
  formClass,
  capacityL,
  proportion: null,
  product: `/trade/ceramics/thing/${key}`,
  seats: [],
  greenScale: 1,
  discipline: 'pottery',
  ...extra,
});

const g = new FormGrammar([
  word('mug', 'open', 0.3, { seats: ['handle'] }),
  word('jug', 'closed', 1.7, { proportion: 'tall', seats: ['handle'] }),
  word('jar', 'closed', 2),
  word('brick', 'block', 0, { discipline: 'brickmaking', greenScale: 1.08 }),
]);

describe('the form grammar', () => {
  it('a word is its row', () => {
    const f = g.parse('mug') as ParsedForm;
    expect(f).toBeInstanceOf(ParsedForm);
    expect(f.formClass).toBe('open');
    expect(f.capacityL).toBeCloseTo(0.3);
    expect(f.word?.seats).toEqual(['handle']);
  });

  it('⭐ `tall jug holding 3 pints` — a proportion and a capacity on a word', () => {
    const f = g.parse('tall jug holding 3 pints') as ParsedForm;
    expect(f.formClass).toBe('closed');
    expect(f.proportion).toBe('tall');
    expect(f.capacityL).toBeCloseTo(3 * 0.568, 3);
  });

  it('`jar holding 2 gallons`', () => {
    const f = g.parse('a jar holding 2 gallons') as ParsedForm;
    expect(f.capacityL).toBeCloseTo(2 * 4.546, 3);
  });

  it('a bare class with a capacity is a form too — the potter names it after', () => {
    const f = g.parse('squat open vessel holding 2 litres') as ParsedForm;
    expect(f.formClass).toBe('open');
    expect(f.proportion).toBe('squat');
    expect(f.word).toBeNull();
    expect(f.describe()).toBe('squat open vessel holding 3.5 pints');
  });

  it('⚠ a word it does not know is REFUSED, naming the classes', () => {
    const r = g.parse('teapot');
    expect(r).not.toBeInstanceOf(ParsedForm);
    expect((r as { reason: string }).reason).toBe('unknown-form');
    expect((r as { line: string }).line).toMatch(/open vessel.*closed vessel.*block.*cone/);
  });

  it('a class with no size is asked how big', () => {
    expect((g.parse('open vessel') as { reason: string }).reason).toBe('bad-capacity');
    expect((g.parse('mug holding 3 furlongs') as { reason: string }).reason).toBe('bad-capacity');
  });

  it('a heavier hand makes a heavier pot: the wall grows with the surface', () => {
    const mug = g.parse('mug') as ParsedForm;
    const jar = g.parse('jar holding 2 gallons') as ParsedForm;
    expect(jar.nominalMassKg()).toBeGreaterThan(mug.nominalMassKg() * 5);
  });

  it('an instrument phrase the binder left on the form is not the form', () => {
    expect((g.parse('mug on wheel') as ParsedForm).word?.key).toBe('mug');
  });
});
