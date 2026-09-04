/**
 * GroundCharacter — the model half of the **soil** field, and the third
 * seeded field in the game after weather and mine geology.
 *
 * The field-substrate slate's register listed *"soil quality — seeded
 * (probably) — deferred"* with an open question attached: **do a seeded
 * field and a derived one compose?** They do, by multiplication, and this
 * class is one half of the answer:
 *
 * | | | |
 * |---|---|---|
 * | **seeded character** | texture, stoniness, drainage, slope, aspect, depth, native pH | *this class* — a pure function of address + position, storing nothing |
 * | **derived state** | the reserves — moisture, nitrogen, organic matter, structure | `SoilMixin`, a function of recorded history |
 *
 * **Character sets the curve; state is the position on it.** The same
 * manure on sand and on loam does different things, which is the reaction
 * norm the farming slate already uses for genetics, applied to dirt.
 *
 * ⭐⭐ **The primary consequence of character is the COST OF IMPROVEMENT,
 * not the yield** (D55). Stony ground costs stone-picking, wet ground
 * costs ditching, steep ground costs terracing, sour ground costs lime.
 * *That* is why some land was farmed for a thousand years and some was
 * never farmed at all — not a lower yield, but improvement costing more
 * than it returned. A player who pays the difference in **labour**
 * learns something a yield modifier could never teach them.
 *
 * ## Three layers, exactly as `Deposit` has them
 *
 *   - **the model** is this class: authored pins and leans over ground;
 *   - **the instantiation** is the zone that names a row of it, with the
 *     seed derived from the covering Locality's address rather than
 *     authored ({@link GroundCharacter.seedFor});
 *   - **the values** are computed and stored NOWHERE.
 *
 * ⭐ **And the model is OPTIONAL, which `Deposit`'s is not.** Every piece
 * of ground has a character whether or not anybody authored one — that is
 * what *"a total function under a sparse graph"* means, and it is why
 * {@link GroundCharacter.resolve} is a **static** taking a nullable model
 * rather than an instance method. An orebody is a claim somebody makes
 * about a place; dirt is just there.
 *
 * ⚠ **Nothing here rolls.** The ground was always there; the seed is
 * position, and the player's uncertainty is **epistemic**. The hash is
 * FNV-1a over the cell string, process-independent by construction, so
 * two boots give one answer.
 *
 * ⚠ **The thirty lines of hash-and-mix are RE-IMPLEMENTED, not
 * imported** (D6). `Deposit` did the same against weather's, for the same
 * reason the field-substrate slate gives: two instances is where a
 * pattern is NAMED, not where it is extracted. This is the third, and
 * what the three do not share is everything that matters — fronts and
 * seasons, a plane in the rock, and a texture triangle.
 *
 * See [docs/subsystems/soil.md].
 */

import { Idea } from '@saxonberg/server/mud/lib/stuff/Idea';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';

/**
 * The texture classes, coarse to fine — the axis every other soil
 * property hangs off.
 *
 * ⭐ **Ordinal and CLOSED**, six of the USDA triangle's twelve. Texture
 * is the one soil property a farmer cannot change (D65), so a closed
 * vocabulary is honest: this is the ground you were dealt.
 */
export const TEXTURE_CLASSES = [
  'sand',
  'sandy-loam',
  'loam',
  'silt-loam',
  'clay-loam',
  'clay',
] as const;

export type TextureClass = (typeof TEXTURE_CLASSES)[number];

/** A position on the ground, in zone cells. */
export type Spot = readonly [number, number];

/** Everything true of one piece of ground, before anybody worked it. */
export interface GroundSample {
  /** The texture class — fixed on ground, free in a bed (D65). */
  texture: TextureClass;
  /** Stone in the topsoil, `[0, 1]`. Expensive to clear, cheap to fence. */
  stoniness: number;
  /** How freely water leaves, `[0, 1]`: 0 waterlogged, 1 droughty. */
  drainage: number;
  /** Fall of the ground, degrees. Above ~15° wants terracing. */
  slopeDeg: number;
  /** The azimuth the slope faces, degrees clockwise from north. */
  aspectDeg: number;
  /** Depth of topsoil, metres. Thin ground carries less of everything. */
  topsoilM: number;
  /** The pH the ground came with. Offsettable, never re-seeded (D66). */
  nativePh: number;
}

