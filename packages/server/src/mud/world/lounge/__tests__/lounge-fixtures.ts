/**
 * Shared in-memory domain store + helpers for the lounge integration
 * tests. Not a `.test.ts` — imported by the suites.
 */

import LoungeWarren from '../idea/LoungeWarren';
import { ContainableMixin } from '../../../lib/spatial/Containable';
import { HasInteractiveMixin } from '../../../lib/connection/HasInteractive';
import { Idea } from '../../../lib/stuff/Idea';
import PersistentHydrator from '../../../platform/idea/persistence/PersistentHydrator';
import { makeStuff } from '../../../lib/security/__tests__/test-setup';

import {
  installStore,
  type Doc,
} from '../../../lib/persistence/__tests__/backend-store';
export { installStore, type Doc };

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

/** A countable arrival: HasInteractive + Containable, nothing else. */
export class TestArrival extends HasInteractiveMixin(ContainableMixin(Idea)) {}
export function arrival(): TestArrival {
  return makeStuff(() => new TestArrival());
}

/** Let fire-and-forget async (bud clone, microtask reconcile) settle. */
export const flush = (ms = 40): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));
