/**
 * ⭐ A cast beast keeps its tack across a restart (the size-and-carrying
 * drive, step 18 → 21). The steading mule is `cast:` — never a room's
 * content (persistence.md § *Props and cast*): the yard's capture skips it,
 * and a restored yard re-mints it from its row. So everything the mule had
 * on — the pack saddle, the panniers and what was in them, all of it the
 * yard's props until a player tacked it up — went with the old instance,
 * and was in nobody's record at all.
 *
 * A draft animal remembers itself (the host, not the thing): it composes
 * `PersistableMixin`, keyed by its row (cast is one-per-path —
 * `reseedCast` conserves by path), is captured at shutdown like every
 * host, and its re-mint restores its record through its hydration
 * source, as a `Stockpile` does.
 */
import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PersistableApi } from '../../../api/persistable';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { ParcelApi } from '../../../api/parcel';
import { MixinApi } from '../../../api/mixin';
import TemplateApplier from '../../idea/TemplateApplier';
import { PersistableMixin } from '../../../lib/persistence/Persistable';
import { PersistenceManager } from '../../../../backend/PersistenceManager';
import { Idea } from '../../../lib/stuff/Idea';
import { ContainerMixin } from '../../../lib/spatial/Container';
import { StagedMixin } from '../../../lib/stuff/Staged';
import { Document } from '../../../lib/persistence/Document';
import Garment from '../../thing/equipment/Garment';
import DraftAnimal from '../DraftAnimal';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type Species from '../../idea/species/Species';
import { makeBody } from '../../../lib/slot/__tests__/carrying-fixture';
import { makeStuffAtPath } from '../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import type { AnyConstructor } from '../../../api/mixin';

class Yard extends PersistableMixin(StagedMixin(ContainerMixin(Idea))) {}

const YARD = '/test/draft/yard';
const MULE = '/test/draft/agent/mule';
const SADDLE = '/test/draft/thing/pack-saddle';

let snapshots: Record<string, unknown>[];
let species: Species;
let plan = '';

function mule(): DraftAnimal {
  const m = makeStuffAtPath(() => new DraftAnimal(), MULE);
  m.setSpecies(species);
  return m;
}
function saddle(): Garment {
  const g = makeStuffAtPath(() => new Garment(), SADDLE);
  g.setShortDescription('pack saddle');
  g.setSlotClaims({ [plan]: ['back'] });
  return g;
}

/** The clone pipeline's shape: construct, then run every hydration source. */
async function mockClone(path: string): Promise<Stuff> {
  if (path !== MULE && path !== SADDLE) throw new Error(`no clone factory for ${path}`);
  const made: Stuff = path === MULE ? mule() : saddle();
  for (const c of MixinApi.getPersistenceContributors(made.constructor as AnyConstructor)) {
    if (c.source) await c.source.hydrate(made);
  }
  return made;
}

beforeEach(() => {
  StuffApi.clearAll();
  snapshots = [];
  installV1QuantityMarshallers();
  Document.setMarshallerResolver(() => undefined, async () => undefined);
  const find = vi.fn(async (col: string, query: Record<string, unknown>) => {
    if (col !== 'holder_snapshots') return [];
    return snapshots.filter((d) => Object.entries(query).every(([k, v]) => d[k] === v));
  });
  const save = vi.fn(async (col: string, doc: Record<string, unknown>) => {
    if (col !== 'holder_snapshots') return 'id';
    const i = snapshots.findIndex((d) => d.scope === doc.scope && d.owner === doc.owner);
    if (i >= 0) {
      snapshots[i] = { ...doc, _id: snapshots[i]!._id };
      return snapshots[i]!._id as string;
    }
    const _id = String(snapshots.length + 1);
    snapshots.push({ ...doc, _id });
    return _id;
  });
  vi.spyOn(PersistenceManager, 'get').mockReturnValue({
    isConnected: () => true,
    save,
    find,
    findById: vi.fn(),
    delete: vi.fn(),
  } as unknown as PersistenceManager);
  vi.spyOn(StuffApi, 'clone').mockImplementation(((path: string) => mockClone(path)) as unknown as typeof StuffApi.clone);
  vi.spyOn(ParcelApi, 'ownerOf').mockResolvedValue({ kind: 'group', name: 'draft-test' });
  makeStuffAtPath(() => new TemplateApplier(), TemplateApplier.templatePath);
  const body = makeBody({ hands: false, mass: 400, stature: 1.4 });
  species = body.me.getSpecies()!;
  plan = body.plan;
  StuffApi.unregister(body.me);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function evict(host: Stuff): void {
  if (MixinApi.isContainer(host)) {
    for (const item of host.getDeepContents()) StuffApi.unregister(item);
  }
  StuffApi.unregister(host);
}

describe('a cast beast keeps its tack across a restart', () => {
  it('⭐ the mule a player saddled comes back saddled', async () => {
    const yard = makeStuffAtPath(() => new Yard(), YARD);
    await yard.applyCast([MULE]);
    await PersistableApi.materialize(yard); // established (no record yet)
    const m = (await mockClone(MULE)) as DraftAnimal;
    ContainmentApi.move(m, yard);
    const s = saddle();
    ContainmentApi.move(s, yard);
    expect(m.receive(s, { for: 'wear' })).toBeNull();
    expect(m.getOccupants('back').has(s as never)).toBe(true);

    // The restart: every host is captured, then the world is gone.
    await PersistableApi.captureAtShutdown();
    evict(yard);

    const reborn = makeStuffAtPath(() => new Yard(), YARD);
    await reborn.applyCast([MULE]);
    await PersistableApi.materialize(reborn);

    const mules = StuffApi.findAllByTemplatePath(MULE) as DraftAnimal[];
    expect(mules).toHaveLength(1);
    const back = [...mules[0]!.getOccupants('back')];
    expect(back.map((x) => x.getTemplatePath())).toEqual([SADDLE]);
    expect(StuffApi.findAllByTemplatePath(SADDLE)).toHaveLength(1);
    expect(mules[0]!.getContainer()).toBe(reborn);
  });
});
