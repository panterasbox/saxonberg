/**
 * The requires phase (content-packs wave 3, D4/D7): what the registries
 * grant a pack at install. Groups ensure-exist (adopt-by-name, never
 * re-owned); the maintainers group is PM-owned and empty after a
 * bootstrap install (UNSTAFFED); titles are granted / kept /
 * conflicted through `ParcelApi.grant`; the NPC-only membership fence,
 * the declared-group and shipped-organization rules and coverage all fail
 * at `requires-kernel` before any write; the bounded reconcile skips a
 * row whose extent was sold; a non-bootstrap principal must hold the
 * covering title; an unknown manifest key fails at `read`.
 *
 * The group and parcel registries are in-memory stores behind spies on
 * `GroupApi` / `ParcelApi` — the installer reaches them only through
 * those seams.
 */

import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PackApi } from '../../../../api/pack';
import { GroupApi } from '../../../../api/group';
import { AccessApi } from '../../../../api/access';
import { StuffApi } from '../../../../api/stuff';
import { DiagnosticApi } from '../../../../api/diagnostics';
import { ExecutionContextApi } from '../../../../api/execution-context';
import { Idea } from '../../../../lib/stuff/Idea';
import { OrganizationMixin } from '../../../../lib/employment/Organization';
import Avatar from '../../../agent/Avatar';
import { makeStuffAtPath, withRootContext } from '../../../../lib/security/__tests__/test-setup';
import {
  store,
  stubPersist,
  stubClassResolution,
  quietConsole,
  recordOf,
  contentRows,
  writePack,
  cleanupPacks,
  groups,
  parcels,
} from './pack-harness';

class OrganizationEntity extends OrganizationMixin(Idea) {}

beforeEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
  stubPersist();
  stubClassResolution();
  quietConsole();
  vi.spyOn(DiagnosticApi, 'record').mockResolvedValue(undefined);
});
afterEach(() => {
  vi.restoreAllMocks();
  cleanupPacks();
  StuffApi.clearAll();
});

const ROW = (rel: string) => ({ rel, data: { name: rel } });

describe('the requires phase — groups', () => {
  it('a maintainers group per pack, PM-owned, empty after a bootstrap install (UNSTAFFED); declared groups ensure-exist', async () => {
    const root = writePack('hills', [ROW('studio/hills/gate.yaml')], {
      manifest: {
        requires: {
          groups: [
            { name: 'hinkley-hills', purpose: 'the Improvement District' },
            { name: 'wardens', purpose: 'the gate wardens', owner: { office: 'prime-minister' } },
          ],
          title: [{ extent: '/studio/hills' }],
        },
      },
    });
    const [r] = await PackApi.install([root]);
    expect(r!.failure).toBeNull();
    expect(r!.requires.groupsCreated).toEqual(['hills-maintainers', 'hinkley-hills', 'wardens']);
    expect(r!.requires.groupsFound).toEqual([]);
    expect(groups.find((g) => g.name === 'hills-maintainers')?.owner).toEqual({ kind: 'office', office: 'prime-minister' });
    expect(groups.find((g) => g.name === 'hinkley-hills')?.owner).toEqual({ kind: 'system' });
    expect(groups.find((g) => g.name === 'wardens')?.owner).toEqual({ kind: 'office', office: 'prime-minister' });
    expect(r!.staffed).toBe(false);
    // The record remembers what was applied.
    const rec = recordOf('hills')!;
    expect(rec.maintainers).toEqual({ group: 'hills-maintainers' });
    expect(rec.requires.groups.map((g) => g.name)).toEqual(['hinkley-hills', 'wardens']);
  });

  it('adopt-by-name: a second install FINDS every group and never re-owns it', async () => {
    const root = writePack('hills', [ROW('studio/hills/gate.yaml')], {
      manifest: { requires: { groups: [{ name: 'hinkley-hills', purpose: 'p' }], title: [{ extent: '/studio/hills' }] } },
    });
    await PackApi.install([root]);
    groups.find((g) => g.name === 'hinkley-hills')!.owner = { kind: 'player', templatePath: '/platform/agent/Avatar/x' };
    const [r] = await PackApi.install([root]);
    expect(r!.requires.groupsCreated).toEqual([]);
    expect(r!.requires.groupsFound).toEqual(['hills-maintainers', 'hinkley-hills']);
    expect(groups.find((g) => g.name === 'hinkley-hills')?.owner).toEqual({ kind: 'player', templatePath: '/platform/agent/Avatar/x' });
    expect(r!.requires.titlesKept).toEqual(['/studio/hills']);
  });

  it('a staffed maintainers group reports staffed', async () => {
    const root = writePack('hills', [ROW('studio/hills/gate.yaml')], {
      manifest: { requires: { title: [{ extent: '/studio/hills' }] } },
    });
    groups.push({ name: 'hills-maintainers', owner: { kind: 'system' }, members: [{ id: '/platform/agent/Avatar/a', role: 'member' }] });
    const [r] = await PackApi.install([root]);
    expect(r!.staffed).toBe(true);
    expect(r!.requires.groupsFound).toEqual(['hills-maintainers']);
  });
});

