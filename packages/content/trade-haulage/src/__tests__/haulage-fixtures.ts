/**
 * Shared fixtures for the haulage suite: a carrier, a depot, and the
 * document-store seam the registries write through.
 */

import { vi } from 'vitest';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { AccessApi } from '@saxonberg/server/mud/api/access';
import { PersistApi } from '@saxonberg/server/mud/api/persist';
import { Collections } from '@saxonberg/server/mud/lib/persistence/Collections';
import BusinessEntity from '@saxonberg/server/mud/platform/idea/Business';
import { Idea } from '@saxonberg/server/mud/lib/stuff/Idea';
import { makeStuff, makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import WaybillRegistry from '../idea/WaybillRegistry';
import RateCardRegistry from '../idea/RateCardRegistry';

export const CARRIER = '/trade/haulage/idea/carrier-business';
export const DEPOT = '/trade/haulage/idea/depot-business';
export const RIVAL = '/trade/haulage/idea/rival-business';

/** A clerk — anybody the execution context can call the acting author. */
export class TestClerk extends Idea {
  static _mixinName = 'HaulageTestClerk';
}

let store: Map<string, Record<string, unknown>>;
let idCounter = 0;

/**
 * The document store, mocked.
 *
 * ⚠ The seam is `PersistApi` rather than the `PersistenceManager` the
 * kernel's own suites mock: a pack imports the kernel only through the
 * server's `exports` map, and `backend/` is deliberately not in it. The
 * Api face is the pack's whole view of persistence, so it is the only
 * honest place for a pack test to intercept.
 *
 * ⚠⚠ **Collection-aware.** The filing path also writes a provenance row
 * into `authoring_events`, and a collection-blind mock hands that back
 * out of a `documents` prefix scan as a phantom bill.
 */
export function installStore(): void {
  store = new Map();
  idCounter = 0;
  vi.spyOn(PersistApi, 'isConnected').mockReturnValue(true);
  vi.spyOn(PersistApi, 'find').mockImplementation(
    async (col: string, query: Record<string, unknown>) => {
      if (col !== Collections.Documents) return [];
      return [...store.values()].filter((d) =>
        Object.entries(query).every(([k, v]) => d[k] === v),
      );
    },
  );
  vi.spyOn(PersistApi, 'save').mockImplementation(
    async (col: string, doc: Record<string, unknown>) => {
      const id = (doc._id as string | undefined) ?? `id-${idCounter++}`;
      if (col === Collections.Documents) store.set(id, { ...doc, _id: id });
      return id;
    },
  );
  // These suites are not about authorization; the ambient gate is
  // declared rather than assumed.
  vi.spyOn(AccessApi, 'can').mockResolvedValue(true);
  vi.spyOn(AccessApi, 'canAtPath').mockResolvedValue(true);
}

export function business(path: string): BusinessEntity {
  return (
    StuffApi.findByTemplatePath<BusinessEntity>(path) ??
    makeStuffAtPath(() => new BusinessEntity(), path)
  );
}

export function waybills(): WaybillRegistry {
  return makeStuff(() => new WaybillRegistry());
}

export function rateCards(): RateCardRegistry {
  return makeStuff(() => new RateCardRegistry());
}

/**
 * The clerk every filing runs as.
 *
 * ⚠ The `asClerk` wrapper itself lives in each TEST FILE rather than
 * here, and that is a framework rule rather than taste: pushing or
 * tagging a call frame is refused from anywhere but the framework and a
 * `*.test.ts` file, and a shared fixture module is neither. Six lines
 * duplicated per suite is the price of a gate that cannot be reached
 * around, which is the right trade.
 */
export function clerk(): Stuff {
  return (
    StuffApi.findByTemplatePath<TestClerk>('/platform/agent/Avatar/clerk') ??
    makeStuffAtPath(() => new TestClerk(), '/platform/agent/Avatar/clerk')
  ) as unknown as Stuff;
}
