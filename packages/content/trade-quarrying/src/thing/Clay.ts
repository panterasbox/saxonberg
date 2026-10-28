/**
 * Clay — ⭐⭐ **a lump of clay is a COMPOSITION** (ceramics M3, D12).
 *
 * The clay brick you get is the clay you built. A clay MATERIAL row says
 * what a kind of clay is made of (`earth/clay`: half clay mineral, a third
 * sand, some iron, lime and organic matter); this lump's own `makeup`
 * records what was kneaded into it since (sand, grog, breeze — the temper
 * pit's blend by mass). Everything a brickmaker or a potter reads off a clay
 * DERIVES from that composition:
 *
 *  - `plasticity()` — its clay-mineral share, raised by weathering;
 *  - `crackRisk()` — fat (plastic) clay shrinks and cracks as it dries;
 *    sand, grog and breeze open it up;
 *  - `firedColor()` — the iron in it: red, buff, or near white;
 *  - `refractoriness()` — little iron, lime and organic flux, much clay
 *    mineral: a FIRECLAY that stands a furnace's heat.
 *
 * ⭐ And it has a YEAR. Dug in autumn and left in a heap outside, a winter's
 * freeze-thaw crossings break it up and mellow it (`weatheredDays`, advanced
 * on read by its place's `freezeThawDaysSince` — 0 indoors), up to
 * `ceramics.weathering.ceilingDays`: a heap kept in a shed stays raw.
 *
 * Why quarrying owns the class: `dig` mints it (the band's `wins:` row),
 * the burner mints ash so fuel owns ash — the trade whose act mints a thing
 * owns its class. It is a `Lump` (pools, has a temperature, so it fires by
 * its material's heat transitions) with a composition and a water state.
 */

import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type Material from '@saxonberg/server/mud/lib/material/Material';
import type { CompositionEntry } from '@saxonberg/server/mud/lib/material/Material';
import type { MarkupAugmenter } from '@saxonberg/server/mud/api/mml';
import { CompositionMixin } from '@saxonberg/server/mud/lib/material/Composition';
import { WaterActivityMixin } from '@saxonberg/server/mud/lib/material/WaterActivity';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { AppApi } from '@saxonberg/server/mud/api/app';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import Lump from './Lump';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { PersistableApi } from '@saxonberg/server/mud/api/persistable';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { Grade } from '@saxonberg/server/mud/lib/craft/Grade';
import { FormGrammar, ParsedForm } from '@saxonberg/server/mud/lib/craft/FormSpec';
import type {
  Shapeable,
  ShapePlan,
  ShapeRefusal,
  ShapeRequest,
  Formable,
  FormingHand,
} from '@saxonberg/server/mud/lib/craft/Shapeable';
import type { CompetenceBandName } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';

/**
 * ⭐ What a hand at a band raises (ceramics D16) — deterministic: a
 * beginner's walls are thick and their pots heavy, never failed; the
 * largest form a band can raise is its ceiling, refused above. Dials are
 * `ceramics.wall.factor.<band>` / `ceramics.wall.maxL.<band>`.
 */
/** A potter's hand — the kernel's `FormingHand`, read for clay. */
export type PotterHand = FormingHand;

const WALL_FACTOR: Readonly<Record<CompetenceBandName, number>> = {
  untrained: 1.8,
  novice: 1.6,
  competent: 1.25,
  proficient: 1.0,
  expert: 0.85,
};
const MAX_L: Readonly<Record<CompetenceBandName, number>> = {
  untrained: 0.5,
  novice: 1.5,
  competent: 4,
  proficient: 10,
  expert: 30,
};
const GRADE_OF: Readonly<Record<CompetenceBandName, number>> = {
  untrained: 0,
  novice: 0,
  competent: 1,
  proficient: 2,
  expert: 3,
};

/** What `yieldPieces` is told to make. */
export interface PieceOrder {
  actor: Stuff;
  form: ParsedForm;
  /** The row the piece is minted as. */
  product: string;
  hand: PotterHand;
  /** How many (a day's bricks); 1 for a pot. */
  count: number;
  /** Where it lands; default the actor's hands. */
  into?: Stuff | null;
}

/** One game day, s (a freeze-thaw count is in whole days). */
const DAY_S = 86_400;

