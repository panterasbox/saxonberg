import { test, expect } from '@playwright/test';
import { openWorldAs, runCommand } from './helpers';

/**
 * ⭐⭐ **The organism-biology build's browser walk** — what a person sees
 * (requirements § Blocking drive, the player-facing steps; the rest are the
 * wire drive, `packages/wire/tests/organism-biology.dirty.wire.test.ts`).
 *
 *  - Step 15: a player whose eyes are wounded is TOLD so when they look at
 *    themselves, in their own transcript — and nobody else is.
 *  - Step 9: the register's new transaction is findable — `help herd`
 *    names `herd enter`, the act that writes a steer into the ox register.
 */

const YARD = '/world/testbed/location/yard';

test.describe('organism biology — what a person sees', () => {
  test('15 · a wounded eye is told to its owner when they look at themselves', async ({ browser }) => {
    test.setTimeout(600_000);
    const me = await openWorldAs(browser, 'obwalk', { startLocation: YARD });
    // A wizard in the test world stages the wound (the wire drive's founder
    // shape: `testharness` needs a test world, not the founder's seat).
    const founder = await openWorldAs(browser, 'obwiz', { startLocation: YARD, wizard: true });
    try {
      const transcript = me.page.getByTestId('terminal');
      await runCommand(me.page, 'look me');
      await expect(transcript).not.toContainText(/sight is blurred|barely see|cannot see/, { timeout: 10_000 });

      await runCommand(founder.page, `testharness body-wound ${me.handle} body.head.eye.left point 30`);
      await runCommand(founder.page, `testharness body-wound ${me.handle} body.head.eye.right point 20`);
      // The harness's own report, not the echoed command (which also says "eye").
      await expect(founder.page.getByTestId('terminal')).toContainText(/puncture at body\.head\.eye/, { timeout: 60_000 });

      await expect(async () => {
        await runCommand(me.page, 'look me');
        await expect(transcript).toContainText(/sight is blurred|barely see|cannot see/, { timeout: 4_000 });
      }).toPass({ timeout: 30_000 });

      // …and the founder, looking at the same body, is not told how it sees.
      await runCommand(founder.page, `look ${me.handle}`);
      await expect(founder.page.getByTestId('terminal')).not.toContainText(/sight is blurred|barely see/, { timeout: 5_000 });
    } finally {
      await founder.close();
      await me.close();
    }
  });

  test('9 · `help herd` names the register\'s transaction', async ({ browser }) => {
    test.setTimeout(600_000);
    const me = await openWorldAs(browser, 'obhelp', { startLocation: YARD });
    try {
      await runCommand(me.page, 'help herd');
      await expect(me.page.getByTestId('terminal')).toContainText(/herd enter/, { timeout: 20_000 });
    } finally {
      await me.close();
    }
  });
});
