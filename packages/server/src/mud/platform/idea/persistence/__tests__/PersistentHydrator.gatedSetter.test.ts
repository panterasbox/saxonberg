/**
 * ⭐⭐ **A washed glass must not lock you out of your character.**
 *
 * `CraftVessel.soiled` is a `persistent` field, so a Hydrator writes it
 * through the two-phase `set<Field>` dispatch — for a fresh clone, and
 * critically for a logged-out player's inventory coming back out of
 * `holder_snapshots`. Its setter is gated (only the crafting logic marks
 * a glass used or clean), and the gate did not name the Hydrator.
 *
 * So ordinary play bricked a login. A live drive washed a coupe, logged
 * out, and could not get back in:
 *
 *     Application: Error in handleUserConnect: SecurityError:
 *     Policy FromModule(…CraftingLogic) denied setSoiled()
 *       at Proxy.hydrate (PersistentHydrator.ts:143)
 *
 * ⚠ The general trap, worth carrying past this one field: **a persistent
 * field whose setter is call-security gated must name the Hydrator, or
 * restore throws.** A scan of the tree found eight such fields; the
 * other seven are `Party`'s, which restores through its own
 * `applyRecord` and never reaches a Hydrator.
 */

import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach } from 'vitest';
import { StuffApi } from '../../../../api/stuff';
import CraftVessel from '../../../thing/CraftVessel';
import PersistentHydrator from '../PersistentHydrator';
import { makeStuff } from '../../../../lib/security/__tests__/test-setup';

beforeEach(() => StuffApi.clearAll());

describe('a gated setter still lets the Hydrator through', () => {
  it('hydrates a SOILED glass — the used one a player logged out holding', async () => {
    const glass = await StuffApi.create(() => new CraftVessel());
    expect(glass.isSoiled()).toBe(false);
    await makeStuff(() => new PersistentHydrator()).hydrate(glass as never, {
      soiled: true,
    });
    expect(glass.isSoiled()).toBe(true);
  });

  it('hydrates a clean glass back to clean', async () => {
    const glass = await StuffApi.create(() => new CraftVessel());
    await makeStuff(() => new PersistentHydrator()).hydrate(glass as never, {
      soiled: false,
    });
    expect(glass.isSoiled()).toBe(false);
  });

  // The gate still means something: the HYDRATOR was let in, not
  // everybody. An arbitrary caller is still refused.
  it('still refuses an arbitrary caller', async () => {
    const glass = await StuffApi.create(() => new CraftVessel());
    expect(() => glass.setSoiled(true)).toThrow();
  });
});
