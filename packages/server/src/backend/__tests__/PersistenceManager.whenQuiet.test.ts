/**
 * `whenQuiet` with no database: nothing can be in flight, so it answers at
 * once rather than holding every settle for its quiet window (the soak
 * lane, 2026-11-26 — three clock-test files met the 5 s timeout under a
 * loaded suite).
 */
import '../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import { PersistenceManager } from '../PersistenceManager';

describe('PersistenceManager.whenQuiet', () => {
  it('a world with no database is quiet at once', async () => {
    const pm = PersistenceManager.get();
    expect(pm.isConnected()).toBe(false);
    const t0 = Date.now();
    await expect(pm.whenQuiet(500, 10_000)).resolves.toBe(true);
    expect(Date.now() - t0).toBeLessThan(100);
  });
});
