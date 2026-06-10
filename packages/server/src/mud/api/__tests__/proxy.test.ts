/**
 * ProxyApi tests — covers the proxy mechanics (descriptor lookup,
 * wrapper caching, mock-spy passthrough, raw-target unwrap) AND the
 * SecurityApi's interceptor end-to-end behaviour against a wrapped Stuff.
 *
 * The security interceptor registers itself on import; we don't need
 * to touch it here. `makeStuff` from test-setup ensures it's loaded.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { StuffApi } from '../stuff';
import { ProxyApi } from '../proxy';
import Thing from '../../lib/stuff/Thing';
import { ExecutionContextApi, FrameKind } from '../execution-context';
import { DestroyedObjectError, SecurityError } from '../../lib/security/errors';
import { makeStuff } from '../../lib/security/__tests__/test-setup';

describe('ProxyApi.wrap + sentinel + decorated destroy', () => {
  beforeEach(() => StuffApi.clearAll());

  it('rejects raw `new` from outside StuffApi', () => {
    expect(() => new Thing()).toThrow(/Direct 'new' on a Stuff subclass/);
  });

  it('StuffApi.create succeeds and returns a proxy', async () => {
    const t = await StuffApi.create(() => new Thing());
    expect(t.stuffId).toBeTruthy();
    expect(StuffApi.findById(t.stuffId)).toBe(t);
  });

  it('makeStuff (test seam) yields a working proxied instance', () => {
    const t = makeStuff(() => new Thing());
    expect(t.stuffId).toBeTruthy();
    expect(StuffApi.findById(t.stuffId)).toBe(t);
  });

  it('direct obj.destroy() throws SecurityError', () => {
    const t = makeStuff(() => new Thing());
    expect(() => t.destroy()).toThrow(SecurityError);
  });

  it('StuffApi.destruct(obj) succeeds', () => {
    const t = makeStuff(() => new Thing());
    expect(() => StuffApi.destruct(t)).not.toThrow();
    expect(t.isDestroyed()).toBe(true);
  });

  it('touching a destroyed object throws DestroyedObjectError', () => {
    const t = makeStuff(() => new Thing());
    StuffApi.destruct(t);
    // isDestroyed() is exempt; other methods throw.
    expect(() => t.getContainer()).toThrow(DestroyedObjectError);
  });

  it('isDestroyed() remains callable post-destruct', () => {
    const t = makeStuff(() => new Thing());
    StuffApi.destruct(t);
    expect(t.isDestroyed()).toBe(true);
  });
});

describe('ProxyApi mechanics', () => {
  beforeEach(() => StuffApi.clearAll());

  it('unwrap returns the raw target via the RAW_TARGET symbol', () => {
    const t = makeStuff(() => new Thing());
    const raw = ProxyApi.unwrap(t);
    expect(raw).not.toBe(t);                  // proxy !== raw
    expect(raw.stuffId).toBe(t.stuffId);      // same identity below the proxy
  });

  it('repeated method reads return the same wrapper reference (cached)', () => {
    const t = makeStuff(() => new Thing());
    expect(t.getContainer).toBe(t.getContainer);
  });

  it('passthrough keys (constructor, stuffId) bypass the pipeline', () => {
    const t = makeStuff(() => new Thing());
    expect(t.constructor).toBe(Thing);
    expect(typeof t.stuffId).toBe('string');
  });
});

describe('command frame plumbing (via test seam)', () => {
  beforeEach(() => StuffApi.clearAll());

  it('getCurrentCommandGiver returns the executor inside executeCommand', async () => {
    const issuer = { name: 'tester' };
    let observed: unknown = 'unset';
    await ExecutionContextApi.runRoot(null, 'root', () =>
      ExecutionContextApi.run(
        null,
        issuer,
        'executeCommand',
        { kind: FrameKind.Command },
        () => {
          observed = ExecutionContextApi.getCurrentCommandGiver();
        }
      )
    );
    expect(observed).toBe(issuer);
  });
});
