/**
 * The card catalogue — what each named card actually subscribes to.
 *
 * ⭐⭐ **The server owns what a card IS, not just what it is called.**
 * A client opens a card by name and sends nothing else; every field of
 * the subscription comes from here. The predecessor had
 * `InspectionCard.tsx` sending `query: "$focus", cardinality: "many",
 * fields: "detail"` — MQL, in a `.tsx` file. That is the client holding
 * a server semantic, which is the same category error as a client
 * deciding its own affordances, and it is why a saved arrangement could
 * never mean anything: the only name a card had was a `nanoid` that
 * died on reconnect.
 *
 * ⚠ **This is a catalogue, not an enum of screens.** Every entry is a
 * card the client actually opens. Adding a row is cheap; adding a row
 * for a card nobody opens is how a vocabulary ends up sized to a
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
 * There is deliberately no third source yet. Shipped cards are code;
 * player *arrangements* (which cards, in what order) are clientState.
 * A pack or a venue shipping its own card would be a third tier and
 * wants a resolution order across all three — a design conversation,
 * not a map edit. The note is here so whoever needs it finds the
 * question rather than the surprise.
 */

import type { CardId, CardHold } from '@saxonberg/types';
import type { FieldAlias, FieldSet } from '../../api/mql-subscription';

/** Everything the server needs to open one named card. */
export interface CardDefinition {
  /** Human label — what `cockpit card list` prints. */
  readonly label: string;
  /** The MQL the card resolves. Server-owned; never client-supplied. */
  readonly query: string;
  readonly cardinality: 'one' | 'many';
  /**
   * The field set, as either alias or an explicit list.
   *
   * ⚠ **Both aliases are object-DESCRIPTION sets** — `REF_FIELDS` is
   * `displayName`/`quantity`/`primaryKeyword`, `DETAIL_FIELDS` adds
   * descriptions, contents and exits. Neither carries a standing, a
   * competence or any other figure ABOUT the subject, so a card whose
   * whole content is such figures has to name them. The subscribe path
   * needed no change to accept this: `resolveFieldSet` has always
   * returned an explicit `FieldSet` unchanged.
   */
  readonly fields: FieldSet | FieldAlias;
  /** Lifetime rule, when this card has one. */
  readonly hold?: CardHold;
  /**
   * ⭐ A card about a **particular thing** rather than about a fixed
   * place. The request supplies a `stuffId`; the subscription resolves
   * it by direct lookup **behind the perception gate** rather than by
   * running MQL, and `query` is the inert marker `'$subject'`.
   *
   * ⚠⚠ **Not an `#<stuffId>` MQL seed, and the difference is
   * security.** That seed is authoring-tier and resolves with NO
   * perception gate, so a card built on it would answer for anything
   * whose id the viewer had ever seen on a frame — a peep-hole into
   * every room in the game, looking exactly like the feature working.
   *
   * ⚠ The client supplies an IDENTITY, never a query. The catalogue
   * still decides what a card about a thing projects and what holds it
   * open, which is the whole point of naming a card.
   *
   * Declared rather than inferred from the query string, for the same
   * reason `HOLD_WAKES_ON` is declared: a subscribe that quietly
   * resolved `$subject` to nothing would be a card about the empty set,
   * which releases immediately and looks like it worked.
   */
  readonly needsSubject?: boolean;
  /** Re-resolve when the viewer's focus fragment changes. */
  readonly focusDependent?: boolean;
  /** Re-resolve when the viewer or a subject moves. */
  readonly locationDependent?: boolean;
}

/**
 * The shipped cards.
 *
 * ⚠ `inspect` is `many` on purpose: `$focus` can resolve to several
 * things (`focus flowers`), and the card renders a list in that case —
 * the cardinality-polymorphic body described in inspection-card.md.
 */
export const CARDS: Readonly<Record<CardId, CardDefinition>> = {
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
   * same fixed-pool shape `location` uses with `here`, so the card
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

  /*
   * ─── The play surface's cards (wave 4) ───
   *
   * ⚠ These rows exist because the card feed OPENS them, which is this
   * catalogue's own rule. They were deliberately not pre-added by the
   * record-layer half, which delivered a feasibility survey instead —
   * a vocabulary sized to a mockup is the failure the rule names.
   */

  /**
   * ⭐ **Where you are, as a card** — and deliberately not the same
   * thing as `location`.
   *
   * `location` is the breadcrumb root: chrome, holdless, `ref` fields,
   * and it must never close. `place` is a card in the feed: `detail`
   * fields (ways out, what is here) and a `here` hold, so walking out
   * fades it and the room you walked into opens its own.
   *
   * Two subscriptions on one query is a real cost and it is accepted
   * knowingly. Collapsing them would mean either a breadcrumb that
   * closes when you walk — chrome that vanishes — or a card that
   * outlives the room it describes, which is the stale-card problem the
   * holds exist to solve.
   */
  place: {
    label: 'where you are',
    query: 'here',
    cardinality: 'one',
    fields: 'detail',
    hold: 'here',
    locationDependent: true,
  },

  /**
   * A person you are dealing with. Held while they are still in the
   * room — `present`, not `inReach`: a conversation survives them
   * stepping across the yard, and does not survive them leaving.
   */
  /**
   * ⭐⭐ **The one card: whatever you are looking at.**
   *
   * A location, a person, yourself, a thing — one card, one field set,
   * one set of controls. What differs is only what the SUBJECT HAS:
   * `exits` is absent on a thing, `contents` on an empty one,
   * `illustration` on most. The body shows the sections that are there,
   * so "a location view" and "a thing view" are not two views at all.
   *
   * ⚠ **No hold.** The other subject cards are held by a world
   * condition — still present, still in reach — because they are claims
   * about the world. This one is a record of your ATTENTION, which is a
   * fact about you, not the room: it stacks as you look at things and
   * ages out, and `look` brings any of it back. Putting a world
   * condition on it would end a card for a reason the player never
   * asked about.
   */
  subject: {
    label: 'what you are looking at',
    query: '$subject',
    cardinality: 'one',
    fields: 'detail',
    needsSubject: true,
    locationDependent: true,
  },

  agent: {
    label: 'someone you are dealing with',
    query: '$subject',
    cardinality: 'one',
    fields: 'detail',
    hold: 'present',
    needsSubject: true,
    locationDependent: true,
  },

  /**
   * A thing you are reading or working. Held while it is `inReach`,
   * which is the honest boundary for a card whose whole content is a
   * live measurement: a reading you cannot re-take is a memory.
   */
  instrument: {
    label: 'something you are reading',
    query: '$subject',
    cardinality: 'one',
    fields: 'detail',
    hold: 'inReach',
    needsSubject: true,
    locationDependent: true,
  },

  /**
   * What you are carrying. `carried` on the SUBJECT — so a card about
   * your pack fades when you put the pack down, which is exactly when
   * its contents stop being yours to reach.
   */
  manifest: {
    label: 'what you are carrying',
    query: '$subject',
    cardinality: 'one',
    fields: 'detail',
    hold: 'carried',
    needsSubject: true,
    locationDependent: true,
  },
};

/**
 * Lookup shape for a name off the wire, which is a `string` until it is
 * checked. Indexing this and testing for `undefined` IS the validation —
 * there is no second list of legal names to drift from the definitions.
 */
export const CARDS_BY_NAME: Readonly<
  Record<string, CardDefinition | undefined>
> = CARDS;
