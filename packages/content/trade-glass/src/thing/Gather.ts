/**
 * Gather — a blob of hot glass on the end of a blowpipe (glass build
 * D10). `AlloyedMixin(ThermalMixin(Good))`: it carries the melt's iron
 * (so the bottle it becomes is the right colour) and it COOLS by the
 * kernel's own Newton drift the moment it leaves the pot — which is the
 * whole of the hot-work window. No new timing machinery: the gather's
 * clock is the thermal substrate every object already runs.
 *
 * `effectiveR()` is overridden by a dial so a compact blob's τ lands near
 * the "you have seconds" feel — the lumped geometry is tuned for an open
 * mug, and a blob on a pipe loses heat slower per kilogram. That factor
 * is the one playtest knob dressed as thermal physics, and it is a dial.
 */

import Good from "@saxonberg/server/mud/lib/stuff/Good";
import { AlloyedMixin } from "@saxonberg/server/mud/lib/material/Alloyed";
import { ThermalMixin } from "@saxonberg/server/mud/lib/thermal/Thermal";
import type { FieldMeta } from "@saxonberg/server/mud/lib/mixin";
import { AppApi } from "@saxonberg/server/mud/api/app";
import { StuffApi } from "@saxonberg/server/mud/api/stuff";
import { MixinApi } from "@saxonberg/server/mud/api/mixin";
import { MessageApi } from "@saxonberg/server/mud/api/message";
import { Mml } from "@saxonberg/server/mud/api/mml";
import { ContainmentApi } from "@saxonberg/server/mud/api/containment";
import { Quantity } from "@saxonberg/server/mud/lib/quantity";
import type { Stuff } from "@saxonberg/server/mud/lib/stuff/Stuff";
import type { Container } from "@saxonberg/server/mud/lib/spatial/Container";
import type { CompetenceBandName } from "@saxonberg/server/mud/lib/advancement/CompetenceBand";
import { Grade } from "@saxonberg/server/mud/lib/craft/Grade";
import type {
  Formable,
  FormingHand,
  ShapeRefusal,
} from "@saxonberg/server/mud/lib/craft/Shapeable";
import type { Containable } from "@saxonberg/server/mud/lib/spatial/Containable";

/**
 * The worked form a gather is in: a fresh `gather`, a `bubble`, or the key of
 * the `Form` row it was blown into (`bottle`, `cylinder` — any row a pipe
 * lists, so a blown jar is a row and not a union member).
 */
export type GatherForm = "gather" | "bubble" | (string & {});

/** The engagement type + message topic the hot shop shares. */
export const GLASSWORK_TYPE = "glasswork";
export const GLASSWORK_TOPIC = "act.deed";

/** The glow band, hottest first — what the window watch narrates. */
export type GlowBand = "white" | "yellow" | "orange" | "going";

const CULLET_ROW = "/stuff/thing/Casting";

/** The Detailed/Visible label surface, for naming the minted cullet. */
interface Labelled {
  setShortDescription(s: string): void;
  setKeywords(k: string[]): void;
}

/** Numeric pack-setting read with a seeded-literal fallback. */
function dial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw === "" || raw == null) return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

/**
 * ⭐ A glassblower's hand, by band (the potter's shape, for breath): the
 * largest vessel a band can blow (liters) and the grade its work comes out
 * at. Dials `glass.blow.maxL.<band>`. An untrained blower can still blow a
 * bottle and a pane's cylinder — badly.
 */
const BLOW_MAX_L: Readonly<Record<CompetenceBandName, number>> = {
  untrained: 2,
  novice: 3,
  competent: 5,
  proficient: 10,
  expert: 20,
};
const BLOW_GRADE: Readonly<Record<CompetenceBandName, number>> = {
  untrained: 0,
  novice: 1,
  competent: 1,
  proficient: 2,
  expert: 3,
};

const GatherBase = AlloyedMixin(ThermalMixin(Good));

export default class Gather extends GatherBase implements Formable {
  // ⚠ Own-property only — the framework merges the mixin chain's own
  // fieldMeta up the prototype chain (MixinApi.getAllFieldMeta), so this
  // declares only Gather's new field. `authorable` because the row seeds
  // `form: gather` and `gob` resets it.
  static fieldMeta: FieldMeta = {
    form: { persistent: true, authorable: true },
    formProduct: { persistent: true, runtimeState: true },
    formGrade: { persistent: true, runtimeState: true },
  };

  /** The row the piece is cracked off as — the blown form's (`Form.product`). */
  public formProduct = "";
  /** The grade the blower's hand gave the blow. */
  public formGrade = "";

  /** What the gather has been worked into so far. */
  public form: GatherForm = "gather";

  public getForm(): GatherForm {
    return this.form;
  }

  public setForm(value: GatherForm): void {
    this.form = value;
    // A gather worked back (`gob`) is no longer any piece.
    if (value === "gather" || value === "bubble") {
      this.formProduct = "";
      this.formGrade = "";
    }
  }

