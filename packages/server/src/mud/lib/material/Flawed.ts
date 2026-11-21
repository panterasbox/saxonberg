/**
 * FlawedMixin — ⭐ **the flaws a body carries, and what they let through**
 * (matter-model-overlaps D5, N1).
 *
 * The flaw RECORD, split out of `IntegrityMixin`: a crack, a dunt, the
 * checks of too-fast drying, a casting's faults — and a hole stove in a
 * hull. How whole the flaws leave the body (`getIntegrity`), and the ONE
 * rule for what a hole or a crack lets through (`flawLeakLPerHour`): a
 * vessel asks it for what runs OUT, a hull for what comes IN.
 *
 * ## What this mixin IS for
 *
 * Anything that can carry a flaw — every article (`IntegrityMixin`
 * composes it, so `Good` and `Vessel` carry it unchanged) and a ship's
 * hull, which can be holed on a snag without being something you drop,
 * tap or break into sherds.
 *
 * ## What this mixin is NOT for
 *
 * - **Impact, ring, wet failure.** Those are `IntegrityMixin`'s: *articles
 *   you can drop, throw, tap and crack*. A ship has no mass to fall with.
 * - **A building's damage.** That is construction's layer wear; a
 *   `Structure` does not compose this.
 * - **Wear by use.** `DurableMixin`'s gauge.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { MarkupAugmenter } from '../../api/mml';
import type Material from './Material';
import { MixinApi } from '../../api/mixin';
import { AppApi } from '../../api/app';
import { WorldClockApi } from '../../api/worldclock';
import { AppSettingKeys } from '../config/AppSettings';

/**
 * A body's flaw kinds. ⭐ A casting's two faults are kinds of their own
 * (review R2-D7) so the flaw IS the fact and its words derive from it: a
 * `misrun` froze before the cavity filled; `shrinkage` is the porous place
 * that froze last with nothing to feed it; `blowhole` is a damp mould's
 * steam through the metal (B104 — it was a baked grade and baked prose).
 */
export type FlawKind = 'dunt' | 'crack' | 'misrun' | 'shrinkage' | 'blowhole' | 'check' | 'holed';

/** A flaw in a body — a dunt from a heat shock, a crack, a casting fault, a hole. */
export interface Flaw {
  kind: FlawKind;
  /** Can an eye find it? A hidden one only `ring` finds. */
  visible: boolean;
  /** Game-second it happened. */
  atS: number;
  /**
   * How it was mended, if it was — a tinker's rivets across a crack, a
   * patch over a hole. ⭐ DERIVED on read (review R2-D1), never stored: a
   * crack or dunt is riveted when the body's mend record
   * (`Durable.getMends`) holds a `riveted` mend made at or after it; a hole
   * is patched by a `patched` mend the same way. The mend is recorded once.
   */
  mended?: 'riveted' | 'patched';
}

/**
 * ⭐⭐ Two kinds of flaw (review R2-D1). DAMAGE — something that happened to
 * the body — costs it integrity. A fault in the MAKING is the work's
 * quality (`Integrity.gradeAfterFaults`), and costs none.
 */
const DAMAGE_PENALTY: Readonly<Partial<Record<FlawKind, number>>> = {
  dunt: 0.3,
  crack: 0.5,
  check: 0.15,
  // ⭐ A hole stove in a hull: she leaks through it.
  holed: 0.5,
};

/** Which mend closes which flaw. */
const MENDED_BY: Readonly<Partial<Record<FlawKind, 'riveted' | 'patched'>>> = {
  crack: 'riveted',
  dunt: 'riveted',
  holed: 'patched',
};

/** What a look says of a flaw an eye can find — and of a mend. */
const FLAW_WORDS: Readonly<Record<FlawKind, string>> = {
  crack: 'It is cracked.',
  dunt: 'A fine crack runs through it where a shock of heat caught it.',
  misrun: 'It froze before the mould was full: the thin parts are ragged and short, and an edge runs out into nothing.',
  shrinkage:
    'Where it froze last it is porous, pitted with little shrinkage holes — the metal drew in and nothing fed it.',
  blowhole: 'It is honeycombed with steam holes, where a damp mould blew under the pour.',
  check: 'Fine checks run across its surface where it dried too fast.',
  holed: 'There is a hole stove in it.',
};