describe('the requires phase — the NPC-only membership fence', () => {
  const manifestWith = (id: string) => ({
    requires: {
      groups: [{ name: 'duncan-hall', purpose: "the landlord's staff", members: [{ id, role: 'member' }] }],
      title: [{ extent: '/studio/eternal/duncan-hall', holder: { group: 'duncan-hall' } }],
    },
  });

  it('an NPC row under the pack\'s own claim is enrolled (idempotently)', async () => {
    const root = writePack('world-seed', [ROW('studio/eternal/duncan-hall/npc/katie.yaml')], {
      manifest: manifestWith('/studio/eternal/duncan-hall/npc/katie'),
    });
    const [r] = await PackApi.install([root]);
    expect(r!.failure).toBeNull();
    expect(r!.requires.membersAdded).toEqual(['duncan-hall:/studio/eternal/duncan-hall/npc/katie']);
    const [again] = await PackApi.install([root]);
    expect(again!.requires.membersAdded).toEqual([]);
    expect(groups.find((g) => g.name === 'duncan-hall')?.members).toHaveLength(1);
  });

  it('a /platform/agent/Avatar/<id> is refused — a pack may not enrol a person', async () => {
    const root = writePack('world-seed', [ROW('studio/eternal/duncan-hall/npc/katie.yaml')], {
      manifest: manifestWith('/platform/agent/Avatar/founder'),
    });
    const [r] = await PackApi.install([root]);
    expect(r!.failure?.step).toBe('requires-kernel');
    expect(r!.failure?.error).toMatch(/may only enrol NPC rows it ships/);
    expect(contentRows()).toHaveLength(0);
    expect(groups).toHaveLength(0);
  });

  it('an NPC the pack ships OUTSIDE its own claim is refused', async () => {
    const root = writePack('world-seed', [ROW('studio/terminus/npc/clerk.yaml'), ROW('studio/eternal/duncan-hall/lobby.yaml')], {
      manifest: {
        requires: {
          groups: [{ name: 'duncan-hall', purpose: 'p', members: [{ id: '/studio/terminus/npc/clerk' }] }],
          title: [{ extent: '/studio/eternal/duncan-hall', holder: { group: 'duncan-hall' } }, { extent: '/studio/terminus' }],
        },
      },
    });
    const [r] = await PackApi.install([root]);
    // The row is under /studio/terminus, which the pack claims — but the
    // fence demands the pack's own claims cover it, which /studio/terminus does.
    expect(r!.failure).toBeNull();
    const bad = writePack('world-seed-2', [ROW('studio/terminus/npc/clerk.yaml')], {
      manifest: {
        requires: {
          groups: [{ name: 'g', purpose: 'p', members: [{ id: '/studio/terminus/npc/clerk' }] }],
          title: [{ extent: '/studio/eternal' }],
        },
      },
    });
    const [r2] = await PackApi.install([bad]);
    expect(r2!.failure?.step).toBe('requires-kernel');
    expect(r2!.failure?.error).toMatch(/outside every extent the pack itself claims/);
  });
});

