/**
 * Application - Game logic coordinator singleton
 *
 * Responsibilities:
 * - User connection lifecycle (handleUserConnect, handleUserDisconnect)
 * - Message routing between client and game
 * - Initial game state (starting location - future)
 * - User/Player creation and lookup
 *
 * Does NOT:
 * - Track connections (that's ConnectionManager's job)
 * - Track all objects (that's StuffApi's job)
 * - Handle I/O directly (that's Backend's job)
 * - Manage database (that's PersistenceManager's job)
 *
 * This is a singleton - only one instance exists per application.
 */

import type { IBackend } from './IBackend';
import type {
  AuthProvider,
  Envelope,
  EnvelopeTemplate,
  MessageFrame,
  PassportGoogleProfile,
  PassportTwitchProfileWithTokens,
} from '@saxonberg/types';
import { PersistenceManager, Collections } from './PersistenceManager';
import { ConnectionManager } from './ConnectionManager';
import { BroadcastFeed } from './BroadcastFeed';
import { setClientStateUpdatePush } from '../mud/lib/connection/HasInteractive';
import type Interactive from '../mud/obj/Interactive';
import Login from '../mud/obj/Login';
import { MqlSubscriptionApi } from '../mud/api/mql-subscription';
import { ForumsApi } from '../mud/api/forums';
import { ReactionApi } from '../mud/api/reaction';
import { PromptApi } from '../mud/api/prompt';
import { User } from '../mud/lib/identity/User';
import { TwitchProfile } from '../mud/lib/identity/TwitchProfile';
import { GoogleProfile } from '../mud/lib/identity/GoogleProfile';
import { TemplateApi } from '../mud/api/template';
import { StuffApi } from '../mud/api/stuff';
import { AppApi } from '../mud/api/app';
import { AppSettingKeys } from '../mud/lib/config/AppSettings';
import Avatar from '../mud/obj/Avatar';
import { Template } from '../mud/lib/stuff/Template';
import { SecurityApi } from '../mud/api/security';
import { CallSecurity } from '../mud/lib/security/decorators';
import { SecurityPolicies } from '../mud/lib/security/SecurityPolicies';
import {
  inboundHandlers,
  type InboundClientMessage,
} from './inbound/index';

/**
 * The OAuth profile shapes the provider-parameterized find-or-create /
 * link paths accept — one per provider. The spine branches on the
 * `provider` argument, narrowing the union at the profile-upsert seam.
 */
export type ProviderProfile =
  | PassportGoogleProfile
  | PassportTwitchProfileWithTokens;

/**
 * Outcome of {@link Application.linkProvider}. `collision` carries the
 * clear refusal message; the route surfaces it on the redirect.
 */
export type LinkResult =
  | { status: 'linked' }
  | { status: 'already-linked' }
  | { status: 'collision'; message: string };

/**
 * Outcome of {@link Application.unlinkProvider}. `only-provider` carries
 * the at-least-one-invariant message.
 */
export type UnlinkResult =
  | { status: 'unlinked' }
  | { status: 'not-linked' }
  | { status: 'only-provider'; message: string };

/**
 * Sets the class-default policy for Application's instance methods to
 * `Public`. Backend wraps every entry call site in
 * `ExecutionContextApi.runRoot(Backend, ...)`, so the live frame at
 * Application's top is the network → Application root frame; this
 * decorator is a forward-compatible declaration of intent rather than
 * a runtime intercept (instance methods on Application aren't
 * proxy-mediated). Per-method `@CallSecurity(...)` on any specific
 * Application method would override.
 */
@CallSecurity(SecurityPolicies.Public)
export class Application {
  private static instance: Application;

  private backend: IBackend | null = null;

  private constructor() {}

  public static get(): Application {
    if (!this.instance) {
      this.instance = new Application();
    }
    return this.instance;
  }