/** What a look says of a mended flaw. */
const MEND_WORDS: Readonly<Record<'riveted' | 'patched', string>> = {
  riveted: 'It has been riveted across a crack: a row of iron staples holds it together.',
  patched: 'A hole in it has been patched over.',
};

/** Game-seconds now, or 0 with no clock (a unit world). */
function flawedNowS(): number {
  try {
    return WorldClockApi.getNow().rawValue();
  } catch {
    // @quiet a unit world has no clock: a flaw with no time is stamped at 0.
    return 0;
  }
}

/** One numeric dial read, falling back to the literal when unseeded. */
function flawedDial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw == null || raw === '') return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    // @quiet a cold settings cache reads the shipped grain.
    return fallback;
  }
}

export interface Flawed {
  /** The flaws in this body, visible and hidden (ceramics M5), mends derived. */
  getFlaws(): readonly Flaw[];
  /** Record a flaw (`atS`: when, if the caller knows — the clock is the caller's). */
  addFlaw(kind: FlawKind, visible: boolean, atS?: number): void;
  /**
   * ⭐ A pile's flaws when it splits or merges (R2-B6): `visible` copies
   * the flaws an eye can find (a split-off of a cracked pile is cracked —
   * they are why it is its own pile), `!visible` the hidden ones (a merge
   * carries them, so stacking never launders a crack). Hidden flaws never
   * split a stack: a pile refusing to merge would tell what only `ring`
   * may (Blessable's rule).
   */
  takeFlawsFrom(other: Stuff, visible: boolean): void;
  /**
   * ⭐ How whole this body is, `0.1..1`, by its DAMAGE (cracks, dunts,
   * checks, holes; a mended one costs half). Faults in the making are not
   * damage.
   */
  getIntegrity(): number;
  /**
   * ⭐⭐ The ONE hole rule (matter-model-overlaps D4): what this body's
   * unmended cracks and holes let through, L/h —
   * `Σ flaws.leak.<kind>LPerHour × √headM × scaleM`. A vessel passes its
   * liquid's depth and a scale of 1; a hull passes her draft and her length
   * (a longer hull strikes harder and opens more of herself). Mended flaws
   * let nothing through.
   */
  flawLeakLPerHour(headM: number, scaleM: number): number;
  /**
   * ⭐ Is there an UNMENDED flaw of one of `kinds` in this body (any kind
   * when omitted)? A cracked mould casts the material's own shape, a holed
   * ship goes nowhere, a cracked or holed vessel lets a pour run out.
   */
  hasOpenFlaw(kinds?: readonly FlawKind[]): boolean;
  /**
   * @hook ⭐ The material a patch over a hole in this body is made of
   * (D8): an article's own material by default; a ship answers her
   * authored `hull.material`. `null` when nothing is authored — and then a
   * hole is refused its patch, never mended with whatever is at hand.
   */
  patchMaterial(): Material | null;
}

/**
 * ⭐ The flaws a look can see, and the mends. Before this a `visible` flaw
 * was seen by nothing: a cracked bowl read as a sound one (the ceramics
 * drive C, run 37). A hidden one stays hidden — only `ring` finds it.
 */
const flawAugmenter: MarkupAugmenter = (text, host, _viewer, opts) => {
  if (opts?.filter) return text;
  if (!MixinApi.isFlawed(host)) return text;
  const lines: string[] = [];
  const seen = new Set<string>();
  for (const f of host.getFlaws()) {
    const line = f.mended !== undefined ? MEND_WORDS[f.mended] : f.visible ? FLAW_WORDS[f.kind] : '';
    if (line && !seen.has(line)) {
      seen.add(line);
      lines.push(line);
    }
  }
  if (lines.length === 0) return text;
  const all = lines.join(' ');
  return text && text.length > 0 ? `${text}\n\n${all}` : all;
};

