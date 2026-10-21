/**
 * SettingPan — a wide shallow pan with a plug in the bottom, where milk
 * stands overnight and the cream rises (dairy D4).
 *
 * ⭐ A pan with a plug at the bottom drains SKIM FIRST and leaves the cream
 * — which is exactly `separation: fractions` (*you draw until the
 * character changes*). So the pan is a `FractionatingMixin` host and the
 * `milk-setting` schedule is the whole of what it does: the charge stands
 * for its `restDays` (cream rises), then `pour pan into pail` draws the
 * skim and stops at the cream, whose share derives from the milk's own
 * fat. Poured before the cream has risen, it gives back milk.
 *
 * ⚠ No `Container`: nothing goes IN a pan but what is poured. `Crafted` +
 * `Contaminable` because it is food equipment (`wash pan` clears it).
 */
import Good from '@saxonberg/server/mud/lib/stuff/Good';
import { BulkableMixin } from '@saxonberg/server/mud/lib/bulk/Bulkable';
import { ThermalMixin } from '@saxonberg/server/mud/lib/thermal/Thermal';
import { CraftedMixin } from '@saxonberg/server/mud/lib/craft/Crafted';
import { ContaminableMixin } from '@saxonberg/server/mud/lib/material/Contaminable';
import { FractionatingMixin } from '@saxonberg/server/mud/lib/fractionation/Fractionating';
import { GreenwareMixin } from '@saxonberg/server/mud/lib/material/Greenware';
import { WaterActivityMixin } from '@saxonberg/server/mud/lib/material/WaterActivity';

// ⭐ (ceramics W4) A setting pan is a potter's piece too: thrown green and
// fired, so it composes green ware over its own water (the plan read it as
// already WaterActive; it was not).
const SettingPanBase = GreenwareMixin(WaterActivityMixin(FractionatingMixin(
  ContaminableMixin(CraftedMixin(ThermalMixin(BulkableMixin(Good)))),
)));

export default class SettingPan extends SettingPanBase {}