/**
 * An authored override of a single spot — the pin half of the fold. A
 * marl pit, a spring line, the stony corner every farm has.
 */
export type GroundPin = Partial<GroundSample>;

/**
 * An authored lean over a rectangle: everything inside it is NUDGED. It
 * scales or offsets the computed value — never replaces it — so an
 * authored valley floor and a computed one stay indistinguishable to
 * every consumer downstream.
 */
export interface GroundBand {
  from: Spot;
  to: Spot;
  /** Multiplier on computed drainage, `> 0`. Below 1 = wetter. */
  drainageScale?: number;
  /** Multiplier on computed stoniness, `> 0`. */
  stoninessScale?: number;
  /** Offset added to computed pH, in pH units. */
  phOffset?: number;
  /** Multiplier on computed topsoil depth, `> 0`. */
  depthScale?: number;
  /** Why — authoring documentation, read by nothing. */
  note?: string;
}

/** What a piece of ground costs to bring into cultivation (D55). */
export interface ImprovementCost {
  /** Clearing scrub and wood — the heaviest and where injury lives. */
  clearing: number;
  /** Picking stone. ⭐ Its output is the wall (D56). */
  stonePicking: number;
  /** Ditching and field drains — you move the water, not the soil. */
  draining: number;
  /** Lime, to bring sour ground up. */
  liming: number;
  /** Terracing, or a refusal. */
  terracing: number;
  /** The sum — one number for *"how much work is this ground?"*. */
  total: number;
}

export default class GroundCharacter extends Idea {
  static fieldMeta: FieldMeta = {
    name: { persistent: true, authorable: true },
    pins: { persistent: true, authorable: true },
    bands: { persistent: true, authorable: true },
  };

  /** What a holder calls this ground — *the clay bank*, *the light land*. */
  protected name = '';

  /** Authored spot overrides, keyed `"x,y"`. Wins over everything. */
  protected pins: Record<string, GroundPin> = {};

  /** Authored leans over rectangles. Nudges; never replaces. */
  protected bands: GroundBand[] = [];

  public getName(): string { return this.name; }
  public setName(value: string): void { this.name = value; }

  public getPins(): Readonly<Record<string, GroundPin>> { return this.pins; }
  public setPins(value: Record<string, GroundPin>): void { this.pins = value ?? {}; }

  public getBands(): readonly GroundBand[] { return this.bands; }
  public setBands(value: GroundBand[]): void { this.bands = value ?? []; }

  // ---------- the seed ----------

  /**
   * The ground's procedural seed, DERIVED from the covering Locality's
   * claimed address. `Deposit.seedFor`'s rule with a different base
   * constant, so soil and geology under one address are independent
   * fields rather than the same noise wearing two hats.
   *
   * ⭐ **No seed is stored anywhere.** No author manages a magic number,
   * and no row can drift from the world it describes.
   */
  public static seedFor(address: string): number {
    return (hashString(address) ^ BASE_SEED) >>> 0;
  }

  // ---------- ⭐ the one resolved read ----------

  /**
   * Everything true of one spot of ground. **The fold order is the spine
   * invariant**, and it is `Deposit`'s: an authored **pin** wins over an
   * authored **lean**, which scales — never replaces — the **procedural**
   * value underneath.
   *
   * A `null` model is the ordinary case and means *nobody has authored
   * anything about this ground*, which is not the same as *this ground
   * has no character*. Static for exactly that reason.
   */
  public static resolve(
    model: GroundCharacter | null,
    at: Spot,
    seed: number,
  ): GroundSample {
    const key = spotKey(at);
    const base = GroundCharacter.procedural(at, seed);
    const leaned = model === null ? base : lean(base, model.getBands(), at);
    const pin = model?.getPins()?.[key];
    return pin ? { ...leaned, ...pin } : leaned;
  }

