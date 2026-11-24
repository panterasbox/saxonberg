/**
 * DocumentKind — a kind's declaration read into its traits: every trait's
 * parse and refusal, the card a document carries, the field schema and the
 * ledger rules (naming overhaul, Stage A).
 */
import { describe, expect, it } from 'vitest';
import { DocumentKind } from '../DocumentKind';

const kind = (name: string, data: Record<string, unknown>): DocumentKind => new DocumentKind(name, data);

describe('DocumentKind — parsing', () => {
  it('reads every trait', () => {
    const k = kind('bore', {
      title: 'Bore',
      traits: {
        shipped: { dir: 'bores', vanish: 'keep' },
        catalogued: { by: '/x/idea/BoreCatalogue', load: 'whole' },
        keyworded: { leaf: false, unique: true },
        titled: { field: 'name' },
        dated: { field: 'spudAtS', indexed: true },
        filed: 'register',
        paper: { template: '{{ name }}' },
        ledger: { grows: ['log'] },
        tree: { parent: 'folder' },
        secret: true,
      },
    });
    expect(k.getName()).toBe('bore');
    expect(k.getTitle()).toBe('Bore');
    expect(k.shipped()).toEqual({ dir: 'bores', ext: 'yaml', vanish: 'keep' });
    expect(k.servedBy()).toBe('/x/idea/BoreCatalogue');
    expect(k.catalogueLoad()).toBe('whole');
    expect(k.keyworded()).toEqual({ keywords: 'keywords', leaf: false, unique: true });
    expect(k.isUnique()).toBe(true);
    expect(k.dated()).toEqual({ field: 'spudAtS', unit: 'game-s', indexed: true });
    expect(k.filedBy()).toBe('register');
    expect(k.paperTemplate()).toBe('{{ name }}');
    expect(k.ledger()).toEqual({ mode: 'grows', grows: ['log'] });
    expect(k.treeParent()).toBe('folder');
    expect(k.isSecret()).toBe(true);
  });

  it('defaults: an in-tree kind, a keyworded kind with no parameters, an immutable ledger', () => {
    expect(kind('command-view', { traits: { shipped: { 'in-tree': 'cmd' } } }).shipped()).toEqual({
      inTree: 'cmd',
      ext: 'yaml',
      vanish: 'delete',
    });
    expect(kind('recipe', { traits: { keyworded: {} } }).keyworded()).toEqual({
      keywords: 'keywords',
      leaf: true,
      unique: false,
    });
    expect(kind('edition', { traits: { ledger: 'immutable' } }).ledger()).toEqual({ mode: 'immutable' });
    expect(kind('plain', {}).getTitle()).toBe('plain');
  });

  it('refuses an unknown trait, an unknown parameter, a bad transport and a bad name', () => {
    expect(() => kind('x', { traits: { bogus: {} } })).toThrow(/unknown trait 'bogus'/);
    expect(() => kind('x', { traits: { shipped: { dir: 'x', where: 1 } } })).toThrow(/unknown parameter 'where'/);
    expect(() => kind('x', { traits: { shipped: { dir: 'x', 'in-tree': 'cmd' } } })).toThrow(/exactly one/);
    expect(() => kind('x', { traits: { filed: 'courier' } })).toThrow(/not a transport/);
    expect(() => kind('x', { traits: { catalogued: { by: 'relative' } } })).toThrow(/absolute/);
    expect(() => kind('Bad Name', {})).toThrow(/lowercase/);
    expect(() => kind('x', { other: 1 })).toThrow(/unknown key 'other'/);
    expect(() => kind('x', { fields: { a: { type: 'date' } } })).toThrow(/type 'date'/);
  });

  it('the bootstrap declares `kind` itself', () => {
    const k = DocumentKind.BOOTSTRAP;
    expect(k.getName()).toBe('kind');
    expect(k.shipped()?.dir).toBe('kinds');
    expect(k.isUnique()).toBe(true);
    expect(k.titleOf('/platform/kinds/herd', { title: 'Herd' })).toBe('Herd');
  });
});

