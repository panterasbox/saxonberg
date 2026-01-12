/**
 * CommandApi - Command definition cache and registry
 *
 * Responsibilities:
 * - Cache parsed CommandDefinitions (performance)
 * - Load YAML definitions from disk on demand
 * - Quick verb → definition lookup
 *
 * Note: There are no "global" commands - all commands come from
 * CommandProviders (mixins, objects) in various contexts (self,
 * environment, inventory, colocated). This is just a cache.
 */

import { CommandDefinition } from '../lib/command/CommandDefinition';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get path to command YAML directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CMD_DIR = join(__dirname, '../cmd');

/**
 * CommandApi - Static command definition cache
 */
export class CommandApi {
  /** Cached command definitions by filename (performance) */
  private static commands: Map<string, CommandDefinition> = new Map();

  /** Verb → CommandDefinition lookup map (performance) */
  private static verbMap: Map<string, CommandDefinition> = new Map();

  /**
   * Get a command definition by filename, loading it if not cached
   *
   * @param filename - YAML filename (e.g., 'look.yaml')
   * @returns CommandDefinition or null if not found
   */
  static getCommand(filename: string): CommandDefinition | null {
    // Check cache first
    if (this.commands.has(filename)) {
      return this.commands.get(filename)!;
    }

    // Load from disk
    try {
      const filePath = join(CMD_DIR, filename);
      const command = CommandDefinition.fromFile(filePath);

      // Cache it
      this.commands.set(filename, command);

      // Register verbs for fast lookup
      for (const verb of command.verbs) {
        // Defensive: ensure verb is a string
        if (typeof verb !== 'string') {
          console.error(
            `CommandApi: Invalid verb in ${filename}: expected string, got ${typeof verb}. ` +
              `Verb value: ${JSON.stringify(verb)}`
          );
          continue;
        }

        const lowerVerb = verb.toLowerCase();
        if (this.verbMap.has(lowerVerb)) {
          console.warn(`CommandApi: Verb '${verb}' from ${filename} is already registered`);
        }
        this.verbMap.set(lowerVerb, command);
      }

      return command;
    } catch (error) {
      console.error(`CommandApi: Failed to load command ${filename}:`, error);
      return null;
    }
  }

  /**
   * Match verb to cached CommandDefinition
   *
   * @param verb - Command verb to match
   * @returns CommandDefinition or null if not found in cache
   */
  static matchVerb(verb: string): CommandDefinition | null {
    return this.verbMap.get(verb.toLowerCase()) || null;
  }

  /**
   * Get all cached commands
   *
   * Note: This returns cached commands only. For contextual commands,
   * use CommandGiver.getAvailableCommands() which queries CommandProviders.
   */
  static getAllCommands(): CommandDefinition[] {
    return Array.from(this.commands.values());
  }

  /**
   * Clear cache (useful for testing/reloading)
   */
  static clearCache(): void {
    this.commands.clear();
    this.verbMap.clear();
  }
}
