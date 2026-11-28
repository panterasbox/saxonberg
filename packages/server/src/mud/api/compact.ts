/**
 * CompactApi — the single facade for the **Compact**, the real
 * meta-institution (never a fiction concept; the diegetic governments
 * live on `GovernmentApi`). New meta-institutional surface lands HERE —
 * membership, franchise, and their kin as they build — instead of
 * minting per-feature Apis.
 *
 * Two faces today: the **office face** (the Compact's seats — absorbed
 * from the retired `OfficeApi`; durable state on `/platform/idea/OfficeRegistry`,
 * the founder default, the narrow-entry assign/vacate) and the
 * **committee** reads. A committee is *the group
 * holding parcel title over a subdivision* — a relationship derived on
 * read from `ParcelApi.ownerOf`, never a stored kind: all committees
 * are groups structurally, not all groups are committees, and a
 * player-held subdivision has none. Membership management is the
 * existing `group` verb suite (a committee IS a managed Group);
 * authority is exactly title (the access substrate, unchanged).
 * Committee chat channels ride the existing Subject binding
 * (`ChatApi.createBoundChannel`) — the audience walk resolves through
 * `GroupApi.membersOf` like any channel.
 *
 * Thin forwarding shell: the logic lives in the hot-reloadable
 * {@link CompactLogic} singleton at `/platform/idea/api/compact`.
 * `dest /platform/idea/api/compact` reloads it.
 */

import type { Stuff } from "../lib/stuff/Stuff";
import type { GroupRef } from "../lib/social/GroupProvider";
import type {
  OfficeHolderResult,
  OfficeRosterRow,
  OfficeAssignResult,
} from "../lib/governance/Office";
import { StuffApi } from "./stuff";
import { ExecutionContextApi } from "./execution-context";
import { HotReloadApi } from "./hot-reload";
import { CallSecurity, TestOnly } from "../lib/security/decorators";
import { SecurityPolicies } from "../lib/security/SecurityPolicies";
import { CompactLogic } from "../platform/idea/api/CompactLogic";
import { fileURLToPath } from "url";
import { SecurityApi } from "./security";
import { AccessApi } from "./access";
import type { Refusal } from "../lib/errors";
import type { NameAnswer } from "./grammar";

export type { OfficeHolderResult, OfficeRosterRow, OfficeAssignResult };

/**
 * A committee resolved from title: the administering body. A **group**
 * holder is the committee (all group committees are groups,
 * structurally); an **organization** holder (wave 3, D2) resolves to the
 * organization itself — its staff and appointing authority are the
 * members, and its channel is its own concern (none through this face).
 */
export type CommitteeView =
  | {
      kind: "group";
      /** The managed group's name (or its ref id when unnamed). */
      name: string;
      /** The committee group's ref — the chat/audience join. */
      groupRef: GroupRef;
      /** The covering parcel's extent (`''` for the state default). */
      subdivisionPath: string;
    }
  | {
      kind: "organization";
      /** The organization's label (its presentation, else its path). */
      name: string;
      /** The organization's templatePath. */
      templatePath: string;
      subdivisionPath: string;
    };

/**
 * An account's Compact character (front-page-sources D1): the one
 * character the account takes part in the Compact through.
 */
export interface CompactCharacterView {
  playerId: string;
  /** The character's name — its body's while here, else its record's. */
  name: string;
}

/**
 * The public face of an account (D11): its Compact character's name and
 * the Compact seat that character holds, if any.
 */
export interface CompactPublicFace {
  name: string;
  /** The display name of the first Compact office it holds, if any. */
  seat?: string;
  /** True while that seat rests on the founder default. */
  acting?: boolean;
}

/** A committee's chat channel, by well-known name. */
export interface CommitteeChannelView {
  name: string;
}

const LOGIC_PATH = "/platform/idea/api/compact";
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL("../platform/idea/api/CompactLogic", import.meta.url)
);

/** Resolve the HMR-able CompactLogic singleton (sync). */
function logic(): CompactLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        "CompactLogic"
      ) as typeof CompactLogic | null) ?? CompactLogic)()
  );
}

/**
 * The head of the executive. The one seat that answers
 * {@link CompactApi.readWorldAs} today — named once, here, so the
 * executive's rule is a line in this file rather than a string in the
 * query engine.
 */
const PRIME_MINISTER = "prime-minister";

export class CompactApi {
  // ───────────────── the office face (the Compact's seats) ─────────────────
  // Absorbed from the retired OfficeApi: the government-office substrate's
  // caller surface. Public reads are ungated (governance is transparent by
  // constitutional design, Art. VII); the two mutations keep their
  // narrow-entry gates (`OfficeAssignController`,
  // `OfficeVacateController`). Subject-taking predicates accept
  // `Stuff | null` and fail closed; the appointer is never a parameter
  // (the `requiresFoundingAuthority` validator derives it from context).

  /**
   * Who holds an office — the explicit handed-off holder if one is
   * stored, else the founder default, held by the founder account's
   * Compact character (`holderPlayerId`, null while it has none). Public
   * read.
   */
  public static async officeHolderOf(
    officeKey: string
  ): Promise<OfficeHolderResult> {
    return logic().officeHolderOf(officeKey);
  }

