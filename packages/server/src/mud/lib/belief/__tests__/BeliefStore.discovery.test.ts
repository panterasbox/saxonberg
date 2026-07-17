/**
 * BeliefStore — the DISCOVERY realm (Phase 2): a per-viewer world-fact
 * "viewer V found feature F", a bare `found` flag keyed on the feature's
 * templatePath. Persists per-viewer, does not inherit across viewers, and
 * re-recording is idempotent — the same isolation the recognition realm
 * already guarantees, at a new realm.
 */

import { describe, it, expect } from 'vitest';
import { BeliefStoreMixin, DISCOVERY } from '../BeliefStore';
import { Idea } from '../../stuff/Idea';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../security/__tests__/test-setup';

class Knower extends BeliefStoreMixin(Idea) {}

// A referent stamped at a templatePath so the liveness-GC's
// `findAllByTemplatePath` resolves it.
function referentAt(path: string): Idea {
  return makeStuffAtPath(() => new Idea(), path);
}

describe('BeliefStore — DISCOVERY realm', () => {
  it('records and recalls a found flag', () => {
    const viewer = makeStuff(() => new Knower());
    referentAt('/obj/secret/door-1');
    viewer.know(DISCOVERY, '/obj/secret/door-1', { found: true });

    const record = viewer.recall(DISCOVERY, '/obj/secret/door-1');
    expect(record).not.toBeNull();
    expect(record!.realm).toBe(DISCOVERY);
    expect(record!.referent).toBe('/obj/secret/door-1');
    expect(record!.payload.found).toBe(true);
  });

  it('discovery does not inherit across viewers', () => {
    const alice = makeStuff(() => new Knower());
    const bob = makeStuff(() => new Knower());
    referentAt('/obj/secret/cache-1');

    alice.know(DISCOVERY, '/obj/secret/cache-1', { found: true });

    expect(alice.recall(DISCOVERY, '/obj/secret/cache-1')?.payload.found).toBe(
      true,
    );
    expect(bob.recall(DISCOVERY, '/obj/secret/cache-1')).toBeNull();
  });

  it('re-recording is idempotent (one record, still found)', () => {
    const viewer = makeStuff(() => new Knower());
    referentAt('/obj/secret/door-2');

    viewer.know(DISCOVERY, '/obj/secret/door-2', { found: true });
    viewer.know(DISCOVERY, '/obj/secret/door-2', { found: true });

    expect(viewer.recallRealm(DISCOVERY).size).toBe(1);
    expect(viewer.recall(DISCOVERY, '/obj/secret/door-2')?.payload.found).toBe(
      true,
    );
  });

  it('the discovery realm is orthogonal to recognition (own referent key)', () => {
    const viewer = makeStuff(() => new Knower());
    referentAt('/obj/npc/guard');

    // No discovery recorded → absent, even if other realms carry the same
    // referent.
    expect(viewer.recall(DISCOVERY, '/obj/npc/guard')).toBeNull();
    viewer.know(DISCOVERY, '/obj/npc/guard', { found: true });
    expect(viewer.recall(DISCOVERY, '/obj/npc/guard')?.payload.found).toBe(true);
  });
});
