/**
 * DurableMixin — **the condition axis**: worn by use, decayed by authored
 * state, never by the clock (economy Law 2: you dull the knife by cutting,
 * never by time on the wall).
 *
 * ⭐ Decay (decomposition D2) is a list of marks beside condition — rust,
 * rot, mold, frost — each a CEILING the condition cannot be mended past
 * while it stands; a pitted part has also lost metal (`getLostMass`, which
 * `Tangible.getMass` subtracts). Marks are authored on a row (`decay:`) and
 * written ONCE, at mint (the applier's phase 3); nothing advances them.
 *
 * Lives in `lib/material/` alongside the other physical-object axes — a made
 * thing has a *material* ({@link TangibleMixin}), a *form* ({@link
 * ConstructedMixin}), and a *condition* (this). The generic durable-good
 * sink: a `0..1 condition` gauge that starts pristine and drops via
 * `wear()`.
 *
 * Deliberately **NOT** "tool" — a weapon, a piece of armor, and a crafting
 * shaker are all *durable goods*, but only the shaker is a tool. Crafting's
 * `ToolMixin` (capabilities) composes this at the use site
 * (`ToolMixin(DurableMixin(…))`); armor and weapons compose it directly
 * (durability alone, no inert capability list). The clean split that stops
 * "is-a tool" from meaning "wears out". Narrow via `MixinApi.isDurable`.
 *
 * Composed on a `Thing` (or any Stuff). Opt-in repair is a later increment.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Channel } from './Channel';
import type { MarkupAugmenter } from '../../api/mml';
import type { Stuff } from '../stuff/Stuff';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../config/AppSettings';
import { MixinApi } from '../../api/mixin';
import { DecayMark, type DecayMarkRecord } from './DecayMark';

export interface Durable {
  /**
   * ⭐ Condition, 0 (worn out) .. 1 (pristine): the wear gauge times the
   * body's integrity (`Integrity.getIntegrity` — its cracks, dunts and
   * checks). ONE record (review R2-D1): a cracked jug reads worn, enough
   * cracks break it, and its strength under a blow reads this same number.
   */
  getCondition(): number;
  /** The wear gauge alone (what use wears and repair restores), before damage. */
  getWearCondition(): number;
  /** Set the wear gauge (repair's rung). Damage is mended by its own act. */
  setCondition(value: number): void;
  /**
   * Decrement condition by `amount` (clamped at 0). The wear-on-use seam.
   * `channel` names what the use did to the thing — a jar (`shock`), a
   * cut (`edge`) — so a thing made of parts can route the wear to the
   * part that gives first (assembly D7). A one-material good ignores it.
   */
  wear(amount?: number, channel?: Channel): void;
  /**
   * Whether the good is **broken** — condition at/below the
   * `crafting.brokenThreshold` dial. Broken is capability loss, not a
   * state machine: a broken tool offers no capabilities, a broken
   * weapon's delivery is floored; repair (at a steeper cost) reverses it.
   */
  isBroken(): boolean;
  /**
   * Every mend this thing has had, oldest first (repair D10). On a thing
   * made of parts, the union of its lines' records and its own.
   */
  getMends(): MendRecord[];
  /** Append one mend — written only by a mend, never by wear. */
  recordMend(record: MendRecord): void;
  /** The condition as a word anyone can see (repair D10). */
  getConditionWord(): ConditionWord;
  /**
   * The decay marks on the whole (no `part`, or `'whole'`) or on a named
   * part — copies; `[]` when it carries none (decomposition D2).
   */
  getDecayMarks(part?: string): DecayMarkRecord[];
  /** Metal corrosion has cost it, kg — `Tangible.getMass` subtracts it (D4). */
  getLostMass(): number;
  /**
   * ⭐ The condition no mend can bring the whole (or `part`) past while its
   * decay stands, and what would lift it: `brush` (scale or mold comes off),
   * `fit` (a new part), `none` (the pits stay). `cure` is `null` with no
   * mark (D10).
   */
  mendCeiling(part?: string): MendCeiling;
  /**
   * Seed field (`decay:` on a row, mint only — D3): `{ whole: { corrosion:
   * pitted } }`. A thing of one piece takes only `whole`; a typed throw
   * names the row, the part and what is wrong.
   */
  seedDecay(value: unknown): Promise<void>;
}

/** What caps a mend, and what would lift it (decomposition D10). */
export interface MendCeiling {
  ceiling: number;
  cure: 'brush' | 'fit' | 'none' | null;
}

/** The bleach dose an authored fade band lays on a dyed thing (D8). */
const FADE_DOSE: Readonly<Record<string, number>> = { faded: 0.5, bleached: 0.9 };

/**
 * ⭐ One mend, remembered (repair D10). Written by `repair` and the paid
 * service at the moment a hand mends something; never by wear. A whole
 * keeps these per part (`PartLine.mends`), a one-piece thing on itself,
 * and a part taken out of a whole carries its own away with it.
 */
