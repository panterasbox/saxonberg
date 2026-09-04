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
import Herdbook from '../thing/Herdbook';
import Livestock from '../agent/Livestock';
import Species from '@saxonberg/server/mud/platform/idea/species/Species';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';

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


/**
 * ⭐⭐ **The book on the wall — the door into all of this.**
 *
 * `draft` was afforded by NOTHING and no herd could be filed in play at
 * all, which are the same hole seen from two sides: the mechanisms were
 * built and tested and a player standing in the byre got *"I don't
 * understand 'draft'"*. A live drive found it.
 *
 * The seam is the real-world one — **you fill in the form; the society
 * keeps the book.** The venue authors the herd on its own row; the row
 * files it onto the trade's branch, where the venue cannot edit it
 * afterwards.
 */
describe('the herdbook fixture', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
    installStore();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  const book = (over: Partial<Record<string, unknown>> = {}): Herdbook => {
    const b = makeStuffAtPath(
      () => new Herdbook(),
      '/world/test/thing/herdbook',
    ) as Herdbook;
    b.setHerdId((over.herdId as string) ?? 'college-herd');
    b.setHerdName((over.herdName as string) ?? 'the college herd');
    b.setSpeciesPath((over.speciesPath as string) ?? '/stuff/idea/species/_test/cow');
    b.setTally((over.tally as number) ?? 6);
    b.setHolderRef((over.holderRef as string) ?? 'organization:/stuff/idea/Government/x');
    b.setHomeExtent((over.homeExtent as string) ?? '/world/test/field');
    return b;
  };

  it('⭐⭐ affords `draft` to whoever is in the room', () => {
    // The `ClaimsRegister` shape: a trade's acts are conferred by the
    // trade's own fixtures. Environment AND peers, so it works standing
    // next to it and for anybody else in the byre.
    const c = Herdbook.commandContributions;
    expect(c.environment).toContain('trade/ranching/cmd/ranching/draft.yaml');
    expect(c.peers).toContain('trade/ranching/cmd/ranching/draft.yaml');
    // ⚠ Not `self`: you do not carry the byre's book around with you.
    expect(c.self).toEqual([]);
  });

  it('⭐ registering it FILES the herd onto the trade\'s branch', async () => {
    const reg = registry(); // the register has to exist to file into
    const b = book();
    await b.postRegister();

    const filed = await reg.read('college-herd');
    expect(filed).not.toBeNull();
    expect(filed!.tally).toBe(6);
    expect(filed!.name).toBe('the college herd');
    expect(filed!.homeExtent).toBe('/world/test/field');
    // ⚠⚠ And it landed under the REGISTRY prefix, not under the venue's
    // own branch — which is the whole of P4. A record the college could
    // edit would be worth nothing to a buyer.
    const rows = col('documents').filter((d) => d.kind === HERD_KIND);
    expect(rows).toHaveLength(1);
    expect(String(rows[0]!.path)).toContain(HERD_PREFIX);
  });

  it('⚠⚠ filing is GET-OR-CREATE — a cold room never rolls the herd back', async () => {
    const reg = registry();
    const b = book();
    await b.postRegister();

    // The herd lives a bit: one head out, and the register remembers
    // something about another.
    await reg.draft('college-herd', 2);
    const live = (await reg.read('college-herd'))!;
    live.overlay['4'] = { flesh: 31, note: 'the thin one' };
    await reg.update(live);

    // The room goes cold and comes back. If this re-filed, six head with
    // no history would silently replace everything that had happened.
    await b.postRegister();

    const after = (await reg.read('college-herd'))!;
    expect(after.drafted.map((d) => d.index)).toEqual([2]);
    expect(after.overlay['4']?.note).toBe('the thin one');
  });

  it('a book naming no herd files nothing, and says nothing', async () => {
    const reg = registry();
    const b = makeStuffAtPath(
      () => new Herdbook(),
      '/world/test/thing/blank-book',
    ) as Herdbook;
    await expect(b.postRegister()).resolves.toBeUndefined();
    expect(await reg.all()).toEqual([]);
  });
});


/**
 * ⚠⚠ **A head has to be addressable as what it is**, and for a while it
 * was not.
 *
 * A `Creature` composes `Visible` and `Named` but not `Perceptible`,
 * because a person is addressed by their NAME. An animal is not. The
 * livestock row has always authored
 * `keywords: [head, stock, animal, beast]` and every one of them was
 * silently discarded — the Hydrator writes only what `fieldMeta`
 * declares, and nothing declared `keywords`. In play a drafted head
 * answered to `stock` and nothing else, and only because *"a head of
 * stock"* is its short description: `handle beast` said *"that is not an
 * animal you can work with"* about the animal in front of you.
 */
describe('a drafted head is addressable', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
    installStore();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('⚠⚠ composes Perceptible, so the row\'s authored keywords are REAL', async () => {
    const beast = await StuffApi.create(() => new Livestock());
    expect(MixinApi.isPerceptible(beast as unknown as Stuff)).toBe(true);
    beast.setKeywords(['head', 'stock', 'animal', 'beast']);
    expect(beast.getKeywords()).toContain('beast');
  });

  it('⭐ binding the species is what lets it answer to `cow`', async () => {
    const species = makeStuffAtPath(
      () => new Species(),
      '/stuff/idea/species/_test/cow',
    ) as Species;
    species.setCommonNames(['cow', 'heifer', 'calf']);

    const beast = await StuffApi.create(() => new Livestock());
    beast.setKeywords(['head', 'stock']);
    beast.setSpecies(species);

    // ⭐ The binding is a PATH, resolved on read — which is why standing
    // the species up matters: an unstamped instance would set nothing.
    expect(beast.getSpecies()).not.toBeNull();

    // What `draft` folds in: the generic words stay, the species' own
    // words join them, and the head presents as what it is.
    const names = beast.getSpecies()!.getCommonNames().map((n) => n.toLowerCase());
    beast.setKeywords([...new Set([...beast.getKeywords(), ...names])]);
    expect(beast.getKeywords()).toEqual(
      expect.arrayContaining(['head', 'stock', 'cow', 'heifer', 'calf']),
    );
  });

  it('⚠ setSpecies on an UNSTAMPED species silently binds nothing', async () => {
    // The seam worth knowing about: the binding is `getTemplatePath()`,
    // so a species that was cloned rather than resolved records `null`
    // and the head comes up with no body plan behind it. It is why
    // `draft` stands the species up instead of taking whatever is handy.
    const loose = await StuffApi.create(() => new Species());
    const beast = await StuffApi.create(() => new Livestock());
    beast.setSpecies(loose);
    expect(beast.getSpecies()).toBeNull();
  });
});
