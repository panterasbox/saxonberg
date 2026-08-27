/**
 * The runtime half of the totality gate: an unauthored topic must be
 * **reported**, and must still render.
 *
 * ⚠ Both halves matter and they pull against each other. Reporting is
 * the point — 45 emitted topics had no descriptor and nobody knew,
 * because the derived default reads exactly like an authored one. But
 * an authoring omission must not cost the player their frame, so the
 * derivation still returns a usable descriptor. A test that only
 * asserted the diagnostic would let someone "fix" this by throwing.
 */

import "../../../test-bootstrap";
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TopicCatalogue from '../idea/TopicCatalogue';
import { DiagnosticApi } from '../../api/diagnostics';
import { makeStuff } from '../../lib/security/__tests__/test-setup';
import { PersistApi } from '../../api/persist';
import { Template } from '../../lib/stuff/Template';

function makeCatalogue(): TopicCatalogue {
  // The derived tier needs no clone pipeline: ensureCache() starts an
  // empty cache when postRegister never ran, which is exactly the
  // unauthored path under test.
  return makeStuff(() => new TopicCatalogue());
}

describe('unauthored topics are reported, not hidden', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('files a diagnostic naming the topic', () => {
    const record = vi
      .spyOn(DiagnosticApi, 'record')
      .mockResolvedValue(undefined);

    makeCatalogue().getDescriptor('speech.invented');

    expect(record).toHaveBeenCalledTimes(1);
    const arg = record.mock.calls[0]?.[0];
    expect(arg?.channel).toBe('topic.unauthored');
    expect(arg?.message).toContain('speech.invented');
  });

  it('still returns a usable descriptor — the frame renders', () => {
    vi.spyOn(DiagnosticApi, 'record').mockResolvedValue(undefined);

    const d = makeCatalogue().getDescriptor('speech.invented');

    // The player must not pay for the author's omission.
    expect(d.topic).toBe('speech.invented');
    expect(d.label).toBeTruthy();
    expect(d.address).toBeTruthy();
    expect(d.affordance).toBeTruthy();
  });

  it('fires once per key, however many frames arrive', () => {
    const record = vi
      .spyOn(DiagnosticApi, 'record')
      .mockResolvedValue(undefined);

    const cat = makeCatalogue();
    for (let i = 0; i < 25; i++) cat.getDescriptor('speech.invented');

    // A chatty topic would otherwise write one row per frame and bury
    // the diagnostics store under a single mistake.
    expect(record).toHaveBeenCalledTimes(1);
  });

  it('reports each distinct unauthored key separately', () => {
    const record = vi
      .spyOn(DiagnosticApi, 'record')
      .mockResolvedValue(undefined);

    const cat = makeCatalogue();
    cat.getDescriptor('speech.one');
    cat.getDescriptor('speech.two');

    expect(record).toHaveBeenCalledTimes(2);
  });
});

describe('boot-time prune of retired topic rows', () => {
  it('deletes rows outside TOPIC_ROOTS, and only those', async () => {
    // ⚠ This is a DESTRUCTIVE boot action, and it exists because the
    // seeder is insert-only: deleting a seed file leaves its row
    // resolving forever. Measured live on the build-1 dev database at
    // the first boot after the taxonomy replacement — 126 rows, 89 of
    // them retired.
    const rows = [
      { path: '/platform/idea/Topic/speech.vocal' },
      { path: '/platform/idea/Topic/world.speech.say' },
      { path: '/platform/idea/Topic/system.shell.help' },
      { path: '/platform/idea/Topic/sense.reading' },
    ];
    vi.spyOn(Template, 'findDescendants').mockResolvedValue(
      rows.map((r) => ({ ...r, data: {} })) as never
    );
    vi.spyOn(PersistApi, 'isConnected').mockReturnValue(true);
    const del = vi
      .spyOn(PersistApi, 'deleteMany')
      .mockResolvedValue(0 as never);

    await makeCatalogue().postRegister();

    expect(del).toHaveBeenCalledTimes(1);
    const filter = del.mock.calls[0]?.[1] as { path: { $in: string[] } };
    expect(filter.path.$in.sort()).toEqual([
      '/platform/idea/Topic/system.shell.help',
      '/platform/idea/Topic/world.speech.say',
    ]);
  });

  it('is a no-op without a database — never throws on a warm', async () => {
    vi.spyOn(Template, 'findDescendants').mockResolvedValue([
      { path: '/platform/idea/Topic/world.speech.say', data: {} },
    ] as never);
    vi.spyOn(PersistApi, 'isConnected').mockReturnValue(false);
    const del = vi.spyOn(PersistApi, 'deleteMany');

    await expect(makeCatalogue().postRegister()).resolves.not.toThrow();
    expect(del).not.toHaveBeenCalled();
  });
});
