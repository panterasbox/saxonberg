/**
 * ⭐⭐ **Every Location has a floor.** The wave that fixes the defect that
 * opened the cycle: `sit`, `lie` and `kneel` returned
 * `empty-result[target]` in the Lounge — the room a brand-new character
 * opens their eyes in — because 27 of 180 Locations had a floor and
 * *"the choice of which Locations include a floor adornment is per-template
 * authoring"* was a choice nobody was making.
 *
 * ⭐ The roster test at the bottom is the guard that matters. The hook moved
 * DOWN into `Location`'s base stack, and `PostRegistrationMixin`'s default
 * `postRegister` is a **non-chaining no-op** — so any subclass override that
 * forgets `await super.postRegister(context)` silently leaves its rooms
 * unstandable, with nothing else going wrong. Counting `super.postRegister`
 * across the family at plan time found **six** overrides with none. The
 * roster clones every concrete kernel Location class and asserts a floor,
 * so forgetting the line is a red test rather than a quiet regression.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync } from 'fs';
import { join } from 'path';
import Location from '../Location';
import CartesianLocation from '../../location/CartesianLocation';
import SingletonCartesianLocation from '../../location/SingletonCartesianLocation';
import PersistentCartesianLocation from '../../../platform/location/PersistentCartesianLocation';
import SphericalLocation from '../../../platform/location/SphericalLocation';
import SingletonSphericalLocation from '../../../platform/location/SingletonSphericalLocation';
import FurnishableRoom from '../../../platform/location/FurnishableRoom';
import Offstage from '../../../platform/location/Offstage';
import VoidLocation from '../../../platform/location/VoidLocation';
import Crossing from '../../../platform/location/Crossing';
import CircleFloor from '../../../platform/location/sandbox/CircleFloor';
import Floor from '../../../platform/thing/Floor';
import Material from '../../material/Material';
import { StuffApi } from '../../../api/stuff';
import { MixinApi } from '../../../api/mixin';
import { TemplatePaths } from '../../paths';
import {
  PersistenceManager,
  Collections,
} from '../../../../backend/PersistenceManager';
import { makeStuffAtPath } from '../../security/__tests__/test-setup';

type Doc = {
  _id?: string;
  path: string;
  class: string;
  hydratorClass?: string;
  data: Record<string, unknown>;
};

const HYDRATOR = '/platform/idea/persistence/PersistentHydrator';

/** The default-floor row, as the generic-objects pack ships it. */
const DEFAULT_FLOOR_ROW: Doc = {
  path: TemplatePaths.defaultFloor,
  class: '/platform/thing/Floor',
  hydratorClass: HYDRATOR,
  data: {
    shortDescription: 'featureless plain floor',
    keywords: ['floor', 'ground', 'featureless', 'plain', 'underfoot'],
    longDescription: 'A featureless plain floor.',
    surfaceBulk: true,
  },
};

/**
 * The Hydrator itself is a template row too — `hydratorClass:` is a
 * TEMPLATE path, not a module path, and the clone pipeline resolves it
 * through the same store. Leaving it out fails with
 * `Template not found: /platform/idea/persistence/PersistentHydrator`,
 * which reads like a missing class and is a missing ROW.
 */
const HYDRATOR_ROW: Doc = {
  path: HYDRATOR,
  class: HYDRATOR,
  data: {},
};

function installStore(rows: Doc[]): void {
  const store = [HYDRATOR_ROW, DEFAULT_FLOOR_ROW, ...rows].map((d, i) => ({
    _id: String(i + 1),
    ...d,
  }));
  vi.spyOn(PersistenceManager, 'get').mockReturnValue({
    save: vi.fn(async () => '1'),
    find: vi.fn(async (c: string, q: Record<string, unknown>) => {
      if (c !== Collections.Content) return [];
      if (typeof q.path === 'string') return store.filter((d) => d.path === q.path);
      return store.slice();
    }),
    findById: vi.fn(),
  } as unknown as PersistenceManager);
}

