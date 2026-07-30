/**
 * ConsumableMaterial — the `Material` subclass every **ingestible kind**
 * authors as (`class: /lib/material/ConsumableMaterial`): the foods,
 * spirits, and drinks whose worth is what a body does with them
 * (edibility, nutrients, toxins), as opposed to the structural matter
 * (metal, hide, stone, wood, tissue) the response/repair/salvage
 * machinery organizes around. The `RadioactiveMaterial` capability-
 * subclass pattern; no extra fields — the split is taxonomy, and the
 * fence it enforces is the **fixed-vocabulary rule**:
 *
 * The material library is a *curated, closed set an author selects
 * from*, at the granularity of **kinds that differ in substrate-read
 * properties** — eggs and steak are different rows (different macros);
 * ribeye and sirloin are NOT (that's `Grade` + prose on the instance).
 * Per-dish/per-drink substances are **never** material rows: a mixture
 * (a plated stew, a mixed cocktail) is a *derived blend* — its slot
 * points at one generic ConsumableMaterial and its identity + macros
 * ride the holder's per-instance {@link BulkPayload}, computed from the
 * consumed inputs (macros in = macros out). Growing this catalog is a
 * vocabulary decision, not a content decision.
 */

import Material from './Material';

export class ConsumableMaterial extends Material {}
