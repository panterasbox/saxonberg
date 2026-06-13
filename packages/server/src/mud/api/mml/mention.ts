/**
 * MentionResolver — resolves a literal `@<word>` from user-supplied
 * prose to a stuff-id or `null` (silent miss). The call site builds
 * a resolver scoped to the right audience set: chat channels
 * enumerate tuned-in participants; say/tell/emote enumerate the
 * speaker's perceivable neighbors.
 *
 * Construction is via factory methods on the `Mml` class
 * (`Mml.perceiverMentionResolver`, `Mml.channelMentionResolver`) so
 * consumers don't import this module directly. Implementations stay
 * here so the markdown parser can call them without pulling in the
 * full `Mml` surface.
 */

import type { Stuff } from '../../lib/stuff/Stuff';
import { ContainmentApi } from '../containment';
import { MixinApi } from '../mixin';

export interface MentionResolver {
  resolveMention(word: string): string | null;
}

/**
 * Match a single `Stuff`'s display name against a mention word.
 * Case-insensitive on the head-word — "@bobalu" matches "Bobalu",
 * "Bobalu Smallberries", and "Bobalu the Brave". Returns true on
 * any match; ties (multiple candidates matching the same word) are
 * left to the caller, which picks first-match-wins.
 */
export function nameMatchesMention(displayName: string, word: string): boolean {
  const headWord = displayName.split(/\s+/)[0] ?? '';
  return headWord.toLowerCase() === word.toLowerCase();
}

/**
 * Resolver against the speaker's perceivable neighbors — for v1, the
 * Stuff sharing the speaker's immediate container (i.e., room
 * occupants when the speaker is an Avatar / NPC). When perception
 * grows beyond room-immediate (windows / scry / etc.) this is the
 * seam to widen; for the v1 acceptance criteria, room-immediate
 * matches "matches what the user could plausibly target."
 *
 * Returns `null` if the speaker has no container (loose Stuff) or
 * none of the container's contents matches the word.
 *
 * Speaker IS a candidate — self-mention is the canonical own-name
 * highlight path. The renderer compares the mention's stuff-id
 * against the viewer's; when they match, the self-match treatment
 * fires.
 */
export class PerceiverMentionResolver implements MentionResolver {
  constructor(private readonly speaker: Stuff) {}

  resolveMention(word: string): string | null {
    if (!MixinApi.isContainable(this.speaker)) return null;
    const container = this.speaker.getContainer();
    if (!container || !MixinApi.isContainer(container)) return null;
    const speakerDisplay = this.speaker.getPresentation();
    if (nameMatchesMention(speakerDisplay, word)) return this.speaker.stuffId;
    for (const candidate of container.getContents()) {
      if (candidate.stuffId === this.speaker.stuffId) continue;
      const display = candidate.getPresentation();
      if (nameMatchesMention(display, word)) return candidate.stuffId;
    }
    return null;
  }
}

/**
 * Resolver against an explicit participant set. Used by the (future)
 * chat substrate and by tests that need a fixture roster. Stable
 * iteration: the first matching participant wins, mirroring the
 * silent-on-tie behavior of `PerceiverMentionResolver`.
 */
export class ChannelMentionResolver implements MentionResolver {
  constructor(private readonly participants: Iterable<Stuff>) {}

  resolveMention(word: string): string | null {
    for (const candidate of this.participants) {
      const display = candidate.getPresentation();
      if (nameMatchesMention(display, word)) return candidate.stuffId;
    }
    return null;
  }
}
