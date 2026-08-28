/**
 * The `archetype` document kind (libations 1e / content-packs A13–A14):
 * a pack ships `content/archetypes/<id>.yaml`; the installer validates
 * it at read (a malformed floor fails the pack before any write) and
 * stores it flat-keyed by `archetypeId` at `<root>/archetypes/<id>`.
 */

import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { rmSync } from 'fs';
import { join } from 'path';
import { PackApi } from '../../../../api/pack';
import { DiagnosticApi } from '../../../../api/diagnostics';
import {
  stubPersist,
  stubClassResolution,
  quietConsole,
  cleanupPacks,
  writePack,
  writeDocumentFile,
  rowsOfKind,
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

const SMITHY = {
  archetypeId: 'smithy',
  label: 'a smithy',
  industry: 'smithing',
  capabilities: [
    { key: 'heat', needs: { heatK: 1400 }, default: '/trade/smithing/thing/forge' },
    { key: 'striking', needs: { tool: 'anvil' }, default: '/trade/smithing/thing/anvil' },
    { key: 'surface', needs: { surface: true } },
  ],
};

describe('the archetype document kind', () => {
  it('installs from content/archetypes/, flat-keyed by archetypeId under the pack root', async () => {
    const root = writePack('fx', [], { root: '/trade/fx' });
    writeDocumentFile(root, 'archetypes', 'smithy', SMITHY);
    const [r] = await PackApi.install([root]);
    expect(r!.failure).toBeNull();
    const rows = rowsOfKind('archetype');
    expect(rows.map((x) => x.path)).toEqual(['/trade/fx/archetypes/smithy']);
    expect((rows[0]!.data as { archetypeId: string }).archetypeId).toBe('smithy');
    expect(rows[0]!.sourcePack).toBe('fx');
  });

  it('a malformed floor fails the pack before any write', async () => {
    const root = writePack('fx', [], { root: '/trade/fx' });
    writeDocumentFile(root, 'archetypes', 'bad', {
      archetypeId: 'bad',
      industry: 'smithing',
      capabilities: [{ key: 'x', needs: { heatK: 1400, tool: 'anvil' } }],
    });
    const [r] = await PackApi.install([root]);
    expect(r!.failure).not.toBeNull();
    expect(rowsOfKind('archetype')).toEqual([]);
  });

  it('a vanished file deletes its row (onVanish: delete)', async () => {
    const root = writePack('fx', [], { root: '/trade/fx' });
    writeDocumentFile(root, 'archetypes', 'smithy', SMITHY);
    await PackApi.install([root]);
    expect(rowsOfKind('archetype').length).toBe(1);
    rmSync(join(root, 'content', 'archetypes', 'smithy.yaml'));
    const [r] = await PackApi.install([root]);
    expect(r!.deleted).toEqual(['/archetypes/smithy']);
    expect(rowsOfKind('archetype').length).toBe(0);
  });
});
