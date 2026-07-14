# The Grand Tour — launch content bundles

The first content built once the platform is whole. The design goal:
a new player — most have never touched a MUD, and none have touched
one like this — comes through these and brushes **every system we
offer**. Each bundle is a distinct "wing" of the tour; between them
they cover the full subsystem roster and serve every player archetype.

The lounge and Dave's Bar are deliberately **out of scope** here —
they exist. This is net-new content, in the city or out of it.

The end state: every bundle below is detailed to "locked and loaded"
(the nine-section definition-of-done), so build agents can pick up any
green bundle and build it out unattended.

## The bundles

| Bundle | Where | Primary teacher of | Archetypes | Home | Status |
|---|---|---|---|---|---|
| **Ferrow Delving** (the mines) | outside (highlands) | vitals stack (light/air/heat/fatigue/load), extraction→materials, grouping, parcel/claims | prospector, geologist, survivalist | `ferrow-delving.md` | **designing (depth)** |
| **Ledger Row** (market district) | city | banking, employment, trade/retail, credentials, corpo marks, provenance | merchant, trader, economist, vendor | `ledger-row.md` | level-0 |
| **The Front** (bounty station) | outside (Marches) | combat, alignment, contracts, field-medicine, recognition | fighter, bounty-hunter, medic | `newbie-wilds/` | staged (extend) |
| **The Assembly** (civic hall) | city | forums/deliberation, offices, conviction voting, bulletin | governor, politician, administrator, patron | `the-assembly.md` | level-0 |
| **Reclaimed Manor** (lapsed countryside) | outside (valley) | property/title, farming, stewardship, weather/seasons, employer-side jobs | farmer, rancher, landholder, builder | `reclaimed-manor.md` | level-0 |
| **The Deadzone** (cut undercity) | city (under) | perception/senses, belief/recognition/disguise, MQL, notoriety, contacts | detective, rogue, fixer | `the-deadzone.md` | level-0 |

**The trunk, not a wing:** the campus (`eternal-university/`) is the
onboarding hub the six branch out from — char-gen services, the
scholar/authoring path, the study.com external-mastery seam. Treated
as the connective frame, not a seventh destination.

**The one real gap:** the **entertainer/performer** — emotes,
reactions, renown all exist but no stage that pays. A candidate
seventh bundle (a playhouse / arena / broadcast stage teaching
performance + reactions + participation + the livestream relay), and
it sits on the go-live broadcast critical path.

## The spec shape — "locked and loaded" = these nine

A bundle is build-agent-ready when its bible contains all nine. This
is the definition-of-done that lets an agent build without making
design calls.

1. **Charter** — fiction hook, systems taught, archetypes served, the newcomer beats
2. **Map** — every room, its exits, the zone/Warren structure (the "map spine")
3. **Rooms, three tiers each** — (a) atmosphere prose + light/biome/weather, (b) the *few* real interactive objects, (c) which NPCs stand here
4. **Stuff catalog** — every interactive object → its class + mixins + behaviors
5. **NPC dossiers** — full carves (persona, brain, dialogue tree, disposition, economic role); each its own design pass, done one at a time
6. **Arcs / quests** — state-change-first: name the delta, then the pathways
7. **Systems wiring** — disciplines seeded, jobs/business, parcels/title, money flows
8. **Build order + deps** — engine prereqs (✓/pending) and the internal build sequence, so agents parallelize
9. **Decisions / open questions**

## How we work it

- **Depth-first:** take one bundle through all nine to build-ready.
- **Breadth-first:** sweep one *section* across bundles (e.g. rough all seven maps in a sitting).
- The table above tracks which bundles are green. Skipping around is fine; this index is the thread.

## Decisions log

- **2026-07-13** — Set of six wings + campus trunk + performance gap agreed. Depth-first on Ferrow Delving as the template the others copy (chosen because nearly every engine dependency is already shipped, so it's the most buildable).
- **2026-07-13** — Ferrow Delving mine model locked: one 3D `CartesianZone` `(x,y,z)` (native dig-down, depth-driven atmosphere, 3D ore bodies); three-state persistence (Spine/Held/Provisional, commons churns & claims persist); distinct mine-vein vs carve-heading acts (cost = rock hardness); seal-and-reap at articulation-point chokepoints, re-drivable into fresh ground; behind-the-wall = blank heading + geology-field features/chambers; cave-ins never fatal (safe sealing + telegraphed survivable collapse). See `ferrow-delving.md` §2/§9.
- **2026-07-13** — Ferrow deep-history design surfaced **archaeology** as a **platform-wide scholar discipline** (ISCED-F 0222; reads every ruin-layer — Terminus / lapsed countryside / Deadzone, not just the mine) with a **decipherment** vertical (lost Eternal-age script; real method + knowledge ladder). Flagged as its **own future thread**; Ferrow is its first field site. Deep-history: the mine is a **reopened great-house working** (house → Widening-lapse → co-op → Veshko). See `ferrow-delving.md` §1/§7.
- **2026-07-13** — Ferrow ore-flow surfaced the **platform-economy loop** as a cross-wing thread: `mine → smelt → manufacture → retail → consume` (money back up; the pick is forged from mined metal). Conserved — CB = only money source/sink, mine = matter source, wear = matter sink; buyers (Veshko) are black-box **budgeted** actors, never faucets. Each step = a player role. Ferrow owns only its conserving **sale boundary**; the full loop is its **own future thread**. See `ferrow-delving.md` §7.
