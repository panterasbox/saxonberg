/**
 * Epoch — the technological era an instrument belongs to. A closed
 * vocabulary, the `LAND_USES` / `GROWTH_STAGES` shape: a `const` tuple,
 * the type derived from it, and the one setter that admits it refusing
 * anything else, so a mis-typed row fails at hydrate rather than
 * reading as a sixth era nothing can predicate on.
 *
 * ⭐ A stamp on the INSTRUMENT, never on the act. The land-use covenant
 * restricts means, not ends — a parcel that admits handsaws and refuses
 * chainsaws asks the tool in your hand which era it is from, and the
 * same `fell` is legal or not by what is bound to it. That predicate is
 * the vocabulary's first reader; the forestry build stamps the axe and
 * the billhook `medieval` and reads nothing yet.
 *
 * Order is presentational (earliest to latest), and ALSO ordinal for the
 * covenant's one obvious form — *"nothing later than X"* is
 * `EPOCHS.indexOf(a) <= EPOCHS.indexOf(b)` — which `LandUse`'s table
 * does not have. Magic and future tech are one axis (design-lenses § 5),
 * so `future` is the last word and not a separate list. No value-statics
 * here: `lint:lib-statics` is a ratchet, and a guard over a five-word
 * tuple is one `includes` at the setter.
 */

/** The five eras. Closed — see the module doc. Earliest first. */
export const EPOCHS = [
  'prehistory',
  'medieval',
  'industrial',
  'modern',
  'future',
] as const;

/** One of {@link EPOCHS}. */
export type Epoch = (typeof EPOCHS)[number];
