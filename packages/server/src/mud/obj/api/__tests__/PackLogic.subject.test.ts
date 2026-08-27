/**
 * The `subject` kind (content-packs wave 2, D6): à-la-carte surfaces
 * (channel / board / both / neither), derived vs overridden names, the
 * audience group resolved by name (a missing group fails the pack
 * pre-write), **archive-never-reap** on a vanished file, effective-name
 * collisions across packs at `flat-key`, and the re-link of a surface
 * ChannelSeeder's rows by title (`_id` preserved).
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { rmSync } from 'fs';
import { join } from 'path';
import { PackApi } from '../../../api/pack';
import { GroupApi } from '../../../api/group';
import { DiagnosticApi } from '../../../api/diagnostics';
import {
  store,
  stubPersist,
  stubClassResolution,
  quietConsole,
  rowsIn,
  recordOf,
  writePack,
  writeSubjectFile,
  cleanupPacks,
  type Row,
} from './pack-harness';

const subjects = () => rowsIn('forum_subjects');
const channels = () => rowsIn('channels');
const boards = () => rowsIn('forum_boards');
const subjectByTitle = (t: string): Row | undefined => subjects().find((r) => r.title === t);
const refOf = (s: Row, surface: string): string | undefined =>
  (s.manifestations as Array<{ surface: string; ref: string }>).find((m) => m.surface === surface)?.ref;

beforeEach(() => {
  vi.restoreAllMocks();
  stubPersist();
  stubClassResolution();
  quietConsole();
  vi.spyOn(DiagnosticApi, 'record').mockResolvedValue(undefined);
  vi.spyOn(GroupApi, 'registry').mockResolvedValue({
    managed: () => ({
      findByName: async (name: string) =>
        name === 'staff' ? ({ _id: 'g-staff', name: 'staff' } as never) : null,
    }),
  } as never);
});
afterEach(() => {
  vi.restoreAllMocks();
  cleanupPacks();
});

describe('the subject kind — à la carte', () => {
  it('channel only: an open Subject owned by pack:<id>, one open-chat channel named after it', async () => {
    const root = writePack('platform', [], { root: '/platform' });
    writeSubjectFile(root, 'help', { name: 'Help', description: 'Q&A', channel: true });
    const [r] = await PackApi.install([root]);
    expect(r!.failure).toBeNull();
    expect(r!.inserted).toEqual(['/subjects/help']);
    const s = subjectByTitle('Help')!;
    expect(s).toMatchObject({ owner: 'pack:platform', groupRef: '', state: 'active', grain: 'venue', sourcePack: 'platform' });
    expect(channels()).toHaveLength(1);
    expect(channels()[0]).toMatchObject({ name: 'Help', kind: 'open-join-standalone', subject: s._id, archived: false });
    expect(refOf(s, 'open-chat')).toBe(channels()[0]!._id);
    expect(boards()).toHaveLength(0);
    expect(recordOf('platform')!.rows['/subjects/help']!.kind).toBe('subject');
  });

  it('board only / both / neither; overridden names; the audience group by name', async () => {
    const root = writePack('p', [], { root: '/p' });
    writeSubjectFile(root, 'lore', { name: 'Lore', description: 'The bible', board: true });
    writeSubjectFile(root, 'staff-room', {
      name: 'Staff Room',
      audience: { group: 'staff' },
      board: { name: 'Staff Board' },
      channel: { name: 'staff-chat' },
    });
    writeSubjectFile(root, 'dark', { name: 'Dark' });
    const [r] = await PackApi.install([root]);
    expect(r!.failure).toBeNull();
    expect(boards().find((b) => b.name === 'Lore')).toMatchObject({ description: 'The bible', organizer: 'open' });
    const staff = subjectByTitle('Staff Room')!;
    expect(staff.groupRef).toBe('managed:g-staff');
    expect(boards().find((b) => b.subject === staff._id)!.name).toBe('Staff Board');
    expect(channels().find((c) => c.subject === staff._id)).toMatchObject({ name: 'staff-chat', kind: 'player-created' });
    expect(subjectByTitle('Dark')).toBeDefined();
    expect((subjectByTitle('Dark')!.manifestations as unknown[]).length).toBe(0);
    // Second boot: all-zero.
    const [again] = await PackApi.install([root]);
    expect([...again!.inserted, ...again!.updated, ...again!.archived, ...again!.conflicts]).toEqual([]);
  });

  it('a missing audience group fails the pack pre-write', async () => {
    const root = writePack('p', [], { root: '/p' });
    writeSubjectFile(root, 'x', { name: 'X', audience: { group: 'nobody' }, channel: true });
    const [r] = await PackApi.install([root]);
    expect(r!.failure?.step).toBe('reconcile');
    expect(r!.failure?.error).toMatch(/group 'nobody'/);
    expect(subjects()).toHaveLength(0);
  });

  it('update: a surface switched on is minted, switched off is archived; description follows the file', async () => {
    const root = writePack('p', [], { root: '/p' });
    writeSubjectFile(root, 'lore', { name: 'Lore', description: 'v1', board: true });
    await PackApi.install([root]);
    writeSubjectFile(root, 'lore', { name: 'Lore', description: 'v2', channel: true });
    const r = await PackApi.sync('p', root);
    expect(r.updated).toEqual(['/subjects/lore']);
    const s = subjectByTitle('Lore')!;
    expect(boards().find((b) => b.subject === s._id)!.archived).toBe(true);
    expect(channels().find((c) => c.subject === s._id)).toMatchObject({ name: 'Lore', archived: false });
    // A board archived is "off": its description leaves the rendering.
    const r2 = await PackApi.sync('p', root);
    expect([...r2.updated, ...r2.conflicts]).toEqual([]);
  });
});

describe('archive-never-reap', () => {
  it('a vanished file archives the subject and its surfaces; rows stay; reported archived', async () => {
    const root = writePack('p', [], { root: '/p' });
    writeSubjectFile(root, 'help', { name: 'Help', channel: true, board: true });
    await PackApi.install([root]);
    rmSync(join(root, 'content', 'subjects', 'help.yaml'));
    const r = await PackApi.sync('p', root);
    expect(r.archived).toEqual(['/subjects/help']);
    expect(r.deleted).toEqual([]);
    expect(subjects()).toHaveLength(1);
    expect(subjectByTitle('Help')!.state).toBe('archived');
    expect(channels()[0]!.archived).toBe(true);
    expect(boards()[0]!.archived).toBe(true);
    expect(recordOf('p')!.rows['/subjects/help']).toBeUndefined();
    // Second sync: nothing to do.
    const r2 = await PackApi.sync('p', root);
    expect(r2.archived).toEqual([]);
  });

  it('a file that returns re-activates the archived row in place (same _id)', async () => {
    const root = writePack('p', [], { root: '/p' });
    writeSubjectFile(root, 'help', { name: 'Help', channel: true });
    await PackApi.install([root]);
    const id = subjectByTitle('Help')!._id;
    rmSync(join(root, 'content', 'subjects', 'help.yaml'));
    await PackApi.sync('p', root);
    writeSubjectFile(root, 'help', { name: 'Help', channel: true });
    const r = await PackApi.sync('p', root);
    expect(r.updated).toEqual(['/subjects/help']);
    expect(subjectByTitle('Help')).toMatchObject({ _id: id, state: 'active' });
    expect(channels()[0]!.archived).toBe(false);
  });
});

describe('flat-key over subjects', () => {
  it('an effective-name collision across two packs fails the second claimant', async () => {
    const a = writePack('a', [], { root: '/a' });
    writeSubjectFile(a, 'help', { name: 'Help', channel: true });
    const b = writePack('b', [], { root: '/b' });
    writeSubjectFile(b, 'support', { name: 'Support', channel: { name: 'help' } });
    const [ra, rb] = await PackApi.install([a, b]);
    expect(ra!.failure).toBeNull();
    expect(rb!.failure?.step).toBe('flat-key');
    expect(rb!.failure?.error).toMatch(/subject key 'help'/);
  });
});

describe('surface re-link before minting', () => {
  it('a Subject whose manifestations cache lost its ref re-links the channel that still points at it — no duplicate mint', async () => {
    store.rows.push({ _id: 'ch-chat', __col: 'channels', name: 'Chat', kind: 'open-join-standalone', subject: 'subj-chat', procedure: 'open' });
    store.rows.push({
      _id: 'subj-chat', __col: 'forum_subjects', title: 'Chat', owner: 'pack:platform', groupRef: '',
      lifecycleClass: 'standing', state: 'active', grain: 'venue', manifestations: [], sourcePack: 'platform',
    });
    const root = writePack('platform', [], { root: '/platform' });
    writeSubjectFile(root, 'chat', { name: 'Chat', channel: true });
    const [r] = await PackApi.install([root]);
    expect(r!.failure).toBeNull();
    expect(channels()).toHaveLength(1);
    expect(refOf(subjectByTitle('Chat')!, 'open-chat')).toBe('ch-chat');
  });

});

describe('a subject row nobody stamped is refused, never adopted', () => {
  it('a same-title row with no sourcePack fails the pack at reconcile and is left alone', async () => {
    store.rows.push({ _id: 'ch-help', __col: 'channels', name: 'Help', kind: 'open-join-standalone', subject: 'subj-help', procedure: 'open' });
    store.rows.push({
      _id: 'subj-help',
      __col: 'forum_subjects',
      title: 'Help',
      owner: '',
      groupRef: '',
      lifecycleClass: 'standing',
      state: 'active',
      grain: 'venue',
      manifestations: [{ surface: 'open-chat', ref: 'ch-help' }],
    });
    const root = writePack('platform', [], { root: '/platform' });
    writeSubjectFile(root, 'help', { name: 'Help', channel: true });
    const [r] = await PackApi.install([root]);
    expect(r!.failure?.step).toBe('reconcile');
    expect(r!.failure?.error).toMatch(/no sourcePack stamp/);
    expect(subjects()).toHaveLength(1);
    expect(subjectByTitle('Help')).toMatchObject({ _id: 'subj-help', owner: '' });
    expect(channels()).toHaveLength(1);
  });
});
