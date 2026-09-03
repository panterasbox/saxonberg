// CompactLogic — the hot-reloadable logic singleton behind CompactApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { ApiLogic } from "../../../lib/stuff/ApiLogic";
import { CallSecurity, Unshadowable } from "../../../lib/security/decorators";
import { SecurityPolicies } from "../../../lib/security/SecurityPolicies";
import type { Stuff } from "../../../lib/stuff/Stuff";
import { StuffApi } from "../../../api/stuff";
import { ParcelApi } from "../../../api/parcel";
import { GroupApi } from "../../../api/group";
import { ChatApi } from "../../../api/chat";
import { PlayerApi } from "../../../api/player";
import { ExecutionContextApi } from "../../../api/execution-context";
import { EmploymentApi } from "../../../api/employment";
import { MixinApi } from "../../../api/mixin";
import { MqlApi } from "../../../api/mql";
import type { Organization } from "../../../lib/employment/Organization";

type OrganizationStuff = Stuff & Organization;
import { TemplatePaths } from "../../../lib/paths";
import type {
  OfficeHolderResult,
  OfficeRosterRow,
  OfficeAssignResult,
} from "../../../lib/governance/Office";
import type OfficeRegistry from "../OfficeRegistry";
import type {
  CommitteeView,
  CommitteeChannelView,
} from "../../../api/compact";

const CompactApiCallers = SecurityPolicies.FromModule(
  "/api/compact#CompactApi"
);

// ───────────────────────── the office half ─────────────────────────
// (merged from the retired OfficeLogic — the Compact's seats)

const OFFICE_REGISTRY_PATH = TemplatePaths.officeRegistry;

/**
 * Avatar-shaped sniff: only Avatar instances carry a non-empty
 * playerId. NPCs and props fail closed without touching the Registry.
 */
function playerIdOfQuick(subject: Stuff): string | null {
  const id = subject.getPlayerId();
  return id && id.length > 0 ? id : null;
}

/**
 * Resolve the OfficeRegistry without forcing a clone. In production it
 * is cloned by `AppBootstrap`; in test harnesses without a live
 * Registry the office predicates fail **closed** (a missing Registry
 * means "we cannot prove this player holds office / is the founder" —
 * failing open would silently grant office authority).
 */
let officeRegistryRef: OfficeRegistry | null = null;
function lookupOfficeRegistry(): OfficeRegistry | null {
  if (officeRegistryRef) return officeRegistryRef;
  const reg = StuffApi.findByTemplatePath<OfficeRegistry>(
    OFFICE_REGISTRY_PATH
  );
  if (reg) officeRegistryRef = reg;
  return reg ?? null;
}

/** The founder predicate, shared by the office face + the committee backstop. */
async function isFounderImpl(subject: Stuff | null): Promise<boolean> {
  if (subject === null) return false;
  const reg = lookupOfficeRegistry();
  if (!reg) return false;
  const playerId = playerIdOfQuick(subject);
  if (playerId === null) return false;
  return reg.isFounder(playerId);
}

// ──────────────────────── the committee half ───────────────────────

/**
 * The committee over `path`, derived from parcel title: the group
 * holding title IS the committee (all committees are groups,
 * structurally); a player-held subdivision has none. Never throws —
 * `null` is the normal no-committee result.
 */
async function committeeOfImpl(path: string): Promise<CommitteeView | null> {
  if (path.length === 0) return null;
  const owner = await ParcelApi.ownerOf(path);
  // Untitled ground has no committee (content-packs wave 3).
  if (owner === null) return null;
  if (owner.kind === "organization") {
    const parcel = await ParcelApi.coveringParcelOf(path);
    const org = StuffApi.findByTemplatePath(owner.templatePath);
    return {
      kind: "organization",
      name: org?.getPresentation() ?? owner.templatePath,
      templatePath: owner.templatePath,
      subdivisionPath: parcel?.getExtent() ?? "",
    };
  }
  if (owner.kind !== "group") return null;
  const groupRef = await ParcelApi.resolveOwnerRef(owner);
  if (!groupRef) return null;
  const parcel = await ParcelApi.coveringParcelOf(path);
  return {
    kind: "group",
    name: owner.name ?? GroupApi.parseRef(groupRef).id,
    groupRef,
    subdivisionPath: parcel?.getExtent() ?? "",
  };
}

