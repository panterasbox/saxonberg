/**
 * The four posture views, driven through the REAL binder — the
 * `harvest-view.test.ts` shape (read the shipped view) crossed with
 * `command-assembly.test.ts` (parse → `CommandApi.assemble`), because a
 * controller test cannot see the binder and this defect lived entirely
 * inside it.
 *
 * ⚠ The failure this pins: with no `prepositions:` on `target`,
 * `CommandLogic` consumes `on` AS the positional and the leftover word
 * trips *"too many arguments"* → `command-rejected: shape-fall-through`.
 * A brand-new player typing `sit on the ground` got nothing. The fix is
 * both flags — `prepositions` so `on` is recognised, `greedy` so the
 * multi-word tail arrives whole — and the MQL desugar's article drop
 * then leaves `ground` at the keyword match.
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

const POSTURE_VIEWS = join(
  __dirname,
  '..', '..', '..', '..', '..', '..', '..', '..',
  'content', 'platform', 'content', 'platform', 'cmd', 'posture',
);

const ctx = {
  commandGiver: {} as Stuff & CommandGiver,
  location: {} as Location,
};

function view(verb: string): CommandDefinition {
  const yaml = readFileSync(join(POSTURE_VIEWS, `${verb}.yaml`), 'utf8');
  return CommandDefinition.fromYaml(yaml, `${verb}.yaml`);
}

function bind(text: string, def: CommandDefinition) {
  const parsed = CommandLineApi.parsePipeline(text).commands[0]!;
  return CommandApi.assemble(parsed, def, ctx);
}

function boundTarget(text: string, verb: string): string | undefined {
  const r = bind(text, view(verb));
  if (!('model' in r)) {
    throw new Error(
      `"${text}" did not bind: ${JSON.stringify(r)}`
    );
  }
  return r.model.target as string | undefined;
}

describe('the posture views take a preposition', () => {
  for (const verb of ['sit', 'lie', 'kneel', 'stand']) {
    describe(verb, () => {
      it('binds the bare prepositional form', () => {
        expect(boundTarget(`${verb} on the ground`, verb)).toBe('the ground');
      });

      it('binds every recognised preposition', () => {
        expect(boundTarget(`${verb} upon the bench`, verb)).toBe('the bench');
        expect(boundTarget(`${verb} at the table`, verb)).toBe('the table');
        expect(boundTarget(`${verb} in the chair`, verb)).toBe('the chair');
      });

      it('still binds the positional form', () => {
        expect(boundTarget(`${verb} bench`, verb)).toBe('bench');
      });

      it('takes a multi-word target whole (greedy)', () => {
        expect(boundTarget(`${verb} on the mossy flat stone`, verb)).toBe(
          'the mossy flat stone'
        );
      });
    });
  }

  it('bare `sit` still falls back on the view default', () => {
    // `required: true` is satisfied by `default: "ground"`, applied at
    // assembly — so adding `greedy` did NOT cost the bare form its
    // default, which is the regression this pins.
    expect(boundTarget('sit', 'sit')).toBe('ground');
    expect(boundTarget('lie', 'lie')).toBe('ground');
    expect(boundTarget('kneel', 'kneel')).toBe('ground');
  });

  it('bare `stand` needs no target at all', () => {
    const r = bind('stand', view('stand'));
    expect('model' in r).toBe(true);
  });
});
