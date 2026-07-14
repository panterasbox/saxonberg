// PartyLogic — the hot-reloadable logic singleton behind PartyApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { ApiLogic } from "../../lib/stuff/ApiLogic";
import { CallSecurity, Unshadowable } from "../../lib/security/decorators";
import { SecurityPolicies } from "../../lib/security/SecurityPolicies";
import type { Stuff } from "../../lib/stuff/Stuff";
import { MixinApi } from "../../api/mixin";
import { PlayerApi } from "../../api/player";
import { ChatApi } from "../../api/chat";
import { StuffApi } from "../../api/stuff";
import { SecurityApi } from "../../api/security";
import { Party } from "../../lib/party/Party";
import type PartyRegistry from "../PartyRegistry";
import type { PartyOpResult, PartySimpleResult } from "../../api/party";

const PartyApiCallers = SecurityPolicies.FromModule("/api/party#PartyApi");

const REGISTRY_PATH = "/obj/PartyRegistry";

/**
 * PartyLogic — the party operational core behind {@link PartyApi}.
 *
 * Lives at `/obj/api/party`; the `PartyApi` statics forward here. Owns two
 * things: the **combat friend/foe seam** (`sideOf`/`areAllied` — the two
 * pure functions combat consumes, read straight off the party's own
 * roster, never `GroupApi`) and the **party lifecycle** (form / invite /
 * accept / leave / kick / disband / transfer / side / muster / stand-down).
 * The party owns its membership; this logic mutates the `Party` Document
 * and keeps the `PartyRegistry` in-memory map + the `party:` grouping
 * provider in sync.
 *
 * Heavy logic lives in module-private functions so nothing routes through
 * the instance proxy mid-operation (the `ConditionLogic` precedent).
 *
 * @internal
 */
@Unshadowable
export class PartyLogic extends ApiLogic {
  /* ───────────────── the combat seam (sync) ───────────────── */

  @CallSecurity(PartyApiCallers)
  public sideOf(combatant: Stuff): string {
    return sideOfImpl(combatant);
  }

  @CallSecurity(PartyApiCallers)
  public areAllied(a: Stuff, b: Stuff): boolean {
    return sideOfImpl(a) === sideOfImpl(b);
  }

  @CallSecurity(PartyApiCallers)
  public activePartyOf(member: Stuff): Party | null {
    return activePartyOfImpl(member);
  }

  @CallSecurity(PartyApiCallers)
  public partiesOf(memberId: string): readonly Party[] {
    return registrySync()?.partiesWithMember(memberId) ?? [];
  }

  /* ───────────────── lifecycle (async) ───────────────── */

  @CallSecurity(PartyApiCallers)
  public async form(
    founder: Stuff,
    name: string,
    durable: boolean,
  ): Promise<PartyOpResult> {
    return formImpl(founder, name, durable);
  }

  @CallSecurity(PartyApiCallers)
  public async invite(inviter: Stuff, invitee: Stuff): Promise<PartyOpResult> {
    return inviteImpl(inviter, invitee);
  }

  @CallSecurity(PartyApiCallers)
  public async accept(invitee: Stuff): Promise<PartyOpResult> {
    return acceptImpl(invitee);
  }

  @CallSecurity(PartyApiCallers)
  public async leave(member: Stuff): Promise<PartySimpleResult> {
    return leaveImpl(member);
  }

  @CallSecurity(PartyApiCallers)
  public async kick(captain: Stuff, targetId: string): Promise<PartySimpleResult> {
    return kickImpl(captain, targetId);
  }

  @CallSecurity(PartyApiCallers)
  public async disband(captain: Stuff): Promise<PartySimpleResult> {
    return disbandImpl(captain);
  }

  @CallSecurity(PartyApiCallers)
  public async transfer(
    captain: Stuff,
    newCaptainId: string,
  ): Promise<PartySimpleResult> {
    return transferImpl(captain, newCaptainId);
  }

  @CallSecurity(PartyApiCallers)
  public async setSide(captain: Stuff, side: string): Promise<PartySimpleResult> {
    return setSideImpl(captain, side);
  }

