// PartyLogic — the hot-reloadable logic singleton behind PartyApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { ApiLogic } from "../../lib/stuff/ApiLogic";
import { CallSecurity, Unshadowable } from "../../lib/security/decorators";
import { SecurityPolicies } from "../../lib/security/SecurityPolicies";
import type { Stuff } from "../../lib/stuff/Stuff";
import { MixinApi } from "../../api/mixin";
import { PlayerApi } from "../../api/player";
import { GroupApi } from "../../api/group";
import { ChatApi } from "../../api/chat";
import { StuffApi } from "../../api/stuff";
import { SecurityApi } from "../../api/security";
import { Party, DEFAULT_FORMATION_PATH } from "../../lib/party/Party";
import { PartyRecord } from "../../lib/party/PartyRecord";
import { PartyGroupProvider } from "../../lib/party/PartyGroupProvider";
import type { PartyOpResult, PartySimpleResult } from "../../api/party";

const PartyApiCallers = SecurityPolicies.FromModule("/api/party#PartyApi");

/** The party: grouping provider, module-level so it survives a logic-
 * singleton recreation (fireChange reaches the same instance registered
 * with GroupRegistry). */
let partyProvider: PartyGroupProvider | null = null;

/**
 * PartyLogic — the party operational core behind {@link PartyApi}.
 *
 * Lives at `/obj/api/party`; the `PartyApi` statics forward here. Owns two
 * things: the **combat friend/foe seam** (`sideOf`/`areAllied` — the two
 * pure functions combat consumes, read straight off the party's own
 * roster, never `GroupApi`) and the **party lifecycle** (form / invite /
 * accept / leave / kick / disband / transfer / side / muster / stand-down).
 *
 * A party is a first-class **Idea**: its state is encapsulated on the
 * object and it is discovered through the Stuff graph
 * (`StuffApi.findByTemplatePath`) — there is no central registry map.
 * Durable parties are mirrored into a {@link PartyRecord} document (which
 * doubles as the queryable durable index + the boot-warm source);
 * ad-hoc parties are Ideas that never persist.
 *
 * Heavy logic lives in module-private functions so nothing routes through
 * the instance proxy mid-operation (the `ConditionLogic` precedent).
 *
 * @internal
 */
@Unshadowable
export class PartyLogic extends ApiLogic {
  /** Boot: register the `party:` provider + re-materialize durable parties
   * into live Ideas. Called from `AppBootstrap` after `GroupRegistry`. */
  @CallSecurity(PartyApiCallers)
  public async boot(): Promise<void> {
    return bootImpl();
  }

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
  public formationPathOf(combatant: Stuff): string {
    return formationPathOfImpl(combatant);
  }

  @CallSecurity(PartyApiCallers)
  public roleOf(combatant: Stuff): string {
    return roleOfImpl(combatant);
  }

  @CallSecurity(PartyApiCallers)
  public isCaptain(combatant: Stuff): boolean {
    return isCaptainImpl(combatant);
  }

  @CallSecurity(PartyApiCallers)
  public activePartyOf(member: Stuff): Party | null {
    return activePartyOfImpl(member);
  }

