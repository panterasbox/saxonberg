/**
 * Tests for StuffApi
 *
 * Covers:
 * - Class path validation (security)
 * - Object creation and initialization lifecycle
 * - Object registration and lookup
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { StuffApi } from '../stuff';
import { Stuff } from '../../lib/stuff/Stuff';
import { PostRegistrationMixin } from '../../lib/stuff/PostRegistration';
import { makeStuff } from '../../lib/security/__tests__/test-setup';
import { Idea } from "../../lib/stuff/Idea";

describe('StuffApi', () => {
  describe('validateClassPath', () => {
    // Deliberate test seam — see StuffApi._validateClassPath().
    const validateClassPath = (path: string) => StuffApi._validateClassPath(path);

    it('should accept valid /obj/ paths', () => {
      expect(() => validateClassPath('/obj/Avatar')).not.toThrow();
      expect(() => validateClassPath('/obj/Room')).not.toThrow();
      expect(() => validateClassPath('/obj/subdir/Item')).not.toThrow();
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
      expect(() => validateClassPath('/obj/../../../etc/passwd')).toThrow(
        'cannot contain ..'
      );
      expect(() => validateClassPath('/lib/../obj/Avatar')).toThrow(
        'cannot contain ..'
      );
      expect(() => validateClassPath('/obj/../../dangerous')).toThrow(
        'cannot contain ..'
      );
    });

    it('should reject paths outside /obj/ and /lib/', () => {
      expect(() => validateClassPath('/etc/passwd')).toThrow(
        'must start with /obj/ or /lib/'
      );
      expect(() => validateClassPath('/home/user/malicious')).toThrow(
        'must start with /obj/ or /lib/'
      );
      expect(() => validateClassPath('/tmp/exploit')).toThrow(
        'must start with /obj/ or /lib/'
      );
    });

    it('should return the normalized path for valid paths', () => {
      expect(validateClassPath('/obj/Avatar')).toBe('/obj/Avatar');
      expect(validateClassPath('/lib/stuff/Stuff')).toBe('/lib/stuff/Stuff');
    });
  });

  describe('create', () => {
    // Test class without PostRegistrationMixin (no postRegister hook)
    class SimpleStuff extends Idea {}

    // Test class composing PostRegistrationMixin
    class InitializableStuff extends PostRegistrationMixin(Idea) {
      initializeCalled = false;

      override async postRegister() {
        this.initializeCalled = true;
      }
    }

    class AsyncStuff extends PostRegistrationMixin(Idea) {
      loadedData: string = '';

      override async postRegister() {
        await new Promise((resolve) => setTimeout(resolve, 10));
        this.loadedData = 'loaded';
      }
    }

    beforeEach(() => {
      // Clear the registry before each test
      StuffApi.clearAll();
    });

    it('should create object without postRegister hook', async () => {
      const obj = await StuffApi.create(() => new SimpleStuff());

      expect(obj).toBeInstanceOf(SimpleStuff);
      expect(obj.stuffId).toBeDefined();
      expect(obj.isDestroyed()).toBe(false);
    });

    it('should call postRegister when PostRegistrationMixin is composed', async () => {
      const obj = await StuffApi.create(() => new InitializableStuff());

      expect(obj.initializeCalled).toBe(true);
    });

    it('should wait for async postRegister to complete', async () => {
      const obj = await StuffApi.create(() => new AsyncStuff());

      expect(obj.loadedData).toBe('loaded');
    });

    it('should register object after postRegister', async () => {
      const obj = await StuffApi.create(() => new InitializableStuff());

      const found = StuffApi.findById(obj.stuffId);
      expect(found).toBe(obj);
    });

    it('should register object in correct order (register → postRegister)', async () => {
      let registeredDuringInit = false;

      class OrderTestStuff extends PostRegistrationMixin(Idea) {
        override async postRegister() {
          // Registration happens before postRegister() so recursive resolvers
          // (e.g. exit hydration that points back to this object) can see
          // the in-flight instance.
          registeredDuringInit = !!StuffApi.findById(this.stuffId);
        }
      }

      const obj = await StuffApi.create(() => new OrderTestStuff());

      expect(registeredDuringInit).toBe(true);
      expect(StuffApi.findById(obj.stuffId)).toBe(obj);
    });

    it('should unregister the object if postRegister() throws', async () => {
      class FailingInitStuff extends PostRegistrationMixin(Idea) {
        override async postRegister() {
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

    it('should thread context into postRegister(context)', async () => {
      class ContextStuff extends PostRegistrationMixin(Idea) {
        received: unknown = undefined;

        override async postRegister(context?: unknown) {
          this.received = context;
        }
      }

      const payload = { user: { _id: 'u1' }, playerId: 'p1' };
      const obj = await StuffApi.create(() => new ContextStuff(), payload);

      expect(obj.received).toBe(payload);
    });

    it('should pass undefined when no context is supplied', async () => {
      class ContextStuff extends PostRegistrationMixin(Idea) {
        received: unknown = 'sentinel';

        override async postRegister(context?: unknown) {
          this.received = context;
        }
      }

      const obj = await StuffApi.create(() => new ContextStuff());

      expect(obj.received).toBeUndefined();
    });
  });

  describe('createSync', () => {
    class SimpleStuff extends Idea {}

    class NeedsAsyncSetup extends PostRegistrationMixin(Idea) {
      override async postRegister() {
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

    it('throws when given a Stuff that composes PostRegistrationMixin', () => {
      expect(() => StuffApi.createSync(() => new NeedsAsyncSetup())).toThrow(
        /composes PostRegistrationMixin and needs async setup/
      );
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
      (obj as unknown as { templatePath?: string }).templatePath = path;
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
    it('throws on a self-referencing template (hydratorClass = self)', async () => {
      // Use PersistentHydrator (a real on-disk class) but stub its
      // Template to falsely claim it hydrates itself, creating a
      // one-step cycle. clone() should bail before the recursion
      // stack-overflows.
      const { Template } = await import('../../lib/stuff/Template');
      const { vi } = await import('vitest');
      vi.spyOn(Template, 'findByPath').mockImplementation(
        async (path: string) => {
          if (path === '/lib/persistence/PersistentHydrator') {
            const t = await StuffApi.create(() => new Template());
            t.path = path;
            t.class = '/lib/persistence/PersistentHydrator';
            t.hydratorClass = '/lib/persistence/PersistentHydrator';
            t.data = {};
            return t;
          }
          return null;
        }
      );

      await expect(
        StuffApi.clone('/lib/persistence/PersistentHydrator')
      ).rejects.toThrow(/circular template dependency/);

      vi.restoreAllMocks();
    });
  });
});
