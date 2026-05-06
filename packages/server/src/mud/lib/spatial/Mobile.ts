/**
 * MobileMixin — locomotion for creatures and vehicles.
 *
 * Mobile owns movement messaging. The mover composes the Scene at
 * `world.narration.movement` (when an Exit is in hand) or
 * `world.narration.teleport` (no exit). Scene.send() auto-stamps
 * `commandId` / `causingCommandId` from the active ExecutionContext,
 * so a `go north` command and any aftermath the mover triggers all
 * carry the same attribution.
 *
 * Optional override hooks let game content tailor the message bodies
 * without rewriting the full announcement:
 *
 *   - `Exit.messageOut` / `Exit.messageIn` (Liquid template with
 *     `{{ mover }}` available) — simplest path, applies to a single exit.
 *   - `Exitable.getDepartureMessage?(mover, exit)` /
 *     `Exitable.getArrivalMessage?(mover, exit)` returning
 *     `{ self?, peers? }` — fine-grained, per-location overrides.
 *   - `Container.getTeleportOutMessage?(mover)` /
 *     `Container.getTeleportInMessage?(mover)` returning
 *     `{ self?, peers? }` — used when there is no Exit (teleport, admin
 *     placement).
 *
 * Resolution precedence: messageOut/messageIn → location hook → Mobile
 * defaults. Anything missing in a hook's return falls back to Mobile's
 * default for that audience.
 *
 * Base-class constraint: the Base must already produce
 * `Stuff & Containable` instances. A mobile thing that cannot be
 * contained is nonsensical.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Container } from './Container';
import type { Containable } from './Containable';
import type { VetoResult } from '../errors';
import type { Exitable } from './Exitable';
import type { Exit } from './Exit';
import { MixinApi } from '../../api/mixin';
import { ContainmentApi, ContainmentError } from '../../api/containment';
import { MessageApi } from '../../api/message';
import { Mml } from '../../api/mml';
import { ProseApi } from '../../api/prose';
import { NavigationApi } from '../../api/navigation';
import {
  resolveSetting,
  SettingTypes,
  type SettingsSchemaEntry,
} from '../shell/Environment';

/**
 * Public shape provided by MobileMixin.
 *
 * Witness hooks (optional methods) — fire from `Mobile.traverse`
 * around the inner `ContainmentApi.move`. The Containable/Container
 * hooks fire from inside that move; the traversal hooks here add the
 * exit-aware layer on top.
 */
export interface Mobile {
  traverse(exit: Exit, mode: string): Promise<void>;
  teleport(destination: Stuff & Container, opts?: TeleportOptions): void;
  announceDeparture(from: Stuff & Container, exit?: Exit): void;
  announceArrival(to: Stuff & Container, exit?: Exit): void;

  /** Optional pre-traversal veto on the mover. */
  canTraverse?(via: Exit): VetoResult;
  /** Fired after the mover has crossed `via`. */
  onTraversed?(via: Exit): void;
}

/**
 * Options for `teleport`. Default is to narrate; pass `silent: true`
 * for paths that intentionally suppress narration (login spawn, admin
 * placement).
 */
export interface TeleportOptions {
  silent?: boolean;
}

/**
 * Bodies returned by movement-message resolution. Either or both may
 * be absent — Mobile fills in defaults for any audience the resolver
 * skipped.
 */
export interface MovementBodies {
  self?: Mml;
  peers?: Mml;
}

/**
 * Optional hook on a source/destination location. Implementations
 * decide how to render movement for that specific space. Anything
 * they don't supply gets Mobile's default.
 */
export interface MovementHookProvider {
  getDepartureMessage?(mover: Stuff, exit: Exit): MovementBodies;
  getArrivalMessage?(mover: Stuff, exit: Exit): MovementBodies;
  getTeleportOutMessage?(mover: Stuff): MovementBodies;
  getTeleportInMessage?(mover: Stuff): MovementBodies;
}

