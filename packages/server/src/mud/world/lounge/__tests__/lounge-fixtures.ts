/**
 * Shared in-memory domain store + helpers for the lounge integration
 * tests. Not a `.test.ts` — imported by the suites.
 */

import { vi } from 'vitest';
import LoungeWarren from '../idea/LoungeWarren';
import { ContainableMixin } from '../../../lib/spatial/Containable';
import { HasInteractiveMixin } from '../../../lib/connection/HasInteractive';
import { Idea } from '../../../lib/stuff/Idea';
import PersistentHydrator from '../../../platform/idea/persistence/PersistentHydrator';
import {
  PersistenceManager,
  Collections,
} from '../../../../backend/PersistenceManager';
import { makeStuff } from '../../../lib/security/__tests__/test-setup';

export type Doc = Record<string, unknown> & {
  _id?: string;
  path: string;
  class: string;
  hydratorClass?: string;
  data: Record<string, unknown>;
};

const PH = PersistentHydrator.templatePath;

/** The baseline lounge + campus templates every lounge suite needs. */
export function loungeDocs(extra: Doc[] = []): Doc[] {
  return [
    { path: PH, class: PH, data: {} },
    {
      path: LoungeWarren.WARREN_PATH,
      class: '/world/lounge/idea/LoungeWarren',
      data: {},
    },
    {
      path: LoungeWarren.LOUNGE_TEMPLATE,
      class: '/world/lounge/location/Lounge',
      hydratorClass: PH,
      data: { warren: LoungeWarren.WARREN_PATH, shortDescription: 'the lounge' },
    },
    {
      path: LoungeWarren.BAR_PATH,
      class: '/world/lounge/location/Bar',
      hydratorClass: PH,
      data: { shortDescription: "Dave's Bar" },
    },
    ...extra,
  ];
}

/** Install an in-memory PersistenceManager backed by `docs`. */
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
      if (collection !== Collections.Content) return [];
      if (typeof query.path === 'string') {
        return store.filter((d) => d.path === query.path);
      }
      return store.slice();
    },
  );
  const findById = vi.fn(async (_c: string, id: string) => {
    return store.find((d) => d._id === id) ?? null;
  });
  vi.spyOn(PersistenceManager, 'get').mockReturnValue({
    save,
    find,
    findById,
  } as unknown as PersistenceManager);
  return store;
}

/** A countable arrival: HasInteractive + Containable, nothing else. */
export class TestArrival extends HasInteractiveMixin(ContainableMixin(Idea)) {}
export function arrival(): TestArrival {
  return makeStuff(() => new TestArrival());
}

/** Let fire-and-forget async (bud clone, microtask reconcile) settle. */
export const flush = (ms = 40): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));
