/**
 * Tests for StuffApi
 *
 * Covers:
 * - Class path validation (security)
 * - Object creation and initialization lifecycle
 * - Object registration and lookup
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import { StuffApi } from '../stuff';
import { Stuff } from '../../lib/stuff/Stuff';
import { ProxyApi } from '../proxy';
import { makeStuff } from '../../lib/security/__tests__/test-setup';
import { Idea } from "../../lib/stuff/Idea";

describe('StuffApi', () => {
  describe('validateClassPath', () => {
    // Deliberate test seam — see StuffApi._validateClassPath().
    const validateClassPath = (path: string) => StuffApi._validateClassPath(path);

    it('should accept valid /platform/ paths', () => {
      expect(() => validateClassPath('/platform/agent/Avatar')).not.toThrow();
      expect(() => validateClassPath('/platform/location/SingletonCartesianLocation')).not.toThrow();
      expect(() => validateClassPath('/platform/thing/subdir/Item')).not.toThrow();
    });

    it('should accept valid /lib/ paths', () => {
      expect(() => validateClassPath('/lib/stuff/Stuff')).not.toThrow();
      expect(() => validateClassPath('/lib/identity/User')).not.toThrow();
      expect(() => validateClassPath('/lib/connection/Interactive')).not.toThrow();
    });

    it('should reject paths not starting with /', () => {
      expect(() => validateClassPath('obj/Avatar')).toThrow('must start with /');
      expect(() => validateClassPath('Avatar')).toThrow('must start with /');
    });

    it('should reject paths with directory traversal', () => {
      expect(() => validateClassPath('/platform/../../../etc/passwd')).toThrow(
        'cannot contain ..'
      );
      expect(() => validateClassPath('/lib/../platform/agent/Avatar')).toThrow(
        'cannot contain ..'
      );
      expect(() => validateClassPath('/platform/../../dangerous')).toThrow(
        'cannot contain ..'
      );
    });

    it('a path outside every namespace cannot escape the mud tree — it resolves INSIDE it and loads nothing', async () => {
      // No prefix allowlist: the leading `/` + no `..` rules pin every
      // class path under `<src>/mud/`, and resolution decides the rest.
      for (const p of ['/etc/passwd', '/home/user/malicious', '/tmp/exploit']) {
        expect(() => validateClassPath(p)).not.toThrow();
        const { file, origin } = StuffApi.resolveClassFile(p);
        expect(origin).toBe('kernel');
        expect(file.replace(/\\/g, '/')).toMatch(/\/src\/mud\//);
        await expect(StuffApi.loadClassByPath(p)).rejects.toThrow(/failed to import/);
      }
    });

    it('should return the normalized path for valid paths', () => {
      expect(validateClassPath('/platform/agent/Avatar')).toBe('/platform/agent/Avatar');
      expect(validateClassPath('/lib/stuff/Stuff')).toBe('/lib/stuff/Stuff');
    });
  });

  describe('create', () => {
    // Test class that does not override the terminal onCreate hook
    class SimpleStuff extends Idea {}

    // Test class overriding onCreate
    class InitializableStuff extends Idea {
      initializeCalled = false;

      override async onCreate() {
        this.initializeCalled = true;
      }
    }

    class AsyncStuff extends Idea {
      loadedData: string = '';

      override async onCreate() {
        await new Promise((resolve) => setTimeout(resolve, 10));
        this.loadedData = 'loaded';
      }
    }

    beforeEach(() => {
      // Clear the registry before each test
      StuffApi.clearAll();
    });

    it('should create object without onCreate hook', async () => {
      const obj = await StuffApi.create(() => new SimpleStuff());

      expect(obj).toBeInstanceOf(SimpleStuff);
      expect(obj.stuffId).toBeDefined();
      expect(obj.isDestroyed()).toBe(false);
    });

    it('should call onCreate when the class overrides it', async () => {
      const obj = await StuffApi.create(() => new InitializableStuff());

      expect(obj.initializeCalled).toBe(true);
    });

    it('should wait for async onCreate to complete', async () => {
      const obj = await StuffApi.create(() => new AsyncStuff());

      expect(obj.loadedData).toBe('loaded');
    });

    it('should register object after onCreate', async () => {
      const obj = await StuffApi.create(() => new InitializableStuff());

      const found = StuffApi.findById(obj.stuffId);
      expect(found).toBe(obj);
    });

    it('should register object in correct order (register → onCreate)', async () => {
      let registeredDuringInit = false;

      class OrderTestStuff extends Idea {
        override async onCreate() {
          // Registration happens before onCreate() so recursive resolvers
          // (e.g. exit hydration that points back to this object) can see
          // the in-flight instance.
          registeredDuringInit = !!StuffApi.findById(this.stuffId);
        }
      }

      const obj = await StuffApi.create(() => new OrderTestStuff());

      expect(registeredDuringInit).toBe(true);
      expect(StuffApi.findById(obj.stuffId)).toBe(obj);
    });

    it('should unregister the object if onCreate() throws', async () => {
      class FailingInitStuff extends Idea {
        override async onCreate() {
          throw new Error('init failed');
        }
      }

      const obj = makeStuff(() => new FailingInitStuff());
      await expect(StuffApi.create(() => obj)).rejects.toThrow('init failed');

      expect(StuffApi.findById(obj.stuffId)).toBeUndefined();
    });

    it('should generate unique stuffId for each object', async () => {
      const obj1 = await StuffApi.create(() => new SimpleStuff());
      const obj2 = await StuffApi.create(() => new SimpleStuff());

      expect(obj1.stuffId).not.toBe(obj2.stuffId);
    });

    it('should thread context into onCreate(context)', async () => {
      class ContextStuff extends Idea {
        received: unknown = undefined;

        override async onCreate(context?: unknown) {
          this.received = context;
        }
      }

      const payload = { user: { _id: 'u1' }, playerId: 'p1' };
      const obj = await StuffApi.create(() => new ContextStuff(), payload);

      expect(obj.received).toBe(payload);
    });

    it('should pass undefined when no context is supplied', async () => {
      class ContextStuff extends Idea {
        received: unknown = 'sentinel';

        override async onCreate(context?: unknown) {
          this.received = context;
        }
      }

      const obj = await StuffApi.create(() => new ContextStuff());

      expect(obj.received).toBeUndefined();
    });
  });

  describe('createSync', () => {
    class SimpleStuff extends Idea {}

    class NeedsAsyncSetup extends Idea {
      override async onCreate() {
        // would never run via createSync — guardrail should catch it
      }
    }

    beforeEach(() => {
      StuffApi.clearAll();
    });

    it('constructs and registers a Stuff with no async setup', () => {
      const obj = StuffApi.createSync(() => new SimpleStuff());
      expect(obj.stuffId).toBeDefined();
      expect(StuffApi.findById(obj.stuffId)).toBe(obj);
    });

    it('throws when given a Stuff that overrides onCreate', () => {
      expect(() => StuffApi.createSync(() => new NeedsAsyncSetup())).toThrow(
        /overrides onCreate\(\) and needs async setup/
      );
    });

    // ⚠⚠ The guardrail's other arm, and the one that can brick boot. The
    // predicate compares `raw.onCreate` against `Stuff.prototype.onCreate`
    // BEFORE `ProxyApi.wrap`: the proxy's get trap returns a fresh
    // interception wrapper for every callable access, so a comparison on
    // the proxy is ALWAYS unequal and would throw on every `createSync` —
    // taking `singletonSync` and every lazy logic-singleton resolver with
    // it. These two assertions are what prove it is on `raw`.
    it('does NOT throw for a class that merely inherits the terminal', () => {
      expect(() => StuffApi.createSync(() => new SimpleStuff())).not.toThrow();
    });

    it('the proxy would have defeated the comparison (documents why `raw`)', () => {
      const obj = StuffApi.createSync(() => new SimpleStuff());
      // Through the proxy, the method is a fresh wrapper per access …
      expect(obj.onCreate).not.toBe(Stuff.prototype.onCreate);
      // … while the raw target still holds the inherited terminal.
      const raw = (obj as unknown as Record<symbol, unknown>)[
        ProxyApi.RAW_TARGET
      ] as Stuff;
      expect(raw.onCreate).toBe(Stuff.prototype.onCreate);
    });

    it('deferOnCreate bypasses the guardrail', () => {
      expect(() =>
        StuffApi.createSync(() => new NeedsAsyncSetup(), { deferOnCreate: true })
      ).not.toThrow();
    });

    it('does NOT register the object when the guardrail rejects', () => {
      let captured: NeedsAsyncSetup | null = null;
      try {
        StuffApi.createSync(() => {
          captured = new NeedsAsyncSetup();
          return captured;
        });
      } catch {
        // expected
      }
      // The half-initialised object never reached the registry.
      if (captured) {
        expect(StuffApi.findById((captured as NeedsAsyncSetup).stuffId)).toBeUndefined();
      }
    });
  });

  describe('register and findById', () => {
    class TestStuff extends Idea {}

    beforeEach(() => {
      StuffApi.clearAll();
    });

    it('should find object by stuffId after registration', async () => {
      const obj = await StuffApi.create(() => new TestStuff());
      const found = StuffApi.findById(obj.stuffId);

      expect(found).toBe(obj);
    });

    it('should return undefined for non-existent stuffId', () => {
      const found = StuffApi.findById('nonexistent-id');

      expect(found).toBeUndefined();
    });
  });

  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const id1 = StuffApi.generateId();
      const id2 = StuffApi.generateId();

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
    });

    it('should generate non-empty string IDs', () => {
      const id = StuffApi.generateId();

      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });
  });

  describe('findByTemplatePath / findAllByTemplatePath', () => {
    class Stamped extends Idea {}

    function withTemplatePath<T extends Stuff>(obj: T, path: string): T {
      // The `#templatePath` slot is hard-private — direct field
      // assignment is a no-op. Use the caller-gated stamp seam so
      // the slot is set on the raw target before the wrapping
      // Proxy is built. The seam allows `.test.ts` callers; see
      // `Stuff.#stampGateAllowlist`.
      Stuff._stampTemplatePath(obj, path);
      return obj;
    }

    beforeEach(() => {
      StuffApi.clearAll();
    });

    it('returns undefined for an unknown templatePath', () => {
      expect(StuffApi.findByTemplatePath('/obj/Nope')).toBeUndefined();
      expect(StuffApi.findAllByTemplatePath('/obj/Nope')).toEqual([]);
    });

    it('returns the single instance when one exists', async () => {
      const inst = await StuffApi.create(() =>
        withTemplatePath(new Stamped(), '/obj/Single')
      );
      // Need to re-register so the templatePath stamp lands in the index.
      StuffApi.unregister(inst);
      StuffApi.register(inst);
      expect(StuffApi.findByTemplatePath('/obj/Single')).toBe(inst);
      expect(StuffApi.findAllByTemplatePath('/obj/Single')).toEqual([inst]);
    });

    it('throws when more than one instance shares a templatePath', async () => {
      const a = await StuffApi.create(() =>
        withTemplatePath(new Stamped(), '/obj/Multi')
      );
      const b = await StuffApi.create(() =>
        withTemplatePath(new Stamped(), '/obj/Multi')
      );
      StuffApi.unregister(a);
      StuffApi.unregister(b);
      StuffApi.register(a);
      StuffApi.register(b);
      expect(() => StuffApi.findByTemplatePath('/obj/Multi')).toThrow(
        /expected singleton, found 2/
      );
      expect(StuffApi.findAllByTemplatePath('/obj/Multi').sort()).toEqual(
        [a, b].sort()
      );
    });

    it('drops templatePath entries on unregister', async () => {
      const inst = await StuffApi.create(() =>
        withTemplatePath(new Stamped(), '/obj/Removable')
      );
      StuffApi.unregister(inst);
      StuffApi.register(inst);
      expect(StuffApi.findByTemplatePath('/obj/Removable')).toBe(inst);
      StuffApi.unregister(inst);
      expect(StuffApi.findByTemplatePath('/obj/Removable')).toBeUndefined();
    });

    it('drops templatePath entries on destruct', async () => {
      const inst = await StuffApi.create(() =>
        withTemplatePath(new Stamped(), '/obj/Destructable')
      );
      StuffApi.unregister(inst);
      StuffApi.register(inst);
      expect(StuffApi.findByTemplatePath('/obj/Destructable')).toBe(inst);
      StuffApi.destruct(inst);
      expect(StuffApi.findByTemplatePath('/obj/Destructable')).toBeUndefined();
    });

    it('a never-registered Stuff is unfindable by templatePath', () => {
      const inst = withTemplatePath(makeStuff(() => new Stamped()), '/obj/Ghost');
      // makeStuff registers via StuffApi.register, but the stamp wasn't
      // applied before that registration — so the byTemplatePath index
      // has no record. Re-stamp and require an explicit re-register.
      expect(StuffApi.findByTemplatePath('/obj/Ghost')).toBeUndefined();
      void inst;
    });
  });

  describe('clone() cycle detection', () => {
    // ⚠ Each case must start with an EMPTY registry. `singleton()`
    // short-circuits on a cached instance, so an applier left registered
    // by the previous case means the next one never looks its row up —
    // and the "scheduled inside a clone tree" case below arms itself
    // from inside that lookup, so it would pass vacuously with nothing
    // scheduled.
    beforeEach(() => {
      StuffApi.clearAll();
    });

    // ⭐ The terminator is STRUCTURAL since `hydratorClass` retired
    // (2026-10-01): the applier's own row carries `data: {}`, so cloning
    // the applier plans no applier and the recursion cannot start. This
    // test gives that row DATA — the one authoring state that would
    // re-open the cycle — and asserts the guard is still the backstop.
    it('throws on a self-referencing applier row (its own row carries data)', async () => {
      const { Template } = await import('../../lib/stuff/Template');
      const { LeafTemplate } = await import('../../lib/stuff/LeafTemplate');
      const { vi } = await import('vitest');
      vi.spyOn(Template, 'findByPath').mockImplementation(
        async (path: string) => {
          if (path === '/platform/idea/TemplateApplier') {
            const t = new LeafTemplate();
            t.path = path;
            t.setOwn({
              class: '/platform/idea/TemplateApplier',
              data: { shortDescription: 'an applier that applies itself' },
            });
            return t;
          }
          return null;
        }
      );

      await expect(
        StuffApi.clone('/platform/idea/TemplateApplier')
      ).rejects.toThrow(/circular template dependency/);

      vi.restoreAllMocks();
    });

    it('⭐ the applier\'s own EMPTY row terminates with no guard needed', async () => {
      const { Template } = await import('../../lib/stuff/Template');
      const { LeafTemplate } = await import('../../lib/stuff/LeafTemplate');
      const { vi } = await import('vitest');
      vi.spyOn(Template, 'findByPath').mockImplementation(
        async (path: string) => {
          if (path === '/platform/idea/TemplateApplier') {
            const t = new LeafTemplate();
            t.path = path;
            t.setOwn({
              class: '/platform/idea/TemplateApplier',
              data: {},
            });
            return t;
          }
          return null;
        }
      );

      const applier = await StuffApi.clone(
        '/platform/idea/TemplateApplier'
      );
      expect(applier).toBeDefined();

      vi.restoreAllMocks();
    });

    it('a callback scheduled INSIDE a clone tree is a fresh root — two later concurrent clones of one path do not false-trip the guard', async () => {
      // The live-drive race: an NPC's onCreate arms its cadence inside
      // the room's clone tree; the guard's ALS store rode into the timer,
      // so two beats' forced `consign` clones shared one in-flight set and
      // the second threw `circular template dependency`.
      const { Template } = await import('../../lib/stuff/Template');
      const { LeafTemplate } = await import('../../lib/stuff/LeafTemplate');
      const { ScheduleApi } = await import('../schedule');
      const { vi } = await import('vitest');
      const HYDRATOR = '/platform/idea/TemplateApplier';
      const PROP = '/stuff/test/clone-tree/prop';
      const later: Promise<unknown>[] = [];
      let armed = false;
      vi.spyOn(Template, 'findByPath').mockImplementation(
        async (path: string) => {
          if (path === PROP) {
            // A real lookup does I/O; yield a macrotask so the two
            // scheduled clones genuinely overlap in flight.
            await new Promise((r) => setTimeout(r, 5));
            const t = new LeafTemplate();
            t.path = path;
            // ⚠ The `data` is load-bearing for this test now: since
            // `hydratorClass` retired (2026-10-01) the applier is
            // resolved only when there IS data to apply, and the
            // applier lookup is what arms the two scheduled clones
            // below. A `data: {}` row would never reach that branch and
            // the test would pass vacuously with `later` empty.
            t.setOwn({
              class: '/platform/thing/Thing',
              data: { shortDescription: 'a prop' },
            });
            return t;
          }
          if (path === HYDRATOR) {
            if (!armed) {
              armed = true;
              // Armed from INSIDE the first clone's tree (this lookup runs
              // under the guard's store): two concurrent clones later.
              later.push(
                new Promise((res, rej) =>
                  ScheduleApi.schedule(1, () => {
                    StuffApi.clone(PROP).then(res, rej);
                  })
                ),
                new Promise((res, rej) =>
                  ScheduleApi.schedule(1, () => {
                    StuffApi.clone(PROP).then(res, rej);
                  })
                )
              );
            }
            const t = new LeafTemplate();
            t.path = path;
            t.setOwn({ class: HYDRATOR, data: {} });
            return t;
          }
          return null;
        }
      );
      // Real timers: a fake timer fires from the test's own async context
      // and would hide the inherited store this test is about.
      try {
        await StuffApi.clone(PROP);
        expect(later).toHaveLength(2);
        const results = await Promise.all(later);
        expect(results).toHaveLength(2);
      } finally {
        vi.restoreAllMocks();
      }
    });
  });
});
