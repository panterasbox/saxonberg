/**
 * Sheet — flat glass: a blown `cylinder` (scored, snapped and opened flat
 * at the furnace) or the `pane` it becomes. `TintedMixin(AlloyedMixin(
 * Good))`: tinted by its iron like any glass, and scribable. Thin, so it
 * reads paler than a bottle of the same glass (`thicknessFactor` 0.5).
 *
 * A pane affords `glaze` (set it in a window) — the affordance static
 * lands in W6 with the cold-shop views.
 */

import Good from "@saxonberg/server/mud/lib/stuff/Good";
import { AlloyedMixin } from "@saxonberg/server/mud/lib/material/Alloyed";
import { MeltableMixin } from "@saxonberg/server/mud/lib/thermal/Meltable";
import { ThermalMixin } from "@saxonberg/server/mud/lib/thermal/Thermal";
import type { FieldMeta } from "@saxonberg/server/mud/lib/mixin";
import type { CommandContributions } from "@saxonberg/server/mud/api/command";
import { CuttableMixin, type CutAnswer, type CutRequest } from "@saxonberg/server/mud/lib/craft/Cuttable";
import type { Stuff } from "@saxonberg/server/mud/lib/stuff/Stuff";
import type { Container } from "@saxonberg/server/mud/lib/spatial/Container";
import type { Containable } from "@saxonberg/server/mud/lib/spatial/Containable";
import { MixinApi } from "@saxonberg/server/mud/api/mixin";
import { AppApi } from "@saxonberg/server/mud/api/app";
import { StuffApi } from "@saxonberg/server/mud/api/stuff";
import { ContainmentApi } from "@saxonberg/server/mud/api/containment";
import { Quantity } from "@saxonberg/server/mud/lib/quantity";
import { TintedMixin } from "../lib/Tinted";

/** The pane row a snapped sheet parts into. */
const PANE_ROW = "/trade/glass/thing/pane";

/** Which flat form the sheet is in. */
export type SheetForm = "cylinder" | "pane";

// ⭐ A pane remelts because it is WARM (ceramics W0, ruling C): put in a
// hot kiln it melts by phase change, pooling into the pot beside it with
// its iron — there is no remelt recipe. So it needs a temperature.
// ⭐ And it plans its own cold-bench cuts (`CuttableMixin`, controllers-are-io
// D8c): `scribe`, `snap`, `groze` ask the sheet what the cut does to it.
const SheetBase = CuttableMixin(TintedMixin(AlloyedMixin(MeltableMixin(ThermalMixin(Good)))));

export default class Sheet extends SheetBase {
  // ⭐ A pane affords `glaze` to whoever holds it (environment = carrier).
  static commandContributions: CommandContributions = {
    environment: ["trade/glass/cmd/glass/glaze.yaml"],
  };

  // ⚠ Own-property only — the framework merges the mixin chain up the
  // prototype chain. `form` is authored on the cylinder/pane rows;
  // `scribed` is written by the `scribe` act, never authored.
  static fieldMeta: FieldMeta = {
    form: { persistent: true, authorable: true },
    scribed: { persistent: true },
    grozed: { persistent: true },
  };

  /** `cylinder` (blown, to be opened) or `pane` (opened flat). */
  public form: SheetForm = "cylinder";

  /** Whether a score line has been run (snap/flatten need it). */
  public scribed = false;

  /** Whether an edge has been nibbled smooth with the grozing pliers. */
  public grozed = false;

  public getForm(): SheetForm {
    return this.form;
  }
  public setForm(value: SheetForm): void {
    this.form = value;
  }
  public isScribed(): boolean {
    return this.scribed;
  }
  public setScribed(value: boolean): void {
    this.scribed = value;
  }
  public isGrozed(): boolean {
    return this.grozed;
  }
  public setGrozed(value: boolean): void {
    this.grozed = value;
  }

  /** Flat glass is thin — half the optical path of a bottle wall. */
  protected override thicknessFactor(): number {
    return 0.5;
  }

  /**
   * ⭐ The cold-bench cuts (D8c). The instrument (a wheel, pliers) is the
   * verb's to find; what the cut does to the glass is the sheet's:
   *
   *  - `scribe` — a score line; it will part along it now.
   *  - `snap` — parts a scribed sheet into two panes at half the mass each,
   *    carrying the same glass (and so the same color); `unscribed` refuses.
   *  - `groze` — nibbles the edge: `grozeKg` comes away as dust.
   *
   * Instant acts (`durationMs: 0`), each crediting an easy deed in glasswork.
   */
  public override async cutPlan(req: CutRequest): Promise<CutAnswer> {
    const actor = req.actor;
    const credit = (): void => {
      if (MixinApi.isAdvancing(actor)) {
        void actor.creditDeed({ discipline: "glasswork", difficulty: "easy", outcome: "success" });
      }
    };
    switch (req.verb) {
      case "scribe":
        return {
          ok: true,
          verb: "scribe",
          durationMs: 0,
          effortW: 0,
          facts: undefined,
          onComplete: () => {
            this.setScribed(true);
            credit();
            return { ok: true, facts: undefined };
          },
        };
      case "snap":
        if (!this.isScribed()) return { ok: false, verb: "snap", reason: "unscribed" };
        return {
          ok: true,
          verb: "snap",
          durationMs: 0,
          effortW: 0,
          facts: undefined,
          onComplete: async () => {
            // ⚠ Awaited by the verb: the panes are LANDED (custody +
            // capture), so the act finishes when they are recorded.
            const sheetName = this.getPresentation();
            await this.snapInTwo(actor);
            credit();
            return { ok: true, facts: { sheetName } };
          },
        };
      case "groze": {
        const off = Sheet.grozeKg();
        return {
          ok: true,
          verb: "groze",
          durationMs: 0,
          effortW: 0,
          facts: undefined,
          onComplete: () => {
            const left = Math.max(0, this.getMass().rawValue() - off);
            this.setMass(Quantity.of(left, "kg"));
            this.setGrozed(true);
            credit();
            return { ok: true, facts: undefined };
          },
        };
      }
      default:
        return super.cutPlan(req);
    }
  }

  /** Glass the grozing pliers take off as dust, kg — `glass.cold.grozeKg`. */
  private static grozeKg(): number {
    try {
      const raw = AppApi.setting("glass.cold.grozeKg");
      if (raw === "" || raw == null) return 0.02;
      const n = Number.parseFloat(raw);
      return Number.isFinite(n) ? n : 0.02;
    } catch {
      return 0.02;
    }
  }

  /** Two panes of the same glass where the sheet lay; the sheet is gone. */
  private async snapInTwo(actor: Stuff): Promise<void> {
    const self = this as unknown as Stuff;
    const half = this.getMass().rawValue() / 2;
    const alloying = this.getMakeup().map((e) => ({ ...e }));
    const where = MixinApi.isContainable(self)
      ? self.getContainer()
      : MixinApi.isContainer(actor)
        ? (actor as unknown as Stuff & Container)
        : null;
    for (let i = 0; i < 2; i += 1) {
      const p = await StuffApi.clone<Sheet>(PANE_ROW, undefined, { madeFrom: self });
      p.setMass(Quantity.of(half, "kg"));
      p.setForm("pane");
      if (MixinApi.isComposition(p) && alloying.length > 0) p.setMakeup(alloying);
      if (where && MixinApi.isContainer(where) && MixinApi.isContainable(p)) {
        ContainmentApi.move(p as unknown as Stuff & Containable, where as Stuff & Container);
      }
    }
    await StuffApi.destruct(self);
  }
}
