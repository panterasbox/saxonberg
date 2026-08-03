/**
 * The data migration's tests, driven against the PURE PLANNER — no
 * database, consistent with the rest of the server suite.
 *
 * Four cases, three of them named in the requirements:
 *   1. a pre-move DB rewrites completely, object keys included
 *   2. an already-migrated DB is a no-op (idempotency, end to end)
 *   3. a hand-edited row survives the move AND the next boot
 *   4. a collision with a differing destination writes nothing
 */

import { describe, it, expect } from 'vitest';
import { planCollection, rewriteDeep } from '../migrate-lib-to-obj';

describe('migrate-lib-to-obj', () => {
  describe('case 1 — a pre-move database', () => {
    const domain = [
      {
        _id: 'topic-1',
        path: '/lib/messaging/Topic/system.auth',
        class: '/lib/messaging/Topic',
        hydratorClass: '/lib/persistence/PersistentHydrator',
        data: { label: 'auth' },
      },
      {
        _id: 'room-1',
        path: '/domain/hearthworks/smithy',
        class: '/lib/location/CartesianLocation',
        hydratorClass: '/lib/persistence/PersistentHydrator',
        // slotClaims is keyed BY a template path — the object-key case
        data: { slotClaims: { '/lib/body-plans/biped': ['torso'] } },
      },
    ];

    it('rewrites path, class and hydratorClass on their correct axes', () => {
      const { changes } = planCollection('domain', domain);
      const topic = changes.find((c) => c.id === 'topic-1')!.after;
      expect(topic.path).toBe('/obj/Topic/system.auth');
      expect(topic.class).toBe('/obj/Topic');
      // hydratorClass is a TEMPLATE path, not a module path
      expect(topic.hydratorClass).toBe('/obj/persistence/PersistentHydrator');
    });

    it('sends a split base to its new concrete class', () => {
      const { changes } = planCollection('domain', domain);
      const room = changes.find((c) => c.id === 'room-1')!.after;
      expect(room.class).toBe('/obj/location/Room');
      expect(room.path).toBe('/domain/hearthworks/smithy'); // domain paths do not move
    });

    it('rewrites object KEYS, not just values', () => {
      const { changes } = planCollection('domain', domain);
      const room = changes.find((c) => c.id === 'room-1')!.after;
      const claims = (room.data as Record<string, unknown>).slotClaims as Record<string, unknown>;
      expect(Object.keys(claims)).toEqual(['/obj/species/BodyPlan/biped']);
      expect(claims['/obj/species/BodyPlan/biped']).toEqual(['torso']);
    });

    it('reaches a template path buried deep inside holder_snapshots.state', () => {
      const snapshots = [
        {
          _id: 's1',
          scope: '/obj/Avatar/p1',
          state: {
            CredentialWalletMixin: {
              credentials: [{ kind: 'key', template: '/lib/lock/Key' }],
            },
          },
        },
      ];
      const { changes } = planCollection('holder_snapshots', snapshots);
      expect(changes).toHaveLength(1);
      const st = changes[0]!.after.state as Record<string, Record<string, unknown>>;
      const creds = st.CredentialWalletMixin!.credentials as Array<Record<string, string>>;
      expect(creds[0]!.template).toBe('/obj/Key');
    });

    it('rewrites the lounge ownership root in parcels', () => {
      const { changes } = planCollection('parcels', [
        { _id: 'p1', extent: '/lib/lounge', owner: { kind: 'group', id: 'lounge' } },
      ]);
      expect(changes[0]!.after.extent).toBe('/obj/lounge');
    });

    it('leaves documents with nothing to rewrite entirely alone', () => {
      const { changes } = planCollection('domain', [
        { _id: 'x', path: '/obj/Avatar/seed', class: '/obj/Avatar', data: {} },
      ]);
      expect(changes).toHaveLength(0);
    });
  });

  describe('case 2 — an already-migrated database', () => {
    it('is a no-op when fed its own output', () => {
      const before = [
        {
          _id: 'topic-1',
          path: '/lib/messaging/Topic/system.auth',
          class: '/lib/messaging/Topic',
          hydratorClass: '/lib/persistence/PersistentHydrator',
          data: { slotClaims: { '/lib/body-plans/biped': ['torso'] } },
        },
      ];
      const once = planCollection('domain', before).changes.map((c) => c.after);
      const twice = planCollection('domain', once);
      expect(twice.changes).toHaveLength(0);
      expect(twice.collisions).toHaveLength(0);
    });

    it('converges from a HALF-migrated state (an interrupted run)', () => {
      // path already moved, class not yet — what a kill -9 mid-run leaves.
      const half = [
        {
          _id: 'topic-1',
          path: '/obj/Topic/system.auth',
          class: '/lib/messaging/Topic',
          data: {},
        },
      ];
      const { changes } = planCollection('domain', half);
      expect(changes[0]!.after.class).toBe('/obj/Topic');
      expect(changes[0]!.after.path).toBe('/obj/Topic/system.auth');
    });
  });

  describe('case 3 — a hand-edited row at a moved path', () => {
    const handEdited = {
      _id: 'd1',
      path: '/lib/advancement/Discipline/mixology',
      class: '/lib/advancement/Discipline',
      data: { label: 'Mixology (house rules)', bands: 7 },
    };

    it('moves the row with its data byte-identical', () => {
      const { changes } = planCollection('domain', [handEdited]);
      expect(changes).toHaveLength(1);
      const after = changes[0]!.after;
      expect(after.path).toBe('/obj/Discipline/mixology');
      expect(after.data).toEqual({ label: 'Mixology (house rules)', bands: 7 });
    });

    it('occupies the path the seeder would use, so the next boot inserts nothing', () => {
      const { changes } = planCollection('domain', [handEdited]);
      const migratedPath = changes[0]!.after.path;
      // SeederManager is insert-only: it skips any path already present.
      const seedWouldInsertAt = '/obj/Discipline/mixology';
      expect(migratedPath).toBe(seedWouldInsertAt);
    });
  });

  describe('case 4 — collisions', () => {
    it('refuses to write into an occupied, DIFFERING destination', () => {
      const docs = [
        // the wizard's edit, still at the old path
        {
          _id: 'old',
          path: '/lib/advancement/Discipline/mixology',
          class: '/lib/advancement/Discipline',
          data: { label: 'house rules' },
        },
        // a fresh default the seeder inserted because the app booted first
        {
          _id: 'new',
          path: '/obj/Discipline/mixology',
          class: '/obj/Discipline',
          data: { label: 'Mixology' },
        },
      ];
      const plan = planCollection('domain', docs);
      expect(plan.collisions).toHaveLength(1);
      expect(plan.collisions[0]!.identical).toBe(false);
      // and the colliding document is NOT among the writes
      expect(plan.changes.find((c) => c.id === 'old')).toBeUndefined();
    });

    it('recognises an identical destination as an interrupted run', () => {
      const row = { class: '/obj/Discipline', data: { label: 'Mixology' } };
      const plan = planCollection('domain', [
        { _id: 'old', path: '/lib/advancement/Discipline/mixology', ...row },
        { _id: 'new', path: '/obj/Discipline/mixology', ...row },
      ]);
      expect(plan.collisions[0]!.identical).toBe(true);
    });
  });

  describe('reporting', () => {
    it('flags a /lib/ value no rule covers rather than silently passing it', () => {
      const plan = planCollection('domain', [
        { _id: 'x', path: '/domain/a', class: '/lib/totally/Made/Up', data: {} },
      ]);
      expect(plan.unmapped).toContain('/lib/totally/Made/Up');
    });

    it('reports a path embedded in prose but never rewrites it', () => {
      const prose = 'see /lib/messaging/Topic/world.narration for the routing';
      const plan = planCollection('documents', [{ _id: 'x', body: prose }]);
      expect(plan.changes).toHaveLength(0);
      expect(plan.substrings.some((s) => s.includes('/lib/messaging/Topic'))).toBe(true);
    });
  });

  describe('rewriteDeep', () => {
    it('does not mangle non-string scalars or dates', () => {
      const d = new Date('2026-01-01T00:00:00Z');
      const { value } = rewriteDeep({ n: 1, b: true, nil: null, when: d });
      expect(value).toEqual({ n: 1, b: true, nil: null, when: d });
    });

    it('records every touched location for the dry-run report', () => {
      const { touched } = rewriteDeep({
        class: '/lib/messaging/Topic',
        nested: { deep: ['/lib/lock/Key'] },
      });
      expect(touched.length).toBe(2);
    });
  });
});

