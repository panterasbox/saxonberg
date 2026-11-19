/**
 * Reason — ⭐⭐ **one reason an act can be refused, its facts' shape, and its
 * wording** (failure-model D1–D2), as a `reason` document any pack ships:
 *
 * ```yaml
 * # content/reasons/locked.yaml  →  /platform/reasons/locked
 * facts:
 *   target: thing
 * says: "{{ target | item | cap }} is locked."
 * ```
 *
 * The object that refuses names the reason and hands over the facts; the
 * row words them; the controller does neither. Re-wording a refusal is an
 * edit to one row, and a pack adds its own reasons with no kernel change
 * (`/trade/forestry/reasons/wrong-tool`).
 *
 *  - `facts` — fact name → kind: `thing` (a live thing), `things` (a list
 *    of them), `text`, `number`. A trailing `?` makes one optional.
 *  - `says` — a Liquid template, rendered through `ProseApi`, so a thing
 *    fact takes the presentation filters (`item`, `name`, `cap`, …).
 *  - `topic` — the message topic the line goes on; `act.deed` by default.
 *  - `catchable` — `false` on the rows that word a defect (`went-wrong`,
 *    `content-error`): no script may name them in `on`.
 *
 * The reasons are SERVED by `ReasonCatalogue`, reached as
 * `CommandApi.reasons()`.
 */

import { Mml } from '../../api/mml';
import { StuffApi } from '../../api/stuff';
import { Prose } from '../prose/Prose';
import { Stuff } from '../stuff/Stuff';

/** What a fact is: one thing, several, text or a number. */
export type ReasonFactKind = 'thing' | 'things' | 'text' | 'number';

/** One declared fact: its kind, and whether a refusal may leave it out. */
export interface ReasonFactSpec {
  kind: ReasonFactKind;
  optional: boolean;
}

/** The topic a refusal's line goes on when its row names none. */
export const DEFAULT_REASON_TOPIC = 'act.deed';

/** One reason — see the module header. */
export class Reason {
  public constructor(
    private readonly path: string,
    private readonly facts: Readonly<Record<string, ReasonFactSpec>>,
    private readonly says: Prose,
    private readonly topic: string,
    private readonly catchable: boolean,
  ) {}

  /** The row's path — its identity. */
  public getPath(): string {
    return this.path;
  }

  /** The facts it declares, by name. */
  public getFacts(): Readonly<Record<string, ReasonFactSpec>> {
    return this.facts;
  }

  /** The message topic its line goes on. */
  public getTopic(): string {
    return this.topic;
  }

  /** May a script handle it (`on <reason>`)? `false` for a defect's row. */
  public isCatchable(): boolean {
    return this.catchable;
  }

  /**
   * ⭐ The sentence, for these facts. A thing given as a wire reference
   * (`{ stuffId }`) is looked up live; one that is gone is worded by the
   * name it was sent with.
   */
  public say(facts: Readonly<Record<string, unknown>>): Mml {
    const vars: Record<string, unknown> = {};
    for (const [name, value] of Object.entries(facts)) vars[name] = this.live(value);
    return this.says.render(vars);
  }

  /**
   * Which fact does not fit the row — missing, undeclared, or of the wrong
   * kind — or `null` when they all do. A misfit is a bug at the refusing
   * site: it is still worded with what is there.
   */
  public mismatch(facts: Readonly<Record<string, unknown>>): string | null {
    for (const [name, spec] of Object.entries(this.facts)) {
      const value = facts[name];
      if (value === undefined || value === null) {
        if (!spec.optional) return `missing fact '${name}'`;
        continue;
      }
      if (!this.fits(spec.kind, value)) return `fact '${name}' is not ${spec.kind}`;
    }
    for (const name of Object.keys(facts)) {
      if (!(name in this.facts)) return `undeclared fact '${name}'`;
    }
    return null;
  }

  private fits(kind: ReasonFactKind, value: unknown): boolean {
    switch (kind) {
      case 'thing':
        return value instanceof Stuff || Reason.isRef(value);
      case 'things':
        return Array.isArray(value) && value.every((v) => v instanceof Stuff || Reason.isRef(v));
      case 'number':
        return typeof value === 'number';
      case 'text':
        return typeof value === 'string' || value instanceof Mml;
    }
  }

  private live(value: unknown): unknown {
    if (Array.isArray(value)) return value.map((v) => this.live(v));
    if (!Reason.isRef(value)) return value;
    return StuffApi.findById(value.stuffId) ?? value.displayName ?? 'something';
  }

  private static isRef(value: unknown): value is { stuffId: string; displayName?: string } {
    // A wire reference: what an envelope's facts carry for a thing.
    return typeof value === 'object' && value !== null && !(value instanceof Stuff) &&
      typeof (value as { stuffId?: unknown }).stuffId === 'string';
  }
}
