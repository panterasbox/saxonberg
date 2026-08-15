/**
 * The card catalogue — what each named card actually resolves, and what
 * kind of life it has.
 *
 * ⭐⭐ **The server owns what a card IS, not just what it is called.** A
 * card is born because a COMMAND caused the server to push it; every
 * field of its content comes from here. The predecessor had
 * `InspectionCard.tsx` sending `query: "$focus", cardinality: "many",
 * fields: "detail"` — MQL, in a `.tsx` file. That is the client holding
 * a server semantic, which is the same category error as a client
 * deciding its own affordances.
 *
 * ⚠ **This is a catalogue, not an enum of screens.** Every entry is a
 * card some command actually opens. Adding a row for a card nobody
 * opens is how a vocabulary ends up sized to a mockup rather than to
 * the game.
 *
 * ### The three sources, and why there are three
 *
 * MQL speaks **Stuff**. The roster is `RosterRow[]`, releases are
 * `Release` documents, a wiki page is a rendered payload and the
 * authoring surfaces are REST — so an MQL-only catalogue could not
 * express three of the ten shipped rows at all. Hence
 * {@link CardSource}: `mql` (a server-owned query over Stuff),
 * `payload` (a producer forwarding to the Api that already owns the
 * read), `client` (the client fills the body from its own transport —
 * Monaco, the git panel, the studio composer).
 *
 * ### The two axes are independent, and both are REQUIRED
 *
 * `pinnedByDefault` and `live` are non-optional on purpose — the
 * `COLLECTION_POLICIES` trick from `ResetPolicy`. A new `CardId`
 * without a lifetime decision and a liveness decision is a **compile
 * error**, which is what makes "a new card cannot ship without choosing
 * its lifetime" enforceable rather than aspirational.
 *
 * ### Where the authored tier would go
 *
 * There is deliberately no third source of ROWS yet. Shipped cards are
 * code; player *arrangements* (which cards, in what order) are
 * clientState. A pack or a venue shipping its own card would be a third
 * tier and wants a resolution order across all three — a design
 * conversation, not a map edit.
 */

import type { CardId } from '@saxonberg/types';
import type { FieldAlias, FieldSet } from '../../api/mql-subscription';

/**
 * Where a card's content comes from.
 *
 * ⚠ A discriminated union rather than three optional field groups, so a
 * row that names a query AND a payload producer does not typecheck.
 */
export type CardSource =
  | {
      readonly kind: 'mql';
      /** The MQL the card resolves. Server-owned; never client-supplied. */
      readonly query: string;
      readonly cardinality: 'one' | 'many';
      /**
       * The field set, as either alias or an explicit list.
       *
       * ⚠ **Both aliases are object-DESCRIPTION sets** — `REF_FIELDS` is
       * `displayName`/`quantity`/`primaryKeyword`, `DETAIL_FIELDS` adds
       * descriptions, contents and exits. Neither carries a standing, a
       * competence or any other figure ABOUT the subject, so a card
       * whose whole content is such figures has to name them.
       */
      readonly fields: FieldSet | FieldAlias;
      /**
       * ⭐ A card about a **particular thing** rather than about a fixed
       * place. The open supplies a `stuffId`; the card resolves it by
       * direct lookup **behind the perception gate** rather than by
       * running MQL, and `query` is the inert marker `'$subject'`.
       *
       * ⚠⚠ **Not an `#<stuffId>` MQL seed, and the difference is
       * security.** That seed is authoring-tier and resolves with NO
       * perception gate, so a card built on it would answer for anything
       * whose id the viewer had ever seen on a frame — a peep-hole into
       * every room in the game, looking exactly like the feature
       * working.
       */
      readonly needsSubject?: true;
      /** Re-resolve when the viewer or a subject moves. Live cards only. */
      readonly locationDependent?: true;
    }
  | {
      readonly kind: 'payload';
      /**
       * Which producer on `CardLogic` fills the body. Each forwards to
       * the Api that already owns the read (`SocialApi`,
       * `PressApi.recent`, `WikiApi`, the help catalogue) — this build
       * adds no new read Apis.
       */
      readonly producer: CardPayloadKind;
    }
  | {
      /**
       * ⚠ The client fills this body from its own transport (the CMS
       * REST tree, the git panel, the studio catalogue). The SERVER
       * still owns the card's existence, identity, lifetime and
       * pinned-ness — only the body is the client's.
       */
      readonly kind: 'client';
    }
  | {
      /** The body is joined by `promptId` against the client's one prompt model. */
      readonly kind: 'prompt';
    };

