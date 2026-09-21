// PlayerLogic — the hot-reloadable logic singleton behind PlayerApi.
// (Doc comment lives on the class declaration below so @internal lands
// on the reflection TypeDoc emits, not on the module.)

import { ApiLogic } from '../../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../../lib/security/decorators';
import { SecurityPolicies } from '../../../lib/security/SecurityPolicies';
import Avatar from '../../agent/Avatar';
import type { User } from '../../../lib/identity/User';

/** The lazily-imported Avatar class's static surface this logic uses. */
interface AvatarClassRef {
  getTemplatePath(playerId: string): string;
  SEED_TEMPLATE_PATH: string;
}
import { StuffApi } from '../../../api/stuff';
import { AppApi } from '../../../api/app';
import { AppSettingKeys } from '../../../lib/config/AppSettings';
import { PersistedRecord } from '../../../lib/persistence/PersistedRecord';
import { AVATAR_IDENTITY_PREFIX, type EstateState } from '../../../lib/character/Estate';
import { BankingApi, Money } from '../../../api/banking';
import { ContractApi } from '../../../api/contract';
import { EmploymentApi } from '../../../api/employment';
import { ParcelApi } from '../../../api/parcel';
import { ZoneApi } from '../../../api/zone';
import { ContainmentApi } from '../../../api/containment';
import { MixinApi } from '../../../api/mixin';
import { PersistableApi } from '../../../api/persistable';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';
import { GrammarApi } from '../../../api/grammar';
import type { ParcelOwner } from '../../../lib/parcel/ParcelRecord';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Container } from '../../../lib/spatial/Container';
import type { Containable } from '../../../lib/spatial/Containable';

/** The state's own organization — where an estate passes with nobody to pass it to. */
const TREASURY_PATH = '/compact/treasury';
const ESTATE_TOPIC = 'act.deed';

/** What one estate touch did — the caller's record, never a gauge. */
export interface EstateTouch {
  state: EstateState;
  /** The seats vacated on a return past the short clock (organization paths). */
  vacated: string[];
  /** Unclaimed property paid back on a return (minor units). */
  reclaimedMinor: number;
  /** The balance that passed on an escheat run by this touch (minor units). */
  escheatedMinor: number;
}

const DAY_MS = 86_400_000;

/**
 * The wall clock the estate reads run against — one module-private seam,
 * so a test can stub absence without waiting a month.
 */
function nowMs(): number {
  return Date.now();
}

/** Is `identityPath` a player Avatar's — the one kind an estate read applies to (D23)? */
function isAvatarIdentityPath(identityPath: string | null | undefined): boolean {
  return typeof identityPath === 'string' && identityPath.startsWith(AVATAR_IDENTITY_PREFIX);
}

/** A numeric Schedule row in days, or the floor when unwarmed / unseeded. */
function daysDial(key: string, floor: number): number {
  try {
    const raw = AppApi.setting(key);
    if (!raw) return floor;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : floor;
  } catch {
    return floor;
  }
}

const PlayerApiCallers = SecurityPolicies.AnyOf(
  SecurityPolicies.FromModule('/api/player#PlayerApi'),
  SecurityPolicies.SelfOnly
);

/**
 * PlayerLogic — the hot-reloadable logic singleton behind
 * {@link PlayerApi}.
 *
 * Lives at `/platform/idea/api/player` (a stateless-by-construction `Stuff`
 * singleton, no backing `Template`); `PlayerApi`'s public statics
 * forward here via `StuffApi.singletonSync`. Any module that grabs this
 * singleton and calls a method other than through the Api gets
 * `SecurityError`.
 *
 * The former `PlayerApi` `#`-static maps (`avatarsByPlayerId`,
 * `inFlightClones`) become ordinary `private` instance fields on the
 * singleton — TypeScript `private`, NOT `#`, because instance method
 * dispatch on a Stuff host runs through the call-security proxy and
 * `#`-private slots are unreachable through it. The avatar registry is a
 * runtime index keyed by playerId, so per-process instance state is the
 * right home (no `PostRegistrationMixin`).
 *
 * Guts-variant gate (`AnyOf(FromModule, SelfOnly)`): `loadAvatarsForUser`
 * makes an intra-singleton `this.findAvatarByPlayerId(...)` self-call, so
 * `SelfOnly` is needed alongside the `FromModule` half the facade
 * supplies.
 *
 * The gate is applied **per public method**, not at the class level —
 * see {@link MaterialLogic} for why.
 *
 * @internal
 */
