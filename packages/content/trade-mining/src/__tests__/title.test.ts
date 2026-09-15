/**
 * ⭐⭐ **A content edit cannot mint or alter a title** (metal chain R4).
 *
 * The governing security invariant, and it is structural rather than
 * procedural: title lives in the gated `parcels` collection, **stored
 * separately from the `content` rows it gates** — because if title lived
 * beside the thing it governs, editing the thing could edit who may edit
 * it. `ParcelApi.ownerOf` resolves a path to a holder by longest prefix,
 * and every content-write authorisation in the system bottoms out there.
 *
 * A mining claim is the sharpest test of that, because staking is the one
 * act in the game that CREATES title from nothing but standing somewhere:
 * `stake` is a first-come registration over ground, not a purchase from a
 * catalogue of lots somebody laid out. If content could confer title, a
 * player who can edit a room could award themselves the mine.
 *
 * ⚠ This asserts the shape a reviewer can check by reading, not a
 * runtime path: no shipped row carries an ownership key, and the staking
 * verb reaches title only through the gated Api.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import { Collections } from '@saxonberg/server/mud/lib/persistence/Collections';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ParcelApi } from '@saxonberg/server/mud/api/parcel';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { ExecutionContextApi } from '@saxonberg/server/mud/api/execution-context';
import type { ParcelOwner } from '@saxonberg/server/mud/lib/parcel/ParcelRecord';
import StakeController from '../idea/cmd/mining/StakeController';
import ClaimsRegister from '../thing/ClaimsRegister';
import MineWarren from '../idea/MineWarren';
import {
  TestActor,
  standUpBranchHarness,
  makeContext,
} from '@saxonberg/server/mud/platform/idea/cmd/crafting/__tests__/branch-fixtures';
import {
  makeStuff,
  makeStuffAtPath,
  stampIdentityPathForTest,
} from '@saxonberg/server/mud/lib/security/__tests__/test-setup';

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKS = join(HERE, '..', '..', '..');

/**
 * Keys that would confer or describe ownership if a row could carry
 * them. `ownerGroup`/`accessGroups` are the historical ones — they lived
 * on the editable zone template until property phase 0a moved title into
 * `parcels`, which is the precedent this guards.
 */
const OWNERSHIP_KEYS = [
  'ownerGroup',
  'ownerGroupName',
  'accessGroups',
  'owner',
  'holder',
  'title',
  'parcelOwner',
];

function rowsUnder(pack: string): Array<{ file: string; data: Record<string, unknown> }> {
  const out: Array<{ file: string; data: Record<string, unknown> }> = [];
  const root = join(PACKS, pack, 'content');
  const walk = (dir: string, rel: string): void => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        walk(full, `${rel}/${entry}`);
        continue;
      }
      if (!entry.endsWith('.yaml')) continue;
      try {
        const doc = YAML.parse(readFileSync(full, 'utf8')) as Record<string, unknown>;
        const data = (doc?.data ?? null) as Record<string, unknown> | null;
        if (data && typeof data === 'object') out.push({ file: `${rel}/${entry}`, data });
      } catch {
        // A row that does not parse is another gate's problem.
      }
    }
  };
  walk(root, pack);
  return out;
}

