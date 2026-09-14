/**
 * check-presentation's pure decision core — the rules the content sweep
 * is about to run 611 times.
 *
 * The load-bearing test is the **round trip**: strip a row's article,
 * record the register, re-render, and get the identical string back. If
 * that holds for every shipped row then the sweep is invisible, which is
 * the entire acceptance bar for the presentation build. The one row it
 * did not hold for — a venue whose name begins with a capitalized
 * *"The"* — is pinned below, because a case-insensitive article match
 * would have decapitalized it in silence.
 */

import { describe, it, expect } from 'vitest';
import {
  articleFor,
  impliedRegister,
  leadingArticleOf,
  phraseOf,
  renderPhrase,
  stemOf,
  REGISTERS,
  LEADING_ARTICLE_CEILING,
} from '../check-presentation';

describe('articleFor — the vowel rule', () => {
  it('takes "an" before a vowel and "a" otherwise', () => {
    expect(articleFor('apple')).toBe('an');
    expect(articleFor('oaken door')).toBe('an');
    expect(articleFor('heavy door')).toBe('a');
    expect(articleFor('weaver')).toBe('a');
  });

  it('is case-insensitive about the vowel', () => {
    expect(articleFor('Amulet of glowlight')).toBe('an');
  });

  it('ignores leading whitespace', () => {
    expect(articleFor('  iron key')).toBe('an');
  });
});

describe('leadingArticleOf / stemOf', () => {
  it('finds each of the three lowercase articles', () => {
    expect(leadingArticleOf('a sentry')).toBe('a');
    expect(leadingArticleOf('an oaken door')).toBe('an');
    expect(leadingArticleOf('the collier')).toBe('the');
  });

  it('finds none when there is none', () => {
    expect(leadingArticleOf('Odile, the city registrar')).toBeNull();
    expect(leadingArticleOf('Hinkley Lane')).toBeNull();
  });

  it('⚠ does NOT read a CAPITALIZED article as an article', () => {
    // A capitalized article is part of a proper name. Reading this one
    // as definite would re-render it decapitalized.
    expect(leadingArticleOf('The Hearthworks — Back room')).toBeNull();
    expect(stemOf('The Hearthworks — Back room')).toBe('The Hearthworks — Back room');
    expect(impliedRegister('The Hearthworks — Back room')).toBe('proper');
  });

  it('does not mistake a word that merely starts with the letters', () => {
    expect(leadingArticleOf('android sentry')).toBeNull();
    expect(leadingArticleOf('theatre mask')).toBeNull();
  });

  it('strips the article and nothing else', () => {
    expect(stemOf('a lean sellsword with a blade for hire')).toBe(
      'lean sellsword with a blade for hire',
    );
  });
});

describe('impliedRegister', () => {
  it('maps the article to the register', () => {
    expect(impliedRegister('a sentry')).toBe('indefinite');
    expect(impliedRegister('an oaken door')).toBe('indefinite');
    expect(impliedRegister('the collier')).toBe('definite');
    expect(impliedRegister('Hinkley Lane')).toBe('proper');
  });
});

describe('renderPhrase', () => {
  it('renders each register', () => {
    expect(renderPhrase('sentry', 'indefinite')).toBe('a sentry');
    expect(renderPhrase('oaken door', 'indefinite')).toBe('an oaken door');
    expect(renderPhrase('collier', 'definite')).toBe('the collier');
    expect(renderPhrase('Hinkley Lane', 'proper')).toBe('Hinkley Lane');
  });
});

describe('⭐ the round trip — the sweep must be lossless', () => {
  const shipped = [
    'a sentry',
    'an oaken door',
    'the collier',
    'a lean sellsword with a blade for hire',
    'the Ferrow diggings',
    'Odile, the city registrar',
    'Hinkley Lane',
    'The Hearthworks — Back room',
    'a weaver with a shuttle in one hand and a tally in the other',
    'an ox in harness',
    'the Goodkin counter',
    'sodden peat ground',
  ];

  it.each(shipped)('"%s" survives strip → register → render', (text) => {
    expect(renderPhrase(stemOf(text), impliedRegister(text))).toBe(text);
  });
});

describe('phraseOf — one extractor, both sides of the sweep', () => {
  it('reads the article when the row has not been swept', () => {
    expect(phraseOf('a sentry', undefined)).toEqual({
      stem: 'sentry',
      register: 'indefinite',
    });
  });

  it('reads the field once the row has been swept', () => {
    expect(phraseOf('sentry', 'indefinite')).toEqual({
      stem: 'sentry',
      register: 'indefinite',
    });
  });

  it('⭐ both sides render the same string — which is what proves the codemod', () => {
    const before = phraseOf('the collier', undefined);
    const after = phraseOf('collier', 'definite');
    expect(renderPhrase(before.stem, before.register)).toBe(
      renderPhrase(after.stem, after.register),
    );
  });

  it('ignores a register that is not one of the three', () => {
    // Clause (b) is what reports it; the extractor must not trust it.
    expect(phraseOf('a sentry', 'PROPER')).toEqual({
      stem: 'sentry',
      register: 'indefinite',
    });
  });
});

describe('the vocabularies', () => {
  it('the register vocabulary is closed at three', () => {
    expect([...REGISTERS]).toEqual(['proper', 'definite', 'indefinite']);
  });

  it('⚠ the ratchet may only ever fall', () => {
    // Pinned so that raising the ceiling to make a new row pass is a
    // visible test edit rather than a one-character diff in the gate.
    expect(LEADING_ARTICLE_CEILING).toBeLessThanOrEqual(611);
  });
});
