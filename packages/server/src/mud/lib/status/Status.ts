/**
 * StatusMixin — a settable activity-status line that decorates a
 * Character's presentation: "Gus, the crossing guard, watching the empty
 * road."
 *
 * Three sources, one field surface:
 *   - the `status` **verb** (a player sets their own),
 *   - a runtime **setter** an NPC behavior pokes (`setStatus`),
 *   - a **static authored default** seeded on the template
 *     (`authoredStatus`) — what the NPC reads as when nothing's been set.
 *
 * The runtime value (verb / behavior) overrides the authored default;
 * clearing it (empty string) reverts to the default.
 *
 * **Distinct from derived status-flags** (poisoned, glowing) computed
 * from effects — those are a separate concern that also lands in
 * decoration but from a different source. Don't merge them into this
 * authored field.
 *
 * Viewer-independent: the status rides `getPresentation()`'s decoration
 * (so logs and viewer-blind contexts show it) and is re-woven by
 * `RecognitionApi.describe` onto the recognized/salient name so a
 * recognized "Bob" still reads "Bob, watching the road."
 */

import type { MixinConstructor } from '../mixin';
import type { CommandContributions } from '../../api/command';

/** Max rendered status length — a one-liner, not a paragraph. */
const MAX_STATUS_LENGTH = 100;

/**
 * Per-field invariant: collapse whitespace/newlines to single spaces and
 * trim. Throws on an over-long status (the setter rejects bad input
 * rather than silently truncating). Returns the cleaned one-liner.
 */
export function sanitizeStatus(value: string): string {
  const cleaned = value.replace(/\s+/g, ' ').trim();
  if (cleaned.length > MAX_STATUS_LENGTH) {
    throw new Error(
      `Status too long (${cleaned.length} > ${MAX_STATUS_LENGTH} chars).`,
    );
  }
  return cleaned;
}

export interface Status {
  /** The effective status (runtime override, else authored default). */
  getStatus(): string;
  /** Set the runtime status; empty reverts to the authored default. */
  setStatus(value: string): void;
  /** Seed the static authored default (hydrator + authoring). */
  setAuthoredStatus(value: string): void;
}

export function StatusMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class StatusMixin extends Base implements Status {
    static _mixinName = 'StatusMixin';

    // The `status` verb rides the capability mixin — every Character
    // (PC and NPC) that composes StatusMixin gains it.
    static commandContributions: CommandContributions = {
      self: ['social/status.yaml'],
      environment: [],
      inventory: [],
      peers: [],
    };

    // Only the authored default persists; the runtime value is active
    // state (re-set by the verb / behavior each session), like an
    // imposed disguise.
    static persistentFields = ['authoredStatus'];

    public authoredStatus: string = '';
    private _runtimeStatus: string | null = null;

    getStatus(): string {
      return this._runtimeStatus ?? this.authoredStatus;
    }

    setStatus(value: string): void {
      const cleaned = sanitizeStatus(value);
      // Empty clears the override and falls back to the authored default.
      this._runtimeStatus = cleaned.length === 0 ? null : cleaned;
    }

    setAuthoredStatus(value: string): void {
      this.authoredStatus = sanitizeStatus(value);
    }
  };
}
