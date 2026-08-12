/**
 * Stylesheet engine types. Mirrored on the server in
 * `@saxonberg/types` (`StyleOverlay`, `StyleTreatment`) — the shapes
 * are stable wire-side and the client extends them with rendering
 * helpers (Bucket, Theme).
 */

import type { StyleTreatment, StyleOverlay } from '@saxonberg/types';

export type { StyleTreatment, StyleOverlay };

/**
 * Social-graph bucket vocabulary. v1 ships only `neutral`; the real
 * source (friend / foe classification) lands with the
 * social-graph slate. The `BucketResolver` interface + the neutral
 * stub keep the selector machinery exercised so swapping in the
 * real implementation later is one wiring change.
 */
export type Bucket = 'friend' | 'foe' | 'neutral';

export interface BucketResolver {
  /** Resolve a stuff-id to its social bucket. */
  resolveBucket(stuffId: string): Bucket;
}

/**
 * Font register roles — the four-voice typography model:
 * **narrative = the world speaks · chrome = the app · command = you +
 * the machine · display = the engraved civic frame.** A register is
 * resolved from a frame's `topic` (via the same longest-prefix cascade
 * as topic treatments) and then mapped to a CSS font-family stack
 * through {@link Theme.fontRoles}.
 *
 * `display` is chrome-only — section labels, headings, the wordmark,
 * binomials — and like `chrome` it maps to **no transcript topic**. It
 * lives in the role table because that table is the single face source;
 * unmapped topics keep defaulting to `command`.
 *
 * This is client-presentation only — it is NOT a wire type.
 * `StyleTreatment` has no `font` key, so the server never names a
 * register; classification lives entirely in the client
 * `Theme.registers` table keyed off the existing `Frame.topic`.
 */
export type FontRole = 'narrative' | 'chrome' | 'command' | 'display';

/**
 * A theme is a stylesheet bundle — default treatments across every
 * selector kind the engine recognizes. The user overlay layers on
 * top via `Stylesheet`'s cascade order (theme → overlay → plain).
 *
 * Themes are TypeScript modules under `themes/`; v1 ships `default`
 * (lifts the current cockpit palette) and `high-contrast`
 * (accessibility variant; legible without color).
 */
export interface Theme {
  name: 'default' | 'high-contrast';

  /** Base palette tokens — referenced by treatments via name. */
  palette: {
    fg: string;
    bg: string;
    fgMuted: string;
    chanChip: string;
    speech: string;
    link: string;
    inertLink: string;
    mentionSelfFg: string;
    mentionSelfBg: string;
    mentionOther: string;
    /** Per-channel default chip fg color, keyed by channel id. */
    channelDefaults: Record<string, string>;
  };

  /** Default per-topic treatment (looked up via longest-prefix cascade). */
  topic: Record<string, StyleTreatment>;

  /** Default per-element treatment (looked up by tag name). */
  element: Record<string, StyleTreatment>;

  /** Default per-bucket treatment for `<player>` / `<npc>` highlights. */
  bucket: Record<Bucket, StyleTreatment>;

  /** Mention treatments — self-match vs other-match. */
  mention: { match: StyleTreatment; other: StyleTreatment };

  /**
   * Explicit topic-prefix → font register. Resolved by the **same
   * longest-prefix cascade** as {@link Theme.topic} treatments (deepest
   * matching prefix wins); unmapped topics default to `'command'`
   * (mono). This is the register-classification table — keyed off the
   * existing `Frame.topic`, NOT a wire field. Font-by-register is a
   * treatment on the existing topic cascade, expressed as a sibling
   * table, not a parallel prefix-checking mechanism.
   */
  registers: Record<string, FontRole>;

  /**
   * Register role → CSS font-family stack. The swappable-faces layer:
   * re-skinning a register (e.g. narrative serif → Literata) is editing
   * one entry here plus dropping the woff2 in — no controller, topic,
   * template, or content change.
   */
  fontRoles: Record<FontRole, string>;
}
