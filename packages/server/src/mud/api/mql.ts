/**
 * MqlApi - MUD Query Language for object resolution
 *
 * Phase 1 facade: existing keyword-scoring `resolve` / `resolveMany`
 * remain as delegating shims so the dispatcher and direct-caller
 * controllers (Go/Open/Close) compile unchanged. The Phase 7 cutover
 * replaces this surface with `resolveOne` / `resolveMany` returning
 * wrapped results ({@link MqlOneResult}, {@link MqlManyResult}).
 *
 * The new public type surface ({@link MqlContext}, {@link MqlOneResult},
 * {@link MqlManyResult}, {@link MqlMatchVia}, {@link PermissionTier})
 * is re-exported from `./mql/types`. Internal pipeline modules under
 * `./mql/` (lexer, desugar, parser, resolver, scope-walk, predicates,
 * permissions, pronoun-memory) start as stubs and grow phase by phase.
 *
 * The internal `mql/` modules are not Apis: they're pipeline stages
 * that the public `MqlApi` (this file) drives. The `MqlApi` class
 * itself remains the security-decorated entry point.
 */

import type { Location } from '../lib/stuff/Location';
import type { Stuff } from '../lib/stuff/Stuff';
import type { CommandGiver } from '../lib/command/CommandGiver';
import { ContainmentApi } from './containment';
import { DescribeApi } from './describe';
import { MixinApi } from './mixin';
import { SecurityApi } from './security';

export type {
  MqlContext as MqlContextV2,
  MqlMatchVia,
  MqlOneResult,
  MqlManyResult,
  PermissionTier,
} from './mql/types';

/**
 * Legacy MQL context. Phase 1 keeps the original shape so callers
 * compile unchanged. Phase 7 retires this in favor of the
 * scope-fragment-based {@link MqlContextV2} (re-exported above).
 *
 * - `commandGiver`: the actor whose perspective drives the query.
 * - `location`: the giver's current environment — searched after
 *   inventory.
 * - `searchOrder`: order of contexts to search; defaults to
 *   `['inventory', 'location']`.
 *
 * @deprecated Phase 7 cutover removes this in favor of
 *   `MqlContextV2 { commandGiver, scope: string }`.
 */
export interface MqlContext {
  commandGiver: Stuff & CommandGiver;
  location: Location;
  searchOrder?: string[];
}

/**
 * Internal match result with score — higher score = better match.
 */
interface MqlMatch {
  object: Stuff;
  score: number;
}

/**
 * MqlApi - Static utility class for object resolution.
 *
 * Phase 1 surface: legacy `resolve` / `resolveMany` keyed off the
 * Phase-4 keyword-scoring algorithm. Phase 7 replaces these with
 * `resolveOne` / `resolveMany` that drive the new pipeline.
 */
export class MqlApi {
  /**
   * Resolve single object from query string.
   *
   * Returns the FIRST (highest-scored) match, or null if no matches
   * found.
   *
   * @deprecated Phase 7 will replace this with
   *   {@link resolveOne} returning {@link MqlOneResult}.
   */
  static resolve(query: string, context: MqlContext): Stuff | null {
    const matches = this.#findMatches(query, context);
    if (matches.length === 0) return null;
    return matches[0]?.object || null;
  }

  /**
   * Resolve multiple objects from query string.
   *
   * Returns ALL matching objects, sorted by score (highest first).
   *
   * @deprecated Phase 7 will replace this signature with one that
   *   returns {@link MqlManyResult}.
   */
  static resolveMany(query: string, context: MqlContext): Stuff[] {
    const matches = this.#findMatches(query, context);
    return matches.map((m) => m.object);
  }

  static #findMatches(query: string, context: MqlContext): MqlMatch[] {
    const keywords = this.#tokenizeQuery(query);
    if (keywords.length === 0) return [];

    const matches: MqlMatch[] = [];
    const searchOrder = context.searchOrder || ['inventory', 'location'];

    for (const contextName of searchOrder) {
      const objects = this.#getObjectsInContext(contextName, context);
      for (const obj of objects) {
        const score = this.#scoreMatch(obj, keywords);
        if (score > 0) matches.push({ object: obj, score });
      }
    }

    matches.sort((a, b) => b.score - a.score);
    return matches;
  }

  static #tokenizeQuery(query: string): string[] {
    return query
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter((k) => k.length > 0);
  }

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

  static #getInventoryObjects(giver: Stuff & CommandGiver): Stuff[] {
    if (!MixinApi.isContainer(giver)) return [];
    return ContainmentApi.getContents(giver);
  }

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

  static #scoreMatch(obj: Stuff, keywords: string[]): number {
    const name = DescribeApi.getDisplayName(obj);
    if (!name) return 0;

    const nameLower = name.toLowerCase();
    const nameWords = nameLower.split(/\s+/);

    const objKeywords: string[] = [];
    if (MixinApi.isPerceptible(obj)) {
      const kw = obj.getKeywords();
      if (Array.isArray(kw)) objKeywords.push(...kw);
    }

    if (keywords.length === 1 && nameLower === keywords[0]) return 100;

    if (keywords.every((kw) => nameLower.includes(kw))) return 50;

    const nameMatches = keywords.filter((kw) =>
      nameWords.some((word) => word.includes(kw))
    );
    if (nameMatches.length === keywords.length) return 40;

    if (objKeywords.length > 0) {
      const keywordMatches = keywords.filter((kw) =>
        objKeywords.some((objKw) => objKw.includes(kw))
      );
      if (keywordMatches.length === keywords.length) return 25;
      if (keywordMatches.length > 0) return 10 * keywordMatches.length;
    }

    if (nameMatches.length > 0) return 5 * nameMatches.length;

    return 0;
  }
}

SecurityApi.decorateApiClass(MqlApi);
