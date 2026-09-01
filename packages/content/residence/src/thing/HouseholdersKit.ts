/**
 * HouseholdersKit — the tool that makes `maintain` possible, and the
 * only thing that does.
 *
 * A `ToolItem` (tool capabilities + wear-on-use) carrying the `upkeep`
 * capability, plus the one thing a row cannot carry: **the affordance**.
 * A verb reaches a person through a `static commandContributions` on a
 * class, so the kit confers `maintain` OUTWARD, to whoever is holding
 * it — the watering-can precedent, and the reason this is a class at all
 * rather than one more row over `ToolItem`.
 *
 * The economy consequence is deliberate: upkeep costs a tool, the tool
 * wears with use (Law 2 — use, never the clock), and a worn-out kit is
 * a purchase. Anybody may perform maintenance on anything; the tenure
 * TERM says who OWES it, which is a different question and is answered
 * by `survey`.
 */

import ToolItem from "@saxonberg/server/mud/platform/thing/ToolItem";
import type { CommandContributions } from "@saxonberg/server/mud/api/command";

export default class HouseholdersKit extends ToolItem {
  static commandContributions: CommandContributions = {
    self: [],
    peers: [],
    environment: ["residence/cmd/crafting/maintain.yaml"],
  };
}
