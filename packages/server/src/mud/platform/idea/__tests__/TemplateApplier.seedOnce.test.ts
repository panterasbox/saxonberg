/**
 * ⭐⭐ **An authored history appears exactly once** — across a re-clone,
 * across a restart, and across a CMS go-live. That is an acceptance
 * criterion of the hydration build, not a nicety: a `Cast`'s prologue
 * written twice is a character who did everything twice.
 *
 * The seeding work moved off `onCreate` and onto the applier's phase 3
 * (`seed: true` fields + `seed<Field>` appliers) on 2026-10-01. The move
 * splits the responsibility, and this file pins both halves:
 *
 *   - **the applier owns WHEN** — phase 3 runs at mint only, never at
 *     go-live, never at restore;
 *   - **the ledger owns WHETHER IT ALREADY HAPPENED** — because a
 *     re-clone after a destruct IS a new mint, and only the ledger knows
 *     the history is already written.
 *
 * ⚠ The second half is why the ledger's own skip-if-a-claim-exists read
 * stays inside `seedPrologue` / `seedDispositions` rather than being
 * replaced by a once-flag on the applier. A once-flag would have been the
 * obvious simplification and it would have been wrong: it cannot
 * distinguish *the same object being re-filled* from *a new object at the
 * same path*.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, afterEach } from 'vitest';
import TemplateApplier from '../TemplateApplier';
import { StuffApi } from '../../../api/stuff';
import { Idea } from '../../../lib/stuff/Idea';
import { makeStuff } from '../../../lib/security/__tests__/test-setup';
import type { FieldMeta } from '../../../lib/mixin';

/**
 * A host whose "ledger" is an array it can read back — the same shape as
 * the real ones (`chronicleEntries()` then `seedChronicleClaims()`), so
 * the guard being exercised is the ledger's own.
 */
class LedgerHost extends Idea {
  static fieldMeta: FieldMeta = {
    prologue: { persistent: true, seed: true },
  };

  public prologue: string[] = [];
  /** Stands in for the chronicle: survives a destruct in the real thing. */
  public ledger: string[] = [];
  public seedCalls = 0;

  public async seedPrologue(lines: string[]): Promise<void> {
    this.seedCalls++;
    // ⭐ The ledger's guard, in its real shape: if a claim is already
    // filed, this history has been written and must not be written again.
    if (this.ledger.length > 0) return;
    this.ledger.push(...lines);
  }
}

function applier(): TemplateApplier {
  return makeStuff(() => new TemplateApplier());
}

const ROW = { prologue: ['apprenticed at twelve', 'took the shop at thirty'] };

describe('phase 3 — the applier owns WHEN', () => {
  afterEach(() => StuffApi.clearAll());

  it('seeds at mint', async () => {
    const h = makeStuff(() => new LedgerHost());
    await applier().apply(h, ROW, { mode: 'mint' });
    expect(h.ledger).toHaveLength(2);
    expect(h.seedCalls).toBe(1);
  });

  it('⚠ does NOT seed at go-live — a CMS save must not re-write a history', async () => {
    const h = makeStuff(() => new LedgerHost());
    await applier().apply(h, ROW, { mode: 'mint' });
    await applier().apply(h, ROW, { mode: 'go-live' });
    expect(h.ledger).toHaveLength(2);
    // Not merely "the ledger is unchanged" — the applier never asked.
    expect(h.seedCalls).toBe(1);
  });

  it('⚠ does NOT seed at restore — a relog must not re-write a history', async () => {
    const h = makeStuff(() => new LedgerHost());
    await applier().apply(h, ROW, { mode: 'mint' });
    await applier().apply(h, ROW, { mode: 'restore' });
    expect(h.ledger).toHaveLength(2);
    expect(h.seedCalls).toBe(1);
  });
});

describe('phase 3 — the LEDGER owns whether it already happened', () => {
  afterEach(() => StuffApi.clearAll());

  it('⭐ a re-clone IS a new mint, and the ledger is what refuses the second write', async () => {
    // Two separate objects at one path, the way a destruct-and-re-clone
    // produces them. The applier cannot tell them apart and should not
    // try: it asks both times, and the ledger — which persists — says no.
    const first = makeStuff(() => new LedgerHost());
    await applier().apply(first, ROW, { mode: 'mint' });

    const second = makeStuff(() => new LedgerHost());
    second.ledger = [...first.ledger]; // what the real ledger would hold
    await applier().apply(second, ROW, { mode: 'mint' });

    expect(second.seedCalls).toBe(1); // asked
    expect(second.ledger).toHaveLength(2); // refused
  });

  it('a seed field absent from the row seeds nothing at all', async () => {
    const h = makeStuff(() => new LedgerHost());
    await applier().apply(h, {}, { mode: 'mint' });
    expect(h.seedCalls).toBe(0);
    expect(h.ledger).toHaveLength(0);
  });
});
