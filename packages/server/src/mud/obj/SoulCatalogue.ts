/**
 * SoulCatalogue — singleton Idea that owns the runtime verb→Emote cache.
 *
 * Lives at `/obj/SoulCatalogue`, sibling to `/obj/TopicCatalogue` and
 * `/obj/EventRegistry` per the singleton-in-`obj/` convention. The
 * source of truth is the `documents` collection, `kind: 'emote'` — rows
 * the `expression` content pack installs (and an author mints at
 * `/emotes/<verb>`). The catalogue warms its verb→Emote map at
 * `postRegister` (after `PackApi.install` has reconciled the pack) and
 * serves dispatch-path lookups; the installer's go-live drops the cache
 * after a live `pack sync` touches the kind.
 *
 * The cache maps **canonical verbs only** — an emote's `searchTerms`
 * are indexed in a second map for `search`, never for `resolve`: `;hi`
 * does not dispatch, `soul search hi` finds `greet`.
 *
 * `mint` / `edit` / `delete` write-through to the document store AND
 * the cache so author edits land immediately (no restart needed within
 * the authoring process — see the cross-process HMR caveat in the
 * requirements doc).
 *
 * Not a persisted record itself. Seed YAML is `{ class:
 * /obj/SoulCatalogue, data: {} }`.
 */

import { Idea } from '../lib/stuff/Idea';
import { PostRegistrationMixin } from '../lib/stuff/PostRegistration';
import { SecurityApi } from '../api/security';
import { CallSecurity } from '../lib/security/decorators';
import { SecurityPolicies } from '../lib/security/SecurityPolicies';
import { Emote } from '../lib/social/Emote';
import { DocumentApi } from '../api/document';
import type { EmoteCatalogueEntry } from '@saxonberg/types';
import type { VetoResult } from '../lib/errors';
import type { EvictionContext } from '../lib/stuff/Stuff';

const SoulCatalogueBase = PostRegistrationMixin(Idea);

// The catalogue's surface is reachable only through SoulApi → the
// SoulLogic singleton (the surface-architecture two-singleton shape):
// `FromModule('/api/soul#SoulApi')` admits the facade, `FromTemplate
// ('/obj/api/soul')` admits the logic singleton (its actual caller after
// the conversion), and `SelfOnly` admits the internal self-calls
// (`postRegister`/`ensureCache` → `warmCache`). Any other caller is
// denied. Mirrors the AccessRegistry encapsulation pattern (soul had no
// gate before this build).
const SoulApiCallers = SecurityPolicies.AnyOf(
  SecurityPolicies.FromModule('/api/soul#SoulApi'),
  SecurityPolicies.FromTemplate('/obj/api/soul'),
  SecurityPolicies.SelfOnly
);

/**
 * Where an author-minted emote lands: the platform's own `/emotes/`
 * branch (the same root the collection collapse used). Untitled ⇒
 * `ownerOf` yields the state, so `soul make` stays a core-member act
 * exactly as its `requiresCoreAccess` validator says; a pack that later
 * ships that verb adopts the row by natural key.
 */
export const EMOTE_MINT_BRANCH = '/emotes';

/** The document kind an emote is stored under. */
const EMOTE_KIND = 'emote';

export interface EmoteSpec {
  verb: string;
  /** Catalogue lookup words only — never dispatched. */
  searchTerms?: string[];
  grammar: Emote['grammar'];
  echo?: Emote['echo'];
  emoji?: string;
  tags?: string[];
  /** Signed renown valence (esteem + / notoriety −; default 0). */
  valence?: number;
}

export default class SoulCatalogue extends SoulCatalogueBase {

