/**
 * The pane catalogue — what each named pane actually subscribes to.
 *
 * ⭐⭐ **The server owns what a pane IS, not just what it is called.**
 * A client opens a pane by name and sends nothing else; every field of
 * the subscription comes from here. The predecessor had
 * `InspectionPane.tsx` sending `query: "$focus", cardinality: "many",
 * fields: "detail"` — MQL, in a `.tsx` file. That is the client holding
 * a server semantic, which is the same category error as a client
 * deciding its own affordances, and it is why a saved arrangement could
 * never mean anything: the only name a pane had was a `nanoid` that
 * died on reconnect.
 *
 * ⚠ **This is a catalogue, not an enum of screens.** Every entry is a
 * pane the client actually opens. Adding a row is cheap; adding a row
 * for a pane nobody opens is how a vocabulary ends up sized to a
 * mockup rather than to the game.
 *
 * ⚠ **Dependency flags are declared here, beside the query that needs
 * them.** `inspect` re-resolves when focus moves; `location` when the
 * viewer does. That pairing is the same lesson `HOLD_WAKES_ON` records
 * in the subscription registry: a subscription that does not install the
 * dependency its own content needs is a surface that silently stops
 * updating, and nothing about it looks broken.
 *
 * ### Where the authored tier would go
 *
 * There is deliberately no third source yet. Shipped panes are code;
 * player *arrangements* (which panes, in what order) are clientState.
 * A pack or a venue shipping its own pane would be a third tier and
 * wants a resolution order across all three — a design conversation,
 * not a map edit. The note is here so whoever needs it finds the
 * question rather than the surprise.
 */

import type { PaneId, PaneHold } from '@saxonberg/types';
import type { FieldAlias, FieldSet } from '../../api/mql-subscription';

/** Everything the server needs to open one named pane. */
export interface PaneDefinition {
  /** Human label — what `cockpit pane list` prints. */
  readonly label: string;
  /** The MQL the pane resolves. Server-owned; never client-supplied. */
  readonly query: string;
  readonly cardinality: 'one' | 'many';
  /**
   * The field set, as either alias or an explicit list.
   *
   * ⚠ **Both aliases are object-DESCRIPTION sets** — `REF_FIELDS` is
   * `displayName`/`quantity`/`primaryKeyword`, `DETAIL_FIELDS` adds
   * descriptions, contents and exits. Neither carries a standing, a
   * competence or any other figure ABOUT the subject, so a pane whose
   * whole content is such figures has to name them. The subscribe path
   * needed no change to accept this: `resolveFieldSet` has always
   * returned an explicit `FieldSet` unchanged.
   */
  readonly fields: FieldSet | FieldAlias;
  /** Lifetime rule, when this pane has one. */
  readonly hold?: PaneHold;
  /** Re-resolve when the viewer's focus fragment changes. */
  readonly focusDependent?: boolean;
  /** Re-resolve when the viewer or a subject moves. */
  readonly locationDependent?: boolean;
}

/**
 * The shipped panes.
 *
 * ⚠ `inspect` is `many` on purpose: `$focus` can resolve to several
 * things (`focus flowers`), and the pane renders a list in that case —
 * the cardinality-polymorphic body described in inspection-pane.md.
 */
export const PANES: Readonly<Record<PaneId, PaneDefinition>> = {
  inspect: {
    label: 'what you are looking at',
    query: '$focus',
    cardinality: 'many',
    fields: 'detail',
    focusDependent: true,
  },
  location: {
    label: 'where you are',
    query: 'here',
    cardinality: 'one',
    fields: 'ref',
    locationDependent: true,
  },
  /**
   * ⭐ The widget shelf's one subscription. `me` is a pronoun seed, the
   * same fixed-pool shape `location` uses with `here`, so the pane
   * resolves to exactly one Stuff — the viewer.
   *
   * ⚠ **No dependency flags, deliberately.** These figures wake through
   * `durableKey` pokes from the standing ledgers, not through focus or
   * location, and declaring a flag nothing needs is the inverse of the
   * `HOLD_WAKES_ON` lesson: a dependency that fires for reasons
   * unrelated to the content is churn, not liveness.
   *
   * ⭐⭐ **`makeStanding` joined this list when the account roll-up
   * landed**, which was the condition its absence was recorded against.
   * It had been held back because *Make* is an account-level stock whose
   * arithmetic was unbuilt, so the field returned a per-CHARACTER figure
   * for an account-level claim — and a figure whose level is wrong
   * cannot be rendered.
   *
   * ⚠ The field now returns `undefined` rather than a wrong-level number
   * when an account cannot be resolved, and `projectFields` omits an
   * undefined field, so the client hatches it. That is what made it
   * safe to put on the wire — not the arithmetic alone, but the
   * arithmetic plus an honest absence.
   */
  self: {
    label: 'your own figures',
    query: 'me',
    cardinality: 'one',
    fields: [
      'playStanding',
      'makeStanding',
      'renown',
      'practisingCompetence',
    ],
  },
};

/**
 * Lookup shape for a name off the wire, which is a `string` until it is
 * checked. Indexing this and testing for `undefined` IS the validation —
 * there is no second list of legal names to drift from the definitions.
 */
export const PANES_BY_NAME: Readonly<
  Record<string, PaneDefinition | undefined>
> = PANES;