  /**
   * Does `subject` (an Avatar) hold `officeKey`? Explicit-holder match,
   * OR (no explicit holder AND the subject is the founder account's
   * Compact character — the founder's other characters hold no default
   * seat). Public read; non-Avatar / null subjects fail closed.
   */
  public static async holdsOffice(
    subject: Stuff | null,
    officeKey: string
  ): Promise<boolean> {
    return logic().holdsOffice(subject, officeKey);
  }

  /**
   * ⭐⭐ **May `subject` read the whole world at once — and if so, do
   * it.** The single seam through which a person's query is allowed to
   * walk the registry.
   *
   * Asking and granting are ONE act on purpose. A grant primitive that
   * could be planted without the question is a permission anybody in
   * the engine could hand themselves; here the environment can only
   * carry the grant on the far side of a real authority answering about
   * a real person.
   *
   * **The executive decides.** Today that is its head — the Prime
   * Minister's seat, derived on every call so authority follows a
   * handoff in both directions with no restart. When the executive
   * wants to carve this up further — a standing group, a per-shape
   * allowance, a delegate who may scan but not act — it is carved up
   * *here*, and nothing else in the engine moves: the resolver reads
   * only {@link ExecutionContextApi.getWorldReadGrant}.
   *
   * Returns `null` when the subject is not entitled — the caller then
   * lets the ordinary refusal stand.
   */
  public static async readWorldAs<T>(
    subject: Stuff | null,
    fn: () => T
  ): Promise<T | null> {
    // who is acting must be who is named (call-security pass D5)
    AccessApi.requireActor(subject);
    if (!(await CompactApi.holdsOffice(subject, PRIME_MINISTER))) return null;
    return ExecutionContextApi.run(
      CompactApi,
      CompactApi,
      "compact.readWorld",
      { metadata: { worldRead: `office:${PRIME_MINISTER}` } },
      fn
    );
  }

  /**
   * Every office `subject` holds — the founder's full set when no
   * handoffs exist, a single seat for a handed-off holder, none for
   * anyone else. Public read.
   */
  public static async officesOf(subject: Stuff | null): Promise<string[]> {
    return logic().officesOf(subject);
  }

  /**
   * Is `subject` the founder? Resolves the Avatar → its `User` → the
   * configured `FOUNDER_GOOGLE_EMAIL`/`FOUNDER_TWITCH_HANDLE`
   * credential. False until the founder has logged in. Public read.
   * ⭐ True for EVERY character of the founder's account: founding
   * authority (handing a seat off) is the account's, not a seat's (D8).
   */
  public static async isFounder(subject: Stuff | null): Promise<boolean> {
    return logic().isFounder(subject);
  }

  /**
   * The public transparency roster — every office with its branch,
   * origin, and current holder (explicit playerId or the founder
   * default). Publicly readable (Art. VII).
   */
  public static async officeRoster(): Promise<OfficeRosterRow[]> {
    return logic().officeRoster();
  }

  /**
   * ⭐ The public face of the account behind `playerId` (D11): its Compact
   * character's name, and the first Compact seat that character holds —
   * `acting` while the seat rests on the founder default (no hand-off
   * recorded). `null` when the account has no character. The show's host
   * line reads this; nothing in it can carry an email or a handle.
   */
  public static async publicFaceOf(
    playerId: string
  ): Promise<CompactPublicFace | null> {
    return logic().publicFaceOf(playerId);
  }

  /**
   * Narrow-entry mutation: set the explicit holder of an office
   * (replacing any prior — auditable). Refuses a character that is not
   * its account's Compact character (`office-needs-compact-character`). Gated to the
   * `OfficeAssignController` (the `office assign` verb) via the string-keyed `FromModule` policy;
   * the *authority* is the `requiresFoundingAuthority` subcommand
   * validator's job. Structurally the single entry to the handoff write.
   */
  @CallSecurity(
    SecurityPolicies.FromModule("/platform/idea/cmd/governance/OfficeAssignController")
  )
  public static async assignOffice(
    playerId: string,
    officeKey: string
  ): Promise<OfficeAssignResult> {
    return logic().assignOffice(playerId, officeKey);
  }

  /**
   * TEST-ONLY: seat `playerId` in `officeKey` — the same write
   * `assignOffice` makes, for the wire harness's `offices:` login option
   * (wizard-axis D13). It exists because `office assign` binds its target
   * through the `online` scope, which cannot resolve a second session yet
   * (governance.md § Open); the harness still TRIES the verb in a drive.
   */
  @TestOnly(
    "Seat a player with `office assign <player> <office>` as the founding authority."
  )
  public static async assignOfficeForTest(
    playerId: string,
    officeKey: string
  ): Promise<OfficeAssignResult> {
    return logic().assignOffice(playerId, officeKey);
  }