  /**
   * Residency veto - a load-bearing process-lifetime singleton is
   * never culled by the self-eviction sweep.
   */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'system singleton; never culled' };
  }
  /**
   * Canonical verb → Emote lookup table. `null` means "not warmed yet".
   * Canonical verbs ONLY — nothing else dispatches.
   *
   * TypeScript `private` per the domain-code default — the proxy
   * receiver can't reach `#`-private slots.
   */
  private cache: Map<string, Emote> | null = null;

  /** Search term (verb, tag, or `searchTerms` entry) → canonical verbs. */
  private bySearchTerm: Map<string, Set<string>> = new Map();

  public override async postRegister(_context?: unknown): Promise<void> {
    await this.warmCache();
  }

  /**
   * Reload the cache from Mongo. Called at boot via `postRegister` and
   * by external authors after bulk YAML changes. Idempotent.
   */
  @CallSecurity(SoulApiCallers)
  public async warmCache(): Promise<void> {
    const docs = await DocumentApi.listOfKind(EMOTE_KIND);
    const map = new Map<string, Emote>();
    for (const doc of docs) {
      let e: Emote;
      try {
        e = Emote.fromDocument(doc);
      } catch (err) {
        // A malformed row never takes the catalogue down: skip it loudly.
        console.warn(`SoulCatalogue: skipping ${doc.getPath()}: ${(err as Error).message}`);
        continue;
      }
      map.set(e.verb, e);
    }
    this.cache = map;
    this.bySearchTerm = buildSearchIndex(map);
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
   * Resolve a CANONICAL verb to its Emote record. Returns `null` when
   * nothing matches — a search term is not a verb (`;grin` where `grin`
   * is only a search term does nothing). Auto-warms the cache on first
   * access — safe to call from the dispatcher hot path.
   */
  @CallSecurity(SoulApiCallers)
  public async resolve(verb: string): Promise<Emote | null> {
    const map = await this.ensureCache();
    return map.get(verb.toLowerCase()) ?? null;
  }

  /**
   * Every emote a term finds — by canonical verb, tag, or one of its
   * `searchTerms`. The author-face lookup (`soul search`); nothing here
   * dispatches.
   */
  @CallSecurity(SoulApiCallers)
  public async search(term: string): Promise<Emote[]> {
    const map = await this.ensureCache();
    const verbs = this.bySearchTerm.get(term.toLowerCase());
    if (!verbs) return [];
    return [...verbs].sort().map((v) => map.get(v)!).filter(Boolean);
  }

  @CallSecurity(SoulApiCallers)
  public async all(): Promise<Emote[]> {
    const map = await this.ensureCache();
    const seen = new Set<Emote>();
    for (const e of map.values()) seen.add(e);
    return [...seen];
  }

  /**
   * The catalogue projected for the client's emote picker.
   *
   * Canonical verbs only; an emote's `searchTerms` ride its entry (the
   * picker's typeahead corpus) and never become cells of their own.
   *
   * Slot order is `Object.entries` order over `grammar.slots`, which is
   * the order the author declared them in and the order
   * `EmoteGrammarRunner.bind` consumes tokens in. The picker offers its
   * controls in that same order, so what the player fills in binds the
   * way they expect.
   *
   * Player-readable by design: this is the READ face of the catalogue.
   * `soul list` remains the author face and keeps its `requiresCoreAccess`
   * gate — a player seeing the palette is not a player authoring it.
   */
  @CallSecurity(SoulApiCallers)
  public async snapshot(): Promise<EmoteCatalogueEntry[]> {
    const emotes = await this.all();
    return emotes.map((e) => ({
      verb: e.verb,
      /*
       * ⚠ **A glyph-less emote stores `null`, not `undefined`.** The
       * field is declared `emoji?: string` and the seed YAML simply
       * omits it — but the round trip through Mongo brings it back as an
       * explicit `null`, so a `!== undefined` check passes and ships
       * `emoji: null` to the client. The picker, filtering on presence,
       * then drew a grid cell with a verb and no glyph: eight of them,
       * live.
       *
       * That is not cosmetic. The reaction registry is **glyph-gated** —
       * a glyph-less react is never tallied and never becomes a chip —
       * so a cell for one promises a chip that cannot appear.
       *
       * ⚠⚠ Found by DRIVING, and only by driving: every unit fixture
       * here had used `undefined`, which is not the shape the database
       * holds. A truthiness check covers all three.
       */
      ...(e.emoji ? { emoji: e.emoji } : {}),
      searchTerms: [...e.searchTerms],
      tags: [...e.tags],
      slots: Object.entries(e.grammar.slots).map(([name, spec]) => ({
        name,
        kind: spec.kind,
        required: spec.optional !== true,
        ...(spec.scope !== undefined ? { scope: spec.scope } : {}),
      })),
    }));
  }

  /**
   * Persist a new emote and add it to the cache. Throws when an Emote
   * with the same verb is already present. Reserved-name collision
   * checking against the player verb namespace is the caller's
   * responsibility (the controller does it).
   */
  @CallSecurity(SoulApiCallers)
  public async mint(spec: EmoteSpec): Promise<Emote> {
    // Sandbox needs-a-guard (docs/subsystems/sandbox.md): field-visible
    // shared state; denied under circle scope with a receipt.
    SecurityApi.assertFieldMutation(this, 'mint');
    const map = await this.ensureCache();
    if (map.has(spec.verb.toLowerCase())) {
      throw new Error(`Emote '${spec.verb}' already exists.`);
    }
    const record = new Emote();
    record.verb = spec.verb.toLowerCase();
    record.searchTerms = (spec.searchTerms ?? []).map((a) => a.toLowerCase());
    record.grammar = spec.grammar;
    record.echo = spec.echo ?? 'default';
    if (spec.emoji !== undefined) record.emoji = spec.emoji;
    record.tags = spec.tags ?? [];
    record.valence = spec.valence ?? 0;
    record.path = `${EMOTE_MINT_BRANCH}/${record.verb}`;
    await DocumentApi.save(record.path, EMOTE_KIND, record.toData());
    map.set(record.verb, record);
    this.bySearchTerm = buildSearchIndex(map);
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
    // Sandbox needs-a-guard (docs/subsystems/sandbox.md): field-visible
    // shared state; denied under circle scope with a receipt.
    SecurityApi.assertFieldMutation(this, 'edit');
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
    if (patch.searchTerms !== undefined) {
      existing.searchTerms = patch.searchTerms.map((a) => a.toLowerCase());
    }
    if (patch.grammar !== undefined) existing.grammar = patch.grammar;
    if (patch.echo !== undefined) existing.echo = patch.echo;
    if (patch.emoji !== undefined) existing.emoji = patch.emoji;
    if (patch.tags !== undefined) existing.tags = patch.tags;
    if (patch.valence !== undefined) existing.valence = patch.valence;

    await DocumentApi.save(existing.path, EMOTE_KIND, existing.toData());
    map.set(existing.verb, existing);
    this.bySearchTerm = buildSearchIndex(map);
    return existing;
  }

  @CallSecurity(SoulApiCallers)
  public async delete(verb: string): Promise<boolean> {
    // Sandbox needs-a-guard (docs/subsystems/sandbox.md): field-visible
    // shared state; denied under circle scope with a receipt.
    SecurityApi.assertFieldMutation(this, 'delete');
    const map = await this.ensureCache();
    const existing = map.get(verb.toLowerCase());
    if (!existing) return false;
    map.delete(existing.verb);
    this.bySearchTerm = buildSearchIndex(map);
    await DocumentApi.delete(existing.path);
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
}

/** term → canonical verbs, over each emote's verb, tags and searchTerms. */
function buildSearchIndex(map: Map<string, Emote>): Map<string, Set<string>> {
  const index = new Map<string, Set<string>>();
  const add = (term: string, verb: string): void => {
    const t = term.toLowerCase();
    let set = index.get(t);
    if (!set) index.set(t, (set = new Set()));
    set.add(verb);
  };
  for (const e of map.values()) {
    add(e.verb, e.verb);
    for (const t of e.tags) add(t, e.verb);
    for (const t of e.searchTerms) add(t, e.verb);
  }
  return index;
}