/** The resident organization behind an organization-arm committee, or null. */
function organizationOf(
  committee: CommitteeView & { kind: "organization" }
): OrganizationStuff | null {
  const org = StuffApi.findByTemplatePath(committee.templatePath);
  return org && MixinApi.isOrganization(org) ? org : null;
}

/** The committee channel's well-known name for a committee. */
function channelNameFor(committee: CommitteeView): string {
  return `${committee.name}-committee`;
}

/**
 * CompactLogic — the hot-reloadable logic singleton behind
 * {@link CompactApi}: the Compact's (the meta institution's) single
 * facade. Two halves: the **office face** (merged from the retired
 * `OfficeLogic` — durable state stays on `/platform/idea/OfficeRegistry`, whose
 * methods admit this singleton; the no-registry path fails CLOSED,
 * because failing open would silently grant office authority) and the
 * **committee reads** — pure derive-on-read over parcel title +
 * grouping + chat. It owns no storage of its own. Internal sub-logic
 * lives in module-private free functions; each public method carries
 * the `FromModule` gate.
 *
 * @internal
 */
@Unshadowable
export class CompactLogic extends ApiLogic {
  /** See {@link CompactApi.committeeOf}. */
  @CallSecurity(CompactApiCallers)
  public async committeeOf(path: string): Promise<CommitteeView | null> {
    return committeeOfImpl(path);
  }

  /** See {@link CompactApi.isCommitteeMember}. */
  @CallSecurity(CompactApiCallers)
  public async isCommitteeMember(
    player: Stuff,
    path: string
  ): Promise<boolean> {
    const committee = await committeeOfImpl(path);
    if (!committee) return false;
    if (committee.kind === "organization") {
      // Staff or head — the organization's own chart is the roster.
      const org = organizationOf(committee);
      if (!org) return false;
      if (org.employs(player)) return true;
      const authority = org.getAppointingAuthority();
      // ⚠ An organization whose authority is the committee over its OWN
      // extent would be asking this question again forever: the head
      // question has no answer, so only the staff count.
      if (authority?.kind === "committee" && authority.parcel === committee.subdivisionPath) {
        return false;
      }
      return EmploymentApi.holdsAuthority(player, authority);
    }
    // The Art. XI pool-of-one backstop, mirroring the office founder
    // default: at founding every committee's work is the founder's.
    if (await isFounderImpl(player)) return true;
    if (!PlayerApi.isAvatarStuff(player)) return false;
    const playerId = player.getPlayerId();
    if (!playerId) return false;
    return GroupApi.isMember(playerId, committee.groupRef);
  }

  /** See {@link CompactApi.committeeMembersOf}. */
  @CallSecurity(CompactApiCallers)
  public async committeeMembersOf(path: string): Promise<Stuff[]> {
    const committee = await committeeOfImpl(path);
    if (!committee) return [];
    if (committee.kind === "organization") {
      const org = organizationOf(committee);
      if (!org) return [];
      const online = MqlApi.resolveMany("online", {
        commandGiver: null,
        scope: "online",
      }).stuff;
      const out: Stuff[] = [];
      for (const who of online) {
        if (
          org.employs(who) ||
          (await EmploymentApi.holdsAuthority(who, org.getAppointingAuthority()))
        ) {
          out.push(who);
        }
      }
      return out;
    }
    return GroupApi.membersOf(committee.groupRef);
  }

  /** See {@link CompactApi.committeeChannelOf}. */
  @CallSecurity(CompactApiCallers)
  public async committeeChannelOf(
    path: string
  ): Promise<CommitteeChannelView | null> {
    const committee = await committeeOfImpl(path);
    if (!committee || committee.kind === "organization") return null;
    const name = channelNameFor(committee);
    const channel = await ChatApi.resolveByName(name);
    return channel ? { name } : null;
  }