  /**
   * Narrow-entry mutation: clear an office's explicit holder (the seat
   * reverts to the founder default). Office-only — a singular seat has
   * no empty state. Gated to the `OfficeVacateController` (the `office
   * vacate` verb), as `assignOffice` is to its own.
   */
  @CallSecurity(
    SecurityPolicies.FromModule("/platform/idea/cmd/governance/OfficeVacateController")
  )
  public static async vacateOffice(officeKey: string): Promise<boolean> {
    return logic().vacateOffice(officeKey);
  }

  /**
   * TEST-ONLY: clear an office's explicit holder — the same write
   * `vacateOffice` makes (the seat reverts to the founder default), for the
   * wire purge (test-world-lifecycle D4), which returns the seats a run's
   * characters were given with `offices:`. The mirror of
   * {@link assignOfficeForTest}.
   */
  @TestOnly("Vacate a seat with `office vacate <office>` as the founding authority.")
  public static async vacateOfficeForTest(officeKey: string): Promise<boolean> {
    return logic().vacateOffice(officeKey);
  }

  /**
   * HMR seam: drop the cached OfficeRegistry pointer so the next call
   * re-resolves. Registry state itself is unaffected.
   * @internal
   */
  public static _resetOfficeRegistryRefForReload(): void {
    logic()._resetOfficeRegistryRefForReload();
  }

  // ──────────────────── the Compact character (D1–D6) ────────────────────
  // Every account takes part in the Compact through ONE character: it
  // shows the account's labor and capital standing, casts the account's
  // vote, and alone may hold a Compact office. The first character by
  // default; `compact character` chooses another.

  /**
   * The Compact character of `subject`'s account — `subject` being a body
   * or a pre-world `Login`. `null` for a guest, an NPC, or an account with
   * no character. Public read: the Compact character is the account's
   * public face.
   */
  public static async compactCharacterOf(
    subject: Stuff | null
  ): Promise<CompactCharacterView | null> {
    return logic().compactCharacterOf(subject);
  }

  /**
   * Is `subject` (a body) its account's Compact character? The question a
   * ballot verb asks before it casts the account's vote (D5). Fails closed.
   */
  public static async isCompactCharacter(
    subject: Stuff | null
  ): Promise<boolean> {
    return logic().isCompactCharacter(subject);
  }

  /**
   * Which of `subject`'s account's own characters the player's words name
   * — by name or by id, through the one naming rule — for the
   * `compact character` verb to bind. `null` for a session with no
   * account behind it.
   */
  public static async ownCharacterNamed(
    subject: Stuff,
    words: string
  ): Promise<NameAnswer<string> | null> {
    return logic().ownCharacterNamed(subject, words);
  }

  /**
   * Narrow-entry mutation: make `playerId` the Compact character of the
   * acting account. Refuses a guest (`compact-no-account`), a character
   * not on the account (`compact-not-yours`), no change
   * (`compact-unchanged`), and — the lock — a current Compact character
   * that holds a handed-off Compact seat (`compact-seated`) or an open vote
   * (`compact-vote-open`). Gated to the `compact character` verb's
   * controller.
   */
  @CallSecurity(
    SecurityPolicies.FromModule(
      "/platform/idea/cmd/governance/CompactCharacterController"
    )
  )
  public static async designateCompactCharacter(
    subject: Stuff,
    playerId: string
  ): Promise<CompactCharacterView | Refusal> {
    AccessApi.requireActor(subject);
    return logic().designateCompactCharacter(subject, playerId);
  }

  // ─────────────────────── the committee reads ───────────────────────

  /**
   * The committee over `path` — the group holding title (the state
   * default `core` included), or `null` for a player-held subdivision.
   * Derived on read; never throws.
   */
  public static async committeeOf(path: string): Promise<CommitteeView | null> {
    return logic().committeeOf(path);
  }

  /**
   * Whether `player` sits on the committee over `path` — a member of the
   * title-holding group, or (an organization-held extent) on its chart.
   * ⛔ Nobody sits on every committee — not the founder, not the Prime
   * Minister (wizard-axis D18).
   */
  public static async isCommitteeMember(
    player: Stuff,
    path: string
  ): Promise<boolean> {
    return logic().isCommitteeMember(player, path);
  }

  /** The committee's materialized members (the grouping online filter). */
  public static async committeeMembersOf(path: string): Promise<Stuff[]> {
    return logic().committeeMembersOf(path);
  }

  /** The committee's chat channel, or `null` when none is minted yet. */
  public static async committeeChannelOf(
    path: string
  ): Promise<CommitteeChannelView | null> {
    return logic().committeeChannelOf(path);
  }

  /**
   * Ensure the committee's channel exists (idempotent): resolve by its
   * well-known name, else mint a persistent channel whose Subject binds
   * the committee group's ref (the promotion-path shape — the committee
   * group pre-exists; chat owns nothing new). The mint's actor derives
   * from execution context; with no acting command this only resolves.
   */
  public static async ensureCommitteeChannel(
    path: string
  ): Promise<CommitteeChannelView | null> {
    return logic().ensureCommitteeChannel(path);
  }
}

SecurityApi.decorateApiClass(CompactApi);