describe('the requires phase — titles', () => {
  it('grants on a fresh store to the maintainers by default; a named group must be declared', async () => {
    const root = writePack('lounge', [ROW('stuff/idea/lounge/bar.yaml')], {
      manifest: {
        maintainers: 'lounge',
        requires: { groups: [{ name: 'lounge', purpose: 'the lounge team' }], title: [{ extent: '/stuff/idea/lounge' }, { extent: '/studio/lounge', holder: { group: 'lounge' } }] },
      },
    });
    const [r] = await PackApi.install([root]);
    expect(r!.failure).toBeNull();
    expect(r!.requires.titlesGranted).toEqual(['/stuff/idea/lounge', '/studio/lounge']);
    expect(parcels).toEqual([
      { extent: '/stuff/idea/lounge', owner: { kind: 'group', name: 'lounge' } },
      { extent: '/studio/lounge', owner: { kind: 'group', name: 'lounge' } },
    ]);
    const undeclared = writePack('lounge-2', [ROW('stuff/thing/lounge2/bar.yaml')], {
      manifest: { requires: { title: [{ extent: '/stuff/thing/lounge2', holder: { group: 'nobody' } }] } },
    });
    const [r2] = await PackApi.install([undeclared]);
    expect(r2!.failure?.step).toBe('requires-kernel');
    expect(r2!.failure?.error).toMatch(/group 'nobody'/);
  });

  it('a claim a dependsOn pack declares the group for is admitted (the annex knows the host)', async () => {
    const platform = writePack('platform', [ROW('stuff/thing/x.yaml')], {
      manifest: { requires: { groups: [{ name: 'soul', purpose: 'the soul committee' }], title: [{ extent: '/stuff' }] } },
    });
    const expression = writePack('expression', [ROW('expression/emotes/wave.yaml')], {
      dependsOn: ['platform'],
      manifest: { maintainers: 'soul', requires: { title: [{ extent: '/expression', holder: { group: 'soul' } }] } },
    });
    const results = await PackApi.install([expression, platform]);
    expect(results.map((r) => r.packId)).toEqual(['platform', 'expression']);
    expect(results[1]!.failure).toBeNull();
    expect(parcels.find((p) => p.extent === '/expression')?.owner).toEqual({ kind: 'group', name: 'soul' });
  });

  it('kept on a same-holder claim; two packs naming one extent with one holder never conflict', async () => {
    const a = writePack('a', [ROW('studio/lounge/x.yaml')], {
      manifest: { requires: { groups: [{ name: 'lounge', purpose: 'p' }], title: [{ extent: '/studio/lounge', holder: { group: 'lounge' } }] } },
    });
    const b = writePack('b', [ROW('studio/lounge/y.yaml')], {
      dependsOn: ['a'],
      manifest: { requires: { title: [{ extent: '/studio/lounge', holder: { group: 'lounge' } }] } },
    });
    const [ra, rb] = await PackApi.install([a, b]);
    expect(ra!.requires.titlesGranted).toEqual(['/studio/lounge']);
    expect(rb!.requires.titlesKept).toEqual(['/studio/lounge']);
    expect(rb!.requires.titleConflicts).toEqual([]);
    const [ra2, rb2] = await PackApi.install([a, b]);
    expect(ra2!.requires.titlesKept).toEqual(['/studio/lounge']);
    expect(rb2!.requires.titlesKept).toEqual(['/studio/lounge']);
  });

  it('a foreign holder → a `title` conflict: recorded, diagnosed, the title untouched', async () => {
    parcels.push({ extent: '/studio/lounge', owner: { kind: 'group', name: 'terminus' } });
    const root = writePack('lounge', [ROW('studio/lounge/x.yaml')], {
      manifest: { requires: { groups: [{ name: 'lounge', purpose: 'p' }], title: [{ extent: '/studio/lounge', holder: { group: 'lounge' } }] } },
    });
    const [r] = await PackApi.install([root]);
    expect(r!.failure).toBeNull();
    expect(r!.requires.titleConflicts).toEqual(['/studio/lounge']);
    expect(r!.conflicts).toEqual(['/studio/lounge']);
    expect(parcels[0]!.owner).toEqual({ kind: 'group', name: 'terminus' });
    const rec = recordOf('lounge')!;
    expect(rec.conflicts[0]).toMatchObject({ path: '/studio/lounge', kind: 'title', reason: 'title' });
    expect(DiagnosticApi.record).toHaveBeenCalledWith(
      expect.objectContaining({ channel: 'pack.lounge', message: expect.stringMatching(/title conflict at \/studio\/lounge/) }),
    );
    // The domain row itself was skipped: its extent is held by nobody in the pack's holder set.
    expect(r!.requires.skippedSold).toEqual(['/studio/lounge/x']);
    expect(contentRows()).toHaveLength(0);
  });

  it('a row held by a group outside the pack\'s holder set is a title conflict, and its rows are skipped as sold (no core exemption, wave 4a)', async () => {
    parcels.push({ extent: '/stuff/thing/studio', owner: { kind: 'group', name: 'somebody-else' } });
    const root = writePack('platform', [ROW('stuff/thing/studio/x.yaml')], {
      manifest: { requires: { title: [{ extent: '/stuff/thing/studio' }] } },
    });
    const [r] = await PackApi.install([root]);
    expect(r!.failure).toBeNull();
    expect(r!.requires.titleConflicts).toEqual(['/stuff/thing/studio']);
    expect(r!.requires).not.toHaveProperty('titlesMigrated');
    // The holder is untouched — no transfer, whoever they are.
    expect(parcels[0]!.owner).toEqual({ kind: 'group', name: 'somebody-else' });
    // The row under the foreign extent is sold out from under the pack: skipped, never written.
    expect(r!.requires.skippedSold).toEqual(['/stuff/thing/studio/x']);
    expect(contentRows()).toHaveLength(0);
  });

  it('an organization maintainer must be a shipped row; its titles are granted to it; the head alone is unstaffed', async () => {
    // (`/stuff/thing/executive` stands in for `/compact/executive`: the top-level
    // template walk widens at step 4; the rule under test is the same.)
    const unshipped = writePack('platform', [ROW('stuff/thing/x.yaml')], {
      manifest: { maintainers: { organization: '/stuff/thing/executive' }, requires: { title: [{ extent: '/stuff' }] } },
    });
    const [r1] = await PackApi.install([unshipped]);
    expect(r1!.failure?.step).toBe('requires-kernel');
    expect(r1!.failure?.error).toMatch(/names organization '\/stuff\/thing\/executive' as its maintainers/);

    const shipped = writePack('platform-2', [ROW('stuff/thing/x.yaml'), ROW('stuff/thing/executive.yaml')], {
      manifest: {
        maintainers: { organization: '/stuff/thing/executive' },
        requires: { title: [{ extent: '/stuff' }, { extent: '/compact' }, { extent: '/blueprints', holder: { organization: '/stuff/thing/executive' } }] },
      },
    });
    const singleton = vi.spyOn(StuffApi, 'singleton').mockImplementation(async (path: string) => {
      const org = makeStuffAtPath(() => new OrganizationEntity(), path);
      org.appointingAuthority = { kind: 'office', office: 'prime-minister' };
      return org as never;
    });
    const [r2] = await PackApi.install([shipped]);
    expect(r2!.failure).toBeNull();
    expect(singleton).toHaveBeenCalledWith('/stuff/thing/executive');
    expect(r2!.requires.titlesGranted).toEqual(['/stuff', '/compact', '/blueprints']);
    for (const p of parcels) expect(p.owner).toEqual({ kind: 'organization', templatePath: '/stuff/thing/executive' });
    expect(r2!.requires.groupsCreated).toEqual([]);
    expect(r2!.staffed).toBe(false);
    expect(recordOf('platform-2')!.maintainers).toEqual({ organization: '/stuff/thing/executive' });
  });
});

