/**
 * TestHooks — every backend seam that exists ONLY to support tests, in
 * one module, out of the business logic.
 *
 * The E2E suite needs three things production never does: log in
 * without Google (`authenticate`), start with a ready-to-play character
 * instead of walking char-gen (`provisionCharacter`), and put that
 * character in a known room (`rehomeCharacter`). Each used to live on
 * the class it borrowed from (`Backend`, `Application`); they live here
 * so `backend/` reads as the product and this file reads as the harness.
 *
 * SAFETY — these are auth and authority bypasses, defended in depth:
 *   1. `TestAuthRoutes` (the only caller) is mounted ONLY when
 *      `AUTH_MODE === 'test'` (see `Server`), never in production.
 *   2. Every entry point here independently refuses unless
 *      `AUTH_MODE === 'test'`.
 *   3. `Server` throws on boot if `AUTH_MODE === 'test'` while
 *      `NODE_ENV === 'production'`.
 *
 * Authority is a GRANT, NOT A BYPASS — deliberately. Nothing in
 * `AccessApi` learns about test mode: the test character is simply a
 * member of the groups that already hold title, and every downstream
 * check runs the same walk a player's does. A `if (testMode) return
 * true` short-circuit inside the access spine would be smaller and much
 * worse, because tests would then exercise a DIFFERENT authorization
 * path than players do — and access regressions would become invisible
 * to exactly the suite meant to catch them. Here, if the rules break,
 * the tests break.
 */

import type { PassportGoogleProfile } from '@saxonberg/types';
import type { Application } from './Application';
import { ExecutionContextApi } from '../mud/api/execution-context';
import { User } from '../mud/lib/identity/User';
import { Group } from '../mud/lib/social/Group';
import { PlayerApi } from '../mud/api/player';
import { AppApi } from '../mud/api/app';
import { AppSettingKeys } from '../mud/lib/config/AppSettings';
import Avatar from '../mud/platform/agent/Avatar';
import { Template } from '../mud/lib/stuff/Template';
import { SecurityApi } from '../mud/api/security';