let seq = 0;
function mat(name: string, tags: string[]): Material {
  seq += 1;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(name);
    m.setTags(tags);
    return m;
  }, `/test/material/${name}-${seq}`) as unknown as Material;
}

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('ensureFloor — the default', () => {
  beforeEach(() => {
    installStore([
      {
        path: '/test/room/plain',
        class: '/platform/location/CartesianLocation',
        hydratorClass: HYDRATOR,
        data: { shortDescription: 'a plain cell', coordinates: [0, 0, 0] },
      },
    ]);
  });

  it('a cloned Location has exactly one floor, in the slot named `floor`', async () => {
    const room = await StuffApi.clone<CartesianLocation>('/test/room/plain');
    const floor = room.getFloor();
    expect(floor).not.toBeNull();
    expect(MixinApi.isFloor(floor!)).toBe(true);
    expect(room.getFixtures()).toHaveLength(1);
    expect(room.slotOfFixture(floor!)).toBe('floor');
  });

  it('…and you can sit on it — the whole point', async () => {
    const room = await StuffApi.clone<CartesianLocation>('/test/room/plain');
    const floor = room.getFloor()!;
    expect(MixinApi.isPostured(floor)).toBe(true);
    expect(floor.getAcceptedPostures('ground:1')).toContain('sit');
    expect(floor.getKeywords()).toContain('ground');
  });

  it('is idempotent — a second ensureFloor adds nothing', async () => {
    const room = await StuffApi.clone<CartesianLocation>('/test/room/plain');
    const first = room.getFloor();
    await room.ensureFloor();
    expect(room.getFixtures()).toHaveLength(1);
    expect(room.getFloor()).toBe(first);
  });

  it('an indoor room at datum reads as a BUILT floor, not as earth (AC 7)', async () => {
    const room = await StuffApi.clone<CartesianLocation>('/test/room/plain');
    const floor = room.getFloor()!;
    expect(floor.isOnGrade()).toBe(false);
    expect(floor.isWorked()).toBe(true);
    expect(floor.getUnderfootRung()).toBe(4);
    expect(floor.getUnderfootMaterialPath()).toBe(
      '/stuff/idea/material/wood/oak'
    );
  });
});

describe('ensureFloor — authored wins', () => {
  it('an `adornments:` floor is the only floor, untouched', async () => {
    installStore([
      {
        path: '/test/floor/weeping',
        class: '/platform/thing/Floor',
        hydratorClass: HYDRATOR,
        data: {
          shortDescription: 'wet flagstones',
          keywords: ['flagstones', 'wet'],
          worked: true,
          onGrade: true,
        },
      },
      {
        path: '/test/room/authored',
        class: '/platform/location/CartesianLocation',
        hydratorClass: HYDRATOR,
        data: {
          shortDescription: 'a weeping cell',
          coordinates: [0, 0, 0],
          adornments: [{ template: '/test/floor/weeping', slot: 'floor' }],
        },
      },
    ]);
    const room = await StuffApi.clone<CartesianLocation>('/test/room/authored');
    const floors = room.getFixtures().filter((f) => f instanceof Floor);
    expect(floors).toHaveLength(1);
    expect(floors[0]!.getShort()).toContain('flagstones');
    // The author's own flags survive; only the ladder ran.
    expect((floors[0] as unknown as Floor).isWorked()).toBe(true);
    expect((floors[0] as unknown as Floor).isOnGrade()).toBe(true);
    // ⭐ And it answers to `ground` all the same (the class-level union).
    expect(floors[0]!.getKeywords()).toContain('ground');
  });
});

describe('ensureFloor — the opt-out', () => {
  it('`noDefaultFloor: true` gets no floor at all', async () => {
    installStore([
      {
        path: '/test/room/void',
        class: '/platform/location/CartesianLocation',
        hydratorClass: HYDRATOR,
        data: { shortDescription: 'nowhere', noDefaultFloor: true },
      },
    ]);
    const room = await StuffApi.clone<CartesianLocation>('/test/room/void');
    expect(room.isNoDefaultFloor()).toBe(true);
    expect(room.getFloor()).toBeNull();
  });

  it('⭐ a SKY-EXPOSED room that opts out still gets none, and refuses a seat', async () => {
    // The mid-air case. D8's derivation answers "on grade" for anything
    // sky-exposed, so a flying-only room would have been handed an EARTH
    // floor and you could have sat down on the sky. Existence is a
    // separate question from `onGrade`, and this is the seam that proves
    // it — before either a flying room or a water column exists to use it.
    installStore([
      {
        path: '/test/room/midair',
        class: '/platform/location/CartesianLocation',
        hydratorClass: HYDRATOR,
        data: {
          shortDescription: 'open air',
          coordinates: [0, 0, 40],
          noDefaultFloor: true,
        },
      },
    ]);
    const room = await StuffApi.clone<CartesianLocation>('/test/room/midair');
    expect(room.getFloor()).toBeNull();
    // Nothing in the room affords a posture, so `sit`'s target cannot bind.
    const postured = room
      .getFixtures()
      .filter((f) => MixinApi.isPostured(f as never));
    expect(postured).toHaveLength(0);
  });
});

