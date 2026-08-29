/**
 * WateringCan — a `Receptacle` that confers `water` while carried.
 *
 * `Receptacle` is already `ThermalMixin(BulkableMixin(Thing))`, so the can
 * is the liquid holder; `ToolMixin` is what makes it an *instrument*: its
 * authored `capabilities: [{ kind: watering, verbs:
 * [platform/cmd/bulk/water.yaml], placement: carried }]` drives
 * `ToolMixin.getInstanceContributions` — the row's own verbs at the
 * row's own placement. So the verb appears only
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
