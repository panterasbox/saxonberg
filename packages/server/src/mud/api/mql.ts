/**
 * MqlApi - MUD Query Language for object resolution
 *
 * Phase 4 implementation: Basic keyword matching only
 * - No ordinals ("first flower", "second sword")
 * - No quantities ("5 arrows")
 * - Simple keyword matching against name and keywords[]
 *
 * Future phases will extend with advanced query syntax.
 *
 * Example:
 * ```typescript
 * const flower = MqlApi.resolve('flower', { avatar, location });
 * const flowers = MqlApi.resolveMany('flowers', { avatar, location });
 * ```
 */

import type { Location } from '../lib/stuff/Location';
import type { Stuff } from '../lib/stuff/Stuff';
import type { CommandGiver } from '../lib/command/CommandGiver';
import { ContainmentApi } from './containment';
import { DescribeApi } from './describe';
import { MixinApi } from './mixin';

/**
 * MQL (MUD Query Language) context.
 *
 * - `commandGiver`: the thing whose perspective drives the query (inventory
 *   search, "you" in error messages). Narrower than Stuff because MQL is
 *   always run on behalf of a command-issuing actor.
 * - `location`: the giver's current environment — searched after inventory.
 * - `searchOrder`: order of contexts to search; defaults to
 *   `['inventory', 'location']`.
 */
export interface MqlContext {
  commandGiver: Stuff & CommandGiver;
  location: Location;
  searchOrder?: string[];
}

/**
 * Internal match result with score — higher score = better match.
 */
export interface MqlMatch {
  object: Stuff;
  score: number;
}

/**
 * MqlApi - Static utility class for object resolution
 */
export class MqlApi {
  /**
   * Resolve single object from query string
   *
   * Returns the FIRST (highest-scored) match, or null if no matches found.
   *
   * Example:
   *   "flower" → Find object matching "flower"
   *   "pink flower" → Find object matching both keywords
   *
   * @param query - Query string (keywords separated by spaces)
   * @param context - MQL context (avatar, location, search order)
   * @returns First matching object or null
   */
  static resolve(query: string, context: MqlContext): Stuff | null {
    const matches = this.#findMatches(query, context);

    if (matches.length === 0) {
      return null;
    }

    // Return highest-scored match
    return matches[0]?.object || null;
  }

  /**
   * Resolve multiple objects from query string
   *
   * Returns ALL matching objects, sorted by score (highest first).
   *
   * Example:
   *   "flower" → All objects matching "flower"
   *   "flowers" → All objects matching "flowers"
   *
   * @param query - Query string (keywords separated by spaces)
   * @param context - MQL context (avatar, location, search order)
   * @returns Array of matching objects (empty if no matches)
   */
  static resolveMany(query: string, context: MqlContext): Stuff[] {
    const matches = this.#findMatches(query, context);
    return matches.map((m) => m.object);
  }

  /**
   * Find and score all matching objects
   *
   * @param query - Query string
   * @param context - MQL context
   * @returns Array of matches sorted by score (highest first)
   */
  static #findMatches(query: string, context: MqlContext): MqlMatch[] {
    const keywords = this.#tokenizeQuery(query);
    if (keywords.length === 0) {
      return [];
    }

    const matches: MqlMatch[] = [];

    // Search in order: inventory → location
    const searchOrder = context.searchOrder || ['inventory', 'location'];

    for (const contextName of searchOrder) {
      const objects = this.#getObjectsInContext(contextName, context);

      for (const obj of objects) {
        const score = this.#scoreMatch(obj, keywords);
        if (score > 0) {
          matches.push({ object: obj, score });
        }
      }
    }

    // Sort by score (highest first)
    matches.sort((a, b) => b.score - a.score);

    return matches;
  }

  /**
   * Tokenize query string into keywords
   *
   * @param query - Query string
   * @returns Array of lowercase keywords
   */
  static #tokenizeQuery(query: string): string[] {
    return query
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter((k) => k.length > 0);
  }

  /**
   * Get objects in a specific context
   *
   * @param contextName - Context name ('inventory' or 'location')
   * @param context - MQL context
   * @returns Array of objects in that context
   */
  static #getObjectsInContext(contextName: string, context: MqlContext): Stuff[] {
    switch (contextName) {
      case 'inventory':
        return this.#getInventoryObjects(context.commandGiver);
      case 'location':
        return this.#getLocationObjects(context.location);
      default:
        return [];
    }
  }

  /**
   * Get objects in the command giver's inventory.
   *
   * A giver without a Container mixin (no inventory) contributes nothing —
   * this path is a no-op in that case rather than a type error.
   */
  static #getInventoryObjects(giver: Stuff & CommandGiver): Stuff[] {
    if (!MixinApi.isContainer(giver)) return [];
    return ContainmentApi.getContents(giver);
  }

  /**
   * Get objects in location.
   *
   * Includes the location's normal contents PLUS any doors referenced by
   * its obvious exits (when the location is Exitable). Doors are not
   * "contents" — they don't live inside the room — but they are
   * player-targetable by name (`open the oak door`), so they participate
   * in MQL resolution on the location.
   *
   * @param location - Location to search
   * @returns Array of objects in location (contents ∪ exit doors)
   */
  static #getLocationObjects(location: Location): Stuff[] {
    const objects: Stuff[] = ContainmentApi.getContents(location);
    if (MixinApi.isExitable(location)) {
      const seen = new Set<string>();
      for (const door of location.getExitDoors()) {
        if (seen.has(door.stuffId)) continue;
        seen.add(door.stuffId);
        objects.push(door);
      }
    }
    return objects;
  }

  /**
   * Score an object against query keywords
   *
   * Scoring algorithm:
   * - Exact name match: 100 points
   * - Name contains all keywords: 50 points
   * - Keyword array match (all keywords): 25 points
   * - Keyword array match (partial): 10 points per keyword
   *
   * @param obj - Object to score
   * @param keywords - Query keywords
   * @returns Score (0 = no match, higher = better match)
   */
  static #scoreMatch(obj: Stuff, keywords: string[]): number {
    const name = DescribeApi.getDisplayName(obj);
    if (!name) return 0;

    const nameLower = name.toLowerCase();
    const nameWords = nameLower.split(/\s+/);

    const objKeywords: string[] = [];
    if (MixinApi.isPerceptible(obj)) {
      const keywords = obj.getKeywords();
      if (Array.isArray(keywords)) {
        objKeywords.push(...keywords);
      }
    }

    // Exact name match
    if (keywords.length === 1 && nameLower === keywords[0]) {
      return 100;
    }

    // Name contains all keywords
    if (keywords.every((kw) => nameLower.includes(kw))) {
      return 50;
    }

    // Check against name words
    const nameMatches = keywords.filter((kw) => nameWords.some((word) => word.includes(kw)));
    if (nameMatches.length === keywords.length) {
      return 40;
    }

    // Check against keyword array (all keywords match)
    if (objKeywords.length > 0) {
      const keywordMatches = keywords.filter((kw) =>
        objKeywords.some((objKw) => objKw.includes(kw))
      );

      if (keywordMatches.length === keywords.length) {
        return 25;
      }

      // Partial keyword match
      if (keywordMatches.length > 0) {
        return 10 * keywordMatches.length;
      }
    }

    // Check name word partial matches
    if (nameMatches.length > 0) {
      return 5 * nameMatches.length;
    }

    return 0;
  }

}
