/**
 * A snapshot may never hand back a body that cannot act.
 *
 * The live defect this pins closed: `lifecycleState` is a declared
 * persistent field on `OrganismMixin`, so `PersistableApi.capture` wrote
 * `'dead'` into `holder_snapshots` and `materialize` faithfully restored
 * it. A player who died was then refused `say` / `go` / `get` by
 * `requiresAnimate` on that login — and on every login after it, forever,
 * because the dead state was itself the thing being restored. There was no
 * path back anywhere in the tree.
 *
 * `Avatar.reconcileMortalState` is the terminal backstop against that. It
 * heals the RECORD, not just the instance, so the next login is clean too.
 * Nothing in this build writes a dead lifecycle to a player snapshot any
 * more, which is precisely why the backstop is kept: it holds against code
 * that has not been written yet.
 *
 * Also covers `markForRevert()`, which the death choreography depends on
 * and which `Avatar.shouldPersist` used to break by not chaining to super.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Avatar from '../Avatar';
import Species from '../../lib/species/Species';
import BodyPlan from '../../lib/species/BodyPlan';
import PersistentHydrator from '../../lib/persistence/PersistentHydrator';
import { Document } from '../../lib/persistence/Document';
import { PersistableApi } from '../../api/persistable';
import { StuffApi } from '../../api/stuff';
import { ChronicleApi } from '../../api/chronicle';
import { ParcelApi } from '../../api/parcel';
import { PersistenceManager } from '../../../backend/PersistenceManager';
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

/** An avatar with a resolvable species, so vital bands resolve. */
function makeAvatar(playerId: string): Avatar {
  seq += 1;
  const plan = makeStuff(() => new BodyPlan());
  stampTemplatePathForTest(plan, `/lib/body-plans/mortal-${seq}`);
  plan.setSlots([{ name: 'cranial', accepts: 'SlottableMixin' }]);
  const species = makeStuff(() => new Species());
  stampTemplatePathForTest(species, `/lib/species/animalia/mortal-${seq}`);
  species.setBodyPlan(plan);

  const avatar = makeStuff(() => new Avatar());
  stampTemplatePathForTest(avatar, Avatar.getTemplatePath(playerId));
  avatar.setPlayerId(playerId);
  avatar.setSpecies(species);
  avatar.setLifecycleState('alive');
  return avatar;
}

describe('a snapshot never hands back an unusable body', () => {
  beforeEach(() => {
    snapshots = [];
    installV1QuantityMarshallers();
    Document.setMarshallerResolver(
      () => undefined,
      async () => undefined,
    );
    installStore();
    vi.spyOn(ParcelApi, 'ownerOf').mockResolvedValue({
      kind: 'group',
      name: 'lounge',
    });
    // The chronicle write is not what is under test here.
    vi.spyOn(ChronicleApi, 'recordDeed').mockResolvedValue(undefined);
    makeStuffAtPath(
      () => new PersistentHydrator(),
      PersistentHydrator.templatePath,
    );
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('heals a body whose snapshot restored it dead — and heals the record', async () => {
    const key = Avatar.getTemplatePath('brick-1');
    const avatar = makeAvatar('brick-1');

    // The defect, reproduced exactly: a dead lifecycle reaches the store.
    avatar.setLifecycleState('dead');
    avatar.setCauseOfDeath('exsanguination');
    await PersistableApi.capture(avatar, key);
    expect(
      snapshots.some((s) =>
        JSON.stringify(s).includes('"lifecycleState":"dead"'),
      ),
    ).toBe(true);

    // A fresh shell materializes, then the backstop runs (as `postRegister`
    // drives it on a returning login).
    logout(avatar);
    const reborn = makeAvatar('brick-1');
    await PersistableApi.materialize(reborn, key);
    expect(reborn.getLifecycleState()).toBe('dead'); // faithfully restored…
    await (
      reborn as unknown as {
        reconcileMortalState: (k: string) => Promise<void>;
      }
    ).reconcileMortalState(key);

    // …and healed, in memory.
    expect(reborn.getLifecycleState()).toBe('alive');
    expect(reborn.getCauseOfDeath()).toBeNull();
    expect(reborn.getConditions()).toHaveLength(0);
    expect(reborn.getVitalSign('bloodVolume').rawValue()).toBe(
      reborn.getVitalBand('bloodVolume').baseline,
    );

    // …and in the RECORD, so the next login is clean without re-healing.
    logout(reborn);
    const third = makeAvatar('brick-1');
    await PersistableApi.materialize(third, key);
    expect(third.getLifecycleState()).toBe('alive');
  });

  it('leaves a living body completely alone', async () => {
    const key = Avatar.getTemplatePath('brick-2');
    const avatar = makeAvatar('brick-2');
    await PersistableApi.capture(avatar, key);

    logout(avatar);
    const reborn = makeAvatar('brick-2');
    await PersistableApi.materialize(reborn, key);
    const spy = vi.spyOn(reborn, 'setLifecycleState');
    await (
      reborn as unknown as {
        reconcileMortalState: (k: string) => Promise<void>;
      }
    ).reconcileMortalState(key);

    expect(spy).not.toHaveBeenCalled();
    expect(reborn.getLifecycleState()).toBe('alive');
  });

  it('markForRevert() suppresses capture — Avatar.shouldPersist chains to super', async () => {
    const key = Avatar.getTemplatePath('revert-1');
    const avatar = makeAvatar('revert-1');

    expect(avatar.shouldPersist()).toBe(true);
    avatar.markForRevert();
    // Without the `super.shouldPersist()` chain this stayed true, and the
    // death choreography's drained body would overwrite a good snapshot.
    expect(avatar.shouldPersist()).toBe(false);

    await PersistableApi.capture(avatar, key);
    expect(snapshots).toHaveLength(0);
  });

  it('a guest still persists nothing', () => {
    const guest = makeAvatar('guest-1');
    (guest as unknown as { isGuest: boolean }).isGuest = true;
    expect(guest.shouldPersist()).toBe(false);
  });
});