  /**
   * The procedural layer — six numbers off one position, and nothing
   * else consulted.
   *
   * ⭐ **The properties are CORRELATED, because real ground is.** Slope
   * drains, so a steep spot is drier and its topsoil is thinner; fine
   * texture holds water, so clay is wetter at the same slope. Drawing six
   * independent numbers would produce free-draining clay on a flat
   * bottom, which no field in the world has ever been, and a player who
   * learns to read one property off another would be learning a
   * falsehood.
   */
  public static procedural(at: Spot, seed: number): GroundSample {
    const key = spotKey(at);
    const h = hashString(key);

    // Texture: a smooth field rather than per-cell noise, so ground
    // changes across a farm the way it does across a farm — gradually,
    // with a wet end and a light end.
    const t = smooth(seed, at, 1);
    const texture = TEXTURE_CLASSES[
      Math.min(TEXTURE_CLASSES.length - 1, Math.floor(t * TEXTURE_CLASSES.length))
    ] as TextureClass;

    const slopeDeg = round1(smooth(seed, at, 2) ** 2 * 24);
    const aspectDeg = Math.round(roll01(seed ^ 0x51, h) * 360);

    // Fine texture holds water; slope sheds it. Both real, and the
    // second is why the low corner of every field is the wet one.
    const fineness = TEXTURE_CLASSES.indexOf(texture) / (TEXTURE_CLASSES.length - 1);
    const drainage = clamp01(
      0.25 + 0.5 * (1 - fineness) + slopeDeg / 60 + (roll01(seed ^ 0x73, h) - 0.5) * 0.2,
    );

    // Stone comes off the parent rock and collects where soil is thin.
    const stoniness = clamp01(
      roll01(seed ^ 0x11, h) * 0.7 + (slopeDeg / 24) * 0.3,
    );

    // Topsoil creeps downhill and accumulates in the bottoms.
    const topsoilM = round2(
      0.08 + 0.42 * (1 - slopeDeg / 24) * (0.5 + 0.5 * roll01(seed ^ 0x29, h)),
    );

    // Native pH: acid on leached sand, alkaline on the calcareous end.
    const nativePh = round1(
      4.8 + 2.9 * (0.55 * (1 - drainage) + 0.45 * roll01(seed ^ 0x3d, h)),
    );

    return { texture, stoniness, drainage, slopeDeg, aspectDeg, topsoilM, nativePh };
  }

  // ---------- what character is FOR ----------

  /**
   * ⭐⭐ **D55 — what this ground costs to bring in**, in relative labour
   * units. Nothing here is a yield modifier, and that omission is the
   * decision: the player pays the difference in work.
   *
   * `liming` reads off the pH the ground came with, and it is the one
   * line here that is genuinely one-way: you can raise sour ground and
   * you cannot un-lime it in a hurry.
   */
  public static improvementCost(sample: GroundSample): ImprovementCost {
    const fineness =
      TEXTURE_CLASSES.indexOf(sample.texture) / (TEXTURE_CLASSES.length - 1);
    // Scrub takes hold on ground nobody could work — wet, or steep.
    const clearing = round2(1 + 1.5 * (1 - sample.drainage) + sample.slopeDeg / 18);
    const stonePicking = round2(sample.stoniness * 4);
    // Wet ground costs ditching, and heavy wet ground costs more of it.
    const draining = round2(Math.max(0, 0.55 - sample.drainage) * (4 + 3 * fineness));
    // Below 6.0 wants lime; above it wants nothing.
    const liming = round2(Math.max(0, 6.0 - sample.nativePh) * 1.6);
    // Nothing below 8°; sharply dear above 15°.
    const terracing = round2(Math.max(0, sample.slopeDeg - 8) ** 1.6 / 8);
    const total = round2(clearing + stonePicking + draining + liming + terracing);
    return { clearing, stonePicking, draining, liming, terracing, total };
  }

  /**
   * How much water this texture holds, relative to loam — the term
   * seeded character contributes to the derived moisture reserve.
   * Sand holds little and clay holds a lot, which is the whole of
   * *"the same rain does different things"*.
   */
  public static waterHoldingFactor(texture: TextureClass): number {
    const fineness = TEXTURE_CLASSES.indexOf(texture) / (TEXTURE_CLASSES.length - 1);
    return round2(0.55 + 0.9 * fineness);
  }

  /** How fast nitrate runs past the roots. Sand leaks; clay holds. */
  public static leachFactor(texture: TextureClass): number {
    const fineness = TEXTURE_CLASSES.indexOf(texture) / (TEXTURE_CLASSES.length - 1);
    return round2(1.7 - 1.3 * fineness);
  }

