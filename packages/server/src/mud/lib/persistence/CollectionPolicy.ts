/**
 * CollectionPolicy — what a sandboxed write does to each collection.
 *
 * The one concept this module defines: the **total** per-collection
 * sandbox write disposition. Totality is the design —
 * `Record<Collections, …>` makes a new collection without a policy a
 * COMPILE error, so the sandbox fails closed at build time rather than
 * at an audit.
 *
 * It lives in the mudlib beside {@link Collections} for the same reason
 * that enum does: it is vocabulary, not mechanism. `backend/
 * PersistenceManager` imports and re-exports it, so the driver side
 * keeps one import site for the surface it speaks.
 *
 * ⚠ Verified writer-by-writer in docs/subsystems/sandbox.md; the two are
 * kept in sync by review, not by a gate.
 */

import { Collections } from './Collections';

/**
 * Per-collection sandbox write disposition (docs/subsystems/sandbox.md):
 *
 *   - `stamp`  — the write proceeds with `circleScope` stamped on the row;
 *     field reads exclude stamped rows; exit discards them. The material
 *     ledgers: the game genuinely runs in-circle, then reverts.
 *   - `refuse` — circle context may not write here at all (field-real
 *     registries, identity, title, config). Throws.
 *   - `pass`   — the write is identity-real and persists (authored truth,
 *     the epistemic ledgers). `mark: true` additionally records the scope
 *     on the row (the epistemic wire mark) without ever filtering reads.
 *   - `shadow` — rebuildable caches. `mode: 'skip'` silently skips the
 *     terminal write from circle context (readers derive live from their
 *     event ledgers in-circle). `mode: 'overlay'` is specified as the
 *     labeled attach point but not built — no collection needs it today.
 */
export type CollectionPolicy =
  | { verb: 'stamp' }
  | { verb: 'refuse' }
  | { verb: 'pass'; mark?: boolean }
  | { verb: 'shadow'; mode: 'skip' | 'overlay' };

/**
 * The total policy table — `Record<Collections, …>` makes totality a
 * COMPILE error: a new collection cannot ship without a policy row (fails
 * closed at build time, not at an audit). Verified writer-by-writer in
 * docs/subsystems/sandbox.md; keep the two in sync.
 */
export const COLLECTION_POLICIES: Readonly<
  Record<Collections, CollectionPolicy>
