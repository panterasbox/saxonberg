/**
 * Litter — **what you strew on a floor** (cleanliness D15): rushes, straw,
 * sawdust — dry, loose stuff that drinks up blood, grease and spilt milk
 * and is swept up with them. `strew` is the litter's verb: carrying a
 * bundle of rushes is what lets you strew, anywhere. Whether a material
 * will strew is still its own (`granular` + `absorbent`, read by the
 * controller), so a row on this class that is not absorbent is refused in
 * words.
 */

import Good from '../../lib/stuff/Good';
import type { CommandContributions } from '../../api/command';

export default class Litter extends Good {
  static commandContributions: CommandContributions = {
    // `environment` — to whoever HOLDS it.
    environment: ['platform/cmd/inventory/strew.yaml'],
  };
}
