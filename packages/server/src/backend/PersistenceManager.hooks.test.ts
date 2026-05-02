import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  PersistenceManager,
  HookReentryError,
  type AroundSaveFn,
  type AroundDeleteFn,
} from './PersistenceManager';

/**
 * Hook-dispatch unit tests.
 *
 * The chain composition logic in `dispatchSave` / `dispatchDelete` is
 * collection-agnostic — exercising it does NOT require a live MongoDB
 * connection. We stub `getCollection` to a tiny in-memory adapter so the
 * terminal `next` resolves to a deterministic id, then assert on the order
 * and effects of registered hooks.
 */
function installFakeCollection(pm: PersistenceManager): {
  upserts: Array<{ filter: unknown; update: unknown }>;
  inserts: unknown[];
  deletes: unknown[];
} {
  const upserts: Array<{ filter: unknown; update: unknown }> = [];
  const inserts: unknown[] = [];
  const deletes: unknown[] = [];
  const fakeCollection = {
    insertOne: vi.fn(async (doc: unknown) => {
      inserts.push(doc);
      return { insertedId: { toString: () => 'inserted-id' } };
    }),
    updateOne: vi.fn(async (filter: unknown, update: unknown) => {
      upserts.push({ filter, update });
      return {};
    }),
    deleteOne: vi.fn(async (filter: unknown) => {
      deletes.push(filter);
      return {};
    }),
  };
  vi.spyOn(pm, 'getCollection').mockReturnValue(
    fakeCollection as unknown as ReturnType<PersistenceManager['getCollection']>
  );
  return { upserts, inserts, deletes };
}

describe('PersistenceManager hook dispatch', () => {
  let pm: PersistenceManager;

  beforeEach(() => {
    pm = PersistenceManager.get();
    pm.clearHooks();
  });

  it('terminal save runs the MongoDB write when no hooks are registered', async () => {
    const { inserts } = installFakeCollection(pm);
    const id = await pm.save('test', { foo: 'bar' });
    expect(id).toBe('inserted-id');
    expect(inserts).toEqual([{ foo: 'bar' }]);
  });

  it('runs registered save hooks in registration order', async () => {
    installFakeCollection(pm);
    const order: string[] = [];

    const a: AroundSaveFn = async (_c, doc, next) => {
      order.push('a-pre');
      const r = await next(doc);
      order.push('a-post');
      return r;
    };
    const b: AroundSaveFn = async (_c, doc, next) => {
      order.push('b-pre');
      const r = await next(doc);
      order.push('b-post');
      return r;
    };

    pm.registerHook('test', 'save', a);
    pm.registerHook('test', 'save', b);

    await pm.save('test', { x: 1 });
    expect(order).toEqual(['a-pre', 'b-pre', 'b-post', 'a-post']);
  });

  it('a hook may transform the document passed to next', async () => {
    const { inserts } = installFakeCollection(pm);

    const stamp: AroundSaveFn = async (_c, doc, next) =>
      next({ ...doc, stamped: true });

    pm.registerHook('test', 'save', stamp);

    await pm.save('test', { x: 1 });
    expect(inserts).toEqual([{ x: 1, stamped: true }]);
  });

  it('a hook can short-circuit by not calling next', async () => {
    const { inserts } = installFakeCollection(pm);

    const block: AroundSaveFn = async () => 'short-circuit-id';
    pm.registerHook('test', 'save', block);

    const id = await pm.save('test', { x: 1 });
    expect(id).toBe('short-circuit-id');
    expect(inserts).toEqual([]);
  });

  it('throws HookReentryError when a save hook re-enters its own slot', async () => {
    installFakeCollection(pm);

    const reentrant: AroundSaveFn = async (c, _doc, _next) => {
      // Re-enter the same (collection, save) slot — this must throw.
      return pm.save(c, { y: 1 });
    };
    pm.registerHook('test', 'save', reentrant);

    await expect(pm.save('test', { x: 1 })).rejects.toBeInstanceOf(
      HookReentryError
    );
  });

  it('a save hook MAY recurse into a different collection', async () => {
    installFakeCollection(pm);

    const cross: AroundSaveFn = async (_c, doc, next) => {
      await pm.save('other', { also: true });
      return next(doc);
    };
    pm.registerHook('test', 'save', cross);

    await expect(pm.save('test', { x: 1 })).resolves.toBe('inserted-id');
  });

  it('runs registered delete hooks in registration order', async () => {
    installFakeCollection(pm);
    // Stub findById too — the delete primitive uses it via ObjectId logic
    // only when the test reaches Mongo. For dispatch tests we don't.
    const order: string[] = [];

    const a: AroundDeleteFn = async (_c, id, next) => {
      order.push('a-pre');
      await next(id);
      order.push('a-post');
    };
    const b: AroundDeleteFn = async (_c, id, next) => {
      order.push('b-pre');
      await next(id);
      order.push('b-post');
    };

    pm.registerHook('test', 'delete', a);
    pm.registerHook('test', 'delete', b);

    // Use a 24-hex-char id so ObjectId can parse it.
    await pm.delete('test', '507f1f77bcf86cd799439011');
    expect(order).toEqual(['a-pre', 'b-pre', 'b-post', 'a-post']);
  });

  it('throws HookReentryError when a delete hook re-enters its own slot', async () => {
    installFakeCollection(pm);

    const reentrant: AroundDeleteFn = async (c, id) => {
      await pm.delete(c, id);
    };
    pm.registerHook('test', 'delete', reentrant);

    await expect(
      pm.delete('test', '507f1f77bcf86cd799439011')
    ).rejects.toBeInstanceOf(HookReentryError);
  });

  it('clears the active-slot guard after a thrown hook so subsequent calls work', async () => {
    installFakeCollection(pm);

    const onceThrows: AroundSaveFn = async () => {
      throw new Error('boom');
    };
    pm.registerHook('test', 'save', onceThrows);

    await expect(pm.save('test', { x: 1 })).rejects.toThrow('boom');

    // Drop the throwing hook and try again — the slot must not be stuck.
    pm.clearHooks();
    await expect(pm.save('test', { x: 2 })).resolves.toBe('inserted-id');
  });
});
