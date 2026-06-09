import { describe, it, expect } from 'vitest';
import { Pronouns } from '@saxonberg/types';
import { GrammarApi } from '../grammar';
import { Stuff } from '../../lib/stuff/Stuff';
import { NamedMixin } from '../../lib/description/Named';
import { VisibleMixin } from '../../lib/description/Visible';
import { GenderedMixin } from '../../lib/character/Gendered';
import { makeStuff } from '../../lib/security/__tests__/test-setup';
import { Idea } from "../../lib/stuff/Idea";

class Plain extends Idea {}
class NamedThing extends NamedMixin(Idea) {}
class VisibleThing extends VisibleMixin(Idea) {}
class GenderedThing extends GenderedMixin(Idea) {}

describe('GrammarApi.cap', () => {
  it('capitalizes the first letter', () => {
    expect(GrammarApi.cap('alice')).toBe('Alice');
  });

  it('leaves an already-capitalized leader alone', () => {
    expect(GrammarApi.cap('Alice')).toBe('Alice');
  });

  it('returns empty input unchanged', () => {
    expect(GrammarApi.cap('')).toBe('');
  });

  it('does not touch the rest of the string', () => {
    expect(GrammarApi.cap('alice in wonderland')).toBe('Alice in wonderland');
  });
});

describe('GrammarApi.pronoun', () => {
  it('defaults to neuter for stuff without GenderedMixin', () => {
    const obj = makeStuff(() => new Plain());
    expect(GrammarApi.pronoun(obj, 'subj')).toBe('it');
    expect(GrammarApi.pronoun(obj, 'obj')).toBe('it');
    expect(GrammarApi.pronoun(obj, 'poss')).toBe('its');
    expect(GrammarApi.pronoun(obj, 'reflex')).toBe('itself');
  });

  it("defaults the kind argument to 'subj'", () => {
    const obj = makeStuff(() => new Plain());
    expect(GrammarApi.pronoun(obj)).toBe('it');
  });

  it('reads Pronouns.She on a Gendered stuff', () => {
    const obj = makeStuff(() => new GenderedThing());
    obj.setPronouns(Pronouns.She);
    expect(GrammarApi.pronoun(obj, 'subj')).toBe('she');
    expect(GrammarApi.pronoun(obj, 'obj')).toBe('her');
    expect(GrammarApi.pronoun(obj, 'poss')).toBe('her');
    expect(GrammarApi.pronoun(obj, 'reflex')).toBe('herself');
  });

  it('reads Pronouns.He on a Gendered stuff', () => {
    const obj = makeStuff(() => new GenderedThing());
    obj.setPronouns(Pronouns.He);
    expect(GrammarApi.pronoun(obj, 'subj')).toBe('he');
    expect(GrammarApi.pronoun(obj, 'obj')).toBe('him');
    expect(GrammarApi.pronoun(obj, 'poss')).toBe('his');
    expect(GrammarApi.pronoun(obj, 'reflex')).toBe('himself');
  });

  it('reads Pronouns.They on a Gendered stuff', () => {
    const obj = makeStuff(() => new GenderedThing());
    obj.setPronouns(Pronouns.They);
    expect(GrammarApi.pronoun(obj, 'subj')).toBe('they');
    expect(GrammarApi.pronoun(obj, 'reflex')).toBe('themselves');
  });
});

describe('GrammarApi.possessive', () => {
  it('aliases pronoun(stuff, "poss")', () => {
    const plain = makeStuff(() => new Plain());
    expect(GrammarApi.possessive(plain)).toBe('its');

    const gendered = makeStuff(() => new GenderedThing());
    gendered.setPronouns(Pronouns.She);
    expect(GrammarApi.possessive(gendered)).toBe('her');
  });
});

describe('GrammarApi.article', () => {
  it("returns 'a' for consonant-onset names", () => {
    const obj = makeStuff(() => new NamedThing());
    obj.setName('sword');
    expect(GrammarApi.article(obj)).toBe('a');
  });

  it("returns 'an' for vowel-onset names", () => {
    const obj = makeStuff(() => new NamedThing());
    obj.setName('axe');
    expect(GrammarApi.article(obj)).toBe('an');
  });

  it('handles uppercase first letters', () => {
    const obj = makeStuff(() => new NamedThing());
    obj.setName('Onyx amulet');
    expect(GrammarApi.article(obj)).toBe('an');
  });

  it("falls back to 'a' when there's no display name", () => {
    const obj = makeStuff(() => new Plain());
    expect(GrammarApi.article(obj)).toBe('a');
  });

  it('uses Visible.shortDescription when no proper name is set', () => {
    const obj = makeStuff(() => new VisibleThing());
    obj.setShortDescription('orcish blade');
    expect(GrammarApi.article(obj)).toBe('an');
  });
});

describe('GrammarApi input-side lexicon', () => {
  it('exposes ARTICLES with the expected entries', () => {
    expect(GrammarApi.ARTICLES.has('the')).toBe(true);
    expect(GrammarApi.ARTICLES.has('a')).toBe(true);
    expect(GrammarApi.ARTICLES.has('an')).toBe(true);
    expect(GrammarApi.ARTICLES.has('THE')).toBe(false);
    expect(GrammarApi.ARTICLES.size).toBe(3);
  });

  it('exposes ORDINAL_WORDS mapping first..tenth + last', () => {
    expect(GrammarApi.ORDINAL_WORDS.get('first')).toBe(1);
    expect(GrammarApi.ORDINAL_WORDS.get('second')).toBe(2);
    expect(GrammarApi.ORDINAL_WORDS.get('tenth')).toBe(10);
    expect(GrammarApi.ORDINAL_WORDS.get('last')).toBe(-1);
    expect(GrammarApi.ORDINAL_WORDS.size).toBe(11);
  });

  it('exposes ORDINAL_NUMERIC matching Nst/Nnd/Nrd/Nth', () => {
    expect(GrammarApi.ORDINAL_NUMERIC.test('1st')).toBe(true);
    expect(GrammarApi.ORDINAL_NUMERIC.test('2nd')).toBe(true);
    expect(GrammarApi.ORDINAL_NUMERIC.test('3rd')).toBe(true);
    expect(GrammarApi.ORDINAL_NUMERIC.test('100th')).toBe(true);
    expect(GrammarApi.ORDINAL_NUMERIC.test('5')).toBe(false);
    expect(GrammarApi.ORDINAL_NUMERIC.test('first')).toBe(false);
  });

  it('captures the integer in group 1', () => {
    const m = GrammarApi.ORDINAL_NUMERIC.exec('42nd');
    expect(m?.[1]).toBe('42');
  });
});

describe('GrammarApi.joinList', () => {
  it('returns "" for an empty list', () => {
    expect(GrammarApi.joinList([])).toBe('');
  });
  it('returns the single item as-is', () => {
    expect(GrammarApi.joinList(['Iffy'])).toBe('Iffy');
  });
  it('joins two items with " and " — no comma', () => {
    expect(GrammarApi.joinList(['Iffy', 'Bobalu'])).toBe('Iffy and Bobalu');
  });
  it('uses serial (Oxford) comma for three or more', () => {
    expect(GrammarApi.joinList(['Iffy', 'Bobalu', 'Jane'])).toBe(
      'Iffy, Bobalu, and Jane',
    );
  });
  it('handles four items with serial comma', () => {
    expect(
      GrammarApi.joinList(['Iffy', 'Bobalu', 'Jane', 'Charlie']),
    ).toBe('Iffy, Bobalu, Jane, and Charlie');
  });
});