export function MobileMixin<TBase extends MixinConstructor<Stuff & Containable>>(Base: TBase) {
  return class MobileMixin extends Base {
    static _mixinName = 'MobileMixin';

    /**
     * Commands the mover itself supplies — locomotion and door
     * interaction. Anything with MobileMixin (Avatar today; NPCs,
     * vehicles in future) automatically gains `go`, `open`, and
     * `close`.
     */
    static commandProvider = {
      self: ['go.yaml', 'open.yaml', 'close.yaml'],
      environment: [],
      inventory: [],
      peers: [],
    };

    /**
     * Movement-message templates. Schema-defaulted; player-overridable
     * via the `settings` command on Avatars (which compose
     * EnvironmentMixin); NPCs render at the schema default through
     * `resolveSetting`'s non-Environment fallback. Liquid syntax —
     * see `docs/subsystems/prose.md`.
     */
    static settings: SettingsSchemaEntry[] = [
      {
        key: 'movement.defaultMode',
        type: SettingTypes.String,
        default: 'walk',
        description:
          'Default locomotion verb the `go` command dispatches under ' +
          'when no explicit mode is given. Explicit verbs (`run`, ' +
          '`climb`, …) override per-call.',
      },
      {
        key: 'messages.movement.departSelf',
        type: SettingTypes.String,
        default: 'You leave to the {{ direction }}.',
        description: 'Message you see when you leave a room.',
      },
      {
        key: 'messages.movement.departPeers',
        type: SettingTypes.String,
        default: '{{ mover }} leaves to the {{ direction }}.',
        description: 'Message peers see when you leave a room.',
      },
      {
        key: 'messages.movement.arriveSelf',
        type: SettingTypes.String,
        default:
          'You arrive{% if direction %} from the {{ direction }}{% endif %}.',
        description: 'Message you see when arriving in a room.',
      },
      {
        key: 'messages.movement.arrivePeers',
        type: SettingTypes.String,
        default:
          '{{ mover }} arrives{% if direction %} from the {{ direction }}{% endif %}.',
        description: 'Message peers see when you arrive in a room.',
      },
      {
        key: 'messages.movement.teleportOutSelf',
        type: SettingTypes.String,
        default: 'The world dissolves around you.',
        description: 'Message you see when teleporting out.',
      },
      {
        key: 'messages.movement.teleportOutPeers',
        type: SettingTypes.String,
        default: '{{ mover }} vanishes.',
        description: 'Message peers see when you teleport out.',
      },
      {
        key: 'messages.movement.teleportInSelf',
        type: SettingTypes.String,
        default: 'You materialize.',
        description: 'Message you see when teleporting in.',
      },
      {
        key: 'messages.movement.teleportInPeers',
        type: SettingTypes.String,
        default: '{{ mover }} appears out of nowhere.',
        description: 'Message peers see when you teleport in.',
      },
    ];

    /**
     * Traverse an `Exit`. Two-layer hook dispatch:
     *
     *   - Traversal layer (this method): `canTraverse` on the mover,
     *     `canExit` on the source location, `canEnter` on the
     *     destination location — all fire before announcement and the
     *     containment move. After the move: `onTraversed` (mover),
     *     `onExited` (source), `onEntered` (destination).
     *   - Containment layer: fires from inside `ContainmentApi.move`.
     *     `canMove` / `onMoved` on the item; `canRemove*` /
     *     `canAdd*` / `on*` on the source/destination.
     *
     * The Phase 7 contract stands: the caller has already validated
     * traversal via `exit.canTraverse(this)` — that's the door's
     * "is this passable?" gate. The new Witness hooks layer
     * additional pre-move vetos, not a replacement.
     */
    async traverse(
      this: Stuff & Containable & Mobile,
      exit: Exit,
      mode: string
    ): Promise<void> {
      // TODO(locomotion): mode threads through but isn't wired into
      // narration ('walks in', 'runs in', 'climbs down') or per-exit
      // validation (a 'climb' exit may reject 'walk') yet. The mode
      // taxonomy and downstream consumption land in a future phase.
      void mode;
      const mover = this;
      const source = exit.getSource();
      // Lazy-resolve the destination via the singleton cache. For Exits
      // authored with a live ref this is a no-op; for path-only exits
      // it routes through `StuffApi.singleton(path)` which clones if
      // needed.
      const destination = await exit.resolveDestination();

      // Traversal-time fallback for the mutual-exit invariant. Fires
      // only when the source has at least one exit still awaiting
      // verification — typically a neighbor that hadn't loaded when
      // the source's postRegister verifier ran. Settled exits are
      // tracked individually and don't trigger this re-check.
      if (MixinApi.isExitable(source) && source.hasPendingVerification()) {
        source.verifyOutboundExits();
      }

      // Pre-move traversal vetoes.
      assertVeto(callTraverseHook(this, 'canTraverse', [exit]), 'canTraverse');
      if (MixinApi.isExitable(source)) {
        assertVeto(
          callTraverseHook(source, 'canExit', [mover, exit]),
          'canExit'
        );
      }
      if (MixinApi.isExitable(destination)) {
        assertVeto(
          callTraverseHook(destination, 'canEnter', [mover, exit]),
          'canEnter'
        );
      }

      this.announceDeparture(source, exit);
      ContainmentApi.move(mover, destination);
      this.announceArrival(destination, exit);

      // Post-move traversal notifications.
      if (MixinApi.isExitable(source)) {
        callTraverseHook(source, 'onExited', [mover, exit]);
      }
      if (MixinApi.isExitable(destination)) {
        callTraverseHook(destination, 'onEntered', [mover, exit]);
      }
      callTraverseHook(this, 'onTraversed', [exit]);
    }

    /**
     * Instantly move to a container. Default: narrate departure (if
     * the mover had a previous environment) and arrival. Pass
     * `{ silent: true }` to suppress both.
     *
     * `silent: true` is what Login spawning uses — newly-cloned
     * avatars shouldn't be announced as "vanishing" from nowhere or
     * "appearing out of thin air" before a player has even seen the
     * location.
     */
    teleport(destination: Stuff & Container, opts?: TeleportOptions): void {
      const silent = opts?.silent ?? false;
      const previous = (this as unknown as Containable).getContainer();
      if (!silent && previous) {
        this.announceDeparture(previous, undefined);
      }
      ContainmentApi.move(this as unknown as Stuff & Containable, destination);
      if (!silent) {
        this.announceArrival(destination, undefined);
      }
    }

    /**
     * Compose and dispatch the departure scene. Mover is the Scene
     * actor; `from` is mover's current environment for the duration
     * of this call.
     */
    announceDeparture(from: Stuff & Container, exit?: Exit): void {
      const bodies = this.resolveDepartureMessage(from, exit);
      this.dispatchMovementScene(bodies, exit);
    }

    /**
     * Compose and dispatch the arrival scene. Mover has just been
     * moved into `to` — its environment is now `to`.
     */
    announceArrival(to: Stuff & Container, exit?: Exit): void {
      const bodies = this.resolveArrivalMessage(to, exit);
      this.dispatchMovementScene(bodies, exit);
    }

    /**
     * Departure-message resolver. Override in subclasses to change
     * the precedence chain or inject defaults; per-location overrides
     * should go on the location via `getDepartureMessage`.
     */
    protected resolveDepartureMessage(
      from: Stuff & Container,
      exit?: Exit
    ): MovementBodies {
      const self = this as unknown as Stuff;

      // 1. Custom messageOut on the Exit.
      const messageOut = exit?.getMessageOut();
      if (messageOut) {
        const fragment = ProseApi.format(messageOut, {
          mover: Mml.name(self),
        });
        return { self: fragment, peers: fragment };
      }

      // 2. Per-location hook with an Exit in hand.
      const fromHook = (from as MovementHookProvider).getDepartureMessage;
      if (exit && typeof fromHook === 'function') {
        const result = fromHook.call(from, self, exit);
        return {
          self: result.self ?? this.defaultDepartureSelf(exit),
          peers: result.peers ?? this.defaultDeparturePeers(exit),
        };
      }

      // 3. Per-location hook for a teleport-out (no Exit).
      const teleportHook = (from as MovementHookProvider).getTeleportOutMessage;
      if (!exit && typeof teleportHook === 'function') {
        const result = teleportHook.call(from, self);
        return {
          self: result.self ?? this.defaultTeleportOutSelf(),
          peers: result.peers ?? this.defaultTeleportOutPeers(),
        };
      }

      // 4. Mobile defaults.
      return {
        self: exit
          ? this.defaultDepartureSelf(exit)
          : this.defaultTeleportOutSelf(),
        peers: exit
          ? this.defaultDeparturePeers(exit)
          : this.defaultTeleportOutPeers(),
      };
    }

    /**
     * Arrival-message resolver. Mirrors `resolveDepartureMessage`.
     */
    protected resolveArrivalMessage(
      to: Stuff & Container,
      exit?: Exit
    ): MovementBodies {
      const self = this as unknown as Stuff;

      const messageIn = exit?.getMessageIn();
      if (messageIn) {
        const fragment = ProseApi.format(messageIn, {
          mover: Mml.name(self),
        });
        return { self: fragment, peers: fragment };
      }

      const toHook = (to as MovementHookProvider).getArrivalMessage;
      if (exit && typeof toHook === 'function') {
        const result = toHook.call(to, self, exit);
        return {
          self: result.self ?? this.defaultArrivalSelf(exit),
          peers: result.peers ?? this.defaultArrivalPeers(exit),
        };
      }

      const teleportHook = (to as MovementHookProvider).getTeleportInMessage;
      if (!exit && typeof teleportHook === 'function') {
        const result = teleportHook.call(to, self);
        return {
          self: result.self ?? this.defaultTeleportInSelf(),
          peers: result.peers ?? this.defaultTeleportInPeers(),
        };
      }

      return {
        self: exit
          ? this.defaultArrivalSelf(exit)
          : this.defaultTeleportInSelf(),
        peers: exit
          ? this.defaultArrivalPeers(exit)
          : this.defaultTeleportInPeers(),
      };
    }

    /**
     * Build the Scene at the right topic and dispatch self + peers
     * frames. Mobile is constrained to Containable bases, so toPeers
     * is always the right broadcast scope (see Vessel rule §7.3 —
     * Containable wins).
     */
    protected dispatchMovementScene(
      bodies: MovementBodies,
      exit?: Exit
    ): void {
      const self = this as unknown as Stuff;
      const topic = exit
        ? MessageApi.Topics.world.narration.movement
        : MessageApi.Topics.world.narration.teleport;
      const scene = MessageApi.scene(self).topic(topic);

      // toSelf only when the mover is actually a Sensor — a future
      // vehicle that carries passengers might not be.
      if (MixinApi.isSensor(self) && bodies.self) {
        scene.toSelf(bodies.self);
      }
      if (bodies.peers) {
        scene.toPeers(bodies.peers);
      }
      scene.send();
    }

    // ───────── Default body factories ─────────

    protected defaultDepartureSelf(exit: Exit): Mml {
      const tpl = resolveSetting<string>(
        this as unknown as Stuff,
        'messages.movement.departSelf',
      ) ?? '';
      return ProseApi.format(tpl, { direction: Mml.direction(exit.getDirection()) });
    }

    protected defaultDeparturePeers(exit: Exit): Mml {
      const tpl = resolveSetting<string>(
        this as unknown as Stuff,
        'messages.movement.departPeers',
      ) ?? '';
      return ProseApi.format(tpl, {
        mover: Mml.name(this as unknown as Stuff),
        direction: Mml.direction(exit.getDirection()),
      });
    }

    protected defaultArrivalSelf(exit: Exit): Mml {
      const tpl = resolveSetting<string>(
        this as unknown as Stuff,
        'messages.movement.arriveSelf',
      ) ?? '';
      const dir = arriveDirection(exit);
      return ProseApi.format(tpl, dir ? { direction: Mml.direction(dir) } : {});
    }

    protected defaultArrivalPeers(exit: Exit): Mml {
      const tpl = resolveSetting<string>(
        this as unknown as Stuff,
        'messages.movement.arrivePeers',
      ) ?? '';
      const dir = arriveDirection(exit);
      const ctx: Record<string, Mml> = {
        mover: Mml.name(this as unknown as Stuff),
      };
      if (dir) ctx.direction = Mml.direction(dir);
      return ProseApi.format(tpl, ctx);
    }

    protected defaultTeleportOutSelf(): Mml {
      const tpl = resolveSetting<string>(
        this as unknown as Stuff,
        'messages.movement.teleportOutSelf',
      ) ?? '';
      return ProseApi.format(tpl, {});
    }

    protected defaultTeleportOutPeers(): Mml {
      const tpl = resolveSetting<string>(
        this as unknown as Stuff,
        'messages.movement.teleportOutPeers',
      ) ?? '';
      return ProseApi.format(tpl, { mover: Mml.name(this as unknown as Stuff) });
    }

    protected defaultTeleportInSelf(): Mml {
      const tpl = resolveSetting<string>(
        this as unknown as Stuff,
        'messages.movement.teleportInSelf',
      ) ?? '';
      return ProseApi.format(tpl, {});
    }

    protected defaultTeleportInPeers(): Mml {
      const tpl = resolveSetting<string>(
        this as unknown as Stuff,
        'messages.movement.teleportInPeers',
      ) ?? '';
      return ProseApi.format(tpl, { mover: Mml.name(this as unknown as Stuff) });
    }
  };
}

/**
 * Resolve the inbound direction for an arrival message. Prefers an
 * explicit `inverse.direction` on the Exit when set; otherwise asks
 * NavigationApi for the canonical inversion of the outbound direction.
 * Returns `undefined` when the topology has no inverse — the bland
 * arrival message is used in that case.
 */
function arriveDirection(exit: Exit): string | undefined {
  return exit.getInverse()?.getDirection() ?? NavigationApi.invertDirection(exit.getDirection());
}

/**
 * Optional-method dispatcher — uses `typeof === 'function'` so a
 * shadow defining the hook participates without a `MixinApi.hasMixin`
 * pre-check on the host. Mirrors the `MovementHookProvider` precedent
 * already in this file.
 */
function callTraverseHook<T>(
  obj: object,
  name: string,
  args: unknown[]
): T | undefined {
  const fn = (obj as Record<string, unknown>)[name];
  if (typeof fn !== 'function') return undefined;
  return (fn as (...a: unknown[]) => T).apply(obj, args);
}

function assertVeto(result: VetoResult | undefined, hookName: string): void {
  if (!result || result.ok) return;
  throw new ContainmentError(
    `${hookName} veto: ${result.reason}`,
    { cause: { hookVeto: result, hookName } }
  );
}
