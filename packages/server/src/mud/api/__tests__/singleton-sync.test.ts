/**
 * StuffApi.singletonSync — the surface-architecture infra primitive.
 *
 * `singletonSync(path, factory)` is the sync, registry-keyed,
 * HMR-aware get-or-create that backs the `/platform/idea/api/<feature>` logic
 * singletons every convertible Api forwards to. These tests pin its
 * contract (acceptance #1):
 *
 *   - lazy create on first call;
 *   - cache hit (`===`, factory not re-invoked);
 *   - `byTemplatePath` keying (findByTemplatePath + glob addressable);
 *   - `dest` → recreate-fresh, including end-to-end through the
 *     production `HotReloadApi.getCurrentExport(...) ?? Fallback`
 *     factory shape (a reloaded class is picked up after `dest`);
 *   - multi-instance guard throw.
 *
 * The first group drives the recreate contract deterministically via a
 * swappable in-test class; the second proves the same path with a real
 * hot reload of an on-disk fixture.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdtempSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { StuffApi } from '../stuff';
import { HotReloadApi } from '../hot-reload';
import { Idea } from '../../lib/stuff/Idea';
import { makeStuffAtPath } from '../../lib/security/__tests__/test-setup';

const PATH = '/platform/idea/api/__sstest';

// Swappable logic classes for the deterministic recreate test. Both
// extend Idea so they flow through createSync / ProxyApi.wrap like a
// real logic singleton.
class LogicV1 extends Idea {
  tag(): string {
    return 'v1';
  }
}
class LogicV2 extends Idea {
  tag(): string {
    return 'v2';
  }
}

describe('StuffApi.singletonSync', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });

  describe('basic contract', () => {
    it('lazy-creates on first call and keys into byTemplatePath', () => {
      let calls = 0;
      const inst = StuffApi.singletonSync(PATH, () => {
        calls++;
        return new LogicV1();
      });
      expect(calls).toBe(1);
      expect((inst as LogicV1).tag()).toBe('v1');
      // Addressable by path immediately, no Template doc.
      expect(StuffApi.findByTemplatePath(PATH)).toBe(inst);
      expect(StuffApi.findByPathGlob('/platform/idea/api/*')).toContain(inst);
      expect(inst.getTemplatePath()).toBe(PATH);
    });

    it('caches: second call returns the same instance without re-invoking the factory', () => {
      let calls = 0;
      const factory = () => {
        calls++;
        return new LogicV1();
      };
      const a = StuffApi.singletonSync(PATH, factory);
      const b = StuffApi.singletonSync(PATH, factory);
      expect(b).toBe(a);
      expect(calls).toBe(1);
    });

    it('dest empties the bucket; the next call re-creates a fresh instance via the factory', () => {
      let active: typeof LogicV1 | typeof LogicV2 = LogicV1;
      let calls = 0;
      const factory = () => {
        calls++;
        return new active();
      };

      const first = StuffApi.singletonSync(PATH, factory);
      expect((first as LogicV1).tag()).toBe('v1');
      expect(calls).toBe(1);

      // Reload == dest: unregister the singleton, emptying its bucket.
      StuffApi.destruct(first);
      expect(StuffApi.findByTemplatePath(PATH)).toBeUndefined();

      // Next call resolves the (now newer) blueprint and rebuilds.
      active = LogicV2;
      const second = StuffApi.singletonSync(PATH, factory);
      expect(second).not.toBe(first);
      expect((second as LogicV2).tag()).toBe('v2');
      expect(calls).toBe(2);
    });

    it('throws when the path already holds more than one instance', () => {
      makeStuffAtPath(() => new LogicV1(), PATH);
      makeStuffAtPath(() => new LogicV1(), PATH);
      expect(() =>
        StuffApi.singletonSync(PATH, () => new LogicV1())
      ).toThrow(/at most one/);
    });
  });

  describe('HMR via getCurrentExport (real reload)', () => {
    let workDir: string;
    let fixturePath: string;

    // Static fallback for the production factory shape; the test
    // asserts we never see it (the reloaded class is always present).
    class FooFallback extends Idea {
      tag(): string {
        return 'fallback';
      }
    }

    const fixture = (v: string) => `import { Idea } from '../../../lib/stuff/Idea';
export class FooLogic extends Idea {
  tag() { return '${v}'; }
}
`;

    const factory = () =>
      new ((HotReloadApi.getCurrentExport(fixturePath, 'FooLogic') as
        | typeof FooFallback
        | null) ?? FooFallback)();

    beforeEach(() => {
      const here = dirname(fileURLToPath(import.meta.url));
      workDir = mkdtempSync(join(here, 'sstmp-'));
      fixturePath = join(workDir, 'FooLogic.ts');
    });

    afterEach(() => {
      rmSync(workDir, { recursive: true, force: true });
    });

    it('picks up the reloaded class on the next call after dest', async () => {
      writeFileSync(fixturePath, fixture('v1'));
      await HotReloadApi.reload(fixturePath);
      const first = StuffApi.singletonSync(PATH, factory);
      expect((first as FooFallback).tag()).toBe('v1');

      // Reloading the source alone does NOT swap the live singleton —
      // the cache still hands back the old instance until dest.
      writeFileSync(fixturePath, fixture('v2'));
      await HotReloadApi.reload(fixturePath);
      expect((StuffApi.singletonSync(PATH, factory) as FooFallback).tag()).toBe(
        'v1'
      );

      // dest, then the next call resolves the fresh blueprint.
      StuffApi.destruct(first);
      const second = StuffApi.singletonSync(PATH, factory);
      expect(second).not.toBe(first);
      expect((second as FooFallback).tag()).toBe('v2');
    });
  });
});
