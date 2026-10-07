# trade-tanning

The tanning trade: a hide becomes leather in a pit of bark and water.

⭐ **The shape worth knowing before editing anything here.** Tanning is
*per-hide state driven by a condition the pit holds*, not a batch
transform. So it is NOT `MaturingMixin` — that converts one bulk batch
keyed to a vessel's interior material, and here what changes is each
individual skin while what depletes is the liquor. It is
`WaterActivityMixin`'s shape: an item's own state advancing against the
thing it is sitting in, reconciled on read.

- `src/lib/Tanning.ts` — the mixin, and the dials. Composed by `Hide`
  and by nothing else.
- `src/thing/Hide.ts` — what a skin IS. ⚠ Not a `Provision`: a hide is
  not food.
- `src/thing/Tanpit.ts` — the vessel, and the `tan` affordance.
- `src/idea/cmd/tanning/TanController.ts` — `tan <hide> [in <pit>]`.

The numbers live in one table (`TANNING` in `lib/Tanning.ts`) and are
labelled playtest-tuned. Nothing else in the pack holds a magic figure.
