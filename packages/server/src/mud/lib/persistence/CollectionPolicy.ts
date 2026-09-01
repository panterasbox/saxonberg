/*
 * ⚠ GENERATED FILE — DO NOT EDIT.
 *
 * Emitted by `pnpm gen:schema` from the authored schema docs in
 * `packages/server/src/schema/`. Edit the YAML doc for the collection
 * you mean, then re-run the generator; `pnpm lint:schema` fails if this
 * file and the docs disagree.
 */

/**
 * CollectionPolicy — what a sandboxed write does to each collection.
 *
 * The one concept this module defines: the **total** per-collection
 * sandbox write disposition. Totality is the design —
 * `Record<Collections, …>` makes a new collection without a policy a
 * COMPILE error, so the sandbox fails closed at build time rather than at
 * an audit.
 *
 * It lives in the mudlib beside {@link Collections} for the same reason
 * that enum does: it is vocabulary, not mechanism. `backend/
 * PersistenceManager` imports and re-exports it, so the driver side keeps
 * one import site for the surface it speaks.
 *
 * ⚠ The REASON a collection carries the verb it does is in that
 * collection's schema doc, under `invariants`. This table is the
 * machine-readable half; the argument is the authored half, and putting
 * them in one place is what this build was for. Verified writer-by-writer
 * in docs/subsystems/sandbox.md.
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
 * The total table. One row per collection, from its schema doc's
 * `sandbox:` field.
 */
export const COLLECTION_POLICIES: Readonly<
  Record<Collections, CollectionPolicy>
> = {
  [Collections.AccountabilityEvents]: { verb: 'pass', mark: true },
  [Collections.AppSettings]: { verb: 'refuse' },
  [Collections.AuthoringEvents]: { verb: 'pass', mark: true },
  [Collections.BankAccounts]: { verb: 'shadow', mode: 'skip' },
  [Collections.BankLedger]: { verb: 'stamp' },
  [Collections.BankSupply]: { verb: 'shadow', mode: 'skip' },
  [Collections.Beliefs]: { verb: 'pass', mark: true },
  [Collections.Blueprints]: { verb: 'refuse' },
  [Collections.Channels]: { verb: 'refuse' },
  [Collections.Chattel]: { verb: 'refuse' },
  [Collections.ChattelEvents]: { verb: 'refuse' },
  [Collections.Chronicles]: { verb: 'pass', mark: true },
  [Collections.Content]: { verb: 'pass' },
  [Collections.ContractEvents]: { verb: 'refuse' },
  [Collections.Contracts]: { verb: 'refuse' },
  [Collections.DescriptorBanks]: { verb: 'refuse' },
  [Collections.Diagnostics]: { verb: 'pass', mark: true },
  [Collections.DispositionEvents]: { verb: 'stamp' },
  [Collections.Documents]: { verb: 'pass' },
  [Collections.ForumBoards]: { verb: 'refuse' },
  [Collections.ForumEntries]: { verb: 'refuse' },
  [Collections.ForumEvents]: { verb: 'refuse' },
  [Collections.ForumSubjects]: { verb: 'refuse' },
  [Collections.ForumVotes]: { verb: 'refuse' },
  [Collections.GoogleProfiles]: { verb: 'refuse' },
  [Collections.Groups]: { verb: 'refuse' },
  [Collections.HolderSnapshots]: { verb: 'pass' },
  [Collections.KickProfiles]: { verb: 'refuse' },
  [Collections.MediaAssets]: { verb: 'refuse' },
  [Collections.OfficeHolders]: { verb: 'refuse' },
  [Collections.PackInstalls]: { verb: 'refuse' },
  [Collections.ParcelEvents]: { verb: 'refuse' },
  [Collections.Parcels]: { verb: 'refuse' },
  [Collections.Participation]: { verb: 'shadow', mode: 'skip' },
  [Collections.ParticipationEvents]: { verb: 'stamp' },
  [Collections.Parties]: { verb: 'refuse' },
  [Collections.PlayerFrames]: { verb: 'pass', mark: true },
  [Collections.Positions]: { verb: 'refuse' },
  [Collections.Producer]: { verb: 'shadow', mode: 'skip' },
  [Collections.ProducerEvents]: { verb: 'refuse' },
  [Collections.Renown]: { verb: 'shadow', mode: 'skip' },
  [Collections.RenownEvents]: { verb: 'stamp' },
  [Collections.Transcripts]: { verb: 'stamp' },
  [Collections.TwitchProfiles]: { verb: 'refuse' },
  [Collections.Users]: { verb: 'refuse' },
  [Collections.Wiki]: { verb: 'pass' },
  [Collections.WikiRevisions]: { verb: 'pass' },
  [Collections.WorldState]: { verb: 'refuse' },
};