  public initialize(backend: IBackend): void {
    this.backend = backend;
    // Wire the strategy-injected `client-state-update` push so
    // HasInteractiveMixin can reach Application without importing
    // it (import cycle would break Login's module-eval-time
    // `HasInteractiveMixin(Idea)` call). See setClientStateUpdatePush
    // in `mud/lib/connection/HasInteractive.ts`.
    setClientStateUpdatePush((interactive, key, value) =>
      this.sendClientStateUpdateToInteractive(interactive, key, value),
    );
    console.info('Application: Initialized with Backend');
  }

  /**
   * Send a `MessageFrame` to a specific Interactive's client. Sole
   * gateway for game objects to reach Backend — Application owns
   * Backend communication. Stamps `meta.frameId` per-Interactive at
   * send-time so multi-device Avatars receive monotonic streams from
   * each Interactive's perspective.
   *
   * Error / auth notifications (raw `{type, payload}` shapes) go
   * directly through `Backend.sendMessageToSocket` and bypass this
   * chokepoint — they're not Sensor-pipeline frames and have no
   * `frameId` to stamp.
   */
  public sendMessageToInteractive(
    interactive: Interactive,
    frame: MessageFrame,
  ): void {
    const socketId = interactive.getSocketId();
    if (!this.backend || !socketId) return;
    const frameId = interactive.nextFrameId();
    const stamped: MessageFrame = {
      ...frame,
      meta: { ...frame.meta, frameId },
    };
    this.backend.sendMessageToSocket(socketId, stamped);

    // Reaction gutter ring: when a reactable-act frame lands, remember
    // its (frameId → commandId) for this Interactive so `react --msg <n>`
    // resolves server-side, and register the per-player reaction sink so
    // the fixed-cadence delta can reach this witness. Cheap map lookups;
    // skips every non-reactable frame.
    const commandId = frame.meta.commandId;
    if (
      commandId !== undefined &&
      ReactionApi.isReactableTopic(frame.topic) &&
      ReactionApi.isReactableAct(commandId)
    ) {
      ReactionApi.registerInteractive(interactive);
      ReactionApi.noteDeliveredFrame(interactive, frameId, commandId);
    }
  }

  /**
   * Envelope counterpart to {@link sendMessageToInteractive}. Stamps
   * `frameId` per-Interactive from the same `Interactive.nextFrameId`
   * counter used for prose frames — one ordering primitive across all
   * server→client traffic.
   */
  public sendEnvelopeToInteractive(
    interactive: Interactive,
    template: EnvelopeTemplate
  ): void {
    const socketId = interactive.getSocketId();
    if (!this.backend || !socketId) return;
    const stamped: Envelope = {
      ...template,
      frameId: interactive.nextFrameId(),
    } as Envelope;
    this.backend.sendEnvelopeToSocket(socketId, stamped);
  }

  /**
   * Server→client push of a `ClientStateMixin` key. Used when the
   * server mutates an overlay-shaped client-state key out-of-band
   * (the `style` verb is the v1 caller); the client receives the
   * authoritative value and re-renders without waiting on the
   * reconnect snapshot. Sibling of {@link sendMessageToInteractive}
   * — bypasses the Sensor pipeline (no frame, no `frameId`); it's
   * wire-substrate plumbing, not narrative.
   */
  public sendClientStateUpdateToInteractive(
    interactive: Interactive,
    key: string,
    value: unknown,
  ): void {
    const socketId = interactive.getSocketId();
    if (!this.backend || !socketId) return;
    this.backend.sendMessageToSocket(socketId, {
      type: 'client-state-update',
      payload: { key, value },
    });
  }

