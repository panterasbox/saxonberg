/**
 * TopicApi — thin read facade over the `TopicCatalogue` singleton.
 *
 * The stable caller-facing surface for topic metadata. The state lives on
 * the seeded `/obj/TopicCatalogue` Stuff (resolved sync via
 * `StuffApi.findByTemplatePath`); this Api carries none of its own. v1
 * exposes the `communicative` predicate the renown reception gate
 * consults on the message hot path; richer topic reads (descriptors,
 * snapshot) can join here as consumers need them.
 */

import { StuffApi } from './stuff';
import { SecurityApi } from './security';
import type TopicCatalogue from '../obj/TopicCatalogue';

/** The seeded TopicCatalogue singleton, or `undefined` before boot/seed. */
function catalogue(): TopicCatalogue | undefined {
  return StuffApi.findByTemplatePath<TopicCatalogue>('/obj/TopicCatalogue');
}

export class TopicApi {
  /**
   * Whether `topic` is a **communication act** (say / whisper / shout /
   * emote / chat) — the data-driven `communicative` flag on the Topic.
   * `false` for dm, narration, system topics, and before the catalogue is
   * warmed. The renown reception gate uses this to fire only on comm
   * frames.
   */
  static isCommunicative(topic: string): boolean {
    return catalogue()?.isCommunicative(topic) ?? false;
  }
}

SecurityApi.decorateApiClass(TopicApi);
