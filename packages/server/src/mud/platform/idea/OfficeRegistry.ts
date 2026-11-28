/**
 * OfficeRegistry — singleton Idea holding the office-substrate state and
 * behavior. Lives at `/platform/idea/OfficeRegistry`, sibling to `AccessRegistry`
 * and the other singleton registries under `obj/`. The office face of `CompactApi`
 * (`api/compact.ts`, its logic singleton at `/platform/idea/api/compact`)
 * are the only legitimate callers — every public method carries
 * `@CallSecurity(OfficeApiCallers)` so the security gate denies any other
 * module's call. External code that grabs the Registry via
 * `StuffApi.findByTemplatePath` gets a reference but `SecurityError` on
 * any method call. The narrow-entry pattern: one state home (this Stuff),
 * one calling surface (`CompactApi`'s office face), one structurally-enforced path.
 *
 * Modeled on `AccessRegistry`, minus all seeding:
 *
 *   - The **apparatus** (`OFFICE_APPARATUS`) is an authored code constant
 *     — there is nothing to seed and "re-seeding never clobbers
 *     occupants" is trivial. `onCreate` does **no DB work**: it only
 *     reads the founder credential env into instance fields.
 *   - **Occupancy is founder-default + sparse handoffs.** The founder
 *     account's **Compact character** is the computed default holder of
 *     every office — a character, never the account, so the founder's other
 *     characters hold no default seat. The `office_holders`
 *     collection stores only explicit handoffs (empty at founding, one
 *     row per handed-off office). `holderOf` = explicit holder if a row
 *     exists, else the founder; `assign` upserts the row, `vacate`
 *     deletes it (reverting to the founder).
 *   - The **founder is identified by external credential** —
 *     `FOUNDER_GOOGLE_EMAIL` and/or `FOUNDER_TWITCH_HANDLE`, resolved
 *     through `User` ↔ `GoogleProfile`/`TwitchProfile`. Orthogonal to the
 *     `streamers` axis and the `isWizard` code-trust axis. Returns false
 *     until the founder has logged in (no matching `User` yet) —
 *     appointment is simply inert until then, which is correct. The
 *     credential is the RECOGNIZER only: it is never a label (no email or
 *     handle reaches any output — front-page-sources D9).
 *
 * Resolution is **per-check** (no founder-playerId cache) so a founder
 * logging in after boot is recognized immediately; call frequency is low
 * (validator preload + roster reads).
 */

import { Idea } from '../../lib/stuff/Idea';
import { CallSecurity } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import { User } from '../../lib/identity/User';
import { GoogleProfile } from '../../lib/identity/GoogleProfile';
import { TwitchProfile } from '../../lib/identity/TwitchProfile';
import {
  Office,
  OFFICE_APPARATUS,
  type OfficeHolderResult,
  type OfficeRosterRow,
  type OfficeAssignResult,
} from '../../lib/governance/Office';
import { OfficeHolder } from '../../lib/governance/OfficeHolder';
import type { VetoResult } from '../../lib/errors';
import type { EvictionContext } from '../../lib/stuff/Stuff';

import type { BoundaryRole } from '../../lib/security/BoundaryRole';
const OfficeRegistryBase = Idea;

// The office face lives on CompactApi (the single meta-institution
// facade), its logic in the /platform/idea/api/compact singleton. Admit both the
// face module and the logic singleton's template path so the Registry's
// methods stay callable only through the Compact's office surface.
const OfficeApiCallers = SecurityPolicies.AnyOf(
  SecurityPolicies.FromModule('/api/compact#CompactApi'),
  SecurityPolicies.FromTemplate('/platform/idea/api/compact'),
);

export default class OfficeRegistry extends OfficeRegistryBase {
  /**
   * engine bookkeeping that happens to be Stuff-shaped: a registry holds the framework's own index, not world state anybody stands in.
   *
   * ⭐ Declared, not enumerated. This was one of twenty-seven
   * template-path strings in `api/security.ts`, listed there
   * *"because each is a singleton rather than a class of many"* —
   * which a static on the class makes irrelevant. See
   * `lib/security/BoundaryRole.ts`.
   */
  static boundaryRole: BoundaryRole = 'infrastructure';


