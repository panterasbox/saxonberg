// SandboxLogic — the hot-reloadable logic singleton behind SandboxApi.
// (Doc comment on the class so @internal lands on the reflection.)

import { ApiLogic } from '../../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../../lib/security/decorators';
import { SecurityPolicies } from '../../../lib/security/SecurityPolicies';
import {
  Collections,
  COLLECTION_POLICIES,
} from '../../../../backend/PersistenceManager';
import { PersistApi } from '../../../api/persist';
import { SecurityApi } from '../../../api/security';
import {
  ExecutionContextApi,
  OMNI_SCOPE,
} from '../../../api/execution-context';
import { ScheduleApi, type ScheduleHandle } from '../../../api/schedule';
import { WorldClockApi } from '../../../api/worldclock';
import { MqlSubscriptionApi } from '../../../api/mql-subscription';
import { BankingApi } from '../../../api/banking';
import { PersistableApi } from '../../../api/persistable';
import { PlayerApi } from '../../../api/player';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { MixinApi } from '../../../api/mixin';
import { AppApi } from '../../../api/app';
import { AppSettingKeys } from '../../../lib/config/AppSettings';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Containable } from '../../../lib/spatial/Containable';
import type { Container } from '../../../lib/spatial/Container';
import type Avatar from '../../agent/Avatar';
import type Interactive from '../Interactive';

const SandboxApiCallers = SecurityPolicies.FromModule('/api/sandbox#SandboxApi');

/**
 * The sweeper install is also callable by the self-warming
 * `SandboxWarden` singleton (the boot()-retirement shape).
 */
const SandboxBootCallers = SecurityPolicies.AnyOf(
  SandboxApiCallers,
  SecurityPolicies.FromTemplate('/platform/idea/SandboxWarden'),
);

/**
 * One live circle session — RUNTIME state only (never persisted; a
 * restart makes every scope sessionless by construction, and the first
 * sweep discards the orphaned rows — the discard doctrine).
 *
 * `scope` is the circle's parcel path (`/home/<playerId>` /
 * `/studio/<groupId>`) — Decision A: host and guests share it, receiver
 * stamping derives from it, and discard covers crashed prior sessions of
 * the same circle for free. `id` (Decision A2: `SecurityApi.uuid()`)
 * correlates a visit's receipts and distinguishes successive sessions of
 * the same circle in diagnostics — the two are different things and are
 * never collapsed.
 */
export interface SandboxSession {
  readonly id: string;
  readonly scope: string;
  readonly circlePath: string;
  readonly hostPlayerId: string;
  /** stuffIds of the wire bodies currently inside. */
  readonly occupants: Set<string>;
  readonly startedAt: number;
}

/** The full runtime record behind a session (module-private extras). */
interface SessionState extends SandboxSession {
  /** The circle's entry room (stub circle until the wardrobe wave). */
  entryRoom: (Stuff & Container) | null;
  /** playerId → the live wire body of a visitor. */
  wireByPlayerId: Map<string, Avatar>;
  /** playerId → pending linkdead grace timer. */
  graceHandles: Map<string, ScheduleHandle>;
}

/** Default sweep cadence (real-time, the residency pattern). */
const DEFAULT_SWEEPER_INTERVAL_MS = 5 * 60 * 1000;
/** Default linkdead reconnect grace inside a circle. */
const DEFAULT_GRACE_MS = 10 * 60 * 1000;

/**
 * The sandbox merge allowlist (Decision Q): the ONLY slices that flow
 * back from a vessel at exit — the discard doctrine expressed as a
 * list. Epistemic only; material slices have no merge path.
 */
const EPISTEMIC_MERGE_ALLOWLIST: readonly string[] = ['Contacts'];

/** The STAMP collections (derived from PM's policy table; cannot drift). */
const STAMP_COLLECTIONS: readonly string[] = (
  Object.keys(COLLECTION_POLICIES) as Collections[]
).filter((c) => COLLECTION_POLICIES[c].verb === 'stamp');

