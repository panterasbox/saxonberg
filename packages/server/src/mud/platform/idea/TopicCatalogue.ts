/**
 * TopicCatalogue — the singleton that serves the message vocabulary,
 * reached as `MessageApi.topics()`: the `topic` documents (a document since
 * the path-identity build): one per dotted key, at
 * `/platform/topics/<dotted.key>`, carrying a label, a description and the
 * six attention facets the client renders and the router routes by.
 *
 * ⭐ Named by code, not by a holder: ~1,200 emitters write
 * `.topic('combat.hit')`. So no host can carry the load (documents D7's
 * mechanisms 1–4), and the message pipeline loads it itself — the one
 * engine-machinery exception (D13, the owner's "queue is fine"): the
 * dictionary warms on the FIRST scene of the process ({@link TopicCatalogue.warm},
 * one read of the kind), `Scene.send` queues its dispatch IN ORDER behind
 * that warm while it is cold, and session entry awaits the same warm before
 * it sends the client its snapshot. Never booted.
 *
 * Resolution is three-tier (unchanged): an authored descriptor; else the
 * nearest authored ancestor's, labelled with the leaf; else a derived
 * default — which is an authoring omission and records a diagnostic once
 * per key. A synchronous read while the dictionary is cold throws
 * `DocumentNotResidentError` (unreachable through `Scene.send`).
 *
 */

import { Idea } from '../../lib/stuff/Idea';
import type { BoundaryRole } from '../../lib/security/BoundaryRole';
import type { EvictionContext } from '../../lib/stuff/Stuff';
import type { VetoResult } from '../../lib/errors';
import { DocumentNotResidentError } from '../../lib/errors';
import type {
  TopicDescriptor,
  TopicAddress,
  TopicActor,
  TopicWeight,
  TopicAudience,
  TopicAffordance,
} from '@saxonberg/types';

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

/** Where the vocabulary lives — the `topic` documents' prefix. */
const TOPIC_PREFIX = '/platform/topics/';

/**
 * The topic dictionary — see the module header.
 *
 */
export default class TopicCatalogue extends Idea {
  /** A reference catalogue everyone reads (the commons). */
  static boundaryRole: BoundaryRole = 'commons';

  // `#` (CLAUDE.md special case 3): the vocabulary is the class's own and
  // must outlive any instance (a re-stood catalogue reads the same words).
  /** Authored descriptors by dotted key; `null` until warmed. */
  static #dict: Map<string, TopicDescriptor> | null = null;
  /** The keys flagged `communicative`. */
  static #communicative: Set<string> = new Set();
  /** The warm in flight, if one is. */
  static #loading: Promise<void> | null = null;
  /** Keys already reported as unauthored (once per key). */
  static #derivedReported = new Set<string>();

  /** Whether the dictionary is resident. */
  public isWarm(): boolean {
    return TopicCatalogue.#dict !== null;
  }

  /**
   * The warm in flight — started if the dictionary is cold — or `null` when
   * it is already resident. `Scene.send` queues behind this.
   */
  public warming(): Promise<void> | null {
    if (TopicCatalogue.#dict !== null) return null;
    return this.warm();
  }

  /** Read every `topic` document into the dictionary (one indexed read; memoized). */
  public warm(): Promise<void> {
    if (TopicCatalogue.#dict !== null) return Promise.resolve();
    return (TopicCatalogue.#loading ??= (async () => {
      const docs = await (await import('../../api/document')).DocumentApi.listOfKind('topic');
      this.install(docs.map((d) => ({ path: d.getPath(), data: d.getData() })));
    })().finally(() => {
      TopicCatalogue.#loading = null;
    }));
  }

