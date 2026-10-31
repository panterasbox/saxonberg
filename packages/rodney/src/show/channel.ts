/**
 * Who is broadcasting — the channel, constant across every show profile.
 * The person and the studio; the show itself is a profile (./profiles.ts).
 */
export const CHANNEL = {
  /** The streamer's handle on Twitch and YouTube. */
  person: 'Bobalu Smallberries',
  /** The studio — the frame's own brand. */
  studio: "Pantera's Box",
  /** The bona fides, oldest first — "since" lines never need updating. */
  since: ['Building MUDs since 1994', 'Software engineer since 1996', 'Ed-tech since 2015'],
  /** When the show is on. ⚠ Tentative (2026-10-31): "we'll see". */
  schedule: 'Live Saturdays, 10 am Pacific',
  /** The persona's thesis — closes the About card, unattributed. */
  quote:
    'See now, this is why mad scientists are generally less desirable than your common or garden variety scientist.',
  /** Where to find the channel, in the order the overlay lists them. */
  platforms: [
    { service: 'twitch', name: 'Twitch', handle: 'bobalu_smallberries', url: 'https://www.twitch.tv/bobalu_smallberries' },
    { service: 'youtube', name: 'YouTube', handle: '@BobaluSmallberries', url: 'https://www.youtube.com/@BobaluSmallberries' },
    { service: 'kick', name: 'Kick', handle: 'bobalu', url: 'https://kick.com/bobalu' },
    { service: 'patreon', name: 'Patreon', handle: 'bobalu', url: 'https://www.patreon.com/c/bobalu' },
    { service: 'gitlab', name: 'GitLab', handle: 'bobalu', url: 'https://gitlab.com/bobalu' },
  ],
} as const;
