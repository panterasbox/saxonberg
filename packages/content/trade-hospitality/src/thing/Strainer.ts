/**
 * Strainer — the bar tool that strains: it affords `strain`, the
 * terminal step that mints a finished build into a glass.
 *
 * ⭐ `strain` used to be afforded by the shaker and the mixing glass,
 * which is not what performs the act — the strainer is. It rode those
 * rows because they were the two with a `capabilities` block to hang a
 * verb list on, back when a row could name verbs at all.
 */

import ToolItem from '@saxonberg/server/mud/platform/thing/ToolItem';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';

const STRAIN = ['trade/hospitality/cmd/crafting/strain.yaml'];

export default class Strainer extends ToolItem {
  static commandContributions: CommandContributions = {
    environment: STRAIN,
    peers: STRAIN,
  };
}