export function FlawedMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class FlawedMixin extends Base implements Flawed {
    static _mixinName = 'FlawedMixin';

    static markupAugmenters: MarkupAugmenter[] = [flawAugmenter];

    static fieldMeta: FieldMeta = {
      // ⭐ The flaws a body carries — a dunt, a crack, a casting fault, a
      // hole (ceramics M5). Authorable so a row can ship a cracked bell.
      flaws: { persistent: true, authorable: true, runtimeState: true },
    };

    /** See {@link Flawed.getFlaws}. */
    public flaws: Flaw[] = [];

    public getFlaws(): readonly Flaw[] {
      // ⭐ Whether a flaw is mended is read off the ONE mend record (review
      // R2-D1): a `riveted` (crack, dunt) or `patched` (hole) mend made at
      // or after it. The mend shows, so a mended flaw is visible.
      const self = this as unknown as Stuff;
      const mends = MixinApi.isDurable(self) ? self.getMends() : [];
      if (mends.length === 0) return this.flaws;
      return this.flaws.map((f) => {
        const by = MENDED_BY[f.kind];
        if (by === undefined) return f;
        return mends.some((m) => m.kind === by && m.at >= f.atS) ? { ...f, visible: true, mended: by } : f;
      });
    }

    public addFlaw(kind: FlawKind, visible: boolean, atS?: number): void {
      // ⭐ A flaw is stamped with when it happened (the clock, when the
      // caller has no better time): a mend mends what came BEFORE it.
      const when = atS ?? flawedNowS();
      this.flaws = [...this.flaws, { kind, visible, atS: when }];
    }

    public takeFlawsFrom(other: Stuff, visible: boolean): void {
      if (!MixinApi.isFlawed(other)) return;
      const taken = other.getFlaws().filter((f) => f.visible === visible);
      if (taken.length > 0) {
        this.flaws = [...this.flaws, ...taken.map((f) => ({ kind: f.kind, visible: f.visible, atS: f.atS }))];
      }
    }

    public getIntegrity(): number {
      let penalty = 0;
      for (const f of this.getFlaws()) {
        penalty += (DAMAGE_PENALTY[f.kind] ?? 0) * (f.mended ? 0.5 : 1);
      }
      return Math.max(0.1, 1 - penalty);
    }

    public flawLeakLPerHour(headM: number, scaleM: number): number {
      const head = Math.sqrt(Math.max(0, Number(headM) || 0));
      const scale = Math.max(0, Number(scaleM) || 0);
      if (!(head > 0) || !(scale > 0)) return 0;
      let perHour = 0;
      for (const f of this.getFlaws()) {
        if (f.mended) continue;
        if (f.kind === 'crack') perHour += flawedDial(AppSettingKeys.flawsLeakCrackLPerHour, CRACK_L_PER_HOUR);
        else if (f.kind === 'holed') perHour += flawedDial(AppSettingKeys.flawsLeakHoledLPerHour, HOLED_L_PER_HOUR);
      }
      return perHour * head * scale;
    }

    public hasOpenFlaw(kinds?: readonly FlawKind[]): boolean {
      return this.getFlaws().some((f) => !f.mended && (kinds === undefined || kinds.includes(f.kind)));
    }

    public patchMaterial(): Material | null {
      const self = this as unknown as Stuff;
      return MixinApi.isTangible(self) ? self.getMaterial() : null;
    }
  };
}

/**
 * ⭐ What an open crack lets through, L/h at a meter of head and a scale of
 * one (`flaws.leak.crackLPerHour`, grain): a full ten-litre crock that has
 * cracked loses nearly two litres in its first hour.
 */
const CRACK_L_PER_HOUR = 4;

/**
 * ⭐ What a hole lets through, L/h at a meter of head and a meter of hull
 * (`flaws.leak.holedLPerHour`, grain): the rowboat (4.5 m, 0.25 m draft)
 * takes 0.4 L/s — under one bucket's 0.5 L/s, so bailing keeps her up — and
 * the Hesper (30 m, 1.2 m) about 5.8 L/s, near her shipped 7.5.
 */
const HOLED_L_PER_HOUR = 640;
