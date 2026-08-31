/*
 * ⚠ GENERATED FILE — DO NOT EDIT.
 *
 * Emitted by `pnpm gen:schema` from the authored schema docs in
 * `packages/server/src/schema/`. Edit the YAML doc for the collection
 * you mean, then re-run the generator; `pnpm lint:schema` fails if this
 * file and the docs disagree.
 */

/**
 * ResetPolicy — what survives the night.
 *
 * The one concept this module defines: a **total** disposition for every
 * collection the world persists into, consulted by the nightly reset job.
 * Totality is the whole design: `Record<Collections, …>` makes a new
 * collection without a decision a COMPILE error, exactly as
 * `COLLECTION_POLICIES` does for the sandbox. A destructive job whose
 * coverage is a hand-maintained list is a job that quietly stops covering
 * things.
 *
 * ## ⚠⚠ The survivors list is short on purpose
 *
 * Decided by the user, 2026-08-14: the reset removes all **player state**
 * except `documents` rows carrying a declared kind — the press releases
 * the front door's press room displays, and the pack-installed world
 * content beside them. Accounts included.
 *
 * ## ⚠ Seeded world content is not player state
 *
 * The seeder and the content-pack installer are **insert-only and run at
 * boot**. The job does not restart the process, so anything they populate
 * is `keep`: wiping it would empty the world until somebody rebooted, and
 * *a wipe that empties the world is a wipe that broke the game*. This is
 * the one place "wipe everything", read literally, is wrong — which is
 * why every `keep` states its reason, now in its collection's schema doc
 * and repeated here as the `because` the job itself carries.
 *
 * ⚠ The knowing cost: CMS-authored templates live in `content` beside
 * the seeds and therefore survive too. There is no discriminator that
 * separates them (`sourcePack` marks pack rows, not authored ones), and
 * the alternative — an empty world every morning — is worse. Recorded so
 * it is a decision rather than a surprise.
 */

import { Collections } from './Collections';
import { RELEASE_DOCUMENT_KIND } from '../press/Release';
import { DECLARED_DOCUMENT_KINDS } from '../document/DocumentKinds';

/**
 * What the reset does to one collection.
 *
 * `because` is required on anything that is not a plain wipe. A survivor
 * without a stated reason is how a survivors list grows.
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
 * The total table. Every collection, every night — from each schema doc's
 * `reset:` field.
 */
export const RESET_DISPOSITIONS: Readonly<
  Record<Collections, ResetDisposition>
> = {
  [Collections.AccountabilityEvents]: { verb: 'wipe' },
  [Collections.AppSettings]: {
    verb: 'keep',
    because:
      '⚠⚠ the job reads its own arming and its own reset POLICY from ' +
      'here; wiping it would disarm the job and silently retract the ' +
      'front door\'s notice on the first run',
  },
  [Collections.AuthoringEvents]: { verb: 'wipe' },
  [Collections.BankAccounts]: { verb: 'wipe' },
  [Collections.BankLedger]: { verb: 'wipe' },
  [Collections.BankSupply]: { verb: 'wipe' },
  [Collections.Beliefs]: { verb: 'wipe' },
  [Collections.Blueprints]: { verb: 'wipe' },
  [Collections.Channels]: { verb: 'wipe' },
  [Collections.Chattel]: { verb: 'wipe' },
  [Collections.ChattelEvents]: { verb: 'wipe' },
  [Collections.Chronicles]: { verb: 'wipe' },
  [Collections.Content]: {
    verb: 'keep',
    because: 'the world itself; the seeder is insert-only and runs at boot',
  },
  [Collections.ContractEvents]: { verb: 'wipe' },
  [Collections.Contracts]: { verb: 'wipe' },
  [Collections.DescriptorBanks]: {
    verb: 'keep',
    because: 'pack-installed unidentified-appearance pools',
  },
  [Collections.Diagnostics]: { verb: 'wipe' },
  [Collections.DispositionEvents]: { verb: 'wipe' },
  [Collections.Documents]: {
    verb: 'wipe-except',
    keep: {
      kind: { $in: [RELEASE_DOCUMENT_KIND, ...DECLARED_DOCUMENT_KINDS] },
    },
    because:
      'published press releases — the front door reads them without an ' +
      'account, and the gazette design requires bulletins to outlive the ' +
      'night they were published; and every DECLARED document kind ' +
      '(emotes, recipes, name banks, blueprints, msh scripts, command ' +
      'views) — pack-installed world content (the expression / ' +
      'generic-objects / species-and-names / platform / saxonberg-lounge ' +
      'packs), reference data not player state; wiping it would empty the ' +
      'soul vocabulary at 04:00 until a reboot re-installed it',
  },
  [Collections.ForumBoards]: { verb: 'wipe' },
  [Collections.ForumEntries]: { verb: 'wipe' },
  [Collections.ForumEvents]: { verb: 'wipe' },
  [Collections.ForumSubjects]: { verb: 'wipe' },
  [Collections.ForumVotes]: { verb: 'wipe' },
  [Collections.GoogleProfiles]: { verb: 'wipe' },
  [Collections.Groups]: { verb: 'wipe' },
  [Collections.HolderSnapshots]: { verb: 'wipe' },
  [Collections.KickProfiles]: { verb: 'wipe' },
  [Collections.MediaAssets]: {
    verb: 'keep',
    because:
      'generated illustration provenance — written by an offline CLI, not ' +
      'reachable from play, and expensive to regenerate',
  },
  [Collections.OfficeHolders]: { verb: 'wipe' },
  [Collections.PackInstalls]: {
    verb: 'keep',
    because:
      'the pack installer’s ledger — the baselines the next boot’s ' +
      'three-way reconcile compares against; wiping it would re-run the ' +
      'one-time adoption and silently overwrite operator divergence',
  },
  [Collections.ParcelEvents]: { verb: 'wipe' },
  [Collections.Parcels]: { verb: 'wipe' },
  [Collections.Participation]: { verb: 'wipe' },
  [Collections.ParticipationEvents]: { verb: 'wipe' },
  [Collections.Parties]: { verb: 'wipe' },
  [Collections.PlayerFrames]: { verb: 'wipe' },
  [Collections.Positions]: { verb: 'wipe' },
  [Collections.Producer]: { verb: 'wipe' },
  [Collections.ProducerEvents]: { verb: 'wipe' },
  [Collections.Renown]: { verb: 'wipe' },
  [Collections.RenownEvents]: { verb: 'wipe' },
  [Collections.Transcripts]: { verb: 'wipe' },
  [Collections.TwitchProfiles]: { verb: 'wipe' },
  [Collections.Users]: { verb: 'wipe' },
  [Collections.Wiki]: { verb: 'wipe' },
  [Collections.WikiRevisions]: { verb: 'wipe' },
  [Collections.WorldState]: {
    verb: 'keep',
    because:
      'the world clock. Time is not player state, and a calendar that ' +
      'restarts at zero every morning makes every in-world date a lie',
  },
};
