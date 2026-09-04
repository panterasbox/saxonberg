/**
 * HelpConcept — ⭐⭐ **a player-facing help topic about a CONCEPT**, as
 * distinct from a command, an Api or a mixin.
 *
 * The help index is *harvested*: commands come from the loaded command
 * roster, the author surface from `author-surface.json`, collections
 * from their schema docs. Every one of those projectors reads something
 * that already exists for another reason — which is why the index has
 * never been able to explain **what nitrogen is**, or what a body
 * condition score means, or why a sward has a residual.
 *
 * ⚠ **`help api` is the author surface and player help is a different
 * thing** (farmstead D102). A build that adds a whole agronomy owes
 * both: the API reference is the extensibility, and **the concepts are
 * the pedagogy**. A player who can read the signature of
 * `Soil.fixNitrogen` and cannot find out what nitrogen fixation IS has
 * been handed the wrong half.
 *
 * ## Why an Idea rather than a document kind
 *
 * A document kind is a platform act needing a code consumer and a
 * go-live hook, and this needs neither: a concept is **reference data**,
 * exactly like a `Material` or a `Discipline`, so it is a template row
 * and the catalogue reads the rows. No new collection, no new kind, no
 * installer surface — and a pack ships one by writing YAML.
 *
 * ⚠ It is never instanced. The catalogue reads TEMPLATES
 * (`Template.findByClass`), because a concept has no runtime existence
 * and cloning one would be meaningless.
 */

import { Idea } from '../../lib/stuff/Idea';
import type { FieldMeta } from '../../lib/mixin';

export default class HelpConcept extends Idea {
  static fieldMeta: FieldMeta = {
    key: { persistent: true, authorable: true },
    title: { persistent: true, authorable: true },
    summary: { persistent: true, authorable: true },
    body: { persistent: true, authorable: true },
    keywords: { persistent: true, authorable: true },
    seeAlso: { persistent: true, authorable: true },
  };

  /** The topic's id tail — `help nitrogen` finds `concept.nitrogen`. */
  protected key = '';

  /** What it is called. */
  protected title = '';

  /** One line, for the index. */
  protected summary = '';

  /** The entry itself. MML markup, like every other help body. */
  protected body = '';

  /** Typeahead corpus. */
  protected keywords: string[] = [];

  /** Other concept keys worth reading next. */
  protected seeAlso: string[] = [];

  public getKey(): string { return this.key; }
  public setKey(value: string): void { this.key = value; }

  public getTitle(): string { return this.title; }
  public setTitle(value: string): void { this.title = value; }

  public getSummary(): string { return this.summary; }
  public setSummary(value: string): void { this.summary = value; }

  public getBody(): string { return this.body; }
  public setBody(value: string): void { this.body = value; }

  public getKeywords(): readonly string[] { return this.keywords; }
  public setKeywords(value: string[]): void {
    this.keywords = Array.isArray(value) ? value : [];
  }

  public getSeeAlso(): readonly string[] { return this.seeAlso; }
  public setSeeAlso(value: string[]): void {
    this.seeAlso = Array.isArray(value) ? value : [];
  }
}
