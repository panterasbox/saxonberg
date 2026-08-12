/**
 * BeliefStoreMixin tests — the spine: realm-keyed CRUD, coalescing
 * upsert, partial/total forget, instance+type coexistence, liveness-GC.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  BeliefStoreMixin,
  RECOGNITION,
  IDENTIFICATION,
  REGARD,
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

  it('regard realm: know/recall roundtrip carries the scalar payload', () => {
    const viewer = makeStuff(() => new Knower());
    referentAt('/obj/npc/bob');
    viewer.know(REGARD, '/obj/npc/bob', { regard: 5 });
    const rec = viewer.recall(REGARD, '/obj/npc/bob');
    expect(rec).not.toBeNull();
    expect(rec!.payload.regard).toBe(5);
    expect(rec!.realm).toBe(REGARD);
    expect(rec!.knownAs).toBeNull(); // a bare regard record has no name
  });

  it('regard OVERWRITES on set (not raise-only like knownAs)', () => {
    const viewer = makeStuff(() => new Knower());
    referentAt('/obj/npc/bob');
    viewer.know(REGARD, '/obj/npc/bob', { regard: 5 });
    viewer.know(REGARD, '/obj/npc/bob', { regard: 2 });
    expect(viewer.recall(REGARD, '/obj/npc/bob')!.payload.regard).toBe(2);
    // A bare sighting (no regard in the update) leaves it intact.
    viewer.know(REGARD, '/obj/npc/bob', {});
    expect(viewer.recall(REGARD, '/obj/npc/bob')!.payload.regard).toBe(2);
  });

  it('forgetField(regard) clears the scalar, keeping the record', () => {
    const viewer = makeStuff(() => new Knower());
    referentAt('/obj/npc/bob');
    viewer.know(REGARD, '/obj/npc/bob', { regard: 7 });
    viewer.forgetField(REGARD, '/obj/npc/bob', 'regard');
    const rec = viewer.recall(REGARD, '/obj/npc/bob');
    expect(rec).not.toBeNull();
    expect(rec!.payload.regard).toBeUndefined();
  });

  it('regard coexists with recognition on the same referent key', () => {
    const viewer = makeStuff(() => new Knower());
    referentAt('/obj/npc/bob');
    // Same Bob, two realms — distinct records at one referent key.
    viewer.know(RECOGNITION, '/obj/npc/bob', { knownAs: 'Bob' });
    viewer.know(REGARD, '/obj/npc/bob', { regard: 10 });
    expect(viewer.recall(RECOGNITION, '/obj/npc/bob')!.knownAs).toBe('Bob');
    expect(viewer.recall(REGARD, '/obj/npc/bob')!.payload.regard).toBe(10);
    expect(viewer.allBeliefs()).toHaveLength(2);
  });

  it('⚠ a believedName is STORED — the field the false-belief path rides', () => {
    // It was declared on `BeliefPayload`, documented as the whole point
    // of the store being a record of what someone *thinks*, and `know`
    // silently dropped it — so the cursed-identify effect wrote a
    // record indistinguishable from an honest one and planted nothing.
    const viewer = makeStuff(() => new Knower());
    referentAt('/obj/item/vial');
    viewer.know(IDENTIFICATION, '/obj/item/vial', {
      typeKnown: true,
      believedName: 'a potion of healing',
    });
    expect(
      viewer.recall(IDENTIFICATION, '/obj/item/vial')!.payload.believedName,
    ).toBe('a potion of healing');
  });

  it('⭐ an honest identification CLEARS a planted name', () => {
    // The recovery path, and the reason `believedName` is assigned
    // rather than guarded: a real identification omits the field, and
    // omitting it has to mean "you now believe the truth". Guarded, a
    // curse would be permanent — and finding out is how you recover.
    const viewer = makeStuff(() => new Knower());
    referentAt('/obj/item/vial');
    viewer.know(IDENTIFICATION, '/obj/item/vial', {
      typeKnown: true,
      believedName: 'a potion of healing',
    });
    viewer.know(IDENTIFICATION, '/obj/item/vial', {
      typeKnown: true,
      knownAttributes: ['type'],
    });
    const rec = viewer.recall(IDENTIFICATION, '/obj/item/vial')!;
    expect(rec.payload.believedName).toBeUndefined();
    // …and the rest of the record survives: attributes UNION, they do
    // not get reset alongside the lie.
    expect(rec.payload.typeKnown).toBe(true);
    expect(rec.payload.knownAttributes).toContain('type');
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