describe('BSON values survive the walk', () => {
  // Regression: rewriteDeep used to rebuild every object it walked,
  // which turned an ObjectId into `{buffer: {0: 106, …}}`. Mongo then
  // rejected the write with "the (immutable) field '_id' was found to
  // have been altered". Found on the first live run, not by the suite,
  // because every fixture above uses a string _id.
  class FakeObjectId {
    constructor(readonly bytes: number[]) {}
  }

  it('leaves a non-plain object (ObjectId-shaped) identical by reference', () => {
    const oid = new FakeObjectId([1, 2, 3]);
    const { value } = rewriteDeep({ _id: oid, class: '/lib/messaging/Topic' });
    const after = value as Record<string, unknown>;
    expect(after._id).toBe(oid); // same reference, not a rebuilt copy
    expect(after.class).toBe('/obj/Topic');
  });

  it('leaves a Date identical by reference', () => {
    const d = new Date('2026-01-01T00:00:00Z');
    const { value } = rewriteDeep({ when: d, class: '/lib/lock/Key' });
    expect((value as Record<string, unknown>).when).toBe(d);
  });

  it('still walks plain nested objects', () => {
    const { value } = rewriteDeep({ a: { b: { c: '/lib/lock/Key' } } });
    const a = (value as { a: { b: { c: string } } }).a;
    expect(a.b.c).toBe('/obj/Key');
  });
});
