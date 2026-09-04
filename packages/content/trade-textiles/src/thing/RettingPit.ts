/**
 * RettingPit — a pit of standing water that rots the glue out of flax
 * straw.
 *
 * ⭐⭐ **It is a `Vat` with a different shape and no code of its own to
 * speak of**, and that is the finding worth recording: retting is a slow
 * bacterial ferment, so the engine that models a wine models this
 * unchanged. Put the straw in water, judge the moment, take it out —
 * `MaturingMixin` already runs that clock, so preparation ships with
 * **zero verbs**.
 *
 * ⚠ It is `open` and unsealed, because a pit is. That matters: the
 * `turnDays` over-ret only bites an OPEN vessel, which is exactly right
 * here — a pit cannot be closed, so the failure cannot be dodged by
 * sealing it. The one judgement in the whole preparation stage is when
 * to pull it out.
 *
 * ⚠ Cold water stalls it (`stallBelowK` 283), which is why linen was a
 * summer job. The pit drifts toward its room's temperature through
 * `Thermal`, so the season is a real input and nobody authored a
 * "season" field.
 *
 * ⚠⚠ **A pit fouls water**, and the fiction knows it: retting ponds
 * stank badly enough to be banned upstream of towns. That is siting,
 * and it is what makes this an INDUSTRY rather than a crafting station.
 */

import Vat from '@saxonberg/server/mud/platform/thing/Vat';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';

export default class RettingPit extends Vat {
  constructor() {
    super();
    // Host-internal writes (the constructor IS the class body — the
    // `Vat` / `Bottle` precedent). A row's `data:` overrides any of them.
    this.category = 'retting-pit';
    this.setInteriorCapacity(Quantity.of(400, 'L'));
    /*
     * ⚠⚠ `liquidTight`, NOT `open` — and the distinction cost this
     * build a whole live drive.
     *
     * `closure` is the RETENTION axis: `BulkableLogic.requiredClosureFor`
     * returns `liquidTight` for every material there is ("v1 has only
     * liquid"), so anything poured into an `open` interior drains
     * straight through to the floor. The LID is the other axis
     * entirely — `Sealable`'s `setOpen(true)`, which is what "no lid,
     * open to the air" actually means, and what the over-ret / the
     * unsealed ferment read.
     *
     * Authored `open` here on the reasoning "a pit in the ground has no
     * lid", and the result was a vessel that could never hold anything:
     * `pour sheaf into pit` answered "The liquid runs straight through
     * a retting pit and pools on the floor", the straw was destroyed,
     * and the chain's first stage was unrunnable. No unit test caught
     * it because the pack's tests build the pit's contents directly
     * instead of pouring into it.
     */
    this.setClosure('liquidTight');
    // No lid — a pit in the ground. The over-ret failure only bites an
    // unsealed vessel, and this is the axis that says so.
    this.setOpen(true);
    this.setKeywords(['pit', 'retting-pit', 'pond']);
    this.setPrimaryKeyword('pit');
  }
}
