/**
 * ⭐⭐ **The invented material** — drive steps 22 and 23, which cannot be
 * driven over a socket because they require AUTHORING content, and this is
 * the honest substitute: two rooms and a material hydrated from literal
 * rows, exactly as a content author would write them.
 *
 * The requirements' words: *"Author a floor of an invented material — the
 * pink of Limbo Lane — in a test room. `look floor` answers, `sit` works,
 * and nothing in the closed list had to change to allow it."* Then:
 * *"Author a second room with the same material and the same on-grade
 * answer. Both behave identically without anybody having chosen anything."*
 *
 * ⭐ Why this is the test that matters most for lens 2. The kind vocabulary
 * is CLOSED at ten words, and a closed vocabulary is a promise that can be
 * broken two ways: by refusing the unanticipated (an author has to petition
 * the kernel), or by silently mis-answering it. The fold does neither — a
 * tag set it does not recognise is `contrived`, which is *"of no material
 * anything underfoot has a word for"*, and everything downstream keeps
 * working. That is what lets an author invent matter without a kernel MR.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import CartesianLocation from '../../location/CartesianLocation';
import Floor from '../../../platform/thing/Floor';
import { StuffApi } from '../../../api/stuff';
import { MixinApi } from '../../../api/mixin';
import { TemplatePaths } from '../../paths';
import { GROUND_KINDS } from '../GroundKind';
import {
  PersistenceManager,
  Collections,
} from '../../../../backend/PersistenceManager';

type Doc = {
  _id?: string;
  path: string;
  class: string;
  hydratorClass?: string;
  data: Record<string, unknown>;
};

const H = '/platform/idea/persistence/PersistentHydrator';

/** ⭐ The pink of Limbo Lane: a material nothing in the fold recognises. */
const LIMBO_PINK = '/test/material/limbo-pink';

const ROWS: Doc[] = [
  { path: H, class: H, data: {} },
  {
    path: TemplatePaths.defaultFloor,
    class: '/platform/thing/Floor',
    hydratorClass: H,
    data: { shortDescription: 'plain floor', keywords: ['floor', 'ground'] },
  },
  {
    path: LIMBO_PINK,
    class: '/platform/idea/material/Material',
    hydratorClass: H,
    data: {
      name: 'limbo pink',
      appearance: 'seamless rubbery pink',
      keywords: ['pink', 'limbo'],
      // ⚠ No `density`: it round-trips through a `QuantityMarshaller`, which
      // is itself a template row, and hydrating one here would drag the
      // marshaller tree into a test about tags. The fold reads TAGS and
      // nothing numeric, which is the shape being proven.
      // ⚠ Tags an author invented. NONE of them is in GROUND_TAG_CLASSES,
      // and that is the point of the fixture.
      tags: ['rubbery', 'seamless', 'impossible', 'pink'],
      edibility: false,
      nutrients: [],
      toxicity: [],
      composition: [],
      chemistry: null,
      biologicalSource: null,
    },
  },
  // ── the two rooms, authored the two ways an author would ──
  {
    path: '/test/limbo/lane',
    class: '/platform/location/CartesianLocation',
    hydratorClass: H,
    data: {
      shortDescription: 'Limbo Lane',
      coordinates: [0, 0, 0],
      floor: { material: LIMBO_PINK, worked: true, onGrade: true },
    },
  },
  {
    path: '/test/limbo/alley',
    class: '/platform/location/CartesianLocation',
    hydratorClass: H,
    data: {
      shortDescription: 'Limbo Alley',
      coordinates: [9, 9, 0],
      floor: { material: LIMBO_PINK, worked: true, onGrade: true },
    },
  },
];

function installStore(): void {
  const store = ROWS.map((d, i) => ({ _id: String(i + 1), ...d }));
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

describe('a floor of an invented material', () => {
  beforeEach(async () => {
    StuffApi.clearAll();
    installStore();
    // ⚠ Warm the material, as `MaterialCatalogue.warm()` does at boot.
    // `getMaterial()` resolves a path through `StuffApi.findByTemplatePath`
    // — a REGISTRY read, not a clone — exactly as `TangibleMixin` has
    // always done, so a floor's material is only as available as the
    // catalogue. That is why `warm` selects by the `/idea/material/` infix
    // across every namespace root rather than by an allowlist: a pack's
    // invented material has to be warmed by the same line.
    await StuffApi.singleton(LIMBO_PINK);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('⭐ step 22 — it exists, it is made of the pink, and it is CONTRIVED', async () => {
    const room = await StuffApi.clone<CartesianLocation>('/test/limbo/lane');
    const floor = room.getFloor() as unknown as Floor;
    expect(floor).not.toBeNull();
    expect(floor.getMaterial()!.getName()).toBe('limbo pink');
    expect(floor.getGroundKind()).toBe('contrived');
  });

  it('…and `look floor` answers in words rather than erroring', async () => {
    const room = await StuffApi.clone<CartesianLocation>('/test/limbo/lane');
    const floor = room.getFloor() as unknown as Floor;
    // The derived sentence names the material and says, honestly, that the
    // fold has no word for what it is.
    expect(floor.groundPhrase()).toBe(
      'It is seamless rubbery pink, of no material anything underfoot has a word for.'
    );
  });

  it('…and you can sit on it — `contrived` is not a refusal', async () => {
    const room = await StuffApi.clone<CartesianLocation>('/test/limbo/lane');
    const floor = room.getFloor()!;
    expect(MixinApi.isPostured(floor)).toBe(true);
    expect(floor.getAcceptedPostures('ground:1')).toContain('sit');
    expect(floor.getKeywords()).toContain('ground');
  });

  it('⭐⭐ NOTHING in the closed list had to change to allow it', async () => {
    // AC 18 in one assertion. The vocabulary is still ten words, and the
    // tenth is the one that makes the other nine safe to close.
    expect(GROUND_KINDS).toHaveLength(10);
    expect(GROUND_KINDS).toContain('contrived');
  });

  it('⭐ step 23 — a second room with the same inputs behaves identically', async () => {
    const lane = await StuffApi.clone<CartesianLocation>('/test/limbo/lane');
    const alley = await StuffApi.clone<CartesianLocation>('/test/limbo/alley');
    const a = lane.getFloor() as unknown as Floor;
    const b = alley.getFloor() as unknown as Floor;

    // Nobody chose anything about either, and they agree on every read.
    expect(b.getGroundKind()).toBe(a.getGroundKind());
    expect(b.getMaterial()!.getName()).toBe(a.getMaterial()!.getName());
    expect(b.isOnGrade()).toBe(a.isOnGrade());
    expect(b.isWorked()).toBe(a.isWorked());
    expect(b.groundPhrase()).toBe(a.groundPhrase());
    expect(b.getUnderfootRung()).toBe(a.getUnderfootRung());
  });
});
