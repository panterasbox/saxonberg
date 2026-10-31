/**
 * Show profiles — what tonight's stream is ABOUT. Three brands share the
 * frame and each has one job:
 *
 *   the show    (a profile — Saxonberg, the only one so far) — the sidebar's brand
 *               block and the standby's right banner; changes per show
 *   the studio  (Pantera's Box) — the frame itself, and the standby's left
 *               banner; never changes
 *   the person  (Bobalu Smallberries) — the nameplate on the camera; never
 *               changes
 *
 * A profile is chosen per OBS browser source with `?show=<key>` (default
 * saxonberg); later the broadcast feed can carry it (`stream start <show>`).
 * A new show is a row here. ⚠ Saxonberg is the only show designed so far —
 * music (a Keysight capture, the camera on the player, chat) is a different
 * scene, not a profile on the Live frame, and is designed separately.
 */
export interface ShowProfile {
  key: string;
  /** Set in engraved capitals in the brand block and on the banner. */
  wordmark: string;
  /** The show's mark APPLIED (a seal) for the sidebar, or none. */
  seal: string | null;
  /** The show's mark STANDALONE (white on blue) for the banner, or none. */
  mark: string | null;
  /** The label over the topic, e.g. "Now". */
  topicLabel: string;
  /** The topic line when the feed sets none. */
  defaultTopic: string;
  /** The show's subject in one sentence — the owner's, verbatim. */
  pitch: string;
  /** Lower-third panel keys this show rotates (rows in scenes/live/panels). */
  panels: string[];
  /** Does the crawl run? Its items are Saxonberg's in-world news. */
  crawl: boolean;
}

export const PROFILES: Record<string, ShowProfile> = {
  saxonberg: {
    key: 'saxonberg',
    wordmark: 'Saxonberg',
    seal: '/brand/saxonberg-seal.svg',
    mark: '/brand/saxonberg-rings-white.svg',
    topicLabel: 'Now',
    defaultTopic: 'Working on Saxonberg',
    pitch: 'Saxonberg is a text world in your browser that its players build, fund and govern.',
    panels: ['join', 'world', 'money', 'community', 'compact', 'about', 'gitlab', 'wiki'],
    crawl: true,
  },
};

/** The profile this page was opened with (`?show=`), else Saxonberg. */
export function currentProfile(): ShowProfile {
  const key = new URLSearchParams(window.location.search).get('show') ?? 'saxonberg';
  return PROFILES[key] ?? PROFILES.saxonberg;
}
