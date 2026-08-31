/**
 * backend-store — the backend `PersistenceManager` surfaced for CONTENT
 * pack tests.
 *
 * A pack's integration tests mock the store exactly the way kernel
 * tests do (`vi.spyOn(PersistenceManager, 'get')` over an in-memory
 * store), but `backend/**` is deliberately not on the server's
 * `exports` map — the pack import profile is `mud/lib`, `mud/api`,
 * `mud/platform` and `test-bootstrap` only. This lib-side test helper
 * re-exports the two names those mocks need, so a locality pack's
 * standup test reaches the same seam by the exported path
 * (`@saxonberg/server/mud/lib/persistence/__tests__/backend-store`).
 *
 * Test-only, white-box (the `quantity-marshaller-test-helpers` shape);
 * never imported by production code.
 */
export {
  PersistenceManager,
  Collections,
} from "../../../../backend/PersistenceManager";

import { vi } from "vitest";
import {
  PersistenceManager as PM,
  Collections as Cols,
} from "../../../../backend/PersistenceManager";

/** A template-shaped doc for the in-memory content store. */
export type Doc = Record<string, unknown> & {
  _id?: string;
  path: string;
  class: string;
  hydratorClass?: string;
  data: Record<string, unknown>;
};

/**
 * Install an in-memory PersistenceManager backed by `docs` — the
 * content-collection stub every locality standup test mocks the store
 * with. Graduated from the lounge fixtures when the locality packs took
 * their tests with them (residences wave 0).
 */
export function installStore(docs: Doc[]): Doc[] {
  const store: Doc[] = docs.map((d, i) => ({ _id: String(i + 1), ...d }));
  const save = vi.fn(async (_c: string, doc: Doc) => {
    const copy = { ...doc };
    if (copy._id) {
      const idx = store.findIndex((d) => d._id === copy._id);
      if (idx >= 0) store[idx] = copy;
      else store.push(copy);
      return copy._id!;
    }
    copy._id = String(store.length + 1);
    store.push(copy);
    return copy._id;
  });
  const find = vi.fn(
    async (collection: string, query: Record<string, unknown>) => {
      if (collection !== Cols.Content) return [];
      if (typeof query.path === "string") {
        return store.filter((d) => d.path === query.path);
      }
      return store.slice();
    },
  );
  const findById = vi.fn(async (_c: string, id: string) => {
    return store.find((d) => d._id === id) ?? null;
  });
  vi.spyOn(PM, "get").mockReturnValue({
    save,
    find,
    findById,
  } as unknown as PM);
  return store;
}
