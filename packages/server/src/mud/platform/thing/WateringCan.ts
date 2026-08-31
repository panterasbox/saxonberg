/**
 * WateringCan — a `Receptacle` that confers `water` while carried.
 *
 * `Receptacle` is already `ThermalMixin(BulkableMixin(Thing))`, so the can
 * is the liquid holder; `ToolMixin` is what makes it an *instrument*.
 *
 * ⭐ `water` lands only in the `environment` bucket, so the verb appears
 * only while a can is in your pack — the standing "instruments confer
 * working verbs" rule, getting its first non-crafting consumer. (It was
 * `placement: carried` on the row's capability entry until verbs became
 * class statics; the bucket said the same thing more precisely.)
 *
 * `pour` continues to work as the manual path; `water` is the ergonomic
 * one that knows what a plant is.
 */

import Receptacle from "./Receptacle";
import { ToolMixin } from "../../lib/craft/Tooled";
import type { CommandContributions } from "../../api/command";

const WateringCanBase = ToolMixin(Receptacle);

export default class WateringCan extends WateringCanBase {
  static commandContributions: CommandContributions = {
    environment: ["platform/cmd/bulk/water.yaml"],
  };
}
