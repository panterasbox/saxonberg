/**
 * ⭐ The `farms` beat is bounded and LITERAL (farming A7).
 *
 * The consigns-brain lessons, inherited as assertions on the SHAPE of
 * the source — the thing that was wrong last time:
 *
 *   - every act is a literal player verb through `forceCommand` (water,
 *     feed, pick, wallet, consign, draw) — nothing reaches around the
 *     command surface;
 *   - `pick` targets the GROUND (the verb's own resolution finds the
 *     ripest plant — no keyword fights between sibling trees);
 *   - the take is bounded by the batch, the consign leg by the stall's
 *     cap headroom (the shelf's authored override when present), and
 *     the market leg re-takes HOME in `finally`;
 *   - there is deliberately NO `get` — a pick lands in the hand, so the
 *     greedy-get hazard cannot arise.
 *
 * What each verb does is its own controller's contract, tested there;
 * the in-world proof is `farms.test.ts`.
 */

import '../../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

const SRC = readFileSync(
  fileURLToPath(new URL('../farms.ts', import.meta.url)),
  'utf8',
);

describe('the farms beat is bounded and literal', () => {
  it('drives the literal verbs, nothing else', () => {
    expect(SRC).toContain("'fill can from standpipe'");
    expect(SRC).toContain('`water ${kw}`');
    expect(SRC).toContain('`feed ${kw} with sack`');
    expect(SRC).toContain('`pick ${kw}`');
    expect(SRC).toContain("'wallet use house'");
    expect(SRC).toContain('`consign ${kw} --ask ${ask}`');
    expect(SRC).toContain('`draw ${amount}`');
  });

  it('never issues a bare or counted `get` — picks land in the hand', () => {
    expect(SRC).not.toMatch(/forceCommand\([^)]*`get /);
  });

  it('bounds every loop: the grounds cap, the batch, the cap headroom', () => {
    expect(SRC).toContain('.slice(0, GROUNDS_CAP)');
    expect(SRC).toContain('picked < batch');
    expect(SRC).toContain('headroom');
    // A pick that declines must not grind — the no-progress guard.
    expect(SRC).toContain('if (now >= remaining) break');
  });

  it("honors the stall's authored cap over the global dial (the A6 seam)", () => {
    expect(SRC).toContain('shelf.getListingCapOverride() ?? listingCap()');
  });

  it('re-takes home in finally — a dead beat never strands the farmer', () => {
    expect(SRC).toMatch(/finally \{\s*\n\s*hand\.teleport\(home/);
  });
});