describe('the requires phase — coverage and the bounded reconcile', () => {
  it('a row outside every claim fails at requires-kernel; a row under a dependsOn host\'s claim passes', async () => {
    const stray = writePack('stray', [ROW('stuff/thing/gear/hat.yaml'), ROW('studio/elsewhere/x.yaml')], {
      manifest: { requires: { title: [{ extent: '/stuff/thing/gear' }] } },
    });
    const [r] = await PackApi.install([stray]);
    expect(r!.failure?.step).toBe('requires-kernel');
    expect(r!.failure?.error).toMatch(/row \/studio\/elsewhere\/x is outside every extent/);
    expect(contentRows()).toHaveLength(0);

    const platform = writePack('platform', [ROW('stuff/thing/x.yaml')], { manifest: { requires: { title: [{ extent: '/stuff' }] } } });
    const annex = writePack('generic-objects', [ROW('stuff/thing/Campfire.yaml'), ROW('stuff/thing/gear/hat.yaml')], {
      dependsOn: ['platform'],
      manifest: { requires: { title: [{ extent: '/stuff/thing/gear' }] } },
    });
    const [rp, ra] = await PackApi.install([platform, annex]);
    expect(rp!.failure).toBeNull();
    expect(ra!.failure).toBeNull();
    expect(ra!.inserted.sort()).toEqual(['/stuff/thing/Campfire', '/stuff/thing/gear/hat']);
  });

  it('a pack whose whole host chain claims nothing passes coverage vacuously (pre-wave-3 shape)', async () => {
    const root = writePack('base-library', [ROW('stuff/idea/material/x.yaml')]);
    const [r] = await PackApi.install([root]);
    expect(r!.failure).toBeNull();
    expect(r!.requires.titlesGranted).toEqual([]);
    expect(r!.requires.groupsCreated).toEqual(['base-library-maintainers']);
  });

  it('a sold extent\'s rows are skipped-and-counted, never written; the host\'s holder still counts', async () => {
    parcels.push({ extent: '/stuff/thing/gear/lot', owner: { kind: 'player', templatePath: '/platform/agent/Avatar/buyer' } });
    const platform = writePack('platform', [ROW('stuff/thing/x.yaml')], { manifest: { requires: { title: [{ extent: '/stuff' }] } } });
    const annex = writePack('generic-objects', [ROW('stuff/thing/gear/hat.yaml'), ROW('stuff/thing/gear/lot/tent.yaml')], {
      dependsOn: ['platform'],
      manifest: { requires: { title: [{ extent: '/stuff/thing/gear' }] } },
    });
    const [, ra] = await PackApi.install([platform, annex]);
    expect(ra!.failure).toBeNull();
    expect(ra!.requires.skippedSold).toEqual(['/stuff/thing/gear/lot/tent']);
    expect(ra!.inserted).toEqual(['/stuff/thing/gear/hat']);
    expect(contentRows().map((c) => c.path).sort()).toEqual(['/stuff/thing/gear/hat', '/stuff/thing/x']);
  });
});