describe('DocumentKind — titles, keywords and the card', () => {
  const recipe = kind('recipe', {
    traits: { keyworded: {}, titled: { field: 'name' } },
    fields: { outputTemplate: { type: 'string', index: 'output' } },
  });

  it('a title is its field, else the leaf', () => {
    expect(recipe.titleOf('/stuff/recipes/stool', { name: 'A Joint Stool' })).toBe('A Joint Stool');
    expect(recipe.titleOf('/stuff/recipes/stool', {})).toBe('stool');
  });

  it('keywords: the leaf, the keywords field, the title and its bare form — lower-cased', () => {
    expect(recipe.keywordsOf('/stuff/recipes/stool', { name: 'The Stool', keywords: ['Seat'] })).toEqual([
      'stool',
      'seat',
      'the stool',
    ]);
    const herd = kind('herd', { traits: { keyworded: { leaf: false } } });
    expect(herd.keywordsOf('/x/herds/h-91ab', {})).toEqual([]);
    const placement = kind('placement', { traits: { keyworded: { keywords: 'prepositions' } } });
    expect(placement.keywordsOf('/platform/placements/on', { prepositions: ['on', 'upon'] })).toEqual(['on', 'upon']);
  });

  it('the card: indexed fields, a default, the date, the words', () => {
    expect(recipe.cardOf('/stuff/recipes/stool', { outputTemplate: '/stuff/thing/stool' })).toEqual({
      output: '/stuff/thing/stool',
      word: 'stool',
    });
    const release = kind('release', {
      traits: { dated: { field: 'publishedAtS', indexed: true } },
      fields: {
        pinned: { type: 'boolean', index: 'pinned', default: false },
        releaseId: { type: 'string', index: 'releaseId' },
      },
    });
    expect(release.cardOf('/org/releases/r1', { publishedAtS: 99, releaseId: '' })).toEqual({
      date: 99,
      pinned: false,
    });
    expect(kind('map', {}).cardOf('/home/a/maps/x', { places: [] })).toEqual({});
    expect(() => recipe.cardOf('', {})).toThrow(/no path/);
  });
});

describe('DocumentKind — fields and ledgers', () => {
  it('fieldFailures names each missing or mistyped field', () => {
    const topic = kind('topic', { fields: { label: { type: 'string', required: true }, n: 'number' } });
    expect(topic.fieldFailures({ label: 'x' })).toEqual([]);
    expect(topic.fieldFailures({})).toEqual(["'label' is required"]);
    expect(topic.fieldFailures({ label: '  ' })).toEqual(["'label' must not be empty"]);
    expect(topic.fieldFailures({ label: 'x', n: 'two' })).toEqual(["'n' must be a number"]);
  });

  it('an immutable ledger refuses a second write', () => {
    const ed = kind('edition', { traits: { ledger: 'immutable' } });
    expect(ed.ledgerFailures(null, { a: 1 })).toEqual([]);
    expect(ed.ledgerFailures({ a: 1 }, { a: 1 })).toHaveLength(1);
  });

  it('a growing field may only gain entries at its end', () => {
    const bore = kind('bore', { traits: { ledger: { grows: ['log'] } } });
    expect(bore.ledgerFailures({ log: [{ d: 1 }] }, { log: [{ d: 1 }, { d: 2 }] })).toEqual([]);
    expect(bore.ledgerFailures({ log: [{ d: 1 }, { d: 2 }] }, { log: [{ d: 1 }] })[0]).toMatch(/lose 1 entry/);
    expect(bore.ledgerFailures({ log: [{ d: 1 }] }, { log: [{ d: 9 }] })[0]).toMatch(/entry 1 would change/);
    expect(bore.ledgerFailures({ log: [{ d: 1, e: 2 }] }, { log: [{ e: 2, d: 1 }] })).toEqual([]);
  });
});
