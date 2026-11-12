/**
 * ⭐⭐ The flip across a restart (size and carrying W7, D11/D32, drive 21):
 * a body restored from its snapshot comes back holding, wearing and
 * pocketing exactly what it had — the restore admits its own record past
 * the loose-on-body veto (`Carrying.admitWhile`, gated to the body and
 * `PersistableLogic`), re-seats and re-places, and `onRestored` places
 * anything still loose (a pre-flip inventory).
 */
import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Avatar from '../agent/PrimaryAvatar';
import Species from '../idea/species/Species';
import BodyPlan from '../idea/species/BodyPlan';
import TemplateApplier from '../idea/TemplateApplier';
import { Document } from '../../lib/persistence/Document';
import { PersistableApi } from '../../api/persistable';
import { StuffApi } from '../../api/stuff';
import { ParcelApi } from '../../api/parcel';
import { PersistenceManager } from '../../../backend/PersistenceManager';
import Garment from '../thing/equipment/Garment';
import Good from '../thing/Good';
import { ContainmentApi } from '../../api/containment';
import Location from '../../lib/location/Location';
import type { Stuff } from '../../lib/stuff/Stuff';
import {
  makeStuff,
  makeStuffAtPath,
  stampTemplatePathForTest,
} from '../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../lib/persistence/__tests__/quantity-marshaller-test-helpers';

let snapshots: Record<string, unknown>[] = [];
let seq = 0;