  /**
   * Install the dictionary from documents — the warm's tail, and the one way
   * a unit fixture (or the test bootstrap) stands the vocabulary up.
   */
  public install(docs: ReadonlyArray<{ path: string; data: Record<string, unknown> }>): void {
    const map = new Map<string, TopicDescriptor>();
    const communicative = new Set<string>();
    for (const { path, data } of docs) {
      const topic = this.keyOf(path);
      if (!topic) continue;
      if (data.communicative === true) communicative.add(topic);
      map.set(topic, {
        topic,
        family: typeof data.family === 'string' ? data.family : '',
        label: typeof data.label === 'string' && data.label.length > 0 ? data.label : topic,
        description: typeof data.description === 'string' ? data.description : '',
        ...this.readFacets(data),
      });
    }
    TopicCatalogue.#dict = map;
    TopicCatalogue.#communicative = communicative;
  }

  /** Forget the dictionary (a go-live re-reads on the next warm). */
  public invalidate(): void {
    TopicCatalogue.#dict = null;
    TopicCatalogue.#communicative = new Set();
  }

  /** The dotted key a topic document is stored under (its path's leaf). */
  public keyOf(path: string): string {
    return path.startsWith(TOPIC_PREFIX) ? path.slice(TOPIC_PREFIX.length) : path.slice(path.lastIndexOf('/') + 1);
  }

  /** The descriptor for `topic` — authored, inherited, or derived (with a diagnostic). */
  public descriptor(topic: string): TopicDescriptor {
    const dict = this.resident();
    const cached = dict.get(topic);
    if (cached) return cached;
    return this.resolveInherited(dict, topic) ?? this.deriveFallback(topic);
  }

  /** Every authored descriptor — the client's snapshot. */
  public snapshot(): TopicDescriptor[] {
    return [...this.resident().values()];
  }

  /** Whether `topic` is a communication act (the authored `communicative` flag). */
  public isCommunicative(topic: string): boolean {
    this.resident();
    return TopicCatalogue.#communicative.has(topic);
  }

  private resident(): Map<string, TopicDescriptor> {
    if (TopicCatalogue.#dict === null) throw new DocumentNotResidentError('topic', TOPIC_PREFIX);
    return TopicCatalogue.#dict;
  }

  private resolveInherited(
    dict: Map<string, TopicDescriptor>,
    topic: string,
  ): TopicDescriptor | null {
    const segments = topic.split('.');
    if (segments.length < 2) return null;
    for (let i = segments.length - 1; i >= 1; i--) {
      const ancestorPath = segments.slice(0, i).join('.');
      const ancestor = dict.get(ancestorPath);
      if (ancestor) {
        const leaf = segments[segments.length - 1] ?? '';
        return {
          topic,
          family: ancestorPath,
          label: `${ancestor.label} (${titleCase(leaf)})`,
          description: ancestor.description,
          // A leaf inherits its ancestor's attention shape along with its prose.
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

  private readFacets(
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
   * ⚠ Reaching the derived tier is a defect, and it says so — once per key:
   * a topic is being emitted that nobody authored. Reported, not thrown:
   * failing the frame would punish the player for the author's miss.
   */
  private deriveFallback(topic: string): TopicDescriptor {
    if (!TopicCatalogue.#derivedReported.has(topic)) {
      TopicCatalogue.#derivedReported.add(topic);
      void import('../../api/diagnostics').then(({ DiagnosticApi }) => DiagnosticApi.record({
        path: null,
        channel: 'topic.unauthored',
        severity: 'warning',
        message:
          `Topic '${topic}' is emitted but has no authored descriptor, ` +
          `so it resolved to a derived default. Add a document under ` +
          `${TOPIC_PREFIX}, or route the emitter to an existing topic.`,
      })).catch(() => {});
    }
    const segments = topic.split('.');
    const leaf = segments[segments.length - 1] ?? topic;
    const family = segments.length > 1 ? segments.slice(0, -1).join('.') : '';
    return {
      topic,
      family,
      label: titleCase(leaf),
      description: '(no description)',
      ...this.readFacets(undefined),
    };
  }

  /** Forget the vocabulary (an edited topic re-reads on the next warm). */
  public forget(_paths?: readonly string[]): void {
    void _paths;
    this.invalidate();
  }

  /** Residency veto — the vocabulary is never culled. */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'the topic catalogue; never culled' };
  }

  /** Singleton refusal. */
  public canDestruct(): VetoResult {
    return { ok: false, reason: 'the topic catalogue is a system singleton' };
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

