/**
 * Who is broadcasting — the channel, constant across every show profile.
 * The person and the studio; the show itself is a profile (./profiles.ts).
 */
export const CHANNEL = {
  /** The streamer's handle on Twitch and YouTube. */
  person: 'Bobalu Smallberries',
  /** The studio — the frame's own brand. */
  studio: "Pantera's Box",
  /** Where to find the channel, in the order the overlay lists them. */
  platforms: [
    { service: 'twitch', name: 'Twitch', handle: 'bobalu_smallberries', url: 'https://www.twitch.tv/bobalu_smallberries' },
    { service: 'youtube', name: 'YouTube', handle: '@BobaluSmallberries', url: 'https://www.youtube.com/@BobaluSmallberries' },
    { service: 'kick', name: 'Kick', handle: 'bobalu', url: 'https://kick.com/bobalu' },
    { service: 'patreon', name: 'Patreon', handle: 'bobalu', url: 'https://www.patreon.com/c/bobalu' },
  ],
} as const;
