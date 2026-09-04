/**
 * The herdbook (W8 / D19–D21, D79, P4) — **the herd is a record, and it
 * is kept by somebody else.**
 *
 * Three claims, and the third is the one that would be quietly wrong
 * without a test:
 *
 *  1. ⭐ **Head *n* drafted twice is the same animal.** Seeded, never
 *     drawn — the answer was true before anyone asked.
 *  2. ⚠ **Returning folds what became of it into the record**, and the
 *     asymmetry is honest: its identity was the record, not the flesh.
 *  3. ⚠⚠ **The read verifies the PATH, not the kind tag.** The document
 *     store is shared and `kind` is forgeable by anybody who can write a
 *     document; what nobody can forge is a path under a branch titled to
 *     somebody else. A read that trusted the tag would let a keeper
 *     write `kind: 'herd'` on their own home branch and have it count —
 *     which is the lemons fraud with the engine supplying the pen.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import HerdRegistry, {
  HERD_PREFIX,
  HERD_KIND,
  type HerdRecord,
} from '../idea/HerdRegistry';
import { HeadSeed } from '../lib/HeadSeed';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { StoredDocument } from '@saxonberg/server/mud/lib/document/StoredDocument';
import { Document } from '@saxonberg/server/mud/lib/persistence/Document';
import { PersistenceManager } from '@saxonberg/server/mud/lib/persistence/__tests__/backend-store';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';

const REGISTRY_PATH = '/trade/ranching/idea/HerdRegistry';

let store: Map<string, Array<Record<string, unknown>>>;
let ids = 0;

function col(name: string): Array<Record<string, unknown>> {
  let a = store.get(name);
  if (!a) {
    a = [];
    store.set(name, a);
  }
  return a;
}

function installStore(): void {
  store = new Map();
  ids = 0;
  const save = vi.fn(async (c: string, doc: Record<string, unknown>) => {
    const arr = col(c);
    if (doc._id) {
      const i = arr.findIndex((d) => d._id === doc._id);
      if (i >= 0) arr[i] = { ...doc };
      else arr.push({ ...doc });
      return doc._id as string;
    }
    const id = String(++ids);
    arr.push({ ...doc, _id: id });
    return id;
  });
  const find = vi.fn(async (c: string, q: Record<string, unknown>) => {
    const keys = Object.keys(q);
    return col(c).filter((d) =>
      keys.every((k) => {
        const want = q[k];
        if (want && typeof want === 'object' && '$regex' in (want as object)) {
          const re = new RegExp((want as { $regex: string }).$regex);
          return typeof d[k] === 'string' && re.test(d[k] as string);
        }
        return d[k] === want;
      }),
    );
  });
  vi.spyOn(PersistenceManager, 'get').mockReturnValue({
    save,
    find,
    findById: vi.fn(async (c: string, id: string) => col(c).find((d) => d._id === id) ?? null),
    delete: vi.fn(async () => undefined),
    isConnected: () => true,
  } as unknown as PersistenceManager);
  installV1QuantityMarshallers();
  Document.setMarshallerResolver(
    () => undefined,
    async () => undefined,
  );
}

/** Put a document in the store with no gate at all — the attacker's view. */
async function forge(path: string, data: Record<string, unknown>): Promise<void> {
  const doc = new StoredDocument();
  doc.path = path;
  doc.owner = '/home/iris';
  doc.kind = HERD_KIND;
  doc.data = data;
  await doc.save();
}

function registry(): HerdRegistry {
  return makeStuffAtPath(() => new HerdRegistry(), REGISTRY_PATH);
}

const HERD: HerdRecord = {
  herdId: 'kestrel-flock',
  name: 'the Kestrel flock',
  speciesPath: '/stuff/idea/species/_test/sheep',
  tally: 40,
  holderRef: 'player:/platform/agent/Avatar/iris',
  homeExtent: '/world/test/lot-1',
  founded: 1_000,
  drafted: [],
  overlay: {},
};

