/**
 * The trait graft (blood build D9) — `AdvancementMixin.creditSignature`
 * fans the act's `dispositionValence` channel into the host's trait
 * ledger when it keeps one. This is the self-call into `imprintSignature`
 * (a `SelfOnly` method) from the host's own frame; the first live
 * consumer is the blood gift.
 *
 * Mongo is faked in-memory (the advancement/trait harness): we stub PM's
 * find / save, the wrappers both `TranscriptEntry` and `DispositionEntry`
 * use. The self-call is exercised through `withRootContext(owner, …)` so
 * the caller frame is the owner — exactly as a controller establishes it
 * when the acting principal credits itself.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Idea } from '../../stuff/Idea';
import { AdvancementMixin } from '../Advancement';
import { DispositionedMixin } from '../../trait/Dispositioned';
import { MixinApi } from '../../../api/mixin';
import { WorldClockApi } from '../../../api/worldclock';
import { PersistenceManager } from '../../../../backend/PersistenceManager';
import {
  makeStuffAtPath,
  withRootContext,
} from '../../security/__tests__/test-setup';
import type { ActSignature } from '../ActSignature';

let store: Map<string, Record<string, unknown>>;
let idCounter = 0;
let counter = 0;

/** A host that keeps BOTH ledgers — a transcript and a disposition
 * ledger — the way `Character` does. */
class AdvDisp extends AdvancementMixin(DispositionedMixin(Idea)) {}
/** A host that keeps only a transcript (no trait ledger). */
class AdvOnly extends AdvancementMixin(Idea) {}

function advDisp(): AdvDisp {
  return makeStuffAtPath(
    () => new AdvDisp(),
    `/platform/agent/Avatar/g${counter++}`,
  );
}
function advOnly(): AdvOnly {
  return makeStuffAtPath(
    () => new AdvOnly(),
    `/platform/agent/Avatar/g${counter++}`,
  );
}

const GIFT: ActSignature = {
  discipline: [],
  dispositionValence: [
    { disposition: 'generosity', valence: 2 },
    { disposition: 'compassion', valence: 2 },
  ],
};

beforeEach(() => {
  store = new Map();
  idCounter = 0;
  counter = 0;
  const pm = PersistenceManager.get();
  vi.spyOn(pm, 'isConnected').mockReturnValue(true);
  // ⚠ Collection-aware: this host writes BOTH a transcript row and a
  // disposition row, so a collection-agnostic fake would return the
  // nursing transcript as a disposition entry. Key the store by collection.
  vi.spyOn(pm, 'find').mockImplementation(
    async (col: string, query: Record<string, unknown>) =>
      [...store.values()].filter(
        (d) =>
          d.__col === col &&
          Object.entries(query).every(([k, v]) => d[k] === v),
      ) as never,
  );
  vi.spyOn(pm, 'save').mockImplementation(
    async (col: string, doc: Record<string, unknown>) => {
      const id = (doc._id as string | undefined) ?? `id-${idCounter++}`;
      store.set(`${col}:${id}`, { ...doc, _id: id, __col: col });
      return id;
    },
  );
  WorldClockApi._setNowProviderForTesting(() => 4242);
});
afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
});

describe('creditSignature — the disposition graft (D9)', () => {
  it('⭐ fans the valence channel into the trait ledger (one row per subcheck)', async () => {
    const owner = advDisp();
    await withRootContext(owner, 'credit', () => owner.creditSignature(GIFT));
    const rows = await owner.dispositionEntries();
    expect(rows).toHaveLength(2);
    const byAxis = new Map(rows.map((r) => [r.disposition, r]));
    expect(byAxis.get('generosity')!.valence).toBe(2);
    expect(byAxis.get('compassion')!.valence).toBe(2);
  });

  it('a signature with no valence writes no disposition rows', async () => {
    const owner = advDisp();
    await withRootContext(owner, 'credit', () =>
      owner.creditSignature({
        discipline: [
          { discipline: 'nursing', difficulty: 'standard', outcome: 'success' },
        ],
      }),
    );
    expect(await owner.dispositionEntries()).toHaveLength(0);
  });

  it('a non-Dispositioned host is untouched (no graft, no throw)', async () => {
    const owner = advOnly();
    expect(MixinApi.isDispositioned(owner as never)).toBe(false);
    // The valence channel is simply ignored — the credit still succeeds.
    await withRootContext(owner, 'credit', () => owner.creditSignature(GIFT));
    // Nothing to read (no trait ledger surface); the act did not throw.
    expect(true).toBe(true);
  });
});
