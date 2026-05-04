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
 *   - `Exit.messageOut` / `Exit.messageIn` (string with `{mover}` sub) —
 *     simplest path, preserves Phase 7's custom-message strings.
 *   - `Exitable.getDepartureMessage?(mover, exit)` /
 *     `Exitable.getArrivalMessage?(mover, exit)` returning
 *     `{ self?, peers? }` — fine-grained, per-room overrides.
 *   - `Container.getTeleportOutMessage?(mover)` /
 *     `Container.getTeleportInMessage?(mover)` returning
 *     `{ self?, peers? }` — used when there is no Exit (teleport, admin
 *     placement).
 *
 * Resolution precedence: messageOut/messageIn → room hook → Mobile
 * defaults. Anything missing in a hook's return falls back to Mobile's
 * default for that audience.
 *
 * Base-class constraint: the Base must already produce
 * `Stuff & Containable` instances. A mobile thing that cannot be
 * contained is nonsensical.
 */

import type { MixinConstructor } from '../mixin-types';
import type { Stuff } from '../stuff/Stuff';
import type { Container } from './Container';
import type { Containable } from './Containable';
import type { Exit } from './Exit';
import { MixinApi } from '../../api/mixin';
import { ContainmentApi } from '../../api/containment';
import { MessageApi } from '../../api/message';
import { NavigationApi } from '../../api/navigation';
import { Mml } from '../../api/mml';

/**
 * Public shape provided by MobileMixin.
 */
export interface Mobile {
  traverse(exit: Exit): void;
  teleport(destination: Stuff & Container, opts?: TeleportOptions): void;
  announceDeparture(from: Stuff & Container, exit?: Exit): void;
  announceArrival(to: Stuff & Container, exit?: Exit): void;
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
 * Optional hook on a source/destination room. Implementations decide
 * how to render movement for that specific space. Anything they don't
 * supply gets Mobile's default.
 */
export interface MovementHookProvider {
  getDepartureMessage?(mover: Stuff, exit: Exit): MovementBodies;
  getArrivalMessage?(mover: Stuff, exit: Exit): MovementBodies;
  getTeleportOutMessage?(mover: Stuff): MovementBodies;
  getTeleportInMessage?(mover: Stuff): MovementBodies;
}

function applyMoverSubstitution(template: string, moverName: string): string {
  return template.replace(/\{mover\}/g, moverName);
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
      colocated: [],
    };

    /**
     * Traverse an `Exit`. Announce departure at source (mover still
     * there), move, announce arrival at destination (mover now there).
     *
     * The contract from Phase 7 stands: the caller has already
     * validated traversal via `exit.canTraverse(this)` — `traverse()`
     * does not re-check.
     */
    traverse(exit: Exit): void {
      this.announceDeparture(exit.source, exit);
      ContainmentApi.move(this as unknown as Stuff & Containable, exit.destination);
      this.announceArrival(exit.destination, exit);
    }

    /**
     * Instantly move to a container. Default: narrate departure (if
     * the mover had a previous environment) and arrival. Pass
     * `{ silent: true }` to suppress both.
     *
     * `silent: true` is what Login spawning uses — newly-cloned
     * avatars shouldn't be announced as "vanishing" from nowhere or
     * "appearing out of thin air" before a player has even seen the
     * room.
     */
    teleport(destination: Stuff & Container, opts?: TeleportOptions): void {
      const silent = opts?.silent ?? false;
      const previous = (this as unknown as Containable).getEnvironment();
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
     * the precedence chain or inject defaults; per-room overrides
     * should go on the room via `getDepartureMessage`.
     */
    protected resolveDepartureMessage(
      from: Stuff & Container,
      exit?: Exit
    ): MovementBodies {
      const self = this as unknown as Stuff;
      const moverName = MessageApi.refOf(self).displayName ?? 'Someone';

      // 1. Custom messageOut on the Exit.
      if (exit?.messageOut) {
        const text = applyMoverSubstitution(exit.messageOut, moverName);
        const fragment = Mml.fromMarkup(text);
        return { self: fragment, peers: fragment };
      }

      // 2. Per-room hook with an Exit in hand.
      const fromHook = (from as MovementHookProvider).getDepartureMessage;
      if (exit && typeof fromHook === 'function') {
        const result = fromHook.call(from, self, exit);
        return {
          self: result.self ?? this.defaultDepartureSelf(exit),
          peers: result.peers ?? this.defaultDeparturePeers(exit),
        };
      }

      // 3. Per-room hook for a teleport-out (no Exit).
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
      const moverName = MessageApi.refOf(self).displayName ?? 'Someone';

      if (exit?.messageIn) {
        const text = applyMoverSubstitution(exit.messageIn, moverName);
        const fragment = Mml.fromMarkup(text);
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
      return Mml.compose`You leave to the ${Mml.direction(exit.direction)}.`;
    }

    protected defaultDeparturePeers(exit: Exit): Mml {
      const self = this as unknown as Stuff;
      return Mml.compose`${Mml.name(self)} leaves to the ${Mml.direction(exit.direction)}.`;
    }

    protected defaultArrivalSelf(exit: Exit): Mml {
      const fromDir =
        exit.inverse?.direction ?? NavigationApi.invertDirection(exit.direction);
      if (fromDir) {
        return Mml.compose`You arrive from the ${Mml.direction(fromDir)}.`;
      }
      return Mml.compose`You arrive.`;
    }

    protected defaultArrivalPeers(exit: Exit): Mml {
      const self = this as unknown as Stuff;
      const fromDir =
        exit.inverse?.direction ?? NavigationApi.invertDirection(exit.direction);
      if (fromDir) {
        return Mml.compose`${Mml.name(self)} arrives from the ${Mml.direction(fromDir)}.`;
      }
      return Mml.compose`${Mml.name(self)} arrives.`;
    }

    protected defaultTeleportOutSelf(): Mml {
      return Mml.compose`The world dissolves around you.`;
    }

    protected defaultTeleportOutPeers(): Mml {
      const self = this as unknown as Stuff;
      return Mml.compose`${Mml.name(self)} vanishes.`;
    }

    protected defaultTeleportInSelf(): Mml {
      return Mml.compose`You materialize.`;
    }

    protected defaultTeleportInPeers(): Mml {
      const self = this as unknown as Stuff;
      return Mml.compose`${Mml.name(self)} appears out of nowhere.`;
    }
  };
}
