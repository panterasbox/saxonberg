/**
 * TopicCatalogue — singleton Idea that owns the runtime topic
 * descriptor cache.
 *
 * Lives at `/obj/TopicCatalogue`, sibling to `/obj/EventRegistry`
 * per the singleton-in-`obj/` convention. The cache is transient
 * instance state; the source of truth lives on the per-topic
 * `Topic` template documents under `/obj/Topic/` in the
 * `domain` collection. The catalogue loads its descriptors
 * directly from those template docs — Topic templates are pure
 * data (`topic` / `family` / `label` / `description`), so there's
 * no need to clone them as live Stuff instances at boot.
 *
 * Lookups walk a three-tier resolution chain so the accessor
 * never returns "not found":
 *
 *   1. Cache hit — return the authored descriptor verbatim.
 *   2. Family-inherited — walk the dotted-path family chain looking
 *      for an authored ancestor; derive a descriptor that inherits
 *      the family's description.
 *   3. Derived default — titlecased last segment as the label,
 *      `'(no description)'`, family = path prefix.
 *
 * `postRegister` warms the cache from mongo via
 * `Template.findDescendants`. Descriptor edits land at next boot;
 * a future `invalidateCache` admin verb (currently unused but
 * left in place) would let authors trigger a refresh in-process.
 *
 * Not a persisted record. The seed YAML is `{ class: /obj/TopicCatalogue,
 * data: {} }` — there's no field state worth round-tripping. The
 * cache is rebuilt on demand by reading Template docs.
 */

import { DiagnosticApi } from '../api/diagnostics';
import { Idea } from '../lib/stuff/Idea';
import { PostRegistrationMixin } from '../lib/stuff/PostRegistration';
import { Template } from '../lib/stuff/Template';
import Topic from './Topic';
import type {
  TopicDescriptor,
  TopicAddress,
  TopicActor,
  TopicWeight,
  TopicAudience,
  TopicAffordance,
} from '@saxonberg/types';
import type { VetoResult } from '../lib/errors';
import type { EvictionContext } from '../lib/stuff/Stuff';

const TopicCatalogueBase = PostRegistrationMixin(Idea);

/** The six facets, as a unit — the slice every tier must produce. */
type TopicFacets = Pick<
  TopicDescriptor,
  'address' | 'actor' | 'weight' | 'audience' | 'durable' | 'affordance'
>;

/**
 * Validation arrays for the four enumerated facets. Authored values
 * outside these fall back to the derivation rather than reaching the
 * wire — a typo in a seed becomes a conservative default, never an
 * unknown string the client has to defend against.
 */
const ADDRESSES: readonly TopicAddress[] = [
  'direct',
  'personal',
  'ambient',
  'broadcast',
];
const ACTORS: readonly TopicActor[] = ['self', 'person', 'world', 'system'];
const WEIGHTS: readonly TopicWeight[] = [
  'consequence',
  'activity',
  'chatter',
  'diagnostic',
];
const AUDIENCES: readonly TopicAudience[] = ['player', 'author', 'all'];
const AFFORDANCES: readonly TopicAffordance[] = [
  'live',
  'decays',
  'permanent',
];

export default class TopicCatalogue extends TopicCatalogueBase {