  @CallSecurity(PartyApiCallers)
  public async muster(member: Stuff, name: string): Promise<PartyOpResult> {
    return musterImpl(member, name);
  }

  @CallSecurity(PartyApiCallers)
  public async standDown(member: Stuff): Promise<PartySimpleResult> {
    return standDownImpl(member);
  }

  /** Register a hired member directly (the merc-hire path — no invite
   * handshake). Adds `hiree` to `hirer`'s active party. */
  @CallSecurity(PartyApiCallers)
  public async enlist(hirer: Stuff, hiree: Stuff): Promise<PartySimpleResult> {
    return enlistImpl(hirer, hiree);
  }
}

/* ───────────────────────── registry resolution ───────────────────────── */

/** Sync registry read (the combat-seam hot path); null until booted. The
 * lookup is an O(1) `byTemplatePath` map read, so no caching (a cache
 * would go stale across a hot-reload / re-clone of the singleton). */
function registrySync(): PartyRegistry | null {
  return StuffApi.findByTemplatePath<PartyRegistry>(REGISTRY_PATH) ?? null;
}

async function requireRegistry(): Promise<PartyRegistry> {
  const sync = registrySync();
  if (sync) return sync;
  return StuffApi.singleton<PartyRegistry>(REGISTRY_PATH);
}

/* ───────────────────────── member identity ───────────────────────── */

/** A combatant's durable member ref: an Avatar's playerId, else its
 * templatePath (a Mercenary NPC). */
function memberIdOf(s: Stuff): string {
  if (PlayerApi.isAvatarStuff(s)) return s.getPlayerId() ?? "";
  return s.getTemplatePath() ?? "";
}

/** Resolve a member ref back to a live Stuff (an online Avatar or a live
 * NPC by templatePath), or null. */
function resolveMember(id: string): Stuff | null {
  if (id.startsWith("/")) {
    return StuffApi.findByTemplatePath<Stuff>(id) ?? null;
  }
  return (PlayerApi.findAvatarByPlayerId(id) as Stuff | undefined) ?? null;
}

/* ───────────────────────── the seam ───────────────────────── */

function sideOfImpl(combatant: Stuff): string {
  // Rung 1 — an active party's combatSide (de jure: Avatar / Mercenary).
  if (MixinApi.isPartyMember(combatant)) {
    const pid = combatant.getActivePartyId();
    if (pid) {
      const party = registrySync()?.get(pid);
      if (party) return party.getCombatSide();
    }
  }
  // Rung 2 — the owner's side (de facto: pet/companion). Seam only; pets
  // are unbuilt this cycle, so nothing hits this rung yet.
  // Rung 3 — a side of one, keyed by durable id (two distinct solos never
  // ally; today's 1v1 is the degenerate case).
  return `solo:${combatant.getTemplatePath() ?? memberIdOf(combatant)}`;
}

function activePartyOfImpl(member: Stuff): Party | null {
  if (!MixinApi.isPartyMember(member)) return null;
  const pid = member.getActivePartyId();
  if (!pid) return null;
  return registrySync()?.get(pid) ?? null;
}

/* ───────────────────────── lifecycle impls ───────────────────────── */

async function formImpl(
  founder: Stuff,
  name: string,
  durable: boolean,
): Promise<PartyOpResult> {
  if (!MixinApi.isPartyMember(founder)) {
    return { ok: false, reason: "not-a-party-member" };
  }
  if (founder.getActivePartyId()) {
    return { ok: false, reason: "already-in-a-party" };
  }
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, reason: "name-required" };

  const reg = await requireRegistry();
  const founderId = memberIdOf(founder);
  const party = new Party();
  party.name = trimmed;
  party.founderId = founderId;
  party.captainId = founderId;
  party.durable = durable;
  party.addMember(founderId);

  if (durable) {
    await party.save(); // assigns _id
  } else {
    party._id = SecurityApi.uuid(); // ad-hoc lives only in memory
  }
  reg.add(party);
  founder._setActivePartyId(party._id!);

  // Party chat: a channel bound to the party's own roster ref (chat is a
  // consumer of the grouping facade — no managed group minted). Best-
  // effort: a name clash never blocks party formation.
  try {
    await ChatApi.createBoundChannel(founder, trimmed, party.partyRef());
    party.channelRef = trimmed;
    if (durable) await party.save();
  } catch {
    /* channel optional; party stands without it */
  }
  return { ok: true, party };
}

