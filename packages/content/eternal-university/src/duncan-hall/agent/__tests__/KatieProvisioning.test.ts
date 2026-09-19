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

import "@saxonberg/server/test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import GroupRegistry from '@saxonberg/server/mud/platform/idea/GroupRegistry';
import ParcelRegistry from '@saxonberg/server/mud/platform/idea/ParcelRegistry';
import AccessRegistry from '@saxonberg/server/mud/platform/idea/AccessRegistry';
import Avatar from '@saxonberg/server/mud/platform/agent/Avatar';
import Katie from '../Katie';
import ProvisionController from '../../idea/cmd/ProvisionController';
import { CompactApi } from '@saxonberg/server/mud/api/compact';
import OrganizationEntity from '@saxonberg/server/mud/platform/idea/Organization';
import { HALL_EXTENT, COLLEGE_PATH } from '../../../lib/HallController';
import { CommandApi } from '@saxonberg/server/mud/api/command';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { Mixins } from '@saxonberg/server/mud/lib/mixin';
import { ParcelApi } from '@saxonberg/server/mud/api/parcel';
import { AccessApi } from '@saxonberg/server/mud/api/access';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { DialogueTreeSchema } from '@saxonberg/server/mud/lib/npc/tree';
import { type ParcelOwner } from '@saxonberg/server/mud/lib/parcel/ParcelRecord';
import { PersistenceManager } from '@saxonberg/server/mud/lib/persistence/__tests__/backend-store';

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

/** The pack's manifest and the college row, read as files (the authored facts). */
const MANIFEST = fileURLToPath(new URL('../../../../pack.yaml', import.meta.url));
const COLLEGE_ROW = fileURLToPath(
  new URL('../../../../content/world/terminus/eternal/duncan-hall/idea/college.yaml', import.meta.url),
);
import { Document } from '@saxonberg/server/mud/lib/persistence/Document';
import { makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';

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
    extent: '/world/terminus/eternal/duncan-hall/dorms',
    zonePath: '/world/terminus/eternal/duncan-hall/dorms',
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
  const groups = makeStuffAtPath(() => new GroupRegistry(), '/platform/idea/GroupRegistry');
  await groups.postRegister();
  const parcels = makeStuffAtPath(() => new ParcelRegistry(), '/platform/idea/ParcelRegistry');
  await parcels.postRegister();
  const access = makeStuffAtPath(() => new AccessRegistry(), '/platform/idea/AccessRegistry');
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

  it('⭐ is NOT a member of the landlord group — an NPC is never on a committee (economic bootstrap D8)', async () => {
    // The `duncan-hall` group HOLDS the hall (players only, the founder by
    // default). Katie's authority is a JOB: the `hall-manager` position at
    // the college Organization, on its authored roster — never a seat.
    const manifest = parseYaml(readFileSync(MANIFEST, 'utf8')) as {
      requires: { groups: Array<{ name: string; members?: Array<{ id: string }> }> };
    };
    const landlord = manifest.requires.groups.find((g) => g.name === 'duncan-hall')!;
    expect(landlord.members ?? []).toEqual([]);
    const college = parseYaml(readFileSync(COLLEGE_ROW, 'utf8')) as {
      data: { appointingAuthority: unknown; rosterSlots: Array<{ positionKey: string; assignee: string }> };
    };
    expect(college.data.appointingAuthority).toEqual({ kind: 'committee', parcel: HALL_EXTENT });
    expect(college.data.rosterSlots).toContainEqual({
      positionKey: 'hall-manager',
      assignee: '/world/terminus/eternal/duncan-hall/agent/katie',
    });
  });

  it('composes PopulatesMixin so her master ring is an authored loadout, not self-issued', () => {
    // The master ring is `props`d in from npc/master-ring.yaml (an
    // owner-authored spawn loadout). That only works if Katie is a Populates
    // host — this pins the composition (the seed row's credential is proven a
    // working pin-tumbler master in lib/lock/__tests__/Lock.test.ts).
    const katie = makeStuffAtPath(
      () => new Katie(),
      '/world/terminus/eternal/duncan-hall/agent/katie',
    );
    expect(MixinApi.hasMixin(katie, Mixins.Populates)).toBe(true);
  });

  it('affords the operator provision/unprovision surface as content (not a core mixin)', () => {
    // The raw operator verbs are afforded by Katie herself — she is the
    // front desk. Content commands are afforded by content, referenced by
    // their `world/`-prefixed view key, and those keys resolve to real
    // definitions (the domain-local `getCommand` branch).
    const env = Katie.commandContributions.peers ?? [];
    expect(env).toContain('world/terminus/eternal/duncan-hall/cmd/provision.yaml');
    expect(env).toContain('world/terminus/eternal/duncan-hall/cmd/unprovision.yaml');
    // Nothing preloaded views from a store here, so the keys resolve to
    // the pack's own view files (offline = the pack files).
    CommandApi.clearCache();
    for (const key of env) {
      expect(CommandApi.getCommand(key), key).not.toBeNull();
    }
  });

  it('authorizes Katie (the hall manager, staff of the college) and refuses a random principal', async () => {
    seedDormsParcel();
    await bootWithAccess();

    const katie = makeStuffAtPath(
      () => new Katie(),
      '/world/terminus/eternal/duncan-hall/agent/katie',
    );
    // The college Organization, as its authored row stands it up: Katie
    // holds `hall-manager` off the roster — no employment write, no
    // group membership, no wizard bit.
    const college = makeStuffAtPath(() => new OrganizationEntity(), COLLEGE_PATH);
    college.positions = [{ key: 'hall-manager', label: 'managing', wageRate: 0, confers: [] }];
    college.rosterSlots = [
      { positionKey: 'hall-manager', assignee: '/world/terminus/eternal/duncan-hall/agent/katie', schedule: [] },
    ];
    expect(await AccessApi.isWizard(katie)).toBe(false);
    expect(college.employs(katie)).toBe(true);

    // The gate itself, through the verb: Katie may provision; a random
    // online player, neither staff nor on the hall's committee, may not.
    const stranger = makeStuffAtPath(() => new Avatar(), '/platform/agent/Avatar/stranger');
    stranger.setPlayerId('stranger');
    expect(college.employs(stranger)).toBe(false);
    expect(await CompactApi.isCommitteeMember(stranger, HALL_EXTENT)).toBe(false);
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