  /**
   * How badly hooves wreck this texture when it is wet — D17's poaching
   * term, and the reason *"put the herd on the tired field"* is a
   * judgement rather than a free move.
   */
  public static poachingFactor(texture: TextureClass): number {
    const fineness = TEXTURE_CLASSES.indexOf(texture) / (TEXTURE_CLASSES.length - 1);
    return round2(0.3 + 1.5 * fineness);
  }

  // ---------- ⭐ what it reads like (D86) ----------

  /**
   * The **free, coarse, honest** rung of D4's ladder — what anybody
   * standing on the ground can see without a spade, an instrument or a
   * discipline.
   *
   * ⭐⭐ **A band is a percept, not a number in words.** *"heavy ground,
   * and the low corner stays wet"* — never *"texture: clay · drainage:
   * low"*, which is a gauge in a costume. The reader sees a symptom and
   * infers the cause, which is what makes diagnosis a skill instead of a
   * lookup.
   *
   * ⚠ It deliberately reports only what is VISIBLE. pH is not — sour
   * ground looks like ground, which is exactly why the instrument rung
   * exists and why a farmer who guesses at lime wastes it.
   */
  public static lookPhrase(sample: GroundSample): string {
    const parts = [
      TEXTURE_PHRASE[sample.texture],
      bandPhrase(sample.drainage, DRAINAGE_CUTS, DRAINAGE_PHRASE),
    ];
    const stone = bandPhrase(sample.stoniness, STONE_CUTS, STONE_PHRASE);
    if (stone) parts.push(stone);
    const slope = slopePhrase(sample.slopeDeg);
    if (slope) parts.push(slope);
    return `${parts.filter(Boolean).join(', ')}.`;
  }

  /**
   * The **ribbon test's** answer: the texture class, in the words the
   * procedure actually produces. A real ribbon test tells you how the
   * wet soil behaves between your fingers, and the class is the
   * conclusion you draw from that — so the phrase is the behaviour and
   * the class is named after it.
   */
  public static ribbonPhrase(texture: TextureClass): string {
    return RIBBON_PHRASE[texture];
  }
}

/**
 * ⭐ **Exhaustive `Record`s, and that is a compile-time completeness
 * guarantee**: a seventh texture class cannot be added without writing
 * its two phrases, so the coverage half of the band contract is enforced
 * by the compiler rather than by a lint or a memo.
 *
 * ⚠ What the compiler cannot check is the half that matters — whether
 * adjacent bands are **distinguishable in prose**. Two bands that read
 * alike collapse the whole opacity ladder silently. That stays a human
 * read at review time, against one question: *can a reader who does not
 * know the number tell this band from the one on either side of it?*
 */
const TEXTURE_PHRASE: Readonly<Record<TextureClass, string>> = {
  sand: 'light, hungry ground that runs through your fingers',
  'sandy-loam': 'kindly light ground, easy under a spade',
  loam: 'good dark ground that crumbles when you turn it',
  'silt-loam': 'soft, silky ground that caps hard after rain',
  'clay-loam': 'strong ground, heavy going when it is wet',
  clay: 'heavy ground that sets like a brick in a dry summer',
};

/** What the wet soil does between finger and thumb — the procedure. */
const RIBBON_PHRASE: Readonly<Record<TextureClass, string>> = {
  sand: 'it will not hold a shape at all; it grates and falls apart',
  'sandy-loam': 'it holds a ball, but the ribbon breaks before your thumbnail',
  loam: 'the ribbon runs about an inch and breaks, and it feels neither gritty nor greasy',
  'silt-loam': 'the ribbon is short and it feels floury — smooth, almost soapy',
  'clay-loam': 'the ribbon runs two inches or so before it gives',
  clay: 'the ribbon runs long and shining and will not break',
};

const DRAINAGE_CUTS = [0.22, 0.42, 0.62, 0.82] as const;
const DRAINAGE_PHRASE = [
  'the low corner never really dries',
  'it lies wet a long while after rain',
  'it takes rain and gives it back slowly',
  'the water is off it by morning',
  'it burns off in a week without rain',
] as const;

