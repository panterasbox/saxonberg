/**
 * ⭐ The `consigns` beat takes what its `batch` says, not the floor.
 *
 * ⚠ `get` binds GREEDILY, and a producer's floor stock holds many goods
 * sharing one keyword — so a bare `get grapefruit` takes EVERY
 * grapefruit on the floor and the `batch` cap bounds nothing. A live
 * drive watched a player's `get coupe` empty a rack of twelve, and the
 * hands doing the same to their floors every beat: the shelf's
 * per-consignor cap let a few up, the rest stayed in hand, and the next
 * beat piled more on top.
 *
 * That is not merely untidy — it is quadratic. Every `consign` asks
 * `BankingApi.activeCredential`, which resolves `person` scope over
 * everything the hand carries to find its house card. An inventory that
 * grows without bound makes each consign slower than the last; a profile
 * of the running server put 54% of the whole process in
 * `ConsignController → activeHouse → activeCredential`.
 *
 * This asserts the SHAPE of the command the beat issues, which is the
 * thing that was wrong. What `get 1 <kw>` does is `GetController`'s own
 * contract, tested there.
 */

import '../../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

const SRC = readFileSync(
  fileURLToPath(new URL('../consigns.ts', import.meta.url)),
  'utf8',
);

describe('the consigns beat bounds its take', () => {
  it('asks for ONE of a keyword, never the whole stack', () => {
    expect(SRC).toContain('`get 1 ${kw}`');
    // The bare form is what made `batch` meaningless.
    expect(SRC).not.toMatch(/forceCommand\(hand, `get \$\{kw\}`\)/);
  });

  it('still caps the beat by the authored batch', () => {
    expect(SRC).toContain('.slice(0, batch)');
  });
});