describe('title is not content (metal chain R4)', () => {
  const rows = [...rowsUnder('trade-mining'), ...rowsUnder('rejection')];

  it('⚠ the scan reads a real corpus — it would pass identically finding nothing', () => {
    expect(rows.length).toBeGreaterThan(50);
  });

  it('⭐ no shipped row of the mine or its town carries an ownership key', () => {
    const offenders: string[] = [];
    for (const { file, data } of rows) {
      for (const key of OWNERSHIP_KEYS) {
        if (key in data) offenders.push(`${file}: ${key}`);
      }
    }
    expect(
      offenders,
      `content rows conferring title:\n  ${offenders.join('\n  ')}`,
    ).toEqual([]);
  });

  it('⭐⭐ title lives in its OWN collection, never beside the content it gates', () => {
    // The two are distinct collections by name, which is the whole of the
    // invariant: an editor with write access to one has none to the other.
    expect(Collections.Parcels).toBe('parcels');
    expect(Collections.Parcels).not.toBe(Collections.Content);
  });

  it('⭐ `stake` reaches title ONLY through the gated Api, and mints no room', () => {
    const src = readFileSync(
      join(PACKS, 'trade-mining', 'src', 'idea', 'cmd', 'mining', 'StakeController.ts'),
      'utf8',
    );
    // It registers title…
    expect(src).toMatch(/ParcelApi\.subdivide\(/);
    expect(src).toMatch(/ParcelApi\.ownerOf\(/);
    /*
     * …and mints NO room. A claim is a title over ground and nothing
     * else — that is the difference between `stake` and `title buy`, and
     * it is why a claim block's `parcelExtent` is deliberately allowed to
     * name ground no template backs (`IGNORED_PATH_FIELDS`).
     */
    expect(src).not.toMatch(/StuffApi\.clone\(/);
    // Nor does it write the collection directly — no path around the gate.
    expect(src).not.toMatch(/Collections\.Parcels/);
    expect(src).not.toMatch(/parcel_events/);
  });
});

/**
 * ⚠⚠ **A PERSON keys on `getIdentityPath()`, never `getTemplatePath()`.**
 *
 * `StakeController` wrote the claim's owner as the staker's TEMPLATE
 * path. Every player Avatar shares one — D17 stamps lineage and identity
 * separately — so every claim in the mine was owned by every player at
 * once. It is the same defect that cost a shared bank account and a dead
 * labor market in MR !251, surviving in the one pack that sweep did not
 * reach; `ParcelOwner.templatePath` is an identity path by the kernel's
 * own convention (`TitleController`, `TransferController`,
 * `ChattelLogic`, `EmploymentLogic` all write one).
 *
 * ⭐⭐ It was invisible to every test because fixtures author a distinct
 * template path per avatar — so this one deliberately does NOT. Two
 * stakers, one lineage, two claims: if the owners come back equal, the
 * mine belongs to nobody in particular.
 */
describe('⚠⚠ a staked claim is owned by a PERSON, not by a lineage', () => {
  const AVATAR_LINEAGE = '/platform/agent/Avatar';
  const WARREN = '/world/fx/idea/fx-warren';

  let room: TestActor;
  let owners: ParcelOwner[];

  /**
   * The owner's key, narrowed. `ParcelOwner` is a union — a group owner
   * carries a name, a person carries a path — and the whole point here
   * is which string the person arm got.
   */
  function personKey(owner: ParcelOwner | undefined): string | undefined {
    return owner && owner.kind !== 'group' ? owner.templatePath : undefined;
  }

  /** An avatar that shares the ONE player lineage, with its own identity. */
  function staker(identity: string): TestActor {
    const a = makeStuffAtPath(() => new TestActor(), AVATAR_LINEAGE);
    stampIdentityPathForTest(a, identity);
    ContainmentApi.move(a, room);
    return a;
  }

  async function stake(who: TestActor, block: string): Promise<void> {
    const context = makeContext(who, room, `stake ${block}`);
    await ExecutionContextApi.runRoot(null, 'test', async () => {
      ExecutionContextApi.tagActingAuthor(who);
      await makeStuff(() => new StakeController()).execute(
        { block } as never,
        context,
      );
    });
    expect(
      context.getNotes().filter((n) => n.kind === 'controller-rejected'),
      `stake ${block} was declined`,
    ).toEqual([]);
  }

  beforeEach(async () => {
    await standUpBranchHarness();
    owners = [];
    // The register and the diggings it records for.
    const warren = makeStuffAtPath(() => new MineWarren(), WARREN);
    warren.setMineExtent('/world/fx/mine');
    room = makeStuff(() => new TestActor());
    const register = makeStuff(() => new ClaimsRegister());
    register.setWarrenPath(WARREN);
    ContainmentApi.move(register, room);

    // The gated Api is the seam: capture what the verb asks it to record.
    vi.spyOn(ParcelApi, 'subdivide').mockImplementation(
      async (extent: string, _parent: string, owner: ParcelOwner) => {
        owners.push(owner);
        return { extent, owner } as never;
      },
    );
    vi.spyOn(ParcelApi, 'ownerOf').mockResolvedValue(null as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('⭐⭐ two stakers sharing ONE templatePath get two different owners', async () => {
    const iris = staker('/platform/agent/Avatar/iris');
    const pat = staker('/platform/agent/Avatar/pat');
    // The premise the old test fixtures quietly never had:
    expect(iris.getTemplatePath()).toBe(pat.getTemplatePath());

    await stake(iris, '20,20,0');
    await stake(pat, '40,40,0');

    expect(owners).toHaveLength(2);
    expect(owners[0]!.kind).toBe('player');
    expect(personKey(owners[0])).toBe('/platform/agent/Avatar/iris');
    expect(personKey(owners[1])).toBe('/platform/agent/Avatar/pat');
    // The assertion that was false until this build:
    expect(personKey(owners[0])).not.toBe(personKey(owners[1]));
  });

  it('⭐ the owner written is the IDENTITY path, which is what the register means', async () => {
    const iris = staker('/platform/agent/Avatar/iris');
    await stake(iris, '20,20,0');
    expect(personKey(owners[0])).toBe(iris.getIdentityPath());
    expect(personKey(owners[0])).not.toBe(iris.getTemplatePath());
  });
});
