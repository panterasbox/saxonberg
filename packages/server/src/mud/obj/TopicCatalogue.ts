/**
 * TopicCatalogue — singleton Idea that owns the runtime topic
 * descriptor cache.
 *
 * Lives at `/obj/TopicCatalogue`, sibling to `/obj/EventRegistry`
 * per the singleton-in-`obj/` convention. The cache is transient
 * instance state; the source of truth lives on the per-topic
 * `Topic` Ideas under `/lib/messaging/Topic/`. Lookups walk a
 * three-tier resolution chain so the accessor never returns
 * "not found":
 *
 *   1. Cache hit — return the authored descriptor verbatim.
 *   2. Family-inherited — walk the dotted-path family chain looking
 *      for an authored ancestor; derive a descriptor that inherits
 *      the family's description.
 *   3. Derived default — titlecased last segment as the label,
 *      `'(no description)'`, family = path prefix.
 *
 * HMR-aware: `postRegister` subscribes to `Events.StuffCreated` and
 * `Events.StuffDestructed`; the listener invalidates the cache when
 * the affected Stuff's template path is under
 * `/lib/messaging/Topic/`. Next access repopulates.
 *
 * NOT Persistable. The seed YAML is `{ class: /obj/TopicCatalogue,
 * data: {} }` — there's no field state worth round-tripping. The
 * cache is rebuilt on demand from the live Topic instances.
 */

import { Idea } from '../lib/stuff/Idea';
import { PostRegistrationMixin } from '../lib/stuff/PostRegistration';
import { StuffApi } from '../api/stuff';
import { EventApi } from '../api/event';
import { Events } from '../lib/events';
import { Topic } from '../lib/messaging/Topic';
import type { TopicDescriptor } from '@saxonberg/types';
import type { VetoResult } from '../lib/errors';

const TopicCatalogueBase = PostRegistrationMixin(Idea);

export class TopicCatalogue extends TopicCatalogueBase {
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
  }

  /**
   * Post-registration setup: subscribe to Stuff lifecycle events so
   * the cache stays coherent under HMR. The listener filters on
   * `templatePath?.startsWith('/lib/messaging/Topic/')` because
   * `EventApi.on` has no built-in path filter.
   */
  public override async postRegister(_context?: unknown): Promise<void> {
    EventApi.on<{ stuffId: string; templatePath?: string }>(
      Events.StuffCreated,
      (payload) => {
        if (payload.templatePath?.startsWith(Topic.TEMPLATE_PATH_PREFIX)) {
          this.invalidateCache();
        }
      },
    );
    EventApi.on<{ stuffId: string }>(
      Events.StuffDestructed,
      (payload) => {
        const stuff = StuffApi.findById(payload.stuffId);
        const path = stuff?.getTemplatePath();
        if (path?.startsWith(Topic.TEMPLATE_PATH_PREFIX)) {
          this.invalidateCache();
        }
      },
    );
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
    const map = new Map<string, TopicDescriptor>();
    // Path glob over the Topic prefix surfaces every live Topic
    // instance. `**` matches any descendant segment.
    const instances = StuffApi.findByPathGlob<Topic>(
      `${Topic.TEMPLATE_PATH_PREFIX}**`,
    );
    for (const t of instances) {
      const topic = t.getTopic();
      if (!topic) continue;
      map.set(topic, {
        topic,
        family: t.getFamily(),
        label: t.getLabel(),
        description: t.getDescription(),
      });
    }
    this.cache = map;
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
