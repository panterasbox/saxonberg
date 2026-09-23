/**
 * Estate — the three states a member's affairs can be in, derived from
 * ABSENCE and nothing else (economic bootstrap D16):
 *
 * - `active` — resident and connected, or seen within the short clock.
 *   A connected avatar is active whatever its row says.
 * - `dormant` — absent past `estate.dormantAfterDays`. The account is
 *   frozen (outflows refused, credits land), a seat held is vacant, a
 *   shop kept is closed, a house is asleep. Nothing is taken; everything
 *   is reclaimable by ordinary acts, and a login lifts it.
 * - `escheated` — absent past `estate.escheatAfterDays`. On the next
 *   touch the estate passes: debts first, then situs up the title tree;
 *   the balance sits in the treasury as UNCLAIMED property, a claim the
 *   state cannot refuse — reclaimed by the member's return, forever.
 *
 * ⚠ NPCs are never absent (D23): every estate read narrows on an Avatar
 * identity before it consults the snapshot.
 */

export const ESTATE_STATES = ["active", "dormant", "escheated"] as const;
export type EstateState = (typeof ESTATE_STATES)[number];

/** The prefix every player Avatar's identity path carries — the one kind an estate read applies to. */
export const AVATAR_IDENTITY_PREFIX = "/platform/agent/Avatar/";