@Unshadowable
export class PlayerLogic extends ApiLogic {
  /**
   * Registry of avatars by player ID. A specialized index for quick
   * avatar lookup. TS `private` (not `#`) — see the class doc.
   */
  private avatarsByPlayerId: Map<string, Avatar> = new Map();

  /**
   * Per-playerId in-flight avatar clones. Multiplexing means a user
   * can open several connections at once (and a dev React StrictMode
   * remount opens two in the same tick) — the Avatar must be cloned
   * exactly once and shared. An entry exists only while a clone is in
   * progress; concurrent connects await it instead of starting a
   * duplicate clone.
   */
  private inFlightClones: Map<string, Promise<Avatar>> = new Map();

  /** See {@link PlayerApi.isAvatarStuff}. */
  @CallSecurity(PlayerApiCallers)
  public isAvatarStuff(stuff: Stuff): stuff is Avatar {
    const path = stuff.getTemplatePath();
    return (
      path !== undefined &&
      path !== null &&
      path.startsWith(Avatar.TEMPLATE_PATH_PREFIX)
    );
  }

  /** See {@link PlayerApi.registerAvatar}. */
  @CallSecurity(PlayerApiCallers)
  public registerAvatar(avatar: Avatar): void {
    if (!avatar.getPlayerId()) {
      console.warn('PlayerApi.registerAvatar(): Avatar has no playerId');
      return;
    }

    if (this.avatarsByPlayerId.has(avatar.getPlayerId())) {
      console.warn(
        `PlayerApi.registerAvatar(): Avatar already registered for playerId ${avatar.getPlayerId()}`
      );
      return;
    }

    this.avatarsByPlayerId.set(avatar.getPlayerId(), avatar);
    const userId = avatar.getUser()?._id;
    if (userId) this.avatarsByUserId.set(userId, avatar);
  }

  /** See {@link PlayerApi.unregisterAvatar}. */
  @CallSecurity(PlayerApiCallers)
  public unregisterAvatar(avatar: Avatar): void {
    const playerId = avatar.getPlayerId();
    if (!playerId) {
      return;
    }
    // Only if THIS avatar is the one holding the slot. A playerId no
    // longer implies a unique body: a sandbox wire body reports the
    // REAL playerId (the identity thread — authority and the epistemic
    // ledgers key on the person, not the vessel) while the field avatar
    // keeps the registry slot, parked.
    //
    // Deleting by id alone meant every vessel reaped — on exit, on
    // respawn, on session close — evicted its player's real body from
    // the registry. The player then vanished from `who`, from presence,
    // from `tell`'s `online` scope; worse, the next connection found no
    // live avatar, materialized a SECOND one, and collided on the
    // persistence spine ("two live instances … both keyed"). Found
    // live: crossing once, walking out, then opening a second tab.
    const held = this.avatarsByPlayerId.get(playerId);
    if (held && held.stuffId !== avatar.stuffId) return;
    this.avatarsByPlayerId.delete(playerId);
    const userId = avatar.getUser()?._id;
    if (userId && this.avatarsByUserId.get(userId)?.stuffId === avatar.stuffId) {
      this.avatarsByUserId.delete(userId);
    }
  }

  /** See {@link PlayerApi.findAvatarByPlayerId}. */
  @CallSecurity(PlayerApiCallers)
  public findAvatarByPlayerId(playerId: string): Avatar | undefined {
    return this.avatarsByPlayerId.get(playerId);
  }

  /** See {@link PlayerApi.getAllAvatars}. */
  @CallSecurity(PlayerApiCallers)
  public getAllAvatars(): Avatar[] {
    return Array.from(this.avatarsByPlayerId.values());
  }

  /**
   * Registry of avatars by USER id — the second identity an avatar has.
   * Maintained beside `avatarsByPlayerId` by the same two writes.
   */
  private avatarsByUserId: Map<string, Avatar> = new Map();

