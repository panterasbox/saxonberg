import { describe, it, expect } from 'vitest';
import { Pronouns } from '@saxonberg/types';
import { Prose, ProseApi } from '../prose';
import { Mml } from '../mml';
import { Stuff } from '../../lib/stuff/Stuff';
import { NamedMixin } from '../../lib/description/Named';
import { GenderedMixin } from '../../lib/character/Gendered';
import { makeStuff } from '../../lib/security/__tests__/test-setup';

class Plain extends Stuff {}
class NamedThing extends NamedMixin(Stuff) {}
class GenderedNamed extends GenderedMixin(NamedMixin(Stuff)) {}

describe('ProseApi.format — substitution', () => {
  it('renders a literal template with no placeholders', () => {
    expect(ProseApi.format('hello world', {}).toString()).toBe('hello world');
  });

  it('substitutes a single variable', () => {
    expect(ProseApi.format('hi {{ name }}!', { name: 'Bob' }).toString()).toBe(
      'hi Bob!',
    );
  });

  it('escapes raw string interpolations the same way Mml.compose does', () => {
    expect(
      ProseApi.format('say {{ what }}', { what: '<bad>' }).toString(),
    ).toBe('say &lt;bad&gt;');
  });

  it('treats Mml fragments as already-escaped and emits verbatim', () => {
    expect(
      ProseApi.format('hi {{ who }}', {
        who: Mml.fromMarkup('<name>Alice</name>'),
      }).toString(),
    ).toBe('hi <name>Alice</name>');
  });

  it('coerces numbers and booleans then escapes', () => {
    expect(
      ProseApi.format('n={{ n }} b={{ b }}', { n: 42, b: true }).toString(),
    ).toBe('n=42 b=true');
  });

  it('renders missing variables as empty (strictVariables: false)', () => {
    expect(
      ProseApi.format('a={{ x }} b={{ missing }}', { x: 'X' }).toString(),
    ).toBe('a=X b=');
  });

  it('treats null and undefined values as empty', () => {
    expect(
      ProseApi.format('a{{ a }}b{{ b }}c', { a: null, b: undefined }).toString(),
    ).toBe('abc');
  });

  it('calls toMml() on objects when present', () => {
    const obj = { toMml: () => Mml.fromMarkup('<custom>X</custom>') };
    expect(ProseApi.format('{{ it }}', { it: obj }).toString()).toBe(
      '<custom>X</custom>',
    );
  });

  it('returns a real Mml fragment that JSON-serializes as its string', () => {
    const m = ProseApi.format('hi {{ what }}', { what: '<x>' });
    expect(JSON.stringify({ body: m })).toBe('{"body":"hi &lt;x&gt;"}');
  });
});

describe('ProseApi.format — conditionals and filters', () => {
  it('renders a conditional segment when the var is truthy', () => {
    const tpl = 'You arrive{% if direction %} from the {{ direction }}{% endif %}.';
    expect(
      ProseApi.format(tpl, { direction: 'north' }).toString(),
    ).toBe('You arrive from the north.');
  });

  it('drops the conditional segment when the var is missing', () => {
    const tpl = 'You arrive{% if direction %} from the {{ direction }}{% endif %}.';
    expect(ProseApi.format(tpl, {}).toString()).toBe('You arrive.');
  });

  it('supports {% else %} branches', () => {
    const tpl = '{% if combat %}[fighting]{% else %}[idle]{% endif %}';
    expect(ProseApi.format(tpl, { combat: true }).toString()).toBe(
      '[fighting]',
    );
    expect(ProseApi.format(tpl, { combat: false }).toString()).toBe('[idle]');
  });

  it('threads Mml-vocabulary filters and emits the resulting markup verbatim', () => {
    const obj = makeStuff(() => new NamedThing());
    obj.name = 'Alice';
    const out = ProseApi.format('hi {{ who | name }}!', { who: obj }).toString();
    expect(out).toBe(`hi <name stuff-id="${obj.stuffId}">Alice</name>!`);
  });

  it('uses the direction filter to wrap a raw string', () => {
    expect(
      ProseApi.format('to the {{ d | direction }}.', {
        d: 'north',
      }).toString(),
    ).toBe('to the <direction>north</direction>.');
  });

  it('chains grammar filters: cap on a pronoun', () => {
    const obj = makeStuff(() => new GenderedNamed());
    obj.name = 'Alice';
    obj.pronouns = Pronouns.She;
    expect(
      ProseApi.format(
        '{{ a | pronoun: "subj" | cap }} smiles.',
        { a: obj },
      ).toString(),
    ).toBe('She smiles.');
  });

  it('renders empty for the pronoun filter on non-Gendered stuff', () => {
    const obj = makeStuff(() => new Plain());
    expect(
      ProseApi.format('[{{ x | pronoun }}]', { x: obj }).toString(),
    ).toBe('[]');
  });

  it('renders empty for the name filter on a stuff with no display surface', () => {
    const obj = makeStuff(() => new Plain());
    expect(ProseApi.format('[{{ x | name }}]', { x: obj }).toString()).toBe(
      '[]',
    );
  });

  it('throws on an unknown filter (strictFilters)', () => {
    expect(() =>
      ProseApi.format('{{ x | nopeFilter }}', { x: 'y' }),
    ).toThrow();
  });
});

describe('Prose.parse — compiled reuse', () => {
  it('compiles once, renders many times', () => {
    const tpl = Prose.parse('hello {{ who }}');
    expect(tpl.render({ who: 'Bob' }).toString()).toBe('hello Bob');
    expect(tpl.render({ who: 'Alice' }).toString()).toBe('hello Alice');
  });

  it('exposes the source via toString()', () => {
    const tpl = Prose.parse('plain');
    expect(tpl.toString()).toBe('plain');
  });

  it('produces a Mml fragment from render()', () => {
    const out = Prose.parse('hi {{ x }}').render({ x: '<y>' });
    expect(out).toBeInstanceOf(Mml);
    expect(out.toString()).toBe('hi &lt;y&gt;');
  });
});

describe('ProseApi.registerFilter', () => {
  it('registers a custom filter usable in subsequent renders', () => {
    ProseApi.registerFilter('shout', (v) => String(v).toUpperCase());
    expect(
      ProseApi.format('{{ x | shout }}', { x: 'hello' }).toString(),
    ).toBe('HELLO');
  });
});
