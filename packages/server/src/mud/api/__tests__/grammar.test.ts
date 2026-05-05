import { describe, it, expect } from 'vitest';
import { Pronouns } from '@saxonberg/types';
import { GrammarApi } from '../grammar';
import { Stuff } from '../../lib/stuff/Stuff';
import { NamedMixin } from '../../lib/description/Named';
import { VisibleMixin } from '../../lib/description/Visible';
import { GenderedMixin } from '../../lib/character/Gendered';
import { makeStuff } from '../../lib/security/__tests__/test-setup';

class Plain extends Stuff {}
class NamedThing extends NamedMixin(Stuff) {}
class VisibleThing extends VisibleMixin(Stuff) {}
class GenderedThing extends GenderedMixin(Stuff) {}

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
    obj.pronouns = Pronouns.She;
    expect(GrammarApi.pronoun(obj, 'subj')).toBe('she');
    expect(GrammarApi.pronoun(obj, 'obj')).toBe('her');
    expect(GrammarApi.pronoun(obj, 'poss')).toBe('her');
    expect(GrammarApi.pronoun(obj, 'reflex')).toBe('herself');
  });

  it('reads Pronouns.He on a Gendered stuff', () => {
    const obj = makeStuff(() => new GenderedThing());
    obj.pronouns = Pronouns.He;
    expect(GrammarApi.pronoun(obj, 'subj')).toBe('he');
    expect(GrammarApi.pronoun(obj, 'obj')).toBe('him');
    expect(GrammarApi.pronoun(obj, 'poss')).toBe('his');
    expect(GrammarApi.pronoun(obj, 'reflex')).toBe('himself');
  });

  it('reads Pronouns.They on a Gendered stuff', () => {
    const obj = makeStuff(() => new GenderedThing());
    obj.pronouns = Pronouns.They;
    expect(GrammarApi.pronoun(obj, 'subj')).toBe('they');
    expect(GrammarApi.pronoun(obj, 'reflex')).toBe('themselves');
  });
});

describe('GrammarApi.possessive', () => {
  it('aliases pronoun(stuff, "poss")', () => {
    const plain = makeStuff(() => new Plain());
    expect(GrammarApi.possessive(plain)).toBe('its');

    const gendered = makeStuff(() => new GenderedThing());
    gendered.pronouns = Pronouns.She;
    expect(GrammarApi.possessive(gendered)).toBe('her');
  });
});

describe('GrammarApi.article', () => {
  it("returns 'a' for consonant-onset names", () => {
    const obj = makeStuff(() => new NamedThing());
    obj.name = 'sword';
    expect(GrammarApi.article(obj)).toBe('a');
  });

  it("returns 'an' for vowel-onset names", () => {
    const obj = makeStuff(() => new NamedThing());
    obj.name = 'axe';
    expect(GrammarApi.article(obj)).toBe('an');
  });

  it('handles uppercase first letters', () => {
    const obj = makeStuff(() => new NamedThing());
    obj.name = 'Onyx amulet';
    expect(GrammarApi.article(obj)).toBe('an');
  });

  it("falls back to 'a' when there's no display name", () => {
    const obj = makeStuff(() => new Plain());
    expect(GrammarApi.article(obj)).toBe('a');
  });

  it('uses Visible.shortDescription when no proper name is set', () => {
    const obj = makeStuff(() => new VisibleThing());
    obj.shortDescription = 'orcish blade';
    expect(GrammarApi.article(obj)).toBe('an');
  });
});
