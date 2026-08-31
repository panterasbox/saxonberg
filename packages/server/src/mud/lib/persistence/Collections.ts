/*
 * ⚠ GENERATED FILE — DO NOT EDIT.
 *
 * Emitted by `pnpm gen:schema` from the authored schema docs in
 * `packages/server/src/schema/`. Edit the YAML doc for the collection
 * you mean, then re-run the generator; `pnpm lint:schema` fails if this
 * file and the docs disagree.
 */

/**
 * Collections — the MongoDB collection-name vocabulary.
 *
 * The one concept this module defines: the closed set of collection names
 * the world persists into. It is *vocabulary*, not mechanism — no driver,
 * no connection, no I/O — which is why it lives in the mudlib rather than
 * in `backend/`: mudlib records name their own collection
 * (`static collectionName = Collections.BankLedger`), and under the import
 * boundary (docs/architecture.md § The import boundary) a mudlib module
 * may not reach into `backend/` to learn its own name.
 *
 * `backend/PersistenceManager` imports this and re-exports it, so the
 * driver side keeps one import site for the surface it speaks.
 *
 * Each member carries its collection's one-line summary. The full
 * description — purpose, invariants, indexes and both policies — is the
 * authored doc at `src/schema/<collection>.yaml`, and is readable in
 * game as `help <collection>`.
 */

export enum Collections {
  /**
   * The unified harm-consent ledger: who did what to whom, with blame left
   * underived.
   */
  AccountabilityEvents = 'accountability_events',
  /** The configuration singleton — one row, the whole knob board. */
  AppSettings = 'app_settings',
  /**
   * The append-only authorship ledger: who made what, derived from context
   * rather than claimed.
   */
  AuthoringEvents = 'authoring_events',
  /** The materialized account registry and balance — a cache over the ledger. */
  BankAccounts = 'bank_accounts',
  /** The money system of record. Every movement of money, append-only. */
  BankLedger = 'bank_ledger',
  /**
   * The single-row money-supply headline — how much exists, rebuildable from
   * the ledger.
   */
  BankSupply = 'bank_supply',
  /** Per-viewer identity memory: what YOU know about who someone is. */
  Beliefs = 'beliefs',
  /** The Studio's composition catalogue — one row per authored blueprint. */
  Blueprints = 'blueprints',
  /** Chat channels — one row per named channel, of three kinds. */
  Channels = 'channels',
  /** Per-instance ownership of movable things: one row per owned object. */
  Chattel = 'chattel',
  /**
   * The chain of title for movables — stamp, transfer, and every hand it
   * passed through.
   */
  ChattelEvents = 'chattel_events',
  /**
   * The per-character append-only identity ledger: deeds recorded, claims
   * recorded as claims.
   */
  Chronicles = 'chronicles',
  /** The template tree — every authored row the world is cloned from. */
  Content = 'content',
  /** The append-only gig lifecycle chain: posted, claimed, delivered, settled. */
  ContractEvents = 'contract_events',
  /** Work-contract current state: one row per gig, from posting to settlement. */
  Contracts = 'contracts',
  /**
   * The pools an unidentified magic item draws its appearance from — one bank
   * per item class.
   */
  DescriptorBanks = 'descriptor_banks',
  /** The author-diagnostics store: what broke in your content, TTL-rotated. */
  Diagnostics = 'diagnostics',
  /**
   * The trait evidence ledger — the Transcript's sibling, for who you are
   * rather than what you can do.
   */
  DispositionEvents = 'disposition_events',
  /**
   * The third path-addressed tree: kind-tagged documents, from press releases
   * to command views.
   */
  Documents = 'documents',
  /** One row per board — the forum manifestation of a subject. */
  ForumBoards = 'forum_boards',
  /** The reply tree: threads and posts, one row each. */
  ForumEntries = 'forum_entries',
  /** The forums' append-only audit and archive log. */
  ForumEvents = 'forum_events',
  /**
   * The linking spine: the subject a board, a channel or an article can all be
   * about.
   */
  ForumSubjects = 'forum_subjects',
  /** One row per (entry, voter) — the vote, and the enforcement of one vote. */
  ForumVotes = 'forum_votes',
  /** The Google OAuth profile behind an account, stored apart from it. */
  GoogleProfiles = 'google_profiles',
  /**
   * Named sets of people — the axis groups, the packs' bodies, and everything
   * in between.
   */
  Groups = 'groups',
  /**
   * The self-persistence spine's records — a live host's runtime state,
   * captured.
   */
  HolderSnapshots = 'holder_snapshots',
  /**
   * The Kick OAuth profile behind an account, and the KickProfile provider's
   * store.
   */
  KickProfiles = 'kick_profiles',
  /**
   * Provenance for every generated illustration: prompt, model, and where the
   * bytes went.
   */
  MediaAssets = 'media_assets',
  /**
   * Who currently holds which office — sparse, because absence means the
   * founder default.
   */
  OfficeHolders = 'office_holders',
  /**
   * The pack installer's per-deployment ledger: what is installed, and from
   * what.
   */
  PackInstalls = 'pack_installs',
  /** The chain of title — every grant, subdivision and transfer, append-only. */
  ParcelEvents = 'parcel_events',
  /** The real-property title registry: who holds title to which extent. */
  Parcels = 'parcels',
  /** The materialized per-subject participation standing — a rebuildable cache. */
  Participation = 'participation',
  /**
   * The append-only active-bucket log: when someone was actually present and
   * doing something.
   */
  ParticipationEvents = 'participation_events',
  /** Durable party mirrors — the crews that outlive a session. */
  Parties = 'parties',
  /**
   * The record layer's rolling window: the frames each player was actually
   * delivered.
   */
  PlayerFrames = 'player_frames',
  /** Held conviction — one row per stake somebody currently holds. */
  Positions = 'positions',
  /** The materialized per-author producer standing — a rebuildable cache. */
  Producer = 'producer',
  /**
   * The append-only attributed-engagement log: whose work someone else spent
   * time on.
   */
  ProducerEvents = 'producer_events',
  /**
   * The materialized per-(subject, scope) renown standing — a cache, and
   * disposable.
   */
  Renown = 'renown',
  /**
   * The append-only, scope-tagged log of every signal that moves someone's
   * standing.
   */
  RenownEvents = 'renown_events',
  /**
   * The advancement evidence ledger: one row per sub-check a character
   * actually attempted.
   */
  Transcripts = 'transcripts',
  /** The Twitch OAuth profile behind an account, and the relay's token store. */
  TwitchProfiles = 'twitch_profiles',
  /** One row per human account — the identity every character hangs off. */
  Users = 'users',
  /** The encyclopedia's current page state — one row per article. */
  Wiki = 'wiki',
  /**
   * The append-only wiki edit log, in its own collection so a page read never
   * drags its history.
   */
  WikiRevisions = 'wiki_revisions',
  /** The world-clock singleton — one row, the current in-world time. */
  WorldState = 'world_state',
}
