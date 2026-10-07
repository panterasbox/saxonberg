/**
 * ScribingWheel — the cold shop's cutting tool. A hardened wheel that
 * scores a line in flat glass for snapping, and the same tool opens a
 * scored cylinder flat. Affords `scribe`, `snap` and `flatten` to whoever
 * is at the bench with it.
 */

import Tool from "@saxonberg/server/mud/platform/thing/Tool";
import type { CommandContributions } from "@saxonberg/server/mud/api/command";

const COLD_WORK = [
  "trade/glass/cmd/glass/scribe.yaml",
  "trade/glass/cmd/glass/snap.yaml",
  "trade/glass/cmd/glass/flatten.yaml",
];

export default class ScribingWheel extends Tool {
  static commandContributions: CommandContributions = {
    environment: COLD_WORK,
  };
}
