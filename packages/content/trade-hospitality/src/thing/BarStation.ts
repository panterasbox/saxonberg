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
  // ⭐⭐⭐ `flourish` — **the residue of a retired mechanism, re-homed.**
  //
  // The verb shipped as the demonstration that band-gated verb
  // CONFERRAL worked: `FlourishController`'s docstring still says it *"is
  // afforded only through competence conferral (it is in no static
  // commandContributions)"*, and `platform/idea/Discipline/mixology.yaml`
  // still carried `conferrals: [{band: competent, verbs:
  // [social/flourish.yaml]}]`. But conferral was RETIRED in !285 —
  // `refreshConferrals`, which `Discipline/wind.yaml`'s own prose still
  // cites, no longer exists in the source. So `flourish` became a verb
  // whose only conferrer had been deliberately deleted, and nothing
  // failed: the reachability census is what found it.
  //
  // ⭐ The retirement's own doctrine decides where it goes: *a band must
  // never confer verbs — **the refusal IS the progression UI**, so if
  // something lifts a verb, the verb must EXIST in order for you to be
  // told.* The thing that lifts this one is Mixology competence, so the
  // RAIL affords it (the instrument affords the verb — this station
  // already affords the three acts performed at it) and the controller
  // refuses below `competent`, naming the band. A player at a bar who
  // tries it learns that there is something there to get good at, which
  // is the whole pedagogy the view's help text promises and which an
  // unknown verb teaches nobody.
  //
  // ⚠ It is a PLATFORM view named from a pack class, which is the
  // shipped direction: a trade's instrument confers the platform verbs
  // it performs (`pour`/`stir`/`heat` all arrive this way). The reverse
  // — the kernel naming a pack's view — is the one that is forbidden.
  'platform/cmd/social/flourish.yaml',
];

export default class BarStation extends Station {
  static commandContributions: CommandContributions = {
    environment: STATION,
    peers: STATION,
  };
}
