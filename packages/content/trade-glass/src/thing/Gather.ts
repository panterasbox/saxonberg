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
import type { Containable } from "@saxonberg/server/mud/lib/spatial/Containable";

/** The worked form a gather is in. */
export type GatherForm = "gather" | "bubble" | "bottle" | "cylinder";

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

const GatherBase = AlloyedMixin(ThermalMixin(Good));

export default class Gather extends GatherBase {
  // ⚠ Own-property only — the framework merges the mixin chain's own
  // fieldMeta up the prototype chain (MixinApi.getAllFieldMeta), so this
  // declares only Gather's new field. `authorable` because the row seeds
  // `form: gather` and `gob` resets it.
  static fieldMeta: FieldMeta = {
    form: { persistent: true, authorable: true },
  };

  /** What the gather has been worked into so far. */
  public form: GatherForm = "gather";

  public getForm(): GatherForm {
    return this.form;
  }

  public setForm(value: GatherForm): void {
    this.form = value;
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
      const cullet = await StuffApi.clone<Stuff>(CULLET_ROW);
      if (MixinApi.isTangible(cullet)) {
        if (material) cullet.setMaterial(material);
        cullet.setMass(Quantity.of(massKg, "kg"));
      }
      (cullet as unknown as Labelled).setShortDescription("lump of cullet");
      (cullet as unknown as Labelled).setKeywords(["cullet", "lump", "glass"]);
      if (MixinApi.isAlloyed(cullet) && alloying.length > 0) cullet.setAlloying(alloying);
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
