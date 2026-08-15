/**
 * `ReactionApi.REACTABLE_TOPICS` — the closed set, and its size.
 *
 * ⚠ The literal once read:
 *
 *     new Set(['speech.vocal', 'speech.vocal', 'speech.vocal',
 *              'act.emote', 'speech.channel', 'act.combat'])
 *
 * — six entries declaring four topics. Say, shout and whisper had been
 * distinct topics before the S2 collapse folded them onto one name, and
 * the duplicates outlived the rename. `Set` deduped them, so nothing
 * ever failed; the literal simply claimed a size it did not have, and a
 * reader counting the lines got the wrong answer about the vocabulary.
 *
 * Asserting the COUNT is what makes the duplication visible — an
 * assertion over membership alone passes either way.
 */

import '../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import { ReactionApi } from '../reaction';

describe('REACTABLE_TOPICS', () => {
  it('holds exactly the four reactable act-kinds', () => {
    expect([...ReactionApi.REACTABLE_TOPICS].sort()).toEqual([
      'act.combat',
      'act.emote',
      'speech.channel',
      'speech.vocal',
    ]);
  });

  it('declares no duplicates — the count is the vocabulary', () => {
    expect(ReactionApi.REACTABLE_TOPICS.size).toBe(4);
  });

  it('answers `isReactableTopic` off that same set', () => {
    for (const topic of ReactionApi.REACTABLE_TOPICS) {
      expect(ReactionApi.isReactableTopic(topic)).toBe(true);
    }
    expect(ReactionApi.isReactableTopic('world.expression.tell')).toBe(false);
  });
});
