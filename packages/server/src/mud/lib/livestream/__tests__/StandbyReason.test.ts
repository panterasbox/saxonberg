/**
 * StandbyReason — the reason row and the `stream away` operand grammar
 * (broadcast-ready D2, D10), read through `StreamApi`. The duration cases
 * moved here from the retired StreamController test with the parser.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, vi, afterEach } from 'vitest';
import { StandbyReason } from '../StandbyReason';
import { StreamApi } from '../../../api/stream';
import { DocumentApi } from '../../../api/document';

const parse = (s: string) => StreamApi.parseDuration(s);

const ROWS: Record<string, Record<string, unknown>> = {
  generic: { label: 'Away', copy: 'Back soon.', defaultDurationMs: null },
  bathroom: { label: 'Bathroom break', copy: 'Back in a few.', defaultDurationMs: 300_000 },
  privacy: { label: 'Privacy', copy: 'Back shortly.', defaultDurationMs: 600_000, privacy: true },
};

function stubRows(): void {
  vi.spyOn(DocumentApi, 'read').mockImplementation(async (path: string) => {
    const key = path.replace('/platform/standby-reasons/', '');
    const data = ROWS[key];
    if (!data) return null;
    return { getKind: () => 'standby-reason', getData: () => data, getPath: () => path } as never;
  });
}

describe('StreamApi.parseDuration', () => {
  it('parses single units, chains, and a bare number as minutes', () => {
    expect(parse('90s')).toBe(90_000);
    expect(parse('15m')).toBe(15 * 60_000);
    expect(parse('1h30m')).toBe(90 * 60_000);
    expect(parse('2h15m30s')).toBe((2 * 3600 + 15 * 60 + 30) * 1000);
    expect(parse('15')).toBe(15 * 60_000);
    expect(parse('  1H 30M ')).toBe(90 * 60_000);
  });

  it('rejects junk and zero', () => {
    for (const bad of ['', '15x', '1h?', 'abc', '0', '0m', 'bathroom']) {
      expect(parse(bad)).toBeNull();
    }
  });
});

describe('StandbyReason.fromData', () => {
  it('forces a privacy reason to carry no timer', () => {
    const r = StandbyReason.fromData('privacy', ROWS.privacy!);
    expect(r.privacy).toBe(true);
    expect(r.defaultDurationMs).toBeNull();
  });

  it('throws naming the key on a malformed row', () => {
    expect(() => StandbyReason.fromData('x', { copy: 'c' })).toThrow(/'x'.*label/);
    expect(() => StandbyReason.fromData('x', { label: 'l', copy: 'c', defaultDurationMs: -1 })).toThrow(/defaultDurationMs/);
  });
});

describe('StreamApi.interpretAway', () => {
  afterEach(() => vi.restoreAllMocks());

  it('reads a bare duration as the generic reason (the shipped grammar)', async () => {
    stubRows();
    const r = await StreamApi.interpretAway('15m');
    expect(r.ok && r.reason.key).toBe('generic');
    expect(r.ok && r.durationMs).toBe(15 * 60_000);
  });

  it("uses a reason's default, and an explicit duration overrides it", async () => {
    stubRows();
    const a = await StreamApi.interpretAway('bathroom');
    expect(a.ok && a.durationMs).toBe(300_000);
    const b = await StreamApi.interpretAway('bathroom', '2m');
    expect(b.ok && b.durationMs).toBe(120_000);
  });

  it('never gives a privacy reason a countdown, even when asked for one', async () => {
    stubRows();
    const r = await StreamApi.interpretAway('privacy', '20m');
    expect(r.ok && r.durationMs).toBeNull();
  });

  it('refuses an unknown word naming both readings', async () => {
    stubRows();
    const r = await StreamApi.interpretAway('lunchtime');
    expect(r.ok).toBe(false);
    expect(!r.ok && r.refusal).toBe('unknown-reason');
    expect(!r.ok && r.detail).toMatch(/neither a standby reason nor a duration/);
  });

  it('refuses a bad override duration', async () => {
    stubRows();
    const r = await StreamApi.interpretAway('bathroom', 'soon');
    expect(!r.ok && r.refusal).toBe('bad-duration');
  });
});
