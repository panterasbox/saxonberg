/**
 * ⭐ **A prompt card opens PINNED and auto-releases when answered**
 * (decision 2, AC 5).
 *
 * This is where the retired `unanswered` hold's guarantee went —
 * *nothing that is still actionable ever leaves* — expressed on the one
 * lifetime axis with no hold vocabulary. A prompt card that timed out
 * while still owing a reply is precisely the failure the hold model was
 * built to prevent.
 *
 * ⚠⚠ **There is no `refresh*` / `drain*` helper anywhere in this file,
 * and there must never be one.** A `here` card was immortal through
 * ELEVEN passing tests because every one of them called
 * `refreshForInteractive` by hand. The prompt is settled through the
 * real answer path and the consequence is asserted; nothing here nudges
 * the card.
 */

import '../../../test-bootstrap';
import { describe, it, expect, beforeEach } from 'vitest';
import { CardApi } from '../card';
import { PromptApi } from '../prompt';
import { StuffApi } from '../stuff';
import { EventApi } from '../event';
import { ShadowApi } from '../shadow';
import { MqlSubscriptionApi } from '../mql-subscription';
import { CARDS } from '../../lib/connection/Cards';
import { makeHarness, type Harness } from './card-harness';

/** The promptId the server just minted, read off the prompt envelope. */
function latestPromptId(h: Harness): string {
  const prompts = h.ofType('prompt');
  const last = prompts[prompts.length - 1];
  return last!.promptId as string;
}

describe('a prompt card holds until it is answered', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
    MqlSubscriptionApi._clearAllForTesting();
    PromptApi._clearAllForTesting();
    CardApi._clearAllForTesting();
  });

  it('the catalogue pins it, so the sweep can never reach it', () => {
    expect(CARDS.prompt.pinnedByDefault).toBe(true);
  });

  it('opens pinned, survives the window, and closes on the ANSWER', async () => {
    const h = await makeHarness();

    // A real prompt, awaited by a real caller.
    const answer = PromptApi.confirm(h.interactive, 'Proceed?');
    const promptId = latestPromptId(h);
    expect(PromptApi.isPending(h.interactive, promptId)).toBe(true);

    /*
     * ⚠⚠ **Nothing here opens the card.** `PromptApi.confirm` above did,
     * because the prompt substrate pushes it — and for one pass it did
     * NOT: every test in this file hand-pushed the card it was about to
     * assert on, so the whole lifetime passed over a card production
     * could never create. `CardApi.push` had zero call sites. Found by
     * driving `wiki create`: the prompt strip opened and the feed stayed
     * empty.
     */
    const opened = h.ofType('card-opened');
    expect(opened.length).toBe(1);
    expect(opened[0]!.pinned).toBe(true);
    expect(opened[0]!.promptId).toBe(promptId);
    expect(opened[0]!.key).toBe(`prompt ${promptId}`);
    const instanceId = opened[0]!.instanceId as string;

    // ⚠ Well past any relevance window, and it is still there.
    expect(
      CardApi._sweepNowForTesting(60_000, Date.now() + 60_000 * 1000),
    ).toBe(0);
    expect(CardApi._getSizeForTesting()).toBe(1);
    expect(h.ofType('card-closed').length).toBe(0);

    // Answer it — through the real inbound path, not a poke at the card.
    PromptApi.handleResponse(h.interactive, { promptId, response: 'yes' });
    await expect(answer).resolves.toBe(true);

    const closed = h.ofType('card-closed');
    expect(closed.length).toBe(1);
    expect(closed[0]!.instanceId).toBe(instanceId);
    expect(closed[0]!.reason).toBe('answered');
    expect(CardApi._getSizeForTesting()).toBe(0);
  });

  it('a cancelled prompt closes its card too', async () => {
    const h = await makeHarness();
    const answer = PromptApi.text(h.interactive, 'Name?');
    // The rejection is handled below; attach now so no unhandled rejection
    // escapes between here and the cancel.
    const settled = answer.then(
      () => 'resolved',
      () => 'rejected',
    );
    latestPromptId(h);
    // Pushed by the substrate, not by this test.
    expect(CardApi._getSizeForTesting()).toBe(1);

    PromptApi.cancelAll(h.interactive, 'cancelled');
    await settled;

    expect(h.ofType('card-closed')[0]!.reason).toBe('answered');
    expect(CardApi._getSizeForTesting()).toBe(0);
  });

  it('settling one prompt leaves another prompt card alone', async () => {
    const h = await makeHarness();
    const first = PromptApi.confirm(h.interactive, 'One?');
    const firstId = latestPromptId(h);
    const second = PromptApi.confirm(h.interactive, 'Two?');
    const secondId = latestPromptId(h);
    // ⭐ TWO cards, because two questions — the key carries the
    // `promptId` precisely so the second cannot retarget the first.
    expect(CardApi._getSizeForTesting()).toBe(2);

    PromptApi.handleResponse(h.interactive, {
      promptId: firstId,
      response: 'yes',
    });
    await first;

    expect(CardApi._getSizeForTesting()).toBe(1);
    expect(CardApi.list(h.interactive)[0]!.key).toBe(`prompt ${secondId}`);

    PromptApi.handleResponse(h.interactive, {
      promptId: secondId,
      response: 'no',
    });
    await second;
    expect(CardApi._getSizeForTesting()).toBe(0);
  });

  /**
   * ⚠ The BODY is not on the card. The client already holds one prompt
   * model (the prompt queue) and the card joins it by `promptId` — one
   * prompt model, and the feed reads it.
   */
  it('carries a promptId and no body of its own', async () => {
    const h = await makeHarness();
    const answer = PromptApi.confirm(h.interactive, 'Proceed?');
    const promptId = latestPromptId(h);
    const opened = h.ofType('card-opened')[0]!;
    expect(opened.promptId).toBe(promptId);
    expect(opened.result).toBeUndefined();
    expect(opened.payload).toBeUndefined();
    // …and no prose, because `prompt` declares `noProse`.
    expect(opened.prose).toBeUndefined();

    PromptApi.handleResponse(h.interactive, { promptId, response: 'yes' });
    await answer;
  });
});