/** The pack's dial, with its literal fallback. */
function ceramicsDial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw == null || raw === '') return fallback;
    const n = Number.parseFloat(String(raw));
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

/** Game-seconds now, or `null` when no world clock runs. */
function nowS(): number | null {
  if (!StuffApi.findByTemplatePath('/platform/idea/WorldClockRegistry')) return null;
  return WorldClockApi.getNow().rawValue();
}

/** The constituent shares a clay is read by, from its effective composition. */
export interface ClayShares {
  clayMineral: number;
  /** Sand, grog and breeze — what opens a clay up. */
  opener: number;
  iron: number;
  lime: number;
  organic: number;
}

/** Sort composition entries into the shares, by each constituent's material TAGS. */
function sharesOf(entries: readonly CompositionEntry[]): ClayShares {
  const out: ClayShares = { clayMineral: 0, opener: 0, iron: 0, lime: 0, organic: 0 };
  for (const e of entries) {
    const m = StuffApi.findByTemplatePath<Material>(e.materialPath) ?? null;
    if (m === null) continue;
    if (m.hasTag('clay-mineral')) out.clayMineral += e.fraction;
    else if (m.hasTag('silica') || m.hasTag('grog') || m.hasTag('breeze')) out.opener += e.fraction;
    else if (m.hasTag('iron')) out.iron += e.fraction;
    else if (m.hasTag('carbonate')) out.lime += e.fraction;
    else if (m.hasTag('organic')) out.organic += e.fraction;
  }
  return out;
}

/** How a thrown wall reads, by the hand's wall factor (1 = a proficient hand). */
function wallLine(factor: number): string | null {
  if (factor >= 1.4) return 'It is heavy for its size: the wall is thick, a beginner\'s wall.';
  if (factor >= 1.15) return 'It is a little heavy for its size.';
  if (factor <= 0.9) return 'It is light in the hand, the wall thin and even.';
  return null;
}

/** A weathering word for a heap — what `look` says of it. */
function weatheringPhrase(days: number, ceiling: number): string {
  if (days <= 0) return 'It is fresh-dug and raw, unweathered.';
  if (days < ceiling / 2) return 'It has weathered a little — crumbling at the edges.';
  return 'It is frost-broken and mellow, crumbled fine by a winter out.';
}

const clayAugmenter: MarkupAugmenter = (text, host, _viewer, opts) => {
  if (opts?.filter) return text;
  if (host.isDestroyed()) return text;
  const clay = host as unknown as Partial<Clay>;
  if (typeof clay.getWeatheredDays !== 'function') return text;
  const weathered = weatheringPhrase(
    clay.getWeatheredDays(),
    ceramicsDial('ceramics.weathering.ceilingDays', 40),
  );
  // ⭐ The colour is the CLAY's, not the row's: one lump row serves every
  // band that wins it, so the Delight's red river clay must not read as the
  // quarry's grey (the ceramics drive).
  const looks = (host as unknown as { getMaterial?(): { getAppearance(): string } | null })
    .getMaterial?.()
    ?.getAppearance();
  const line = looks ? `It is ${looks}. ${weathered}` : weathered;
  return text && text.length > 0 ? `${text}\n\n${line}` : line;
};

const ClayBase = CompositionMixin(WaterActivityMixin(Lump));

export default class Clay extends ClayBase implements Shapeable, Formable {
  static markupAugmenters: MarkupAugmenter[] = [clayAugmenter];

  static fieldMeta: FieldMeta = {
    // ⭐ How many freeze-thaw days this clay has weathered (ceramics S2) —
    // persistent: a heap's winter is in it.
    weatheredDays: { persistent: true, authorable: true },
    // The day-aligned game-second the weathering was last counted to.
    weatherCheckedS: { persistent: true, runtimeState: true },
  };

  public weatheredDays = 0;
  public weatherCheckedS = 0;

  /** The lot about to be absorbed, captured in `canMergeWith` (Ore's rule). */
  private _absorbing: {
    stuffId: string;
    quantity: number;
    /** One of its lumps, kg — lumps differ, and the pool keeps every kilogram. */
    eachKg: number;
    weatheredDays: number;
    makeup: CompositionEntry[];
  } | null = null;

  /** Reentry guard for the weathering read. */
  private _weathering = false;

  // ---------- the year ----------

  /** Freeze-thaw days weathered, brought current first. */
  public getWeatheredDays(): number {
    this.reconcileWeathering();
    return this.weatheredDays;
  }

