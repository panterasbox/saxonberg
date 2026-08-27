/**
 * The template walk (content-packs wave 3, step 4.1): every `.yaml` under
 * `content/` outside the declared non-template kind dirs is a template
 * row at the path its file mirrors — `content/corpo/x.yaml`,
 * `content/home.yaml`, `content/wiki/main.yaml` included; a wiki PAGE
 * beside a zone row is `.md` and is read by the wiki kind; `cmd/` is
 * skipped at any depth; `settings/` is the settings kind.
 */

import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { PackApi } from '../../../../api/pack';
import { DiagnosticApi } from '../../../../api/diagnostics';
import {
  stubPersist,
  stubClassResolution,
  quietConsole,
  contentRows,
  writePack,
  writeSettingsFile,
  cleanupPacks,
} from './pack-harness';

beforeEach(() => {
  vi.restoreAllMocks();
  stubPersist();
  stubClassResolution();
  quietConsole();
  vi.spyOn(DiagnosticApi, 'record').mockResolvedValue(undefined);
});
afterEach(() => {
  vi.restoreAllMocks();
  cleanupPacks();
});

function write(root: string, rel: string, body: string): void {
  const file = join(root, 'content', rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, body);
}

describe('the template walk', () => {
  it('walks every content yaml outside the kind dirs, at the path the file mirrors', async () => {
    const root = writePack('platform', [
      { rel: 'corpo/x.yaml', data: { name: 'x' } },
      { rel: 'home.yaml', data: { name: 'home' } },
      { rel: 'wiki/main.yaml', data: { name: 'main' } },
      { rel: 'platform/idea/cmd/perception/LookController.yaml', data: {} },
      { rel: 'studio/eternal/hall.yaml', data: {} },
    ], { root: '/platform' });
    // (A wiki PAGE beside the zone row is `.md` — the wiki kind's, tested
    // with the registry in PackLogic.wiki.test; this harness has none.)
    writeSettingsFile(root, 's', [{ key: 'k', value: 'v' }]);
    // A view under cmd/ at ANY depth is never a template.
    write(root, 'platform/cmd/perception/look.yaml', 'verbs: [look]\ndescription: look\ncontroller: /platform/idea/cmd/perception/LookController\n');
    write(root, 'studio/eternal/cmd/provision.yaml', 'verbs: [provision]\ndescription: provision\ncontroller: ../command/ProvisionController\n');
    const [r] = await PackApi.install([root]);
    expect(r!.failure?.error ?? '').toBe('');
    expect(r!.failure).toBeNull();
    expect(contentRows().map((c) => c.path).sort()).toEqual([
      '/corpo/x',
      '/home',
      '/platform/idea/cmd/perception/LookController',
      '/studio/eternal/hall',
      '/wiki/main',
    ]);
    expect(r!.merged).toEqual(['/settings/s']);
    // The top-level cmd/ view is the command-view kind; the nested cmd/ is
    // skipped by the template walk and read as a content-tree view (ONE
    // rule for every template tree — wave 4a), keyed `studio/eternal/cmd/provision`.
    expect(r!.documents['command-view']).toBe(2);
  });

  it('a yaml document-kind dir (name-banks here; emotes, recipes, blueprints, releases alike) is never walked as templates', async () => {
    const root = writePack('species-and-names', [], {
      root: '/species-and-names',
      nameBanks: [{ key: 'human', given: ['Ana'], surname: ['Bell'] }],
    });
    const [r] = await PackApi.install([root]);
    expect(r!.failure?.error ?? '').toBe('');
    expect(contentRows()).toHaveLength(0);
    expect(r!.documents['name-bank']).toBe(1);
  });
});