/** Read an integer app setting with a fallback (unwarmed → fallback). */
function readInt(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    const n = raw === null ? NaN : parseInt(raw, 10);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback; // AppSettings not warmed (pre-boot / tests)
  }
}

/** The live session registry, keyed by scope. Module-private. */
const sessions: Map<string, SessionState> = new Map();

/** playerId → the scope of the live session their wire body is in. */
const scopeByPlayerId: Map<string, string> = new Map();

/**
 * Delete every scoped row `scope` owns, on every STAMP collection, and
 * release the runtime residue (schedule handles, clock schedules, MQL
 * subscriptions, the banking overlay). Total by construction: the
 * collection list derives from the policy table, and the per-scope
 * indexes serve the deletes.
 */
async function discardScopeImpl(scope: string): Promise<void> {
  if (PersistApi.isConnected()) {
    for (const collection of STAMP_COLLECTIONS) {
      await PersistApi.deleteMany(collection, { circleScope: scope });
    }
  }
  ScheduleApi.cancelAllForScope(scope);
  WorldClockApi.cancelAllForScope(scope);
  MqlSubscriptionApi.cancelAllForScope(scope);
  BankingApi.discardScopeOverlay(scope);
}

/**
 * The orphan sweep: discard scoped rows for any scope with no live
 * session. With no sessions ever (or after a restart), any scoped row is
 * an orphan by definition — the sweeper is total from day one. Runs
 * from field/system context, so PM's write filters don't interfere (the
 * discard filter names `circleScope` explicitly).
 */
async function sweepOrphansImpl(): Promise<string[]> {
  if (!PersistApi.isConnected()) return [];
  const orphaned = new Set<string>();
  for (const collection of STAMP_COLLECTIONS) {
    const rows = await PersistApi.find(
      collection,
      { circleScope: { $exists: true } },
      { limit: 1000 }
    );
    for (const row of rows) {
      const scope = row.circleScope;
      if (typeof scope === 'string' && !sessions.has(scope)) {
        orphaned.add(scope);
      }
    }
  }
  for (const scope of orphaned) {
    await discardScopeImpl(scope);
  }
  return [...orphaned];
}

/** The circle scope for a personal circle — the self-home parcel path. */
function circleScopeFor(playerId: string): string {
  return `/home/${playerId}`;
}

/** The circle entry-room template (generic prose; skinnable later). */
const CIRCLE_FLOOR_PATH = '/platform/location/sandbox/CircleFloor';

/**
 * Lazy circle materialization: ensure the session has its space, minted
 * UNDER THE CIRCLE-SCOPED ROOT so every room (and everything later
 * placed in one) is circle-born:
 *
 *   1. the entry room — a `CircleFloor` clone (bare Location when the
 *      template store is offline, e.g. unit tests);
 *   2. the RETURN passage (`out`) — a crossing exit whose traversal is
 *      the exit choreography (the parked body never moved, so there is
 *      no destination to resolve);
 *   3. authored truth — every Location-classed template under the
 *      circle's namespace clones back in ("exit restores the baseline"
 *      = re-materialization, not diff-undo). Cold circles need no new
 *      eviction code: rooms cull under the shipped residency rules and
 *      re-materialize on next entry.
 */
