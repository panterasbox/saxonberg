/**
 * SoulCatalogue — singleton Idea that owns the runtime verb→Emote cache.
 *
 * Lives at `/obj/SoulCatalogue`, sibling to `/obj/TopicCatalogue` and
 * `/obj/EventRegistry` per the singleton-in-`obj/` convention. The
 * source of truth lives in the `emotes` MongoDB collection (an `Emote`
 * Document per record). The catalogue warms its verb→Emote map at
 * `postRegister` (after `EmoteSeeder.run` has populated the collection
 * from the seed YAML) and serves dispatch-path lookups.
 *
 * `mint` / `edit` / `delete` write-through to Mongo AND the cache so
 * author edits land immediately (no restart needed within the
 * authoring process — see the cross-process HMR caveat in the
 * requirements doc).
 *
 * Not a persisted record itself. Seed YAML is `{ class:
 * /obj/SoulCatalogue, data: {} }`.
 */

import { Idea } from '../lib/stuff/Idea';
import { PostRegistrationMixin } from '../lib/stuff/PostRegistration';
import { CallSecurity } from '../lib/security/decorators';
import { SecurityPolicies } from '../lib/security/SecurityPolicies';
import { Emote } from '../lib/social/Emote';
import type { VetoResult } from '../lib/errors';

const SoulCatalogueBase = PostRegistrationMixin(Idea);

// The catalogue's surface is reachable only through SoulApi → the
// SoulLogic singleton (the surface-architecture two-singleton shape):
// `FromModule('api/soul#SoulApi')` admits the facade, `FromTemplate
// ('/obj/api/soul')` admits the logic singleton (its actual caller after
// the conversion), and `SelfOnly` admits the internal self-calls
// (`postRegister`/`ensureCache` → `warmCache`). Any other caller is
// denied. Mirrors the AccessRegistry encapsulation pattern (soul had no
// gate before this build).
const SoulApiCallers = SecurityPolicies.AnyOf(
  SecurityPolicies.FromModule('api/soul#SoulApi'),
  SecurityPolicies.FromTemplate('/obj/api/soul'),
  SecurityPolicies.SelfOnly
);

export interface EmoteSpec {
  verb: string;
  aliases?: string[];
  grammar: Emote['grammar'];
  echo?: Emote['echo'];
  emoji?: string;
  tags?: string[];
  /** Signed renown valence (esteem + / notoriety −; default 0). */
  valence?: number;
}

export default class SoulCatalogue extends SoulCatalogueBase {
  /**
   * Verb → Emote lookup table. `null` means "not warmed yet". Includes
   * alias entries — each alias maps to the same Emote record as its
   * canonical verb.
   *
   * TypeScript `private` per the domain-code default — the proxy
   * receiver can't reach `#`-private slots.
   */
  private cache: Map<string, Emote> | null = null;

  public override async postRegister(_context?: unknown): Promise<void> {
    await this.warmCache();
  }

  /**
   * Reload the cache from Mongo. Called at boot via `postRegister` and
   * by external authors after bulk YAML changes. Idempotent.
   */
  @CallSecurity(SoulApiCallers)
  public async warmCache(): Promise<void> {
    const records = await Emote.find({});
    const map = new Map<string, Emote>();
    for (const e of records) {
      map.set(e.verb, e);
      for (const a of e.aliases) map.set(a, e);
    }
    this.cache = map;
  }

  /**
   * Drop the cache. Next access rebuilds from Mongo. Fired by the
   * `reload` author verb when explicitly requested.
   */
  @CallSecurity(SoulApiCallers)
  public invalidateCache(): void {
    this.cache = null;
  }

  /**
   * Resolve a verb (canonical or alias) to its Emote record. Returns
   * `null` when nothing matches. Auto-warms the cache on first access
   * — safe to call from the dispatcher hot path.
   */
  @CallSecurity(SoulApiCallers)
  public async resolve(verb: string): Promise<Emote | null> {
    const map = await this.ensureCache();
    return map.get(verb.toLowerCase()) ?? null;
  }

