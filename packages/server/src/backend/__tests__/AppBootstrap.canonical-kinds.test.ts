/**
 * Wave 3 (inspection-pane build): `AppBootstrap.run` registers the
 * `'me.focus'` canonical subscription kind after the rest of the
 * boot sequence completes. The substrate's wire surface (`kind:
 * 'me.focus'`) reaches the registered spec at handleSubscribe time.
 *
 * The full boot sequence (Mongo connect, seeders, PM hooks, command
 * preload, manifest run) is mocked out — this test isolates the
 * registration step itself, which is the only piece this wave owns.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AppBootstrap } from '../AppBootstrap';
import { PersistenceManager } from '../PersistenceManager';
import { SeederManager } from '../SeederManager';
import { BootstrapManager } from '../BootstrapManager';
import { CommandApi } from '../../mud/api/command';
import { QuantityApi } from '../../mud/api/quantity';
import { MqlSubscriptionApi } from '../../mud/api/mql-subscription';

describe('AppBootstrap — canonical-kind registration (Wave 3)', () => {
  beforeEach(() => {
    MqlSubscriptionApi._clearKindsForTesting();
    vi.spyOn(PersistenceManager.prototype, 'connect').mockResolvedValue();
    vi.spyOn(PersistenceManager.prototype, 'loadHooks').mockResolvedValue();
    vi.spyOn(SeederManager, 'run').mockResolvedValue(0);
    vi.spyOn(BootstrapManager, 'run').mockResolvedValue(undefined);
    vi.spyOn(QuantityApi, 'loadTagTables').mockReturnValue({
      registered: [],
      removed: [],
      path: 'mocked',
    });
    vi.spyOn(CommandApi, 'preloadAll').mockResolvedValue({
      loaded: 0,
      failed: [],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registers me.focus after boot', async () => {
    expect(MqlSubscriptionApi._getKindSpecForTesting('me.focus')).toBeUndefined();
    await AppBootstrap.run({ mongoUri: 'mongodb://x/y', dbName: 'test' });
    const spec = MqlSubscriptionApi._getKindSpecForTesting('me.focus');
    expect(spec).toBeDefined();
    expect(spec!.query).toBe('$focus');
    expect(spec!.cardinality).toBe('many');
    expect(spec!.fields).toBe('detail');
    expect(spec!.focusDependent).toBe(true);
  });

  it('me.focus registration is idempotent across reboot', async () => {
    await AppBootstrap.run({ mongoUri: 'mongodb://x/y', dbName: 'test' });
    const first = MqlSubscriptionApi._getKindSpecForTesting('me.focus');
    await AppBootstrap.run({ mongoUri: 'mongodb://x/y', dbName: 'test' });
    const second = MqlSubscriptionApi._getKindSpecForTesting('me.focus');
    expect(second).toEqual(first);
  });
});
