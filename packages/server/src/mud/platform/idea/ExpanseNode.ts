/**
 * ExpanseNode — a point of interest in an expanse: a place you can be
 * AT, reached by setting a course.
 *
 * ⭐ Three authored facts, and ordinary content after that (requirements
 * AC 1):
 *
 * - **`kind`** — `place` (a cove you can see across; its content is a
 *   Location you are IN, and crossing it is `go`) or `passage` (water you
 *   go THROUGH).
 * - **`passage`** — for a passage, `linear` (a fraction along one
 *   dimension — a channel over a bar, which rides a confined band named
 *   by `along`) or `areal` (a point you reach by bearing).
 * - **`destination`** — the Location behind it, if any. **Most nodes have
 *   none**: open sea is a node you can be at with nothing to step onto.
 *
 * A node is an Idea, never a room, so nothing is ever inside the frame
 * and nothing about a node enters the location graph. Its position is
 * geographic (`Positioned`) — authored anywhere, on no lattice.
 */

import { Idea } from '../../lib/stuff/Idea';
import { SingletonMixin } from '../../lib/stuff/Singleton';
import { NamedMixin } from '../../lib/description/Named';
import { PositionedMixin } from '../../lib/expanse/Positioned';
import type { FieldMeta } from '../../lib/mixin';

export const NODE_KINDS = ['place', 'passage'] as const;
export type NodeKind = (typeof NODE_KINDS)[number];
export const PASSAGE_KINDS = ['linear', 'areal'] as const;
export type PassageKind = (typeof PASSAGE_KINDS)[number];

export default class ExpanseNode extends PositionedMixin(
  NamedMixin(SingletonMixin(Idea)),
) {
  static fieldMeta: FieldMeta = {
    kind: { persistent: true, authorable: true },
    passage: { persistent: true, authorable: true },
    destination: { persistent: true, authorable: true },
    along: { persistent: true, authorable: true },
    outsideDescription: { persistent: true, authorable: true },
  };

  protected kind: NodeKind = 'passage';
  protected passage: PassageKind | null = 'areal';
  protected destination: string | null = null;
  protected along: string | null = null;
  protected outsideDescription = '';

  public getKind(): NodeKind { return this.kind; }
  public setKind(v: NodeKind): void {
    if (!NODE_KINDS.includes(v)) {
      throw new Error(`ExpanseNode: kind must be ${NODE_KINDS.join(' | ')}; got ${JSON.stringify(v)}`);
    }
    this.kind = v;
    if (v === 'place') this.passage = null;
  }

  public getPassage(): PassageKind | null { return this.passage; }
  public setPassage(v: PassageKind | null): void {
    if (v !== null && v !== undefined && !PASSAGE_KINDS.includes(v)) {
      throw new Error(`ExpanseNode: passage must be ${PASSAGE_KINDS.join(' | ')}; got ${JSON.stringify(v)}`);
    }
    this.passage = v ?? null;
  }

  public getDestination(): string | null { return this.destination; }
  public setDestination(v: string | null): void { this.destination = v ?? null; }

  /** The confined band a linear passage rides; required when linear. */
  public getAlong(): string | null { return this.along; }
  public setAlong(v: string | null): void { this.along = v ?? null; }

  public getOutsideDescription(): string { return this.outsideDescription; }
  public setOutsideDescription(v: string): void { this.outsideDescription = (v ?? '').trim(); }

  public isLinear(): boolean {
    return this.kind === 'passage' && this.passage === 'linear';
  }

  /**
   * Does this node answer to `word` — a word of its name, its whole name,
   * an alternate name, or its row key? How `course <node>` resolves a node
   * against its own expanse (never through MQL: a node is not in the
   * room).
   */
  public answersTo(word: string): boolean {
    const w = word.trim().toLowerCase().replace(/^the\s+/, '');
    if (w === '') return false;
    const name = this.getName().toLowerCase();
    const bare = name.replace(/^the\s+/, '');
    if (w === name || w === bare) return true;
    if (bare.split(/\s+/).includes(w)) return true;
    const key = (this.getTemplatePath() ?? '').split('/').pop() ?? '';
    if (w === key.toLowerCase()) return true;
    return this.hasAlternateName(word.trim());
  }
}