async function inviteImpl(
  inviter: Stuff,
  invitee: Stuff,
): Promise<PartyOpResult> {
  const party = activePartyOfImpl(inviter);
  if (!party) return { ok: false, reason: "not-in-a-party" };
  if (!party.isCaptain(memberIdOf(inviter))) {
    return { ok: false, reason: "not-the-captain" };
  }
  if (!MixinApi.isPartyMember(invitee)) {
    return { ok: false, reason: "cannot-join" };
  }
  if (invitee.getActivePartyId()) {
    return { ok: false, reason: "target-already-in-a-party" };
  }
  invitee._setPendingInvitePartyId(party._id!);
  return { ok: true, party };
}

async function acceptImpl(invitee: Stuff): Promise<PartyOpResult> {
  if (!MixinApi.isPartyMember(invitee)) {
    return { ok: false, reason: "cannot-join" };
  }
  if (invitee.getActivePartyId()) {
    return { ok: false, reason: "already-in-a-party" };
  }
  const pid = invitee.getPendingInvitePartyId();
  if (!pid) return { ok: false, reason: "no-invite" };
  const reg = await requireRegistry();
  const party = reg.get(pid);
  if (!party) return { ok: false, reason: "invite-expired" };

  party.addMember(memberIdOf(invitee));
  invitee._setActivePartyId(pid);
  invitee._setPendingInvitePartyId("");
  if (party.isDurable()) await party.save();
  reg.provider()?.fireChange(pid);
  return { ok: true, party };
}

/** Add a member with no invite handshake (the merc-hire path). */
async function enlistImpl(
  hirer: Stuff,
  hiree: Stuff,
): Promise<PartySimpleResult> {
  const party = activePartyOfImpl(hirer);
  if (!party) return { ok: false, reason: "not-in-a-party" };
  if (!party.isCaptain(memberIdOf(hirer))) {
    return { ok: false, reason: "not-the-captain" };
  }
  if (!MixinApi.isPartyMember(hiree)) {
    return { ok: false, reason: "cannot-join" };
  }
  if (hiree.getActivePartyId()) {
    return { ok: false, reason: "target-already-in-a-party" };
  }
  party.addMember(memberIdOf(hiree));
  hiree._setActivePartyId(party._id!);
  if (party.isDurable()) await party.save();
  (await requireRegistry()).provider()?.fireChange(party._id!);
  return { ok: true };
}

async function leaveImpl(member: Stuff): Promise<PartySimpleResult> {
  if (!MixinApi.isPartyMember(member)) {
    return { ok: false, reason: "not-in-a-party" };
  }
  const party = activePartyOfImpl(member);
  if (!party) return { ok: false, reason: "not-in-a-party" };
  const memberId = memberIdOf(member);
  await departFromParty(party, memberId);
  member._setActivePartyId("");
  return { ok: true };
}

async function kickImpl(
  captain: Stuff,
  targetId: string,
): Promise<PartySimpleResult> {
  const party = activePartyOfImpl(captain);
  if (!party) return { ok: false, reason: "not-in-a-party" };
  if (!party.isCaptain(memberIdOf(captain))) {
    return { ok: false, reason: "not-the-captain" };
  }
  if (targetId === memberIdOf(captain)) {
    return { ok: false, reason: "cannot-kick-self" };
  }
  if (!party.isMember(targetId)) return { ok: false, reason: "not-a-member" };
  await departFromParty(party, targetId);
  const target = resolveMember(targetId);
  if (target && MixinApi.isPartyMember(target)) {
    if (target.getActivePartyId() === party._id) target._setActivePartyId("");
  }
  return { ok: true };
}

/**
 * Remove `memberId` from `party`, handling captain succession and the
 * empty-party terminus (ad-hoc → destroyed; durable → dormant). Shared by
 * leave / kick.
 */