async function ensureCircle(state: SessionState): Promise<Stuff & Container> {
  if (state.entryRoom && !state.entryRoom.isDestroyed()) {
    return state.entryRoom;
  }
  const { default: CircleFloor } = await import(
    '../../location/sandbox/CircleFloor'
  );
  const { default: Location } = await import('../../../lib/stuff/Location');
  const { default: SandboxCrossingExit } = await import(
    '../../../lib/sandbox/SandboxCrossingExit'
  );
  const { Template } = await import('../../../lib/stuff/Template');
  const room = await ExecutionContextApi.runRootGuarded(
    null,
    'sandbox.ensureCircle',
    async () => {
      let entry: Stuff;
      try {
        entry = await StuffApi.clone(CIRCLE_FLOOR_PATH);
      } catch {
        // Template store offline (tests / pre-seed boot): a bare
        // CircleFloor stands in for the seeded, described one.
        entry = await StuffApi.create(() => new CircleFloor());
      }
      // The way out — a return passage on the entry room.
      if (MixinApi.isExitable(entry)) {
        const back = StuffApi.createSync(
          () =>
            new SandboxCrossingExit({
              direction: 'out',
              source: entry as unknown as Stuff & Container,
              // Presentation-level only: the exit choreography IS the
              // destination (you wake up where you left).
              destinationPath: '/',
              oneWay: true,
            })
        );
        back.setCrossingDirection('return');
        await entry.addExit(back);
      }
      // Authored truth: materialize the circle's own rooms.
      if (PersistApi.isConnected()) {
        try {
          const authored = await Template.findDescendants(state.circlePath);
          for (const tpl of authored) {
            try {
              const cls = await StuffApi.loadClassByPath(tpl.class);
              const isRoom =
                typeof cls === 'function' &&
                (cls === Location || cls.prototype instanceof Location);
              if (isRoom) await StuffApi.clone(tpl.path);
            } catch (err) {
              console.warn(
                `[sandbox] materialize skipped ${tpl.path}:`,
                (err as Error).message
              );
            }
          }
        } catch (err) {
          console.warn(
            `[sandbox] authored-truth materialization failed for ${state.circlePath}:`,
            err
          );
        }
      }
      return entry;
    },
    'rethrow',
    { circleScope: state.scope }
  );
  state.entryRoom = room as unknown as Stuff & Container;
  return state.entryRoom;
}

function openSessionImpl(
  scope: string,
  circlePath: string,
  hostPlayerId: string
): SessionState {
  const existing = sessions.get(scope);
  if (existing) return existing;
  const session: SessionState = {
    id: SecurityApi.uuid(),
    scope,
    circlePath,
    hostPlayerId,
    occupants: new Set(),
    startedAt: Date.now(),
    entryRoom: null,
    wireByPlayerId: new Map(),
    graceHandles: new Map(),
  };
  sessions.set(scope, session);
  return session;
}

/** Scopes mid-close — breaks the exit↔close recursion. */
const closingScopes = new Set<string>();

async function closeSessionImpl(scope: string): Promise<void> {
  const state = sessions.get(scope);
  if (!state || closingScopes.has(scope)) return;
  closingScopes.add(scope);
  try {
    // Exit every live occupant first (safe reap: each re-attaches at
    // their parked avatar — the non-event eviction). exitImpl's own
    // empty-set close re-enters here and no-ops on the guard.
    for (const wireBody of [...state.wireByPlayerId.values()]) {
      if (!wireBody.isDestroyed()) await exitImpl(wireBody);
    }
    for (const handle of state.graceHandles.values()) {
      ScheduleApi.cancel(handle);
    }
    for (const playerId of state.wireByPlayerId.keys()) {
      scopeByPlayerId.delete(playerId);
    }
    await discardScopeImpl(scope);
    sessions.delete(scope);
  } finally {
    closingScopes.delete(scope);
  }
}

/**
 * The ENTER choreography (Decision C + P + Q): open/join the session,
 * mint the vessel circle-born, fork the projection slices onto it,
 * park the field body (capture + presence-freeze + eviction veto), and
 * move every Interactive across.
 */
