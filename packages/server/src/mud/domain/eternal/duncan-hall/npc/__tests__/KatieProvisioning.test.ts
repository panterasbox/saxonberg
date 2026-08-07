/**
 * Katie — the housing-intake authorization boundary + the dispatch effect.
 *
 * The security-critical additions: an NPC dialogue `dispatch`es `provision`
 * AS THE NPC (forced), so authorization MUST live in the controller's
 * `execute()` (a forced command bypasses the `requiresWizard` validator).
 * `isDormsAgent` is that boundary — a wizard OR an agent of the dorms owner
 * (a member of the `duncan-hall` group). Katie enrolls herself into that
 * group at `postRegister`, keyed by her templatePath (NPCs have no playerId);
 * a random principal is not a member and is refused.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import GroupRegistry from '../../../../../obj/GroupRegistry';
import ParcelRegistry from '../../../../../obj/ParcelRegistry';
import AccessRegistry from '../../../../../obj/AccessRegistry';
import Avatar from '../../../../../obj/Avatar';
import Katie from '../Katie';
import ProvisionController from '../../command/ProvisionController';
import { GroupApi } from '../../../../../api/group';
import { CommandApi } from '../../../../../api/command';
import { MixinApi } from '../../../../../api/mixin';
import { Mixins } from '../../../../../lib/mixin';
import { ParcelApi } from '../../../../../api/parcel';
import { AccessApi } from '../../../../../api/access';
import { StuffApi } from '../../../../../api/stuff';
import { DialogueTreeSchema } from '../../../../../lib/npc/tree';
import { type ParcelOwner } from '../../../../../lib/parcel/ParcelRecord';
import { PersistenceManager } from '../../../../../../backend/PersistenceManager';
import { GroupSeeder } from '../../../../../../backend/GroupSeeder';
import { Document } from '../../../../../lib/persistence/Document';
import { makeStuffAtPath } from '../../../../../lib/security/__tests__/test-setup';

const DORMS_OWNER: ParcelOwner = { kind: 'group', name: 'duncan-hall' };

interface Doc extends Record<string, unknown> {
  _id?: string;
}
let store: Map<string, Doc[]>;
let idCounter = 0;

function col(name: string): Doc[] {
  let arr = store.get(name);
  if (!arr) {
    arr = [];
    store.set(name, arr);
  }
  return arr;
}

function installStore(): void {
  store = new Map();
  idCounter = 0;
  const save = vi.fn(async (c: string, doc: Doc) => {
    const arr = col(c);
    if (doc._id) {
      const i = arr.findIndex((d) => d._id === doc._id);
      if (i >= 0) arr[i] = { ...doc };
      else arr.push({ ...doc });
      return doc._id;
    }
    const id = String(++idCounter);
    arr.push({ ...doc, _id: id });
    return id;
  });
  const find = vi.fn(async (c: string, q: Record<string, unknown>) => {
    const arr = col(c);
    const keys = Object.keys(q);
    if (keys.length === 0) return arr.slice();
    return arr.filter((d) =>
      keys.every((k) => {
        const stored = d[k];
        const wanted = q[k];
        if (Array.isArray(stored)) return stored.includes(wanted);
        return stored === wanted;
      }),
    );
  });
  const findById = vi.fn(
    async (c: string, id: string) => col(c).find((d) => d._id === id) ?? null,
  );
  const del = vi.fn(async (c: string, id: string) => {
    const arr = col(c);
    const i = arr.findIndex((d) => d._id === id);
    if (i >= 0) arr.splice(i, 1);
  });
  vi.spyOn(PersistenceManager, 'get').mockReturnValue({
    save,
    find,
    findById,
    delete: del,
    isConnected: () => true,
  } as unknown as PersistenceManager);
}

function seedDormsParcel(): void {
  col('parcels').push({
    _id: `seed-${++idCounter}`,
    extent: '/domain/eternal/duncan-hall/dorms',
    zonePath: '/domain/eternal/duncan-hall/dorms',
    owner: DORMS_OWNER,
    parentParcel: null,
    grants: [],
    allowance: null,
  });
}

async function bootWithAccess(): Promise<void> {
  // `ParcelRecord.area` carries a QuantityMarshaller, so loading the
  // coverage index preloads it. Nothing here declares an area (null skips
  // the marshaller entirely), so a no-op resolver is enough — the
  // OfficeController.test.ts precedent.
  Document.setMarshallerResolver(
    () => undefined,
    async () => undefined,
  );
  const groups = makeStuffAtPath(() => new GroupRegistry(), '/obj/GroupRegistry');
  await groups.postRegister();
  const parcels = makeStuffAtPath(() => new ParcelRegistry(), '/obj/ParcelRegistry');
  await parcels.postRegister();
  const access = makeStuffAtPath(() => new AccessRegistry(), '/obj/AccessRegistry');
  await access.postRegister();
}

function reset(): void {
  vi.restoreAllMocks();
  ParcelApi._resetRegistryRefForReload();
  AccessApi._resetRegistryRefForReload();
  StuffApi.clearAll();
}

describe('Katie — the dorms-agent authorization boundary', () => {
  beforeEach(() => {
    reset();
    installStore();
  });
  afterEach(reset);

  it('is conferred dorms-agent membership from authored group data (GroupSeeder), not self-enrolled', async () => {
    await bootWithAccess();
    // The landlord's `duncan-hall` group and Katie's membership are authored
    // in config/groups.yaml and seeded by GroupSeeder — the owner confers it.
    // Katie's class runs no enrollment code.
    await GroupSeeder.run();

    const ref = await ParcelApi.resolveOwnerRef(DORMS_OWNER);
    expect(ref).not.toBeNull();
    expect(
      await GroupApi.isMember('/domain/eternal/duncan-hall/npc/katie', ref!),
    ).toBe(true);
  });

  it('composes PopulatesMixin so her master ring is an authored loadout, not self-issued', () => {
    // The master ring is `populates`d in from npc/master-ring.yaml (an
    // owner-authored spawn loadout). That only works if Katie is a Populates
    // host — this pins the composition (the seed row's credential is proven a
    // working pin-tumbler master in lib/lock/__tests__/Lock.test.ts).
    const katie = makeStuffAtPath(
      () => new Katie(),
      '/domain/eternal/duncan-hall/npc/katie',
    );
    expect(MixinApi.hasMixin(katie, Mixins.Populates)).toBe(true);
  });

  it('affords the operator provision/unprovision surface as content (not a core mixin)', () => {
    // The raw operator verbs are afforded by Katie herself — she is the
    // front desk. Content commands are afforded by content, referenced by
    // their `domain/`-prefixed view key, and those keys resolve to real
    // definitions (the domain-local `getCommand` branch).
    const env = Katie.commandContributions.peers ?? [];
    expect(env).toContain('domain/eternal/duncan-hall/cmd/provision.yaml');
    expect(env).toContain('domain/eternal/duncan-hall/cmd/unprovision.yaml');
    for (const key of env) {
      expect(CommandApi.getCommand(key), key).not.toBeNull();
    }
  });

  it('authorizes Katie (a dorms agent) and refuses a random principal', async () => {
    seedDormsParcel();
    await bootWithAccess();

    const katie = makeStuffAtPath(
      () => new Katie(),
      '/domain/eternal/duncan-hall/npc/katie',
    );
    // Membership is conferred by the owner's authored group data (seeded),
    // not by Katie enrolling herself.
    await GroupSeeder.run();
    // Katie is an agent of the dorms owner → authorized (not via a wizard
    // bit — an NPC has no playerId, so isWizard is false; the group is why).
    expect(await AccessApi.isWizard(katie)).toBe(false);
    expect(await ProvisionController.isDormsAgent(katie, DORMS_OWNER)).toBe(true);

    // A random online player, neither wizard nor dorms staff → refused.
    const stranger = makeStuffAtPath(() => new Avatar(), '/obj/Avatar/stranger');
    stranger.setPlayerId('stranger');
    expect(await ProvisionController.isDormsAgent(stranger, DORMS_OWNER)).toBe(false);
  });
});

describe('the dispatch dialogue effect — schema', () => {
  it('accepts a well-formed dispatch effect and rejects a malformed one', () => {
    const ok = {
      entry: [{ node: 'a' }],
      nodes: {
        a: {
          beat: 'hi',
          choices: [
            {
              line: 'room',
              terminal: true,
              effects: [{ verb: 'dispatch', command: 'provision $player' }],
            },
          ],
        },
      },
    };
    expect(DialogueTreeSchema.validate(ok)).toEqual([]);

    const bad = {
      entry: [{ node: 'a' }],
      nodes: {
        a: {
          choices: [
            { line: 'x', terminal: true, effects: [{ verb: 'dispatch' }] },
          ],
        },
      },
    };
    expect(DialogueTreeSchema.validate(bad).join(' ')).toMatch(/dispatch/);
  });
});
