# Reference-lifetime slate — declare how long a ref holds

> **Status: PARTIAL** — shipped 2026-08-02 as `static fieldMeta` on the
> two-axis model → [ref-shapes.md](../../ref-shapes.md); re-verified
> 2026-09-19 (the metadata unification shipped with it — no legacy
> field statics remain; `authorable` / `runtimeState` fold in). The tail
> is [ref-shapes.md § Known gaps](../../ref-shapes.md#known-gaps--sites-not-yet-declared).
> **Left:** the undeclared instance-ref sites still guarding by hand
> (`SandboxCrossingExit.crossing` · the `ExitableVessel` caches ·
> `LoungeWarren._reapTimers` · the warren maps, now
> `OuterWarren._holdingsByKey` / `_circulationByNode` / `_entriesByKey`
> and `HoldingWarren._roomsByKey`) · the six held-side R2.4 unhooks
> folded into declarations (open question below)
> **Size:** a tail

## Why it matters more than it looks

*Shipped; the why is handed off to ref-shapes.md § The two axes (ledger
`docs/plans/slate-compaction/unlinked-7.md`).*

## The shape

*Superseded by the code: shipped as `static fieldMeta = { _x: { ref:
'instance', lifetime: 'weak' | 'symmetric' | 'owned' } }` — the
follow-on's inverted shape, not a `referenceFields` map → ref-shapes.md
§ Declaring it.*

## Options considered and rejected

*Decided; the stuffId-handle rejection is ref-shapes.md § Live ref, not
stuffId. The wrapper-type, `WeakRef` and decorator rejections are handed
off to the same doc (ledger `unlinked-7.md`).*

## The follow-on it implies — metadata unification

*Shipped: `FieldMetaEntry` (`lib/mixin.ts`) is the one field-keyed
structure — `persistent` / `marshaller` / `instruction` / `stackIdentity`
/ `authorable` / `runtimeState` + `ref` / `lifetime`; the doc tags folded
in → ref-shapes.md § Declaring it, mixins.md § Static contributions.*

## Open questions

- Q1 (eager `weak`) resolved: every instance ref heals lazily in the
  `ProxyApi` get trap; the eager destruct-side rules are `symmetric` /
  `owned` → ref-shapes.md § R2.3.
- Q2 (declared + persisted) resolved: `instance` with `persistent` throws
  at class registration → ref-shapes.md § Declaring it.
- **Should R2.4 collections fold into the same declaration**, given they
  are already framework-enforced by a different route?

## Cross-references

- [ref-shapes.md](../../ref-shapes.md) — R2.1–R2.4, the three reference
  shapes, and the residency corollary.
- [residency.md](../../subsystems/residency.md) — `canEvict`, the relational
  veto roster derived from these rules.
- [mortality.md](../../subsystems/mortality.md) — where the question came
  from. `MortalArc` ended up holding **no** object handle at all, which was
  the right local answer and is why this is a slate rather than a patch.
