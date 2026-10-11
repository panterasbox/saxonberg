/**
 * Wheel — a wheel of cheese: what curd sets into in a hoop, and the thing
 * that ripens on a cold shelf (dairy D9, D10).
 *
 * ⭐ ONE row, authoring no material of its own: the set stamps the curd's
 * `becomes` (`soft-cheese` or `hard-cheese`), so one hoop and one wheel
 * row give every cheese the milk, the curd and the press can make. What
 * the cheese was made FROM rides in from the vat (`madeFrom`) and the
 * taste names it — *made from ewe's milk* — because the species reaches the
 * cheese through the milk, not through a list of cheeses.
 *
 * It ripens (`RipeningMixin` — the kernel's discrete twin of maturation):
 * young, coming on, ripe, and — for a soft one — over; kept too warm, the
 * rind dies. And it divides: `split wheel` with an edge takes a wedge off
 * it (the kernel's `Splittable` shape), carrying the wheel's material,
 * grade and state onto a plain `Provision` a market can sell.
 */
import Provision from '@saxonberg/server/mud/platform/thing/Provision';
import { RipeningMixin } from '@saxonberg/server/mud/lib/maturation/Ripening';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Tooled } from '@saxonberg/server/mud/lib/craft/Tooled';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import type { MarkupAugmenter } from '@saxonberg/server/mud/api/mml';
import type {
  Splittable,
  WorkPrognosis,
  WorkResult,
} from '@saxonberg/server/mud/lib/ground/Workable';
import type { MadeFromHolding } from '@saxonberg/server/mud/lib/mould/Mould';
import type Material from '@saxonberg/server/mud/lib/material/Material';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';

/** The row a wedge is cloned from. */
const WEDGE_ROW = '/trade/dairying/thing/wedge';
/** How many wedges a wheel cuts into, unless the row says otherwise. */
const DEFAULT_WEDGES = 8;
const SPLIT_MS = 3_000;

/**
 * ⭐ The taste names the milk — words, no digit. Taste only: a look reads
 * the ripeness (the mixin's line), and the milk is something you taste.
 */
function madeFromAugmenter(
  text: string,
  host: Stuff,
  _viewer: Stuff,
  opts?: { filter?: readonly string[] },
): string {
  if (!opts?.filter?.includes('taste')) return text;
  const from = (host as unknown as Wheel).getMadeFrom();
  if (!from) return text;
  const milk = StuffApi.findByTemplatePath<Material>(from);
  if (!milk) return text;
  // "made from goat's milk" reads right for every milk, including the cow's,
  // whose material is plain "milk" ("a milk cheese" did not — the drive).
  const line = `It is made from ${milk.getName()}, and tastes of it.`;
  return text && text.length > 0 ? `${text}\n\n${line}` : line;
}

const WheelBase = RipeningMixin(Provision);

export default class Wheel extends WheelBase implements Splittable, MadeFromHolding {
  /**
   * `split` — a wheel in the hand (`environment`: what you hold confers on
   * you) or on the shelf beside you (`peers`). ⚠ Not `self`, which is a
   * GIVER's own innate verbs — the drive found *"I don't understand
   * 'split'"* with the wheel in hand.
   */
  static commandContributions: CommandContributions = {
    environment: ['platform/cmd/ground/split.yaml'],
    peers: ['platform/cmd/ground/split.yaml'],
  };

  static markupAugmenters: MarkupAugmenter[] = [madeFromAugmenter];

  static fieldMeta: FieldMeta = {
    wedgesPerWheel: { persistent: true, authorable: true },
    wedgesLeft: { persistent: true, runtimeState: true },
    madeFrom: { persistent: true, runtimeState: true },
  };

  /** How many wedges this wheel cuts into. */
  public wedgesPerWheel = DEFAULT_WEDGES;
  /** Wedges still in it; `-1` = uncut (the whole of `wedgesPerWheel`). */
  public wedgesLeft = -1;
  /** The milk it was made from (a material path), or `''`. */
  public madeFrom = '';

  /** The declared shape's marker. */
  public readonly splittable = true as const;

