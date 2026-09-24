/**
 * `look` and `search` take an article after their preposition.
 *
 * ⚠⚠ **Found by driving the ground build in a BROWSER**, and neither the
 * wire tier nor 11 000 unit tests could see it:
 *
 *     look at floor       → ok
 *     look at the ground  → "That doesn't match any known command shape: look."
 *
 * `look` already declared `prepositions: [at, in, inside]`, so `at` was
 * consumed — and then `the` and `ground` were **two positionals**, which the
 * binder answers with *"too many arguments"* → chain fall-through. Exactly
 * the defect the ground build fixed on the four posture verbs, still live on
 * the most-used verb in the game, and the requirements' drive step 15 asks
 * for this form by name.
 *
 * ⚠ The wire drive asserted it and PASSED VACUOUSLY: its not-found pattern
 * knew the *can't see it* family and not the *can't parse it* one, so the
 * one refusal it could actually receive was the one it could not recognise.
 * That pattern is widened too.
 */

import '../../../../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { CommandApi } from '../../../../../api/command';
import { CommandLineApi } from '../../../../../api/command-line';
import { CommandDefinition } from '../../../../../lib/command/CommandDefinition';
import type { Stuff } from '../../../../../lib/stuff/Stuff';
import type Location from '../../../../../lib/stuff/Location';
import type { CommandGiver } from '../../../../../lib/command/CommandGiver';

const VIEWS = join(
  __dirname,
  '..', '..', '..', '..', '..', '..', '..', '..',
  'content', 'platform', 'content', 'platform', 'cmd', 'perception',
);

const ctx = {
  commandGiver: {} as Stuff & CommandGiver,
  location: {} as Location,
};

function view(verb: string): CommandDefinition {
  return CommandDefinition.fromYaml(
    readFileSync(join(VIEWS, `${verb}.yaml`), 'utf8'),
    `${verb}.yaml`,
  );
}

function boundTarget(text: string, verb: string): string | undefined {
  const parsed = CommandLineApi.parsePipeline(text).commands[0]!;
  const r = CommandApi.assemble(parsed, view(verb), ctx);
  if (!('model' in r)) {
    throw new Error(`"${text}" did not bind: ${JSON.stringify(r)}`);
  }
  return r.model.target as string | undefined;
}

describe('look — the form a person types', () => {
  it('⭐ `look at the ground` binds, article and all', () => {
    expect(boundTarget('look at the ground', 'look')).toBe('the ground');
  });

  it('`look at floor` still binds (it always did)', () => {
    expect(boundTarget('look at floor', 'look')).toBe('floor');
  });

  it('`look floor` — the bare positional — still binds', () => {
    expect(boundTarget('look floor', 'look')).toBe('floor');
  });

  it('a multi-word target arrives whole rather than as "too many arguments"', () => {
    expect(boundTarget('look at the worn diagonal track', 'look')).toBe(
      'the worn diagonal track',
    );
  });

  it('⚠ bare `look` still falls back to the focus default', () => {
    // `greedy` must not cost the no-argument form its `default: "$focus"`.
    // ⭐ It binds `here`, not the literal `$focus`: an arg `default:` is
    // SHELL-interpolated at assembly, so the variable is already resolved by
    // the time a model exists — which is also why bare `sit` arrives with
    // `ground` rather than with a variable to expand later.
    expect(boundTarget('look', 'look')).toBe('here');
  });

  it('the other prepositions are unaffected', () => {
    expect(boundTarget('look in the chest', 'look')).toBe('the chest');
    expect(boundTarget('look inside the chest', 'look')).toBe('the chest');
  });
});

describe('search — the same article problem', () => {
  it('`search the floor` binds', () => {
    expect(boundTarget('search the floor', 'search')).toBe('the floor');
  });

  it('`search in the chest` binds', () => {
    expect(boundTarget('search in the chest', 'search')).toBe('the chest');
  });

  it('bare `search` takes no target', () => {
    expect(boundTarget('search', 'search')).toBeUndefined();
  });
});