export class TestHooks {
  /** The one gate every hook runs first. */
  static #assertTestMode(where: string): void {
    if (process.env.AUTH_MODE !== 'test') {
      throw new Error(`TestHooks.${where}: test-only`);
    }
  }

  /**
   * Build a deterministic synthetic Google profile for test-mode login.
   * The fixed `id` (`e2e:<handle>`) makes user/avatar creation
   * idempotent across runs.
   */
  public static syntheticProfile(handle: string): PassportGoogleProfile {
    const safe =
      handle.replace(/[^a-z0-9_-]/gi, '').toLowerCase() || 'default';
    return {
      id: `e2e:${safe}`,
      displayName: handle,
      emails: [{ value: `${safe}@e2e.local`, verified: true }],
      provider: 'google',
      _raw: '',
      _json: {},
    };
  }

  /**
   * TEST-ONLY authentication. Mints a session user for a deterministic
   * synthetic profile, bypassing Google OAuth. Mirrors
   * `Backend.handleProviderAuth('google', …)` exactly — same `runRoot`
   * root frame, same provider-parameterized creation path, same
   * `done(null, { id })` shape — so the resulting session and Avatar
   * are indistinguishable from a real login.
   *
   * `runRoot` is called from here because `backend/**` may push call
   * frames and `services/` may not.
   *
   * @param handle - stable label → deterministic user/avatar (idempotent)
   * @param done - same callback shape as the OAuth verify path
   */
  public static async authenticate(
    app: Application,
    handle: string,
    done: (error: unknown, user?: { id: string }) => void,
    withCharacter = false,
    startLocation?: string,
    wizard = false
  ): Promise<void> {
    if (process.env.AUTH_MODE !== 'test') {
      done(new Error('TestHooks: test authentication is disabled'));
      return;
    }
    try {
      const profile = TestHooks.syntheticProfile(handle);
      const userId = await ExecutionContextApi.runRoot(
        TestHooks,
        'authenticate',
        async () => {
          // The seam stays Google-shaped — passes provider: 'google'
          // through the same provider-parameterized creation path.
          const id = await app.findOrCreateUserFromProvider('google', profile);
          // Optionally provision a ready character so in-world E2E tests
          // skip char-gen. char-gen specs omit this (0 chars → intake).
          if (withCharacter) {
            await TestHooks.provisionCharacter(id, handle, startLocation, wizard);
          }
          return id;
        }
      );
      done(null, { id: userId });
    } catch (error) {
      console.error('TestHooks: error in authenticate:', error);
      done(error);
    }
  }

  /**
   * TEST-ONLY: give a user a ready-to-play default character so in-world
   * E2E tests don't have to walk char-gen first. Mirrors the retired
   * signup auto-mint (human, lobby, seed defaults), named from the test
   * handle. Idempotent (no-op if the user already owns a character).
   *
   * With `wizard`, the character joins EVERY managed group — a test
   * character needs authority wherever the thing under test lives, and
   * the set of groups is whatever the installed packs declared
   * (`requires.groups`), never a list kept here. The founder already
   * heads the executive (which holds the platform) with no grant at all;
   * what the groups add is the sub-titles they hold (`/world/lounge`,
   * `/arcana`, …), under which nearest-parcel wins for `can`, plus the
   * three axis groups (`wizards` — code trust, `streamers`,
   * `archwizards`). Same member-key rule the `wizard` verb uses.
   */
  public static async provisionCharacter(
    userId: string,
    name = 'Tester',
    startLocation?: string,
    wizard = false
  ): Promise<void> {
    TestHooks.#assertTestMode('provisionCharacter');
    const user = await User.findById(userId);
    if (!user) {
      throw new Error(`TestHooks.provisionCharacter: no user ${userId}`);
    }
    if (user.playerIds.length === 0) {
      const playerId = await TestHooks.#createDefaultCharacter(
        user,
        name,
        undefined,
        startLocation
      );
      user.playerIds.push(playerId);
      await user.save();
    } else if (startLocation) {
      await TestHooks.rehomeCharacter(user, startLocation);
    }
    if (wizard && user.playerIds.length > 0) {
      const { GroupApi } = await import('../mud/api/group');
      const reg = await GroupApi.registry();
      const provider = reg.managed();
      const memberKey = Avatar.getTemplatePath(user.playerIds[0]!);
      for (const group of await Group.find({})) {
        if (!group._id) continue;
        if (group.addMember(memberKey, 'member')) {
          await group.save();
          provider.fireChange(group._id);
        }
      }
    }
  }

  /**
   * TEST-ONLY: move an EXISTING test character to `startLocation`.
   *
   * `startLocation` used to apply only when the character was created,
   * which quietly made every spec that passes one order-dependent. A
   * fixed handle (`founder`, `boss`) keeps the character the previous
   * spec left behind — and the room it left it in — so two sessions that
   * both asked for the same start room were NOT co-located, and anything
   * `reachable`-scoped between them failed. The suite saw this as two
   * tests that pass alone and fail together.
   *
   * Rewriting the template row does NOT fix it: an Avatar is
   * snapshot-backed, so a returning login restores its recorded `place`
   * and the row is never consulted. Verified directly — a second login
   * asking for a different room stayed exactly where it was. The live
   * object is the only thing that decides where `enter` finds you, so
   * the live object is what moves.
   *
   * `applyStartLocation` is the same Phase-2 applier the clone pipeline
   * uses, so a Warren ref lands in its host and a room ref is
   * singleton-or-cloned — one landing rule, not a second one for tests.
   */
  public static async rehomeCharacter(
    user: User,
    startLocation: string
  ): Promise<void> {
    TestHooks.#assertTestMode('rehomeCharacter');
    const playerId = user.playerIds[0];
    if (!playerId) return;
    let avatar = PlayerApi.findAvatarByPlayerId(playerId);
    if (!avatar) {
      // Not resident (evicted, or a cold server). Materializing here is
      // safe and idempotent: the avatar is keyed by its identity path,
      // so the `play` that follows finds this same instance.
      const loaded = await PlayerApi.loadAvatarsForUser(user);
      avatar = loaded.find((a) => a.getPlayerId() === playerId);
    }
    if (!avatar) return;
    await avatar.applyStartLocation(startLocation);
    console.info(
      `TestHooks: re-homed test character ${playerId} to ${startLocation}`
    );
  }

  /**
   * Mint a default character on the IDENTITY AXIS (residences D17 — the
   * legacy per-player-row fallback is gone): clone the SHARED seed with
   * the overlay riding `dataOverlay` and the identity minted via
   * `asIdentityPath` — exactly the enroll path — and leave the avatar
   * RESIDENT. `Avatar.postRegister` installs the loadout and captures
   * the first snapshot; the `play` that follows multiplexes onto the
   * live instance, so nothing is torn down and nothing can re-capture a
   * mid-teardown avatar (the failure the old headless
   * clone-capture-destruct shape had).
   *
   * @returns the generated playerId (identity path:
   * `/platform/agent/Avatar/<playerId>`)
   */
  static async #createDefaultCharacter(
    user: User,
    name: string,
    surname?: string,
    startLocation?: string
  ): Promise<string> {
    const seed = await Template.findByPath(Avatar.SEED_TEMPLATE_PATH);
    if (!seed) {
      throw new Error(
        `TestHooks: no seed at '${Avatar.SEED_TEMPLATE_PATH}'. Did the ` +
          `platform pack install?`
      );
    }
    const playerId = SecurityApi.uuid();
    const path = Avatar.getTemplatePath(playerId);
    const data: Record<string, unknown> = {
      ...seed.data,
      // Initial spawn home: an explicit override (co-location E2E avatars
      // land in a stable singleton room, bypassing the elastic lounge
      // Warren) else the app-config default.
      startLocation:
        startLocation ?? AppApi.setting(AppSettingKeys.defaultStartLocation),
      name,
    };
    if (surname) data.surname = surname;
    const { StuffApi } = await import('../mud/api/stuff');
    const avatar = await StuffApi.clone<Avatar>(
      Avatar.SEED_TEMPLATE_PATH,
      { user, playerId },
      { dataOverlay: data, asIdentityPath: path }
    );
    // Belt to postRegister's first capture — a second capture of a live,
    // fully-formed avatar is a cheap no-op-shaped write.
    await avatar.save();
    console.info(
      `TestHooks: provisioned test character ${path} (snapshot-backed, resident)`
    );
    return playerId;
  }
}
