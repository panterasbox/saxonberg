/**
 * The `settings` kind (content-packs wave 2, D5/D7): merge-missing over
 * the `app_settings` singleton. A fresh store merges every file; a key
 * the operator tuned survives a changed pack default (`kept`, no
 * conflict); a key new to a later file version merges; a vanished file
 * keeps its values and drops its baseline; two files claiming one key
 * fail at `flat-key`; the sync read cache re-warms on merge only.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { rmSync } from 'fs';
import { join } from 'path';
import { PackApi } from '../../../api/pack';
import { DiagnosticApi } from '../../../api/diagnostics';
import { AppSettings } from '../../../lib/config/AppSettings';
import {
  store,
  stubPersist,
  stubClassResolution,
  quietConsole,
  recordOf,
  writePack,
  writeSettingsFile,
  settingsSingleton,
  cleanupPacks,
} from './pack-harness';

let warm: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.restoreAllMocks();
  stubPersist();
  stubClassResolution();
  quietConsole();
  vi.spyOn(DiagnosticApi, 'record').mockResolvedValue(undefined);
  warm = vi.spyOn(AppSettings, 'warm').mockResolvedValue(undefined as never);
});
afterEach(() => {
  vi.restoreAllMocks();
  cleanupPacks();
});

const REACTIONS = [
  { key: 'reactions.threshold', value: '10' },
  { key: 'reactions.cadenceMs', value: '200' },
];
const BANKING = [{ key: 'banking.fee', value: '1' }];

describe('the settings kind — merge-missing', () => {
  it('fresh store: one merge per file, the singleton holds every key, each file is baselined', async () => {
    const root = writePack('platform', [], { root: '/platform' });
    writeSettingsFile(root, 'reactions', REACTIONS);
    writeSettingsFile(root, 'banking', BANKING);
    const [r] = await PackApi.install([root]);
    expect(r!.failure).toBeNull();
    expect(r!.merged.sort()).toEqual(['/settings/banking', '/settings/reactions']);
    expect(r!.kept).toEqual([]);
    expect(r!.conflicts).toEqual([]);
    expect(settingsSingleton()!.values).toEqual({
      'reactions.threshold': '10',
      'reactions.cadenceMs': '200',
      'banking.fee': '1',
    });
    const rec = recordOf('platform')!;
    expect(rec.rows['/settings/reactions']!.kind).toBe('settings');
    expect(JSON.parse(rec.rows['/settings/reactions']!.body)).toEqual({ settings: REACTIONS });
    expect(warm).toHaveBeenCalledTimes(1);

    // Second boot: nothing merged, the files are `kept`, no re-warm.
    const [again] = await PackApi.install([root]);
    expect(again!.merged).toEqual([]);
    expect(again!.kept.sort()).toEqual(['/settings/banking', '/settings/reactions']);
    expect(warm).toHaveBeenCalledTimes(1);
  });

  it('a tuned key survives a changed pack default — kept, NO conflict, value unchanged', async () => {
    const root = writePack('platform', [], { root: '/platform' });
    writeSettingsFile(root, 'reactions', REACTIONS);
    await PackApi.install([root]);
    settingsSingleton()!.values['reactions.threshold'] = '99'; // the operator's `config`
    writeSettingsFile(root, 'reactions', [
      { key: 'reactions.threshold', value: '12' },
      { key: 'reactions.cadenceMs', value: '200' },
    ]);
    const r = await PackApi.sync('platform', root);
    expect(r.kept).toEqual(['/settings/reactions']);
    expect(r.merged).toEqual([]);
    expect(r.conflicts).toEqual([]);
    expect(settingsSingleton()!.values['reactions.threshold']).toBe('99');
    // The baseline is the file (the pack's default), so `pack diff` shows both.
    const d = await PackApi.diff('platform', '/settings/reactions', root);
    expect(d.entries[0]!.theirs!.body).toMatch(/reactions\.threshold[\s\S]*12/);
    expect(d.entries[0]!.yours!.body).toMatch(/reactions\.threshold[\s\S]*99/);
  });

  it('a key new to a later file version merges without touching the others', async () => {
    const root = writePack('platform', [], { root: '/platform' });
    writeSettingsFile(root, 'reactions', REACTIONS);
    await PackApi.install([root]);
    settingsSingleton()!.values['reactions.threshold'] = '99';
    writeSettingsFile(root, 'reactions', [...REACTIONS, { key: 'reactions.sampleCap', value: '5' }]);
    const r = await PackApi.sync('platform', root);
    expect(r.merged).toEqual(['/settings/reactions']);
    expect(settingsSingleton()!.values).toMatchObject({
      'reactions.threshold': '99',
      'reactions.sampleCap': '5',
    });
    expect(warm).toHaveBeenCalledTimes(2);
  });

  it('a vanished file: values stay, the baseline drops, reported kept', async () => {
    const root = writePack('platform', [], { root: '/platform' });
    writeSettingsFile(root, 'reactions', REACTIONS);
    writeSettingsFile(root, 'banking', BANKING);
    await PackApi.install([root]);
    rmSync(join(root, 'content', 'settings', 'banking.yaml'));
    const r = await PackApi.sync('platform', root);
    expect(r.kept).toContain('/settings/banking');
    expect(r.deleted).toEqual([]);
    expect(settingsSingleton()!.values['banking.fee']).toBe('1');
    expect(recordOf('platform')!.rows['/settings/banking']).toBeUndefined();
    expect(recordOf('platform')!.rows['/settings/reactions']).toBeDefined();
  });

  it('two files claiming one key fail the pack at flat-key, pre-write', async () => {
    const root = writePack('platform', [], { root: '/platform' });
    writeSettingsFile(root, 'a', [{ key: 'x.y', value: '1' }]);
    writeSettingsFile(root, 'b', [{ key: 'x.y', value: '2' }]);
    const [r] = await PackApi.install([root]);
    expect(r!.failure?.step).toBe('flat-key');
    expect(r!.failure?.error).toMatch(/settings key 'x.y'/);
    expect(settingsSingleton()).toBeUndefined();
  });

  it('merges into an existing singleton row (same _id), never a second row', async () => {
    store.rows.push({ _id: 'the-one', __col: 'app_settings', values: { 'other.key': 'v' } });
    const root = writePack('platform', [], { root: '/platform' });
    writeSettingsFile(root, 'reactions', REACTIONS);
    await PackApi.install([root]);
    expect(store.rows.filter((r) => r.__col === 'app_settings')).toHaveLength(1);
    expect(settingsSingleton()!._id).toBe('the-one');
    expect(settingsSingleton()!.values['other.key']).toBe('v');
  });
});
