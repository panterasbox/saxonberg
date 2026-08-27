/**
 * WateringCan — a `Receptacle` that confers `water` while carried.
 *
 * `Receptacle` is already `ThermalMixin(BulkableMixin(Thing))`, so the can
 * is the liquid holder; `ToolMixin` is what makes it an *instrument*: its
 * authored `capabilities: [watering]` drives
 * `ToolMixin.getInstanceContributions` over the closed
 * `TOOL_CAPABILITIES` vocabulary, whose `watering` row confers
 * `platform/cmd/bulk/water.yaml` at `placement: 'carried'`. So the verb appears only
 * while a can is in your pack — the standing "instruments confer working
 * verbs" rule, getting its first non-crafting consumer.
 *
 * `pour` continues to work as the manual path; `water` is the ergonomic
 * one that knows what a plant is.
 */

import Receptacle from "./Receptacle";
import { ToolMixin } from "../../lib/craft/Tooled";

const WateringCanBase = ToolMixin(Receptacle);

export default class WateringCan extends WateringCanBase {}
