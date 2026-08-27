/**
 * CompactApi — the single facade for the **Compact**, the real
 * meta-institution (never a fiction concept; the diegetic governments
 * live on `GovernmentApi`). New meta-institutional surface lands HERE —
 * membership, franchise, and their kin as they build — instead of
 * minting per-feature Apis.
 *
 * Two faces today: the **office face** (the Compact's seats — absorbed
 * from the retired `OfficeApi`; durable state on `/obj/OfficeRegistry`,
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
 * {@link CompactLogic} singleton at `/obj/api/compact`.
 * `dest /obj/api/compact` reloads it.
 */

import type { Stuff } from "../lib/stuff/Stuff";
import type { GroupRef } from "../lib/social/GroupProvider";
import type {
  OfficeHolderResult,
  OfficeRosterRow,
  OfficeAssignResult,
} from "../lib/governance/Office";
import { StuffApi } from "./stuff";
import { HotReloadApi } from "./hot-reload";
import { CallSecurity } from "../lib/security/decorators";
import { SecurityPolicies } from "../lib/security/SecurityPolicies";
import { CompactLogic } from "../obj/api/CompactLogic";
import { fileURLToPath } from "url";
import { SecurityApi } from "./security";

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

/** A committee's chat channel, by well-known name. */
export interface CommitteeChannelView {
  name: string;
}

const LOGIC_PATH = "/obj/api/compact";
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL("../obj/api/CompactLogic", import.meta.url)
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

export class CompactApi {
  // ───────────────── the office face (the Compact's seats) ─────────────────
  // Absorbed from the retired OfficeApi: the government-office substrate's
  // caller surface. Public reads are ungated (governance is transparent by
  // constitutional design, Art. VII); the two mutations keep their
  // narrow-entry OfficeController gate. Subject-taking predicates accept
  // `Stuff | null` and fail closed; the appointer is never a parameter
  // (the `requiresFoundingAuthority` validator derives it from context).

  /**
   * Who holds an office — the explicit handed-off holder if one is
   * stored, else the founder (presented by handle even while offline).
   * Public read.
   */
  public static async officeHolderOf(
    officeKey: string
  ): Promise<OfficeHolderResult> {
    return logic().officeHolderOf(officeKey);
  }

  /**
   * Does `subject` (an Avatar) hold `officeKey`? Explicit-holder match,
   * OR (no explicit holder AND the subject is the founder). Public
   * read; non-Avatar / null subjects fail closed.
   */
  public static async holdsOffice(
    subject: Stuff | null,
    officeKey: string
  ): Promise<boolean> {
    return logic().holdsOffice(subject, officeKey);
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

  /** The configured founder display handle (offline presentation). */
  public static founderLabel(): string {
    return logic().founderLabel();
  }

  /**
   * Narrow-entry mutation: set the explicit holder of an office
   * (replacing any prior — auditable). Gated to the `OfficeController`
   * (the `office assign` verb) via the string-keyed `FromModule` policy;
   * the *authority* is the `requiresFoundingAuthority` subcommand
   * validator's job. Structurally the single entry to the handoff write.
   */
  @CallSecurity(
    SecurityPolicies.FromModule("/obj/command/governance/OfficeController")
  )
  public static async assignOffice(
    playerId: string,
    officeKey: string
  ): Promise<OfficeAssignResult> {
    return logic().assignOffice(playerId, officeKey);
  }

  /**
   * Narrow-entry mutation: clear an office's explicit holder (the seat
   * reverts to the founder default). Office-only — a singular seat has
   * no empty state. Same `OfficeController` gate as `assignOffice`.
   */
  @CallSecurity(
    SecurityPolicies.FromModule("/obj/command/governance/OfficeController")
  )
  public static async vacateOffice(officeKey: string): Promise<boolean> {
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
   * Whether `player` sits on the committee over `path` — a member of
   * the title-holding group, or the founder (the Art. XI pool-of-one
   * backstop, mirroring the office founder default).
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