  public setWeatheredDays(value: number): void {
    this.weatheredDays = Number.isFinite(value) && value > 0 ? value : 0;
  }

  /**
   * Count the WHOLE days since the stamp that the heap's place crossed
   * freezing. Day-aligned on both ends, so two reads in one day never
   * count that day twice.
   */
  private reconcileWeathering(): void {
    if (this._weathering) return;
    const now = nowS();
    if (now === null) return;
    const today = Math.floor(now / DAY_S) * DAY_S;
    if (this.weatherCheckedS === 0) {
      this.weatherCheckedS = today;
      return;
    }
    if (!(today > this.weatherCheckedS)) return;
    this._weathering = true;
    try {
      const place = this.placeOf();
      const ceiling = ceramicsDial('ceramics.weathering.ceilingDays', 40);
      if (place !== null && this.weatheredDays < ceiling) {
        // ⚠ The place counts days from `atS` up to NOW; only completed
        // days are wanted, so a crossing today is left for tomorrow.
        const days = place.freezeThawDaysSince(this.weatherCheckedS);
        const todayCounted = place.freezeThawDaysSince(today);
        const whole = Math.max(0, days - todayCounted);
        this.weatheredDays = Math.min(ceiling, this.weatheredDays + whole);
      }
      this.weatherCheckedS = today;
    } finally {
      this._weathering = false;
    }
  }

  /** The nearest place up the container chain that has its own air. */
  private placeOf(): (Stuff & { freezeThawDaysSince(atS: number): number }) | null {
    let at: Stuff | null = this.getContainer() as unknown as Stuff | null;
    for (let hops = 0; at !== null && hops < 16; hops++) {
      if (MixinApi.isAtmospheric(at)) return at;
      at = MixinApi.isContainable(at) ? (at.getContainer() as unknown as Stuff | null) : null;
    }
    return null;
  }

  // ---------- what the composition says ----------

  /** The constituent shares, from the effective composition. */
  public shares(): ClayShares {
    return sharesOf(this.effectiveMakeup());
  }

  /**
   * ⭐ How plastic it is, `0..1` — its clay-mineral share, raised up to a
   * third by a winter's weathering (frost opens the plates, and a weathered
   * clay throws better).
   */
  public plasticity(): number {
    const ceiling = ceramicsDial('ceramics.weathering.ceilingDays', 40);
    const weathered = ceiling > 0 ? Math.min(1, this.getWeatheredDays() / ceiling) : 0;
    return Math.min(1, this.shares().clayMineral * (1 + 0.3 * weathered));
  }

  /**
   * ⭐ How likely it is to crack as it dries, `0..1`: a fat clay shrinks
   * hard; sand, grog and breeze open it so the water can leave.
   */
  public crackRisk(): number {
    const r = this.plasticity() * 1.6 - this.shares().opener * 1.2;
    return r < 0 ? 0 : r > 1 ? 1 : r;
  }

  /** The colour it fires, by the iron in it. */
  public firedColor(): 'red' | 'buff' | 'white' {
    const iron = this.shares().iron;
    return iron >= 0.04 ? 'red' : iron >= 0.015 ? 'buff' : 'white';
  }

  /**
   * ⭐ Whether it stands a furnace's heat: little flux (iron, lime,
   * organic), much clay mineral — a fireclay.
   */
  public refractoriness(): 'refractory' | 'common' {
    const s = this.shares();
    return s.iron + s.lime + s.organic < 0.05 && s.clayMineral >= 0.6 ? 'refractory' : 'common';
  }

  // ---------- shaping (ceramics S4, D16) ----------

  /** The clay this heap holds, kg (a heap is lumps × each lump's mass). */
  public clayKg(): number {
    return this.getMass().rawValue() * this.getQuantity();
  }

  /**
   * ⭐ The hand that is shaping, read off its competence — a deterministic
   * table, the grain the pack's dials tune.
   */
  public async formingHand(actor: Stuff, discipline: string): Promise<FormingHand> {
    let band: CompetenceBandName = 'untrained';
    if (MixinApi.isAdvancing(actor)) band = await actor.competenceBandFor(discipline);
    return {
      band,
      wallFactor: ceramicsDial(`ceramics.wall.factor.${band}`, WALL_FACTOR[band]),
      maxL: ceramicsDial(`ceramics.wall.maxL.${band}`, MAX_L[band]),
      grade: Grade.fromOrdinal(GRADE_OF[band]),
    };
  }

