/**
 * The install-set flat-key uniqueness check (pack-installer W1.5, slate
 * A17.2): a bank key claimed twice across the install set — or twice in
 * one pack — fails the CLAIMING pack before any of its writes, naming
 * the kind, the key, and both claimants; the innocent pack applies.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PackApi } from '../../../api/pack';
import {
  stubPersist,
  stubClassResolution,
  quietConsole,
  contentRows,
  nameBankRows,
  recordOf,
  writePack,
  cleanupPacks,
} from './pack-harness';

beforeEach(() => {
  vi.restoreAllMocks();
  stubPersist();
  stubClassResolution();
  quietConsole();
});
afterEach(() => {
  vi.restoreAllMocks();
  cleanupPacks();
});

describe('flat-key collisions', () => {
  it('cross-pack: the second claimant fails pre-write, naming pack, key, and both files', async () => {
    const a = writePack('alpha', [{ rel: 'obj/material/a.yaml' }], {
      nameBanks: [{ key: 'common', given: ['A'], surname: ['A'] }],
    });
    const b = writePack('beta', [{ rel: 'obj/material/b.yaml' }], {
      nameBanks: [{ key: 'common', given: ['B'], surname: ['B'] }],
    });
    const results = await PackApi.install([a, b]);
    const ra = results.find((r) => r.packId === 'alpha')!;
    const rb = results.find((r) => r.packId === 'beta')!;
    expect(ra.failure).toBeNull();
    expect(ra.inserted).toContain('/obj/material/a');
    expect(rb.failure?.step).toBe('flat-key');
    expect(rb.failure?.error).toContain("pack 'beta'");
    expect(rb.failure?.error).toContain("'common'");
    expect(rb.failure?.error).toContain("pack 'alpha'");
    expect(rb.failure?.error).toContain('content/name-banks/common.yaml');
    // zero writes for beta
    expect(contentRows().map((r) => r.sourcePack)).toEqual(['alpha']);
    expect(nameBankRows().map((r) => r.sourcePack)).toEqual(['alpha']);
    expect(recordOf('beta')!.status).toBe('failed');
    expect(recordOf('alpha')!.status).toBe('applied');
  });

  it('within one pack: two files claiming one key abort that pack', async () => {
    const root = writePack('p', [{ rel: 'obj/material/a.yaml' }], {
      nameBanks: [
        { key: 'common', given: ['A'], surname: ['A'] },
        { key: 'common', given: ['B'], surname: ['B'], dir: 'extra' },
      ],
    });
    const [r] = await PackApi.install([root]);
    expect(r!.failure?.step).toBe('flat-key');
    expect(r!.failure?.error).toContain('name-banks/common.yaml');
    expect(r!.failure?.error).toContain('name-banks/extra/common.yaml');
    expect(contentRows()).toHaveLength(0);
    expect(nameBankRows()).toHaveLength(0);
  });

  it('sync of a pack whose key collides with a sibling refuses', async () => {
    const a = writePack('alpha', [], {
      nameBanks: [{ key: 'common', given: ['A'], surname: ['A'] }],
    });
    const b = writePack('beta', [], {
      nameBanks: [{ key: 'common', given: ['B'], surname: ['B'] }],
    });
    await PackApi.install([a]);
    await expect(PackApi.sync('beta', b, [a, b])).rejects.toThrow(/'common'.*alpha|alpha.*'common'/);
    expect(nameBankRows().map((r) => r.sourcePack)).toEqual(['alpha']);
  });
});
