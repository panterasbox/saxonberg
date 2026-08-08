/**
 * `Stuff.#templatePath` tamper-resistance + invariant tests.
 *
 * Post-lockdown, `templatePath` is a hard-private (`#`) slot:
 *   - The only writers are `setTemplatePath` (`ApiOnly`-gated +
 *     re-indexes `byTemplatePath`) and the caller-gated static
 *     `Stuff._stampTemplatePath` (allowlist: `mud/api/stuff.ts`,
 *     test-setup, `.test.ts` files).
 *   - The only readers are `getTemplatePath()` (instance method,
 *     unwraps `RAW_TARGET`) and the matching static read pattern.
 *   - Forging `(stuff as any).templatePath = X` no-ops on the `#`
 *     slot and cannot poison the `byTemplatePath` index.
 *   - `templatePath` is NOT in `PASSTHROUGH_KEYS` — bracket reads on
 *     the proxy return `undefined`.
 *
 * The stamp-gate guarantee (see end of file) is the load-bearing
 * security claim: only allowlisted callers can stamp a Stuff's
 * templatePath, which is what `FromTemplate`-based call-security
 * policies rely on.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import { Stuff } from '../../lib/stuff/Stuff';
import { Idea } from '../../lib/stuff/Idea';
import { StuffApi } from '../stuff';
import { ShadowApi } from '../shadow';
import { ProxyApi } from '../proxy';
import { makeStuff } from '../../lib/security/__tests__/test-setup';

class Plain extends Idea {}

describe('templatePath lockdown — round-trip', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });

  it('default is null', () => {
    const s = makeStuff(() => new Plain());
    expect(s.getTemplatePath()).toBeNull();
  });

  it('_stampTemplatePath sets the slot (used by clone/pre-register)', () => {
    const s = makeStuff(() => new Plain());
    Stuff._stampTemplatePath(s, '/obj/Test');
    expect(s.getTemplatePath()).toBe('/obj/Test');
  });
});

describe('templatePath lockdown — tamper resistance', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });

  it('(s as any).templatePath = path does NOT change the `#` slot', () => {
    const s = makeStuff(() => new Plain());
    Stuff._stampTemplatePath(s, '/obj/Real');
    expect(s.getTemplatePath()).toBe('/obj/Real');

    (s as unknown as { templatePath: string }).templatePath = '/forged/path';
    expect(s.getTemplatePath()).toBe('/obj/Real');
  });

  it('bracket access on the proxy returns undefined (templatePath not in PASSTHROUGH_KEYS)', () => {
    const s = makeStuff(() => new Plain());
    Stuff._stampTemplatePath(s, '/obj/Real');
    expect(
      (s as unknown as { templatePath?: unknown }).templatePath
    ).toBe(undefined);
  });

  it('Reflect.set(proxy, "templatePath", X) is a no-op on the `#` slot', () => {
    const s = makeStuff(() => new Plain());
    Stuff._stampTemplatePath(s, '/obj/Real');
    Reflect.set(s, 'templatePath', '/forged');
    expect(s.getTemplatePath()).toBe('/obj/Real');
  });

  it('JSON.stringify does not surface a templatePath field', () => {
    const s = makeStuff(() => new Plain());
    Stuff._stampTemplatePath(s, '/obj/Real');
    // `#templatePath` is invisible to JSON serialization by
    // construction.
    expect(JSON.stringify(s)).not.toContain('templatePath');
  });
});

describe('templatePath lockdown — byTemplatePath integrity under tamper', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });

  it('forging (s as any).templatePath does NOT poison findByTemplatePath', () => {
    const s = makeStuff(() => new Plain());
    Stuff._stampTemplatePath(s, '/obj/Real');
    // Pre-register stamp lands the index entry. Force a re-register
    // so `byTemplatePath` picks it up.
    StuffApi.unregister(s);
    StuffApi.register(s);
    expect(StuffApi.findByTemplatePath('/obj/Real')).toBe(s);

    // Forge a stray property on the proxy — no effect on the index.
    (s as unknown as { templatePath: string }).templatePath = '/forged';
    expect(StuffApi.findByTemplatePath('/forged')).toBeUndefined();
    expect(StuffApi.findByTemplatePath('/obj/Real')).toBe(s);
  });
});

describe('templatePath lockdown — getTemplatePath unwrap', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });

  it('works through the Proxy (unwraps via RAW_TARGET internally)', () => {
    const s = makeStuff(() => new Plain());
    Stuff._stampTemplatePath(s, '/obj/Real');
    // s is the proxy; getTemplatePath unwraps to reach the `#` slot.
    expect(s.getTemplatePath()).toBe('/obj/Real');
  });

  it('works on the raw target directly (no proxy)', () => {
    const s = makeStuff(() => new Plain());
    Stuff._stampTemplatePath(s, '/obj/Real');
    const raw = (s as unknown as Record<symbol, Stuff | undefined>)[
      ProxyApi.RAW_TARGET
    ];
    expect(raw).toBeDefined();
    expect(raw!.getTemplatePath()).toBe('/obj/Real');
  });
});

describe('templatePath lockdown — clone pipeline still works', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });

  // The clone pipeline uses `_stampTemplatePath` to stamp the path
  // before register. We test the pre-register sequence mechanically
  // — the full clone-from-template path requires Mongo and lives
  // elsewhere.
  it('stamp + register lands the byTemplatePath entry', () => {
    const s = makeStuff(() => new Plain());
    StuffApi.unregister(s);
    Stuff._stampTemplatePath(s, '/obj/cloned');
    StuffApi.register(s);
    expect(StuffApi.findByTemplatePath('/obj/cloned')).toBe(s);
    expect(s.getTemplatePath()).toBe('/obj/cloned');
  });
});

describe('_stampTemplatePath gate — caller allowlist', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });

  it('direct call from a .test.ts file IS allowed', () => {
    // This test file lives under `.test.ts`, which the allowlist
    // permits. The immediate caller of `_stampTemplatePath` is
    // this stack frame, so the gate accepts it.
    const s = makeStuff(() => new Plain());
    expect(() =>
      Stuff._stampTemplatePath(s, '/obj/from-test')
    ).not.toThrow();
    expect(s.getTemplatePath()).toBe('/obj/from-test');
  });

  it('a non-allowlisted caller (a regular .ts file under mud/api/__tests__/fixtures) throws', async () => {
    // The fixture file's path is
    // `mud/api/__tests__/fixtures/templatePath-bad-caller.ts`
    // — under `mud/api/` but NOT `mud/api/stuff.ts`, NOT
    // `*.test.ts`, NOT `test-setup.ts`. The gate must reject it.
    const { stampFromBadCaller } = await import(
      './fixtures/templatePath-bad-caller'
    );
    const s = makeStuff(() => new Plain());
    expect(() => stampFromBadCaller(s, '/forged/path')).toThrow(
      /_stampTemplatePath refused/
    );
    // Slot unchanged.
    expect(s.getTemplatePath()).toBeNull();
  });

  it('cached rejection: a second call from the bad caller throws identically', async () => {
    // Per-URL cache means the first call walks the stack, the
    // second is a Map lookup. Both must throw.
    const { stampFromBadCaller } = await import(
      './fixtures/templatePath-bad-caller'
    );
    const s = makeStuff(() => new Plain());
    expect(() => stampFromBadCaller(s, '/forged/path')).toThrow(
      /_stampTemplatePath refused/
    );
    expect(() => stampFromBadCaller(s, '/forged/again')).toThrow(
      /_stampTemplatePath refused/
    );
    expect(s.getTemplatePath()).toBeNull();
  });

  it('cached acceptance: repeated test calls do not re-walk the stack', () => {
    // The cache for `.test.ts` callers seeds on the first call.
    // Subsequent calls succeed; if the gate were to re-walk and
    // somehow fail, the second call would throw — it doesn't.
    const s = makeStuff(() => new Plain());
    Stuff._stampTemplatePath(s, '/obj/round-1');
    expect(s.getTemplatePath()).toBe('/obj/round-1');
    Stuff._stampTemplatePath(s, '/obj/round-2');
    expect(s.getTemplatePath()).toBe('/obj/round-2');
  });
});