  /** The mass one piece of `form` takes from this clay at `hand`, kg. */
  public pieceMassKg(form: ParsedForm, hand: PotterHand, productMassKg: number): number {
    const scale = form.word?.greenScale ?? 1;
    // A moulded block, a tile, a pulled handle: the piece's own size, cut
    // oversize for the shrink — the hand does not change a brick's mass.
    if (form.formClass === 'block' && productMassKg > 0) return productMassKg * scale;
    if (form.formClass === 'flat' && form.word !== null && form.word.capacityL <= 0 && productMassKg > 0) {
      return productMassKg * scale;
    }
    const nominal = form.nominalMassKg();
    const base = nominal > 0 ? nominal : productMassKg;
    return base * hand.wallFactor * scale;
  }

  /**
   * ⭐ Make pieces of `form` out of this clay — the material YIELDS; the
   * instrument decides the time and the bounds. Each piece is green clay of
   * this clay's material and composition, at this clay's water, made by the
   * actor at the hand's grade, described by its form; `count > 1` mints ONE
   * stack (a day's bricks), as many as the clay allows. The clay is consumed
   * by mass. Returns the piece, or a refusal line.
   */
  public async yieldPieces(order: PieceOrder): Promise<Stuff | string> {
    const self = this as unknown as Stuff;
    const material = this.getMaterial();
    if (material === null) return 'There is nothing in it to shape.';
    let product: Stuff;
    try {
      product = await StuffApi.clone<Stuff>(order.product, undefined, { madeFrom: [self] });
    } catch {
      return 'That is not a thing anybody here knows how to make.';
    }
    const rowMass = MixinApi.isTangible(product) ? product.getMass().rawValue() : 0;
    const each = this.pieceMassKg(order.form, order.hand, rowMass);
    // ⭐ As many as were asked for, as far as the clay goes (a day at the
    // table stops when the heap runs out).
    const count = Math.min(Math.max(1, Math.floor(order.count)), Math.floor((this.clayKg() + 1e-9) / each));
    const need = each * count;
    if (!(each > 0) || !(count >= 1)) {
      await StuffApi.destruct(product);
      return 'There is not enough clay here for that.';
    }
    if (MixinApi.isTangible(product)) {
      product.setMaterial(material);
      product.setMass(Quantity.of(each, 'kg'));
    }
    // ⭐ A thrown vessel says how its wall came out, in the hand's words (the
    // mass alone was silent, and a player could not tell a beginner's mug
    // from a master's — the ceramics drive). A moulded piece's shape is
    // the mould's, not the hand's, so only an open or closed form reads it.
    const wall = wallLine(order.hand.wallFactor);
    if (
      wall !== null &&
      (order.form.formClass === 'open' || order.form.formClass === 'closed') &&
      MixinApi.isVisible(product)
    ) {
      const long = product.getLongDescription();
      product.setLongDescription(long ? `${long} ${wall}` : wall);
    }
    if (MixinApi.isStackable(product) && count > 1) product.setQuantity(count);
    // A vessel holds what its form says it holds.
    if (
      MixinApi.isBulkable(product) &&
      product.hasInteriorBulk() &&
      (order.form.formClass === 'open' || order.form.formClass === 'closed')
    ) {
      (product as unknown as { setInteriorCapacity(v: Quantity<'L'> | null): void })
        .setInteriorCapacity(Quantity.of(order.form.capacityL, 'L'));
    }
    if (MixinApi.isComposition(product)) {
      product.setMakeup(this.effectiveMakeup());
    }
    if (MixinApi.isWaterActive(product)) product.setWaterState(this.getWaterState());
    const maker = order.actor.getIdentityPath() ?? '';
    if (MixinApi.isCrafted(product) && maker !== '') product.setMaker(maker);
    if (MixinApi.isGraded(product)) product.setGrade(order.hand.grade);
    // ⭐ A thrown body with seats (a jug's handle) is born with those lines
    // EMPTY — the bill's default would read the handle as present, and
    // `fit handle to jug` would hand back a phantom.
    const seats = order.form.word?.seats ?? [];
    if (seats.length > 0 && MixinApi.isAssembled(product)) {
      const bill = product.getBill();
      if (bill !== null) {
        const grade = order.hand.grade.getBand();
        const path = material.getTemplatePath() ?? '';
        product.recordAssembly(
          bill.parts.map((p) => ({
            part: p.part,
            template: p.template,
            count: p.count,
            role: p.role,
            material: path,
            grade,
            condition: 1,
            failed: seats.includes(p.part) ? p.count : 0,
            ...(seats.includes(p.part) ? { empty: true } : {}),
            makers: [],
          })) as never,
          (bill.joints ?? []).map((j) => ({
            key: j.key,
            method: j.method,
            members: [...j.members],
            tension: 1,
            maker: '',
          })) as never,
        );
      }
    }
    const labelled = product as unknown as {
      setShortDescription?(s: string): void;
      getKeywords?(): readonly string[];
      setKeywords?(k: string[]): void;
    };
    const phrase = order.form.describe();
    if (order.form.word === null || order.form.describe() !== order.form.word.key) {
      labelled.setShortDescription?.(phrase);
    }
    if (typeof labelled.setKeywords === 'function') {
      const kw = new Set(labelled.getKeywords?.() ?? []);
      for (const w of phrase.split(/\s+/)) if (w && !/^\d/.test(w)) kw.add(w);
      labelled.setKeywords([...kw]);
    }
    const into = order.into ?? order.actor;
    if (MixinApi.isContainable(product) && MixinApi.isContainer(into)) {
      ContainmentApi.move(product as Stuff & Containable, into as Stuff & Container);
    }
    // ⭐ The craft-mint defect must not reach green ware: the piece is
    // placed AND its host captured (the `fell` precedent).
    await PersistableApi.captureHostOf(product).catch(() => undefined);
    // Last: a heap worked out is destructed.
    this.consumeKg(need);
    return product;
  }

