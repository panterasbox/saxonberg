/**
 * TopicCatalogue — singleton Idea that owns the runtime topic
 * descriptor cache.
 *
 * Lives at `/obj/TopicCatalogue`, sibling to `/obj/EventRegistry`
 * per the singleton-in-`obj/` convention. The cache is transient
 * instance state; the source of truth lives on the per-topic
 * `Topic` template documents under `/lib/messaging/Topic/` in the
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

import { Idea } from '../lib/stuff/Idea';
import { PostRegistrationMixin } from '../lib/stuff/PostRegistration';
import { Template } from '../lib/stuff/Template';
import Topic from '../lib/messaging/Topic';
import type { TopicDescriptor } from '@saxonberg/types';
import type { VetoResult } from '../lib/errors';

const TopicCatalogueBase = PostRegistrationMixin(Idea);

export default class TopicCatalogue extends TopicCatalogueBase {
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
   * `SensorMixin.onMessage` reception gate consults it via `TopicApi`.
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
          }
        | undefined;
      if (!data || typeof data.topic !== 'string') continue;
      if (data.communicative === true) communicative.add(data.topic);
      map.set(data.topic, {
        topic: data.topic,
        family: typeof data.family === 'string' ? data.family : '',
        label:
          typeof data.label === 'string' && data.label.length > 0
            ? data.label
            : data.topic,
        description:
          typeof data.description === 'string' ? data.description : '',
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
        };
      }
    }
    return null;
  }

  /**
   * Last-resort derived descriptor. Pure structural derivation: the
   * last segment titlecased becomes the label, no description, the
   * path prefix becomes the family.
   */
  private deriveFallback(topic: string): TopicDescriptor {
    const segments = topic.split('.');
    const leaf = segments[segments.length - 1] ?? topic;
    const family = segments.length > 1 ? segments.slice(0, -1).join('.') : '';
    return {
      topic,
      family,
      label: titleCase(leaf),
      description: '(no description)',
    };
  }
}

function titleCase(segment: string): string {
  if (!segment) return segment;
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}
