/**
 * OfficeRegistry — singleton Idea holding the office-substrate state and
 * behavior. Lives at `/obj/OfficeRegistry`, sibling to `AccessRegistry`
 * and the other singleton registries under `obj/`. The office face of `CompactApi`
 * (`api/compact.ts`, its logic singleton at `/obj/api/compact`)
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
 *     occupants" is trivial. `postRegister` does **no DB work**: it only
 *     reads the founder credential env into instance fields.
 *   - **Occupancy is founder-default + sparse handoffs.** The founder is
 *     the computed default holder of every office. The `office_holders`
 *     collection stores only explicit handoffs (empty at founding, one
 *     row per handed-off office). `holderOf` = explicit holder if a row
 *     exists, else the founder; `assign` upserts the row, `vacate`
 *     deletes it (reverting to the founder).
 *   - The **founder is identified by external credential** —
 *     `FOUNDER_GOOGLE_EMAIL` and/or `FOUNDER_TWITCH_HANDLE`, resolved
 *     through `User` ↔ `GoogleProfile`/`TwitchProfile`. Orthogonal to the
 *     `streamers` axis and the `isWizard` code-trust axis. Returns false
 *     until the founder has logged in (no matching `User` yet) —
 *     appointment is simply inert until then, which is correct.
 *
 * Resolution is **per-check** (no founder-playerId cache) so a founder
 * logging in after boot is recognized immediately; call frequency is low
 * (validator preload + roster reads).
 */

import { Idea } from '../lib/stuff/Idea';
import { PostRegistrationMixin } from '../lib/stuff/PostRegistration';
import { CallSecurity } from '../lib/security/decorators';
import { SecurityPolicies } from '../lib/security/SecurityPolicies';
import { User } from '../lib/identity/User';
import { GoogleProfile } from '../lib/identity/GoogleProfile';
import { TwitchProfile } from '../lib/identity/TwitchProfile';
import {
  Office,
  OFFICE_APPARATUS,
  type OfficeHolderResult,
  type OfficeRosterRow,
  type OfficeAssignResult,
} from '../lib/governance/Office';
import { OfficeHolder } from '../lib/governance/OfficeHolder';
import type { VetoResult } from '../lib/errors';
import type { EvictionContext } from '../lib/stuff/Stuff';

const OfficeRegistryBase = PostRegistrationMixin(Idea);

// The office face lives on CompactApi (the single meta-institution
// facade), its logic in the /obj/api/compact singleton. Admit both the
// face module and the logic singleton's template path so the Registry's
// methods stay callable only through the Compact's office surface.
const OfficeApiCallers = SecurityPolicies.AnyOf(
  SecurityPolicies.FromModule('/api/compact#CompactApi'),
  SecurityPolicies.FromTemplate('/obj/api/compact'),
);

export default class OfficeRegistry extends OfficeRegistryBase {

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
  /** Original-case display handle for offline founder presentation. */
  private founderDisplay: string | null = null;

  public override async postRegister(_context?: unknown): Promise<void> {
    const rawEmail = (process.env.FOUNDER_GOOGLE_EMAIL ?? '').trim();
    const rawHandle = (process.env.FOUNDER_TWITCH_HANDLE ?? '').trim();
    this.founderGoogleEmail =
      rawEmail.length > 0 ? rawEmail.toLowerCase() : null;
    this.founderTwitchLogin =
      rawHandle.length > 0 ? rawHandle.toLowerCase() : null;
    // Prefer the original-case Twitch handle for display, else the email.
    this.founderDisplay =
      rawHandle.length > 0
        ? rawHandle
        : rawEmail.length > 0
          ? rawEmail
          : null;
    if (this.founderGoogleEmail === null && this.founderTwitchLogin === null) {
      // Mirrors the absent-WIZARD_PLAYER_IDS degrade: with no credential
      // configured `isFounder` is always false and every office resolves
      // to "(founder unset)". The deploy contract — set the env to seat
      // the founder.
      console.warn(
        '[OfficeRegistry] neither FOUNDER_GOOGLE_EMAIL nor ' +
          'FOUNDER_TWITCH_HANDLE is set; isFounder will always be false ' +
          'and every office shows "(founder unset)" until configured.',
      );
    }
  }

  // ── Founder resolution (gated) ──

  /** True iff the player's owning `User` matches the founder credential. */
  @CallSecurity(OfficeApiCallers)
  public async isFounder(playerId: string): Promise<boolean> {
    return this.computeIsFounder(playerId);
  }

  /** The configured founder display handle (for offline presentation). */
  @CallSecurity(OfficeApiCallers)
  public founderLabel(): string {
    return this.resolveFounderLabel();
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
      founderLabel: this.resolveFounderLabel(),
    };
  }

  /** Does `playerId` hold `officeKey`? Explicit match, or founder default. */
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
    return this.computeIsFounder(id);
  }

  /** Every office key `playerId` holds (the founder's full set if no rows). */
  @CallSecurity(OfficeApiCallers)
  public async officesOf(playerId: string): Promise<string[]> {
    const id = (playerId ?? '').trim();
    if (id.length === 0) return [];
    const founder = await this.computeIsFounder(id);
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
    const label = this.resolveFounderLabel();
    const out: OfficeRosterRow[] = [];
    for (const office of OFFICE_APPARATUS) {
      const identity = office.toRosterRow();
      const row = await OfficeHolder.findByOfficeKey(office.getKey());
      const explicit = !!(row && row.holderId.length > 0);
      out.push({
        ...identity,
        holderPlayerId: explicit ? row!.holderId : null,
        isFounderDefault: !explicit,
        founderLabel: label,
      });
    }
    return out;
  }

  // ── Mutations (gated) ──

  /** Upsert the explicit-holder row (auditable replace). */
  @CallSecurity(OfficeApiCallers)
  public async assign(
    playerId: string,
    officeKey: string,
  ): Promise<OfficeAssignResult> {
    const office = Office.byKey(officeKey);
    if (!office) return { changed: false, priorHolderId: null, ok: false };
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

  private resolveFounderLabel(): string {
    return this.founderDisplay ?? '(founder unset)';
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
