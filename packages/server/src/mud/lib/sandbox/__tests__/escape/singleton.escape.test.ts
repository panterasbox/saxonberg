/**
 * Escape battery — STATEFUL SINGLETONS: the audited needs-a-guard
 * mutators deny under circle scope with a receipt. Exercises the guard
 * primitive itself plus the cheapest real flagged mutator
 * (`HotReloadApi.unload` — the path-keyed global class registry).
 * Fails without `SecurityApi.assertFieldMutation` at the flagged sites.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { SecurityApi } from '../../../../api/security';
import { HotReloadApi } from '../../../../api/hot-reload';
import {
  ExecutionContextApi,
  OMNI_SCOPE,
} from '../../../../api/execution-context';
import { SecurityError } from '../../../security/errors';
import { DiagnosticApi } from '../../../../api/diagnostics';

const SCOPE = '/home/escape-tester';

async function tick(): Promise<void> {
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 5));
  }
}

describe('sandbox-escape: singleton', () => {
  afterEach(() => {
    ExecutionContextApi._clearForTesting();
    vi.restoreAllMocks();
  });

  it('the guard primitive passes field and omni, denies circle', () => {
    // field: no throw
    SecurityApi.assertFieldMutation({}, 'probe');
    // omni: no throw
    ExecutionContextApi.runRoot(
      null,
      'maintenance',
      () => SecurityApi.assertFieldMutation({}, 'probe'),
      { circleScope: OMNI_SCOPE }
    );
    // circle: denied
    ExecutionContextApi.runRoot(
      null,
      'escape',
      () => {
        expect(() => SecurityApi.assertFieldMutation({}, 'probe')).toThrow(
          SecurityError
        );
      },
      { circleScope: SCOPE }
    );
  });

  it('a real flagged mutator denies with a receipt (HotReloadApi.unload)', async () => {
    const record = vi
      .spyOn(DiagnosticApi, 'record')
      .mockResolvedValue(undefined);
    ExecutionContextApi.runRoot(
      null,
      'escape',
      () => {
        expect(() =>
          HotReloadApi.unload('/obj/anything')
        ).toThrow(SecurityError);
      },
      { circleScope: SCOPE }
    );
    await tick();
    const receipt = record.mock.calls.find((c) =>
      String(c[0].message).includes('HotReloadApi.unload')
    );
    expect(receipt).toBeDefined();
    expect(receipt![0].channel).toBe('sandbox.boundary');
  });
});