  @CallSecurity(PartyApiCallers)
  public async partiesOf(memberId: string): Promise<readonly Party[]> {
    return partiesOfImpl(memberId);
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
  public async enlist(hirer: Stuff, hiree: Stuff): Promise<PartySimpleResult> {
    return enlistImpl(hirer, hiree);
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
  public async setFormation(
    captain: Stuff,
    name: string,
  ): Promise<PartySimpleResult> {
    return setFormationImpl(captain, name);
  }

  @CallSecurity(PartyApiCallers)
  public async assignRole(
    captain: Stuff,
    role: string,
    targetId: string,
  ): Promise<PartySimpleResult> {
    return assignRoleImpl(captain, role, targetId);
  }

  @CallSecurity(PartyApiCallers)
  public async muster(member: Stuff, name: string): Promise<PartyOpResult> {
    return musterImpl(member, name);
  }

  @CallSecurity(PartyApiCallers)
  public async standDown(member: Stuff): Promise<PartySimpleResult> {
    return standDownImpl(member);
  }
}

/* ───────────────────────── boot / materialize ───────────────────────── */

async function bootImpl(): Promise<void> {
  if (!partyProvider) partyProvider = new PartyGroupProvider();
  const reg = await GroupApi.registry();
  reg.register(partyProvider);
  // Re-materialize durable parties from their records into live Ideas.
  const records = await PartyRecord.find<PartyRecord>({});
  for (const rec of records) {
    if (!rec.path || StuffApi.findByTemplatePath(rec.path)) continue;
    await materializeParty(rec);
  }
}

/** Create a live Party Idea from a durable record (boot warm / lazy). */
async function materializeParty(rec: PartyRecord): Promise<Party> {
  const party = await StuffApi.create(() => new Party());
  party.setTemplatePath(rec.path);
  party.applyRecord(rec);
  return party;
}

/** Upsert a durable party's record (a no-op for an ad-hoc party). */
async function persistParty(party: Party): Promise<void> {
  if (!party.isDurable()) return;
  const path = party.getTemplatePath();
  if (!path) return;
  const existing = (await PartyRecord.find<PartyRecord>({ path }))[0];
  await party.toRecord(existing).save();
}

function fireChange(party: Party): void {
  const path = party.getTemplatePath();
  if (path) partyProvider?.fireChange(path);
}

/* ───────────────────────── member identity ───────────────────────── */

/** A combatant's durable member ref: an Avatar's playerId, else its
 * templatePath. Party members answer for themselves
 * (`PartyMember.partyMemberId`); the fallback covers the non-member
 * combatants `sideOf` keys (rung 3). */
function memberIdOf(s: Stuff): string {
  if (MixinApi.isPartyMember(s)) return s.partyMemberId();
  if (PlayerApi.isAvatarStuff(s)) return s.getPlayerId() ?? "";
  return s.getTemplatePath() ?? "";
}

/** Resolve a member ref back to a live Stuff, or null. */
function resolveMember(id: string): Stuff | null {
  if (id.startsWith("/")) {
    return StuffApi.findByTemplatePath<Stuff>(id) ?? null;
  }
  return (PlayerApi.findAvatarByPlayerId(id) as Stuff | undefined) ?? null;
}

/** The live Party Idea at a templatePath, or null. */
function partyAt(path: string): Party | null {
  const stuff = StuffApi.findByTemplatePath(path);
  return stuff instanceof Party ? stuff : null;
}

/* ───────────────────────── the seam ───────────────────────── */

function sideOfImpl(combatant: Stuff): string {
  // Rung 1 — an active party's combatSide (de jure: Avatar / Mercenary).
  if (MixinApi.isPartyMember(combatant)) {
    const path = combatant.getActivePartyPath();
    if (path) {
      const party = partyAt(path);
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
  const path = member.getActivePartyPath();
  return path ? partyAt(path) : null;
}

/* ───────────────────── formation resolution (sync) ───────────────────── */

/** The total chain: the active party's chosen formation, else the default
 * preset. NEVER `''`/null — the caller has no null branch. */
function formationPathOfImpl(combatant: Stuff): string {
  return (
    activePartyOfImpl(combatant)?.getFormationPath() || DEFAULT_FORMATION_PATH
  );
}

function roleOfImpl(combatant: Stuff): string {
  const party = activePartyOfImpl(combatant);
  return party ? party.roleOfMember(memberIdOf(combatant)) : "";
}

function isCaptainImpl(combatant: Stuff): boolean {
  const party = activePartyOfImpl(combatant);
  return party ? party.isCaptain(memberIdOf(combatant)) : false;
}

/** The formation Idea's role vocabulary, duck-read structurally so this
 * module never imports `lib/combat` (the one-way combat→party dep). */
function formationRolesAt(path: string): readonly string[] | null {
  const idea = StuffApi.findByTemplatePath(path);
  if (!idea) return null;
  const withRoles = idea as unknown as { getRoles?: () => readonly string[] };
  return typeof withRoles.getRoles === "function" ? withRoles.getRoles() : null;
}

async function partiesOfImpl(memberId: string): Promise<readonly Party[]> {
  const records = await PartyRecord.find<PartyRecord>({ memberIds: memberId });
  const out: Party[] = [];
  for (const rec of records) {
    out.push(partyAt(rec.path) ?? (await materializeParty(rec)));
  }
  return out;
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
  if (founder.getActivePartyPath()) {
    return { ok: false, reason: "already-in-a-party" };
  }
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, reason: "name-required" };
  if (durable) {
    const clash = await PartyRecord.find<PartyRecord>({ name: trimmed });
    if (clash.length > 0) return { ok: false, reason: "name-taken" };
  }

  const founderId = memberIdOf(founder);
  const party = await StuffApi.create(() => new Party());
  party.setTemplatePath(`/obj/party/${SecurityApi.uuid()}`);
  party.setName(trimmed);
  party.setFounderId(founderId);
  party.setCaptainId(founderId);
  party.setDurable(durable);
  party.admit(founder);
  await persistParty(party);

  // Party chat: a channel bound to the party's own roster ref (chat is a
  // consumer of the grouping facade — no managed group minted). Best-
  // effort: a name clash never blocks party formation.
  try {
    await ChatApi.createBoundChannel(founder, trimmed, party.partyRef());
    party.setChannelRef(trimmed);
    await persistParty(party);
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
  if (invitee.getActivePartyPath()) {
    return { ok: false, reason: "target-already-in-a-party" };
  }
  party.extendInvite(invitee);
  return { ok: true, party };
}

async function acceptImpl(invitee: Stuff): Promise<PartyOpResult> {
  if (!MixinApi.isPartyMember(invitee)) {
    return { ok: false, reason: "cannot-join" };
  }
  if (invitee.getActivePartyPath()) {
    return { ok: false, reason: "already-in-a-party" };
  }
  const path = invitee.getPendingInvitePartyPath();
  if (!path) return { ok: false, reason: "no-invite" };
  const party = partyAt(path);
  if (!party) return { ok: false, reason: "invite-expired" };

  party.admit(invitee);
  await persistParty(party);
  fireChange(party);
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
  if (hiree.getActivePartyPath()) {
    return { ok: false, reason: "target-already-in-a-party" };
  }
  party.admit(hiree);
  await persistParty(party);
  fireChange(party);
  return { ok: true };
}

async function leaveImpl(member: Stuff): Promise<PartySimpleResult> {
  if (!MixinApi.isPartyMember(member)) {
    return { ok: false, reason: "not-in-a-party" };
  }
  const party = activePartyOfImpl(member);
  if (!party) return { ok: false, reason: "not-in-a-party" };
  party.release(memberIdOf(member), member);
  await settleAfterDeparture(party);
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
  const target = resolveMember(targetId);
  party.release(
    targetId,
    target && MixinApi.isPartyMember(target) ? target : null,
  );
  await settleAfterDeparture(party);
  return { ok: true };
}

/**
 * Settle a party after `Party.release` ran a departure: the empty-party
 * terminus (ad-hoc → destructed; durable → dormant) + persist + change
 * fan-out. Shared by leave / kick / stand-down. The roster removal and
 * captain succession are the party's own transition (`release`), not
 * repeated here.
 */
async function settleAfterDeparture(party: Party): Promise<void> {
  if (party.size() === 0) {
    if (party.isDurable()) {
      party.setCaptainId(""); // persists dormant + empty
      await persistParty(party);
      fireChange(party);
    } else {
      fireChange(party);
      StuffApi.destruct(party); // ad-hoc evaporates
    }
    return;
  }
  await persistParty(party);
  fireChange(party);
}

async function disbandImpl(captain: Stuff): Promise<PartySimpleResult> {
  const party = activePartyOfImpl(captain);
  if (!party) return { ok: false, reason: "not-in-a-party" };
  if (!party.isCaptain(memberIdOf(captain))) {
    return { ok: false, reason: "not-the-captain" };
  }
  const path = party.getTemplatePath();
  // Stand every online member down (their pointer, the party acting).
  for (const id of [...party.getMemberIds()]) {
    const m = resolveMember(id);
    if (m && MixinApi.isPartyMember(m)) party.dismiss(m);
  }
  if (party.getChannelRef()) {
    try {
      await ChatApi.disbandPlayerChannel(party.getChannelRef());
    } catch {
      /* channel teardown best-effort */
    }
  }
  if (party.isDurable() && path) {
    const rec = (await PartyRecord.find<PartyRecord>({ path }))[0];
    if (rec) {
      try {
        await rec.delete();
      } catch {
        /* already gone */
      }
    }
  }
  StuffApi.destruct(party);
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
  await persistParty(party);
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
  await persistParty(party);
  return { ok: true };
}

async function setFormationImpl(
  captain: Stuff,
  name: string,
): Promise<PartySimpleResult> {
  const party = activePartyOfImpl(captain);
  if (!party) return { ok: false, reason: "not-in-a-party" };
  if (!party.isCaptain(memberIdOf(captain))) {
    return { ok: false, reason: "not-the-captain" };
  }
  const trimmed = name.trim().toLowerCase();
  if (!trimmed || !/^[a-z][a-z-]*$/.test(trimmed)) {
    return { ok: false, reason: "unknown-formation" };
  }
  const path = `/lib/combat/CombatFormation/${trimmed}`;
  // Await the Idea resident BEFORE accepting, so a mid-fight switch is
  // live by its next beat (the beat's consult is sync findByTemplatePath).
  try {
    await StuffApi.singleton(path);
  } catch {
    return { ok: false, reason: "unknown-formation" };
  }
  party.setFormationPath(path);
  await persistParty(party);
  fireChange(party);
  return { ok: true };
}

async function assignRoleImpl(
  captain: Stuff,
  role: string,
  targetId: string,
): Promise<PartySimpleResult> {
  const party = activePartyOfImpl(captain);
  if (!party) return { ok: false, reason: "not-in-a-party" };
  if (!party.isCaptain(memberIdOf(captain))) {
    return { ok: false, reason: "not-the-captain" };
  }
  if (!party.isMember(targetId)) return { ok: false, reason: "not-a-member" };
  const formationPath = party.getFormationPath();
  if (!formationPath) return { ok: false, reason: "no-formation" };
  const roles = formationRolesAt(formationPath);
  const wanted = role.trim().toLowerCase();
  if (!roles || !roles.includes(wanted)) {
    return { ok: false, reason: "unknown-role" };
  }
  party.assignRole(targetId, wanted);
  await persistParty(party);
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
  const trimmed = name.trim().toLowerCase();
  const records = await PartyRecord.find<PartyRecord>({});
  const rec = records.find(
    (r) => r.name.toLowerCase() === trimmed && r.memberIds.includes(memberId),
  );
  if (!rec) return { ok: false, reason: "no-such-crew" };
  const party = partyAt(rec.path) ?? (await materializeParty(rec));

  // Recall overwrites the current active pointer — the one-active-party
  // rule is the overwrite (a durable crew keeps you on its roster, so
  // the prior party needs no roster-side settling here).
  party.recall(member);
  return { ok: true, party };
}

async function standDownImpl(member: Stuff): Promise<PartySimpleResult> {
  if (!MixinApi.isPartyMember(member) || !member.getActivePartyPath()) {
    return { ok: false, reason: "not-in-a-party" };
  }
  const party = activePartyOfImpl(member);
  // Stand-down semantics differ by lifetime: a **durable** crew keeps you
  // on its roster (dormant — `muster` re-activates), while an **ad-hoc**
  // party has no dormant state, so standing down is simply leaving it.
  if (party) {
    if (party.isDurable()) {
      party.dismiss(member);
    } else {
      party.release(memberIdOf(member), member);
      await settleAfterDeparture(party);
    }
  } else {
    // Janitorial: a stale pointer with no live Party Idea to act — the
    // logic's own arm on the member contract covers this.
    member._setActivePartyPath("");
  }
  return { ok: true };
}
