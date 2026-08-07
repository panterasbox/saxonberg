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

import { describe, it, expect, vi, beforeEach } from 'vitest';
import TopicCatalogue from '../TopicCatalogue';
import { DiagnosticApi } from '../../api/diagnostics';
import { makeStuff } from '../../lib/security/__tests__/test-setup';

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
