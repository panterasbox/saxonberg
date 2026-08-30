/**
 * Anvil — the smithy's working surface: it affords `hammer`, `quench`
 * and `forge` (the smithing steps performed on it) plus the platform's
 * `repair` and `salvage`, which any mending capital affords.
 *
 * ⭐ A verb an object affords is a property of what the object IS, so it
 * is declared exactly once, on the class. The row keeps the material,
 * the mass and the working — never a verb list.
 */

import ToolItem from '@saxonberg/server/mud/platform/thing/ToolItem';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';

const SMITHING = [
  'trade/smithing/cmd/crafting/hammer.yaml',
  'trade/smithing/cmd/crafting/quench.yaml',
  'trade/smithing/cmd/crafting/forge.yaml',
  'platform/cmd/crafting/repair.yaml',
  'platform/cmd/crafting/salvage.yaml',
];

export default class Anvil extends ToolItem {
  static commandContributions: CommandContributions = {
    environment: SMITHING,
    peers: SMITHING,
  };
}