describe('the requires phase — the non-bootstrap precondition', () => {
  it('a person syncing a pack must hold the covering title of every claim', async () => {
    const root = writePack('lounge', [ROW('studio/lounge/x.yaml')], {
      manifest: { requires: { title: [{ extent: '/studio/lounge' }] } },
    });
    const actor = makeStuffAtPath(() => new Avatar(), '/platform/agent/Avatar/dev');
    actor.setPlayerId('dev');
    const can = vi.spyOn(AccessApi, 'canAtPath').mockResolvedValue(false);
    await expect(
      withRootContext(null, 'pack.test', () => {
        ExecutionContextApi.tagActingAuthor(actor);
        return PackApi.sync('lounge', root);
      }),
    ).rejects.toThrow(/claims '\/studio\/lounge', which \/platform\/agent\/Avatar\/dev does not hold/);
    expect(can).toHaveBeenCalledWith(actor, 'write-template', '/studio/lounge');
    expect(parcels).toEqual([]);
    can.mockResolvedValue(true);
    const r = await withRootContext(null, 'pack.test', () => {
      ExecutionContextApi.tagActingAuthor(actor);
      return PackApi.sync('lounge', root);
    });
    expect(r.requires.titlesGranted).toEqual(['/studio/lounge']);
  });
});

