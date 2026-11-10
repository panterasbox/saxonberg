/**
 * StandbyReason — why a streamer stepped away, read off a `standby-reason`
 * pack document (broadcast-ready D2).
 *
 * ⭐ A reason is a ROW, not code: `bathroom`, `food`, `water`, `privacy`,
 * `technical` and `generic` ship in the platform pack at
 * `/platform/standby-reasons/<key>`, and a new one is a new file. It is read
 * by PATH when `stream away <word>` names it — never listed, never warmed
 * at boot (P7, load on use).
 *
 * The one concept here is the reason and how a `stream away` operand is
 * READ: a bare duration (`stream away 15m`, the shipped grammar) is the
 * `generic` reason for that long; a word is a reason, optionally followed
 * by a duration that overrides its default. A privacy reason never carries
 * a countdown — a timer would tell the audience how long the private thing
 * takes and push the streamer back before they are ready (lens 4).
 *
 * The duration grammar is shell-style (`15m`, `1h30m`, `90s`; a bare
 * number is minutes) and lives here because `stream start in <dur>` and
 * `stream away <reason> <dur>` both speak it and the reason's default is
 * one of its values. The reading, the reads and the duration words are
 * `StreamApi`'s (`interpretAway`, `standbyReasons`, `parseDuration`,
 * `formatDuration`); this module is the value they hand back.
 *
 * @internal
 */

import type { StreamReason } from '@saxonberg/types';

/** What a `stream away` operand resolved to — or why it did not. */
export type StandbyReading =
  | { ok: true; reason: StandbyReason; durationMs: number | null }
  | { ok: false; refusal: 'unknown-reason' | 'bad-duration'; detail: string };

/** The stored shape of a reason row's `data`. */
interface StandbyReasonData {
  label?: unknown;
  copy?: unknown;
  defaultDurationMs?: unknown;
  privacy?: unknown;
  scene?: unknown;
}

/** A reason row, read and validated. @internal */
export class StandbyReason {
  private constructor(
    public readonly key: string,
    public readonly label: string,
    public readonly copy: string,
    public readonly defaultDurationMs: number | null,
    public readonly privacy: boolean,
    public readonly scene: string | null,
  ) {}

  /**
   * Build a reason from its row's data. Throws naming the key on a
   * malformed row — a reason with no label or copy is an authoring error,
   * not a quiet default.
   */
  public static fromData(key: string, data: Record<string, unknown>): StandbyReason {
    const d = data as StandbyReasonData;
    if (typeof d.label !== 'string' || d.label.length === 0) {
      throw new Error(`standby reason '${key}': 'label' must be a non-empty string`);
    }
    if (typeof d.copy !== 'string' || d.copy.length === 0) {
      throw new Error(`standby reason '${key}': 'copy' must be a non-empty string`);
    }
    const dur = d.defaultDurationMs;
    if (dur !== undefined && dur !== null && (typeof dur !== 'number' || !(dur > 0))) {
      throw new Error(`standby reason '${key}': 'defaultDurationMs' must be a positive number or null`);
    }
    if (d.scene !== undefined && d.scene !== null && typeof d.scene !== 'string') {
      throw new Error(`standby reason '${key}': 'scene' must be a string`);
    }
    const privacy = d.privacy === true;
    return new StandbyReason(
      key,
      d.label,
      d.copy,
      // ⭐ A privacy reason has no timer, whatever the row says.
      privacy ? null : typeof dur === 'number' ? dur : null,
      privacy,
      typeof d.scene === 'string' ? d.scene : null,
    );
  }

  /** The wire shape the overlay reads. */
  public toView(): StreamReason {
    return {
      key: this.key,
      label: this.label,
      copy: this.copy,
      privacy: this.privacy,
      scene: this.scene,
    };
  }
}
