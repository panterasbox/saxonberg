/**
 * MessageApi - Message distribution and routing utilities
 *
 * This API layer handles finding recipients and distributing messages
 * throughout the game world. Messages are sent to objects with SensorMixin
 * in containers (locations, inventories, etc.).
 *
 * Key Methods:
 * - getSensors(container) - Find all objects in container that can receive messages
 * - messageContents(container, message) - Send message to all sensors inside a container
 * - messageContainer(source, message) - Convenience: send to sensors in source's environment
 *
 * Usage:
 * ```typescript
 * // A character speaking to peers in their room
 * MessageApi.messageContainer(avatar, message);
 *
 * // A haunted room speaking to its occupants
 * MessageApi.messageContents(room, message);
 * ```
 *
 * Architecture:
 * - Finds sensors by MixinApi.isSensor() (SensorMixin marker check)
 * - Works with any Container (Location, inventory, etc.)
 * - Purely about sensor routing - doesn't know about sockets/clients
 * - Calls each sensor's onMessage() hook
 * - Individual sensors (e.g., Avatar) handle their own delivery mechanisms
 */

import type { Stuff } from '../lib/stuff/Stuff';
import type { Sensor } from '../lib/message/Sensor';
import type { Container } from '../lib/spatial/Container';
import type { Containable } from '../lib/spatial/Containable';
import { MixinApi } from './mixin';
import { SecurityApi } from './security';

type SensorStuff = Stuff & Sensor;

/**
 * Options for message broadcast helpers — lets callers filter out a specific
 * participant (typically the mover in exit traversal or the actor in an
 * open/close broadcast) without hand-iterating sensors.
 */
export interface MessageBroadcastOptions {
  exclude?: Stuff | null;
}

/**
 * Message distribution and routing API.
 */
export class MessageApi {
  /**
   * Get all sensors (objects with SensorMixin) inside a container.
   *
   * @param container - The container to search (e.g., Location)
   * @returns Sensors found inside the container
   */
  static getSensors(container: Stuff & Container): SensorStuff[] {
    return container.getContents().filter((obj): obj is typeof obj & Sensor =>
      MixinApi.isSensor(obj)
    );
  }

  /**
   * Send a message to every sensor inside a container.
   *
   * This is the low-level primitive: the caller has already chosen which
   * container to broadcast into. Useful when the speaker IS the container
   * (e.g. a haunted room speaking to its occupants).
   *
   * @param container - Container whose sensor contents should receive the message
   * @param message - The message to send
   * @param opts - Broadcast options: `exclude` to skip a specific Stuff (by identity)
   */
  static messageContents(
    container: Stuff & Container,
    message: unknown,
    opts: MessageBroadcastOptions = {}
  ): void {
    const exclude = opts.exclude ?? null;
    for (const sensor of this.getSensors(container)) {
      if (exclude && (sensor as Stuff) === exclude) continue;
      sensor.onMessage(message);
    }
  }

  /**
   * Send a message to all sensors in the source's environment.
   *
   * Convenience wrapper for the common "speaker is Containable, broadcast
   * to peers in the same room" case. If the source has no environment
   * (not yet placed), the message is dropped with a warning.
   *
   * MessageApi is purely about sensor routing — it doesn't know about
   * Interactives, sockets, or client delivery. That's handled by each
   * sensor's onMessage() implementation (e.g., Avatar.onMessage()).
   *
   * @param source - Containable object sending the message
   * @param message - The message to send
   * @param opts - Broadcast options: `exclude` to skip a specific Stuff (by identity)
   */
  static messageContainer(
    source: Stuff & Containable,
    message: unknown,
    opts: MessageBroadcastOptions = {}
  ): void {
    const container = source.getEnvironment();
    if (!container) {
      console.warn('MessageApi.messageContainer: Source not in a container');
      return;
    }
    this.messageContents(container, message, opts);
  }
}


SecurityApi.decorateApiClass(MessageApi);
