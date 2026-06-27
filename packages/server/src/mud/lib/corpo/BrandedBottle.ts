/**
 * BrandedBottle — a `Thing` that carries a corpo mark.
 *
 * The minimal composed class the proof-demo back-bar bottles use:
 * `BrandedMixin(Thing)` — a visible, tangible, containable object stamped
 * with a brand `key`. Templates set `class: /lib/corpo/BrandedBottle` and
 * carry `_brandKey` in their `data` block (the `RadioactiveMaterial extends
 * RadioactiveMixin(Material)` precedent — one subclass per composed
 * capability).
 *
 * This is a **branded object only** — it deliberately does NOT model
 * booze-as-bulk (`Bulkable`): working bottles, pours, and the back-bar
 * surface are the bar build's job. The bottle exists to prove the mark
 * resolves end-to-end (a bottle reads as a product of its corpo and is
 * MQL-queryable).
 */

import Thing from "../stuff/Thing";
import { BrandedMixin } from "./Branded";

export default class BrandedBottle extends BrandedMixin(Thing) {}
