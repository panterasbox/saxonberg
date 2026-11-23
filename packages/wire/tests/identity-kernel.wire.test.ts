/**
 * Identity — the kernel step: a player can ASK about somebody else, and
 * asking about another PLAYER is refused rather than merely absent.
 *
 * Moved out of `identity.dirty.wire.test.ts` (test-world-lifecycle D8):
 * the rest of that file reads authored dossiers and named institutions on
 * placeholder content and is build 2's; this one step needs only two
 * players in one room, so it stands in the scaffold. Fresh characters each
 * run: it runs twice on one world.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import { Session, declareFile, standIn, PLAZA } from '../src/harness';

declareFile({
  file: 'identity-kernel.wire.test.ts',
  packs: ['platform', 'test-fixtures'],
});

let b: Session; // the one who asks

beforeAll(async () => {
  b = await standIn(PLAZA, 'ident-b');
  await b.cmd('look');
}, 180_000);

afterAll(() => {
  b?.close();
});

suite('asking about another player', () => {
  it('⭐ asking about another player is REFUSED, not merely absent', async () => {
    /*
     * ⚠ The refusal has to be asked with the other player IN THE ROOM. A
     * first pass asked about a player standing in another locality and
     * accepted "Nobody here goes by …" — which is the not-present
     * branch, not the refusal, and would have gone on passing if the
     * gate were deleted.
     *
     * ⭐ And they have to INTRODUCE themselves first, which is the belief
     * layer working: an un-introduced player reads as *a human*, so
     * there is no name to ask about until they give one. It is also why
     * the question cannot be asked by login handle — the world has never
     * heard it.
     */
    const bystander = await standIn(PLAZA, 'ident-d');
    const handle = bystander.handle;
    try {
      const said = await bystander.prose('introduce');
      expect(said, 'until they introduce there is no name to ask about').toMatch(
        /introduce yourself as/i
      );
      const refusal = await b.prose(`competence ${handle}`);
      expect(refusal).toMatch(/theirs to show you/i);
    } finally {
      bystander.close();
    }
  }, 120_000);
});
