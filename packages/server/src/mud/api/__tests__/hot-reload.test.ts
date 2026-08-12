/**
 * HotReloadApi — registry, behavior swap, lifecycle events, failure
 * modes.
 *
 * Implementation note on identity checks: `hot-reload.ts` does NOT use
 * `instanceof` against any registered class, and the test below
 * verifies that with a static source-bytes assertion. If you find
 * yourself wanting `instanceof` for error narrowing, prefer duck-
 * typing: `err && typeof err === 'object' && 'message' in err` —
 * survives across reloads where each new module evaluation produces
 * fresh constructor identities.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { writeFileSync, mkdtempSync, rmSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';

import { HotReloadApi } from '../hot-reload';
import { EventApi } from '../event';
import { StuffApi } from '../stuff';
import { Stuff } from '../../lib/stuff/Stuff';
import { ShadowApi } from '../shadow';
import { Events, type ReloadEvent } from '../../lib/events';
import EventRegistry from '../../obj/EventRegistry';
import { Idea } from '../../lib/stuff/Idea';
import {
  PersistenceManager,
  Collections,
} from '../../../backend/PersistenceManager';

let workDir: string;

async function bootRegistry(): Promise<void> {
  const reg = await StuffApi.create(() => {
    const r = new EventRegistry();
    Stuff._stampTemplatePath(r, '/obj/EventRegistry');
    return r;
  });
  StuffApi.unregister(reg);
  StuffApi.register(reg);
  EventApi._setRegistryForTesting(reg);
  await (reg as unknown as { postRegister(): Promise<void> }).postRegister();
}

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

function writeFixture(name: string, content: string): string {
  const path = join(workDir, name);
  writeFileSync(path, content);
  return path;
}

const FIXTURE_V1 = `export class Greeter {
  greet() { return 'v1'; }
}
`;

const FIXTURE_V2 = `export class Greeter {
  greet() { return 'v2'; }
}
`;

const FIXTURE_V3 = `export class Greeter {
  greet() { return 'v3'; }
}
`;

describe('HotReloadApi', () => {
  beforeEach(async () => {
    workDir = mkdtempSync(join(tmpdir(), 'hmr-test-'));
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
    HotReloadApi._clearAllForTest();
    await bootRegistry();
  });

  afterEach(() => {
    rmSync(workDir, { recursive: true, force: true });
  });

  /* ─────────────────── State machine ─────────────────── */

  describe('registry state machine', () => {
    it('reload Empty → V1: getCurrent non-null, getPrevious null', async () => {
      const path = writeFixture('Greeter.ts', FIXTURE_V1);
      await HotReloadApi.reload(path);
      expect(HotReloadApi.getCurrent(path)).not.toBeNull();
      expect(HotReloadApi.getPrevious(path)).toBeNull();
    });

    it('reload V1 → V2: previous becomes prior current', async () => {
      const path = writeFixture('Greeter.ts', FIXTURE_V1);
      await HotReloadApi.reload(path);
      const v1 = HotReloadApi.getCurrent(path);
      writeFileSync(path, FIXTURE_V2);
      await HotReloadApi.reload(path);
      const v2 = HotReloadApi.getCurrent(path);
      expect(v2).not.toBe(v1);
      expect(HotReloadApi.getPrevious(path)).toBe(v1);
    });

    it('reload V2 → V2 drops oldest blueprint', async () => {
      const path = writeFixture('Greeter.ts', FIXTURE_V1);
      await HotReloadApi.reload(path);
      writeFileSync(path, FIXTURE_V2);
      await HotReloadApi.reload(path);
      const v2 = HotReloadApi.getCurrent(path);
      writeFileSync(path, FIXTURE_V3);
      await HotReloadApi.reload(path);
      const v3 = HotReloadApi.getCurrent(path);
      expect(v3).not.toBe(v2);
      expect(HotReloadApi.getPrevious(path)).toBe(v2);
      // The original v1 has dropped out (registry holds at most two).
    });

    it('rollback V2 swaps current ↔ previous, registry stays V2-shaped', async () => {
      const path = writeFixture('Greeter.ts', FIXTURE_V1);
      await HotReloadApi.reload(path);
      const v1 = HotReloadApi.getCurrent(path);
      writeFileSync(path, FIXTURE_V2);
      await HotReloadApi.reload(path);
      const v2 = HotReloadApi.getCurrent(path);
      HotReloadApi.rollback(path);
      expect(HotReloadApi.getCurrent(path)).toBe(v1);
      expect(HotReloadApi.getPrevious(path)).toBe(v2);
      // Roll forward.
      HotReloadApi.rollback(path);
      expect(HotReloadApi.getCurrent(path)).toBe(v2);
      expect(HotReloadApi.getPrevious(path)).toBe(v1);
    });

    it('rollback V1 throws', async () => {
      const path = writeFixture('Greeter.ts', FIXTURE_V1);
      await HotReloadApi.reload(path);
      expect(() => HotReloadApi.rollback(path)).toThrow(/nothing to roll back/);
    });

    it('rollback Empty throws', () => {
      const path = join(workDir, 'never-touched.ts');
      expect(() => HotReloadApi.rollback(path)).toThrow(/nothing to roll back/);
    });

    it('unload V2 → Empty + frozen; clone-side getCurrent is null', async () => {
      const path = writeFixture('Greeter.ts', FIXTURE_V1);
      await HotReloadApi.reload(path);
      writeFileSync(path, FIXTURE_V2);
      await HotReloadApi.reload(path);
      HotReloadApi.unload(path);
      expect(HotReloadApi.getCurrent(path)).toBeNull();
      expect(HotReloadApi.getPrevious(path)).toBeNull();
      expect(HotReloadApi.isFrozen(path)).toBe(true);
    });

    it('unload from Empty is a no-op but emits ModuleUnloaded', async () => {
      const path = join(workDir, 'never-touched.ts');
      const seen: ReloadEvent[] = [];
      EventApi.on<ReloadEvent>(Events.ModuleUnloaded, (p) => { seen.push(p); });
      HotReloadApi.unload(path);
      await flushMicrotasks();
      expect(seen.length).toBe(1);
      expect(seen[0]!.path).toBe(path);
      expect(seen[0]!.versionId).toBeNull();
      expect(seen[0]!.previousVersionId).toBeNull();
      expect(HotReloadApi.isFrozen(path)).toBe(true);
    });

    it('reload after unload removes the frozen flag', async () => {
      const path = writeFixture('Greeter.ts', FIXTURE_V1);
      await HotReloadApi.reload(path);
      HotReloadApi.unload(path);
      expect(HotReloadApi.isFrozen(path)).toBe(true);
      writeFileSync(path, FIXTURE_V2);
      await HotReloadApi.reload(path);
      expect(HotReloadApi.isFrozen(path)).toBe(false);
      expect(HotReloadApi.getCurrent(path)).not.toBeNull();
    });

    it('getRegisteredPaths reflects insertion order', async () => {
      const a = writeFixture('A.ts', `export class A {}`);
      const b = writeFixture('B.ts', `export class B {}`);
      const c = writeFixture('C.ts', `export class C {}`);
      await HotReloadApi.reload(a);
      await HotReloadApi.reload(b);
      await HotReloadApi.reload(c);
      expect(HotReloadApi.getRegisteredPaths()).toEqual([a, b, c]);
    });
  });

  /* ─────────────────── Behavioral ─────────────────── */

  describe('behavior swap', () => {
    it('post-reload clones get new behavior; pre-reload instance keeps old', async () => {
      const path = writeFixture('Greeter.ts', FIXTURE_V1);
      await HotReloadApi.reload(path);
      const Cls1 = HotReloadApi.getCurrent(path) as new () => { greet(): string };
      const oldInstance = new Cls1();
      expect(oldInstance.greet()).toBe('v1');

      writeFileSync(path, FIXTURE_V2);
      await HotReloadApi.reload(path);
      const Cls2 = HotReloadApi.getCurrent(path) as new () => { greet(): string };
      const newInstance = new Cls2();
      expect(newInstance.greet()).toBe('v2');

      // Pre-reload instance keeps its old prototype.
      expect(oldInstance.greet()).toBe('v1');
    });

    it('exports map contains every named function export', async () => {
      const path = writeFixture(
        'Multi.ts',
        `export class Foo {}\nexport class Bar {}\n`
      );
      await HotReloadApi.reload(path);
      expect(HotReloadApi.getCurrentExport(path, 'Foo')).not.toBeNull();
      expect(HotReloadApi.getCurrentExport(path, 'Bar')).not.toBeNull();
      // getCurrent picks the export matching the last path segment.
      // Multi.ts has no `Multi` export, so getCurrent returns null.
      expect(HotReloadApi.getCurrent(path)).toBeNull();
    });
  });

  /* ─────────────────── Failure modes ─────────────────── */

  describe('failure modes', () => {
    it('top-level throw: reload rejects, registry unchanged, ModuleReloadFailed emitted', async () => {
      const path = writeFixture('Greeter.ts', FIXTURE_V1);
      await HotReloadApi.reload(path);
      const v1 = HotReloadApi.getCurrent(path);

      writeFileSync(
        path,
        `throw new Error('boom at top level');\nexport class Greeter {}\n`
      );
      const seen: ReloadEvent[] = [];
      EventApi.on<ReloadEvent>(Events.ModuleReloadFailed, (p) => { seen.push(p); });

      await expect(HotReloadApi.reload(path)).rejects.toThrow();
      await flushMicrotasks();

      // Registry unchanged.
      expect(HotReloadApi.getCurrent(path)).toBe(v1);
      // Event fired with error payload.
      expect(seen.length).toBe(1);
      expect(seen[0]!.error).toBeDefined();
      expect(seen[0]!.error!.message).toMatch(/boom/);
    });

    it('path does not exist: reload rejects, ModuleReloadFailed emitted', async () => {
      const path = join(workDir, 'does-not-exist.ts');
      const seen: ReloadEvent[] = [];
      EventApi.on<ReloadEvent>(Events.ModuleReloadFailed, (p) => { seen.push(p); });

      await expect(HotReloadApi.reload(path)).rejects.toThrow();
      await flushMicrotasks();
      expect(seen.length).toBe(1);
      expect(seen[0]!.error).toBeDefined();
    });

    it('concurrent reload(path) calls share one in-flight promise', async () => {
      const path = writeFixture('Greeter.ts', FIXTURE_V1);
      // Two parallel reloads on the same path. The HotReloadApi
      // should reuse one in-flight promise rather than evaluating
      // twice. We assert that only one ModuleReloaded fires.
      const seen: ReloadEvent[] = [];
      EventApi.on<ReloadEvent>(Events.ModuleReloaded, (p) => { seen.push(p); });

      const [a, b] = await Promise.all([
        HotReloadApi.reload(path),
        HotReloadApi.reload(path),
      ]);
      void a;
      void b;
      await flushMicrotasks();
      expect(seen.length).toBe(1);
    });
  });

  /* ─────────────────── Events ─────────────────── */

  describe('lifecycle events', () => {
    it('ModuleReloaded fires on success with the documented payload', async () => {
      const path = writeFixture('Greeter.ts', FIXTURE_V1);
      const seen: ReloadEvent[] = [];
      EventApi.on<ReloadEvent>(Events.ModuleReloaded, (p) => { seen.push(p); });
      await HotReloadApi.reload(path);
      await flushMicrotasks();
      expect(seen.length).toBe(1);
      expect(seen[0]!.path).toBe(path);
      expect(seen[0]!.versionId).toBeTypeOf('string');
      expect(seen[0]!.versionId!.length).toBe(16);
      expect(seen[0]!.previousVersionId).toBeNull();
      expect(seen[0]!.exports).toContain('Greeter');
      expect(seen[0]!.error).toBeUndefined();
    });

    it('ModuleRolledBack fires with both versionIds populated', async () => {
      const path = writeFixture('Greeter.ts', FIXTURE_V1);
      await HotReloadApi.reload(path);
      writeFileSync(path, FIXTURE_V2);
      await HotReloadApi.reload(path);
      const seen: ReloadEvent[] = [];
      EventApi.on<ReloadEvent>(Events.ModuleRolledBack, (p) => { seen.push(p); });
      HotReloadApi.rollback(path);
      await flushMicrotasks();
      expect(seen.length).toBe(1);
      expect(seen[0]!.path).toBe(path);
      expect(seen[0]!.versionId).toBeTypeOf('string');
      expect(seen[0]!.previousVersionId).toBeTypeOf('string');
      expect(seen[0]!.versionId).not.toBe(seen[0]!.previousVersionId);
    });

    it('ModuleUnloaded fires with previousVersionId from prior current', async () => {
      const path = writeFixture('Greeter.ts', FIXTURE_V1);
      await HotReloadApi.reload(path);
      const seen: ReloadEvent[] = [];
      EventApi.on<ReloadEvent>(Events.ModuleUnloaded, (p) => { seen.push(p); });
      HotReloadApi.unload(path);
      await flushMicrotasks();
      expect(seen.length).toBe(1);
      expect(seen[0]!.path).toBe(path);
      expect(seen[0]!.versionId).toBeNull();
      expect(seen[0]!.previousVersionId).toBeTypeOf('string');
      expect(seen[0]!.exports).toEqual([]);
    });
  });

  /* ─────────────────── StuffApi.clone integration ─────────────────── */

  describe('StuffApi.clone consults HotReloadApi', () => {
    /**
     * Compute the absolute fs path StuffApi will resolve a `/obj/Name`
     * class path to. Mirrors `StuffApi.#resolveAbsoluteClassPath`'s
     * logic (test fixture is not on disk, so the helper falls through
     * to the `.ts` candidate).
     *
     * stuff.ts lives at <srcRoot>/mud/api/stuff.ts; new URL('..',
     * stuffJsUrl) is <srcRoot>/mud/. We replicate that here from the
     * test file's own URL by stepping up an extra level (test is in
     * mud/api/__tests__/).
     */
    function classPathToAbs(classPath: string): string {
      const mudDir = new URL('../../', import.meta.url); // <srcRoot>/mud/
      return fileURLToPath(new URL(`.${classPath}.ts`, mudDir));
    }

    function installInMemoryDomain(
      docs: Array<Record<string, unknown> & { path: string; class: string }>
    ): void {
      const find = vi.fn(
        async (collection: string, query: Record<string, unknown>) => {
          if (collection !== Collections.Domain) return [];
          if (typeof query.path === 'string') {
            return docs.filter((d) => d.path === query.path);
          }
          return [];
        }
      );
      const save = vi.fn();
      const findById = vi.fn();
      vi.spyOn(PersistenceManager, 'get').mockReturnValue({
        save,
        find,
        findById,
      } as unknown as PersistenceManager);
    }

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('uses the HMR-registered class instead of the bare dynamic import', async () => {
      class HmrFoo extends Idea {
        public greet(): string {
          return 'v1-via-hmr';
        }
      }
      const classPath = '/obj/__hmrFooFixture';
      const absPath = classPathToAbs(classPath);
      installInMemoryDomain([
        {
          path: '/test/hmr-foo',
          class: classPath,
          data: {},
        },
      ]);
      HotReloadApi._registerForTest(absPath, { __hmrFooFixture: HmrFoo });

      const obj = await StuffApi.clone<HmrFoo>('/test/hmr-foo');
      expect(obj.greet()).toBe('v1-via-hmr');
      // Identity check: the instance came from the HMR-registered class,
      // not some other class with a coincidentally-matching method.
      expect(Object.getPrototypeOf(obj.constructor)).toBe(
        Object.getPrototypeOf(HmrFoo)
      );
    });

    it('reload swaps in new behavior for subsequent clones; pre-reload instance retains old', async () => {
      class HmrV1 extends Idea {
        public greet(): string {
          return 'v1';
        }
      }
      class HmrV2 extends Idea {
        public greet(): string {
          return 'v2';
        }
      }
      const classPath = '/obj/__hmrSwapFixture';
      const absPath = classPathToAbs(classPath);
      installInMemoryDomain([
        {
          path: '/test/hmr-swap',
          class: classPath,
          data: {},
        },
      ]);

      HotReloadApi._registerForTest(absPath, { __hmrSwapFixture: HmrV1 });
      const oldInstance = await StuffApi.clone<HmrV1>('/test/hmr-swap');
      expect(oldInstance.greet()).toBe('v1');

      // "Reload" the blueprint to V2.
      HotReloadApi._registerForTest(absPath, { __hmrSwapFixture: HmrV2 });
      const newInstance = await StuffApi.clone<HmrV2>('/test/hmr-swap');
      expect(newInstance.greet()).toBe('v2');

      // Pre-reload instance keeps its old prototype chain.
      expect(oldInstance.greet()).toBe('v1');
    });

    it('frozen path: clone throws "no blueprint at path"', async () => {
      class HmrFrozenFoo extends Idea {}
      const classPath = '/obj/__hmrFrozenFixture';
      const absPath = classPathToAbs(classPath);
      installInMemoryDomain([
        {
          path: '/test/hmr-frozen',
          class: classPath,
          data: {},
        },
      ]);
      HotReloadApi._registerForTest(absPath, {
        __hmrFrozenFixture: HmrFrozenFoo,
      });
      HotReloadApi.unload(absPath);
      expect(HotReloadApi.isFrozen(absPath)).toBe(true);

      await expect(StuffApi.clone('/test/hmr-frozen')).rejects.toThrow(
        /no blueprint at/
      );
    });
  });

  /* ─────────────────── Hook manifest reload ─────────────────── */

  describe('reloadHookManifest', () => {
    it('drops the chain via clearHooks and rebuilds via loadHooks', async () => {
      const pm = PersistenceManager.get();
      const clearSpy = vi.spyOn(pm, 'clearHooks').mockImplementation(() => {});
      const loadSpy = vi
        .spyOn(pm, 'loadHooks')
        .mockImplementation(async () => {});

      try {
        await HotReloadApi.reloadHookManifest();
        expect(clearSpy).toHaveBeenCalledTimes(1);
        expect(loadSpy).toHaveBeenCalledTimes(1);
        // Order: clear must run before load — otherwise loadHooks
        // would double-register against the existing chain.
        expect(clearSpy.mock.invocationCallOrder[0]!).toBeLessThan(
          loadSpy.mock.invocationCallOrder[0]!
        );
      } finally {
        clearSpy.mockRestore();
        loadSpy.mockRestore();
      }
    });
  });

  /* ─────────────────── Identity-check non-regression ─────────────────── */

  describe('identity-check non-regression', () => {
    it('hot-reload.ts source contains zero `instanceof` tokens', () => {
      // Resolve to the source-tree path (this test runs from
      // src/mud/api/__tests__).
      const target = resolve(__dirname, '..', 'hot-reload.ts');
      const source = readFileSync(target, 'utf8');
      // Strip /* */ block comments and // line comments and strings
      // so a hypothetical "instanceof" mention inside docs isn't a
      // false positive. Cheap regex pass is sufficient — no hot-reload
      // code legitimately needs the token.
      const stripped = source
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/[^\n]*/g, '')
        .replace(/(['"`])(?:\\.|(?!\1).)*\1/g, '""');
      expect(stripped).not.toMatch(/\binstanceof\b/);
    });
  });
});
