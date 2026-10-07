/**
 * GrozingPliers — the cold shop's nibbling tool. Takes small bites off a
 * glass edge to work it to a curve or clean a snap. Affords `groze` and
 * the platform's `salvage` (break a piece down to cullet on the bench).
 */

import Tool from "@saxonberg/server/mud/platform/thing/Tool";
import type { CommandContributions } from "@saxonberg/server/mud/api/command";

const COLD_WORK = [
  "trade/glass/cmd/glass/groze.yaml",
  "platform/cmd/crafting/salvage.yaml",
];

export default class GrozingPliers extends Tool {
  static commandContributions: CommandContributions = {
    environment: COLD_WORK,
  };
}