describe('ensureFloor — the `floor:` spec (rung 2)', () => {
  it('applies material, worked and onGrade to the default floor', async () => {
    const clay = mat('clay', ['earth']);
    installStore([
      {
        path: '/test/room/spec',
        class: '/platform/location/CartesianLocation',
        hydratorClass: HYDRATOR,
        data: {
          shortDescription: 'a byre',
          coordinates: [0, 0, 0],
          floor: {
            material: clay.getTemplatePath(),
            worked: true,
            onGrade: true,
          },
        },
      },
    ]);
    const room = await StuffApi.clone<CartesianLocation>('/test/room/spec');
    const floor = room.getFloor() as unknown as Floor;
    expect(floor.isWorked()).toBe(true);
    expect(floor.isOnGrade()).toBe(true);
    expect(floor.getUnderfootRung()).toBe(2);
    expect(floor.getGroundKind()).toBe('beaten-floor');
  });

  it('a `template:` in the spec clones THAT row instead', async () => {
    installStore([
      {
        path: '/test/floor/boards',
        class: '/platform/thing/Floor',
        hydratorClass: HYDRATOR,
        data: { shortDescription: 'scrubbed boards', keywords: ['boards'] },
      },
      {
        path: '/test/room/tpl',
        class: '/platform/location/CartesianLocation',
        hydratorClass: HYDRATOR,
        data: {
          shortDescription: 'a parlour',
          floor: { template: '/test/floor/boards' },
        },
      },
    ]);
    const room = await StuffApi.clone<CartesianLocation>('/test/room/tpl');
    expect(room.getFloor()!.getShort()).toContain('boards');
    expect(room.getFixtures()).toHaveLength(1);
  });
});

describe('the default-floor row this all depends on', () => {
  it('⚠ exists on disk at the path the kernel names', () => {
    // `lint:census` clause (c) checks only Registry/Catalogue constants, so
    // nothing else would notice `TemplatePaths.defaultFloor` going stale —
    // and the symptom would be a warned-not-thrown floorless world.
    expect(TemplatePaths.defaultFloor).toBe(
      '/stuff/thing/surface/default-floor'
    );
    const row = join(
      __dirname,
      '..', '..', '..', '..', '..', '..',
      'content', 'generic-objects', 'content',
      'stuff', 'thing', 'surface', 'default-floor.yaml'
    );
    expect(existsSync(row)).toBe(true);
  });
});

describe('⭐ the roster — every concrete kernel Location class', () => {
  // `StuffApi.create` runs register → postRegister, which is the whole
  // chain under test; the floor row still has to be findable, so the store
  // is installed even though no room is cloned.
  beforeEach(() => installStore([]));

  const ROSTER: Array<[string, () => Location]> = [
    ['Location', () => new Location()],
    ['CartesianLocation', () => new CartesianLocation()],
    ['SingletonCartesianLocation', () => new SingletonCartesianLocation()],
    ['PersistentCartesianLocation', () => new PersistentCartesianLocation()],
    ['SphericalLocation', () => new SphericalLocation()],
    ['SingletonSphericalLocation', () => new SingletonSphericalLocation()],
    ['FurnishableRoom', () => new FurnishableRoom()],
    ['Offstage', () => new Offstage()],
    ['Crossing', () => new Crossing()],
    ['CircleFloor', () => new CircleFloor()],
    // ⚠ The three lounge classes (`Lounge`, `Bar`, `GlassAlley`) are on the
    // same roster and cannot be HERE: `lint:test-content` refuses a kernel
    // test that names `/world/<locality>`, because a kernel test proves the
    // kernel over synthetic fixtures and a test of real content lives with
    // the content. They are asserted in
    // `world/lounge/__tests__/lounge-floors.test.ts`.
  ];

  for (const [name, factory] of ROSTER) {
    it(`${name} gets a floor (its postRegister chains super)`, async () => {
      const room = await StuffApi.create(factory);
      expect(room.getFloor(), `${name} has no floor`).not.toBeNull();
    });
  }

  it('VoidLocation is the ONE kernel class that opts out — by its row', async () => {
    // The class itself has no opinion; `noDefaultFloor: true` is authored
    // on `void.yaml`. A bare `new VoidLocation()` therefore DOES get one,
    // and that is correct: the opt-out is content's to declare.
    const room = await StuffApi.create(() => new VoidLocation());
    expect(room.getFloor()).not.toBeNull();
    room.setNoDefaultFloor(true);
    expect(room.isNoDefaultFloor()).toBe(true);
  });
});
