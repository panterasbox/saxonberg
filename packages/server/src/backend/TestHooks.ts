/**
 * TestHooks — every backend seam that exists ONLY to support tests, in
 * one module, out of the business logic.
 *
 * The suites need four things production never does: log in without
 * Google (`authenticate`), start with a ready-to-play character instead
 * of walking char-gen (`provisionCharacter`), put that character in a
 * known room (`rehomeCharacter`), and ⭐ **move world-time**
 * (`advanceClock` / `clockNow`). Each used to live on the class it
 * borrowed from (`Backend`, `Application`); they live here so
 * `backend/` reads as the product and this file reads as the harness.
 *
 * ⭐⭐ **Why the clock is here and not in the game.** A game day is about
 * two real hours, so nothing a seasonal system does is observable to a
 * test that finishes — and the taps build first solved that by putting
 * `WorldClockApi` on the `eval` sandbox's allowlist. That was a category
 * error: it dressed *scaffolding* as an in-world authoring act, and the
 * fiction then had to explain a player who can skip a month. ⛔ Nothing
 * in the game moves the realm's clock. A test harness does, from
 * outside the fiction, through this module — which is also why the old
 * route could not work: an in-world `eval` runs inside a sandbox
 * boundary (a quarantined circle, or a parcel-bound jurisdiction), and a
 * GLOBAL clock jump is the one thing a bounded context must not do.
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
import Avatar from '../mud/lib/character/Avatar';
import PrimaryAvatar from '../mud/platform/agent/PrimaryAvatar';
import { Template } from '../mud/lib/stuff/Template';
import { SecurityApi } from '../mud/api/security';
import { TestHarnessApi, type ClockJump } from '../mud/api/test-harness';
import { ParcelApi } from '../mud/api/parcel';
import { AccessApi } from '../mud/api/access';
import { StuffApi } from '../mud/api/stuff';

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
    wizard = false,
    parcels: readonly string[] = []
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
            await TestHooks.provisionCharacter(
              id,
              handle,
              startLocation,
              wizard,
              parcels
            );
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
    wizard = false,
    parcels: readonly string[] = []
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
    if (parcels.length > 0 && user.playerIds.length > 0) {
      await TestHooks.#grantParcels(user.playerIds[0]!, parcels);
    }
  }

  /**
   * TEST-ONLY: make the test character the TITLE HOLDER of each parcel
   * named, so it can stage inside it — `eval --parcel <it>` — exactly as
   * the parcel's real holder could.
   *
   * ⭐ A GRANT, NOT A BYPASS, like the wizard groups above: the title
   * moves through `ParcelApi.transfer` (an appended `transfer` event, the
   * owner index re-pointed), so every authority check downstream runs the
   * same walk a player's does. Nothing in `AccessApi` learns about test
   * mode.
   *
   * - The path must be an EXACT parcel extent; anything else fails the
   *   login, naming the covering parcel (a wrong path should fail here,
   *   not at the first `eval` an hour later).
   * - A parcel the character already holds (a group it is in — a wizard
   *   is in every managed group — or a title it already has) is `kept`.
   * - ⚠ A transferred title is a SOLD parcel to the pack that claimed it:
   *   its next reconcile records a `conflict` and skips its rows under
   *   that extent (parcel.md § grant). A test world is reset per run.
   */
  static async #grantParcels(
    playerId: string,
    parcels: readonly string[]
  ): Promise<void> {
    const identity = Avatar.getTemplatePath(playerId);
    const [avatar] = StuffApi.findByIdentityPath(identity);
    const held = avatar ? await AccessApi.heldExtents(avatar) : [];
    for (const path of parcels) {
      const cover = ParcelApi.coveringParcelOfSync(path);
      if (!cover || cover.getExtent() !== path) {
        throw new Error(
          `TestHooks: '${path}' is not a parcel` +
            (cover
              ? `; the covering parcel is '${cover.getExtent()}' — name that`
              : ' and nothing covers it')
        );
      }
      const owner = cover.getOwner();
      const mine = owner?.kind === 'player' && owner.templatePath === identity;
      if (mine || held.some((h) => path === h || path.startsWith(`${h}/`))) {
        console.info(`TestHooks: ${identity} already holds ${path} (kept)`);
        continue;
      }
      await ParcelApi.transfer(path, { kind: 'player', templatePath: identity });
      console.info(
        `TestHooks: granted ${path} to ${identity} ` +
          `(was ${owner ? JSON.stringify(owner) : 'untitled'})`
      );
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

  /* ──────────────────────── the clock ──────────────────────── */

  /**
   * TEST-ONLY: move world-time forward by `duration`, draining every
   * schedule the skipped interval contains.
   *
   * ⭐ **Three independent gates, and they ask three different
   * questions:**
   *
   *   1. `AUTH_MODE === 'test'` — this process is a test fixture
   *      (`#assertTestMode`, below), and `Server` refuses to boot if
   *      that is ever true while `NODE_ENV === 'production'`.
   *   2. the ROUTE is mounted only in the same branch, so in an
   *      ordinary server the endpoint does not exist.
   *   3. `TestHarnessApi.advanceClock` (and `WorldClockApi.advance` under
   *      it) carries `@TestOnly`, so outside a test environment the
   *      method refuses with its own message whatever calls it.
   *
   * ⛔ And a fourth rule, not a gate: a jump past ONE GAME DAY is a span
   * step and is refused before it moves anything unless `opts.soak`
   * (sent by the wire harness under `pnpm wire:soak`).
   *
   * ⭐ `runRoot` for the same reason `authenticate` uses it —
   * `backend/**` may push call frames and `services/` may not — and it
   * matters twice here: a root frame carries **no sandbox scope and no
   * jurisdiction bound**, which is exactly what a global clock jump
   * needs and exactly what an in-world `eval` can never give it.
   *
   * @param duration game-time to skip (`'3 days'`, `'20 days'`) — the
   *   grammar `WorldClockApi.after()` takes.
   * @param opts.soak the soak lane's run — lets a jump past a day through.
   * @returns game-seconds before and after, so the caller can assert the
   *   jump landed rather than trusting a 200.
   */
  public static async advanceClock(
    duration: string,
    opts?: { soak?: boolean }
  ): Promise<ClockJump> {
    TestHooks.#assertTestMode('advanceClock');
    // ⭐ The cap (a jump past one game day is a SPAN step, refused
    // unless `soak`), the jump and the settle all live in
    // `TestHarnessApi` — the one implementation the in-world `testharness`
    // command calls too, so both doors meet the same rule once.
    return ExecutionContextApi.runRoot(TestHooks, 'advanceClock', () =>
      TestHarnessApi.advanceClock(duration, opts)
    );
  }

  /** TEST-ONLY: game-seconds now. The read half of {@link advanceClock}. */
  public static clockNow(): number {
    TestHooks.#assertTestMode('clockNow');
    return ExecutionContextApi.runRoot(TestHooks, 'clockNow', () =>
      TestHarnessApi.clockNow()
    );
  }

  /**
   * Mint a default character on the IDENTITY AXIS (residences D17 — the
   * legacy per-player-row fallback is gone): clone the SHARED seed with
   * the overlay riding `dataOverlay` and the identity minted via
   * `asIdentityPath` — exactly the embody path — and leave the avatar
   * RESIDENT. `Avatar.onCreate` installs the loadout and captures
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
    const seed = await Template.findByPath(PrimaryAvatar.ROW_TEMPLATE_PATH);
    if (!seed) {
      throw new Error(
        `TestHooks: no seed at '${PrimaryAvatar.ROW_TEMPLATE_PATH}'. Did the ` +
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
      PrimaryAvatar.ROW_TEMPLATE_PATH,
      { user, playerId },
      // identity-keyed-by: own-record — the avatar family identity, the
      // same formula `PlayerLogic.materializeAvatar` uses, so a wire
      // test's body is a person like any other. ⚠ This file is in
      // `src/backend/`, outside `lint:identity-mints`'s scan root (the
      // mudlib + pack `src/`); the marker is here for the reader.
      { dataOverlay: data, asIdentityPath: path }
    );
    await TestHooks.#dress(avatar);
    // Belt to onCreate's first capture — a second capture of a live,
    // fully-formed avatar is a cheap no-op-shaped write.
    await avatar.save();
    console.info(
      `TestHooks: provisioned test character ${path} (snapshot-backed, resident)`
    );
    return playerId;
  }

  /**
   * ⭐ Dress the test character as `embody` dresses a real one — the
   * first aspiration's outfit from `char-gen.yaml`, worn. A naked body
   * spends food on cold at room temperature (`ThermalRegulation`'s
   * cold branch), starves in ~4.5 game hours and then loses its core
   * temperature: the fishing drive's angler collapsed at the seventh
   * hour, and no player is naked. Tolerant of missing garments, as
   * `embody` is.
   *
   * ⭐ The cold branch was retuned in the envelope build (W1) and the
   * old 4.5-hour figure no longer holds — but dressing a test character
   * is still right, because a real one arrives dressed and a harness
   * that differs from the game on a body-physics input is measuring the
   * wrong world.
   */
  static async #dress(avatar: Avatar): Promise<void> {
    const { default: EmbodyController } = await import(
      '../mud/platform/idea/cmd/charactergen/EmbodyController'
    );
    const outfit = EmbodyController.loadConfig().aspirations[0]?.outfit ?? [];
    // ⭐ The recipe itself is `Character.wearGarments` since the
    // envelope build (W1), where authored NPCs needed the same thing
    // and a second copy would have been the third. This hook still
    // decides WHICH outfit a test character gets; putting it on is the
    // mudlib's.
    await avatar.wearGarments(outfit);
  }
}