  /**
   * Handle user connection. Loads the authenticated User, spins up an
   * Interactive, and hands off to Login to run the entry procedure.
   *
   * The read-only broadcast principal (`isBroadcast`) short-circuits
   * before any of that: no User load, no Interactive, no Login, no
   * Avatar — it's registered with the `BroadcastFeed` as a pure push
   * target. With no Interactive in the connection registry it can never
   * run a command (`processUserMessage` finds no holder) and is never
   * routed game traffic.
   */
  public async handleUserConnect(
    userId: string,
    sessionId: string,
    socketId: string,
    isBroadcast = false
  ): Promise<void> {
    if (!this.backend) {
      console.error('Application: Backend not initialized');
      return;
    }

    if (isBroadcast) {
      console.info(
        `Application: broadcast connection - userId=${userId}, socketId=${socketId}`,
      );
      BroadcastFeed.get().addConnection(socketId);
      return;
    }

    try {
      console.info(`Application: User connecting - userId=${userId}, socketId=${socketId}`);

      // Anonymous (guest) principal: `anon:<nanoid>`, no persisted
      // account. Build an ephemeral, never-saved User the rest of the
      // connect path consumes unchanged; `Login.enter` reads
      // `user.anonymous` to mint a throwaway guest avatar. (Auth axis —
      // distinct from the avatar's `isGuest`.)
      let user: User | null;
      if (userId.startsWith(User.ANONYMOUS_PREFIX)) {
        user = new User();
        user._id = userId;
        user.anonymous = true;
      } else {
        user = await User.findById(userId);
      }
      if (!user) {
        throw new Error(`Application: User ${userId} not found`);
      }

      const interactive = await ConnectionManager.get().createInteractive(
        socketId,
        sessionId,
        user
      );

      const login = await StuffApi.create(() => new Login(interactive));
      await login.enter();
    } catch (error) {
      console.error('Application: Error in handleUserConnect:', error);

      if (this.backend) {
        this.backend.sendMessageToSocket(socketId, {
          type: 'error',
          payload: {
            message: 'Failed to connect user',
            error: error instanceof Error ? error.message : String(error),
          },
        });
      }
    }
  }

  public handleUserDisconnect(socketId: string): void {
    console.info(`Application: User disconnecting - socketId=${socketId}`);

    // Broadcast connections live only in the feed's set (no Interactive).
    // Cheap no-op for normal sockets.
    BroadcastFeed.get().removeConnection(socketId);

    // Tear down per-Interactive substrate state BEFORE removing the
    // Interactive so any final substrate-side delivery still has a
    // live Interactive to address.
    //
    // Order:
    //   1. MQL subscriptions (silent in v1; cancelled-reason
    //      envelopes ship from a later subsystem).
    //   2. Prompts (PromptApi rejects pending awaits with
    //      PromptCancelledError { reason: 'host-disconnected' };
    //      controllers' try/catch can react before the Interactive
    //      goes away).
    //   3. removeInteractive (below).
    const interactive = ConnectionManager.get().getInteractive(socketId);
    if (interactive) {
      MqlSubscriptionApi.cancelAllForInteractive(interactive);
      ForumsApi.cancelAllForInteractive(interactive);
      ReactionApi.cancelAllForInteractive(interactive);
      PromptApi.cancelAll(interactive, 'host-disconnected');
    }

    const removed = ConnectionManager.get().removeInteractive(socketId);

    if (removed) {
      console.info(`Application: User disconnected successfully`);
    } else {
      console.warn(`Application: No Interactive found for socket ${socketId}`);
    }
  }

  /**
   * Dispatch an inbound wire message. Resolves the Interactive,
   * looks up the handler in `inboundHandlers`, and invokes it
   * with a `HandlerContext`. Handler bodies live in
   * `backend/inbound/<substrate>.ts` — adding a new message type
   * means adding a handler file there and registering it in
   * `inbound/index.ts`. Do not grow this method.
   */
  public async processUserMessage(
    socketId: string,
    message: InboundClientMessage,
  ): Promise<void> {
    const interactive = ConnectionManager.get().getInteractive(socketId);
    if (!interactive) {
      console.warn(`Application: No Interactive found for socket ${socketId}`);
      return;
    }
    if (!this.backend) {
      console.error('Application: Backend not initialized');
      return;
    }

    const handler = inboundHandlers[message.type];
    if (!handler) {
      console.warn(`Application: Unknown message type: ${message.type}`);
      this.backend.sendMessageToSocket(socketId, {
        type: 'error',
        payload: { message: `Unknown message type: ${message.type}` },
      });
      return;
    }

    // Await the handler so the caller's per-socket serialization chain
    // (and the enclosing `runRoot` frame) span the command's full async
    // dispatch, not just the synchronous prefix. Rejections are logged,
    // not rethrown — one bad command must not wedge the socket's chain.
    try {
      await handler(
        { socketId, interactive, backend: this.backend, application: this },
        message,
      );
    } catch (error) {
      console.error(
        `Application: inbound '${message.type}' error for socket ${socketId}:`,
        error,
      );
    }
  }