const STONE_CUTS = [0.2, 0.45, 0.7] as const;
const STONE_PHRASE = [
  '',
  'a few stones turned up at the headland',
  'stone everywhere you put the spade',
  'more stone than soil in places',
] as const;

/** Band a `[0, 1]` value against ascending cut points. */
function bandPhrase(
  value: number,
  cuts: readonly number[],
  phrases: readonly string[],
): string {
  let i = 0;
  while (i < cuts.length && value >= (cuts[i] as number)) i++;
  return phrases[i] ?? '';
}

function slopePhrase(deg: number): string {
  if (deg < 4) return '';
  if (deg < 9) return 'it falls away gently to one side';
  if (deg < 15) return 'a real slope on it — you feel it walking up';
  return 'steep enough that the soil is on its way downhill';
}

// ---------- the procedural core ----------

/**
 * The base seed the address is XOR'd against. ⚠ Deliberately NOT
 * `Deposit`'s: soil and geology under one address must be independent
 * fields, or a stony farm would always sit over a rich lode.
 */
const BASE_SEED = 0x50_11_5eed;

/** A spot → its canonical key string, and the hash's whole input. */
function spotKey(at: Spot): string {
  return `${at[0]},${at[1]}`;
}

/** FNV-1a 32-bit string hash — deterministic and process-independent. */
function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Integer avalanche mix of two 32-bit words → a 32-bit hash. */
function mix2(a: number, b: number): number {
  let h = (a ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (b >>> 0), 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

/** Deterministic value in `[0, 1)` from two seed words. */
function roll01(a: number, b: number): number {
  return mix2(a >>> 0, b >>> 0) / 0x1_0000_0000;
}

/**
 * A SMOOTH value in `[0, 1)` over the plane — bilinear interpolation
 * between lattice rolls on a 5-cell lattice.
 *
 * ⭐ Per-cell noise would give a farm a chequerboard of textures, and
 * ground is not like that: it changes gradually, which is why a field has
 * a light end and a heavy end rather than a light corner. This is the one
 * place the soil field's grammar genuinely differs from the geology
 * field's, which reads a plane and needs no smoothing at all.
 */
function smooth(seed: number, at: Spot, channel: number): number {
  const L = 5;
  const gx = Math.floor(at[0] / L);
  const gy = Math.floor(at[1] / L);
  const fx = at[0] / L - gx;
  const fy = at[1] / L - gy;
  const corner = (i: number, j: number): number =>
    roll01(seed ^ (channel * 0x9e37), hashString(`${gx + i},${gy + j},${channel}`));
  // Smoothstep the weights so the lattice does not read as a grid.
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const top = corner(0, 0) * (1 - sx) + corner(1, 0) * sx;
  const bot = corner(0, 1) * (1 - sx) + corner(1, 1) * sx;
  const v = top * (1 - sy) + bot * sy;
  return v < 0 ? 0 : v >= 1 ? 0.999_999 : v;
}

/** Apply every authored band covering `at`. Nudges; never replaces. */
function lean(
  base: GroundSample,
  bands: readonly GroundBand[],
  at: Spot,
): GroundSample {
  let drainage = base.drainage;
  let stoniness = base.stoniness;
  let nativePh = base.nativePh;
  let topsoilM = base.topsoilM;
  for (const b of bands) {
    if (!covers(b, at)) continue;
    if (b.drainageScale !== undefined) drainage *= b.drainageScale;
    if (b.stoninessScale !== undefined) stoniness *= b.stoninessScale;
    if (b.phOffset !== undefined) nativePh += b.phOffset;
    if (b.depthScale !== undefined) topsoilM *= b.depthScale;
  }
  return {
    ...base,
    drainage: clamp01(drainage),
    stoniness: clamp01(stoniness),
    nativePh: round1(Math.max(3.5, Math.min(9, nativePh))),
    topsoilM: round2(Math.max(0.01, topsoilM)),
  };
}

function covers(b: GroundBand, at: Spot): boolean {
  const [x0, y0] = b.from;
  const [x1, y1] = b.to;
  return (
    at[0] >= Math.min(x0, x1) &&
    at[0] <= Math.max(x0, x1) &&
    at[1] >= Math.min(y0, y1) &&
    at[1] <= Math.max(y0, y1)
  );
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