  /** The refusal that names the hand's band — the progression, said. */
  public refuseBeyond(hand: FormingHand): ShapeRefusal {
    return {
      ok: false,
      reason: 'beyond-your-hand',
      line: Mml.compose`That is more than your hand can raise yet — a ${hand.band} potter raises a pot of up to ${String(hand.maxL)} litres.`,
    };
  }

  /** Take `kg` of clay off this heap; a heap worked out is gone. */
  private consumeKg(kg: number): void {
    const left = this.clayKg() - kg;
    if (left <= 0.01) {
      void StuffApi.destruct(this as unknown as Stuff);
      return;
    }
    // ⭐ What is left stays in LUMPS of about the size they were: collapsing
    // the heap to one lump of everything that was left handed a potter a
    // single 75 kg "lump of clay" off nine (the ceramics drive, run 19).
    const each = this.getMass().rawValue();
    const lumps = each > 0 ? Math.max(1, Math.ceil(left / each - 1e-9)) : 1;
    if (this.getQuantity() !== lumps) this.setQuantity(lumps);
    this.setMass(Quantity.of(left / lumps, 'kg'));
  }

  /**
   * ⭐ Hands coil anything (S4): any form class, any size the hand can
   * raise, slowly — the product row is the material's `formTemplates` for
   * the class. Credits pottery.
   */
  public async shapePlan(req: ShapeRequest): Promise<ShapePlan | ShapeRefusal> {
    const self = this as unknown as Stuff;
    const parsed = new FormGrammar([]).parse(req.formText);
    if (!(parsed instanceof ParsedForm)) {
      return { ok: false, reason: parsed.reason, line: Mml.compose`${parsed.line}` };
    }
    const form = parsed;
    const product = this.getMaterial()?.getFormTemplates()[form.formClass] ?? '';
    if (product === '') {
      return {
        ok: false,
        reason: 'no-product',
        line: Mml.compose`You could coil ${Mml.thing(self)} into a shape, but it would be nothing anybody has a name for. Work it on a wheel, or in a mould.`,
      };
    }
    const hand = await this.formingHand(req.actor, 'pottery');
    if (form.formClass !== 'block' && form.formClass !== 'flat' && form.capacityL > hand.maxL) {
      return this.refuseBeyond(hand);
    }
    const actor = req.actor;
    return {
      ok: true,
      durationMs: ceramicsDial('ceramics.hand.minutes', 30) * 60_000,
      effortW: 220,
      beginSelf: Mml.compose`You roll coils of clay between your palms and begin to build them up, ring on ring.`,
      beginPeers: Mml.compose`${Mml.actor(actor)} coils a pot by hand.`,
      onComplete: () => {
        void this.yieldPieces({ actor, form, product, hand, count: 1 }).then((made) =>
          tellMade(actor, made, 'pottery'),
        );
      },
    };
  }

