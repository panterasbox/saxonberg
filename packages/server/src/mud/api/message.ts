/**
 * MessageApi - Message distribution and routing utilities
 *
 * This API layer handles finding recipients and distributing messages
 * throughout the game world. Messages are sent to objects with SensorMixin
 * in containers (locations, inventories, etc.).
 *
 * Key Methods:
 * - getSensors(container) - Find all objects in container that can receive messages
 * - messageContainer(source, message) - Send message to all sensors in source's container
 *
 * Usage:
 * ```typescript
 * // From VocalMixin or other messaging code
 * const message = { type: "output", payload: { text: "Hello!" } };
 * MessageApi.messageContainer(avatar, message);
 * ```
 *
 * Architecture:
 * - Finds sensors by checking for 'onMessage' method (duck typing)
 * - Works with any Container (Location, inventory, etc.)
 * - Purely about sensor routing - doesn't know about sockets/clients
 * - Calls each sensor's onMessage() hook
 * - Individual sensors (e.g., Avatar) handle their own delivery mechanisms
 */

import type { Stuff } from '../lib/stuff/Stuff';
import type { Sensor } from '../lib/message/Sensor';

/**
 * Message distribution and routing API.
 */
export class MessageApi {
  /**
   * Get all objects in a container that can receive messages (have SensorMixin).
   *
   * This method searches a container's contents for objects with the onMessage()
   * method, indicating they have SensorMixin applied.
   *
   * @param container - The container to search (e.g., Location)
   * @returns Array of objects with onMessage() method
   */
  static getSensors(container: Stuff): Sensor[] {
    // Check if container has getContents method (from ContainerMixin)
    if (!('getContents' in container)) {
      return [];
    }

    // Get all objects in container
    const contents = (container as any).getContents();

    // Filter for objects with onMessage method (SensorMixin)
    return contents.filter((obj: any) => 'onMessage' in obj) as Sensor[];
  }

  /**
   * Send a message to all sensors in the source's container.
   *
   * This method:
   * 1. Gets the source's environment (container)
   * 2. Finds all sensors in that container
   * 3. Calls each sensor's onMessage() hook
   *
   * MessageApi is purely about sensor routing - it doesn't know about
   * Interactives, sockets, or client delivery. That's handled by each
   * sensor's onMessage() implementation (e.g., Avatar.onMessage()).
   *
   * If the source is not in a container or has no environment,
   * the message is not sent (with console warning).
   *
   * @param source - The object sending the message (must be in a container)
   * @param message - The message to send
   */
  static messageContainer(source: unknown, message: unknown): void {
    // Check if source has getEnvironment method (from ContainableMixin)
    if (!('getEnvironment' in (source as any))) {
      console.warn('MessageApi.messageContainer: Source has no environment');
      return;
    }

    // Get the container (environment) the source is in
    const container = (source as any).getEnvironment();
    if (!container) {
      console.warn('MessageApi.messageContainer: Source not in a container');
      return;
    }

    // Get all sensors in the container
    const sensors = this.getSensors(container);

    // Notify each sensor
    for (const sensor of sensors) {
      sensor.onMessage(message);
    }
  }
}