  /**
   * Find or create User + provider profile from an OAuth profile. The
   * provider-parameterized spine: adding a provider is this argument,
   * not a code fork. For new users, the roster starts empty (char-gen
   * owns character creation). Returns the User's id.
   */
  public async findOrCreateUserFromProvider(
    provider: AuthProvider,
    profile: ProviderProfile
  ): Promise<string> {
    try {
      const profileId = await this.findOrCreateProfile(provider, profile);
      const userId = await this.findOrCreateUser(provider, profileId);
      return userId;
    } catch (error) {
      console.error(
        'Application: Error in findOrCreateUserFromProvider:',
        error
      );
      throw error;
    }
  }

  /**
   * Backwards-compatible Google delegate — the test-auth seam and any
   * Google-specific caller route through here. Forwards to the
   * provider-parameterized path with `provider: 'google'`.
   */
  public async findOrCreateUserFromGoogle(
    profile: PassportGoogleProfile
  ): Promise<string> {
    return this.findOrCreateUserFromProvider('google', profile);
  }

  /**
   * Upsert the provider profile and return its id. Google goes through
   * raw PM saves (login-only, no secrets). Twitch routes through the
   * `TwitchProfile` Document so the `EncryptedStringMarshaller` runs and
   * the OAuth tokens never reach Mongo in plaintext.
   */
  private async findOrCreateProfile(
    provider: AuthProvider,
    profile: ProviderProfile
  ): Promise<string> {
    if (provider === 'twitch') {
      return this.findOrCreateTwitchProfile(
        profile as PassportTwitchProfileWithTokens
      );
    }
    return this.findOrCreateGoogleProfile(profile as PassportGoogleProfile);
  }

  private async findOrCreateGoogleProfile(
    profile: PassportGoogleProfile
  ): Promise<string> {
    const existing = await PersistenceManager.get().find(
      Collections.GoogleProfiles,
      { googleId: profile.id }
    );

    const fields = {
      googleId: profile.id,
      email: profile.emails?.[0]?.value || '',
      displayName: profile.displayName,
      givenName: profile.name?.givenName,
      familyName: profile.name?.familyName,
      photoUrl: profile.photos?.[0]?.value,
      rawProfile: profile._json,
      updatedAt: new Date(),
    };

    if (existing.length === 0) {
      const id = await PersistenceManager.get().save(Collections.GoogleProfiles, {
        ...fields,
        createdAt: new Date(),
      });
      console.info(`Application: Created new GoogleProfile ${id}`);
      return id;
    }

    const first = existing[0]!;
    const id = first._id as string;
    await PersistenceManager.get().save(Collections.GoogleProfiles, {
      ...fields,
      _id: id,
      createdAt: first.createdAt,
    });
    console.debug(`Application: Updated GoogleProfile ${id}`);
    return id;
  }

  /**
   * Upsert a `TwitchProfile`. Routes through the Document (not a raw PM
   * save) so the token fields run through `EncryptedStringMarshaller` —
   * the access/refresh tokens are written ciphertext-at-rest.
   */
  private async findOrCreateTwitchProfile(
    profile: PassportTwitchProfileWithTokens
  ): Promise<string> {
    const existing = await TwitchProfile.findByTwitchUserId(profile.id);
    const doc = existing ?? new TwitchProfile();

    doc.twitchUserId = profile.id;
    doc.login = profile.login;
    doc.displayName = profile.displayName;
    doc.email = profile.email;
    doc.rawProfile = profile._json;
    doc.accessToken = profile.accessToken;
    doc.refreshToken = profile.refreshToken;
    doc.expiresAt = profile.expiresAt;
    doc.scopes = profile.scopes;

    await doc.save();
    if (existing) {
      console.debug(`Application: Updated TwitchProfile ${doc._id}`);
    } else {
      console.info(`Application: Created new TwitchProfile ${doc._id}`);
    }
    return doc._id!;
  }