  /** See {@link PlayerApi.findAvatarByName}. */
  @CallSecurity(PlayerApiCallers)
  public findAvatarByName(name: string): Avatar | undefined {
    const want = name.trim().toLowerCase();
    if (!want) return undefined;
    for (const avatar of this.avatarsByPlayerId.values()) {
      if (avatar.getName()?.toLowerCase() === want) return avatar;
      if (avatar.getPresentation().toLowerCase() === want) return avatar;
    }
    return undefined;
  }

  /** See {@link PlayerApi.findAvatarByUserId}. */
  @CallSecurity(PlayerApiCallers)
  public findAvatarByUserId(userId: string): Avatar | undefined {
    return this.avatarsByUserId.get(userId);
  }

  /**
   * See {@link PlayerApi.activeMemberCount}: the connected set ∪ every
   * avatar whose snapshot was written inside the short clock (economic
   * bootstrap D16). One index-answerable query over `holder_snapshots`;
   * the connected set covers a member online whose row is old.
   */
  @CallSecurity(PlayerApiCallers)
  public async activeMemberCount(): Promise<number> {
    const members = new Set<string>();
    for (const avatar of this.connectedAvatars()) {
      const key = avatar.getIdentityPath();
      if (key) members.add(key);
    }
    const cutoff = nowMs() - daysDial(AppSettingKeys.estateDormantAfterDays, 30) * DAY_MS;
    try {
      const rows = await PersistedRecord.find<PersistedRecord>({
        scope: { $regex: `^${AVATAR_IDENTITY_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}` },
        writtenAt: { $gt: cutoff },
      });
      for (const row of rows) members.add(row.getScope());
    } catch {
      // Persistence offline (a unit fixture): the connected set is the count.
    }
    return members.size;
  }

  /** See {@link PlayerApi.isAvatarIdentityPath}. */
  @CallSecurity(PlayerApiCallers)
  public isAvatarIdentityPath(identityPath: string | null | undefined): boolean {
    return isAvatarIdentityPath(identityPath);
  }

  /**
   * See {@link PlayerApi.absentForDays}: 0 for a connected avatar or a
   * never-played one; else real days since the snapshot's `writtenAt`. An
   * NPC (a non-Avatar identity) is never absent (D23).
   */
  @CallSecurity(PlayerApiCallers)
  public async absentForDays(identityPath: string): Promise<number> {
    if (!isAvatarIdentityPath(identityPath)) return 0;
    // Resident and connected → present. A resident stand-in that is not
    // an Avatar at all (a test fixture at an avatar path) is simply here.
    const live = StuffApi.findByTemplatePath(identityPath);
    if (live && !live.isDestroyed()) {
      const connected = (live as { isConnected?: () => boolean }).isConnected;
      if (typeof connected !== 'function' || connected.call(live)) return 0;
    }
    let writtenAt = 0;
    try {
      const rows = await PersistedRecord.findByScope(identityPath);
      for (const row of rows) writtenAt = Math.max(writtenAt, row.getWrittenAt());
    } catch {
      return 0;
    }
    if (writtenAt <= 0) return 0;
    return Math.max(0, (nowMs() - writtenAt) / DAY_MS);
  }

  /** See {@link PlayerApi.estateStateOf}. */
  @CallSecurity(PlayerApiCallers)
  public async estateStateOf(identityPath: string): Promise<EstateState> {
    if (!isAvatarIdentityPath(identityPath)) return 'active';
    const days = await this.absentForDays(identityPath);
    if (days >= daysDial(AppSettingKeys.estateEscheatAfterDays, 180)) return 'escheated';
    if (days >= daysDial(AppSettingKeys.estateDormantAfterDays, 30)) return 'dormant';
    return 'active';
  }

