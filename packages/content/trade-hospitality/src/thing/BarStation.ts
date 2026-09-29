/**
 * BarStation — the bartender's working surface: the back-bar and the
 * well. A `Fitting` (things are placed ON it) that affords the verbs performed
 * at the station rather than with one instrument: `mix` and `serve`
 * (whole-recipe acts) and `garnish` (finishing a drink from what the
 * back-bar holds).
 *
 * ⚠ Those three used to ride the shaker's and the mixing glass's
 * `capabilities[].verbs` — the identical six-verb list on both rows,
 * which was the BAR's verb set, not the shaker's. The stations
 * themselves afforded nothing, because they were plain `Fitting` rows
 * with no `capabilities` block to hang a list on. That is the shape of
 * the bug a second, row-level record of affordances produced.
  *
 * ⭐ **A `Station`, not a `Fitting`** (the base-class narrowing): a
 * `Fitting` is furniture the general store SELLS, so it is chattel; this
 * is built into the premises and is not. See `platform/thing/Station.ts`
 * for the conflation the narrowing found.
*/

import Station from '@saxonberg/server/mud/platform/thing/Station';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';

const STATION = [
  'trade/hospitality/cmd/crafting/mix.yaml',
  'trade/hospitality/cmd/crafting/serve.yaml',
  'trade/hospitality/cmd/crafting/garnish.yaml',
];

export default class BarStation extends Station {
  static commandContributions: CommandContributions = {
    environment: STATION,
    peers: STATION,
  };
}