async function enterImpl(
  actor: Avatar,
  targetScope?: string
): Promise<SandboxSession> {
  const playerId = actor.getPlayerId();
  if (!playerId) {
    throw new Error('SandboxApi.enter: actor has no playerId (guests cannot cross)');
  }
  if (scopeByPlayerId.has(playerId)) {
    throw new Error('SandboxApi.enter: player is already inside a circle');
  }
  const scope = targetScope ?? circleScopeFor(playerId);
  const state = openSessionImpl(scope, scope, playerId);
  const entryRoom = await ensureCircle(state);

  // Mint the vessel + fork the slices INSIDE the circle-scoped root —
  // the induction stamps everything (the vessel, its implant floor, the
  // shadow followers) circle-born.
  const { default: WireBody } = await import('../../agent/sandbox/WireBody');
  // Read the field body's species HERE, in field context: the mint
  // below runs under the circle root, where reading the parked avatar
  // is the cross-boundary dispatch the layers deny. Species is
  // reference data (boundary-exempt), so the resolved value is safe to
  // carry across and hold from inside.
  const actorSpecies = actor.getSpecies();
  const wireBody = (await ExecutionContextApi.runRootGuarded(
    null,
    'sandbox.enter',
    async () => {
      // Species rides the constructor: the loadout inside
      // `postRegister` needs a body plan to slot the implant into, and
      // the fork below runs too late for that.
      const body = await StuffApi.create(
        () => new WireBody(playerId, actorSpecies),
        { playerId, wire: true }
      );
      await PersistableApi.forkRuntimeState(
        actor as unknown as Stuff,
        body as unknown as Stuff
      );
      ContainmentApi.move(
        body as unknown as Stuff & Containable,
        entryRoom
      );
      return body;
    },
    'rethrow',
    { circleScope: scope }
  )) as Avatar;

  // Park the field body: presence-freeze + eviction veto + a durable
  // capture so a crash-restart mid-visit can never lose real-body state.
  // The capture is best-effort with loud failure (the autosave posture):
  // an offline store must not strand the crossing, and the periodic
  // backstop rides the same seam.
  actor.setParked(true);
  await actor.save().catch((err) => {
    console.error(
      `[sandbox] park capture failed for ${playerId} (continuing):`,
      err
    );
  });

  // Transfer every Interactive (multiplexed sessions all move). The
  // transfers run under an omni root: the choreography spans both sides
  // of the boundary and is system work by definition.
  const moved: Interactive[] = [];
  ExecutionContextApi.runRoot(
    null,
    'sandbox.transfer',
    () => {
      for (const interactive of [...actor.getInteractives()]) {
        (interactive as Interactive).transferTo(wireBody);
        moved.push(interactive as Interactive);
      }
    },
    { circleScope: OMNI_SCOPE }
  );

  // Run the session ceremony on the vessel for each moved socket: the
  // client needs its connection-established payload (it re-binds cards
  // to the new body) and an auto-sense of the circle. Without this the
  // player types `go wardrobe` and the screen simply doesn't change.
  // Presence stays silent — `WireBody.announceSessionPresence` is a
  // no-op, so nobody hears a login that didn't happen.
  for (const interactive of moved) {
    await ExecutionContextApi.runRootGuarded(
      null,
      'sandbox.enterCeremony',
      () => wireBody.enter(interactive),
      'swallow',
      { circleScope: scope }
    );
    // The socket now drives a different body — re-render its cards.
    MqlSubscriptionApi.refreshForInteractive(interactive);
  }

  state.occupants.add(wireBody.stuffId);
  state.wireByPlayerId.set(playerId, wireBody);
  scopeByPlayerId.set(playerId, scope);
  return state;
}

/**
 * The EXIT choreography: re-attach Interactives to the parked field
 * body, merge the epistemic slices back, reap the vessel wholesale
 * (nothing material crosses), and — when the occupant set empties —
 * cancel the scope's continuations, discard its rows, close the
 * session.
 */
