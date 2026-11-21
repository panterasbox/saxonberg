/**
 * ⭐ `type: duration` (controller-liquidity D1): the written forms bind as
 * MILLISECONDS — on an option, on a positional, as one token or two — and
 * anything else is the view's refusal. A typed `number` positional is
 * coerced too (before W1 only options were).
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

const AWAY = `
verbs: [awayish]
controller: NoopController
description: duration fixture
options:
  for:
    type: duration
args:
  - name: span
    type: duration
    required: false
  - name: note
    type: string
    required: false
`;

describe('parseDuration — the written forms', () => {
  it.each([
    ['90s', 90],
    ['15m', 900],
    ['2h', 7_200],
    ['1h30m', 5_400],
    ['3d', 259_200],
    ['90 seconds', 90],
    ['2 hours', 7_200],
    ['1 hour 30 minutes', 5_400],
    ['90m', 5_400],
    // The word forms (naming overhaul D-C6).
    ['a week', 604_800],
    ['two days', 172_800],
    ['an hour and 30 minutes', 5_400],
    ['a fortnight', 1_209_600],
    ['2 fortnights', 2_419_200],
  ])('%s → %d game seconds', (text, ms) => {
    expect(CommandDefinition.parseDuration(text)).toBe(ms);
  });

  it.each(['90', '', 'soon', '1h?', 'h', 'a while', 'a'])('refuses %j', (text) => {
    expect(CommandDefinition.parseDuration(text)).toBeNull();
  });
});

describe('type: duration — bound as game seconds', () => {
  it('an option, one token or two', () => {
    expect(assemble('awayish --for 90m', defOf(AWAY))).toMatchObject({ model: { for: 5_400 } });
    expect(assemble('awayish --for 2 hours', defOf(AWAY))).toMatchObject({ model: { for: 7_200 } });
    expect(assemble('awayish --for=1h30m', defOf(AWAY))).toMatchObject({ model: { for: 5_400 } });
  });

  it('a positional, one token or two, leaving the rest for the next slot', () => {
    expect(assemble('awayish 2 hours lunch', defOf(AWAY))).toMatchObject({
      model: { span: 7_200, note: 'lunch' },
    });
    expect(assemble('awayish 15m', defOf(AWAY))).toMatchObject({ model: { span: 900 } });
  });

  it('⭐ refuses a bad option value, naming the forms', () => {
    const r = assemble('awayish --for soon', defOf(AWAY));
    expect(r).toMatchObject({ error: 'bind' });
    expect((r as { summary: string }).summary).toMatch(/'soon' is not a length of time this takes/);
  });

  it('a REQUIRED duration positional refuses a word that is not one', () => {
    const def = defOf(`
verbs: [waitish]
controller: C
description: d
args:
  - { name: span, type: duration, required: true }
`);
    expect(assemble('waitish soon', def)).toMatchObject({ error: 'bind' });
  });

  it('help names the written forms', () => {
    expect(defOf(AWAY).getHelpText()).toContain('A duration is written 90s, 15m, 2h');
  });
});

describe('type: number — a positional is coerced', () => {
  const LIFT = `
verbs: [liftish]
controller: C
description: d
args:
  - { name: load, type: number, required: true }
  - { name: extraction, type: number, required: false }
  - { name: where, type: string, required: false }
`;
  it('binds a number, not the raw string', () => {
    expect(assemble('liftish 60 0.72', defOf(LIFT))).toMatchObject({ model: { load: 60, extraction: 0.72 } });
  });
  it('a required number refuses a word', () => {
    expect(assemble('liftish heavy', defOf(LIFT))).toEqual({
      error: 'bind',
      summary: 'load: not a number: heavy',
    });
  });
  it('⭐ an OPTIONAL number that is not one leaves the word for the next slot', () => {
    expect(assemble('liftish 60 quern', defOf(LIFT))).toMatchObject({ model: { load: 60, where: 'quern' } });
  });
});