  /**
   * See {@link PlayerApi.touchEstate}. The one entry every estate act runs
   * through: at a return (`returning`), the reclaim or the vacancy; at
   * any other touch — a credit landing, a roster pass — the escheat when
   * the long clock has run and the estate has not yet passed.
   */
  @CallSecurity(PlayerApiCallers)
  public async touchEstate(
    identityPath: string,
    opts: { returning?: boolean } = {},
  ): Promise<EstateTouch> {
    const none: EstateTouch = { state: 'active', vacated: [], reclaimedMinor: 0, escheatedMinor: 0 };
    if (!isAvatarIdentityPath(identityPath)) return none;
    if (opts.returning) {
      const avatar = this.liveAvatarAt(identityPath);
      if (!avatar) return none;
      // The absence BEFORE this login: the row's clock, not the connected
      // read (which is 0 the moment they are back).
      const away = await this.rowAbsenceDays(identityPath);
      if (avatar.getEscheatedAt() > 0) {
        const paid = await ContractApi.reclaimUnclaimed(identityPath);
        avatar.setEscheatedAt(0);
        MessageApi.scene(avatar)
          .topic(ESTATE_TOPIC)
          .toSelf(
            paid > 0
              ? Mml.compose`You were away long enough for your estate to pass to the Compact. The Treasury pays you ${Money.of(paid, BankingApi.compactCurrency()).render()} — held unclaimed, reclaimed on your return.`
              : Mml.compose`You were away long enough for your estate to pass to the Compact; what it held has gone where you directed.`,
          )
          .send();
        return { state: 'escheated', vacated: [], reclaimedMinor: paid, escheatedMinor: 0 };
      }
      const clock = daysDial(AppSettingKeys.employmentAbsenceVacatesAfterDays, 14);
      if (away >= clock) {
        const vacated = await EmploymentApi.vacate(avatar);
        if (vacated.length > 0) {
          const names = vacated.map((p) => {
            const org = StuffApi.findByTemplatePath(p);
            return org ? EmploymentApi.organizationLabel(org) : p;
          });
          MessageApi.scene(avatar)
            .topic(ESTATE_TOPIC)
            .toSelf(Mml.compose`While you were away (${GrammarApi.inWords(Math.floor(away))} days) your seat at ${names.join(', ')} was vacated — the chart could not wait.`)
            .send();
        }
        return { state: away >= daysDial(AppSettingKeys.estateDormantAfterDays, 30) ? 'dormant' : 'active', vacated, reclaimedMinor: 0, escheatedMinor: 0 };
      }
      return none;
    }
    const state = await this.estateStateOf(identityPath);
    if (state !== 'escheated') return { ...none, state };
    const escheated = await this.escheat(identityPath);
    return { state, vacated: [], reclaimedMinor: 0, escheatedMinor: escheated };
  }

