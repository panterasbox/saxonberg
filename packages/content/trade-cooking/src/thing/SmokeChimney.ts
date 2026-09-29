/**
 * SmokeChimney — the cold-smoking flue: a brick throat you hang meat in
 * over a banked fire, and the thing that affords `smoke`.
 *
 * ⭐ The fixture provides DISCOVERABILITY; the **fire** provides
 * capability, and it has to be a cool one. `smoke-cure` requires 320 K —
 * deliberately 13 K under the temperature at which the flora starts dying
 * — so smoking preserves without sterilising. A roaring hearth does not
 * make this work better; the recipe's own heat gate is what it is.
 *
 * ⚠ Its own class rather than a mode of `DryingRack`, because the chimney
 * is what makes the difference between drying and smoking.
  *
 * ⭐ **A `Station`, not a `Fitting`** (the base-class narrowing): a
 * `Fitting` is furniture the general store SELLS, so it is chattel; this
 * is built into the premises and is not. See `platform/thing/Station.ts`
 * for the conflation the narrowing found.
*/

import Station from '@saxonberg/server/mud/platform/thing/Station';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';

export default class SmokeChimney extends Station {
  static commandContributions: CommandContributions = {
    peers: ['trade/cooking/cmd/crafting/smoke.yaml'],
  };
}
