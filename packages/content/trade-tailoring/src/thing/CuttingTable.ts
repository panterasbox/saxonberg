/**
 * CuttingTable — the long table, the shears and the chalk.
 *
 * ⚠ The verb affordance is a STATIC ON THE CLASS; a row's
 * `commandContributions:` is dead silently.
 *
 * ⭐ And the ladder's rung zero is a table and a pair of shears you own,
 * so `cut` works at home — badly. What the shop sells is the bench, the
 * light, and the fact that somebody there can measure you.
 */

import ToolItem from '@saxonberg/server/mud/platform/thing/ToolItem';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';

const TAILORING = [
  'trade/tailoring/cmd/tailoring/cut.yaml',
  'trade/tailoring/cmd/tailoring/sew.yaml',
  'trade/tailoring/cmd/tailoring/alter.yaml',
];

export default class CuttingTable extends ToolItem {
  static commandContributions: CommandContributions = {
    environment: TAILORING,
    peers: TAILORING,
  };
}
