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
import type { Formable, FormingHand } from "@saxonberg/server/mud/lib/craft/Forming";
import type { BeyondHandRefusal } from "@saxonberg/server/mud/lib/craft/Shapeable";
import type { Containable } from "@saxonberg/server/mud/lib/spatial/Containable";
import type { ActPlan, ActRefusal } from "@saxonberg/server/mud/lib/craft/ActPlan";
import { WorldClockApi } from "@saxonberg/server/mud/api/worldclock";

/**
 * The worked form a gather is in: a fresh `gather`, a `bubble`, or the key of
 * the `Form` row it was blown into (`bottle`, `cylinder` — any row a pipe
 * lists, so a blown jar is a row and not a union member).
 */
export type GatherForm = "gather" | "bubble" | (string & Record<never, never>);

/** The engagement type + message topic the hot shop shares. */
export const GLASSWORK_TYPE = "glasswork";
export const GLASSWORK_TOPIC = "act.deed";

/**
 * How workable the gather is, most fluid first — RELATIVE to the glass's
 * own working floor, which the window watch narrates. Its COLOUR is the one
 * incandescence scale (`FireApi.incandescenceOf`), never this band.
 */
export type WorkBand = "runs" | "soft" | "stiffening" | "setting";

const CULLET_ROW = "/stuff/thing/Casting";

/** Cracking the piece off the pipe: a wetted line and a tap. */
const CRACK_MS = 3_000;
const CRACK_W = 120;
/** Back in the glory hole to take up the heat again. */
const REHEAT_MS = 3_000;
const REHEAT_W = 120;
/** The most heat a reheat gives back, K — past it the gather runs off the pipe. */
const REHEAT_CEILING_K = 1450;