  @CallSecurity(SoulApiCallers)
  public async all(): Promise<Emote[]> {
    const map = await this.ensureCache();
    const seen = new Set<Emote>();
    for (const e of map.values()) seen.add(e);
    return [...seen];
  }

  /**
   * Persist a new emote and add it to the cache. Throws when an Emote
   * with the same verb is already present. Reserved-name collision
   * checking against the player verb namespace is the caller's
   * responsibility (the controller does it).
   */
  @CallSecurity(SoulApiCallers)
  public async mint(spec: EmoteSpec): Promise<Emote> {
    const map = await this.ensureCache();
    if (map.has(spec.verb.toLowerCase())) {
      throw new Error(`Emote '${spec.verb}' already exists.`);
    }
    const record = new Emote();
    record.verb = spec.verb.toLowerCase();
    record.aliases = (spec.aliases ?? []).map((a) => a.toLowerCase());
    record.grammar = spec.grammar;
    record.echo = spec.echo ?? 'default';
    if (spec.emoji !== undefined) record.emoji = spec.emoji;
    record.tags = spec.tags ?? [];
    record.valence = spec.valence ?? 0;
    await record.save();
    this.indexEmoteIntoCache(record, map);
    return record;
  }

  /**
   * Edit a single field on an existing emote. The `template` /
   * `slots` / `verbForm` fields are nested inside `grammar` — pass the
   * whole grammar object to replace it. Returns the updated Emote.
   */
  @CallSecurity(SoulApiCallers)
  public async edit(
    verb: string,
    patch: Partial<EmoteSpec>,
  ): Promise<Emote> {
    const map = await this.ensureCache();
    const existing = map.get(verb.toLowerCase());
    if (!existing) {
      throw new Error(`No emote '${verb}' to edit.`);
    }
    if (patch.verb !== undefined && patch.verb !== existing.verb) {
      throw new Error(
        `Cannot rename the verb; delete and re-mint to change the canonical name.`,
      );
    }
    // Remove existing alias entries before re-indexing.
    map.delete(existing.verb);
    for (const a of existing.aliases) map.delete(a);

    if (patch.aliases !== undefined) {
      existing.aliases = patch.aliases.map((a) => a.toLowerCase());
    }
    if (patch.grammar !== undefined) existing.grammar = patch.grammar;
    if (patch.echo !== undefined) existing.echo = patch.echo;
    if (patch.emoji !== undefined) existing.emoji = patch.emoji;
    if (patch.tags !== undefined) existing.tags = patch.tags;
    if (patch.valence !== undefined) existing.valence = patch.valence;

    await existing.save();
    this.indexEmoteIntoCache(existing, map);
    return existing;
  }

  @CallSecurity(SoulApiCallers)
  public async delete(verb: string): Promise<boolean> {
    const map = await this.ensureCache();
    const existing = map.get(verb.toLowerCase());
    if (!existing) return false;
    map.delete(existing.verb);
    for (const a of existing.aliases) map.delete(a);
    await existing.delete();
    return true;
  }

  /**
   * Singleton refusal — `Application` resolves us lazily via
   * `findByTemplatePath` and assumes we stay live for the process
   * lifetime. Mirrors `TopicCatalogue.canDestruct`.
   */
  public canDestruct(): VetoResult {
    return {
      ok: false,
      reason:
        'SoulCatalogue is a system singleton and cannot be destructed; ' +
        'use forceDestruct (admin-gated) if you really mean it',
    };
  }

  private async ensureCache(): Promise<Map<string, Emote>> {
    if (this.cache !== null) return this.cache;
    await this.warmCache();
    return this.cache!;
  }

  private indexEmoteIntoCache(record: Emote, map: Map<string, Emote>): void {
    map.set(record.verb, record);
    for (const a of record.aliases) map.set(a, record);
  }
}
