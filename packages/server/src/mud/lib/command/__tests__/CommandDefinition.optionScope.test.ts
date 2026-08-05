/**
 * ⚠ **Verb-scoped options are in scope inside a subcommand too.**
 *
 * Found by driving the `press` verb in a real browser, not by the suite:
 * `press post <headline> --as /compact/press` failed with *"unknown
 * option --as at post-level"* while `press --as … post <headline>`
 * worked.
 *
 * The cause was structural. The binder's Phase 1 binds verb-scoped
 * options **before** the subcommand token is consumed; Phase 3 then binds
 * against the subcommand's scope alone. So a verb option was reachable
 * only in the prefix position — and every YAML in the tree that says
 * `# verb-scoped: in scope for the bare form AND the subcommands` was
 * describing behaviour that did not exist. `bulletin post X --realm world`
 * had the same defect for as long as that verb has shipped.
 *
 * It went unnoticed because controller suites construct a bound model
 * directly and never run the binder — which is exactly the gap a live
 * drive exists to close.
 */

import { describe, it, expect } from 'vitest';
import { CommandDefinition } from '../CommandDefinition';

const YAML = `
verbs: [demo]
controller: NoopController
description: stub
options:
  as:
    type: string
    field: as
    description: "a verb-scoped option"
subcommands:
  post:
    description: "a subcommand with its own option"
    options:
      only:
        type: string
        field: only
        description: "a subcommand-scoped option"
    args:
      - name: headline
        type: string
        required: true
  bare:
    description: "a subcommand with no options of its own"
`;

const command = CommandDefinition.fromYaml(YAML, '<test>');

describe('option scoping across subcommands', () => {
  it('⚠ resolves a VERB option inside a subcommand scope', () => {
    expect(command.getOption('post', 'as')).toBeDefined();
    expect(command.getOption('post', 'as')?.def.field).toBe('as');
  });

  it('still resolves it at verb scope', () => {
    expect(command.getOption('verb', 'as')).toBeDefined();
  });

  it('resolves a subcommand option only inside that subcommand', () => {
    expect(command.getOption('post', 'only')).toBeDefined();
    // ...and it does NOT leak upward to the verb, which would make a
    // sibling subcommand accept it too.
    expect(command.getOption('verb', 'only')).toBeUndefined();
    expect(command.getOption('bare', 'only')).toBeUndefined();
  });

  it('cannot have a verb/subcommand collision to resolve in the first place', () => {
    // `validateFieldNameUniqueness` refuses a verb option and a
    // subcommand option that produce the same field, so the merge is
    // unambiguous by construction rather than by a precedence rule.
    expect(() =>
      CommandDefinition.fromYaml(
        'verbs: [clash]\ncontroller: NoopController\ndescription: stub\n' +
          'options:\n  dup:\n    type: string\n    field: dup\n' +
          'subcommands:\n  sub:\n    description: s\n    options:\n' +
          '      dup:\n        type: string\n        field: dup\n',
        '<test>',
      ),
    ).toThrow();
  });

  it('gives a subcommand with no options of its own the verb’s', () => {
    expect(command.getOption('bare', 'as')).toBeDefined();
    expect(Object.keys(command.getOptions('bare'))).toContain('as');
  });

  it('does not mutate the verb-scoped map when merging', () => {
    command.getOptions('post');
    expect(Object.keys(command.getOptions('verb'))).toEqual(['as']);
  });
});