  private async findOrCreateUser(
    provider: AuthProvider,
    profileId: string
  ): Promise<string> {
    const field = User.profileFieldFor(provider);
    const existing = await User.find({ [field]: profileId });

    if (existing.length > 0) {
      const user = existing[0]!;
      console.debug(`Application: Found existing User ${user._id}`);
      return user._id!;
    }

    const user = new User();
    user[field] = profileId;
    await user.save();
    console.info(`Application: Created new User ${user._id}`);

    // Char-gen owns character creation now: signup mints ZERO avatars.
    // A new user starts with an empty roster (`playerIds: []`); on first
    // login the empty roster routes them into char-gen (the `enroll`
    // flow), which forks the per-character template at commit. The
    // provider profile name survives on the User/Profile only as the
    // seed for the name suggester. See docs/plans/char-gen-plan.md (A1).
    return user._id!;
  }

  /**
   * Provider-agnostic default avatar name read at account creation. A
   * throwaway (char-gen overwrites it), but a Twitch-origin user must
   * not fall to `'Unnamed'`. Google: `givenName ?? displayName`;
   * Twitch: `displayName ?? login`.
   */
  public static defaultAvatarNameFor(
    provider: AuthProvider,
    profile: ProviderProfile
  ): string {
    if (provider === 'twitch') {
      const t = profile as PassportTwitchProfileWithTokens;
      return t.displayName || t.login || 'Unnamed';
    }
    const g = profile as PassportGoogleProfile;
    return g.name?.givenName || g.displayName || 'Unnamed';
  }

  /**
   * Resolve the persisted profile id for a provider identity **without**
   * creating or mutating it — used by {@link linkProvider} so the
   * collision check runs before any upsert. Returns null if no profile
   * exists for that identity yet.
   */
  private async findProfileIdByIdentity(
    provider: AuthProvider,
    profile: ProviderProfile
  ): Promise<string | null> {
    if (provider === 'twitch') {
      const existing = await TwitchProfile.findByTwitchUserId(
        (profile as PassportTwitchProfileWithTokens).id
      );
      return existing?._id ?? null;
    }
    const existing = await PersistenceManager.get().find(
      Collections.GoogleProfiles,
      { googleId: (profile as PassportGoogleProfile).id }
    );
    const first = existing[0];
    return first ? (first._id as string) : null;
  }

  /**
   * Attach a provider profile to an existing `User` (authenticated link
   * flow). Data-integrity logic lives here, not in a route handler:
   *   - profile unowned        → attach          → `linked`
   *   - profile already on user → no-op           → `already-linked`
   *   - profile owned elsewhere → refuse, no write → `collision`
   * No merge: a collision is refused with a clear message.
   */
  public async linkProvider(
    userId: string,
    provider: AuthProvider,
    profile: ProviderProfile
  ): Promise<LinkResult> {
    const field = User.profileFieldFor(provider);

    // Resolve the EXISTING profile by provider identity and check
    // ownership *before* any upsert, so a collision never overwrites
    // another user's profile or tokens (the requirement's "no merge, no
    // data mutation").
    const existingProfileId = await this.findProfileIdByIdentity(
      provider,
      profile
    );
    if (existingProfileId) {
      const owners = await User.find({ [field]: existingProfileId });
      const owner = owners[0];
      if (owner && owner._id !== userId) {
        return {
          status: 'collision',
          message: 'That account is already linked to another login.',
        };
      }
    }

    // Safe to upsert: the profile is unowned or already this user's.
    const profileId = await this.findOrCreateProfile(provider, profile);
    const user = await User.findById(userId);
    if (!user) {
      throw new Error(`Application.linkProvider: no user ${userId}`);
    }
    if (user[field] === profileId) {
      return { status: 'already-linked' };
    }

    user[field] = profileId;
    await user.save();
    console.info(
      `Application: Linked ${provider} profile ${profileId} to User ${userId}`
    );
    return { status: 'linked' };
  }

