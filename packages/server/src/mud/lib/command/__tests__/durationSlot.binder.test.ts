/**
 * ⭐⭐ One duration slot, in game time (naming overhaul D-C6) — bound
 * against the REAL `rent` and `fire` views, where a controller test cannot
 * see: the binder reads `a week`, `7 days`, `2 weeks` and `1 hour 30
 * minutes` as one value; a hire off its day granularity refuses; and
 * `for soon` and `for a while` give the identical `bad-duration` refusal.
 */

import '../../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { CommandApi } from '../../../api/command';
import { CommandLineApi } from '../../../api/command-line';
import { CommandDefinition } from '../CommandDefinition';
import type { Stuff } from '../../stuff/Stuff';
import type Place from '../../stuff/Place';
import type { CommandGiver } from '../CommandGiver';

const CMD = join(__dirname, '..', '..', '..', '..', '..', '..', 'content', 'platform', 'content', 'platform', 'cmd');

const ctx = { commandGiver: {} as Stuff & CommandGiver, location: {} as Place };
const DAY = 86_400;

function view(path: string): CommandDefinition {
  return CommandDefinition.fromYaml(readFileSync(join(CMD, `${path}.yaml`), 'utf8'), `${path}.yaml`);
}

function assemble(text: string, path: string): Record<string, unknown> {
  const parsed = CommandLineApi.parsePipeline(text).commands[0]!;
  return CommandApi.assemble(parsed, view(path), ctx) as unknown as Record<string, unknown>;
}

function bound(text: string, path: string): Record<string, unknown> {
  const r = assemble(text, path);
  if (!('model' in r)) throw new Error(`"${text}" did not bind: ${JSON.stringify(r)}`);
  return r.model as Record<string, unknown>;
}

describe('rent — let by the whole day', () => {
  it('⭐ `for a week`, `for 7 days`, `for 2 weeks`, `for a fortnight` bind as game seconds', () => {
    expect(bound('rent canoe for a week', 'retail/rent').span).toBe(7 * DAY);
    expect(bound('rent canoe for 7 days', 'retail/rent').span).toBe(7 * DAY);
    expect(bound('rent canoe for 2 weeks', 'retail/rent').span).toBe(14 * DAY);
    expect(bound('rent canoe for a fortnight', 'retail/rent').span).toBe(14 * DAY);
    expect(bound('rent canoe for two days', 'retail/rent').span).toBe(2 * DAY);
  });

  it('without `for`, a day', () => {
    expect(bound('rent canoe', 'retail/rent').span).toBe(DAY);
  });

  it('⭐ `for 90 minutes` refuses on granularity, with the bad-duration row', () => {
    const r = assemble('rent canoe for 90 minutes', 'retail/rent');
    expect(r.error).toBe('bind');
    expect(r.refusal).toEqual({ reason: 'bad-duration', facts: { what: '90 minutes', why: 'it is reckoned in whole days' } });
  });

  it('`at <book>` after the span still binds — the span stops at the next preposition', () => {
    const m = bound('rent canoe for a week at book', 'retail/rent');
    expect(m.span).toBe(7 * DAY);
  });
});

describe('fire — a hold in game time', () => {
  it('`for 90 minutes`, `for 1 hour 30 minutes`, `for 2 hours` bind as game seconds; bare, a minute', () => {
    expect(bound('fire limekiln for 90 minutes', 'device/fire').hold).toBe(5_400);
    expect(bound('fire limekiln for 1 hour 30 minutes', 'device/fire').hold).toBe(5_400);
    expect(bound('fire limekiln for 2 hours', 'device/fire').hold).toBe(7_200);
    expect(bound('fire limekiln', 'device/fire').hold).toBe(60);
  });

  it('⭐ `for soon` and `for a while` give the identical refusal line', () => {
    const soon = assemble('fire limekiln for soon', 'device/fire');
    const awhile = assemble('fire limekiln for a while', 'device/fire');
    expect(soon.refusal).toEqual({ reason: 'bad-duration', facts: { what: 'soon', why: 'write it like 90s, 15m, 2 hours or a week' } });
    expect(awhile.refusal).toEqual({ reason: 'bad-duration', facts: { what: 'a while', why: 'write it like 90s, 15m, 2 hours or a week' } });
  });

  it('a hold under the minute refuses on its bound', () => {
    const r = assemble('fire limekiln for 30s', 'device/fire');
    expect(r.refusal).toEqual({ reason: 'bad-duration', facts: { what: '30s', why: 'it is 1 minute at the least' } });
  });
});

describe('the load-time checks', () => {
  const yaml = (extra: string) => `verbs: [wait]\ncontroller: X\ndescription: d\nargs:\n  - name: t\n${extra}`;
  it('granularity/min/max are refused off a duration slot, and an unreadable bound refuses the view', () => {
    expect(() => CommandDefinition.fromYaml(yaml('    type: string\n    granularity: day\n'), 'x.yaml')).toThrow(/only valid on a type: duration/);
    expect(() => CommandDefinition.fromYaml(yaml('    type: duration\n    min: soon\n'), 'x.yaml')).toThrow(/min: "soon" is not a duration/);
    expect(() => CommandDefinition.fromYaml(yaml('    type: duration\n    granularity: day\n    default: "90 minutes"\n'), 'x.yaml')).toThrow(/whole days/);
  });
});
