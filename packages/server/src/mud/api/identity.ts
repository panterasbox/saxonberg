/**
 * Identity — the discovery namespace for the identity cluster.
 *
 * This is a **discovery surface**, not a new Api. It holds references to
 * the already-`decorateApiClass`-wrapped Api classes so callers reach
 * them through one stable import root and dot-navigation:
 *
 *   import { Identity } from "../api/identity";
 *   Identity.Recognition.describe(viewer, target);
 *   Identity.Belief.hydrate(viewer);
 *
 * **Why a namespace, not a merged `IdentityApi`.** The cluster's
 * methods are heterogeneous (per-viewer cache lifecycle, viewer×target
 * naming, owner-indexed ledger) — collapsing them into one class makes
 * a 25-method grab-bag and a vague receiver. Keeping the classes
 * separate but grouping them under `Identity.*` gives both halves of
 * discovery: typing `Identity.` recovers the receiver you forgot
 * (`Belief` / `Recognition` / …), and each leaf stays a small,
 * scannable method list. Grouping, not merging.
 *
 * **No effect on call-security.** `decorateApiClass` wraps each static
 * in place on its class and attributes the pushed frame from the
 * class's defining module, captured at decoration time — never from the
 * access path. So reaching a method as `Identity.Recognition.describe`
 * is identical to `RecognitionApi.describe`: same `Function.name`, same
 * module attribution, same `FromModule(...)` policy resolution. The
 * class stays the unit of security; this is the unit of *discovery*.
 *
 * The underlying classes keep their direct exports (`RecognitionApi`,
 * `BeliefStoreApi`) during migration — this barrel is purely additive.
 * Member names drop the `Api`/`Store` suffix (implied by the
 * namespace); the bare concept noun is the word you'd search for.
 *
 * Pilot for the broader Api-namespace sweep. `Chronicle` joined this
 * barrel when the chronicle build landed its `ChronicleApi`.
 */

import { BeliefStoreApi } from "./belief";
import { ChronicleApi } from "./chronicle";
import { RecognitionApi } from "./recognition";

export const Identity = Object.freeze({
  /** Per-viewer identity memory + its cache lifecycle (the dumb store). */
  Belief: BeliefStoreApi, // hydrate · writeRecord · deleteRecord · evictAndFlush
  /** Viewer×target naming — the compose seam over the belief store. */
  Recognition: RecognitionApi, // describe · learnIdentity · salientFeatures · perceivedKeywords
  /** Append-only identity ledger — the owner-indexed deed record. */
  Chronicle: ChronicleApi, // record · recordDeed · recordOnce · entriesFor · seedClaims
});