  public getWedgesPerWheel(): number {
    return this.wedgesPerWheel;
  }
  public setWedgesPerWheel(value: number): void {
    const n = Math.floor(Number(value) || 0);
    this.wedgesPerWheel = n > 0 ? n : DEFAULT_WEDGES;
  }
  public getWedgesLeft(): number {
    return this.wedgesLeft < 0 ? this.wedgesPerWheel : this.wedgesLeft;
  }
  public getMadeFrom(): string {
    return this.madeFrom;
  }
  public setMadeFrom(materialPath: string): void {
    this.madeFrom = typeof materialPath === 'string' ? materialPath : '';
  }

  // ───────────────────────── the Splittable shape ─────────────────────────

  public async planWork(
    _by: Stuff,
    tool: (Stuff & Tooled) | null,
    _what: string | null,
  ): Promise<WorkPrognosis> {
    if (this.getWedgesLeft() <= 0) {
      return { kind: 'refusal', reason: 'wheel-spent', prose: 'There is nothing left of it to cut.' };
    }
    // ⭐ An EDGE, by construction, never by class: a clasp knife does it
    // as well as a cheese wire (the butcher's rule).
    const edged =
      tool !== null &&
      MixinApi.isConstructed(tool) &&
      tool.getConstructionForm() === 'bladed';
    if (!edged) {
      return {
        kind: 'refusal',
        reason: 'no-edge',
        prose: 'You want an edge for that — a knife, or a wire.',
      };
    }
    return {
      kind: 'plan',
      durationMs: SPLIT_MS,
      cost: 1,
      beginSelf: 'You set the blade at the centre and lean on it.',
      beginPeers: 'Somebody starts cutting into a wheel of cheese.',
      token: null,
    };
  }

  public async completeWork(
    _by: Stuff,
    _tool: (Stuff & Tooled) | null,
    _token: unknown,
  ): Promise<WorkResult> {
    const left = this.getWedgesLeft();
    if (left <= 0) return { self: 'There is nothing left of it to cut.' };
    let wedge: Stuff | null = null;
    try {
      wedge = await StuffApi.clone<Stuff>(WEDGE_ROW);
    } catch {
      console.error(`Wheel: wedge row '${WEDGE_ROW}' did not resolve`);
      return { self: 'It will not come apart cleanly.' };
    }
    const massKg = this.getMass().rawValue() / left;
    this.carryOnto(wedge, massKg);
    const where = this.getContainer();
    if (where !== null && MixinApi.isContainer(where) && MixinApi.isContainable(wedge)) {
      ContainmentApi.move(wedge as Stuff & Containable, where as Stuff & Container);
    }
    const remaining = left - 1;
    this.wedgesLeft = remaining;
    if (remaining <= 0) {
      StuffApi.destruct(this as unknown as Stuff);
      return {
        self: `The last wedge comes away — ${wedge.getPresentation()}.`,
        peers: null,
        credit: { discipline: 'dairying', difficulty: 'trivial' },
      };
    }
    this.setMass(Quantity.of(Math.max(0, this.getMass().rawValue() - massKg), 'kg'));
    return {
      self: `A wedge comes away clean — ${wedge.getPresentation()}.`,
      peers: null,
      credit: { discipline: 'dairying', difficulty: 'trivial' },
    };
  }

  /**
   * A wedge IS the wheel, smaller: its material, its grade, how far it had
   * spoiled, what it carries, how wet it is. ⚠ It does not ripen further —
   * the ripening is the wheel's — and spoils on its material's own clock.
   */
  private carryOnto(wedge: Stuff, massKg: number): void {
    const material = this.getMaterial();
    if (material !== null && MixinApi.isTangible(wedge)) wedge.setMaterial(material);
    if (MixinApi.isTangible(wedge)) wedge.setMass(Quantity.of(massKg, 'kg'));
    if (MixinApi.isGraded(wedge)) wedge.setGrade(this.getGrade());
    if (MixinApi.isCrafted(wedge) && this.getMaker()) wedge.setMaker(this.getMaker());
    if (MixinApi.isFresh(wedge)) wedge.setMicrobialLoad(this.getMicrobialLoad());
    if (MixinApi.isContaminable(wedge)) wedge.setPathogenLoads(this.getPathogenLoads());
    if (MixinApi.isWaterActive(wedge)) wedge.setWaterState(this.getWaterState());
  }
}
