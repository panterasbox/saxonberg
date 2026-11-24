/**
 * A kind belongs to the pack that declares it (naming overhaul D-A5): a
 * pack shipping documents of a kind must declare it or depend on its
 * declarer — seen to FAIL, and seen to pass once the dependency is written.
 */

import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { PackApi } from '../../../../api/pack';
import { DiagnosticApi } from '../../../../api/diagnostics';
import { stubPersist, stubClassResolution, quietConsole, writePack, writeDocumentFile, cleanupPacks } from './pack-harness';

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

/** A pack that declares the `widget` kind (shipped from `content/widgets/`). */
function declarer(): string {
  const root = writePack('decl', [], { root: '/decl' });
  const dir = join(root, 'content', 'kinds');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'widget.yaml'), 'title: Widget\ntraits:\n  shipped: { dir: widgets }\n');
  return root;
}

describe('shipping a kind another pack declares', () => {
  it('⭐ is refused without a dependency on the declarer, naming it', async () => {
    const decl = declarer();
    const user = writePack('user', [], { root: '/user' });
    writeDocumentFile(user, 'widgets', 'a', { size: 1 });
    const [rd, ru] = await PackApi.install([decl, user]);
    expect(rd!.failure).toBeNull();
    expect(ru!.failure?.step).toBe('kind-declarer');
    expect(ru!.failure?.error).toMatch(/'widget'.*'decl'/);
  });

  it('installs once the pack depends on the declarer', async () => {
    const decl = declarer();
    const user = writePack('user', [], { root: '/user', dependsOn: ['decl'] });
    writeDocumentFile(user, 'widgets', 'a', { size: 1 });
    const [, ru] = await PackApi.install([decl, user]);
    expect(ru!.failure).toBeNull();
  });

  it('the declarer ships its own kind freely', async () => {
    const decl = declarer();
    writeDocumentFile(decl, 'widgets', 'b', { size: 2 });
    const [rd] = await PackApi.install([decl]);
    expect(rd!.failure).toBeNull();
  });
});
