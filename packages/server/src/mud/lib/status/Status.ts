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
 * A **presence decoration, not an identity affix.** The status is NOT
 * part of `getPresentation()` / `RecognitionApi.describe` (those are pure
 * identity) — it weaves in only through
 * `RecognitionApi.describeWithStatus`, which the presence-scan surfaces
 * call: the room occupant roll-call ("…, watching the empty road") and
 * the profile. Act-subject naming ("Bob says …", "Bob arrives") uses the
 * status-free `describe`, so the idle status never contradicts the act in
 * flight. Viewer-independent (the affix is the same for every viewer;
 * only the name it hangs off bends around recognition).
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { CommandContributions } from '../../api/command';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../config/AppSettings';

/** Fallback when app-settings is unread (pre-warm / tests); the seeded
 * `status.maxLength` is authoritative at runtime. A one-liner, not a
 * paragraph. */
const DEFAULT_MAX_STATUS_LENGTH = 100;

/** Max rendered status length (operator-tunable via `status.maxLength`). */
function maxStatusLength(): number {
  try {
    const n = Number(AppApi.setting(AppSettingKeys.statusMaxLength));
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_MAX_STATUS_LENGTH;
  } catch {
    return DEFAULT_MAX_STATUS_LENGTH;
  }
}

/**
 * Per-field invariant: collapse whitespace/newlines to single spaces and
 * trim. Throws on an over-long status (the setter rejects bad input
 * rather than silently truncating). Returns the cleaned one-liner.
 * Module-private — reached only through {@link StatusMixin}'s setters.
 */
function sanitizeStatus(value: string): string {
  const cleaned = value.replace(/\s+/g, ' ').trim();
  const max = maxStatusLength();
  if (cleaned.length > max) {
    throw new Error(`Status too long (${cleaned.length} > ${max} chars).`);
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
      self: ['platform/cmd/social/status.yaml'],
      peers: [],
      environment: [],
    };

    // Only the authored default persists; the runtime value is active
    // state (re-set by the verb / behavior each session), like an
    // imposed disguise.
    static fieldMeta: FieldMeta = {
      authoredStatus: { persistent: true, authorable: true },
    };

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