> = {
  // ── STAMP: the material gameplay ledgers — run in-circle, revert ──
  [Collections.BankLedger]: { verb: 'stamp' },
  [Collections.Transcripts]: { verb: 'stamp' },
  [Collections.RenownEvents]: { verb: 'stamp' },
  [Collections.ParticipationEvents]: { verb: 'stamp' },
  [Collections.DispositionEvents]: { verb: 'stamp' },
  // ── PASS(mark): the epistemic ledgers — persist, wire-marked ──
  [Collections.Chronicles]: { verb: 'pass', mark: true },
  [Collections.Beliefs]: { verb: 'pass', mark: true },
  [Collections.AuthoringEvents]: { verb: 'pass', mark: true },
  [Collections.AccountabilityEvents]: { verb: 'pass', mark: true },
  [Collections.Diagnostics]: { verb: 'pass', mark: true },
  // The frame store is *what happened to you* — the epistemic shape
  // exactly. A frame delivered inside a circle was genuinely delivered
  // and genuinely read; STAMP would revert your own scrollback out from
  // under you on exit, which is the one thing a record of what you were
  // told must never do. MARK records that it happened in-circle.
  [Collections.PlayerFrames]: { verb: 'pass', mark: true },
  // ── PASS(unmarked): authored truth + the mechanism's own stores ──
  [Collections.Content]: { verb: 'pass' },
  [Collections.Documents]: { verb: 'pass' },
  [Collections.HolderSnapshots]: { verb: 'pass' },
  // The wiki is **authored truth and a communications surface**, so it
  // joins `domain` here rather than failing closed. An article cannot
  // affect advancement, cannot mint anything, and cannot be spent — it
  // is people writing to each other. There is no conflict to contain.
  //
  // The wiki is also strictly LESS powerful than `domain`, which is
  // PASS: a circle session that may edit a room template has no
  // business being refused an encyclopedia edit about one.
  //
  // Neither of the other verbs fits. STAMP would be actively harmful —
  // a scoped page reverting on circle exit is a page an author watched
  // themselves write and then lose, and its scoped revision rows would
  // collide with the unique `{pageId, rev}` index. The epistemic MARK
  // is for "what happened to *you*"; an article is not a personal
  // record.
  //
  // Authorization is unaffected: `WikiRegistry`'s protection ladder
  // resolves through `AccessApi`, which is circle-independent, so a
  // circle grants no editing rights its occupant did not already have.
  [Collections.Wiki]: { verb: 'pass' },
  [Collections.WikiRevisions]: { verb: 'pass' },
  // ── SHADOW(skip): rebuildable caches — skip-and-rebuild ──
  [Collections.BankAccounts]: { verb: 'shadow', mode: 'skip' },
  [Collections.BankSupply]: { verb: 'shadow', mode: 'skip' },
  [Collections.Renown]: { verb: 'shadow', mode: 'skip' },
  [Collections.Participation]: { verb: 'shadow', mode: 'skip' },
  [Collections.Producer]: { verb: 'shadow', mode: 'skip' },
  // ── REFUSE: field-real registries, identity, title, config ──
  [Collections.Users]: { verb: 'refuse' },
  // The pack installer's per-deployment ledger is field-real system state
  // (what was installed, the baselines three-way reconciliation compares
  // against). A circle must never write it.
  [Collections.PackInstalls]: { verb: 'refuse' },
  [Collections.GoogleProfiles]: { verb: 'refuse' },
  [Collections.TwitchProfiles]: { verb: 'refuse' },
  [Collections.KickProfiles]: { verb: 'refuse' },
  // Descriptor banks are immutable authored reference data installed by
  // a content pack — the same posture as name banks. A sandboxed write
  // to them would change what every unidentified item in the world looks
  // like, which is a field-real registry mutation by any reading.
  [Collections.DescriptorBanks]: { verb: 'refuse' },
  [Collections.Groups]: { verb: 'refuse' },
  [Collections.Channels]: { verb: 'refuse' },
  [Collections.Parties]: { verb: 'refuse' },
  [Collections.ForumSubjects]: { verb: 'refuse' },
  [Collections.ForumBoards]: { verb: 'refuse' },
  [Collections.ForumEntries]: { verb: 'refuse' },
  [Collections.ForumVotes]: { verb: 'refuse' },
  [Collections.ForumEvents]: { verb: 'refuse' },
  [Collections.ProducerEvents]: { verb: 'refuse' },
  [Collections.Positions]: { verb: 'refuse' },
  [Collections.Parcels]: { verb: 'refuse' },
  [Collections.ParcelEvents]: { verb: 'refuse' },
  [Collections.Contracts]: { verb: 'refuse' },
  [Collections.ContractEvents]: { verb: 'refuse' },
  [Collections.Chattel]: { verb: 'refuse' },
  [Collections.ChattelEvents]: { verb: 'refuse' },
  [Collections.AppSettings]: { verb: 'refuse' },
  [Collections.WorldState]: { verb: 'refuse' },
  [Collections.OfficeHolders]: { verb: 'refuse' },
  // Audit-flipped from provisional PASS (2026-07-30): blueprint dedup
  // OVERWRITES an existing global catalogue row's identity fields on a
  // signature hit — field-visible mutation, so it fails closed. The CMS
  // publish path is unaffected (the acting avatar resolves to the parked
  // field body, whose scope is null). media_assets' only writer is the
  // offline illustrate CLI; no circle path should ever reach it.
  [Collections.Blueprints]: { verb: 'refuse' },
  [Collections.MediaAssets]: { verb: 'refuse' },
};