  /**
   * Residency veto - a load-bearing process-lifetime singleton is
   * never culled by the self-eviction sweep.
   */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'system singleton; never culled' };
  }
  /** Founder Google email, lowercased at warm (null = unconfigured). */
  private founderGoogleEmail: string | null = null;
  /** Founder Twitch login (lowercased handle), at warm (null = unset). */
  private founderTwitchLogin: string | null = null;

  public override async onCreate(_context?: unknown): Promise<void> {
    const rawEmail = (process.env.FOUNDER_GOOGLE_EMAIL ?? '').trim();
    const rawHandle = (process.env.FOUNDER_TWITCH_HANDLE ?? '').trim();
    this.founderGoogleEmail =
      rawEmail.length > 0 ? rawEmail.toLowerCase() : null;
    this.founderTwitchLogin =
      rawHandle.length > 0 ? rawHandle.toLowerCase() : null;
    if (this.founderGoogleEmail === null && this.founderTwitchLogin === null) {
      // Mirrors the absent-WIZARD_PLAYER_IDS degrade: with no credential
      // configured `isFounder` is always false and every office resolves
      // to a default seat nobody is in. The deploy contract — set the env
      // to seat the founder.
      console.warn(
        '[OfficeRegistry] neither FOUNDER_GOOGLE_EMAIL nor ' +
          'FOUNDER_TWITCH_HANDLE is set; isFounder will always be false ' +
          'and every default seat is empty until configured.',
      );
    }
  }

  // ── Founder resolution (gated) ──

  /** True iff the player's owning `User` matches the founder credential. */
  @CallSecurity(OfficeApiCallers)
  public async isFounder(playerId: string): Promise<boolean> {
    return this.computeIsFounder(playerId);
  }

  // ── Occupancy reads (gated) ──

  /** Who holds an office: explicit handed-off holder, else the founder. */
  @CallSecurity(OfficeApiCallers)
  public async holderOf(officeKey: string): Promise<OfficeHolderResult> {
    const office = Office.byKey(officeKey);
    if (!office) return { kind: 'unknown', officeKey };
    const row = await OfficeHolder.findByOfficeKey(office.getKey());
    if (row && row.holderId.length > 0) {
      return {
        kind: 'explicit',
        officeKey: office.getKey(),
        holderPlayerId: row.holderId,
      };
    }
    return {
      kind: 'founder',
      officeKey: office.getKey(),
      holderPlayerId: await this.founderSeatHolder(),
    };
  }

  /**
   * Does `playerId` hold `officeKey`? Explicit match, or — on the founder
   * default — is it the founder account's Compact character. ⚠ The
   * founder's OTHER characters do not hold the default seats: offices seat
   * characters, never accounts (front-page-sources D7).
   */
  @CallSecurity(OfficeApiCallers)
  public async holdsOffice(
    playerId: string,
    officeKey: string,
  ): Promise<boolean> {
    const office = Office.byKey(officeKey);
    if (!office) return false;
    const id = (playerId ?? '').trim();
    if (id.length === 0) return false;
    const row = await OfficeHolder.findByOfficeKey(office.getKey());
    if (row && row.holderId.length > 0) return row.holderId === id;
    return (await this.founderSeatHolder()) === id;
  }

  /**
   * Every office key `playerId` holds — every default seat when it is the
   * founder's Compact character, plus its handed-off ones.
   */
  @CallSecurity(OfficeApiCallers)
  public async officesOf(playerId: string): Promise<string[]> {
    const id = (playerId ?? '').trim();
    if (id.length === 0) return [];
    const founder = (await this.founderSeatHolder()) === id;
    const out: string[] = [];
    for (const office of OFFICE_APPARATUS) {
      const row = await OfficeHolder.findByOfficeKey(office.getKey());
      if (row && row.holderId.length > 0) {
        if (row.holderId === id) out.push(office.getKey());
      } else if (founder) {
        out.push(office.getKey());
      }
    }
    return out;
  }

  /** The public transparency surface: every office + its current holder. */
  @CallSecurity(OfficeApiCallers)
  public async roster(): Promise<OfficeRosterRow[]> {
    const founderSeat = await this.founderSeatHolder();
    const out: OfficeRosterRow[] = [];
    for (const office of OFFICE_APPARATUS) {
      const identity = office.toRosterRow();
      const row = await OfficeHolder.findByOfficeKey(office.getKey());
      const explicit = !!(row && row.holderId.length > 0);
      out.push({
        ...identity,
        holderPlayerId: explicit ? row!.holderId : founderSeat,
        isFounderDefault: !explicit,
      });
    }
    return out;
  }

  // ── Mutations (gated) ──

  /**
   * Upsert the explicit-holder row (auditable replace). A write: whether
   * `playerId` MAY be seated is the Compact's question, asked before this
   * (`CompactLogic`, D10).
   */
  @CallSecurity(OfficeApiCallers)
  public async assign(
    playerId: string,
    officeKey: string,
  ): Promise<OfficeAssignResult> {
    const office = Office.byKey(officeKey);
    if (!office) {
      return {
        ok: false,
        reason: 'no-such-name',
        facts: {
          what: officeKey,
          noun: 'office',
          offered: OFFICE_APPARATUS.map((o) => o.getDisplayName()).join(', '),
        },
      };
    }
    const id = (playerId ?? '').trim();
    if (id.length === 0) {
      return { changed: false, priorHolderId: null, ok: true };
    }
    const existing = await OfficeHolder.findByOfficeKey(office.getKey());
    if (existing) {
      const prior = existing.holderId.length > 0 ? existing.holderId : null;
      if (prior === id) {
        return { changed: false, priorHolderId: prior, ok: true };
      }
      existing.holderId = id;
      await existing.save();
      return { changed: true, priorHolderId: prior, ok: true };
    }
    const row = new OfficeHolder();
    row.officeKey = office.getKey();
    row.holderId = id;
    await row.save();
    // priorHolderId null = the seat was on the founder default.
    return { changed: true, priorHolderId: null, ok: true };
  }

  /** Delete the handoff row → revert to the founder default. */
  @CallSecurity(OfficeApiCallers)
  public async vacate(officeKey: string): Promise<boolean> {
    const office = Office.byKey(officeKey);
    if (!office) return false;
    const row = await OfficeHolder.findByOfficeKey(office.getKey());
    if (!row || !row._id) return false; // already on the founder default
    await row.delete();
    return true;
  }

  // ── Private helpers (ungated — internal callers route here, never the
  // gated public methods, since an intra-singleton self-call resolves the
  // caller to this Registry, which is outside the office-face allowlist) ──

  /**
   * ⭐ The founder default's holder (D7): the founder account's Compact
   * character, found from the configured credential (the profile, then the
   * account that links it) — or `null` while the founder has never signed
   * in or has no character. Per check, like `isFounder`, so a designation
   * change moves every default seat with no write.
   */
  private async founderSeatHolder(): Promise<string | null> {
    const user = await this.founderUser();
    return user?.compactCharacterId() ?? null;
  }

  private async founderUser(): Promise<User | null> {
    if (this.founderGoogleEmail !== null) {
      const profiles = await GoogleProfile.find<GoogleProfile>({
        email: this.founderGoogleEmail,
      });
      for (const profile of profiles) {
        if (!profile._id) continue;
        const [user] = await User.find<User>({ googleProfileId: String(profile._id) });
        if (user) return user;
      }
    }
    if (this.founderTwitchLogin !== null) {
      const profiles = await TwitchProfile.find<TwitchProfile>({
        login: this.founderTwitchLogin,
      });
      for (const profile of profiles) {
        if (!profile._id) continue;
        const [user] = await User.find<User>({ twitchProfileId: String(profile._id) });
        if (user) return user;
      }
    }
    return null;
  }

  private async computeIsFounder(playerId: string): Promise<boolean> {
    const id = (playerId ?? '').trim();
    if (id.length === 0) return false;
    const user = await this.resolveUserForPlayer(id);
    if (!user) return false;
    return this.userMatchesFounder(user);
  }

  private async resolveUserForPlayer(playerId: string): Promise<User | null> {
    const users = await User.find<User>({ playerIds: playerId });
    return users.length > 0 && users[0] ? users[0] : null;
  }

  private async userMatchesFounder(user: User): Promise<boolean> {
    if (this.founderGoogleEmail !== null && user.googleProfileId) {
      const profile = await GoogleProfile.findById(user.googleProfileId);
      if (
        profile &&
        profile.email.toLowerCase() === this.founderGoogleEmail
      ) {
        return true;
      }
    }
    if (this.founderTwitchLogin !== null && user.twitchProfileId) {
      const profile = await TwitchProfile.findById(user.twitchProfileId);
      // TwitchProfile.login is already the lowercased handle.
      if (profile && profile.login === this.founderTwitchLogin) {
        return true;
      }
    }
    return false;
  }

  /** Singleton refusal (mirrors RecipeCatalogue / AccessRegistry). */
  public canDestruct(): VetoResult {
    return {
      ok: false,
      reason:
        'OfficeRegistry is a system singleton and cannot be destructed; ' +
        'use forceDestruct (admin-gated) if you really mean it',
    };
  }
}