  // ---------- pooling ----------

  /** Capture the absorbed lot before it is destructed (Ore's rule). */
  public override canMergeWith(other: Stuff): boolean {
    const ok = super.canMergeWith(other);
    this._absorbing =
      ok && other instanceof Clay
        ? {
            stuffId: other.stuffId,
            quantity: other.getQuantity(),
            eachKg: other.getMass().rawValue(),
            weatheredDays: other.getWeatheredDays(),
            makeup: [...other.getMakeup()],
          }
        : null;
    return ok;
  }

  /** ⭐ Two heaps pooled are one heap: weathering and temper mass-weighted. */
  public override onMerged(absorbed: Stuff): void {
    const stashed = this._absorbing;
    this._absorbing = null;
    const total = this.getQuantity();
    if (
      stashed !== null &&
      stashed.stuffId === absorbed.stuffId &&
      total > 0 &&
      stashed.quantity > 0 &&
      stashed.quantity <= total
    ) {
      const mine = total - stashed.quantity;
      // ⭐ By MASS, and the pool keeps every kilogram. A stack has one
      // per-lump mass, and the merge kept the absorber's: two fresh 12 kg
      // lumps picked up onto two 0.9 kg remnants became four 0.9 kg lumps,
      // 22 kg of clay gone, and a day at the brick table then found too
      // little clay for one brick (the ceramics drive A, run 37).
      const myKg = mine * this.getMass().rawValue();
      const theirKg = stashed.quantity * stashed.eachKg;
      const totalKg = myKg + theirKg;
      const wMine = totalKg > 0 ? myKg / totalKg : mine / total;
      const wTheirs = 1 - wMine;
      if (totalKg > 0) this.setMass(Quantity.of(totalKg / total, 'kg'));
      this.weatheredDays = this.weatheredDays * wMine + stashed.weatheredDays * wTheirs;
      const acc = new Map<string, number>();
      for (const e of this.getMakeup()) {
        acc.set(e.materialPath, (acc.get(e.materialPath) ?? 0) + e.fraction * wMine);
      }
      for (const e of stashed.makeup) {
        acc.set(e.materialPath, (acc.get(e.materialPath) ?? 0) + e.fraction * wTheirs);
      }
      this.setMakeup([...acc].map(([materialPath, fraction]) => ({ materialPath, fraction })));
    }
    super.onMerged(absorbed);
  }

  /** A lump cut off a heap is the heap's clay. */
  public override onSplit(splitoff: Stuff): void {
    const cut = splitoff as unknown as Partial<Clay>;
    if (typeof cut.setWeatheredDays === 'function') cut.setWeatheredDays(this.weatheredDays);
    if (typeof cut.setMakeup === 'function') cut.setMakeup(this.getMakeup());
    // …and the heap's lump size: the split-off is a fresh clone of the ROW,
    // so without this a 0.9 kg remnant split off came back a 12 kg lump.
    if (MixinApi.isTangible(splitoff)) splitoff.setMass(this.getMass());
    super.onSplit(splitoff);
  }
}

/**
 * Say what a hand-shaping made, and credit it. ⚠ A module function, never a
 * method: the clay may be worked out — destructed — by the time it runs.
 */
async function tellMade(actor: Stuff, made: Stuff | string, discipline: string): Promise<void> {
  if (actor.isDestroyed()) return;
  if (typeof made === 'string') {
    MessageApi.scene(actor).topic('act.deed').toSelf(Mml.compose`${made}`).send();
    return;
  }
  MessageApi.scene(actor)
    .topic('act.deed')
    .toSelf(Mml.compose`You have made ${Mml.thing(made)}. It is green — let it dry before anything else.`)
    .toPeers(Mml.compose`${Mml.actor(actor)} sets down ${Mml.thing(made)}.`)
    .send();
  if (MixinApi.isAdvancing(actor) && discipline !== '') {
    await actor.creditDeed({ discipline, difficulty: 'standard', outcome: 'success' });
  }
}
