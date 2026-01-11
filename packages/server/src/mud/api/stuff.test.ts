/**
 * Tests for StuffApi
 *
 * Covers:
 * - Class path validation (security)
 * - Object creation and initialization lifecycle
 * - Object registration and lookup
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { StuffApi } from './stuff.js';
import { Stuff } from '../lib/stuff/Stuff.js';

describe('StuffApi', () => {
  describe('validateClassPath', () => {
    // Access private method for testing using bracket notation
    const validateClassPath = (path: string) =>
      (StuffApi as any).validateClassPath(path);

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
    // Test class without initialize
    class SimpleStuff extends Stuff {}

    // Test class with synchronous initialize
    class InitializableStuff extends Stuff {
      initializeCalled = false;

      async initialize() {
        this.initializeCalled = true;
      }
    }

    // Test class with async initialize that takes time
    class AsyncStuff extends Stuff {
      loadedData: string = '';

      async initialize() {
        // Simulate async operation
        await new Promise((resolve) => setTimeout(resolve, 10));
        this.loadedData = 'loaded';
      }
    }

    beforeEach(() => {
      // Clear the registry before each test
      const objectsById = (StuffApi as any).objectsById as Map<string, Stuff>;
      objectsById.clear();
    });

    it('should create object without initialize method', async () => {
      const obj = await StuffApi.create(() => new SimpleStuff());

      expect(obj).toBeInstanceOf(SimpleStuff);
      expect(obj.stuffId).toBeDefined();
      expect(obj.isDestroyed()).toBe(false);
    });

    it('should call initialize if method exists', async () => {
      const obj = await StuffApi.create(() => new InitializableStuff());

      expect(obj.initializeCalled).toBe(true);
    });

    it('should wait for async initialize to complete', async () => {
      const obj = await StuffApi.create(() => new AsyncStuff());

      expect(obj.loadedData).toBe('loaded');
    });

    it('should register object after initialization', async () => {
      const obj = await StuffApi.create(() => new InitializableStuff());

      // Verify object is registered
      const found = StuffApi.findById(obj.stuffId);
      expect(found).toBe(obj);
    });

    it('should register object in correct order (initialize → register)', async () => {
      let registeredDuringInit = false;

      class OrderTestStuff extends Stuff {
        async initialize() {
          // Check if we're registered yet (should not be)
          registeredDuringInit = !!StuffApi.findById(this.stuffId);
        }
      }

      const obj = await StuffApi.create(() => new OrderTestStuff());

      expect(registeredDuringInit).toBe(false); // Not registered during init
      expect(StuffApi.findById(obj.stuffId)).toBe(obj); // But registered after
    });

    it('should generate unique stuffId for each object', async () => {
      const obj1 = await StuffApi.create(() => new SimpleStuff());
      const obj2 = await StuffApi.create(() => new SimpleStuff());

      expect(obj1.stuffId).not.toBe(obj2.stuffId);
    });
  });

  describe('register and findById', () => {
    class TestStuff extends Stuff {}

    beforeEach(() => {
      const objectsById = (StuffApi as any).objectsById as Map<string, Stuff>;
      objectsById.clear();
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
});
