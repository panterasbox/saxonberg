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
    /**
     * ⭐⭐ The driver is no longer where the road left them, or no longer
     * with the vehicle — teleported off, relocated by an author, carried
     * away. The journey stops rather than dragging them back.
     *
     * ⚠ It is a REAL fault rather than a tidy-up. A journey keeps a
     * route snapshot and a leg index, and `Mobile.traverse` takes its
     * origin from the EXIT, not from the mover — so a beat that fired
     * while the driver stood somewhere else would move them from
     * wherever they were to the far end of a road they had left. Every
     * other caller of `traverse` resolves its exit from the room the
     * mover is standing in, so it cannot happen there; a journey is the
     * only caller that holds an exit across time.
     */
    displaced: true;
    /**
     * The driver cannot drive any more — dead, or collapsed at the
     * reins. ⚠ Nothing in the death path touches engagements, so
     * without this a corpse keeps its wagon rolling.
     */
    'driver-incapable': true;
  }
}

export {};