export interface MendRecord {
  /** Game-clock seconds. */
  at: number;
  /** Identity path of the hand that mended it. */
  by: string;
  /** The name that hand went by when it did the work. */
  byName: string;
  /** The hand's band in the discipline, when it mended. */
  band: string;
  /** The trade the mend was done under (`''` when none could be known). */
  discipline: string;
  /** The part mended, when the thing is made of parts. */
  part?: string;
  kind: 'mended' | 'reforged' | 'tightened' | 'riveted' | 'patched';
  /** Whether it came back sound or short of it. */
  result: 'sound' | 'short';
  /**
   * ⭐ The name a reforge took (Narsil's rule, repair D9): a named part
   * re-made is not the part that bore the name. History, not a grant —
   * the hand on the latest such mend may name it again, and that right
   * is DERIVED from this record (`Assembled.canBeNamedBy`), never stored.
   */
  nameLost?: string;
}

/** Default per-use wear when a consumer doesn't specify. */
export const WEAR_PER_USE = 0.01;

/** Fallback broken threshold when the AppSettings dial isn't seeded. */
const BROKEN_THRESHOLD_FALLBACK = 0.1;

/** Numeric AppSetting read, falling back to the seeded literal (the
 * `Combustible` dial pattern — pre-warm / test safe). */
function dial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw === '' || raw == null) return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

/**
 * ⭐ The condition WORD (repair D10) — what anyone can see of a thing's
 * wear, and never a number: sound · worn · badly worn · broken.
 */
export type ConditionWord = 'sound' | 'worn' | 'badly worn' | 'broken';

/** The word for a condition, against the broken dial. */
function conditionWord(condition: number, broken: boolean): ConditionWord {
  if (broken) return 'broken';
  if (condition >= 0.8) return 'sound';
  if (condition >= 0.4) return 'worn';
  return 'badly worn';
}

/**
 * ⭐ The look line (repair D10): how worn it is, in a word, and whether it
 * has been mended — by whom, the last time. A sound, unmended thing says
 * nothing. The detail (how often, how well, by which hands) is the
 * appraiser's: `analyze condition`.
 */
function durableAugmenter(text: string, host: Stuff, _viewer: Stuff): string {
  const d = host as unknown as Partial<Durable>;
  if (typeof d.getCondition !== 'function' || typeof d.getMends !== 'function') return text;
  const sentences: string[] = [];
  const word = conditionWord(d.getCondition!(), d.isBroken?.() ?? false);
  if (word !== 'sound') sentences.push(`It is ${word}.`);
  const mends = d.getMends!();
  const last = mends[mends.length - 1];
  if (last) {
    sentences.push(last.byName ? `It has been mended by ${last.byName}.` : 'It has been mended.');
  }
  if (sentences.length === 0) return text;
  const line = sentences.join(' ');
  return text && text.length > 0 ? `${text}\n\n${line}` : line;
}