async function departFromParty(party: Party, memberId: string): Promise<void> {
  party.removeMember(memberId);
  const reg = await requireRegistry();
  if (party.isCaptain(memberId)) {
    const heir = party.getMemberIds()[0];
    if (heir) party.setCaptainId(heir);
  }
  if (party.size() === 0) {
    if (party.isDurable()) {
      party.setCaptainId("");
      await party.save(); // persists dormant + empty
    } else {
      reg.remove(party._id!); // ad-hoc evaporates
    }
  } else if (party.isDurable()) {
    await party.save();
  }
  reg.provider()?.fireChange(party._id!);
}

async function disbandImpl(captain: Stuff): Promise<PartySimpleResult> {
  const party = activePartyOfImpl(captain);
  if (!party) return { ok: false, reason: "not-in-a-party" };
  if (!party.isCaptain(memberIdOf(captain))) {
    return { ok: false, reason: "not-the-captain" };
  }
  const reg = await requireRegistry();
  // Clear every online member's active pointer.
  for (const id of [...party.getMemberIds()]) {
    const m = resolveMember(id);
    if (m && MixinApi.isPartyMember(m) && m.getActivePartyId() === party._id) {
      m._setActivePartyId("");
    }
  }
  if (party.getChannelRef()) {
    try {
      await ChatApi.disbandPlayerChannel(party.getChannelRef());
    } catch {
      /* channel teardown best-effort */
    }
  }
  reg.remove(party._id!);
  if (party.isDurable()) {
    try {
      await party.delete();
    } catch {
      /* already gone */
    }
  }
  return { ok: true };
}

async function transferImpl(
  captain: Stuff,
  newCaptainId: string,
): Promise<PartySimpleResult> {
  const party = activePartyOfImpl(captain);
  if (!party) return { ok: false, reason: "not-in-a-party" };
  if (!party.isCaptain(memberIdOf(captain))) {
    return { ok: false, reason: "not-the-captain" };
  }
  if (!party.isMember(newCaptainId)) {
    return { ok: false, reason: "not-a-member" };
  }
  party.setCaptainId(newCaptainId);
  if (party.isDurable()) await party.save();
  return { ok: true };
}

async function setSideImpl(
  captain: Stuff,
  side: string,
): Promise<PartySimpleResult> {
  const party = activePartyOfImpl(captain);
  if (!party) return { ok: false, reason: "not-in-a-party" };
  if (!party.isCaptain(memberIdOf(captain))) {
    return { ok: false, reason: "not-the-captain" };
  }
  party.setCombatSide(side);
  if (party.isDurable()) await party.save();
  return { ok: true };
}

async function musterImpl(
  member: Stuff,
  name: string,
): Promise<PartyOpResult> {
  if (!MixinApi.isPartyMember(member)) {
    return { ok: false, reason: "not-a-party-member" };
  }
  const memberId = memberIdOf(member);
  const reg = await requireRegistry();
  const trimmed = name.trim().toLowerCase();
  const party = reg
    .partiesWithMember(memberId)
    .find((p) => p.isDurable() && p.getName().toLowerCase() === trimmed);
  if (!party) return { ok: false, reason: "no-such-crew" };

  // Stand down the current active party first (one-active-party).
  const current = member.getActivePartyId();
  if (current && current !== party._id) {
    member._setActivePartyId("");
  }
  member._setActivePartyId(party._id!);
  return { ok: true, party };
}

async function standDownImpl(member: Stuff): Promise<PartySimpleResult> {
  if (!MixinApi.isPartyMember(member) || !member.getActivePartyId()) {
    return { ok: false, reason: "not-in-a-party" };
  }
  const party = activePartyOfImpl(member);
  member._setActivePartyId("");
  // Stand-down semantics differ by lifetime: a **durable** crew keeps you
  // on its roster (dormant — `muster` re-activates), while an **ad-hoc**
  // party has no dormant state, so standing down is simply leaving it.
  if (party && !party.isDurable()) {
    await departFromParty(party, memberIdOf(member));
  }
  return { ok: true };
}
