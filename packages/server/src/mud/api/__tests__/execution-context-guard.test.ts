/**
 * runRootGuarded — the runtime execution-context guard primitive. Drives a
 * throwing / rejecting `fn` under each policy and asserts the diagnostic is
 * recorded and the control-flow contract (absorb / rethrow / swallow)
 * holds. A resolving `fn` must be a transparent passthrough (no record).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ExecutionContextApi } from '../execution-context';
import { DiagnosticApi } from '../diagnostics';

beforeEach(() => {
  vi.spyOn(DiagnosticApi, 'record').mockResolvedValue(undefined);
});
afterEach(() => vi.restoreAllMocks());

describe('runRootGuarded', () => {
  it('passes a resolving fn through and records nothing', async () => {
    const out = await ExecutionContextApi.runRootGuarded(
      null,
      'ok',
      () => 42,
      'absorb'
    );
    expect(out).toBe(42);
    expect(DiagnosticApi.record).not.toHaveBeenCalled();
  });

  it('absorb: swallows the throw, returns undefined, records', async () => {
    const out = await ExecutionContextApi.runRootGuarded(
      null,
      'cmd',
      () => {
        throw new Error('boom');
      },
      'absorb'
    );
    expect(out).toBeUndefined();
    expect(DiagnosticApi.record).toHaveBeenCalledTimes(1);
    expect(vi.mocked(DiagnosticApi.record).mock.calls[0]?.[0]?.message).toContain(
      'boom'
    );
  });

  it('rethrow: records then re-throws (async rejection)', async () => {
    await expect(
      ExecutionContextApi.runRootGuarded(
        null,
        'rest',
        async () => {
          throw new Error('kaboom');
        },
        'rethrow'
      )
    ).rejects.toThrow('kaboom');
    expect(DiagnosticApi.record).toHaveBeenCalledTimes(1);
  });

  it('swallow: records without re-throwing', async () => {
    const out = await ExecutionContextApi.runRootGuarded(
      null,
      'tick',
      () => {
        throw new Error('tickfail');
      },
      'swallow'
    );
    expect(out).toBeUndefined();
    expect(DiagnosticApi.record).toHaveBeenCalledTimes(1);
  });

  it('resolves the offending path from the target templatePath', async () => {
    const target = { getTemplatePath: () => '/mud/lib/lounge/Bar' };
    await ExecutionContextApi.runRootGuarded(
      target,
      'act',
      () => {
        throw new Error('x');
      },
      'swallow'
    );
    expect(vi.mocked(DiagnosticApi.record).mock.calls[0]?.[0]?.path).toBe(
      '/mud/lib/lounge/Bar'
    );
  });
});