  /** Blown into a form a word names: the piece it will crack off as, and how well. */
  public takeForm(key: string, product: string, grade: Grade): void {
    this.form = key;
    this.formProduct = product;
    this.formGrade = grade.getBand();
  }

  /** The row `crack` mints, or `""` when it was blown into nothing. */
  public getFormProduct(): string {
    return this.formProduct;
  }

  /** The grade of the blow, or `null` when nothing was blown. */
  public getFormGrade(): Grade | null {
    return this.formGrade !== "" && Grade.isBand(this.formGrade) ? Grade.of(this.formGrade) : null;
  }

  public async formingHand(actor: Stuff, discipline: string): Promise<FormingHand> {
    let band: CompetenceBandName = "untrained";
    if (MixinApi.isAdvancing(actor)) band = await actor.competenceBandFor(discipline);
    return {
      band,
      wallFactor: 1,
      maxL: dial(`glass.blow.maxL.${band}`, BLOW_MAX_L[band]),
      grade: Grade.fromOrdinal(BLOW_GRADE[band]),
    };
  }

  public refuseBeyond(hand: FormingHand): ShapeRefusal {
    return {
      ok: false,
      reason: "beyond-your-hand",
      line: Mml.compose`That is more glass than you can blow yet — a ${hand.band} glassblower blows a vessel of up to ${String(hand.maxL)} liters.`,
    };
  }

  /**
   * The temperature at or above which the glass can still be worked —
   * a fraction of the material's own melting point. Below it the glass
   * has stiffened and the window has closed.
   */
  public workingFloorK(): number {
    const mp = this.getMaterial()?.getMeltingPoint().rawValue() ?? 0;
    return dial("glass.hotwork.workingFraction", 0.75) * mp;
  }

  /** Still hot enough to work. */
  public isWorkable(): boolean {
    const mp = this.getMaterial()?.getMeltingPoint().rawValue() ?? 0;
    if (mp <= 0) return false;
    return this.getTemperature().rawValue() >= this.workingFloorK();
  }

  /**
   * ⭐ A compact blob on a pipe loses heat slower per kilogram than the
   * open-mug geometry the lumped `R_GEOMETRY` is tuned for, so its τ is
   * lengthened by a playtest factor — the knob for "you have seconds".
   */
  protected override effectiveR(): number {
    return super.effectiveR() * dial("glass.hotwork.gatherRFactor", 10);
  }

  /** ⭐ The glow band this gather reads as — the window watch's narration. */
  public glowBand(): GlowBand {
    const t = this.getTemperature().rawValue();
    const floor = this.workingFloorK();
    if (t >= floor + 400) return "white";
    if (t >= floor + 200) return "yellow";
    if (t >= floor + 50) return "orange";
    return "going";
  }

  /**
   * ⭐ Lose this gather to cullet — the verb on the object (OO convention).
   * The glass comes back whole (full mass, its iron kept, one step
   * greener), placed where the gather was; the loss is narrated to a
   * Sensor actor and a `glasswork` failure deed credited. A bad blow
   * costs fuel, not material. No-op if already gone.
   */
  public async loseToCullet(actor: Stuff, why: string): Promise<void> {
    if (this.isDestroyed()) return;
    const self = this as unknown as Stuff;
    const where = MixinApi.isContainable(self) ? self.getContainer() : null;
    const massKg = this.getMass().rawValue();
    const material = this.getMaterial();
    const alloying = this.getAlloying().map((e) => ({ ...e }));
    try {
      const cullet = await StuffApi.clone<Stuff>(CULLET_ROW, undefined, {
        madeFrom: this as unknown as Stuff,
      });
      if (MixinApi.isTangible(cullet)) {
        if (material) cullet.setMaterial(material);
        cullet.setMass(Quantity.of(massKg, "kg"));
      }
      (cullet as unknown as Labelled).setShortDescription("lump of cullet");
      (cullet as unknown as Labelled).setKeywords(["cullet", "lump", "glass"]);
      if (MixinApi.isComposition(cullet) && alloying.length > 0) cullet.setAlloying(alloying);
      const dest =
        where && MixinApi.isContainer(where)
          ? (where as Stuff & Container)
          : MixinApi.isContainer(actor)
            ? (actor as unknown as Stuff & Container)
            : null;
      if (dest && MixinApi.isContainable(cullet)) {
        ContainmentApi.move(cullet as Stuff & Containable, dest);
      }
    } catch {
      /* a missing cullet row is a content gap; the gather still goes */
    }
    await StuffApi.destruct(self);
    if (MixinApi.isSensor(actor)) {
      MessageApi.scene(actor)
        .topic(GLASSWORK_TOPIC)
        .toSelf(Mml.compose`${Mml.fromMarkup(why)} The glass chills off the pipe as a lump of cullet — your fuel, not your glass, is what you have lost.`)
        .send();
    }
    if (MixinApi.isAdvancing(actor)) {
      await actor.creditDeed({
        discipline: GLASSWORK_TYPE,
        difficulty: "standard",
        outcome: "failure",
      });
    }
  }
}
