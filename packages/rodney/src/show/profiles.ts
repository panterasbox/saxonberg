/**
 * Show profiles — what tonight's stream is ABOUT. Three brands share the
 * frame and each has one job:
 *
 *   the show    (a profile: Saxonberg, a game, music) — the sidebar's brand
 *               block and the standby's right banner; changes per show
 *   the studio  (Pantera's Box) — the frame itself, and the standby's left
 *               banner; never changes
 *   the person  (Bobalu Smallberries) — the nameplate on the camera; never
 *               changes
 *
 * A profile is chosen per OBS browser source with `?show=<key>` (default
 * saxonberg); later the broadcast feed can carry it (`stream start music`).
 * A new show is a row here.
 */
export interface ShowProfile {
  key: string;
  /** Set in engraved capitals in the brand block and on the banner. */
  wordmark: string;
  /** The show's mark APPLIED (a seal) for the sidebar, or none. */
  seal: string | null;
  /** The show's mark STANDALONE (white on blue) for the banner, or none. */
  mark: string | null;
  /** The label over the topic: "Now", "Playing", "Setlist". */
  topicLabel: string;
  /** The topic line when the feed sets none. */
  defaultTopic: string;
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
    panels: ['join', 'world', 'about', 'links', 'follow'],
    crawl: true,
  },
  // ⚠ Stubs — wordmarks only until they have marks of their own.
  gaming: {
    key: 'gaming',
    wordmark: 'Playing',
    seal: null,
    mark: null,
    topicLabel: 'Playing',
    defaultTopic: 'A game',
    panels: ['follow', 'about'],
    crawl: false,
  },
  music: {
    key: 'music',
    wordmark: 'Music',
    seal: null,
    mark: null,
    topicLabel: 'Setlist',
    defaultTopic: 'Live music',
    panels: ['follow', 'about'],
    crawl: false,
  },
};

/** The profile this page was opened with (`?show=`), else Saxonberg. */
export function currentProfile(): ShowProfile {
  const key = new URLSearchParams(window.location.search).get('show') ?? 'saxonberg';
  return PROFILES[key] ?? PROFILES.saxonberg;
}