/** What cracking off came to: the piece and its moil, or the gather lost to cullet. */
export type CrackDone = { kind: "piece"; product: Stuff } | { kind: "lost" };
/** Why a reheat will not run — worded by `reheat`. */
export type ReheatRefusal = ActRefusal<"no-furnace" | "gone">;

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
  // `form: gather` and a fresh `dip` resets it.
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
    // A gather worked back (`dip`) is no longer any piece.
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

  public refuseBeyond(hand: FormingHand): BeyondHandRefusal {
    return { ok: false, reason: "beyond-your-hand", facts: { band: hand.band, maxL: hand.maxL, maker: "glassblower" } };
  }

  /**
   * The temperature at or above which the glass can still be worked —
   * a fraction of the material's own melting point. Below it the glass
   * has stiffened and the window has closed.
   */
  public workingFloorK(): number {
    const mat = this.getMaterial();
    const mp = mat !== null && MixinApi.hasFusion(mat) ? mat.getMeltingPoint().rawValue() : 0;
    return dial("glass.hotwork.workingFraction", 0.75) * mp;
  }

  /** Still hot enough to work. */
  public isWorkable(): boolean {
    const mat = this.getMaterial();
    const mp = mat !== null && MixinApi.hasFusion(mat) ? mat.getMeltingPoint().rawValue() : 0;
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

  /** ⭐ How workable this gather is now — the window watch's narration. */
  public workBand(): WorkBand {
    const t = this.getTemperature().rawValue();
    const floor = this.workingFloorK();
    if (t >= floor + 400) return "runs";
    if (t >= floor + 200) return "soft";
    if (t >= floor + 50) return "stiffening";
    return "setting";
  }

  /**
   * ⭐ **Crack the piece off the pipe** (the `crack` verb's act,
   * controller-liquidity W12). A formed, still-workable gather becomes its
   * product — the `Form` row's, recorded when it took the form — carrying
   * the gather's mass minus the moil and its alloying, so the bottle is the
   * colour of its sand, and stamped with the blower's hand. The moil comes
   * away as cullet beside you. Anything else (unformed, or gone cold) is
   * lost to cullet (`loseToCullet`, which tells it).
   */
  public crackPlan(by: Stuff): ActPlan<undefined, CrackDone, ActRefusal<"gone">> {
    return {
      ok: true,
      durationMs: CRACK_MS,
      effortW: CRACK_W,
      facts: undefined,
      onComplete: async () => {
        if (this.isDestroyed()) return { ok: false, reason: "gone" };
        const productRow = this.getFormProduct();
        if (!productRow || !this.isWorkable()) {
          await this.loseToCullet(by, "There was no formed piece to crack off.");
          return { ok: true, facts: { kind: "lost" } };
        }
        return { ok: true, facts: { kind: "piece", product: await this.crackOff(productRow, by) } };
      },
    };
  }

  /** The piece, cracked free — and the moil beside it; the gather is gone. */
  private async crackOff(productRow: string, by: Stuff): Promise<Stuff> {
    const self = this as unknown as Stuff;
    const moilFrac = dial("glass.hotwork.moilFraction", 0.05);
    const massKg = this.getMass().rawValue();
    const alloying = this.getMakeup().map((e) => ({ ...e }));
    const where = MixinApi.isContainer(by) ? (by as unknown as Stuff & Container) : null;
    const product = await StuffApi.clone<Stuff>(productRow, undefined, { madeFrom: self });
    if (MixinApi.isTangible(product)) product.setMass(Quantity.of(massKg * (1 - moilFrac), "kg"));
    if (MixinApi.isComposition(product) && alloying.length > 0) product.setMakeup(alloying);
    // ⭐ Stamp the maker — a bottle is Crafted; without this it credits nobody.
    if (MixinApi.isCrafted(product)) {
      product.stamp({
        maker: by.getIdentityPath() ?? "",
        grade: this.getFormGrade() ?? Grade.of("fair"),
        recipe: "glass-blow",
        craftedAt: WorldClockApi.getNow().rawValue(),
      });
    }
    if (where && MixinApi.isContainable(product)) ContainmentApi.move(product as Stuff & Containable, where);
    try {
      const moil = await StuffApi.clone<Stuff>(CULLET_ROW, undefined, { madeFrom: self });
      if (MixinApi.isTangible(moil)) {
        const mat = this.getMaterial();
        if (mat) moil.setMaterial(mat);
        moil.setMass(Quantity.of(massKg * moilFrac, "kg"));
      }
      (moil as unknown as Labelled).setShortDescription("scrap of cullet");
      (moil as unknown as Labelled).setKeywords(["cullet", "moil", "glass"]);
      if (MixinApi.isComposition(moil) && alloying.length > 0) moil.setMakeup(alloying);
      if (where && MixinApi.isContainable(moil)) ContainmentApi.move(moil as Stuff & Containable, where);
    } catch {
      /* missing cullet row: the moil is simply lost */
    }
    await StuffApi.destruct(self);
    if (MixinApi.isAdvancing(by)) {
      await by.creditDeed({ discipline: GLASSWORK_TYPE, difficulty: "standard", outcome: "success" });
    }
    return product;
  }

  /**
   * ⭐ **Back into the glory hole** (the `reheat` verb's act): a short step
   * whose completion brings the gather up to the furnace's held heat (to a
   * ceiling) — the one move that buys more time, at the cost of fuel and a
   * trip to the furnace. Wants a lit, fuelled furnace among `furnaces`.
   */
  public reheatPlanAt(furnaces: readonly Stuff[]): ActPlan<{ furnace: Stuff }, undefined, ReheatRefusal> | ReheatRefusal {
    const furnace = furnaces.find((f) => MixinApi.isBurner(f) && f.isLit() && f.getHeldTemperatureK() > 0) ?? null;
    if (furnace === null || !MixinApi.isBurner(furnace)) return { ok: false, reason: "no-furnace" };
    const held = furnace.getHeldTemperatureK();
    return {
      ok: true,
      durationMs: REHEAT_MS,
      effortW: REHEAT_W,
      facts: { furnace },
      onComplete: () => {
        if (this.isDestroyed()) return { ok: false, reason: "gone" };
        this.setContentsTemperature(Math.min(held, REHEAT_CEILING_K));
        return { ok: true, facts: undefined };
      },
    };
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
    const alloying = this.getMakeup().map((e) => ({ ...e }));
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
      if (MixinApi.isComposition(cullet) && alloying.length > 0) cullet.setMakeup(alloying);
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
