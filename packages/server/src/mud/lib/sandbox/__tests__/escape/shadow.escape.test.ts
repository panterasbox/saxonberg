/**
 * Escape battery — SHADOW: the `@ShadowSecurity`-seam boundary rule.
 *
 * Adversarial shape: circle code attaches a shadow to a field host;
 * field code shadows a circle object. Both denied at `ShadowApi.attach`
 * (before any mutation) with receipts; same-scope installs still work.
 * Fails without the `_assertShadowBoundary` rule.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '../../../../api/stuff';
import { ShadowApi } from '../../../../api/shadow';
import { Shadow } from '../../../stuff/Shadow';
import {
  ExecutionContextApi,
} from '../../../../api/execution-context';
import { SecurityError } from '../../../security/errors';
import { Idea } from '../../../stuff/Idea';
import { DiagnosticApi } from '../../../../api/diagnostics';

const SCOPE = '/home/escape-tester';

class DescribeHost extends Idea {
  describe(): string {
    return 'plain';
  }
}

class ReplaceShadow extends Shadow {
  describe(): string {
    return 'SHADOWED';
  }
}

async function tick(): Promise<void> {
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 5));
  }
}

describe('sandbox-escape: shadow', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
  });

  afterEach(() => {
    ExecutionContextApi._clearForTesting();
    vi.restoreAllMocks();
  });

  it('circle context cannot shadow a field host (and gets a receipt)', async () => {
    const record = vi
      .spyOn(DiagnosticApi, 'record')
      .mockResolvedValue(undefined);
    const host = await StuffApi.create(() => new DescribeHost());
    const sh = await StuffApi.create(() => new ReplaceShadow());
    ExecutionContextApi.runRoot(
      null,
      'escape',
      () => {
        expect(() => ShadowApi.attach(host, sh)).toThrow(SecurityError);
      },
      { circleScope: SCOPE }
    );
    // nothing installed — the host behaves plainly
    expect(host.describe()).toBe('plain');
    await tick();
    const receipt = record.mock.calls.find((c) =>
      String(c[0].message).includes('shadow-attach')
    );
    expect(receipt).toBeDefined();
    expect(receipt![0].channel).toBe('sandbox.boundary');
  });

  it('field context cannot shadow a circle host', async () => {
    const { host, sh } = (await ExecutionContextApi.runRootGuarded(
      null,
      'escape',
      async () => ({
        host: await StuffApi.create(() => new DescribeHost()),
        sh: await StuffApi.create(() => new ReplaceShadow()),
      }),
      'rethrow',
      { circleScope: SCOPE }
    ))!;
    expect(() => ShadowApi.attach(host, sh)).toThrow(SecurityError);
  });

  it('same-scope installs still work, both sides', async () => {
    // field-on-field
    const fieldHost = await StuffApi.create(() => new DescribeHost());
    const fieldShadow = await StuffApi.create(() => new ReplaceShadow());
    ShadowApi.attach(fieldHost, fieldShadow);
    expect(fieldHost.describe()).toBe('SHADOWED');

    // circle-on-circle
    await ExecutionContextApi.runRootGuarded(
      null,
      'escape',
      async () => {
        const host = await StuffApi.create(() => new DescribeHost());
        const sh = await StuffApi.create(() => new ReplaceShadow());
        ShadowApi.attach(host, sh);
        expect(host.describe()).toBe('SHADOWED');
        // detach within scope also works
        ShadowApi.detach(sh);
        expect(host.describe()).toBe('plain');
      },
      'rethrow',
      { circleScope: SCOPE }
    );
  });

  it('cross-scope detach is denied too (no unhooking someone else)', async () => {
    const host = await StuffApi.create(() => new DescribeHost());
    const sh = await StuffApi.create(() => new ReplaceShadow());
    ShadowApi.attach(host, sh);
    ExecutionContextApi.runRoot(
      null,
      'escape',
      () => {
        expect(() => ShadowApi.detach(sh)).toThrow(SecurityError);
      },
      { circleScope: SCOPE }
    );
    expect(host.describe()).toBe('SHADOWED');
  });
});
