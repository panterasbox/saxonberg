/**
 * ClayPart — ⭐ a formed piece of clay that is made to be FITTED, not to hold
 * anything: a pulled handle (ceramics W4), a spout, a lug. Green until fired,
 * carrying its clay's composition and its maker, marked, worn — the clay
 * half of a `ClayVessel` without the vessel. It joins its pot with slip
 * (`fit handle to jug`) when both are leather-hard, and fired it is part of
 * the pot for good.
 *
 * Split out of `ClayVessel` (then `Ware`) in review, 2026-10-29: a handle
 * filed as a vessel claimed bulk slots, a vessel kind and contents rules that
 * a strap of clay has none of. Composed as `Brick` is, but one piece — a
 * handle does not stack with another.
 */

import Good from '@saxonberg/server/mud/lib/stuff/Good';
import { GreenwareMixin } from '@saxonberg/server/mud/lib/material/Greenware';
import { MoistureMixin } from '@saxonberg/server/mud/lib/material/Moisture';
import { DurableMixin } from '@saxonberg/server/mud/lib/material/Durable';
import { CraftedMixin } from '@saxonberg/server/mud/lib/craft/Crafted';
import { CompositionMixin } from '@saxonberg/server/mud/lib/material/Composition';
import { ThermalMixin } from '@saxonberg/server/mud/lib/thermal/Thermal';
import { MarkedMixin } from '@saxonberg/server/mud/lib/description/Marked';

const ClayPartBase = GreenwareMixin(
  MarkedMixin(MoistureMixin(DurableMixin(CraftedMixin(CompositionMixin(ThermalMixin(Good)))))),
);

export default class ClayPart extends ClayPartBase {
  /**
   * The look, then how well it was made and by whom — the verdict its
   * vessel twin (`CraftVessel.getLong`) gives a pot. ⚠ It was lost when the
   * handle left the vessel class (B108), and the finalize drive found it:
   * a pulled handle read nameless, so its maker could not tell it from the
   * NPC potter's. Three classes now render this verdict; it is `Crafted`'s
   * by rights (recorded for the next pass over crafted goods).
   */
  override getLong(): string {
    return `${super.getLong()} ${this.renderVerdict()}`;
  }
}