async function exitImpl(wireBody: Avatar): Promise<void> {
  const playerId = wireBody.getPlayerId();
  const scope = scopeByPlayerId.get(playerId);
  const state = scope ? sessions.get(scope) : undefined;
  // Whatever currently holds this identity's registry slot — and it may
  // not be the body that was parked here. If the FIELD body died while
  // its player was inside a circle, the death choreography already put a
  // shade in that slot (a parked avatar still reads as connected, so the
  // split ran normally). The exit then composes with no extra plumbing:
  // the player comes out as a shade, which is exactly right.
  const avatar = PlayerApi.findAvatarByPlayerId(playerId);

  const returned: Interactive[] = [];
  await ExecutionContextApi.runRootGuarded(
    null,
    'sandbox.exit',
    async () => {
      if (avatar) {
        for (const interactive of [...wireBody.getInteractives()]) {
          (interactive as Interactive).transferTo(avatar);
          returned.push(interactive as Interactive);
        }
        // Merge: epistemic only (the consumer's allowlist).
        PersistableApi.mergeRuntimeState(
          avatar as unknown as Stuff,
          wireBody as unknown as Stuff,
          EPISTEMIC_MERGE_ALLOWLIST
        );
        // `parked` stays TRUE across the re-entry ceremony below so the
        // return emits no presence event (nobody heard them leave); it
        // clears once the sockets are re-oriented.
      }
      // Reap the vessel wholesale — inventory and all.
      await StuffApi.destruct(wireBody as unknown as Stuff);
    },
    'rethrow',
    { circleScope: OMNI_SCOPE }
  );

  // Re-orient each returning socket on the field body: the client
  // re-binds its cards and the player sees the room they left. Same
  // ceremony as entering, and just as necessary — walking out must not
  // leave a blank screen either.
  for (const interactive of returned) {
    await ExecutionContextApi.runRootGuarded(
      null,
      'sandbox.exitCeremony',
      () => avatar!.enter(interactive),
      'swallow'
    );
    MqlSubscriptionApi.refreshForInteractive(interactive);
  }
  // Unpark under an omni root. `exit` is reached from the wire body's
  // own `go out`, so the ambient context is the CIRCLE — and the
  // avatar being unparked is field-resident, which is a denied
  // crossing (found live: the deny left the avatar parked forever, so
  // every later delivery forwarded to a vessel that no longer exists).
  await ExecutionContextApi.runRootGuarded(
    null,
    'sandbox.exit.unpark',
    () => {
      avatar?.setParked(false);
    },
    'rethrow',
    { circleScope: OMNI_SCOPE }
  );

  if (state) {
    state.occupants.delete(wireBody.stuffId);
    state.wireByPlayerId.delete(playerId);
    const grace = state.graceHandles.get(playerId);
    if (grace) {
      ScheduleApi.cancel(grace);
      state.graceHandles.delete(playerId);
    }
    scopeByPlayerId.delete(playerId);
    if (state.occupants.size === 0) {
      await closeSessionImpl(state.scope);
    }
  }
}

/**
 * The seeding aperture (Decision L): the ONE sanctioned cross-boundary
 * read of instance state. From inside your circle, mint a COPY of a
 * live thing you own, carrying its instance state (wear, grade,
 * personalization). The original is untouched; the copy is minted in
 * the ambient circle context, so it is circle-born and dies with the
 * discard. Ownership = chattel title (identity-keyed) or
 * own-body-carried (root container is the actor or their parked field
 * body). Scope comes from context, never a parameter.
 */