/** The `payload`-source producers. Mirrors `CardPayload`'s `kind`. */
export type CardPayloadKind = 'roster' | 'releases' | 'wikiPage' | 'helpTopic';

/** Everything the server needs to open one named card. */
export interface CardDefinition {
  /** Human label — what `cockpit card list` prints and a waiting card says. */
  readonly label: string;
  readonly source: CardSource;
  /**
   * ⚠ **REQUIRED, both of them.** Omitting either fails the build (AC 2).
   * Pinned-ness is the whole lifetime axis; liveness is orthogonal and
   * all four combinations are meaningful.
   */
  readonly pinnedByDefault: boolean;
  readonly live: boolean;
  /**
   * The command that produces this card. It **IS** the dedup key for a
   * card the arrangement resolver pushes, and it is what a refresh
   * control re-issues. `<subject>` is filled from the subject's
   * `primaryKeyword` at open.
   *
   * ⭐ Giving the arrangement-pushed card the key of its own refresh
   * command is what makes a bare `look` **touch** `place` rather than
   * mint a duplicate — decisions 4 and 6 composed, which retires the
   * *"the focus card must not FLASH"* special case structurally rather
   * than by a duplicate check.
   */
  readonly command: string;
  /**
   * ⚠ This card **cannot degrade to prose**. A Monaco editor has no
   * terminal rendering, and without the declaration a `terminal`-only
   * `shell.result` setting would silently take the authoring surface
   * away. The filter honours it: `terminal` suppresses the card only
   * where this is absent.
   */
  readonly noProse?: true;
}

/**
 * The shipped cards.
 *
 * `Record<CardId, CardDefinition>` — total by construction, so a new
 * `CardId` with no row is a compile error.
 */
