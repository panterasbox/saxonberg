/**
 * The Journey's abort vocabulary, declaration-merged into the
 * framework's `AbortReasonRegistry` — the shape the activity framework
 * names for a subsystem that owns its own failures.
 *
 * ⚠ **No ambush reason.** Being shot at does not stop your wagon:
 * `combat` is deliberately absent from a Journey's `interruptibleBy`,
 * and when a fight does end a journey it does so through the shipped
 * `combat` reason rather than a minted one (logistics D4).
 */

declare module '@saxonberg/types' {
  interface AbortReasonRegistry {
    /**
     * The road stopped being a road: an exit blocked, a door shut, a
     * mode gate that now refuses. The vehicle stays in the node it
     * reached — a journey never rewinds and never teleports home.
     */
    'route-blocked': true;
    /** The vehicle was destroyed, unhitched, or left the driver behind. */
    'vehicle-disabled': true;
    /** The team cannot pull any further. */
    'team-exhausted': true;
  }
}

export {};
