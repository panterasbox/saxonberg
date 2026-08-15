/**
 * ResetPolicy — what survives the night.
 *
 * The one concept this module defines: a **total** disposition for every
 * collection the world persists into, consulted by the nightly reset
 * job. Totality is the whole design: `Record<Collections, …>` makes a
 * new collection without a decision a COMPILE error, exactly as
 * `COLLECTION_POLICIES` does for the sandbox. A destructive job whose
 * coverage is a hand-maintained list is a job that quietly stops
 * covering things.
 *
 * ## ⚠⚠ The survivors list is short on purpose
 *
 * Decided by the user, 2026-08-14: the reset removes all **player
 * state** except `documents` rows with `kind: 'release'` — the press
 * releases the front door's press room displays. Accounts included.
 *
 * That list is sharp *because* it is short: `RELEASE_DOCUMENT_KIND`
 * already exists as a discriminator, so the survivor predicate is one
 * equality rather than a policy table.
 *
 * ## ⚠ Seeded world content is not player state
 *
 * The seeder and the content-pack installer are **insert-only and run
 * at boot**. The job does not restart the process, so anything they
 * populate is `keep`: wiping it would empty the world until somebody
 * rebooted, and *a wipe that empties the world is a wipe that broke the
 * game*. This is the one place "wipe everything", read literally, is
 * wrong — which is why every `keep` here states its reason at the site
 * rather than in a doc somewhere else.
 *
 * ⚠ The knowing cost: CMS-authored templates live in `domain` beside
 * the seeds and therefore survive too. There is no discriminator that
 * separates them (`sourcePack` marks pack rows, not authored ones), and
 * the alternative — an empty world every morning — is worse. Recorded
 * so it is a decision rather than a surprise.
 */

import { Collections } from './Collections';
import { RELEASE_DOCUMENT_KIND } from '../press/Release';

/**
 * What the reset does to one collection.
 *
 * `because` is required on anything that is not a plain wipe. A
 * survivor without a stated reason is how a survivors list grows.
 */
export type ResetDisposition =
  | { readonly verb: 'wipe' }
  | { readonly verb: 'keep'; readonly because: string }
  | {
      readonly verb: 'wipe-except';
      /** The rows that survive, as a Mongo equality filter. */
      readonly keep: Readonly<Record<string, unknown>>;
      readonly because: string;
    };

/**
 * The total table. Every collection, every night.
 */
export const RESET_DISPOSITIONS: Readonly<
  Record<Collections, ResetDisposition>
> = {
  // ── The one survivor ──
  [Collections.Documents]: {
    verb: 'wipe-except',
    keep: { kind: RELEASE_DOCUMENT_KIND },
    because:
      'published press releases — the front door reads them without an ' +
      'account, and the gazette design requires bulletins to outlive the ' +
      'night they were published',
  },

  // ── Seeded / pack-installed world content: keep, or the world empties ──
  [Collections.Domain]: {
    verb: 'keep',
    because: 'the world itself; the seeder is insert-only and runs at boot',
  },
  [Collections.Emotes]: {
    verb: 'keep',
    because: 'seeded soul vocabulary — reference data, not player state',
  },
  [Collections.NameBanks]: {
    verb: 'keep',
    because: 'pack-installed char-gen name pools',
  },
  [Collections.DescriptorBanks]: {
    verb: 'keep',
    because: 'pack-installed unidentified-appearance pools',
  },
  [Collections.Recipes]: {
    verb: 'keep',
    because: 'crafting reference data; never cloned, never player-written',
  },
  [Collections.MediaAssets]: {
    verb: 'keep',
    because:
      'generated illustration provenance — written by an offline CLI, not ' +
      'reachable from play, and expensive to regenerate',
  },
  [Collections.AppSettings]: {
    verb: 'keep',
    because:
      '⚠⚠ the job reads its own arming and its own reset POLICY from here; ' +
      'wiping it would disarm the job and silently retract the front ' +
      "door's notice on the first run",
  },
  [Collections.WorldState]: {
    verb: 'keep',
    because:
      'the world clock. Time is not player state, and a calendar that ' +
      'restarts at zero every morning makes every in-world date a lie',
  },

  // ── Identity ──
  [Collections.Users]: { verb: 'wipe' },
  [Collections.GoogleProfiles]: { verb: 'wipe' },
  [Collections.TwitchProfiles]: { verb: 'wipe' },
  [Collections.KickProfiles]: { verb: 'wipe' },

  // ── The self-persistence spine + the record layer ──
  [Collections.HolderSnapshots]: { verb: 'wipe' },
  [Collections.PlayerFrames]: { verb: 'wipe' },

  // ── Standing and evidence ledgers ──
  [Collections.Transcripts]: { verb: 'wipe' },
  [Collections.DispositionEvents]: { verb: 'wipe' },
  [Collections.RenownEvents]: { verb: 'wipe' },
  [Collections.Renown]: { verb: 'wipe' },
  [Collections.ParticipationEvents]: { verb: 'wipe' },
  [Collections.Participation]: { verb: 'wipe' },
  [Collections.ProducerEvents]: { verb: 'wipe' },
  [Collections.Producer]: { verb: 'wipe' },
  [Collections.AuthoringEvents]: { verb: 'wipe' },
  [Collections.Positions]: { verb: 'wipe' },
  [Collections.Chronicles]: { verb: 'wipe' },
  [Collections.Beliefs]: { verb: 'wipe' },
  [Collections.AccountabilityEvents]: { verb: 'wipe' },

  // ── Money, title, and the contracts over them ──
  [Collections.BankLedger]: { verb: 'wipe' },
  [Collections.BankAccounts]: { verb: 'wipe' },
  [Collections.BankSupply]: { verb: 'wipe' },
  [Collections.Parcels]: { verb: 'wipe' },
  [Collections.ParcelEvents]: { verb: 'wipe' },
  [Collections.Chattel]: { verb: 'wipe' },
  [Collections.ChattelEvents]: { verb: 'wipe' },
  [Collections.Contracts]: { verb: 'wipe' },
  [Collections.ContractEvents]: { verb: 'wipe' },

  // ── Social structures ──
  // ⚠ `groups` carries the SYSTEM groups (`core`, `wizards`,
  // `archwizards`, `streamers`) alongside player ones. They are minted
  // in CODE by `AccessRegistry.postRegister`, not by a seed file, and
  // that seeding is idempotent — so the job re-runs it immediately
  // after the wipe. Founder access is part of the phase, not an
  // operator's memory.
  [Collections.Groups]: { verb: 'wipe' },
  [Collections.Channels]: { verb: 'wipe' },
  [Collections.Parties]: { verb: 'wipe' },
  [Collections.OfficeHolders]: { verb: 'wipe' },

  // ── Authored player content ──
  [Collections.Wiki]: { verb: 'wipe' },
  [Collections.WikiRevisions]: { verb: 'wipe' },
  [Collections.ForumSubjects]: { verb: 'wipe' },
  [Collections.ForumBoards]: { verb: 'wipe' },
  [Collections.ForumEntries]: { verb: 'wipe' },
  [Collections.ForumVotes]: { verb: 'wipe' },
  [Collections.ForumEvents]: { verb: 'wipe' },
  [Collections.Blueprints]: { verb: 'wipe' },

  // ── Operational ──
  [Collections.Diagnostics]: { verb: 'wipe' },
};
