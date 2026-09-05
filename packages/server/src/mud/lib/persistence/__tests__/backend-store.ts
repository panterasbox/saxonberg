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
  // ⚠⚠ **Every OTHER collection, and it is not optional any more.** This
  // stub used to answer `[]` to every non-content read while happily
  // accepting the writes, and to have no `isConnected` at all. The moment
  // a standup test stood up a character carrying authored `dispositions:`
  // or a dossier, the seeder asked whether persistence was connected and
  // the stub threw `isConnected is not a function` — six locality tests,
  // all of them about doors and exits, failing on a ledger they never
  // meant to touch.
  //
  // ⭐ Keeping the rows means a seeder's own idempotency check
  // ("skip if a claim already exists") reads back what it wrote, so a
  // re-standup behaves here the way it behaves in the world. A stub that
  // swallows writes and returns nothing makes every write path look
  // idempotent and every read path look empty.
  const others = new Map<string, Doc[]>();
  const bucket = (collection: string): Doc[] => {
    const existing = others.get(collection);
    if (existing) return existing;
    const fresh: Doc[] = [];
    others.set(collection, fresh);
    return fresh;
  };
  const save = vi.fn(async (collection: string, doc: Doc) => {
    const target = collection === Cols.Content ? store : bucket(collection);
    const copy = { ...doc };
    if (copy._id) {
      const idx = target.findIndex((d) => d._id === copy._id);
      if (idx >= 0) target[idx] = copy;
      else target.push(copy);
      return copy._id!;
    }
    copy._id = `${collection}:${target.length + 1}`;
    target.push(copy);
    return copy._id;
  });
  const matches = (doc: Doc, query: Record<string, unknown>): boolean =>
    Object.entries(query).every(([k, v]) => {
      // Enough of a matcher for the ledgers' owner-scoped reads; a query
      // operator this does not understand matches nothing rather than
      // everything, so a test can never pass by over-matching.
      if (v !== null && typeof v === "object") return false;
      return (doc as Record<string, unknown>)[k] === v;
    });
  const find = vi.fn(
    async (collection: string, query: Record<string, unknown>) => {
      if (collection !== Cols.Content) {
        const rows = others.get(collection) ?? [];
        return Object.keys(query).length === 0
          ? rows.slice()
          : rows.filter((d) => matches(d, query));
      }
      if (typeof query.path === "string") {
        return store.filter((d) => d.path === query.path);
      }
      return store.slice();
    },
  );
  const findById = vi.fn(async (collection: string, id: string) => {
    const target = collection === Cols.Content ? store : bucket(collection);
    return target.find((d) => d._id === id) ?? null;
  });
  vi.spyOn(PM, "get").mockReturnValue({
    save,
    find,
    findById,
    isConnected: () => true,
  } as unknown as PM);
  return store;
}
