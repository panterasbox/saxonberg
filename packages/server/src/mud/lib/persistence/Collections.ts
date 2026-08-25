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
 * driver side keeps one import site for the surface it speaks
 * (`COLLECTION_POLICIES` is a total `Record<Collections, …>`).
 *
 * Orientation list of what each collection holds: CLAUDE.md § MongoDB
 * Collections. The owning subsystem doc holds each one's schema, indexes
 * and write-path rules.
 */

export enum Collections {
  Users = 'users',
  GoogleProfiles = 'google_profiles',
  TwitchProfiles = 'twitch_profiles',
  KickProfiles = 'kick_profiles',
  /**
   * The templates collection (`Template.collectionName`). Named `domain`
   * before 2026-08 — the `/domain/` *template-path namespace* and the
   * `domain` *command category* are unrelated and unchanged (path
   * renames are wave 4 of the content-pack program). A pre-rename
   * deployment is migrated once at boot by
   * `PersistenceManager.#migrateDomainToContent`.
   */
  Content = 'content',
  /**
   * The pack installer's per-deployment ledger — one record per content
   * pack: version, baselines (the hash + canonical body of every row as
   * installed), pins, open conflicts, failure. Written only by
   * `PackLogic`. Deliberately its OWN collection so no contribution kind
   * can ever reach it — the `parcels`-not-in-`content` reasoning (slate
   * A17.1). See docs/subsystems/content-packs.md.
   */
  PackInstalls = 'pack_installs',
  Emotes = 'emotes',
  NameBanks = 'name_banks',
  /**
   * Descriptor banks — the pools an unidentified magic item draws its
   * appearance from, one per item class. Immutable reference data
   * installed by the `arcane-descriptors` content pack; the
   * `lint:descriptors` build check proves them disjoint from the
   * materials vocabulary. See magic-items D32.
   */
  DescriptorBanks = 'descriptor_banks',
  Groups = 'groups',
  Channels = 'channels',
  Parties = 'parties',
  Beliefs = 'beliefs',
  Chronicles = 'chronicles',
  Transcripts = 'transcripts',
  DispositionEvents = 'disposition_events',
  ForumSubjects = 'forum_subjects',
  ForumBoards = 'forum_boards',
  ForumEntries = 'forum_entries',
  ForumVotes = 'forum_votes',
  ForumEvents = 'forum_events',
  RenownEvents = 'renown_events',
  Renown = 'renown',
  ParticipationEvents = 'participation_events',
  Participation = 'participation',
  ProducerEvents = 'producer_events',
  Producer = 'producer',
  AuthoringEvents = 'authoring_events',
  Positions = 'positions',
  Recipes = 'recipes',
  Blueprints = 'blueprints',
  Documents = 'documents',
  BankLedger = 'bank_ledger',
  BankAccounts = 'bank_accounts',
  BankSupply = 'bank_supply',
  Parcels = 'parcels',
  ParcelEvents = 'parcel_events',
  Diagnostics = 'diagnostics',
  HolderSnapshots = 'holder_snapshots',
  AccountabilityEvents = 'accountability_events',
  Contracts = 'contracts',
  ContractEvents = 'contract_events',
  Chattel = 'chattel',
  ChattelEvents = 'chattel_events',
  AppSettings = 'app_settings',
  WorldState = 'world_state',
  MediaAssets = 'media_assets',
  OfficeHolders = 'office_holders',
  Wiki = 'wiki',
  WikiRevisions = 'wiki_revisions',
  /**
   * The record layer's per-player frame store — a bounded rolling
   * window of the frames each player was actually delivered.
   *
   * ⚠ Deliberately **not** an archive: a frame's value decays fast and
   * its volume does not, so retention is a frame COUNT with oldest-first
   * eviction rather than the mailbox model clips get. See
   * docs/subsystems/record-layer.md.
   */
  PlayerFrames = 'player_frames',
}

