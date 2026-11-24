/**
 * ⭐⭐ The flip across a restart (size and carrying W7, D11/D32, drive 21):
 * a body restored from its snapshot comes back holding, wearing and
 * pocketing exactly what it had — the restore admits its own record past
 * the loose-on-body veto (`Creature.admitWhile`, gated to the body and
 * `PersistableLogic`), re-seats and re-places. A thing found loose on a
 * restored body is a broken record, said loudly (`Creature.onRestored`'s
 * error diagnostic) and never placed — there is no pre-flip migration.
 */
import "../../../test-bootstrap";
import { withSaveMany } from '../../lib/persistence/__tests__/pm-fake';
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
import { MixinApi } from '../../api/mixin';
import { ChattelApi } from '../../api/chattel';
import ChattelRegistry from '../idea/ChattelRegistry';
import { TemplatePaths } from '../../lib/paths';
import { DiagnosticApi } from '../../api/diagnostics';
import Location from '../../lib/location/Location';
import type { Stuff } from '../../lib/stuff/Stuff';
import {
  makeStuff,
  makeStuffAtPath,
  stampTemplatePathForTest,
} from '../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../lib/persistence/__tests__/quantity-marshaller-test-helpers';

let snapshots: Record<string, unknown>[] = [];
let chattelRows: Record<string, unknown>[] = [];
let seq = 0;

/** The in-memory `holder_snapshots` store (the spine suite's harness). */
function installStore(): void {
  const find = vi.fn(async (col: string, query: Record<string, unknown>) => {
    if (col === 'chattel') return chattelRows;
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
  vi.spyOn(PersistenceManager, 'get').mockReturnValue(withSaveMany({
    isConnected: () => true,
    save,
    find,
    findById: vi.fn(),
    delete: vi.fn(),
  }) as unknown as PersistenceManager);
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
  { member: '/platform/placements/in', name: 'left pocket', mouth: { width: 0.12, height: 0.035 }, volumeM3: 0.0006 },
  { member: '/platform/placements/in', name: 'right pocket', mouth: { width: 0.12, height: 0.035 }, volumeM3: 0.0006 },
];

/** Title on file for `good` (the spine suite's stamp); {@link indexTitles} builds the registry from the rows. */
function stamp(good: Stuff, playerId: string): void {
  const id = `c-${good.stuffId}`;
  (good as unknown as { _chattelId: string })._chattelId = id;
  chattelRows.push({
    _id: id,
    chattelId: id,
    owner: { kind: 'player', templatePath: Avatar.getTemplatePath(playerId) },
    place: '',
    titledAt: 1,
  });
}

/** The title registry, its index read from the rows on file. */
async function indexTitles(): Promise<void> {
  const reg = makeStuffAtPath(() => new ChattelRegistry(), TemplatePaths.chattelRegistry);
  await reg.onCreate();
}

/** Let the custody writes every move fires settle. */
async function settle(): Promise<void> {
  for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0));
}
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
    chattelRows = [];
    ChattelApi._resetRegistryRefForReload();
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
    avatar.seatInSlots(t, ['legs']);
    const k = good(KEY, 'key');
    // The RIGHT pocket: the record names the region, so it is not the
    // arrival's first choice that puts it back (W9, D-W9-7).
    ContainmentApi.move(k, t, 'right pocket');
    const c = good(CUP, 'cup');
    ContainmentApi.move(c, avatar);
    const key = Avatar.getTemplatePath('flip-ann');
    await PersistableApi.capture(avatar, key);
    logout(avatar);

    const reborn = makeAvatar('flip-ann');
    ContainmentApi.move(reborn, room);
    await PersistableApi.materialize(reborn, key);
    const contents = reborn.getContents() as Stuff[];
    const t2 = contents.find((x) => x.getTemplatePath() === TROUSERS);
    // ⭐ The key is the trousers' contents (W9) — in its pocket.
    const k2 = t2 && MixinApi.isContainer(t2) ? (t2.getContents() as Stuff[]).find((x) => x.getTemplatePath() === KEY) : undefined;
    const c2 = contents.find((x) => x.getTemplatePath() === CUP);
    expect(t2 && reborn.getOccupants('legs').has(t2 as never)).toBe(true);
    expect(k2 && MixinApi.isContainable(k2) && k2.getContainer()).toBe(t2);
    expect(k2 && placedOn(k2, t2!)).toBe(true);
    expect(k2 && MixinApi.isContainable(k2) && k2.getPlacement()?.name).toBe('right pocket');
    expect(c2 && reborn.tierOf(c2)).toBe('hand');
    expect(contents.every((x) => reborn.isHonest(x))).toBe(true);
  });

  it('⭐ a thing loose on a restored body is a loud error, left where the record put it (no migrations)', async () => {
    const room = makeStuff(() => new Location());
    const avatar = makeAvatar('flip-bob');
    ContainmentApi.move(avatar, room);
    // A broken record: the key loose in the contents (only a test can make
    // one — the veto refuses it in the world).
    const k = good(KEY, 'key');
    const admit = vi.spyOn(avatar, 'isAdmitting').mockReturnValue(true);
    ContainmentApi.move(k, avatar);
    admit.mockRestore();
    const key = Avatar.getTemplatePath('flip-bob');
    await PersistableApi.capture(avatar, key);
    logout(avatar);

    const record = vi.spyOn(DiagnosticApi, 'record').mockResolvedValue(undefined as never);
    const reborn = makeAvatar('flip-bob');
    ContainmentApi.move(reborn, room);
    await PersistableApi.materialize(reborn, key);
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'error', message: expect.stringMatching(/loose thing.*\/test\/flip\/key/) }),
    );
    // Nothing guessed a place for it.
    const k2 = (reborn.getContents() as Stuff[]).find((x) => x.getTemplatePath() === KEY);
    expect(k2 && reborn.isHonest(k2)).toBe(false);
  });

  it('⭐ a snapshot carrying a retired `homes` slice restores with no error and no homes (W10)', async () => {
    const room = makeStuff(() => new Location());
    const avatar = makeAvatar('flip-homes');
    ContainmentApi.move(avatar, room);
    const c = good(CUP, 'cup');
    ContainmentApi.move(c, avatar);
    const key = Avatar.getTemplatePath('flip-homes');
    await PersistableApi.capture(avatar, key);
    logout(avatar);
    // A record written before W10: the carrier's homes slice rides along.
    const rec = snapshots.find((d) => d.owner === key) ?? snapshots.at(-1)!;
    (rec.state as Record<string, unknown>).CarryingMixin = {
      homes: [{ item: { kind: 'path', path: [0], templatePath: CUP }, home: { kind: 'path', path: [0], templatePath: CUP } }],
    };
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const reborn = makeAvatar('flip-homes');
    ContainmentApi.move(reborn, room);
    await PersistableApi.materialize(reborn, key);
    const c2 = (reborn.getContents() as Stuff[]).find((x) => x.getTemplatePath() === CUP);
    expect(c2 && reborn.tierOf(c2)).toBe('hand');
    expect(warn.mock.calls.some((args) => String(args[0]).includes("unclaimed 'CarryingMixin' slice"))).toBe(true);
  });
});