describe('the manifest', () => {
  // A manifest is read at discovery, before any pack is reconciled — a
  // malformed one throws out of `install` (nothing is written), exactly
  // as a malformed `dependsOn` did in wave 2.
  it('an unknown key fails at read', async () => {
    const root = writePack('typo', [ROW('stuff/thing/x.yaml')], { manifest: { requries: {} } });
    await expect(PackApi.install([root])).rejects.toThrow(
      /unknown key 'requries' \(known: id, version, description, dependsOn, root, requires, boot, maintainers\)/,
    );
    expect(store.rows.filter((x) => x.__col === 'content')).toHaveLength(0);
  });

  it('a group without a purpose, a malformed holder and an unknown landUse fail at read', async () => {
    const noPurpose = writePack('a', [ROW('stuff/thing/x.yaml')], { manifest: { requires: { groups: [{ name: 'g' }] } } });
    await expect(PackApi.install([noPurpose])).rejects.toThrow(/group 'g' needs a 'purpose'/);
    const badHolder = writePack('b', [ROW('stuff/thing/x.yaml')], { manifest: { requires: { title: [{ extent: '/stuff', holder: { player: 'x' } }] } } });
    await expect(PackApi.install([badHolder])).rejects.toThrow(/holder must be/);
    const badUse = writePack('c', [ROW('stuff/thing/x.yaml')], { manifest: { requires: { title: [{ extent: '/stuff', landUse: 'spaceport' }] } } });
    await expect(PackApi.install([badUse])).rejects.toThrow(/unknown landUse 'spaceport'/);
  });
});

describe('the requires phase on an EMPTY store (the first boot ever; every boot after a drop)', () => {
  it('the pack that ships /platform/idea/GroupRegistry + /platform/idea/ParcelRegistry writes them BEFORE its first ensureGroup, and the planner normalizes them', async () => {
    const seen: string[][] = [];
    const original = GroupApi.ensureGroup.bind(GroupApi);
    vi.spyOn(GroupApi, 'ensureGroup').mockImplementation(async (name, owner) => {
      seen.push(contentRows().map((r) => String(r.path)).sort());
      return original(name, owner);
    });
    const root = writePack(
      'platform',
      [
        { rel: 'platform/idea/GroupRegistry.yaml', class: '/platform/idea/GroupRegistry', data: {} },
        { rel: 'platform/idea/ParcelRegistry.yaml', class: '/platform/idea/ParcelRegistry', data: {} },
        ROW('platform/idea/x.yaml'),
      ],
      { manifest: { requires: { groups: [{ name: 'g', purpose: 'p', owner: { office: 'prime-minister' } }], title: [{ extent: '/platform' }] } } },
    );
    const [r] = await PackApi.install([root]);
    expect(r!.failure).toBeNull();
    // Every ensureGroup call (the maintainers group, then `g`) saw both registry rows already in the store.
    expect(seen.length).toBeGreaterThan(0);
    for (const rows of seen) expect(rows).toEqual(expect.arrayContaining(['/platform/idea/GroupRegistry', '/platform/idea/ParcelRegistry']));
    // Pre-written, stamped, identical to the file: normalized (a baseline), not inserted twice.
    expect(r!.inserted).toEqual(['/platform/idea/x']);
    expect(r!.normalized).toBe(2);
    expect(recordOf('platform')!.rows['/platform/idea/GroupRegistry']).toBeDefined();
    // Stamped by the pack, once.
    expect(contentRows().filter((c) => c.path === '/platform/idea/GroupRegistry')).toHaveLength(1);
    expect(contentRows().find((c) => c.path === '/platform/idea/GroupRegistry')!.sourcePack).toBe('platform');
  });

  it('a pack that does NOT ship the registries writes nothing for them', async () => {
    const root = writePack('other', [ROW('stuff/thing/y.yaml')], {
      manifest: { requires: { groups: [{ name: 'g', purpose: 'p', owner: { office: 'prime-minister' } }] } },
    });
    const [r] = await PackApi.install([root]);
    expect(r!.failure).toBeNull();
    expect(contentRows().map((c) => c.path)).toEqual(['/stuff/thing/y']);
  });
});
