/**
 * ⭐ A preposition that opens only a NUMBER field ends a greedy name only
 * when a number follows it (the paper build, 2026-11-05).
 *
 * `read` takes `page <n>` after its target (`read notebook page 3`), and
 * "page" also ends names a player types: a torn-out page answers to
 * `torn-out page` and `directory page`. Before this rule `read torn-out
 * page` bound the target `torn-out` and ate the word — the page in your
 * hand could not be read by its own name.
 */

import '../../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import { CommandApi } from '../../../api/command';
import { CommandLineApi } from '../../../api/command-line';
import { CommandDefinition } from '../CommandDefinition';
import type { Stuff } from '../../stuff/Stuff';
import type Place from '../../stuff/Place';
import type { CommandGiver } from '../CommandGiver';

const ctx = {
  commandGiver: {} as Stuff & CommandGiver,
  location: {} as Place,
};

const VIEW = `
verbs: [peruse]
controller: /platform/idea/cmd/perception/ReadController
description: "Read"
args:
  - name: target
    type: string
    required: true
    greedy: true
  - name: page
    type: number
    required: false
    prepositions: [page]
`;

function bind(text: string): Record<string, unknown> {
  const parsed = CommandLineApi.parsePipeline(text).commands[0]!;
  const r = CommandApi.assemble(parsed, CommandDefinition.fromYaml(VIEW, 'peruse.yaml'), ctx);
  if (!('model' in r)) throw new Error(`"${text}" did not bind: ${JSON.stringify(r)}`);
  return r.model as Record<string, unknown>;
}

describe('a number-only preposition after a greedy name', () => {
  it('⭐ ends the name when a number follows: `peruse notebook page 3`', () => {
    const m = bind('peruse notebook page 3');
    expect(m.target).toBe('notebook');
    expect(Number(m.page)).toBe(3);
  });

  it('⭐ is part of the name when no number follows: `peruse torn-out page`', () => {
    const m = bind('peruse torn-out page');
    expect(m.target).toBe('torn-out page');
    expect(m.page).toBeUndefined();
  });

  it('a name with "page" inside it, then a page number', () => {
    const m = bind('peruse directory page page 2');
    expect(m.target).toBe('directory page');
    expect(Number(m.page)).toBe(2);
  });
});
