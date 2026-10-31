/**
 * Who is broadcasting — the channel, constant across every show profile.
 * The person and the studio; the show itself is a profile (./profiles.ts).
 */
export const CHANNEL = {
  /** The streamer's handle on Twitch and YouTube. */
  person: 'Bobalu Smallberries',
  /** The studio — the frame's own brand. */
  studio: "Pantera's Box",
} as const;
