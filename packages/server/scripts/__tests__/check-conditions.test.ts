/**
 * check-conditions — the shapes it must FLAG and the shapes it must
 * accept (the shipped-broken-gate clause: assert it fires).
 *
 * ⚠ The vocabularies are read out of their own source files by text
 * rather than imported (importing `Vitals.ts` into a script dies at
 * module load) or copied (which is how a gate silently stops matching).
 * The first two cases below are really testing that reader.
 */

import { describe, it, expect } from 'vitest';
import { findingsIn } from '../check-conditions';

const CLASS = '/platform/idea/Condition';
const row = (data: Record<string, unknown>) => ({ class: CLASS, data });
const flags = (data: Record<string, unknown>): string[] =>
  findingsIn('fixture.yaml', row(data));

describe('check-conditions — must fire', () => {
  it('⭐ a progression block with NO law — silently inert', () => {
    // The arm's switch falls through and the condition never progresses:
    // authored, warmed, afflicted, read, and doing nothing.
    expect(flags({ progression: { intervalMs: 3600000 } })).toHaveLength(1);
  });

  it('⭐ a MISSPELLED law', () => {
    expect(flags({ progression: { law: 'staged' } })[0]).toContain(
      'silently inert',
    );
  });

  it('an unknown signature kind — the interpreter skips it', () => {
    expect(flags({ signature: [{ kind: 'morale', bands: 1 }] })[0]).toContain(
      'skips it',
    );
  });

  it('⚠⚠ a vital sign that does not exist', () => {
    // The one that most needs a gate: a DELIBERATE no-op is a real
    // feature (a bloodless clade absorbs a bleed), so an accidental one
    // is indistinguishable from it in play.
    const f = flags({
      signature: [{ kind: 'vital', sign: 'bloodVolumn', perHour: -1 }],
    });
    expect(f[0]).toContain('does not exist');
  });

  it('a vital effect with no RATE', () => {
    // `perHour`, not `delta`. A bare delta has no answer to "applied how
    // often?" across an absence, which is why the shipped `{sign, delta}`
    // shape was never wired to anything.
    expect(
      flags({ signature: [{ kind: 'vital', sign: 'heartRate', delta: 40 }] }),
    ).not.toHaveLength(0);
  });

  it('a capability effect that disables something else', () => {
    expect(
      flags({
        signature: [
          { kind: 'capability', disables: 'everything', aboveSeverity: 0.5 },
        ],
      }),
    ).toHaveLength(1);
  });
});

describe('check-conditions — must NOT fire', () => {
  it('every one of the four laws', () => {
    for (const law of ['stage', 'decay', 'logistic', 'burden']) {
      expect(flags({ progression: { law } }), law).toHaveLength(0);
    }
  });

  it('⚠ `progression: null` — a driver outside the collection owns the clock', () => {
    // Five shipped rows are like this (the metabolic collapse gate,
    // respiration's spo2, thermal's temperature). It is not an omission.
    expect(flags({ progression: null })).toHaveLength(0);
    expect(flags({})).toHaveLength(0);
  });

  it('every well-formed effect kind', () => {
    expect(
      flags({
        signature: [
          { kind: 'vital', sign: 'bloodVolume', perHour: -0.2 },
          { kind: 'reserve', reserve: 'endurance', pctPerHour: -1.5 },
          { kind: 'capability', disables: 'slots-at-site', aboveSeverity: 0.4 },
          { kind: 'expression', bands: 2 },
        ],
      }),
    ).toHaveLength(0);
  });

  it('ignores a row that is not a Condition', () => {
    expect(
      findingsIn('x.yaml', {
        class: '/platform/thing/Thing',
        data: { progression: { law: 'nonsense' } },
      }),
    ).toHaveLength(0);
  });

  it('a resolution with a `by` token, with or without `atStage`', () => {
    expect(flags({ resolution: { by: 'rest' } })).toHaveLength(0);
    expect(flags({ resolution: { by: 'rest', atStage: 12 } })).toHaveLength(0);
    expect(flags({ resolution: { atStage: 12 } })).toHaveLength(1);
  });
});
