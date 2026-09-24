/**
 * Shared in-memory domain store + helpers for the lounge integration
 * tests. Not a `.test.ts` — imported by the suites.
 */

import { TemplatePaths } from '../../../lib/paths';
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
    // ⭐ The default floor. Since the ground build every Location mints one
    // at `postRegister`, so every fixture world that clones a room needs
    // this row — without it `ensureFloor` warns and continues (deliberate:
    // a floorless room is a degradation, a world that will not boot is
    // not), and any assertion about sitting down quietly measures nothing.
    {
      path: TemplatePaths.defaultFloor,
      class: '/platform/thing/Floor',
      hydratorClass: PH,
      data: {
        shortDescription: 'featureless plain floor',
        keywords: ['floor', 'ground', 'featureless', 'plain', 'underfoot'],
        longDescription: 'A featureless plain floor.',
        surfaceBulk: true,
      },
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
