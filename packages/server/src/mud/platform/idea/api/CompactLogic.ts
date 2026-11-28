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
import type { Organization } from "../../../lib/employment/Organization";

type OrganizationStuff = Stuff & Organization;
import { TemplatePaths, TemplatePathPrefixes } from "../../../lib/paths";
import { User } from "../../../lib/identity/User";
import { Refusal } from "../../../lib/errors";
import { ConvictionApi } from "../../../api/conviction";
import { GrammarApi, type NameAnswer } from "../../../api/grammar";
import { OFFICE_APPARATUS } from "../../../lib/governance/Office";
import type {
  OfficeHolderResult,
  OfficeRosterRow,
  OfficeAssignResult,
} from "../../../lib/governance/Office";
import type OfficeRegistry from "../OfficeRegistry";
import type {
  CommitteeView,
  CommitteeChannelView,
  CompactCharacterView,
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

// ─────────────────────── the Compact character ───────────────────────
// (front-page-sources D1–D6) Every account takes part in the Compact
// through one character. The designation is one field on the account's
// own `User` row, read through `User.compactCharacterId()`.

/**
 * The account behind `subject`: the body's own account pointer, else the
 * account of the session driving it (a `Login` has no body, only a
 * session), else — a body with a durable id and nobody connected — the
 * account row that lists it. An anonymous session has no account.
 */
async function accountOf(subject: Stuff): Promise<User | null> {
  if (PlayerApi.isAvatarStuff(subject)) {
    const own = subject.getUser();
    if (own) return own.anonymous ? null : own;
  }
  if (MixinApi.isHasInteractive(subject)) {
    for (const interactive of subject.getInteractives()) {
      const user = interactive.getUser();
      return user.anonymous ? null : user;
    }
  }
  const playerId = playerIdOfQuick(subject);
  return playerId === null ? null : accountOfPlayer(playerId);
}

/** The account row that lists `playerId` (the live body's pointer first). */
async function accountOfPlayer(playerId: string): Promise<User | null> {
  const live = PlayerApi.findAvatarByPlayerId(playerId)?.getUser();
  if (live && !live.anonymous) return live;
  const [row] = await User.find<User>({ playerIds: playerId });
  return row ?? null;
}

/** A character's name: its body's while it is here, else its record's. */
async function characterName(playerId: string): Promise<string> {
  const live = PlayerApi.findAvatarByPlayerId(playerId);
  if (live) return live.getFullName();
  return (await PlayerApi.storedNameOf(playerId)) ?? playerId;
}

/** The durable subject key a character's standing and positions are under. */
function identityPathOf(playerId: string): string {
  return `${TemplatePathPrefixes.avatar}${playerId}`;
}

/**
 * ⭐ The lock (D4): why the account's Compact character may not change now,
 * or `null` when it may. Seated — the EXPLICIT holder of an office (a
 * hand-off row; the founder default follows the designation, so it is not
 * a lock) — or holding a conviction position, which is an open vote.
 * The future character-deletion act asks the same question (D2).
 */
async function compactLockOf(playerId: string): Promise<Refusal | null> {
  const name = await characterName(playerId);
  const reg = lookupOfficeRegistry();
  if (reg) {
    for (const office of OFFICE_APPARATUS) {
      const held = await reg.holderOf(office.getKey());
      if (held.kind === "explicit" && held.holderPlayerId === playerId) {
        return new Refusal("compact-seated", {
          name,
          office: office.getDisplayName(),
        });
      }
    }
  }
  const open = await ConvictionApi.positionsOf(identityPathOf(playerId));
  if (open.length > 0) return new Refusal("compact-vote-open", { name });
  return null;
}

/**
 * ⭐ The account's character the player's words name, by the one naming
 * rule (`GrammarApi.nameAmong`): its name, or its id. Only the account's
 * own characters are entries — an offline character is not runtime stuff,
 * so this is never MQL (D3). `null` for a session with no account.
 */
async function ownCharacterNamedImpl(
  subject: Stuff,
  words: string
): Promise<NameAnswer<string> | null> {
  const user = await accountOf(subject);
  if (!user || user.playerIds.length === 0) return null;
  const entries = [];
  for (const id of user.playerIds) {
    const name = await characterName(id);
    entries.push({ value: id, keywords: [name.toLowerCase(), id], title: name });
  }
  return GrammarApi.nameAmong(words, entries);
}

/**
 * ⭐ D6 — after a designation every live object for the account agrees.
 * `Avatar.user` is a runtime pointer, and two sessions (or a body already
 * in the world when a second login connected) can each hold their own
 * `User` object for one account, so the new value is stamped on all of
 * them — the account's bodies, and the sessions driving them.
 */
function restampLiveAccounts(saved: User, also: Stuff): void {
  const users = new Set<User>();
  const collect = (holder: Stuff): void => {
    if (PlayerApi.isAvatarStuff(holder)) {
      const own = holder.getUser();
      if (own) users.add(own);
    }
    if (MixinApi.isHasInteractive(holder)) {
      for (const interactive of holder.getInteractives()) {
        users.add(interactive.getUser());
      }
    }
  };
  collect(also);
  for (const id of saved.playerIds) {
    const body = PlayerApi.findAvatarByPlayerId(id);
    if (body) collect(body);
  }
  for (const user of users) {
    if (user === saved) continue;
    if (String(user._id ?? "") !== String(saved._id ?? "")) continue;
    if (saved.compactPlayerId !== undefined) {
      user.setCompactCharacter(saved.compactPlayerId);
    }
  }
}

async function compactCharacterOfImpl(
  subject: Stuff | null
): Promise<CompactCharacterView | null> {
  if (subject === null) return null;
  const user = await accountOf(subject);
  const playerId = user?.compactCharacterId() ?? null;
  if (playerId === null) return null;
  return { playerId, name: await characterName(playerId) };
}

async function designateImpl(
  subject: Stuff,
  target: string
): Promise<CompactCharacterView | Refusal> {
  const user = await accountOf(subject);
  if (!user || user.playerIds.length === 0) {
    return new Refusal("compact-no-account", {});
  }
  if (!user.playerIds.includes(target)) {
    return new Refusal("compact-not-yours", { name: target });
  }
  const name = await characterName(target);
  const current = user.compactCharacterId();
  if (current === target) return new Refusal("compact-unchanged", { name });
  if (current !== null) {
    const lock = await compactLockOf(current);
    if (lock) return lock;
  }
  user.setCompactCharacter(target);
  await user.save();
  restampLiveAccounts(user, subject);
  console.info(
    `[CompactLogic] account ${String(user._id ?? "")} took part in the Compact as ${target} (was ${current ?? "none"})`
  );
  return { playerId: target, name };
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
      // question has no answer, so only the staff count. Compared by
      // RESOLVING the authority's parcel, not by string: a fixture (or a
      // sparse title tree) can name the extent one way and cover it
      // another, and the loop it opened ran the heap out.
      if (authority?.kind === "committee") {
        if (authority.parcel === committee.subdivisionPath) return false;
        const above = await ParcelApi.ownerOf(authority.parcel);
        if (above?.kind === "organization" && above.templatePath === committee.templatePath) {
          return false;
        }
      }
      return EmploymentApi.holdsAuthority(player, authority);
    }
    // ⛔ No founder backstop (wizard-axis D18, owner 2026-11-05): *"no one
    // should 'sit on every committee' not even the founder."* The founder
    // DEFAULTS the platform OFFICES until they are filled; that seats them
    // on no committee. Art. XI's pool of one is the JURY rule, not this.
    // A committee's membership is its group, or an organization's chart.
    // ⭐ Committees are PLAYERS ONLY (economic bootstrap, doctrine 2): an
    // NPC is never a member, whatever a group document says.
    if (!PlayerApi.isAvatarStuff(player)) return false;
    // A managed group's uniform member key is the IDENTITY path
    // (`/platform/agent/Avatar/<playerId>` — the provider's keyspace, the
    // `group` verb's write, the installer's NPC enrolment, and every
    // other reader). This read used to pass the bare playerId, which
    // matched nothing a verb ever wrote: a seated committee was invisible
    // to the committee predicate.
    const memberKey = player.getIdentityPath();
    if (!memberKey) return false;
    return GroupApi.isMember(memberKey, committee.groupRef);
  }

  /** See {@link CompactApi.committeeMembersOf}. */
  @CallSecurity(CompactApiCallers)
  public async committeeMembersOf(path: string): Promise<Stuff[]> {
    const committee = await committeeOfImpl(path);
    if (!committee) return [];
    if (committee.kind === "organization") {
      const org = organizationOf(committee);
      if (!org) return [];
      // The connected players (naming overhaul D-B10: `online` left MQL).
      const online: Stuff[] = PlayerApi.connectedAvatars();
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

  /** See {@link CompactApi.compactCharacterOf}. */
  @CallSecurity(CompactApiCallers)
  public async compactCharacterOf(
    subject: Stuff | null
  ): Promise<CompactCharacterView | null> {
    return compactCharacterOfImpl(subject);
  }

  /** See {@link CompactApi.isCompactCharacter}. */
  @CallSecurity(CompactApiCallers)
  public async isCompactCharacter(subject: Stuff | null): Promise<boolean> {
    if (subject === null) return false;
    const playerId = playerIdOfQuick(subject);
    if (playerId === null) return false;
    const user = await accountOf(subject);
    return user !== null && user.compactCharacterId() === playerId;
  }

  /** See {@link CompactApi.ownCharacterNamed}. */
  @CallSecurity(CompactApiCallers)
  public async ownCharacterNamed(
    subject: Stuff,
    words: string
  ): Promise<NameAnswer<string> | null> {
    return ownCharacterNamedImpl(subject, words);
  }

  /** See {@link CompactApi.designateCompactCharacter}. */
  @CallSecurity(CompactApiCallers)
  public async designateCompactCharacter(
    subject: Stuff,
    playerId: string
  ): Promise<CompactCharacterView | Refusal> {
    return designateImpl(subject, playerId);
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
