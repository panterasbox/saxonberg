/**
 * NounPhrase — the render matrix.
 *
 * The load-bearing claim is `render()`: it is what `getPresentation()`
 * answers, and the 635-row golden holds it to the byte. Everything else
 * here is the grammar the old string form made impossible to ask for —
 * *the collie*, *two collies*, *the collie's paw*.
 */

import '../../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import {
  NounPhrase,
  PRESENTATION_FORMS,
  REGISTERS,
  isPresentationForm,
  isRegister,
} from '../NounPhrase';

describe('render — the shipped string', () => {
  it('indefinite takes a or an by vowel', () => {
    expect(NounPhrase.of('sentry', 'indefinite').render()).toBe('a sentry');
    expect(NounPhrase.of('oaken door', 'indefinite').render()).toBe('an oaken door');
  });

  it('definite takes the', () => {
    expect(NounPhrase.of('collier', 'definite').render()).toBe('the collier');
    expect(NounPhrase.of('oaken door', 'definite').render()).toBe('the oaken door');
  });

  it('proper takes nothing', () => {
    expect(NounPhrase.proper('Odile').render()).toBe('Odile');
    expect(NounPhrase.proper('The Hearthworks — Back room').render()).toBe(
      'The Hearthworks — Back room',
    );
  });

  it('indefinite is the default register', () => {
    expect(NounPhrase.of('sentry').render()).toBe('a sentry');
  });

  it('trims the stem', () => {
    expect(NounPhrase.of('  sentry  ').render()).toBe('a sentry');
  });
});

describe('⭐ a count other than 1 drops the article', () => {
  it('renders the count and the plural', () => {
    expect(NounPhrase.of('apple').withCount(4).render()).toBe('4 apples');
  });

  it('takes an authored plural over the naive one', () => {
    expect(NounPhrase.of('piece').withCount(4, '5-zorkmid pieces').render()).toBe(
      '4 5-zorkmid pieces',
    );
  });

  it('⚠ the old string form rendered "4 a red apples"', () => {
    // The article used to live INSIDE the description, so every counted
    // host had to opt out of it by hand. It cannot happen now: the stem
    // carries no article and the count branch never adds one.
    const stacked = NounPhrase.of('red apple', 'indefinite').withCount(4);
    expect(stacked.render()).toBe('4 red apples');
    expect(stacked.render()).not.toMatch(/\ba\b/);
  });

  it('a count of 1 renders as the register says', () => {
    expect(NounPhrase.of('apple').withCount(1).render()).toBe('an apple');
  });

  it('a count of 0 is a count, not a singular', () => {
    expect(NounPhrase.of('apple').withCount(0).render()).toBe('0 apples');
  });
});

describe('the forms the string could not express', () => {
  it('definite() says "the collie" whatever the register', () => {
    expect(NounPhrase.of('collie', 'indefinite').definite()).toBe('the collie');
    expect(NounPhrase.of('collie', 'definite').definite()).toBe('the collie');
  });

  it('a proper name is already definite', () => {
    expect(NounPhrase.proper('Odile').definite()).toBe('Odile');
    expect(NounPhrase.proper('Odile').indefinite()).toBe('Odile');
  });

  it('indefinite() says "a collie" whatever the register', () => {
    expect(NounPhrase.of('collie', 'definite').indefinite()).toBe('a collie');
  });

  it('bare() is the noun alone', () => {
    expect(NounPhrase.of('collie', 'definite').bare()).toBe('collie');
  });

  it('possessive() attaches to the rendered form', () => {
    expect(NounPhrase.of('collie', 'definite').possessive()).toBe("the collie's");
    expect(NounPhrase.proper('Odile').possessive()).toBe("Odile's");
  });

  it("a plural possessive takes the bare apostrophe", () => {
    expect(NounPhrase.of('collie').withCount(2).possessive()).toBe("2 collies'");
  });

  it('a name already ending in s takes the bare apostrophe', () => {
    expect(NounPhrase.proper('Gus').possessive()).toBe("Gus'");
  });
});

describe('article()', () => {
  it('answers the article the register implies', () => {
    expect(NounPhrase.of('sentry', 'indefinite').article()).toBe('a');
    expect(NounPhrase.of('oaken door', 'indefinite').article()).toBe('an');
    expect(NounPhrase.of('collier', 'definite').article()).toBe('the');
    expect(NounPhrase.proper('Odile').article()).toBe('');
  });

  it('⚠ the old helper answered "an" for "a heavy door"', () => {
    // It read the article off the RENDERED string and found a vowel at
    // the front of the article somebody had already typed. A phrase
    // knows its own register, so it cannot make that mistake.
    expect(NounPhrase.of('heavy door', 'indefinite').article()).toBe('a');
  });
});

describe('withRegister', () => {
  it('changes the register and keeps the stem and count', () => {
    const p = NounPhrase.of('collie').withCount(3).withRegister('definite');
    expect(p.stem).toBe('collie');
    expect(p.count).toBe(3);
    expect(p.register).toBe('definite');
  });
});

describe("⚠ getLong's fallback renders the phrase, it does not leak the field", () => {
  // The live drive caught this one: with no long description, `look`
  // printed the raw stem — "brass altimeter" where a player had always
  // read "a brass altimeter". Nothing else could see it. The golden
  // reads YAML and never renders a body; no unit test asserted the
  // fallback; the suite was fully green.
  it('is pinned here because the suite could not see it', async () => {
    const { VisibleMixin } = await import('../Visible');
    const { Idea } = await import('../../stuff/Idea');
    const { makeStuff } = await import('../../security/__tests__/test-setup');
    class Described extends VisibleMixin(Idea) {}

    const o = makeStuff(() => new Described());
    o.setShortDescription('brass altimeter');
    expect(o.getLong()).toBe('a brass altimeter');

    o.setRegister('definite');
    expect(o.getLong()).toBe('the brass altimeter');

    o.setLongDescription('A dial in a brass case.');
    expect(o.getLong()).toBe('A dial in a brass case.');
  });

  it('still says "You see nothing special." with neither', async () => {
    const { VisibleMixin } = await import('../Visible');
    const { Idea } = await import('../../stuff/Idea');
    const { makeStuff } = await import('../../security/__tests__/test-setup');
    class Described extends VisibleMixin(Idea) {}
    expect(makeStuff(() => new Described()).getLong()).toBe(
      'You see nothing special.',
    );
  });
});

describe('the closed vocabularies', () => {
  it('there are exactly three registers', () => {
    expect([...REGISTERS]).toEqual(['proper', 'definite', 'indefinite']);
  });

  it('there are exactly six forms', () => {
    expect([...PRESENTATION_FORMS]).toEqual([
      'bare',
      'handle',
      'concise',
      'presence',
      'distinguishing',
      'formal',
    ]);
  });

  it('the guards refuse anything else', () => {
    expect(isRegister('definite')).toBe(true);
    expect(isRegister('DEFINITE')).toBe(false);
    expect(isRegister('mass')).toBe(false);
    expect(isPresentationForm('presence')).toBe(true);
    expect(isPresentationForm('loud')).toBe(false);
  });
});
