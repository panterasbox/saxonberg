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

  /** Default per-bucket treatment for `<player>` / `<name>` highlights. */
  bucket: Record<Bucket, StyleTreatment>;

  /** Mention treatments — self-match vs other-match. */
  mention: { match: StyleTreatment; other: StyleTreatment };
}
