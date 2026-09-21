# Slate compaction ledger — batch `electricity`

Slates: `docs/slates/tails/electricity-slate.md`,
`docs/slates/builds/power-utility-slate.md`.
Doc I may insert into: `docs/subsystems/electricity.md` only.

## Findings (code verification, before cutting)

- `packages/server/src/mud/lib/electricity/Energized.ts` confirms
  `EnergizedMixin` carries only `voltage`/`conduct`/`currentThrough`/
  `shockContact` — **no supply-ref field of any kind**. The
  power-utility-slate's "supply reference on `Energized` fixtures" item
  is genuinely still unbuilt.
- `packages/server/src/mud/world/substation/FloodedCell.ts` +
  `packages/content/world-seed/content/world/substation/*` is the
  demonstrator electricity.md documents as *The Drowned Substation* — a
  **self-contained zone with no cross-area inbound exit wired**. It is
  NOT "Foundry Row's flooded switch-cell" as the power-utility-slate's
  §"Where the fiction already leans utility-ward" item 1 says — no
  "Foundry Row" content exists anywhere in `packages/` (only mentioned in
  slates/staging docs). The code proves that description stale; noted in
  the cut below rather than left silently wrong.
- No hydro-generation content, no gas `Conduit` commodity content, no
  franchise/distribution-network-on-exits code, no utility billing/meter
  code, no lineman rotation content exist anywhere in `packages/`
  (`grep` for `hydro`, `franchise`, `lineman`/`linemen`, `gas` conduit,
  `utility` all came back empty or false-positive). Every item in
  power-utility-slate's `Left` list is confirmed still fully UNBUILT.
- `docs/subsystems/watershed.md` § *`SupplyState`'s second speaker*
  (compacted this same pass — see `docs/plans/slate-compaction/watershed.md`)
  independently confirms no electricity object composes `SupplyReporting`
  yet — consistent with the above, no action needed here.
- `docs/subsystems/electricity.md`'s own "Deferred seams" section already
  names, at doc-quality detail, every item the electricity-slate.md tail's
  canonical `Left` list names (AC/DC, full Kirchhoff, hand-chains/damp
  floors/humidity, Joule→fire, magic `Create·Lightning`, power/the grid) —
  the tail's §1–§4, §6–§8 are now pure restatement of shipped, documented
  decisions.

---

## `docs/slates/tails/electricity-slate.md` — 281 → 77 lines · Status PARTIAL → PARTIAL (doctrine-only remainder)

### Cut (SHIPPED · DOCUMENTED)
- Old narrative status paragraphs (`> **Status: sketch / pre-requirements.**` +
  the `Scope` paragraph, 24 lines) — superseded by the canonical status
  block above it (one-status-block rule) and by the scope statement now
  carried in electricity.md's opening paragraph + Deferred seams.
