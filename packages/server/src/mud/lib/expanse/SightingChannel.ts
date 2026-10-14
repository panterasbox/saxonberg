/**
 * SightingChannel — how one craft knows another is there: a closed
 * vocabulary, one more word per new channel.
 *
 * - **visual** — the hull or the light itself, at a range the two
 *   heights decide (`1.17 (√h_obs + √h_tgt)` nautical miles, heights in
 *   feet): curvature binds at sea, so a lookout at the masthead sees
 *   further than a hand on deck.
 * - **signal** — flags, a lamp, a gun: at a fixed range regardless of
 *   height (`expanse.signalRangeNm`). The hail at twelve miles.
 *
 * Co-presence is per channel and on the same expanse only.
 */

export const SIGHTING_CHANNELS = ['visual', 'signal'] as const;
export type SightingChannel = (typeof SIGHTING_CHANNELS)[number];