export function DurableMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class DurableMixin extends Base implements Durable {
    static _mixinName = 'DurableMixin';

    static markupAugmenters: MarkupAugmenter[] = [durableAugmenter];

    static fieldMeta: FieldMeta = {
      // ⚠ The decay fields come BEFORE `condition`: a restore applies fields
      // in declared order through `setCondition`, which clamps to the marks
      // — so the restored marks must be in place first, or a seeded mark
      // the player has since cleared would clamp the restored condition.
      decayMarks: { persistent: true, runtimeState: true },
      lostKg: { persistent: true, runtimeState: true },
      condition: { persistent: true, runtimeState: true },
      mends: { persistent: true, runtimeState: true },
      // ⭐ The authored state (D3) — a seed: written once at mint, never
      // persistent (the row's value is never state; the marks are).
      decay: { authorable: true, seed: true },
    };

    /**
     * The declared fields — unless the thing's outside is not kept (a
     * staged ship's hull, paint D7): the wear the weather put on it resets
     * with the coats it wore through. (A layer with a slice contributes no
     * `fieldMeta` of its own, so both fields are named here.)
     */
    static captureSlice(host: Stuff): { fields: Record<string, unknown> } {
      if (MixinApi.isFaced(host) && !host.persistsCoats()) return { fields: {} };
      const self = host as unknown as Durable & { mends: MendRecord[]; lostKg: number };
      return {
        fields: {
          decayMarks: self.getDecayMarks('whole'),
          lostKg: self.lostKg,
          condition: self.getWearCondition(),
          mends: self.mends.map((m) => ({ ...m })),
        },
      };
    }

    /**
     * 0..1 wear gauge; default pristine.
     */
    private _condition: number = 1;

    /**
     * Every mend, oldest first — a plain array of plain records, so it
     * persists with the host and needs no marshaller (repair D10).
     */
    public mends: MendRecord[] = [];

    /** The whole's decay marks — plain records, persisted with the host (D2). */
    public decayMarks: DecayMarkRecord[] = [];

    /** Metal the whole's corrosion has cost, kg (D4). */
    public lostKg = 0;

    protected get condition(): number {
      return this._condition;
    }
    protected set condition(value: number) {
      // Per-field invariant on the accessor: clamp into 0..1.
      this._condition = Math.max(0, Math.min(1, value));
    }

    getCondition(): number {
      const self = this as unknown as Stuff;
      const integrity = MixinApi.isIntegrity(self) ? self.getIntegrity() : 1;
      return this._condition * integrity;
    }

    getWearCondition(): number {
      return this._condition;
    }

    setCondition(value: number): void {
      // ⭐ The ceiling holds while the mark stands (D2) — the one write-side clamp.
      this.condition = Math.min(value, this.mendCeiling().ceiling);
    }

    getDecayMarks(part?: string): DecayMarkRecord[] {
      if (part !== undefined && part !== 'whole') return [];
      return this.decayMarks.map((m) => ({ ...m }));
    }

    getLostMass(): number {
      return Number.isFinite(this.lostKg) && this.lostKg > 0 ? this.lostKg : 0;
    }

    mendCeiling(_part?: string): MendCeiling {
      const marks = this.decayMarks.map((r) => new DecayMark(r));
      if (marks.length === 0) return { ceiling: 1, cure: null };
      const ceiling = Math.min(...marks.map((m) => m.ceiling()));
      const brushable = marks.some((m) => {
        const c = m.clearedBy();
        return c === 'scouring' || c === 'brushing';
      });
      return { ceiling, cure: brushable ? 'brush' : 'none' };
    }

    /**
     * ⭐ The authored state, written once (D3). One piece takes only
     * `whole`; an assembly's override takes its parts and hands `whole`
     * here. The material decides what is legal (`marksFrom`); `fade` goes
     * to the dye stack (D8) and keeps no mark.
     */
    async seedDecay(value: unknown): Promise<void> {
      const host = this as unknown as Stuff;
      const row = host.getTemplatePath() ?? host.constructor.name;
      if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        throw new TypeError(`${row}: decay must be a map of part → { mechanism: band }`);
      }
      for (const key of Object.keys(value)) {
        if (key !== 'whole') {
          throw new RangeError(
            `${row}: decay.${key} — a thing of one piece takes only 'whole'`,
          );
        }
      }
      const entry = (value as Record<string, unknown>).whole;
      if (entry === undefined) return;
      const material = MixinApi.isTangible(host) ? host.getMaterial() : null;
      if (!material) throw new RangeError(`${row}: decay.whole — it has no material to decay`);
      if (!MixinApi.hasDegradation(material)) {
        throw new RangeError(
          `${row}: decay.whole — ${material.getName() || 'its material'} does not break down`,
        );
      }
      let records: DecayMarkRecord[];
      try {
        records = material.marksFrom(entry);
      } catch (err) {
        throw new RangeError(`${row}: decay.whole — ${(err as Error).message}`);
      }
      const marks: DecayMarkRecord[] = [];
      for (const r of records) {
        if (r.mechanism !== 'fade') {
          marks.push(r);
          continue;
        }
        if (!MixinApi.isDyed(host)) {
          throw new RangeError(`${row}: decay.whole — fade is a dyed thing's, and this is not dyed`);
        }
        host.bleach(FADE_DOSE[r.band] ?? 0);
      }
      const rawKg = MixinApi.isTangible(host) ? host.getDryMass().rawValue() + this.getLostMass() : 0;
      this.decayMarks = marks;
      const read = marks.map((r) => new DecayMark(r));
      this.lostKg = rawKg * read.reduce((sum, m) => sum + m.lostShare(), 0);
      const ceiling = read.length === 0 ? 1 : Math.min(...read.map((m) => m.ceiling()));
      this.condition = Math.min(this._condition, ceiling);
    }

    wear(amount: number = WEAR_PER_USE, _channel?: Channel): void {
      if (!Number.isFinite(amount) || amount < 0) return;
      this.condition = this._condition - amount;
    }

    getMends(): MendRecord[] {
      return this.mends.map((m) => ({ ...m }));
    }

    getConditionWord(): ConditionWord {
      return conditionWord(this.getCondition(), this.isBroken());
    }

    recordMend(record: MendRecord): void {
      this.mends = [...this.mends, { ...record }];
    }

    isBroken(): boolean {
      // Capability lost — by wear or by damage, read off the one condition.
      // (Shattered, destroyed into sherds by a blow, is Tangible's act.)
      return (
        this.getCondition() <=
        dial(AppSettingKeys.craftingBrokenThreshold, BROKEN_THRESHOLD_FALLBACK)
      );
    }
  };
}
