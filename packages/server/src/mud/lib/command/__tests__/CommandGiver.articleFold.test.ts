/**
 * ⭐⭐ The article fold (controller-liquidity D3): an object slot takes ONE
 * word, so `eat the apple` must not bind `the`. A leading unquoted article
 * with a word after it folds away before the slot binds. Before W1 the slot
 * bound the literal `the` and the line died as "too many arguments" — the
 * ARTICLE DEFECT `greedy` used to paper over.
 */

import '../../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import { CommandApi } from '../../../api/command';
import { CommandLineApi } from '../../../api/command-line';
import { CommandDefinition } from '../CommandDefinition';
import type { Stuff } from '../../stuff/Stuff';
import type Place from '../../stuff/Place';
import type { CommandGiver } from '../CommandGiver';

const ctx = { commandGiver: {} as Stuff & CommandGiver, location: {} as Place };
const defOf = (yaml: string): CommandDefinition => CommandDefinition.fromYaml(yaml, '<test>');
const assemble = (text: string, def: CommandDefinition) =>
  CommandApi.assemble(CommandLineApi.parsePipeline(text).commands[0]!, def, ctx);

const PUT = defOf(`
verbs: [putish]
controller: C
description: d
args:
  - { name: item, type: object, required: true, requires: any }
  - { name: into, type: object, required: false, requires: any, prepositions: [in, into] }
`);
const SAY = defOf(`
verbs: [sayish]
controller: C
description: d
args:
  - { name: words, type: string, required: true, greedy: true }
`);

describe('the article fold', () => {
  it.each(['the', 'a', 'an', 'some', 'The'])('⭐ `putish %s apple` binds apple', (article) => {
    expect(assemble(`putish ${article} apple`, PUT)).toMatchObject({ model: { item: 'apple' } });
  });

  it('folds before each object slot, after its preposition', () => {
    expect(assemble('putish the apple in the box', PUT)).toMatchObject({
      model: { item: 'apple', into: 'box' },
      prep: { into: 'in' },
    });
  });

  it('a lone article is the word typed — nothing to fold into', () => {
    expect(assemble('putish the', PUT)).toMatchObject({ model: { item: 'the' } });
  });

  it('a QUOTED article is a name, not an article', () => {
    expect(assemble('putish "the" apple', PUT)).toMatchObject({ model: { item: 'the' } });
  });

  it('a string slot keeps its articles — prose is prose', () => {
    expect(assemble('sayish the apple is red', SAY)).toMatchObject({
      model: { words: 'the apple is red' },
    });
  });
});