  /**
   * Detach a provider from an existing `User` and delete the orphaned
   * profile (with its stored tokens). The collision-refuse rule
   * guarantees single ownership, so deletion is safe.
   *   - not linked              → no-op           → `not-linked`
   *   - removal would orphan    → refuse           → `only-provider`
   *   - otherwise clear + delete                   → `unlinked`
   */
  public async unlinkProvider(
    userId: string,
    provider: AuthProvider
  ): Promise<UnlinkResult> {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error(`Application.unlinkProvider: no user ${userId}`);
    }
    const field = User.profileFieldFor(provider);
    const profileId = user[field];

    if (!profileId) {
      return { status: 'not-linked' };
    }

    // At-least-one invariant: refuse to remove the sole provider.
    const otherField =
      field === 'googleProfileId' ? 'twitchProfileId' : 'googleProfileId';
    if (!user[otherField]) {
      return {
        status: 'only-provider',
        message:
          'Cannot unlink your only login provider — link another first.',
      };
    }

    user[field] = undefined;
    await user.save();

    // Delete the orphaned Profile Document (removes the stored tokens).
    if (provider === 'twitch') {
      const doc = await TwitchProfile.findById(profileId);
      if (doc) await doc.delete();
    } else {
      const doc = await GoogleProfile.findById(profileId);
      if (doc) await doc.delete();
    }

    console.info(
      `Application: Unlinked ${provider} profile ${profileId} from User ${userId}`
    );
    return { status: 'unlinked' };
  }

  /**
   * Fork a per-user avatar template from the seed avatar at
   * `Avatar.SEED_TEMPLATE_PATH` (initial doc seeded from
   * `seeds/obj/Avatar/seed.yaml`; thereafter the live Mongo doc is
   * source of truth). Class, hydratorClass, and starting data come
   * from the seed; the user's name/surname overlay on top.
   * Runtime-only fields (`user`, `playerId`) are stamped later by
   * `Avatar.postRegister` from the clone context.
   *
   * @returns the generated playerId (template path:
   * `/obj/Avatar/<playerId>`)
   */
  private async createDefaultAvatarTemplate(
    name: string,
    surname?: string
  ): Promise<string> {
    const seed = await Template.findByPath(Avatar.SEED_TEMPLATE_PATH);
    if (!seed) {
      throw new Error(
        `Application.createDefaultAvatarTemplate: no seed at ` +
          `'${Avatar.SEED_TEMPLATE_PATH}'. Did SeederManager run?`
      );
    }

    const playerId = SecurityApi.uuid();
    const path = Avatar.getTemplatePath(playerId);
    const data: Record<string, unknown> = {
      ...seed.data,
      // Initial spawn home from app config (the seed YAML no longer
      // carries a startLocation literal).
      startLocation: AppApi.setting(AppSettingKeys.defaultStartLocation),
      name,
    };
    if (surname) data.surname = surname;

    await TemplateApi.saveTemplate(
      path,
      seed.class,
      data,
      seed.hydratorClass
    );
    console.info(`Application: Created avatar template at ${path}`);
    return playerId;
  }

  /**
   * TEST-ONLY: give a user a ready-to-play default character so in-world
   * E2E tests don't have to walk char-gen first. Mirrors the retired
   * signup auto-mint (human, lobby, seed defaults), named from the test
   * handle. Backs the test-auth seam's `withCharacter` option. Gated on
   * `AUTH_MODE === 'test'`; idempotent (no-op if the user already owns a
   * character).
   */
  public async provisionTestCharacter(
    userId: string,
    name = 'Tester'
  ): Promise<void> {
    if (process.env.AUTH_MODE !== 'test') {
      throw new Error('Application.provisionTestCharacter: test-only');
    }
    const user = await User.findById(userId);
    if (!user) {
      throw new Error(`Application.provisionTestCharacter: no user ${userId}`);
    }
    if (user.playerIds.length > 0) return;
    const playerId = await this.createDefaultAvatarTemplate(name);
    user.playerIds.push(playerId);
    await user.save();
  }
}

