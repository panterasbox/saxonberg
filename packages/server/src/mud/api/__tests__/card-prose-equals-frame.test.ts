/**
 * ⭐⭐ **Under `both`, the two renderings are EQUAL** (AC 17).
 *
 * `both` is the two-copies-of-one-sentence shape: two renderings of one
 * payload that can drift. It is a legitimate player choice, and it must
 * be built the way that lesson prescribes — **assert the two renderings
 * are equal**, never assert the words twice.
 *
 * This is only assertable because the card carries the SAME MML the
 * controller emitted, materialized once against the same viewer with
 * the same `Mml.toString(recipient)` the Scene composer uses. There is
 * no second prose renderer; `terminal` mode is the rendering players
 * already read.
 */

import '../../../test-bootstrap';
import { describe, it, expect, beforeEach } from 'vitest';
import { CardApi } from '../card';
import { StuffApi } from '../stuff';
import { EventApi } from '../event';
import { ShadowApi } from '../shadow';
import { MqlSubscriptionApi } from '../mql-subscription';
import { MessageApi } from '../message';
import { Mml } from '../mml';
import { CARDS } from '../../lib/connection/Cards';
import { CARD_IDS } from '@saxonberg/types';
import { makeHarness, makeContext } from './card-harness';

describe('the card and the terminal are one payload, rendered once', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
    MqlSubscriptionApi._clearAllForTesting();
    CardApi._clearAllForTesting();
  });

  it('⭐ `frame.body === card.prose`, literally', async () => {
    const h = await makeHarness();
    const frames: { topic: string; body: string }[] = [];
    const originalSend = MessageApi.sendMessage;
    // Capture the frame the composer actually built — not a
    // reconstruction of it.
    (MessageApi as unknown as Record<string, unknown>).sendMessage = ((
      recipient: unknown,
      frame: { topic: string; body: string },
    ) => {
      frames.push({ topic: frame.topic, body: frame.body });
      return (originalSend as unknown as (...a: unknown[]) => unknown)(
        recipient,
        frame,
      );
    }) as unknown as typeof MessageApi.sendMessage;

    try {
      const ctx = makeContext(h, {
        commandText: 'who',
        verbs: ['who'],
        opensCard: 'who',
      });
      const body = Mml.fromMarkup('\nAlice — the lounge\n');
      MessageApi.scene(h.avatar).topic('shell.result').toSelf(body).send();
      CardApi.open(ctx, 'who', {
        payload: { kind: 'roster', rows: [] },
        prose: body,
      });

      const resultFrame = frames.find((f) => f.topic === 'shell.result');
      const card = h.ofType('card-opened')[0]!;
      expect(resultFrame).toBeDefined();
      /*
       * ⚠ ONE assertion, on equality. Two `toContain` checks over the
       * expected words would pass while the two renderings had drifted
       * apart in every other respect — which is the failure mode the
       * rule names.
       */
      expect(card.prose).toBe(resultFrame!.body);
    } finally {
      (MessageApi as unknown as Record<string, unknown>).sendMessage =
        originalSend;
    }
  });

  /**
   * ⚠ **A row with NO prose and NO `noProse` is the failure mode.**
   *
   * A card that silently has neither cannot degrade to the terminal and
   * has not said so, so a player on `shell.result: terminal` loses it
   * with no explanation. Every row must be one or the other.
   */
  it('every card either carries prose or DECLARES it cannot', async () => {
    const h = await makeHarness();

    // The rows a command opens, each with the prose its controller emits.
    const proseRows = CARD_IDS.filter((id) => CARDS[id].noProse !== true);
    expect(proseRows.sort()).toEqual(
      ['help', 'news', 'place', 'subject', 'who', 'wiki'].sort(),
    );

    // …and the rest declare it, which is what the filter honours.
    const declared = CARD_IDS.filter((id) => CARDS[id].noProse === true);
    expect(declared.sort()).toEqual(
      ['cms', 'git', 'prompt', 'studio'].sort(),
    );

    // A `noProse` card discards prose even when a caller supplies it,
    // so the declaration cannot be defeated by a careless call site.
    CardApi.push(h.interactive, 'cms', {
      prose: Mml.fromMarkup('should not appear'),
    });
    expect(h.ofType('card-opened')[0]!.prose).toBeUndefined();
  });
});
