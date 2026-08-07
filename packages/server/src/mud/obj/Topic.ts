/**
 * Topic — per-topic descriptor as a leaf Idea.
 *
 * Each authored message-topic gets one Topic template at
 * `/obj/Topic/<dotted-path>`. The persistent prose fields
 * (`label`, `description`) are what the cockpit's filter drawer,
 * gutter tooltips, and future help system render. The catalogue
 * singleton (`/obj/TopicCatalogue`) scans these instances at lookup
 * time to build its runtime descriptor cache.
 *
 * NOT a vocabulary mirror — topic strings travel raw on the wire and
 * across server-internal call sites. `MessageApi`'s internal `TOPICS`
 * const remains the autocomplete convenience; Topic Ideas are content
 * (authored prose) layered on top, not a replacement for the const.
 *
 * Mirrors Biome's substrate-in-`lib/<subsystem>/` shape: leaf
 * templates carry inheritance via plain string ancestry (the
 * dotted-path family chain), not via a parent ref. There's no
 * `_extendsTopicPath` because topics derive their family from the
 * dotted path itself.
 */

import { Idea } from '../lib/stuff/Idea';
import { TemplatePathPrefixes } from '../lib/paths';
import type { FieldMeta } from '../lib/mixin';

export default class Topic extends Idea {
  /**
   * Per-instance template path prefix. Topic instances live at
   * `/obj/Topic/<dotted-path>` — flat path strings; the
   * dotted-path structure is meaningful only to the catalogue, not
   * to the template tree.
   */
  static readonly TEMPLATE_PATH_PREFIX = TemplatePathPrefixes.topic;

  /** Dotted topic path (e.g. `'speech.vocal'`). Non-empty. */
  public topic: string = '';

  /**
   * Family prefix — the dotted path with the last segment dropped
   * (e.g. `'world.speech'` for `'speech.vocal'`). Empty string
   * for top-level topics (`'world'`, `'system'`); a top-level entry
   * is its own root.
   */
  public family: string = '';

  /** Friendly display label (e.g. `'Say'`). Non-empty. */
  public label: string = '';

  /** Authored prose description. Non-empty. */
  public description: string = '';

  static fieldMeta: FieldMeta = {
    topic: { persistent: true },
    family: { persistent: true },
    label: { persistent: true },
    description: { persistent: true },
  };

  public getTopic(): string {
    return this.topic;
  }
  public setTopic(value: string): void {
    if (typeof value !== 'string' || value.length === 0) {
      throw new TypeError('Topic.topic must be a non-empty string');
    }
    this.topic = value;
  }

  public getFamily(): string {
    return this.family;
  }
  public setFamily(value: string): void {
    if (typeof value !== 'string') {
      throw new TypeError('Topic.family must be a string');
    }
    this.family = value;
  }

  public getLabel(): string {
    return this.label;
  }
  public setLabel(value: string): void {
    if (typeof value !== 'string' || value.length === 0) {
      throw new TypeError('Topic.label must be a non-empty string');
    }
    this.label = value;
  }

  public getDescription(): string {
    return this.description;
  }
  public setDescription(value: string): void {
    if (typeof value !== 'string' || value.length === 0) {
      throw new TypeError('Topic.description must be a non-empty string');
    }
    this.description = value;
  }
}
