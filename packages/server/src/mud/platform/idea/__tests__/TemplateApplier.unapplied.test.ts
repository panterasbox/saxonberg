/**
 * ⭐⭐ **A data key nobody will apply used to vanish in total silence**,
 * and that is the single most expensive property of the content step.
 * Both of the applier's loops `continue` on a key the class does not
 * declare, so the author's line simply had no effect — no throw, no
 * warning, no diagnostic, nothing in a log.
 *
 * What it has cost, all found by driving rather than by testing:
 *
 *   - `material:` instead of `_materialPath:` on **49 rows across eight
 *     packs** — a sack of wheat that was "not grain" at the mill;
 *   - `name:` and `description:` on the bar, discarded since the row
 *     shipped;
 *   - `primaryKeyword` on a family of rooms, authored into a void;
 *   - a zone's whole `deposit:` orebody, so `hew` refused in a room with
 *     a seam visibly in the face.
 *
 * ⚠ The report is a WARNING, not a throw, and that is a decision rather
 * than caution: a catalogue class that parses its own row's `data`
 * directly is a legitimate authoring act and ~161 rows do it. Refusing
 * those would refuse content that works. The diagnostic makes the far
 * more common cause — a typo — visible at the `errors` verb.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import TemplateApplier from '../TemplateApplier';
import { DiagnosticApi } from '../../../api/diagnostics';
import { StuffApi } from '../../../api/stuff';
import { Stuff } from '../../../lib/stuff/Stuff';
import { Idea } from '../../../lib/stuff/Idea';
import { makeStuff } from '../../../lib/security/__tests__/test-setup';
import type { FieldMeta } from '../../../lib/mixin';

class Declares extends Idea {
  static fieldMeta: FieldMeta = {
    keywords: { persistent: true },
    layout: { instruction: true },
  };
  public keywords: string[] = [];
  public async applyLayout(_v: unknown): Promise<void> {}
}

let recorded: { path: string; message: string }[] = [];

function applierAt(): TemplateApplier {
  return makeStuff(() => new TemplateApplier());
}

function hostAt(path: string): Declares {
  const h = makeStuff(() => new Declares());
  StuffApi.unregister(h);
  Stuff._stampTemplatePath(h, path);
  StuffApi.register(h);
  return h;
}

beforeEach(() => {
  recorded = [];
  vi.spyOn(DiagnosticApi, 'record').mockImplementation(async (d) => {
    recorded.push({ path: d.path as string, message: String(d.message) });
  });
  // ⚠ The record is fire-and-forget (`void`), so a test has to let the
  // microtask run before reading. Without this the first assertion sees
  // an empty list and the whole file passes vacuously.
  // ⚠ The de-dup set is per PROCESS, which is the point of it — so each
  // test has to reach in and clear it or the second one sees nothing.
  TemplateApplier._resetReportedForTesting();
  StuffApi.clearAll();
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('the unapplied-key report', () => {
  it('⭐ names every key nobody will apply', async () => {
    const h = hostAt('/stuff/test/unapplied-1');
    await applierAt().apply(
      h,
      { keywords: ['x'], material: '/stuff/idea/material/wood', naem: 'typo' },
      { mode: 'mint' },
    );
    expect(recorded).toHaveLength(1);
    expect(recorded[0]!.path).toBe('/stuff/test/unapplied-1');
    expect(recorded[0]!.message).toContain('material');
    expect(recorded[0]!.message).toContain('naem');
    // …and not the keys that DID land.
    expect(recorded[0]!.message).not.toContain('keywords');
  });

  it('says nothing when every key is declared', async () => {
    const h = hostAt('/stuff/test/unapplied-2');
    await applierAt().apply(
      h,
      { keywords: ['x'], layout: {} },
      { mode: 'mint' },
    );
    expect(recorded).toEqual([]);
  });

  it('⭐ one record per (path, key-set) per process — not one per clone', async () => {
    // A row cloned a thousand times is one finding. Without this the
    // `errors` verb would be unreadable for exactly the rows that need
    // reading.
    for (let i = 0; i < 3; i++) {
      const h = hostAt('/stuff/test/unapplied-3');
      await applierAt().apply(h, { naem: 'typo' }, { mode: 'mint' });
      StuffApi.unregister(h);
    }
    expect(recorded).toHaveLength(1);
  });

  it('a DIFFERENT key-set on the same row is its own finding', async () => {
    const a = hostAt('/stuff/test/unapplied-4');
    await applierAt().apply(a, { naem: 'typo' }, { mode: 'mint' });
    StuffApi.unregister(a);
    const b = hostAt('/stuff/test/unapplied-4');
    await applierAt().apply(b, { desc: 'other typo' }, { mode: 'mint' });
    expect(recorded).toHaveLength(2);
  });

  it('⚠ reports at MINT only — a go-live does not re-report', async () => {
    const h = hostAt('/stuff/test/unapplied-5');
    await applierAt().apply(h, { naem: 'typo' }, { mode: 'go-live' });
    await applierAt().apply(h, { naem: 'typo' }, { mode: 'restore' });
    expect(recorded).toEqual([]);
  });
});