- `## §1 — The honest core: Ohm's law + potential difference` (23 lines)
  — code: `packages/server/src/mud/platform/idea/api/ElectricityLogic.ts`
  (Ohm's-law core), `Energized.ts`; doc: electricity.md § *The model at a
  glance*, § *The graph — grounding, insulation, potential difference*
  (bird-on-a-wire, one-hand rule are stated there verbatim).
- `## §2 — The shock channel + the material properties` (23 lines) —
  code: `lib/material/Channel.ts`, `Material.electricalConductivity`;
  doc: electricity.md § *The model at a glance* (channel + conductivity
  bullets, values authored).
- `## §3 — Conduction-spread (the soul)` (38 lines) — code:
  `ElectricityLogic.conduct`, `SustainedShock`; doc: electricity.md §
  *The model at a glance* (conduction-walk bullet), § *The graph*, §
  *The temporal model — event + reconcile-on-read sustain*.
- `## §4 — The vitals coupling` (13 lines) — code: `VitalsMixin`
  cardiac coupling, `setCauseOfDeath('electrocution')`; doc:
  electricity.md § *The vitals coupling — the electrocution death seam*.
- `## §6 — The couplings, and the v1 cut` (24 lines) — code: wet-skin
  ~100× factor, `Material` conductivity values, `WeatherApi` rain read;
  doc: electricity.md § *The armor inversion (emergent) + wet-skin*, and
  the v1/stretch/deferred split is the doc's own Deferred-seams list.
- `## §7 — The v1 demonstrable vertical (sources)` (20 lines) — code:
  `LiveWire.ts`, `FloodedCell.ts`, `StunBaton.ts`, the shock-innate path
  in `commitShockInflict`; doc: electricity.md § *Sources + the
  demonstrator* (documents all three sources plus the electric-eel/innate
  case in more detail than the slate).
- `## §8 — Presentation & legibility` (10 lines) — code:
  `AnalyzeElectricalController`, `responsePipsAugmenter`,
  `quantity-tags.yaml` banding tables; doc: electricity.md § *Legibility*.
- `## Key architectural moves (the decisions)` (15 lines) — pure recap of
  §1–§4 above; same doc sections.
- `## Resolved (this pass)` (9 lines) — pure recap; same doc sections.

### Superseded — cut, one-line pointer kept
- `## Open questions` bullet *"Deferred hard: power/circuits/devices..."*
  — superseded by `docs/slates/builds/power-utility-slate.md`, which now
  owns this as a full build-sized slate. One-line pointer kept in place.

### Resolved-open-questions — cut, one-line pointer kept
- *Current-division fidelity* — resolved: simple conductance-to-ground
  division shipped (electricity.md § The graph); full Kirchhoff named as
  a Deferred seam there.
- *Contact-graph reach* — resolved: containment/surface/co-immersion is
  the shipped v1 edge set (electricity.md § The graph); hand-chains/damp
  floors/humidity are that doc's own Deferred seams.
- *`inflict` integration* — resolved: `ConditionApi.inflict` branches on
  `mechanism:'shock'`, skips the covering-stack fold (electricity.md §
  The model at a glance).
- *Salt vs fresh water conductivity* — resolved: both are authored
  `Material` values (electricity.md § The model at a glance).

### Kept (Doctrine)
- `## §5 — Usage: the emergent experiences (why honest pays off)` — kept
  verbatim. This is the "why honest physics pays off" argument
  (chain-lightning-is-free, caster-obeys-own-physics, faction-blind,
  anti-armor, and the **impulse-vs-modifier residual-field split** for a
  future sustained Lightning effect — this last point is NOT stated
  anywhere in electricity.md's Deferred seams and would otherwise be
  lost). Labelled Doctrine per the skill's calibration; coordinator to
  decide its home (electricity.md's own "why", or leave here).

### Uncertain
- (none)

### Handoff (belongs in a doc outside my list)
- (none — every remaining item and every graduation target is
  electricity.md itself)

### Status block
- Status: PARTIAL → PARTIAL (nothing shipped-and-undocumented remains;
  only the Doctrine section is left, so `Left` is now empty)
- Left: `AC vs DC · full Kirchhoff current division · hand-chains,
  damp-not-pooled floors and humidity · Joule→fire · magic
  Create·Lightning · power as a grid` → *(none — doctrine only, see §5)*
- Size: a tail → a tail (unchanged; now a very small tail)

---

## `docs/slates/builds/power-utility-slate.md` — 194 → 182 lines · Status PARTIAL → PARTIAL

### Cut (SHIPPED · DOCUMENTED)
- `## Where the model stands` (9 lines) — restates electricity.md's own
  opening description of local-physics-no-network verbatim; code:
  `Energized.ts` (no supply/network field); doc: electricity.md's
  opening paragraph + § *The source — EnergizedMixin*.
- Bullet 1 of `## Where the fiction already leans utility-ward` (*"The
  substation exists as content..."*) — the substation/FloodedCell is
  fully documented, in far more detail, at electricity.md § *Sources +
  the demonstrator*. Note: the bullet's "Foundry Row's flooded
  switch-cell" description is **stale/false** — the shipped substation
  is a standalone zone (`/world/substation`, no Foundry Row content
  exists) — see Findings above.

### Kept (UNBUILT)
- `## Where the fiction already leans utility-ward`, bullets 2–3
  (electrician's daily loop, storm contract) — vision-only, still
  motivates the unbuilt middle tier.
- `## The middle tier (the likely v1)` — the supply-ref design, the
  distribution/franchise-network addendum, the residential-demand /
  commodity-generic addendum, and the open middle-tier questions — all
  confirmed unbuilt (Findings above).
- `## Generation — DECIDED: Terminus runs on hydro` — a decided
  worldbuilding fact with **zero code**; not shippable to electricity.md
  (it's geography/city-identity, not shock-channel mechanism) and
  belongs with terminus-city.md, outside my doc list — kept in place.
- `## The municipal layer (the real fork — owner's call)` — ownership
  fork, the Law-2-constrained billing block, labor, generalization — all
  confirmed unbuilt.
- `## Consumers waiting` — all three items still pending.
- `## Cross-references` — spine, unchanged.

### Uncertain
- (none)

### Handoff (belongs in a doc outside my list)
- (none this slate — the one candidate, "Generation — DECIDED: Terminus
  runs on hydro," has no code to graduate; it is a worldbuilding decision
  that belongs in `docs/staging/terminus-city.md` if/when someone
  compacts that doc, not a subsystem-doc graduation. Flagging for the
  coordinator rather than moving it, since staging docs are outside this
  pass's remit as I understand it.)

### Status block
- Status: PARTIAL → PARTIAL (unchanged — still all substrate/no surface)
- Left: unchanged — every item in the existing list is still
  body-represented and confirmed unbuilt by code (supply reference ·
  outage propagation/directional network failure · gas as second conduit
  commodity · kitchen as residential demand case · use-metered billing
  (Law 2) · the ownership fork · hydro generation as content · the
  lineman rotation)
- Size: a build → a build (unchanged)

---

## Coordinator (2026-09-20) — electricity-slate RETIRED (ABSORBED)

`Left` was empty; the skill's ABSORBED rule applies. The kept §5 doctrine
was homed in `electricity.md § Why honest pays off — the emergent
experiences` (verbatim, with a one-clause note that the sustained field
is the `Create·Lightning` seam), the four resolved open questions already
pointed into that doc, and the hard-deferred line pointed at
`power-utility-slate.md`. File deleted. The *See also* cross-references
were all already present in `electricity.md`'s own text or the pointed
docs; the inquiry-slate "flagship inquiry domain" line is the one
sentence that lives only in the deleted slate — recorded here: *electricity
is the flagship inquiry domain; Ohm's law is quite possibly the cleanest
discoverable law in physics; a multimeter is just `analyze` revealing the
numbers.*
