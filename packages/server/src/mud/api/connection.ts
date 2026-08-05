/**
 * ConnectionApi - Public API for connection queries
 *
 * This is the public interface for mudlib code to query connection state.
 * It delegates to ConnectionManager (privileged) but only exposes safe operations.
 *
 * Mudlib code should use this API, not access ConnectionManager directly.
 * With future call security, access to ConnectionManager will be restricted.
 *
 * Thin, security-gated forwarding shell: the logic lives in the
 * hot-reloadable {@link ConnectionLogic} singleton at
 * `/obj/api/connection`, reached synchronously via
 * `StuffApi.singletonSync`. `dest /obj/api/connection` reloads it.
 */

import type { EnvelopeTemplate, MessageFrame } from '@saxonberg/types';
import type Interactive from '../obj/Interactive';
import type { Stuff } from '../lib/stuff/Stuff';
import type { HasInteractive } from '../lib/connection/HasInteractive';
import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { ConnectionLogic } from '../obj/api/ConnectionLogic';
import { fileURLToPath } from 'url';
import { SecurityApi } from './security';

const LOGIC_PATH = '/obj/api/connection';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../obj/api/ConnectionLogic', import.meta.url)
);

/** Resolve the HMR-able ConnectionLogic singleton (sync). */
function logic(): ConnectionLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'ConnectionLogic'
      ) as typeof ConnectionLogic | null) ?? ConnectionLogic)()
  );
}

/**
 * Static API for connection queries (public interface for mudlib).
 */
export class ConnectionApi {
  /**
   * Get an Interactive by socket ID.
   * Safe read-only operation for mudlib.
   *
   * @param socketId - Socket ID to look up
   * @returns Interactive or undefined if not found
   */
  public static getInteractive(socketId: string): Interactive | undefined {
    return logic().getInteractive(socketId);
  }

  /**
   * Run one inbound message from `socketId` in its lane, on a fresh
   * root frame carrying the socket's circle scope.
   *
   * **Two lanes.** Ordinary messages process in arrival order, so a
   * player's commands cannot overtake each other. A prompt reply
   * (`prompt-response` / `prompt-cancel`) rides a second lane: it is
   * addressed by `promptId` rather than by position — an interrupt,
   * which is what a prompt is — and a command awaiting a prompt cannot
   * settle until the reply lands, so sharing one lane deadlocks the
   * socket. The second lane keeps replies ordered against each other
   * without ever waiting on a command.
   *
   * `run` is invoked when the lane reaches it, and is expected to
   * plant its own root frame — `ExecutionContextApi`'s frame mutators
   * are gated to boundary files, and a lane is not a boundary. This
   * decides WHEN a message runs; the transport decides what frame it
   * runs in.
   *
   * Never throws to the caller and never returns a promise: the
   * transport's job is to hand the message over, not to await a turn.
   *
   * Ungated like its `ConnectionApi` siblings — the caller is the
   * WebSocket transport, which sits outside the mudlib and so cannot
   * be named by a `FromModule` policy.
   */
  public static sequenceInbound(
    socketId: string,
    messageType: string,
    run: () => Promise<void>,
  ): void {
    logic().sequenceInbound(socketId, messageType, run);
  }

  /** Drop a closed socket's lanes. Called on disconnect. */
  public static clearInboundSequencing(socketId: string): void {
    logic().clearInboundSequencing(socketId);
  }

  /**
   * Get all active Interactive connections.
   * Safe read-only operation for mudlib.
   *
   * @returns Array of all Interactive objects
   */
  public static getAllInteractives(): Interactive[] {
    return logic().getAllInteractives();
  }

  /**
   * Get count of active connections.
   * Safe read-only operation for mudlib.
   *
   * @returns Number of active connections
   */
  public static getConnectionCount(): number {
    return logic().getConnectionCount();
  }