  /**
   * Residency veto - a load-bearing process-lifetime singleton is
   * never culled by the self-eviction sweep.
   */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'system singleton; never culled' };
  }
  /**
   * Transient runtime cache. `null` means "not built yet"; built
   * lazily on first access by scanning every Topic instance under
   * `Topic.TEMPLATE_PATH_PREFIX`. HMR invalidation drops it back to
   * `null` so the next access rebuilds.
   *
   * TypeScript `private` per the domain-code default — the mixin
   * proxy receiver can't reach `#`-private slots.
   */
  private cache: Map<string, TopicDescriptor> | null = null;

  /**
   * Topics flagged `communicative: true` in their template data — the
   * say/whisper/shout/emote/chat acts that generate renown when heard
   * (NOT dm / narration / system). Built alongside {@link cache}; the
   * `SensorMixin.onMessage` reception gate consults it via
   * `MessageApi.isCommunicative`.
   */
  private communicative: Set<string> = new Set();

  /**
   * Lookup contract: ALWAYS returns a populated descriptor.
   *
   *   1. Cache hit (authored) — return verbatim.
   *   2. Family-inherited — walk the dotted-path family chain for
   *      the first authored ancestor, derive an entry inheriting its
   *      description. `label` becomes
   *      `<family-label> (<leaf-titlecased>)`.
   *   3. Derived default — titlecased last segment, no description.
   */
  public getDescriptor(topic: string): TopicDescriptor {
    this.ensureCache();
    const cached = this.cache!.get(topic);
    if (cached) return cached;
    const inherited = this.resolveInherited(topic);
    if (inherited) return inherited;
    return this.deriveFallback(topic);
  }

  /**
   * Flat array of every authored descriptor. Used by the wire push.
   * Inherited / derived shapes are NOT in the snapshot — the client
   * runs the same three-tier resolution against the cached snapshot.
   */
  public getSnapshot(): TopicDescriptor[] {
    this.ensureCache();
    return [...this.cache!.values()];
  }

  /**
   * Drop the cached map. Next access rebuilds from the live Topic
   * instances. Fired by HMR subscriptions on `Events.StuffCreated`
   * / `Events.StuffDestructed` for paths under
   * `Topic.TEMPLATE_PATH_PREFIX`.
   */
  public invalidateCache(): void {
    this.cache = null;
    this.communicative = new Set();
  }

  /**
   * Whether `topic` is a communication act (the data-driven
   * `communicative` flag). Consulted on the message hot path by the
   * renown reception gate; `false` for any topic not flagged (dm,
   * narration, system, …) and before the cache is warmed.
   */
  public isCommunicative(topic: string): boolean {
    this.ensureCache();
    return this.communicative.has(topic);
  }

  /**
   * Post-registration setup: warm the cache from the `domain`
   * collection. One mongo query at boot, then the public surface
   * is sync.
   */
  public override async postRegister(_context?: unknown): Promise<void> {
    await this.loadCacheFromTemplates();
  }

  /**
   * Singleton refusal. Mirrors `EventRegistry.canDestruct` — the
   * Application resolves us lazily via `findByTemplatePath` and
   * assumes we stay live for the process lifetime.
   */
  public canDestruct(): VetoResult {
    return {
      ok: false,
      reason:
        'TopicCatalogue is a system singleton and cannot be destructed; ' +
        'use forceDestruct (admin-gated) if you really mean it',
    };
  }

  private ensureCache(): void {
    if (this.cache !== null) return;
    // Cache was never warmed (postRegister wasn't awaited, e.g. in
    // a unit test that doesn't go through the clone pipeline).
    // Start with an empty cache — the fallback / derived-default
    // tiers still produce a usable descriptor.
    this.cache = new Map();
  }

  /**
   * Read every `Topic` template under
   * `Topic.TEMPLATE_PATH_PREFIX` directly from the `domain`
   * collection and populate the cache. Skips the runtime Stuff
   * layer entirely — Topic instances have no behavior worth
   * cloning, only data the catalogue cares about.
   */
  private async loadCacheFromTemplates(): Promise<void> {
    const templates = await Template.findDescendants(
      Topic.TEMPLATE_PATH_PREFIX,
    );
    const map = new Map<string, TopicDescriptor>();
    const communicative = new Set<string>();
    for (const tpl of templates) {
      const data = tpl.data as
        | {
            topic?: unknown;
            family?: unknown;
            label?: unknown;
            description?: unknown;
            communicative?: unknown;
            address?: unknown;
            actor?: unknown;
            weight?: unknown;
            audience?: unknown;
            durable?: unknown;
          }
        | undefined;
      if (!data || typeof data.topic !== 'string') continue;
      if (data.communicative === true) communicative.add(data.topic);
      const family = typeof data.family === 'string' ? data.family : '';
      map.set(data.topic, {
        topic: data.topic,
        family,
        label:
          typeof data.label === 'string' && data.label.length > 0
            ? data.label
            : data.topic,
        description:
          typeof data.description === 'string' ? data.description : '',
        // Facets are authored in `data:` alongside `communicative`,
        // and fall back to the family-prefix derivation when a seed
        // has not been given one — so the contract "every descriptor
        // carries all five" holds even mid-migration.
        ...TopicCatalogue.readFacets(data),
      });
    }
    this.cache = map;
    this.communicative = communicative;
  }

  /**
   * Walk the dotted-path family chain (top-down: drop one segment at
   * a time) looking for an authored ancestor. Returns an inherited
   * descriptor or `null`.
   */
  private resolveInherited(topic: string): TopicDescriptor | null {
    if (this.cache === null) return null;
    const segments = topic.split('.');
    if (segments.length < 2) return null;
    for (let i = segments.length - 1; i >= 1; i--) {
      const ancestorPath = segments.slice(0, i).join('.');
      const ancestor = this.cache.get(ancestorPath);
      if (ancestor) {
        const leaf = segments[segments.length - 1] ?? '';
        return {
          topic,
          family: ancestorPath,
          label: `${ancestor.label} (${titleCase(leaf)})`,
          description: ancestor.description,
          // A leaf inherits its ancestor's attention shape along with
          // its prose — a child of `world.chat` is chatter for the
          // same reason its parent is.
          address: ancestor.address,
          actor: ancestor.actor,
          weight: ancestor.weight,
          audience: ancestor.audience,
          durable: ancestor.durable,
          affordance: ancestor.affordance,
        };
      }
    }
    return null;
  }

  /**
   * Resolve the five facets for one topic: **authored values win, and
   * {@link FACET_FLOOR} backstops the rest.**
   *
   * ⚠ There is deliberately NO family-prefix derivation here. That
   * derivation lives in `scripts/derive-topic-facets.ts` and is baked
   * into the seeds, so the seed file is the single source of truth. A
   * second derivation at read time would be a second taxonomy
   * describing what the first already knows — and the two drifted
   * within an hour of both existing, which is how this comment came to
   * be written.
   *
   * Static because all three resolution tiers need it and only one of
   * them has an authored `data` block to read from.
   */
  private static readFacets(
    data:
      | {
          address?: unknown;
          actor?: unknown;
          weight?: unknown;
          audience?: unknown;
          durable?: unknown;
          affordance?: unknown;
        }
      | undefined,
  ): TopicFacets {
    const pick = <T extends string>(
      authored: unknown,
      allowed: readonly T[],
      fallback: T,
    ): T =>
      typeof authored === 'string' && (allowed as readonly string[]).includes(authored)
        ? (authored as T)
        : fallback;

    return {
      address: pick(data?.address, ADDRESSES, FACET_FLOOR.address),
      actor: pick(data?.actor, ACTORS, FACET_FLOOR.actor),
      weight: pick(data?.weight, WEIGHTS, FACET_FLOOR.weight),
      audience: pick(data?.audience, AUDIENCES, FACET_FLOOR.audience),
      durable:
        typeof data?.durable === 'boolean' ? data.durable : FACET_FLOOR.durable,
      affordance: pick(data?.affordance, AFFORDANCES, FACET_FLOOR.affordance),
    };
  }

  /**
   * ⚠ **Reaching the derived tier is a defect, and it now says so.**
   *
   * Deriving a descriptor means a topic is being emitted that nobody
   * authored. The derivation reads like a real descriptor, which is
   * exactly why this went unnoticed for so long: when the totality gate
   * was first run, **45 of the 105 emitted topics had no authored
   * descriptor at all**.
   *
   * Reporting rather than throwing is deliberate — an unauthored topic
   * is an authoring omission, not a runtime fault, and failing the frame
   * would punish the player for the author's miss. The frame renders
   * exactly as before; the omission just stops being invisible.
   *
   * Fires **once per key**. A chatty topic would otherwise write a
   * diagnostic row per frame and bury the store under one mistake.
   */
  private reportUnauthored(topic: string): void {
    if (this.derivedReported.has(topic)) return;
    this.derivedReported.add(topic);
    void DiagnosticApi.record({
      path: null,
      channel: 'topic.unauthored',
      severity: 'warning',
      message:
        `Topic '${topic}' is emitted but has no authored descriptor, ` +
        `so it resolved to a derived default. Add a seed under ` +
        `/obj/Topic/, or route the emitter to an existing topic.`,
    });
  }

  /**
   * Keys already reported by {@link reportUnauthored} — the once-per-key
   * guard. Transient like the cache itself.
   */
  private readonly derivedReported = new Set<string>();

  /**
   * Last-resort derived descriptor. Pure structural derivation: the
   * last segment titlecased becomes the label, no description, the
   * path prefix becomes the family.
   */
  private deriveFallback(topic: string): TopicDescriptor {
    this.reportUnauthored(topic);
    const segments = topic.split('.');
    const leaf = segments[segments.length - 1] ?? topic;
    const family = segments.length > 1 ? segments.slice(0, -1).join('.') : '';
    return {
      topic,
      family,
      label: titleCase(leaf),
      description: '(no description)',
      ...TopicCatalogue.readFacets(undefined),
    };
  }
}

function titleCase(segment: string): string {
  if (!segment) return segment;
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

/**
 * The **conservative floor** — what a topic nobody has authored gets.
 *
 * An unknown frame should be quiet, not loud: `ambient` earns no push,
 * `diagnostic` sits below every default filter level, and `durable:
 * false` keeps it out of transcripts. The failure mode this avoids is
 * a topic added without facets silently interrupting every player.
 */
const FACET_FLOOR = {
  address: 'ambient',
  actor: 'system',
  weight: 'diagnostic',
  audience: 'all',
  durable: false,
  // `decays` rather than `permanent`: a wrongly-permanent affordance is
  // a dead link the UI presents as live, while a wrongly-decaying one
  // costs only a re-resolve.
  affordance: 'decays',
} as const;