  /**
   * See {@link PlayerApi.escheat} — D17 in order: liens repossess, the
   * note is recovered, titles pass up the tree (or to the beneficiary),
   * use-grants are revoked, a house kept is retired and its account
   * passes, the balance passes and an UNCLAIMED row is written (or the
   * beneficiary is paid), the avatar is stamped. Idempotent: a stamped
   * avatar is left alone. Returns the balance that passed.
   */
  @CallSecurity(PlayerApiCallers)
  public async escheat(identityPath: string): Promise<number> {
    if (!isAvatarIdentityPath(identityPath)) return 0;
    const already = this.liveAvatarAt(identityPath);
    const avatar = already ?? (await this.standUpForEstate(identityPath));
    if (!avatar) return 0;
    let passed = 0;
    try {
      if (avatar.getEscheatedAt() > 0) return 0;
      const currency = BankingApi.compactCurrency();
      // (1) The liens: every loan reconciled, a default revealed repossesses.
      await ContractApi.reconcileLoans(null).catch(() => undefined);
      // (2) The note, recovered from the balance that secured it.
      await ContractApi.recoverNote(identityPath);
      // The heir: a named beneficiary who is themselves active; else the state.
      const named = avatar.getBeneficiary();
      const heir = named && (await this.estateStateOf(named)) === 'active' ? named : '';
      const heirPrimary = heir ? await BankingApi.primaryAccountIdOf(heir) : null;
      // (3) Titles: up to the parent parcel's owner, or across to the heir.
      const held = await ParcelApi.extentsHeldBy(
        async (owner) => owner.kind === 'player' && owner.templatePath === identityPath,
      );
      for (const extent of held) {
        let to: ParcelOwner = heir ? { kind: 'player', templatePath: heir } : { kind: 'organization', templatePath: TREASURY_PATH };
        if (!heir) {
          const record = await ParcelApi.coveringParcelOf(extent);
          const parent = record?.getParentParcel() ?? null;
          const above = parent ? await ParcelApi.coveringParcelOf(parent) : null;
          const owner = above?.getOwner() ?? null;
          if (owner && !(owner.kind === 'player' && owner.templatePath === identityPath)) to = owner;
        }
        await ParcelApi.transfer(extent, to).catch(() => null);
      }
      // (4) Use-grants: the dorm, a let unit — back to the institution.
      for (const unit of await ParcelApi.heldUnitsOf(identityPath)) {
        const extent = unit.getExtent();
        await ParcelApi.revokeUse(extent, identityPath).catch(() => false);
        const zone = await ZoneApi.resolveEnclosingZoneForPath(extent).catch(() => null);
        if (zone) await zone.onUseGrantRevoked(extent, identityPath).catch(() => undefined);
      }
      // (5) A house they are the entity of: its counters retired, goods to
      // the room's own shelf, its account passing like their own.
      const house = EmploymentApi.businessOfProprietor(avatar);
      if (house) {
        for (const path of house.getOperatingLocations()) {
          const counter = StuffApi.findByTemplatePath(path);
          if (!counter || !MixinApi.isContainer(counter) || !MixinApi.isContainable(counter)) continue;
          const room = counter.getContainer();
          const shelf = room && MixinApi.isContainer(room)
            ? room.getContents().find((c) => c !== counter && MixinApi.isConsignmentShelf(c) && MixinApi.isContainer(c))
            : undefined;
          if (shelf) {
            for (const good of [...counter.getContents()]) {
              ContainmentApi.move(good as unknown as Stuff & Containable, shelf as unknown as Stuff & Container);
            }
          }
          // Written down empty before it goes, so a return does not
          // materialize the shelf the estate already passed.
          if (MixinApi.isPersistable(counter)) await PersistableApi.capture(counter, identityPath).catch(() => undefined);
          await StuffApi.destruct(counter);
        }
        house.setOperatingLocations([]);
        const houseAccount = await BankingApi.primaryAccountIdOf(house.getAccountPath());
        const houseHeld = houseAccount ? BankingApi.balanceOf(houseAccount).minor : 0;
        if (houseAccount && houseHeld > 0) {
          await BankingApi.escheat(houseAccount, Money.of(houseHeld, currency), 'escheat', `escheat: ${EmploymentApi.organizationLabel(house)}`);
          passed += houseHeld;
        }
      }
      // (6) The balance: to the treasury, and either straight on to the heir
      // or held as unclaimed property — a claim the state cannot refuse.
      const primary = await BankingApi.primaryAccountIdOf(identityPath);
      const balance = primary ? BankingApi.balanceOf(primary).minor : 0;
      if (primary && balance > 0) {
        await BankingApi.escheat(primary, Money.of(balance, currency), 'escheat', 'escheat: the estate passed');
        passed += balance;
      }
      if (passed > 0) {
        if (heir && heirPrimary) {
          await BankingApi.reclaim(heirPrimary, Money.of(passed, currency), `passed: ${identityPath}'s estate, to their beneficiary`);
        } else {
          await ContractApi.writeUnclaimed(identityPath, passed);
        }
      }
      // (7) Stamped, and written down.
      avatar.setEscheatedAt(nowMs());
      await avatar.save();
    } finally {
      if (!already && !avatar.isDestroyed()) {
        await StuffApi.destruct(avatar);
      }
    }
    return passed;
  }

  /** The live, registered avatar at `identityPath`, or null. */
  private liveAvatarAt(identityPath: string): Avatar | null {
    const live = StuffApi.findByTemplatePath(identityPath);
    return live && this.isAvatarStuff(live) && !live.isDestroyed() ? live : null;
  }

  /** Days since the snapshot row was written — the row alone, connected or not. */
  private async rowAbsenceDays(identityPath: string): Promise<number> {
    let writtenAt = 0;
    try {
      for (const row of await PersistedRecord.findByScope(identityPath)) {
        writtenAt = Math.max(writtenAt, row.getWrittenAt());
      }
    } catch {
      return 0;
    }
    return writtenAt > 0 ? Math.max(0, (nowMs() - writtenAt) / DAY_MS) : 0;
  }

