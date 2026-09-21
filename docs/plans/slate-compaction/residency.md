# Slate compaction ledger — batch: residency

Slates: `docs/slates/tails/residency-slate.md`,
`docs/slates/builds/spawn-distribution-slate.md`.
Insert-doc: `docs/subsystems/residency.md`.

Verification method: grepped `packages/server/src/mud/**`,
`packages/content/**` for the mechanisms each slate names, read the
matching subsystem doc sections, and diffed the two. Findings below are
recorded as each slate is finished (incremental per the skill's rule).

## `docs/slates/tails/residency-slate.md` — 206 → 0 (DELETED) · Status TAIL → ABSORBED

Two status blocks present (lines 1–8 canonical `**Left:**`/`**Size:**`
form; lines 9–19 an older narrative restatement of the same claim) — the
older one carried no information the canonical one lacked, both fully
superseded by the shipped doc.

### Cut (SHIPPED · DOCUMENTED)
- Both status blocks + framing paragraph ("This is a garbage-culler…")
  (~30 lines) — code: `packages/server/src/mud/lib/stuff/Stuff.ts`
  (`canEvict`), `platform/idea/api/ResidencyLogic.ts`; doc:
  `residency.md` (whole doc restates this, verbatim in the "garbage-
  culler, not a swapfile" paragraph).
- `## See also` (pointers only, no design) — doc: `residency.md`'s own
  inline cross-references cover the same set (lifecycle.md, ref-
  shapes.md, time.md, app-settings.md, weather.md, behavior.md).
- `## The whole mechanism` (canEvict / lastTouched / the sweep /
  observe-first tuning) (~95 lines) — code confirmed: `Stuff.canEvict`
  (`lib/stuff/Stuff.ts:872-896` for `lastTouched`/`touch()`),
  `ResidencyLogic` (`platform/idea/api/ResidencyLogic.ts`); doc:
  `residency.md` §§ "The whole mechanism" / "The veto roster" /
  "Observe-first, then tune" — documents the same mechanism in more
  detail (context object, raw-vs-proxy touch split, per-host veto
  table) than the slate's original sketch.
- `## The sibling: scheduled state-reset` (~18 lines) — code confirmed:
  `lib/residency/Resettable.ts` (`ResettableMixin`), consumers at
  `platform/thing/Stock.ts` and `packages/content/trade-farming/src/thing/ToolRack.ts`,
  `installResetSweep`/`runResetSweep` in `ResidencyLogic.ts`; doc:
  `residency.md` § "The reset sweep" — fully documents clock split,
  presence-skip + opt-in override, and the `Stock` consumer. The
  slate's claim (its own status block) that this was still "Left" is
  FALSE against the code — it shipped.

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- None net-new; see the one salvaged Open item below and the doc
  correction noted under Findings.

### Kept — none (all resolved)

### Uncertain — none

### Salvaged into `residency.md` (this slate is ABSORBED)
- "Reset scope for v1 — restock-only vs restock + field-revert" (Open
  question #3): restock-only is what shipped (`Stock.reset()` clones
  fresh goods; `ResettableMixin.reset()` is a bare contract with no
  template-baseline diff anywhere in the tree — grepped for
  `field-revert`/`fieldRevert`/`revertToBaseline`/`restoreToTemplate`,
  no hits). Field-revert itself was never designed further and is a
  real open gap, so it is now a bullet in `residency.md § Deferred`
  ("Reset scope stays restock-only") rather than lost with the file.
- Open questions #1 (`lastTouched` storage), #2 (recency bump
  mechanism), #4 (module home for `ResettableMixin`) are all resolved
  and already stated in `residency.md` (private field on `Stuff` base;
  dispatch-touch from the security gate; `lib/residency/Resettable.ts`)
  — no salvage needed, cut outright.

### Finding — a statement the code proved false (fixed, per the skill)
`residency.md`'s "sweep is a faucet" section stated the spawn sweep was
installed as "A boot run… `AppBootstrap` calls `ResidencyApi.spawnNow()`
once after `ResidencyApi.boot()`". The code
(`ResidencyWarden.warm()` → `logic.installSpawnSweep()`, in
`platform/idea/ResidencyWarden.ts`) shows it is a **recurring** game-time
sweep (`WorldClockApi.every`, cadence `residency.spawn.intervalS`),
armed the same way as eviction and reset, not a single boot-time call,
and `AppBootstrap` never calls it at all (grepped, no hits). Corrected
the bullet in place to describe the recurring sweep; this also resolves
the "respawn vs one-shot" open question the spawn-distribution-slate
still carried (see that slate's entry below).

### Status block
- Left: "the game-time reset sibling" → (empty)
- Size: a tail → (absorbed; see `spawn-distribution-slate` entry below
  for the surviving `Left` on the sibling design)

## `docs/slates/builds/spawn-distribution-slate.md` — 108 → 97  · Status PARTIAL → PARTIAL

Two status blocks present (the canonical `**Left:**`/`**Size:**` block,
plus an older "named, not designed" narrative one) — collapsed to one;
the narrative block carried no surviving information (its "weighted
distribution… tunable" framing is now stated more precisely, with the
shipped shape, in the consolidated block).

### Cut (SHIPPED · DOCUMENTED / SUPERSEDED — shipped in a plainer shape)
- `## The model — three parts` (18 lines) — code:
  `packages/server/src/mud/platform/idea/api/ResidencyLogic.ts`
  (`collectSpawnCandidates`, `regionStockFor`, `SpawnTable.draw`); doc:
  `residency.md` § "Zone fields the spawn sweep reads" / § "The sweep is
  a faucet". SUPERSEDED, not a clean match: shipped as region-scoped
  `stocks`/`favours`/`blessingOdds` counts + overlays keyed on a
  template's authored `container:` zone, not the sketched per-item
  rarity weight + depth/biome/tag eligibility filter (grepped
  `ResidencyLogic.ts` for `eligib`/`depth`/`biome` — no hits beyond the
  zone-lookup path). Cut with a pointer note left in the body (see
  "Two output kinds" above it).
- "Items (loot)" bullet under `## Two output kinds, one substrate` (3
  lines) — code: `rollBlessing()` call site in `ResidencyLogic.ts`
  ("**The BUC roll fires HERE and nowhere else**"); doc: `residency.md`
  § "The sweep is a faucet" + `magic-items.md` § "The census". Cut,
  replaced with a short pointer paragraph (kept in the body, not the
  ledger, since the slate still needs the "two output kinds" framing to
  introduce the surviving Creatures half).
- "Respawn vs one-shot" (Open questions) — code:
  `ResidencyWarden.warm()` → `installSpawnSweep()` is a **recurring**
  `WorldClockApi.every` sweep (see the Finding in the residency-slate
  entry above, which corrected `residency.md` to say so). Resolved for
  the item half; the creature half's remainder is already carried in
  the status block's `Left` ("creature respawn economics") and in the
  `Deferred` list. Cut.
- "Determinism/seeding model" under `## Deferred` — verbatim duplicate
  of the "Determinism / seeding" bullet already under `## Open
  questions`. Cut as redundant (both said the same open thing; kept the
  one in Open Questions).

### Kept (UNBUILT)
- `## Two output kinds, one substrate` → "Creatures (procgen NPCs)"
  bullet + the "bespoke named cast is explicitly OUTSIDE the table"
  paragraph — grepped `create-monster`/`createMonster`/`procgen`/
  `NpcGenerator`/`generateNpc` across `packages/server/src/mud` and
  `packages/content`: no matches beyond `Login.mintRandomGuestAvatar`
  (which the slate already names as the reused precedent, not the thing
  itself). Fully unbuilt.
- `## Consumers` — mixed list (BUC item-spawn + generic-location
  population shipped; create-monster, generalized loot/treasure tables,
  encounter tables, world fauna & populace, wandering-monster ticks
  unbuilt). Kept whole — a single-line list, below paragraph
  granularity to split further.
- `## Open questions` → Tuning, Determinism/seeding, Authoring surface,
  Global-table balance — all four checked against code (no CMS panel
  for spawn tables found; `SpawnTable.draw`'s `roll` param is
  test-injectable `Math.random`, not a per-locality seed like weather's
  field) and confirmed still open.
- `## Deferred` → tuning/balancing pass, creature respawn economics
  (narrowed — see Cut above), hollow bestiary / large creature-
  population content (still waits on combat +
  `presence-hollowing-slate.md`, not verified to exist but out of this
  batch's scope).

### Doctrine — kept, labelled
- `## Static sibling — and what's new` — explains the
  static-`populates:-onto` vs dynamic-runtime-draw relationship. Not
  itself a shipped/unshipped claim; still the framing the surviving
  creature-half work sits inside (on-demand spawn via a create-monster
  scroll, a wandering-population tick — both still unbuilt). Kept
  verbatim.

### Uncertain — none

### Handoff (belongs in a doc outside my list)
- None. `magic-items.md` already documents its half of this
  (`§ The census`) independently; no undocumented decision here belongs
  in a doc outside `residency.md`.

### Status block
- Left: "the creature half — a procgen-NPC generator … · the respawn
  clock + faucet economics · determinism/seeding · the depth and rarity
  curves" → "the creature half — a procgen-NPC generator … · create-
  monster · creature respawn economics · a true weighted-rarity draw
  with depth/biome/tag eligibility · reproducible/seeded spawns · an
  authoring surface for the tables · global-table balance · the hollow-
  bestiary / world-fauna content" (grew — the body's Consumers/Deferred
  sections named items the old Left list didn't)
- Size: a build → a build (unchanged — the creature-half generator +
  its economics is still its own cycle, not a tail)