async function seedCopyImpl(actor: Avatar, target: Stuff): Promise<Stuff> {
  const scope = ExecutionContextApi.getCircleScope();
  if (scope === null || scope === OMNI_SCOPE) {
    throw new Error(
      'SandboxApi.seedCopy: only available from inside a circle'
    );
  }
  const templatePath = target.getTemplatePath();
  if (!templatePath) {
    throw new Error('SandboxApi.seedCopy: target has no template identity');
  }

  // Ownership + state read run under a system sub-root: the target is
  // field-side by design (this is the aperture), and the read is
  // capture-shaped — persistent instance fields only, never a mutation.
  const { ChattelApi } = await import('../../../api/chattel');
  const identity = actor.getIdentityPath();
  const captured = await ExecutionContextApi.runRootGuarded(
    null,
    'sandbox.seedCopy.capture',
    async () => {
      let owned = false;
      if (MixinApi.isChattel(target) && target.getChattelId()) {
        const owner = await target.chattelOwner().catch(() => null);
        owned = owner?.kind === 'player' && owner.templatePath === identity;
      }
      if (!owned && MixinApi.isContainable(target)) {
        // Own-body ownership: the actor (or their parked field body)
        // is somewhere in the target's containment chain — carried or
        // worn, however deeply nested.
        const parked = PlayerApi.findAvatarByPlayerId(actor.getPlayerId());
        let holder = target.getContainer();
        while (holder !== null && !owned) {
          owned =
            holder.stuffId === actor.stuffId ||
            (parked != null && holder.stuffId === parked.stuffId);
          holder = MixinApi.isContainable(holder)
            ? holder.getContainer()
            : null;
        }
      }
      if (!owned) {
        throw new Error(
          'SandboxApi.seedCopy: you can only seed copies of things you own'
        );
      }
      const fields: Record<string, unknown> = {};
      const names = MixinApi.getAllPersistentFields(
        target.constructor as Parameters<
          typeof MixinApi.getAllPersistentFields
        >[0]
      );
      const raw = target as unknown as Record<string, unknown>;
      for (const name of names) {
        // Never copy identity/title fields — the copy is a fresh,
        // unowned, circle-born object.
        if (name === '_chattelId') continue;
        fields[name] = raw[name];
      }
      return fields;
    },
    'rethrow',
    { circleScope: OMNI_SCOPE }
  );

  // Mint in the AMBIENT circle context (auto-stamped circle-born), then
  // reflect the captured instance state in (the Hydrator carve-out).
  const copy = await StuffApi.clone(templatePath);
  const rawCopy = copy as unknown as Record<string, unknown>;
  for (const [name, value] of Object.entries(captured!)) {
    try {
      rawCopy[name] = structuredClone(value);
    } catch {
      rawCopy[name] = value;
    }
  }
  return copy;
}

/**
 * Reconnect inside the grace window: cancel the grace timer, transfer
 * the fresh Interactive to the SAME wire body, and re-run the session
 * ceremony so the new socket gets its bootstrap payload — back in the
 * circle, where the player was.
 */
async function reconnectImpl(
  interactive: Interactive,
  playerId: string
): Promise<boolean> {
  const scope = scopeByPlayerId.get(playerId);
  const state = scope ? sessions.get(scope) : undefined;
  const wireBody = state?.wireByPlayerId.get(playerId);
  if (!state || !wireBody || wireBody.isDestroyed()) return false;
  const grace = state.graceHandles.get(playerId);
  if (grace) {
    ScheduleApi.cancel(grace);
    state.graceHandles.delete(playerId);
  }
  ExecutionContextApi.runRoot(
    null,
    'sandbox.reconnect',
    () => {
      interactive.transferTo(wireBody);
    },
    { circleScope: OMNI_SCOPE }
  );
  await ExecutionContextApi.runRootGuarded(
    null,
    'sandbox.reenter',
    () => wireBody.enter(interactive),
    'rethrow',
    { circleScope: state.scope }
  );
  return true;
}

/**
 * Decision P — a bare drop mid-visit: the wire body goes connectionless
 * but the session STAYS ALIVE for a grace window; reconnecting inside
 * it lands back on the same vessel, in the circle. Past the window the
 * visit force-exits (reap + discard) and the next login finds the
 * parked field body.
 */
