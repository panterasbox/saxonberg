/**
 * BarStation — the bartender's working surface: the back-bar and the
 * well. A `Surface` (things rest ON it) that affords the verbs performed
 * at the station rather than with one instrument: `mix` and `serve`
 * (whole-recipe acts) and `garnish` (finishing a drink from what the
 * back-bar holds).
 *
 * ⚠ Those three used to ride the shaker's and the mixing glass's
 * `capabilities[].verbs` — the identical six-verb list on both rows,
 * which was the BAR's verb set, not the shaker's. The stations
 * themselves afforded nothing, because they were plain `Surface` rows
 * with no `capabilities` block to hang a list on. That is the shape of
 * the bug a second, row-level record of affordances produced.
 */

import Surface from '@saxonberg/server/mud/platform/thing/Surface';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';

const STATION = [
  'trade/hospitality/cmd/crafting/mix.yaml',
  'trade/hospitality/cmd/crafting/serve.yaml',
  'trade/hospitality/cmd/crafting/garnish.yaml',
];

export default class BarStation extends Surface {
  static commandContributions: CommandContributions = {
    environment: STATION,
    peers: STATION,
  };
}