  /**
   * Stand an ABSENT member's avatar up for the estate's act — the login
   * path's clone (the shared seed, the identity minted, the snapshot
   * restored at `postRegister`) with no connection behind it. The caller
   * destructs it when the act is done.
   */
  private async standUpForEstate(identityPath: string): Promise<Avatar | null> {
    const playerId = identityPath.slice(AVATAR_IDENTITY_PREFIX.length);
    if (!playerId) return null;
    const { default: AvatarClass } = await import('../../agent/Avatar');
    try {
      return await StuffApi.clone<Avatar>(
        (AvatarClass as unknown as AvatarClassRef).SEED_TEMPLATE_PATH,
        { playerId },
        { asIdentityPath: identityPath },
      );
    } catch (err) {
      console.warn(`PlayerLogic.escheat: could not stand ${identityPath} up — ${String(err)}`);
      return null;
    }
  }

  /** See {@link PlayerApi.connectedAvatars}. */
  @CallSecurity(PlayerApiCallers)
  public connectedAvatars(): Avatar[] {
    const out: Avatar[] = [];
    for (const avatar of this.avatarsByPlayerId.values()) {
      if (!avatar.isDestroyed() && avatar.isConnected()) out.push(avatar);
    }
    return out;
  }

  /** See {@link PlayerApi.getAvatarCount}. */
  @CallSecurity(PlayerApiCallers)
  public getAvatarCount(): number {
    return this.avatarsByPlayerId.size;
  }

  /** See {@link PlayerApi.loadAvatarsForUser}. */
  @CallSecurity(PlayerApiCallers)
  public async loadAvatarsForUser(user: User): Promise<Avatar[]> {
    // Avatar lives in `obj/` (mudlib gameplay), which the `api/` layer
    // deliberately does not statically depend on — see
    // [architecture.md § Backend → mudlib import discipline] row 4.
    // Lazy-load to honor that discipline.
    const { default: AvatarClass } = await import('../../agent/Avatar');
    const avatars: Avatar[] = [];
    for (const playerId of user.playerIds) {
      // Reuse if already in-world (multiplexing).
      let avatar = this.findAvatarByPlayerId(playerId);
      if (!avatar) {
        // Concurrent connections for the same user (multiplexing, or a
        // dev StrictMode double-mount) can reach here before the first
        // clone has registered. Coordinate on a per-playerId in-flight
        // promise so the second connect awaits the first clone instead
        // of starting a duplicate — a duplicate hits StuffApi's "clone
        // already in flight" guard and tears down both connections.
        let pending = this.inFlightClones.get(playerId);
        if (!pending) {
          pending = this.materializeAvatar(
            AvatarClass as unknown as AvatarClassRef,
            user,
            playerId
          ).finally(() => this.inFlightClones.delete(playerId));
          this.inFlightClones.set(playerId, pending);
        }
        avatar = await pending;
      }
      avatars.push(avatar);
    }
    return avatars;
  }

  /**
   * Materialize one avatar for a returning login. The character's
   * durable state is its persistence-spine snapshot; the identity path
   * (`/platform/agent/Avatar/<playerId>`) is MINTED on the identity
   * axis (D17 — no per-player `domain` row, ever): clone the SHARED
   * seed row with the identity via `asIdentityPath`;
   * `Avatar.postRegister` materializes the snapshot over the seed
   * defaults (a roster entry with no snapshot logs in on defaults and
   * the first capture creates one).
   */
  private async materializeAvatar(
    AvatarClass: AvatarClassRef,
    user: User,
    playerId: string
  ): Promise<Avatar> {
    const identityPath = AvatarClass.getTemplatePath(playerId);
    return StuffApi.clone<Avatar>(
      AvatarClass.SEED_TEMPLATE_PATH,
      { user, playerId },
      { asIdentityPath: identityPath }
    );
  }

  /** See {@link PlayerApi.clearAll}. */
  @CallSecurity(PlayerApiCallers)
  public clearAll(): void {
    this.avatarsByPlayerId.clear();
    this.avatarsByUserId.clear();
  }
}
