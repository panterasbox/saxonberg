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
  Domain = 'domain',
  Emotes = 'emotes',
  NameBanks = 'name_banks',
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
  Bulletins = 'bulletins',
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
}