/** The in-memory `holder_snapshots` store (the spine suite's harness). */
function installStore(): void {
  const find = vi.fn(async (col: string, query: Record<string, unknown>) => {
    if (col !== 'holder_snapshots') return [];
    return snapshots.filter((d) =>
      Object.entries(query).every(([k, v]) => d[k] === v),
    );
  });
  const save = vi.fn(async (col: string, doc: Record<string, unknown>) => {
    if (col !== 'holder_snapshots') return 'id';
    const i = snapshots.findIndex(
      (d) => d.scope === doc.scope && d.owner === doc.owner,
    );
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
}

/**
 * Evict a body the way logout does — unregister it — so the next "login"
 * can materialize a fresh shell at the same identity path. The spine
 * refuses two live hosts on one key, which is the same collision the death
 * choreography has to order around.
 */
function logout(avatar: Avatar): void {
  StuffApi.unregister(avatar);
}

const TROUSERS = '/test/flip/trousers';
const KEY = '/test/flip/key';
const CUP = '/test/flip/cup';
const POCKETS = [
  { member: '/platform/placements/pocket', name: 'left pocket', mouth: { width: 0.12, height: 0.035 }, volumeM3: 0.0006 },
];
let planPath = '';

function makeAvatar(playerId: string): Avatar {
  seq += 1;
  const plan = makeStuff(() => new BodyPlan());
  planPath = `/stuff/idea/species/BodyPlan/flip-${seq}`;
  stampTemplatePathForTest(plan, planPath);
  plan.setSlots([
    { name: 'legs', accepts: 'WearableMixin', capacity: 2, covers: ['body'] },
    { name: 'hand:left', accepts: 'WieldableMixin', bodyPart: 'body.hand.left' },
    { name: 'hand:right', accepts: 'WieldableMixin', bodyPart: 'body.hand.right' },
  ]);
  plan.setBodyParts([
    { key: 'body', parent: null, tissues: [] },
    { key: 'body.hand.left', parent: 'body', tissues: [], serves: ['manipulation'] },
    { key: 'body.hand.right', parent: 'body', tissues: [], serves: ['manipulation'] },
  ]);
  const species = makeStuff(() => new Species());
  stampTemplatePathForTest(species, `/stuff/idea/species/animalia/flip-${seq}`);
  species.setBodyPlan(plan);
  const avatar = makeStuff(() => new Avatar());
  stampTemplatePathForTest(avatar, Avatar.getTemplatePath(playerId));
  avatar.setPlayerId(playerId);
  avatar.setSpecies(species);
  avatar.setLifecycleState('alive');
  return avatar;
}

async function trousers(): Promise<Garment> {
  const t = makeStuffAtPath(() => new Garment(), TROUSERS);
  t.setShortDescription('trousers');
  await t.setPlacements(POCKETS);
  t.setSlotClaims({ [planPath]: ['legs'] });
  return t;
}
function good(path: string, name: string): Good {
  const g = makeStuffAtPath(() => new Good(), path);
  g.setShortDescription(name);
  g.setDimensions({ width: 0.06, depth: 0.025, height: 0.003 });
  return g;
}

describe('the flip across a restart (drive 21)', () => {
  beforeEach(() => {
    snapshots = [];
    installV1QuantityMarshallers();
    Document.setMarshallerResolver(() => undefined, async () => undefined);
    installStore();
    vi.spyOn(ParcelApi, 'ownerOf').mockResolvedValue({ kind: 'group', name: 'lounge' });
    vi.spyOn(ParcelApi, 'heldUnitOf').mockResolvedValue(null);
    makeStuffAtPath(() => new TemplateApplier(), TemplateApplier.templatePath);
    vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string) => {
      if (path === TROUSERS) return trousers();
      if (path === KEY) return good(KEY, 'key');
      return good(CUP, 'cup');
    }) as unknown as typeof StuffApi.clone);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('⭐ comes back wearing, holding and pocketing exactly what it had', async () => {
    const room = makeStuff(() => new Location());
    const avatar = makeAvatar('flip-ann');
    ContainmentApi.move(avatar, room);
    const t = await trousers();
    avatar.receive(t, { for: 'wear' });
    const k = good(KEY, 'key');
    ContainmentApi.move(k, t, 'left pocket');
    const c = good(CUP, 'cup');
    expect(avatar.receive(c)).toBeNull();
    const key = Avatar.getTemplatePath('flip-ann');
    await PersistableApi.capture(avatar, key);
    logout(avatar);

    const reborn = makeAvatar('flip-ann');
    ContainmentApi.move(reborn, room);
    await PersistableApi.materialize(reborn, key);
    const contents = reborn.getContents() as Stuff[];
    const t2 = contents.find((x) => x.getTemplatePath() === TROUSERS);
    const k2 = contents.find((x) => x.getTemplatePath() === KEY);
    const c2 = contents.find((x) => x.getTemplatePath() === CUP);
    expect(t2 && reborn.getOccupants('legs').has(t2 as never)).toBe(true);
    expect(k2 && placedOn(k2, t2!)).toBe(true);
    expect(c2 && reborn.tierOf(c2)).toBe('hand');
    expect(contents.every((x) => reborn.isHonest(x))).toBe(true);
  });

  it('⭐ D32: a pre-flip inventory (a thing loose on the body) is placed on its first load', async () => {
    const room = makeStuff(() => new Location());
    const avatar = makeAvatar('flip-bob');
    ContainmentApi.move(avatar, room);
    const t = await trousers();
    avatar.receive(t, { for: 'wear' });
    // A pre-flip record: the key loose in the contents (only a test can
    // stand in for the old world — the veto refuses it now).
    const k = good(KEY, 'key');
    const admit = vi.spyOn(avatar, 'isAdmitting').mockReturnValue(true);
    ContainmentApi.move(k, avatar);
    admit.mockRestore();
    expect(avatar.isHonest(k)).toBe(false);
    const key = Avatar.getTemplatePath('flip-bob');
    await PersistableApi.capture(avatar, key);
    logout(avatar);

    const reborn = makeAvatar('flip-bob');
    ContainmentApi.move(reborn, room);
    await PersistableApi.materialize(reborn, key);
    // ⭐ A PLAYER's body places what it finds loose when its session
    // attaches (`enter`), not mid-restore — so the lines it says are heard.
    await reborn.placeLoose();
    const k2 = (reborn.getContents() as Stuff[]).find((x) => x.getTemplatePath() === KEY);
    expect(k2).toBeDefined();
    expect(reborn.isHonest(k2!)).toBe(true);
  });

  /**
   * ⭐ The drive's step 21: the restore's *"would not fit anywhere on you;
   * it is in your room"* was spoken mid-restore, before the session
   * attached, and the player never heard it live. Like the estate touch on
   * a return (`announceSessionPresence`), what happened while you were
   * away is settled — and said — when you come back: the restore leaves a
   * player's loose things for `enter` to place.
   */
  it('⭐ a player restore says nothing before the session attaches; `enter` places and says it', async () => {
    const room = makeStuff(() => new Location());
    const avatar = makeAvatar('flip-cat');
    ContainmentApi.move(avatar, room);
    const k = good(KEY, 'key');
    const admit = vi.spyOn(avatar, 'isAdmitting').mockReturnValue(true);
    ContainmentApi.move(k, avatar);
    admit.mockRestore();
    const key = Avatar.getTemplatePath('flip-cat');
    await PersistableApi.capture(avatar, key);
    logout(avatar);

    const reborn = makeAvatar('flip-cat');
    ContainmentApi.move(reborn, room);
    const placeLoose = vi.spyOn(reborn, 'placeLoose');
    await PersistableApi.materialize(reborn, key);
    expect(placeLoose).not.toHaveBeenCalled();
    const k2 = (reborn.getContents() as Stuff[]).find((x) => x.getTemplatePath() === KEY);
    expect(k2 && reborn.isHonest(k2)).toBe(false);
  });
});

function placedOn(thing: Stuff, host: Stuff): boolean {
  const pair = (thing as unknown as { getPlacement(): { host: Stuff } | null }).getPlacement();
  return pair?.host === host;
}