  /**
   * Check if a socket ID has an active connection.
   * Safe read-only operation for mudlib.
   *
   * @param socketId - Socket ID to check
   * @returns True if connection exists
   */
  public static hasConnection(socketId: string): boolean {
    return logic().hasConnection(socketId);
  }

  /**
   * Get all socket IDs.
   * Safe read-only operation for mudlib.
   *
   * @returns Array of socket IDs
   */
  public static getSocketIds(): string[] {
    return logic().getSocketIds();
  }

  // Note: createInteractive and removeInteractive are NOT exposed here.
  // Those are privileged operations that only Application/Backend should perform.

  /**
   * Route an Interactive to a new holder. Idempotent on the same target.
   *
   * This is **connection routing**, not character control or
   * "operate on this avatar" — `target` is intentionally the broad
   * `HasInteractive` set (Login during entry, Avatar during play, any
   * future Bot/Spirit). Code that needs to act on an avatar
   * specifically should narrow with `instanceof Avatar` (or
   * `MixinApi.isCommandGiver` for command dispatch).
   *
   * Mechanics: removes `interactive` from its previous holder (if any),
   * adds it to `target` via the `HasInteractiveMixin` primitives, and
   * updates `interactive.holder`.
   */
  public static transfer(
    interactive: Interactive,
    target: HasInteractive & Stuff
  ): void {
    return logic().transfer(interactive, target);
  }

  /**
   * Detach an Interactive from its current holder. After detach,
   * `interactive.holder` is null. Used at disconnect / cleanup
   * (`Interactive.onDestruct` calls this).
   *
   * No-op when there's no current holder.
   */
  public static detach(interactive: Interactive): void {
    return logic().detach(interactive);
  }

  /**
   * Record an Interactive's connection origin from its handshake IP: the
   * raw IP is stored transiently on the Interactive (in-memory only — the
   * PII posture) and resolved to a country display name via the offline
   * geo dataset. Called once at connect by the connection layer. A
   * missing / unresolvable IP is a safe no-op.
   */
  public static recordOrigin(
    interactive: Interactive,
    ip: string | undefined
  ): void {
    return logic().recordOrigin(interactive, ip);
  }

  /**
   * The connecting player's origin, by playerId. Returns **country only**
   * (a display name, broadly readable) — the raw IP never leaves the
   * connection layer (the developer-gated IP read is deferred). Empty
   * object when the player isn't connected or geo didn't resolve
   * (localhost / private IP / unknown). The social presence relay reads
   * `originOf(player).country` for the "from <country>" arrival line.
   */
  public static originOf(playerId: string): ConnectionOrigin {
    return logic().originOf(playerId);
  }

  /**
   * Deliver a `MessageFrame` to one connected Interactive's client.
   *
   * The sensor-pipeline exit: a multiplexing `SensorMixin` host
   * (`Avatar`, `Login`) calls this once per forwarding target from its
   * `handleMessage` override. `frameId` is stamped per-Interactive at
   * send time, so a multi-device Avatar gets a monotonic stream from
   * each Interactive's own perspective. A detached or socket-less
   * Interactive is a silent no-op.
   */
  public static sendMessage(
    interactive: Interactive,
    frame: MessageFrame
  ): void {
    return logic().sendMessage(interactive, frame);
  }

  /**
   * Envelope counterpart to {@link ConnectionApi.sendMessage} — the
   * structured server→client push, stamped from the same per-Interactive
   * `frameId` counter so one ordering primitive covers all traffic.
   */
  public static sendEnvelope(
    interactive: Interactive,
    template: EnvelopeTemplate
  ): void {
    return logic().sendEnvelope(interactive, template);
  }
}

/**
 * A connection's geographic origin, privilege-split. v1 surfaces only
 * `country` (broadly readable); the raw IP stays in the connection layer
 * (the developer-gated read is a later build). See the connection-origin
 * slate.
 */
export interface ConnectionOrigin {
  /** Country display name (e.g. "Germany"), or absent when unresolved. */
  country?: string;
}

SecurityApi.decorateApiClass(ConnectionApi);
