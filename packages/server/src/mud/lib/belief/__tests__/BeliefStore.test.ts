/**
 * BeliefStoreMixin tests — the spine: realm-keyed CRUD, coalescing
 * upsert, partial/total forget, instance+type coexistence, liveness-GC.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  BeliefStoreMixin,
  RECOGNITION,
  IDENTIFICATION,
} from '../BeliefStore';
import { Idea } from '../../stuff/Idea';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../security/__tests__/test-setup';
import { StuffApi } from '../../../api/stuff';

// A minimal viewer: any Stuff that composes the belief store.
class Knower extends BeliefStoreMixin(Idea) {}

// A referent the store points at — a plain Idea stamped at a templatePath
// so the liveness-GC's `findAllByTemplatePath` resolves it.
function referentAt(path: string): Idea {
  return makeStuffAtPath(() => new Idea(), path);
}

afterEach(() => {
  vi.useRealTimers();
});

describe('BeliefStoreMixin', () => {
  it('know/recall roundtrip in the recognition realm', () => {
    const viewer = makeStuff(() => new Knower());
    referentAt('/obj/npc/mara');
    viewer.know(RECOGNITION, '/obj/npc/mara', { knownAs: 'Mara' });

    const record = viewer.recall(RECOGNITION, '/obj/npc/mara');
    expect(record).not.toBeNull();
    expect(record!.knownAs).toBe('Mara');
    expect(record!.realm).toBe(RECOGNITION);
    expect(record!.referent).toBe('/obj/npc/mara');
  });

  it('recall returns null for an unknown referent', () => {
    const viewer = makeStuff(() => new Knower());
    referentAt('/obj/npc/mara');
    expect(viewer.recall(RECOGNITION, '/obj/npc/mara')).toBeNull();
  });

  it('coalesces repeat sightings into one record, advancing lastSeen', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(1000));
    const viewer = makeStuff(() => new Knower());
    referentAt('/obj/npc/stranger');

    viewer.know(RECOGNITION, '/obj/npc/stranger', { knownAs: null });
    const first = viewer.recall(RECOGNITION, '/obj/npc/stranger')!;
    expect(first.firstSeen).toBe(1000);
    expect(first.lastSeen).toBe(1000);

    vi.setSystemTime(new Date(5000));
    viewer.know(RECOGNITION, '/obj/npc/stranger', { knownAs: null });

    const records = viewer.recallRealm(RECOGNITION);
    expect(records.size).toBe(1); // one record, not one-per-sighting
    const again = viewer.recall(RECOGNITION, '/obj/npc/stranger')!;
    expect(again.firstSeen).toBe(1000); // stable
    expect(again.lastSeen).toBe(5000); // advanced
  });

  it('know never downgrades a learned name to null', () => {
    const viewer = makeStuff(() => new Knower());
    referentAt('/obj/npc/mara');
    viewer.know(RECOGNITION, '/obj/npc/mara', { knownAs: 'Mara' });
    // A later bare sighting (knownAs:null) must not wipe the name.
    viewer.know(RECOGNITION, '/obj/npc/mara', { knownAs: null });
    expect(viewer.recall(RECOGNITION, '/obj/npc/mara')!.knownAs).toBe('Mara');
  });

  it('forget drops the record; forgetField(knownAs) keeps it nameless', () => {
    const viewer = makeStuff(() => new Knower());
    referentAt('/obj/npc/mara');
    viewer.know(RECOGNITION, '/obj/npc/mara', { knownAs: 'Mara' });

    // Partial: familiar-face-lost-name — record survives, name gone.
    viewer.forgetField(RECOGNITION, '/obj/npc/mara', 'knownAs');
    const lost = viewer.recall(RECOGNITION, '/obj/npc/mara');
    expect(lost).not.toBeNull();
    expect(lost!.knownAs).toBeNull();

    // Total.
    viewer.forget(RECOGNITION, '/obj/npc/mara');
    expect(viewer.recall(RECOGNITION, '/obj/npc/mara')).toBeNull();
  });

  it('holds instance and type records together, discriminated by realm', () => {
    const viewer = makeStuff(() => new Knower());
    referentAt('/obj/npc/mara');
    referentAt('/obj/item/blue-potion');

    viewer.know(RECOGNITION, '/obj/npc/mara', { knownAs: 'Mara' });
    viewer.know(IDENTIFICATION, '/obj/item/blue-potion', { typeKnown: true });

    // Same referent string would collide across realms only if the key
    // didn't namespace by realm — here they're distinct keys.
    expect(viewer.recall(RECOGNITION, '/obj/npc/mara')!.knownAs).toBe('Mara');
    expect(
      viewer.recall(IDENTIFICATION, '/obj/item/blue-potion')!.payload.typeKnown,
    ).toBe(true);
    expect(viewer.recallRealm(RECOGNITION).size).toBe(1);
    expect(viewer.recallRealm(IDENTIFICATION).size).toBe(1);
    expect(viewer.allBeliefs()).toHaveLength(2);
  });

  it('forgetField clears a payload flag, keeping the record', () => {
    const viewer = makeStuff(() => new Knower());
    referentAt('/obj/item/blue-potion');
    viewer.know(IDENTIFICATION, '/obj/item/blue-potion', { typeKnown: true });
    viewer.forgetField(IDENTIFICATION, '/obj/item/blue-potion', 'typeKnown');
    const rec = viewer.recall(IDENTIFICATION, '/obj/item/blue-potion');
    expect(rec).not.toBeNull();
    expect(rec!.payload.typeKnown).toBeUndefined();
  });

  it('lazy liveness-GC: a record whose referent is gone recalls null', () => {
    const viewer = makeStuff(() => new Knower());
    const referent = referentAt('/obj/npc/ghost');
    viewer.know(RECOGNITION, '/obj/npc/ghost', { knownAs: 'Ghost' });
    expect(viewer.recall(RECOGNITION, '/obj/npc/ghost')).not.toBeNull();

    // Referent leaves the world (unregistered) — the memory is dead.
    StuffApi.unregister(referent);
    expect(viewer.recall(RECOGNITION, '/obj/npc/ghost')).toBeNull();
    // And it's been GC'd out of the store, not just hidden.
    expect(viewer.allBeliefs()).toHaveLength(0);
  });

  it('loadBelief installs a hydrated record verbatim', () => {
    const viewer = makeStuff(() => new Knower());
    referentAt('/obj/npc/mara');
    viewer.loadBelief({
      realm: RECOGNITION,
      referent: '/obj/npc/mara',
      knownAs: 'Mara',
      firstSeen: 100,
      lastSeen: 200,
      payload: {},
    });
    const rec = viewer.recall(RECOGNITION, '/obj/npc/mara')!;
    expect(rec.knownAs).toBe('Mara');
    expect(rec.firstSeen).toBe(100);
  });
});