export const CARDS: Readonly<Record<CardId, CardDefinition>> = {
  /**
   * ⭐⭐ **The one card: whatever you looked at.**
   *
   * A location, a person, yourself, a thing — one card, one field set,
   * one set of controls. What differs is only what the SUBJECT HAS:
   * `exits` is absent on a thing, `contents` on an empty one,
   * `illustration` on most. The body shows the sections that are there,
   * so "a location view" and "a thing view" are not two views at all.
   *
   * ⚠ **Unpinned, and static.** It is a record of your ATTENTION, which
   * is a fact about you rather than about the room: it stacks as you
   * look at things and ages out of the relevance window, and looking
   * again brings it back.
   */
  subject: {
    label: 'what you are looking at',
    source: {
      kind: 'mql',
      query: '$subject',
      cardinality: 'one',
      fields: 'detail',
      needsSubject: true,
    },
    pinnedByDefault: false,
    live: false,
    command: 'look <subject>',
  },

  /**
   * ⭐ **Where you are.** Pinned by default, because the room is the one
   * card you want to survive everything else you look at.
   *
   * ⚠ **Its key is `look`, and that is load-bearing.** Nothing runs
   * `look` on arrival, so dropping this row would leave an empty feed at
   * login; giving the arrangement-pushed card the key of its own refresh
   * command means a bare `look` touches it instead of minting a
   * duplicate.
   *
   * ⭐⭐ **The one LIVE row, and it is the one that earns it.** A card
   * pinned by default is a card that outlives everything around it, so a
   * stale one is the classic failure the liveness axis exists to
   * prevent — and `locationDependent` is a wake that already exists and
   * is already proven, rather than one this build would have to invent
   * (which is exactly why `who` ships static). Being live, it carries no
   * refresh control and no `takenAt`: walking into a room re-resolves it
   * in place.
   *
   * ⚠ It also means the liveness axis ships EXERCISED. A catalogue where
   * every row is static would leave `live` a field nothing reads, and a
   * declaration nothing reads is indistinguishable from a broken one.
   */
  place: {
    label: 'where you are',
    source: {
      kind: 'mql',
      query: 'here',
      cardinality: 'one',
      fields: 'detail',
      locationDependent: true,
    },
    pinnedByDefault: true,
    live: true,
    command: 'look',
  },

  /**
   * ⚠ **Static, and that is a decision rather than a shortcut.** The
   * dependency vocabulary is `focusDependent`, `locationDependent` and
   * the `durableKey` poke channel — **nothing wakes on connect or
   * disconnect**. A live `who` would resolve once and then be
   * permanently wrong while looking exactly like it worked, which is the
   * immortal-card shape. Building a presence wake means every login
   * poking every open `who`, which is real cost for a list one click
   * refreshes.
   */
  who: {
    label: "who's online",
    source: { kind: 'payload', producer: 'roster' },
    pinnedByDefault: false,
    live: false,
    command: 'who',
  },

  news: {
    label: 'the news',
    source: { kind: 'payload', producer: 'releases' },
    pinnedByDefault: false,
    live: false,
    command: 'press',
  },

  wiki: {
    label: 'the wiki',
    source: { kind: 'payload', producer: 'wikiPage' },
    pinnedByDefault: false,
    live: false,
    command: 'wiki <subject>',
  },

  help: {
    label: 'the rulebook',
    source: { kind: 'payload', producer: 'helpTopic' },
    pinnedByDefault: false,
    live: false,
    command: 'help <subject>',
  },

  /**
   * ⭐ **The prompt card opens PINNED and auto-releases when answered.**
   *
   * This is where the retired `unanswered` hold's guarantee went —
   * *nothing that is still actionable ever leaves* — expressed on the
   * one lifetime axis with no hold vocabulary. A prompt card that timed
   * out while still owing a reply is precisely the failure the hold
   * model was built to prevent, so the relevance window must not reach
   * it, and `pinnedByDefault` is what keeps the sweep away.
   *
   * ⚠ The BODY is not on the card. The client already holds one prompt
   * model (the prompt queue) and the card joins it by `promptId` — one
   * prompt model, and the feed reads it.
   */
  prompt: {
    label: 'a question for you',
    source: { kind: 'prompt' },
    pinnedByDefault: true,
    live: false,
    command: 'prompt',
    noProse: true,
  },

  cms: {
    label: 'the content editor',
    source: { kind: 'client' },
    pinnedByDefault: true,
    live: false,
    command: 'cms',
    noProse: true,
  },

  git: {
    label: 'version control',
    source: { kind: 'client' },
    pinnedByDefault: true,
    live: false,
    command: 'git',
    noProse: true,
  },

  studio: {
    label: 'the composer',
    source: { kind: 'client' },
    pinnedByDefault: true,
    live: false,
    command: 'studio',
    noProse: true,
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

/**
 * ⭐⭐ **The widget shelf's one subscription — and it is NOT a card.**
 *
 * `me` is a pronoun seed, so this resolves to exactly one Stuff: the
 * viewer. It sits in this module because it is the same *kind* of thing
 * — a server-owned query the client may name — but it deliberately does
 * not join {@link CARDS}, because it has no pinned-ness and no lifetime.
 * Forcing it to declare them would make the catalogue's required-fields
 * gate meaningless, which is the gate that makes AC 2 real.
 *
 * The client names it on the wire as `chrome: 'self'`, the only
 * subscription a client may still open for itself.
 *
 * ⚠ **No dependency flags, deliberately.** These figures wake through
 * `durableKey` pokes from the standing ledgers, not through focus or
 * location, and declaring a flag nothing needs is churn rather than
 * liveness.
 */
export const SHELF_SUBSCRIPTION: {
  readonly label: string;
  readonly query: string;
  readonly cardinality: 'one' | 'many';
  readonly fields: FieldSet | FieldAlias;
} = {
  label: 'your own figures',
  query: 'me',
  cardinality: 'one',
  fields: ['playStanding', 'makeStanding', 'renown', 'practisingCompetence'],
};
