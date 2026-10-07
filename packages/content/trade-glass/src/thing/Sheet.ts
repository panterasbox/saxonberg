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
import type { FieldMeta } from "@saxonberg/server/mud/lib/mixin";
import { TintedMixin } from "../lib/Tinted";

/** Which flat form the sheet is in. */
export type SheetForm = "cylinder" | "pane";

const SheetBase = TintedMixin(AlloyedMixin(Good));

export default class Sheet extends SheetBase {
  // ⚠ Own-property only — the framework merges the mixin chain up the
  // prototype chain. `form` is authored on the cylinder/pane rows;
  // `scribed` is written by the `scribe` act, never authored.
  static fieldMeta: FieldMeta = {
    form: { persistent: true, authorable: true },
    scribed: { persistent: true },
  };

  /** `cylinder` (blown, to be opened) or `pane` (opened flat). */
  public form: SheetForm = "cylinder";

  /** Whether a score line has been run (snap/flatten need it). */
  public scribed = false;

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

  /** Flat glass is thin — half the optical path of a bottle wall. */
  protected override thicknessFactor(): number {
    return 0.5;
  }
}