describe('the herdbook', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
    installStore();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('files and reads a herd', async () => {
    const r = registry();
    const path = await r.file(HERD);
    expect(path).toBe(`${HERD_PREFIX}/kestrel-flock`);
    const back = await r.read('kestrel-flock');
    expect(back?.tally).toBe(40);
    expect(back?.name).toBe('the Kestrel flock');
  });

  it('refuses a herd with nothing in it to trust', async () => {
    const r = registry();
    await expect(
      r.file({ ...HERD, herdId: '', speciesPath: '' }),
    ).rejects.toThrow(/refusing/);
  });

  it('⚠⚠ a forged `kind: herd` on somebody else’s branch does NOT count', async () => {
    // The whole of P4: a keeper writes a herd document on their own home
    // branch, where they legitimately hold title, and claims forty prize
    // ewes. The path is what nobody can forge.
    const r = registry();
    // ⚠ Written STRAIGHT into the store, which is the honest model of
    // the attack: a keeper legitimately holds title over their own home
    // branch, so the ordinary write gate lets them put whatever they
    // like there — including a document tagged `kind: 'herd'` claiming
    // nine hundred prize ewes.
    await forge('/home/iris/my-prize-flock', {
      ...HERD,
      herdId: 'my-prize-flock',
      tally: 999,
    });
    expect(await r.read('my-prize-flock')).toBeNull();
    const all = await r.all();
    expect(all.map((h) => h.herdId)).not.toContain('my-prize-flock');
  });

  it('⚠ and neither does a sibling path that merely SHARES the prefix', async () => {
    // `/trade/ranching/herdsX/…` is not under `/trade/ranching/herds`,
    // which is why the separator is part of the test.
    const r = registry();
    await forge('/trade/ranching/herdsX/sneaky', { ...HERD, herdId: 'sneaky' });
    const all = await r.all();
    expect(all.map((h) => h.herdId)).not.toContain('sneaky');
  });

  it('⭐ drafting and returning move one head across the boundary', async () => {
    const r = registry();
    await r.file(HERD);
    expect(await r.draft('kestrel-flock', 17)).toBe(true);
    // Twice is a refusal, not a second animal.
    expect(await r.draft('kestrel-flock', 17)).toBe(false);
    expect((await r.read('kestrel-flock'))?.drafted).toEqual([{ index: 17 }]);

    expect(
      await r.returnHead('kestrel-flock', 17, { flesh: 31.5, handling: 0.7 }),
    ).toBe(true);
    const back = await r.read('kestrel-flock');
    expect(back?.drafted).toEqual([]);
    // ⚠ What became of it is remembered while it is not an object.
    expect(back?.overlay['17']).toMatchObject({ flesh: 31.5, handling: 0.7 });
  });

  it('refuses a head that is not in the tally, or not out', async () => {
    const r = registry();
    await r.file(HERD);
    expect(await r.draft('kestrel-flock', 40)).toBe(false);
    expect(await r.draft('kestrel-flock', -1)).toBe(false);
    expect(await r.returnHead('kestrel-flock', 3, {})).toBe(false);
  });
});

describe('the seeded head', () => {
  const shape = { herdId: 'kestrel-flock', meanAgeDays: 400, femaleFraction: 0.85 };

  it('⭐⭐ head n twice is the SAME animal — seeded, never drawn', () => {
    expect(HeadSeed.sample(shape, 17)).toEqual(HeadSeed.sample(shape, 17));
  });

  it('⚠ and it is not a glob: the members DIVERGE', () => {
    // A glob's members are identical and share one state. A herd's are
    // unindividuated and their states diverge — the opposite thing, and
    // the reason the management game is about the tail.
    const heads = Array.from({ length: 40 }, (_, i) => HeadSeed.sample(shape, i));
    expect(new Set(heads.map((h) => h.flesh)).size).toBeGreaterThan(20);
    expect(new Set(heads.map((h) => h.frame)).size).toBeGreaterThan(20);
    // …and both sexes are in there, at roughly the authored fraction.
    const ewes = heads.filter((h) => h.sex === 'female').length;
    expect(ewes).toBeGreaterThan(25);
    expect(ewes).toBeLessThan(40);
  });

  it('a different herd is a different flock, not a shifted one', () => {
    const other = { ...shape, herdId: 'other-flock' };
    expect(HeadSeed.sample(other, 17)).not.toEqual(HeadSeed.sample(shape, 17));
  });

  it('⭐ the register’s overlay WINS over the seed, field by field', () => {
    const seeded = HeadSeed.sample(shape, 17);
    const folded = HeadSeed.sample(shape, 17, { flesh: 12 });
    expect(folded.flesh).toBe(12);
    // Everything it does not name is untouched.
    expect(folded.handling).toBe(seeded.handling);
    expect(folded.sex).toBe(seeded.sex);
  });
});
