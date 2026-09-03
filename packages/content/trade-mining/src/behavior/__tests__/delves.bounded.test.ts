/**
 * ⭐ The `delves` beat is bounded and LITERAL (metal chain M9).
 *
 * The `consigns`/`farms` lessons, inherited as assertions on the SHAPE of
 * the source — the thing that was wrong the first two times:
 *
 *   - every act is a literal player verb through `forceCommand` (shore,
 *     hew, get, wallet, consign) — nothing reaches around the command
 *     surface, so the hand is subject to exactly the rules a person is:
 *     bad ground refuses it, a worked-out face refuses it, foul air will
 *     kill it;
 *   - every loop is bounded — the faces cap, the batch, the shelf's cap
 *     headroom — and the hew leg carries a no-progress guard so a
 *     declined cut cannot grind;
 *   - ⚠ the ONE `get` is by KEYWORD and never bare: `hew` lands the lump
 *     in the room rather than in the hand, so unlike `farms` this beat
 *     genuinely needs a pickup, and the greedy-get hazard is answered by
 *     naming what to take;
 *   - home is re-taken in `finally`, so a beat that dies at the scale
 *     does not strand the miner there with the face standing idle.
 *
 * ⭐ And the reason the brain exists at all: **supply must not be a
 * function of concurrency.** A smelter whose input dries up on a quiet
 * night is not an economy.
 *
 * What each verb does is its own controller's contract, tested there.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { brain as delves } from '../delves';

const SRC = readFileSync(fileURLToPath(new URL('../delves.ts', import.meta.url)), 'utf8');

describe('the delves beat is bounded and literal', () => {
  it('drives the literal verbs, nothing else', () => {
    expect(SRC).toContain("'shore'");
    expect(SRC).toContain('`hew ${face.direction}`');
    expect(SRC).toContain("'wallet use house'");
    expect(SRC).toContain('`consign ${kw} --ask ${ask}`');
  });

  it('⚠ its one `get` names WHAT to take — never a bare or counted grab', () => {
    expect(SRC).toContain('`get ${kw}`');
    expect(SRC).not.toMatch(/forceCommand\([^)]*['"`]get['"`]\s*\)/);
    expect(SRC).not.toMatch(/`get all/);
  });

  it('bounds every loop: the faces cap, the batch, the cap headroom', () => {
    expect(SRC).toContain('.slice(0, FACES_CAP)');
    expect(SRC).toContain('cut >= batch');
    expect(SRC).toContain('headroom');
  });

  it('a declined cut must not grind — the no-progress guard', () => {
    expect(SRC).toContain('<= before) break');
  });

  it("honors the shelf's authored cap over the global dial", () => {
    expect(SRC).toContain('shelf.getListingCapOverride() ?? listingCap()');
  });

  it('re-takes home in finally — a dead beat never strands the miner', () => {
    expect(SRC).toMatch(/finally \{[\s\S]*?hand\.teleport\(home/);
  });

  it('⭐ it reads the ground the way a PLAYER does, and shores through the verb', () => {
    // Not a privileged write: the hand reads `stabilityAt` (the same read
    // the telegraph and the refusal share) and answers with `shore`,
    // which declines for it exactly as it would for a person with no
    // timber.
    expect(SRC).toContain('await working.stabilityAt()');
    expect(SRC).toMatch(/ground\.state !== 'sound'[\s\S]*?hand\.forceCommand\('shore'\)/);
  });

  it('runs UNWATCHED and off the ambient budget — its timing is load-bearing', () => {
    expect(delves.presenceGated).toBe(false);
    expect(delves.ambient).toBe(false);
    expect(delves.label).toBe('delves');
  });

  it('does nothing at all without its two config paths', async () => {
    // A brain with no `home`/`shelf` is a misconfigured row, and the
    // honest answer is a no-op rather than a guess.
    await expect(
      delves.act({ host: {}, config: {}, state: {} } as never),
    ).resolves.toBeUndefined();
  });
});
