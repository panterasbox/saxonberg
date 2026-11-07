/**
 * Plumbed — ⭐⭐ **whether a place has water piped into it, and in what
 * pipe.** One more layer of a room's fabric, beside its walls and roof
 * (`Enclosed`): a room either has water or does not, and its pipe has a
 * material (water-supply requirements § 3).
 *
 * ```yaml
 * plumbing: lead       # the pipe is lead — soft acid water takes it up
 * plumbing: none       # not plumbed: the tap is dry until a plumber lays a run
 * ```
 *
 * ⭐⭐ **The ordinary case authors nothing.** A room that holds a piped
 * fixture IS plumbed, in the universe default (`plumbing.defaultRun`, iron):
 * a tap implies its pipe. An author writes `plumbing:` only to say something
 * the default does not — a lead house, a room waiting for its plumber. Before
 * this, every room with a tap had to prop a pipe object and a lint forced it
 * on sixteen rooms: noise authored as content (the review, 2026-11-06).
 *
 * The pipe itself is a `PipeRun`, because it has state a word cannot hold —
 * frost, a burst, a mend, lead standing in it overnight — and `repair` needs
 * a thing to work on. The room stands its run up ONCE, on the first read
 * that needs it ({@link Plumbed.plumbingRun}), from the run row its word
 * names (`/stuff/thing/fixture/<word>-run`); it is part of the room's
 * structure, so the listing leaves it out. A run an author or a plumber put
 * in the room is that room's run, and none is stood up beside it.
 *
 * ⚠ Not on `Enclosed`: a pipe bounds nothing. Not on a `Structure`: a
 * structure is never made of anything (every material belongs to a place),
 * and a lone hut is plumbed with no building. Composed on
 * the ROOM classes (`Room`, `Hall` and their kept twins) and nowhere
 * else — a street, a field or a yard never carries the field.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import { StuffApi } from '../../api/stuff';
import { ContainmentApi } from '../../api/containment';
import { MixinApi } from '../../api/mixin';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../config/AppSettings';

/** What a place says of its plumbing: a run word (`lead`, `iron`), or `none`. */
export type PlumbingSpec = string;

/** Where a run word's row lives — the pre-laid run of that material. */
const RUN_ROW_PREFIX = '/stuff/thing/fixture/';

export interface Plumbed {
  /** What this place's row says of its plumbing — raw, or `null` (the default). */
  getPlumbing(): PlumbingSpec | null;
  setPlumbing(value: PlumbingSpec | null): void;
  /** Is this place plumbed at all (anything but `none`)? */
  isPlumbed(): boolean;
  /**
   * ⭐ The run row this place's plumbing stands up — its word's, else the
   * universe default's — or `null` when it is not plumbed.
   */
  plumbingRunRow(): string | null;
  /**
   * The pipe in this place: the one its row says, stood up the first time
   * it is needed and kept from then on; `null` when it is not plumbed.
   * Callers that look for a run an author or a plumber put here ask this
   * only when they find none.
   */
  plumbingRun(): Promise<Stuff | null>;
}

export function PlumbedMixin<TBase extends MixinConstructor>(Base: TBase) {
  class PlumbedMixin extends Base implements Plumbed {
    static _mixinName = 'PlumbedMixin';

    static fieldMeta: FieldMeta = {
      plumbing: { persistent: true, authorable: true },
    };

    /** The authored word, or `null` (the default). */
    public plumbing: PlumbingSpec | null = null;

    /** The run being stood up, so two taps in one room make one pipe. */
    private _standingUp: Promise<Stuff | null> | null = null;

    public getPlumbing(): PlumbingSpec | null {
      return this.plumbing;
    }

    public setPlumbing(value: PlumbingSpec | null): void {
      if (value !== null && (typeof value !== 'string' || value.trim() === '')) {
        throw new TypeError(`Plumbed.plumbing: expected a run word or 'none', got ${JSON.stringify(value)}`);
      }
      this.plumbing = value === null ? null : value.trim();
    }

    public isPlumbed(): boolean {
      return this.plumbing !== 'none';
    }

    public plumbingRunRow(): string | null {
      if (!this.isPlumbed()) return null;
      const word = this.plumbing ?? PlumbedMixin.defaultRunWord();
      return `${RUN_ROW_PREFIX}${word}-run`;
    }

    public async plumbingRun(): Promise<Stuff | null> {
      const row = this.plumbingRunRow();
      if (row === null) return null;
      const self = this as unknown as Stuff;
      if (MixinApi.isContainer(self)) {
        const here = (self.getContents() as Stuff[]).find((s) => s.getTemplatePath() === row);
        if (here) return here;
      }
      if (this._standingUp === null) {
        this._standingUp = (async () => {
          try {
            const run = await StuffApi.clone<Stuff>(row);
            if (MixinApi.isContainer(self) && MixinApi.isContainable(run)) {
              ContainmentApi.move(run, self);
            }
            return run;
          } catch (err) {
            // ⚠ A word with no run row is a content error, said loudly: the
            // tap reads the room unplumbed rather than inventing a pipe.
            console.warn(`Plumbed: ${self.getTemplatePath() ?? '?'} names no run at ${row}: ${String(err)}`);
            return null;
          }
        })().finally(() => {
          this._standingUp = null;
        });
      }
      return this._standingUp;
    }

    /** The universe default run word (`plumbing.defaultRun`). */
    private static defaultRunWord(): string {
      try {
        const raw = AppApi.setting(AppSettingKeys.plumbingDefaultRun);
        if (typeof raw === 'string' && raw.trim() !== '') return raw.trim();
      } catch {
        // Unwarmed settings read the shipped default.
      }
      return 'iron';
    }
  }
  return PlumbedMixin;
}