  // ─────────────────────── the office face ───────────────────────

  /** See {@link CompactApi.officeHolderOf}. */
  @CallSecurity(CompactApiCallers)
  public async officeHolderOf(officeKey: string): Promise<OfficeHolderResult> {
    const reg = lookupOfficeRegistry();
    if (!reg) return { kind: "unknown", officeKey };
    return reg.holderOf(officeKey);
  }

  /** See {@link CompactApi.holdsOffice}. */
  @CallSecurity(CompactApiCallers)
  public async holdsOffice(
    subject: Stuff | null,
    officeKey: string
  ): Promise<boolean> {
    if (subject === null) return false;
    const reg = lookupOfficeRegistry();
    if (!reg) return false;
    const playerId = playerIdOfQuick(subject);
    if (playerId === null) return false;
    return reg.holdsOffice(playerId, officeKey);
  }

  /** See {@link CompactApi.officesOf}. */
  @CallSecurity(CompactApiCallers)
  public async officesOf(subject: Stuff | null): Promise<string[]> {
    if (subject === null) return [];
    const reg = lookupOfficeRegistry();
    if (!reg) return [];
    const playerId = playerIdOfQuick(subject);
    if (playerId === null) return [];
    return reg.officesOf(playerId);
  }

  /** See {@link CompactApi.isFounder}. */
  @CallSecurity(CompactApiCallers)
  public async isFounder(subject: Stuff | null): Promise<boolean> {
    return isFounderImpl(subject);
  }

  /** See {@link CompactApi.officeRoster}. */
  @CallSecurity(CompactApiCallers)
  public async officeRoster(): Promise<OfficeRosterRow[]> {
    const reg = lookupOfficeRegistry();
    if (!reg) return [];
    return reg.roster();
  }

  /** See {@link CompactApi.founderLabel}. */
  @CallSecurity(CompactApiCallers)
  public founderLabel(): string {
    const reg = lookupOfficeRegistry();
    if (!reg) return "(founder unset)";
    return reg.founderLabel();
  }

  /** See {@link CompactApi.assignOffice}. */
  @CallSecurity(CompactApiCallers)
  public async assignOffice(
    playerId: string,
    officeKey: string
  ): Promise<OfficeAssignResult> {
    const reg = lookupOfficeRegistry();
    if (!reg) return { changed: false, priorHolderId: null, ok: false };
    return reg.assign(playerId, officeKey);
  }

  /** See {@link CompactApi.vacateOffice}. */
  @CallSecurity(CompactApiCallers)
  public async vacateOffice(officeKey: string): Promise<boolean> {
    const reg = lookupOfficeRegistry();
    if (!reg) return false;
    return reg.vacate(officeKey);
  }

  /** See {@link CompactApi._resetOfficeRegistryRefForReload}. */
  @CallSecurity(CompactApiCallers)
  public _resetOfficeRegistryRefForReload(): void {
    officeRegistryRef = null;
  }

  /** See {@link CompactApi.ensureCommitteeChannel}. */
  @CallSecurity(CompactApiCallers)
  public async ensureCommitteeChannel(
    path: string
  ): Promise<CommitteeChannelView | null> {
    const committee = await committeeOfImpl(path);
    // An organization's channel is its own concern — none minted here.
    if (!committee || committee.kind === "organization") return null;
    const name = channelNameFor(committee);
    const existing = await ChatApi.resolveByName(name);
    if (existing) return { name };
    // The mint is an act, so its actor derives from execution context —
    // never a parameter. No acting command → no mint (reads stay pure).
    const giver = ExecutionContextApi.getCurrentCommandContext()?.commandGiver;
    if (!giver) return null;
    await ChatApi.createBoundChannel(giver, name, committee.groupRef);
    return { name };
  }
}
