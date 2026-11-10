/**
 * Topic — the message vocabulary, as `topic` documents (a document since
 * the path-identity build): one per dotted key, at
 * `/platform/topics/<dotted.key>`, carrying a label, a description and the
 * six attention facets the client renders and the router routes by.
 *
 * ⭐ Named by code, not by a holder: ~1,200 emitters write
 * `.topic('combat.hit')`. So no host can carry the load (documents D7's
 * mechanisms 1–4), and the message pipeline loads it itself — the one
 * engine-machinery exception (D13, the owner's "queue is fine"): the
 * dictionary warms on the FIRST scene of the process ({@link Topic.warm},
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
 * @internal the message pipeline's; an emitter names a dotted key.
 */

import { DiagnosticApi } from '../../api/diagnostics';
import { DocumentApi } from '../../api/document';
import { DocumentNotResidentError } from '../errors';
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
 * @internal the message pipeline's.
 */
export class Topic {
  /** Authored descriptors by dotted key; `null` until warmed. */
  private static dict: Map<string, TopicDescriptor> | null = null;
  /** The keys flagged `communicative`. */
  private static communicative: Set<string> = new Set();
  /** The warm in flight, if one is. */
  private static loading: Promise<void> | null = null;
  /** Keys already reported as unauthored (once per key). */
  private static readonly derivedReported = new Set<string>();

  /** Whether the dictionary is resident. */
  public static isWarm(): boolean {
    return Topic.dict !== null;
  }

  /**
   * The warm in flight — started if the dictionary is cold — or `null` when
   * it is already resident. `Scene.send` queues behind this.
   */
  public static warming(): Promise<void> | null {
    if (Topic.dict !== null) return null;
    return Topic.warm();
  }

  /** Read every `topic` document into the dictionary (one indexed read; memoized). */
  public static warm(): Promise<void> {
    if (Topic.dict !== null) return Promise.resolve();
    return (Topic.loading ??= (async () => {
      const docs = await DocumentApi.listOfKind('topic');
      Topic.install(docs.map((d) => ({ path: d.getPath(), data: d.getData() })));
    })().finally(() => {
      Topic.loading = null;
    }));
  }

  /**
   * Install the dictionary from documents — the warm's tail, and the one way
   * a unit fixture (or the test bootstrap) stands the vocabulary up.
   */
  public static install(docs: ReadonlyArray<{ path: string; data: Record<string, unknown> }>): void {
    const map = new Map<string, TopicDescriptor>();
    const communicative = new Set<string>();
    for (const { path, data } of docs) {
      const topic = Topic.keyOf(path);
      if (!topic) continue;
      if (data.communicative === true) communicative.add(topic);
      map.set(topic, {
        topic,
        family: typeof data.family === 'string' ? data.family : '',
        label: typeof data.label === 'string' && data.label.length > 0 ? data.label : topic,
        description: typeof data.description === 'string' ? data.description : '',
        ...Topic.readFacets(data),
      });
    }
    Topic.dict = map;
    Topic.communicative = communicative;
  }

  /** Forget the dictionary (a go-live re-reads on the next warm). */
  public static invalidate(): void {
    Topic.dict = null;
    Topic.communicative = new Set();
  }

  /** The dotted key a topic document is stored under (its path's leaf). */
  public static keyOf(path: string): string {
    return path.startsWith(TOPIC_PREFIX) ? path.slice(TOPIC_PREFIX.length) : path.slice(path.lastIndexOf('/') + 1);
  }

  /** The descriptor for `topic` — authored, inherited, or derived (with a diagnostic). */
  public static descriptor(topic: string): TopicDescriptor {
    const dict = Topic.resident();
    const cached = dict.get(topic);
    if (cached) return cached;
    return Topic.resolveInherited(dict, topic) ?? Topic.deriveFallback(topic);
  }

  /** Every authored descriptor — the client's snapshot. */
  public static snapshot(): TopicDescriptor[] {
    return [...Topic.resident().values()];
  }

  /** Whether `topic` is a communication act (the authored `communicative` flag). */
  public static isCommunicative(topic: string): boolean {
    Topic.resident();
    return Topic.communicative.has(topic);
  }

  private static resident(): Map<string, TopicDescriptor> {
    if (Topic.dict === null) throw new DocumentNotResidentError('topic', TOPIC_PREFIX);
    return Topic.dict;
  }

  private static resolveInherited(
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
   * ⚠ Reaching the derived tier is a defect, and it says so — once per key:
   * a topic is being emitted that nobody authored. Reported, not thrown:
   * failing the frame would punish the player for the author's miss.
   */
  private static deriveFallback(topic: string): TopicDescriptor {
    if (!Topic.derivedReported.has(topic)) {
      Topic.derivedReported.add(topic);
      void DiagnosticApi.record({
        path: null,
        channel: 'topic.unauthored',
        severity: 'warning',
        message:
          `Topic '${topic}' is emitted but has no authored descriptor, ` +
          `so it resolved to a derived default. Add a document under ` +
          `${TOPIC_PREFIX}, or route the emitter to an existing topic.`,
      });
    }
    const segments = topic.split('.');
    const leaf = segments[segments.length - 1] ?? topic;
    const family = segments.length > 1 ? segments.slice(0, -1).join('.') : '';
    return {
      topic,
      family,
      label: titleCase(leaf),
      description: '(no description)',
      ...Topic.readFacets(undefined),
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