function handleWireLinkdeadImpl(wireBody: Avatar): void {
  const playerId = wireBody.getPlayerId();
  const scope = scopeByPlayerId.get(playerId);
  const state = scope ? sessions.get(scope) : undefined;
  if (!state) return;
  const graceMs = readInt(AppSettingKeys.sandboxSessionGraceMs, DEFAULT_GRACE_MS);
  const handle = ScheduleApi.schedule(
    graceMs,
    () => {
      void ExecutionContextApi.runRootGuarded(
        null,
        'sandbox.graceExpired',
        async () => {
          const live = state.wireByPlayerId.get(playerId);
          if (!live || live.isConnected()) return; // reconnected — nothing to do
          await exitImpl(live);
        },
        'swallow',
        { circleScope: OMNI_SCOPE }
      );
    },
    { propagateAttribution: false }
  );
  state.graceHandles.set(playerId, handle);
}

/**
 * Decision P — a deliberate quit inside: run the exit choreography
 * FIRST (so the save runs against the real body and the logout event
 * carries the real identity), then the ordinary logout on the parked
 * avatar.
 */
async function handleWireQuitImpl(wireBody: Avatar): Promise<void> {
  const playerId = wireBody.getPlayerId();
  await exitImpl(wireBody);
  const avatar = PlayerApi.findAvatarByPlayerId(playerId);
  if (avatar) {
    avatar.setLeaveIntent(true);
    // The exit re-attached zero interactives (the socket closed), so
    // fire the ordinary linkdead path explicitly for the REAL identity.
    avatar.onLinkdead();
    void avatar.save();
  }
}

/**
 * SandboxLogic — the hot-reloadable logic singleton behind
 * {@link SandboxApi}, the sandbox (holodeck) subsystem's one logic home.
 *
 * Lives at `/platform/idea/api/sandbox` (a stateless `Stuff` singleton, no backing
 * `Template`); `SandboxApi`'s public statics forward here via
 * `StuffApi.singletonSync`. Owns the **crossing choreography**
 * (mint/park/re-attach/reap — Decisions C, P, Q), the **session
 * registry** (runtime-only), **discard-on-exit**, and the **orphan
 * sweeper**. Sub-logic is module-private free functions (the RenownLogic
 * pattern) so there are no intra-singleton `this.x()` calls to trip the
 * gate.
 *
 * @internal
 */
@Unshadowable
export class SandboxLogic extends ApiLogic {
  /** The recurring orphan-sweep handle — retained so re-install no-ops. */
  private sweeperHandle: ScheduleHandle | null = null;

  /** Install the orphan sweeper (idempotent) — armed by `SandboxWarden.warm`. */
  @CallSecurity(SandboxBootCallers)
  public installSweeper(): void {
    if (this.sweeperHandle) return;
    this.sweeperHandle = ScheduleApi.recurring(
      readInt(AppSettingKeys.sandboxSweeperIntervalMs, DEFAULT_SWEEPER_INTERVAL_MS),
      () => {
        void sweepOrphansImpl().catch((err) =>
          console.warn('[sandbox] orphan sweep failed', err)
        );
      }
    );
  }

  /** See {@link SandboxApi.sweepNow}. Returns the discarded scopes. */
  @CallSecurity(SandboxApiCallers)
  public async sweepNow(): Promise<string[]> {
    return sweepOrphansImpl();
  }

  /** See {@link SandboxApi.discardScope}. */
  @CallSecurity(SandboxApiCallers)
  public async discardScope(scope: string): Promise<void> {
    await discardScopeImpl(scope);
  }

  /** See {@link SandboxApi.sessionForScope}. */
  @CallSecurity(SandboxApiCallers)
  public sessionForScope(scope: string): SandboxSession | null {
    return sessions.get(scope) ?? null;
  }

  /** See {@link SandboxApi.liveSessionForPlayer}. */
  @CallSecurity(SandboxApiCallers)
  public liveSessionForPlayer(playerId: string): SandboxSession | null {
    const scope = scopeByPlayerId.get(playerId);
    return scope ? (sessions.get(scope) ?? null) : null;
  }

