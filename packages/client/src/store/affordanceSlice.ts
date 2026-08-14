/**
 * affordanceSlice — *what can I do with this, right now, and what is it
 * made of?*
 *
 * ## ⚠⚠ The `mx` digest does not exist and must not be built
 *
 * The reference art for the affordance radial shows three layers, and
 * layer 1 is `<thing mx="Tangible,Thermal,…">` — a composition digest
 * riding the MML. **It was cut**, and this slice is what replaced it.
 * Three reasons, all still true:
 *
 * - Composition is not stable. `getActiveMixins` unions augments,
 *   implants, species innates and on-shift conferral, so a digest
 *   printed into scrollback goes stale exactly as a verb list would —
 *   and a stale menu is worse than no menu, because it is confident.
 * - It is redundant with the `stuff-id` already on every frame.
 * - Hand-authored MML makes it unreconcilable: an author writing
 *   `<thing>` by hand cannot be made to keep a digest current.
 *
 * So the composition comes from the same place the verbs do — one
 * `affordance-resolve` per subject, answered fresh. `resolveAffordances`
 * already returns `composition` beside `verbs` *deliberately*, "so the
 * menu can label and group without a second round trip".
 *
 * ## The cache is per subject, and it is a cache
 *
 * A cold radial waits one local round trip; warm opens are instant.
 * ⚠ It is invalidated on every command the player sends, because a
 * command is the one thing that reliably moves the world — and a menu
 * that answers from before your last action is the confident-and-wrong
 * failure the `mx` digest was cut to avoid.
 */

import type { AffordanceEntry } from "@saxonberg/types";

/** What the server answered for one subject. */
export interface AffordanceAnswer {
  stuffId: string;
  verbs: AffordanceEntry[];
  /** The subject's ACTIVE mixin composition — never its declared one. */
  composition: string[];
  /** When it was answered, for the staleness sweep. */
  at: number;
}

/** What the radial is currently open on, if anything. */
export interface RadialSubject {
  stuffId: string;
  /** What to call it, and what a chosen verb is aimed at. */
  displayName: string;
}

export interface AffordanceSlice {
  /** Answers by `stuffId`. */
  affordances: Record<string, AffordanceAnswer>;
  /**
   * The open radial's subject, or null.
   *
   * ⚠ One at a time. A radial is a question about ONE object — "what
   * can I do with this" — and two open at once would leave the player
   * choosing a verb without a stable answer to "aimed at what?".
   */
  radialSubject: RadialSubject | null;
  openRadial: (subject: RadialSubject) => void;
  closeRadial: () => void;
  /**
   * Subjects with a request in flight, so a second open does not send a
   * second resolve.
   */
  affordancePending: Record<string, true>;
  /**
   * Subjects the server refused to resolve.
   *
   * ⚠ One reason code by design — *"no such object"* and *"you may not
   * see that object"* are the same answer, because distinguishing them
   * would answer the question the perception gate exists to refuse. So
   * this is a set, not a map of reasons.
   */
  affordanceUnresolvable: Record<string, true>;
  markAffordancePending: (stuffId: string) => void;
  setAffordances: (answer: Omit<AffordanceAnswer, "at">) => void;
  setAffordanceUnresolvable: (stuffId: string) => void;
  /**
   * Drop every cached answer.
   *
   * ⚠ Called after every command the player sends. Coarse on purpose:
   * a per-subject invalidation would need to know which subjects a
   * command touched, which is a server semantic the client must not
   * re-derive — and the cost of being wrong is a confidently stale
   * menu, while the cost of being coarse is one round trip.
   */
  clearAffordances: () => void;
}

export const createAffordanceSlice = (
  set: (
    partial:
      | Partial<AffordanceSlice>
      | ((state: AffordanceSlice) => Partial<AffordanceSlice>),
  ) => void,
  _get: () => AffordanceSlice,
): AffordanceSlice => ({
  affordances: {},
  affordancePending: {},
  affordanceUnresolvable: {},
  radialSubject: null,

  openRadial: (subject) => set(() => ({ radialSubject: subject })),
  closeRadial: () => set(() => ({ radialSubject: null })),

  markAffordancePending: (stuffId) =>
    set((s) => ({
      affordancePending: { ...s.affordancePending, [stuffId]: true },
    })),

  setAffordances: (answer) =>
    set((s) => {
      const pending = { ...s.affordancePending };
      delete pending[answer.stuffId];
      const unresolvable = { ...s.affordanceUnresolvable };
      delete unresolvable[answer.stuffId];
      return {
        affordances: {
          ...s.affordances,
          [answer.stuffId]: { ...answer, at: Date.now() },
        },
        affordancePending: pending,
        affordanceUnresolvable: unresolvable,
      };
    }),

  setAffordanceUnresolvable: (stuffId) =>
    set((s) => {
      const pending = { ...s.affordancePending };
      delete pending[stuffId];
      return {
        affordancePending: pending,
        affordanceUnresolvable: {
          ...s.affordanceUnresolvable,
          [stuffId]: true,
        },
      };
    }),

  clearAffordances: () =>
    set(() => ({
      affordances: {},
      affordancePending: {},
      affordanceUnresolvable: {},
      // ⚠ The open radial closes with the cache. Leaving it up would
      // show a menu resolved against a world the player has just
      // changed, which is the confidently-stale failure the whole
      // resolve-fresh design exists to avoid.
      radialSubject: null,
    })),
});
