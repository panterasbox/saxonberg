/**
 * ⭐⭐ A greedy positional and a QUOTED phrase, which had never met.
 *
 * `docs/subsystems/command-parsing.md:84-96` documents `"…"` as the way
 * to make one token out of several, and the only coverage it had was a
 * lex/format round-trip — nothing asserted a quoted positional all the
 * way through `assemble` into a bound arg. It turned out to work
 * perfectly on a NON-greedy arg (which binds `token.value`, already
 * unquoted) and to be broken on a greedy one, which builds its field
 * from a substring of the original source and therefore kept the quote
 * marks: `thing` bound `"dog loaf"` with the punctuation in it, and
 * `Perceptible.hasKeyword` is an exact `includes` against `dog loaf`
 * without.
 *
 * ⚠⚠ Which made it a REGRESSION waiting on the next author to reach for
 * `greedy:`. The reachability sweep made `buy.thing` greedy to fix
 * `buy dog loaf`, and in the same commit would have broken
 * `buy "dog loaf"` — the two forms trading places.
 *
 * ⭐ The rule is deliberately narrow, and these two cases are the whole
 * of it: ONE quoted token means the player used quoting for what it is
 * for, so the unquoted value is what they meant; SEVERAL tokens is free
 * text, where an interior quote is part of what was written (a headline,
 * a line of dialogue) and the source slice stays verbatim.
 */

import '../../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import { CommandApi } from '../../../api/command';
import { CommandLineApi } from '../../../api/command-line';
import { CommandDefinition } from '../CommandDefinition';
import type { Stuff } from '../../stuff/Stuff';
import type Location from '../../stuff/Location';
import type { CommandGiver } from '../CommandGiver';

const ctx = {
  commandGiver: {} as Stuff & CommandGiver,
  location: {} as Location,
};

/** A greedy string arg with a later prepositional arg to stop at. */
const VIEW = `
verbs: [post]
controller: /platform/idea/cmd/system/PostController
description: "Post a line"
args:
  - name: line
    type: string
    required: true
    greedy: true
  - name: board
    type: object
    required: false
    prepositions: [to]
`;

const TRAILING = `
verbs: [post]
controller: /platform/idea/cmd/system/PostController
description: "Post a line"
args:
  - name: line
    type: string
    required: true
    greedy: true
`;

function bind(text: string, yaml: string = VIEW): Record<string, unknown> {
  const parsed = CommandLineApi.parsePipeline(text).commands[0]!;
  const r = CommandApi.assemble(parsed, CommandDefinition.fromYaml(yaml, 'post.yaml'), ctx);
  if (!('model' in r)) throw new Error(`"${text}" did not bind: ${JSON.stringify(r)}`);
  return r.model as Record<string, unknown>;
}

describe('a greedy field fed exactly one quoted token', () => {
  it('⭐ binds the UNQUOTED value', () => {
    expect(bind('post "dog loaf" to board').line).toBe('dog loaf');
  });

  it('⭐ and does so when the greedy field runs to end-of-input', () => {
    expect(bind('post "dog loaf"', TRAILING).line).toBe('dog loaf');
  });

  it('strips an escape the same way', () => {
    expect(bind('post dog\\ loaf', TRAILING).line).toBe('dog loaf');
  });

  it('leaves an ordinary single token alone', () => {
    expect(bind('post torch', TRAILING).line).toBe('torch');
  });
});

describe('a greedy field fed SEVERAL tokens is free text', () => {
  it('keeps interior quotes verbatim — they are part of what was written', () => {
    expect(bind('post she said "no" to board').line).toBe('she said "no"');
  });

  it('preserves interior whitespace, which is why the slice exists', () => {
    expect(bind('post a long headline to board').line).toBe('a long headline');
  });

  it('still stops at the later field\'s preposition', () => {
    const m = bind('post a long headline to board');
    expect(m.line).toBe('a long headline');
    expect(m.board).toBe('board');
  });

  it('⚠ and the NON-greedy arg after it still takes exactly one token', () => {
    // Pre-existing and general: `to the notice board` is three tokens
    // for one slot, so the whole sentence is a shape error. It is why
    // the four views this build touched made their trailing
    // prepositional args greedy too — their own help texts promised
    // `from the second counter` and `at the brick oven`, and neither
    // bound. Every other view with a trailing prepositional object arg
    // still has it; that census is recorded in the MR, not swept here.
    expect(() => bind('post a long headline to the notice board')).toThrow(
      /too many arguments/,
    );
  });
});