  /** See {@link SandboxApi.activeBodyFor}. */
  @CallSecurity(SandboxApiCallers)
  public activeBodyFor(playerId: string): Avatar | null {
    const scope = scopeByPlayerId.get(playerId);
    if (!scope) return null;
    return sessions.get(scope)?.wireByPlayerId.get(playerId) ?? null;
  }

  /** See {@link SandboxApi.openSession}. */
  @CallSecurity(SandboxApiCallers)
  public openSession(
    scope: string,
    circlePath: string,
    hostPlayerId: string
  ): SandboxSession {
    return openSessionImpl(scope, circlePath, hostPlayerId);
  }

  /** See {@link SandboxApi.closeSession}. */
  @CallSecurity(SandboxApiCallers)
  public async closeSession(scope: string): Promise<void> {
    await closeSessionImpl(scope);
  }

  /** See {@link SandboxApi.enter}. */
  @CallSecurity(SandboxApiCallers)
  public async enter(
    actor: Avatar,
    targetScope?: string
  ): Promise<SandboxSession> {
    return enterImpl(actor, targetScope);
  }

  /** See {@link SandboxApi.exit}. */
  @CallSecurity(SandboxApiCallers)
  public async exit(wireBody: Avatar): Promise<void> {
    return exitImpl(wireBody);
  }

  /** See {@link SandboxApi.seedCopy}. */
  @CallSecurity(SandboxApiCallers)
  public async seedCopy(actor: Avatar, target: Stuff): Promise<Stuff> {
    return seedCopyImpl(actor, target);
  }

  /** See {@link SandboxApi.reconnect}. */
  @CallSecurity(SandboxApiCallers)
  public async reconnect(
    interactive: Interactive,
    playerId: string
  ): Promise<boolean> {
    return reconnectImpl(interactive, playerId);
  }

  /** See {@link SandboxApi.handleWireLinkdead}. */
  @CallSecurity(SandboxApiCallers)
  public handleWireLinkdead(wireBody: Avatar): void {
    handleWireLinkdeadImpl(wireBody);
  }

  /** See {@link SandboxApi.handleWireQuit}. */
  @CallSecurity(SandboxApiCallers)
  public async handleWireQuit(wireBody: Avatar): Promise<void> {
    return handleWireQuitImpl(wireBody);
  }

  /** The circle's entry room (test/inspection surface). @internal */
  @CallSecurity(SandboxApiCallers)
  public entryRoomForScope(scope: string): Stuff | null {
    return sessions.get(scope)?.entryRoom ?? null;
  }


  /**
   * See {@link SandboxApi.runScoped}. The sanctioned root-level scope
   * assignment (this singleton is the frame-mutator): `fn` runs on a
   * fresh root carrying `parcelPath` as circle scope — the four layers
   * contain it; scoped side-effects discard with the circle session,
   * or with the orphan sweep when none is live (run-and-discard).
   */
  @CallSecurity(SandboxApiCallers)
  public async runScoped<T>(
    parcelPath: string,
    fn: () => T | Promise<T>
  ): Promise<T> {
    return (await ExecutionContextApi.runRootGuarded(
      null,
      'sandbox.runScoped',
      fn,
      'rethrow',
      { circleScope: parcelPath }
    )) as T;
  }

  /**
   * See {@link SandboxApi.runGoverned}. `fn` runs on a fresh root
   * carrying `parcelPath` as the JURISDICTION BOUND (Decision K):
   * writes are real, dispatch outside the extent denies with receipts.
   */
  @CallSecurity(SandboxApiCallers)
  public async runGoverned<T>(
    parcelPath: string,
    fn: () => T | Promise<T>
  ): Promise<T> {
    return (await ExecutionContextApi.runRootGuarded(
      null,
      'sandbox.runGoverned',
      fn,
      'rethrow',
      { jurisdictionBound: parcelPath }
    )) as T;
  }
}
