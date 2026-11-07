/**
 * ⭐ The crowd — thirty people in the square (controllers-are-io D27).
 *
 * The greeting COUNT blocks: an arriver is greeted once by each greeter, and
 * when the room stands nobody is greeted. The timing is printed here and
 * bounded in `crowd.soak.wire.test.ts`, because a round trip is honest only on
 * an idle box.
 */

import { describe as suite, it, expect } from 'vitest';
import { declareFile, runCrowd, CROWD_SIZE } from '../src/harness';

declareFile({
  file: 'crowd.dirty.wire.test.ts',
  packs: ['platform', 'terminus'],
  dirtyReason:
    'thirty characters are created and walk into the market square; each is ' +
    'greeted and each is remembered by the greeters who saw them.',
});

suite(`a crowd of ${CROWD_SIZE} in the square`, () => {
  it('greets each arriver once, and greets nobody when nobody arrives', async () => {
    const record = await runCrowd(process.env.WIRE_CROWD_LABEL ?? 'blocking');
    for (const [speaker, most] of Object.entries(record.greetedOwnMax)) {
      expect(most, `${speaker} greeted one arriver ${most} times`).toBe(1);
    }
    expect(record.greetingsInQuiet, 'a greeting with nobody arriving').toBe(0);
  }, 600_000);
});