describe('a pocketed key that is OWNED, across a restart (W9, D-W9-7)', () => {
  beforeEach(() => {
    snapshots = [];
    chattelRows = [];
    ChattelApi._resetRegistryRefForReload();
    installV1QuantityMarshallers();
    Document.setMarshallerResolver(() => undefined, async () => undefined);
    installStore();
    vi.spyOn(ParcelApi, 'ownerOf').mockResolvedValue({ kind: 'group', name: 'lounge' });
    vi.spyOn(ParcelApi, 'heldUnitOf').mockResolvedValue(null);
    makeStuffAtPath(() => new TemplateApplier(), TemplateApplier.templatePath);
    vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string) => {
      if (path === TROUSERS) return trousers();
      return good(KEY, 'key');
    }) as unknown as typeof StuffApi.clone);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  async function roundTrip(playerId: string, ownCoat: boolean): Promise<{ t2: Stuff; k2: Stuff | undefined }> {
    const room = makeStuff(() => new Location());
    const avatar = makeAvatar(playerId);
    ContainmentApi.move(avatar, room);
    const t = await trousers();
    if (ownCoat) stamp(t, playerId);
    const k = good(KEY, 'key');
    stamp(k, playerId);
    await indexTitles();
    avatar.seatInSlots(t, ['legs']);
    ContainmentApi.move(k, t, 'right pocket');
    await settle();
    expect(MixinApi.isChattel(k) && k.isStamped()).toBe(true);
    const key = Avatar.getTemplatePath(playerId);
    await PersistableApi.capture(avatar, key);
    logout(avatar);
    const reborn = makeAvatar(playerId);
    ContainmentApi.move(reborn, room);
    await PersistableApi.materialize(reborn, key);
    const t2 = [...reborn.getOccupants('legs')][0] as Stuff;
    const k2 = MixinApi.isContainer(t2)
      ? (t2.getContents() as Stuff[]).find((x) => x.getTemplatePath() === KEY)
      : undefined;
    return { t2, k2 };
  }

  it('⭐ an owned key in an unowned coat\'s pocket comes back in the same pocket (it rides the coat — persistence-model D9)', async () => {
    const { t2, k2 } = await roundTrip('flip-eve', false);
    expect(t2).toBeDefined();
    expect(k2).toBeDefined();
    expect(MixinApi.isContainable(k2!) && k2.getPlacement()).toEqual({ host: t2, name: 'right pocket' });
  });

  it('⭐ an owned key in an owned coat\'s pocket comes back too (whoever holds title, it rides the coat)', async () => {
    const { t2, k2 } = await roundTrip('flip-fay', true);
    expect(t2).toBeDefined();
    expect(k2).toBeDefined();
    expect(MixinApi.isContainable(k2!) && k2.getPlacement()).toEqual({ host: t2, name: 'right pocket' });
  });
});

function placedOn(thing: Stuff, host: Stuff): boolean {
  const pair = (thing as unknown as { getPlacement(): { host: Stuff } | null }).getPlacement();
  return pair?.host === host;
}
