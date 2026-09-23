# Doctrine-homing ledger — batch 10 (civics · logistics · ranching · magic · chat · encumbrance · senses)

> Pass: doctrine homing (see `.claude/skills/compact-slate/SKILL.md` § The
> doctrine-homing pass). Branch `design/doctrine-homing`. One row per
> Doctrine entry of each assigned compaction ledger; outcomes are
> `GRADUATED → <doc §>` · `DUPLICATE → <doc §>` · `MOVED → handoff (<doc>)`
> · `STAYS` · `STAYS (contradicted)`. Home is decided by the STATUS of what
> the doctrine argues for, verified against code under
> `packages/server/src/**` + `packages/content/**`, never by the slate's own
> markers. Every MOVE's text is verbatim under `## Handoff` at the end.
> Write list: `docs/subsystems/civics.md`, `docs/subsystems/influence.md`,
> `docs/subsystems/logistics.md`, `docs/subsystems/ranching.md`,
> `docs/subsystems/magic.md`, `docs/subsystems/chat.md`,
> `docs/subsystems/comms.md`, `docs/subsystems/encumbrance.md`,
> `docs/subsystems/senses.md`, plus the slates the ledgers name.

## Tally

29 entries. **GRADUATED 3** (freight *Topology* → `logistics.md § The depot`; freight *The line is capacity, not goods* → `logistics.md § The teleport defect, fixed`; encumbrance *bearers* → `encumbrance.md § The gauge`) plus one sub-section graduation inside a STAYS row (legal-code *Every stake is a fading number times a growing one* → `influence.md § Conviction`) · **DUPLICATE 5** (household Part 5 safety blockquote · logistics Part 3 cost-surface prose · logistics Appendix · ranching thesis sentence, already gone · comms *attribution is the trust boundary*) plus two sub-section duplicates inside STAYS rows (logistics Part 7 *Two doctrine constraints* · ranching *one shared substrate* paragraph) · **MOVED 1** (freight *Why the industry exists at all* → handoff `settlement-model.md`) · **STAYS (contradicted) 2** (freight wall-clock invariant · magic *Principle*) · **STAYS 18**.

## Rows

### civics · `docs/slates/builds/legal-code-slate.md`

Code check (`packages/server/src/mud/**`, `packages/content/**`): no `law` document kind in `lib/document/DocumentKinds.ts`; no `LawApi`/`LawLogic`/`LawCatalogue`; no `docket`, `sunset`, `enfranchis*`, `totalStanding`, `holdThrough` or crossing hysteresis anywhere (the only `docket` hits are a ForumsLogic comment naming it deferred and a clerk's emote line); `ConvictionLogic.ts` ships `hold/flip/drop/abstain/positionOf/tally/quorumWeight` with `tally = Σ standingOf(holder).scalar × convictionFraction × (yea − nay)` and the three stocks decay (`participation.decayHalfLife`, `producer.decayHalfLife` in `lib/config/AppSettings.ts`).

- civics · legal-code-slate · `## Worked example: the turnpike trust` — **STAYS** — the four instruments it exercises (`parameter` clause, `directive`, sunset, caucus platform) are all UNBUILT; it is the sanity check requirements will want for the instrument taxonomy.
- civics · legal-code-slate · `## The vote as spectacle` (5 sub-sections) — **STAYS**, except `### Every stake is a fading number times a growing one` **GRADUATED → `influence.md § Conviction`** (*Why the weight is a fading number times a growing one*) — that one argues for the SHIPPED tally (decaying standing × building conviction; `ConvictionLogic.ts:183–184`) and the doc stated the ramp without the two consequences (park-and-return dies unaided; a chamber of the currently present); the countdown, flip-targeting, quorum floor, *never reward holding* rail and hold-through all argue for unbuilt surfaces (no passage rule, no spectacle gauge, no consumer-vote payment to guard against). Slate text replaced with a pointer after diffing the insert.
- civics · legal-code-slate · `## Sunsets` → `### The magic` · `### The honest counterweight` — **STAYS** — no expiry, no instrument types, no Roll; the power-redistribution argument is the requirements case for an unbuilt mechanism.
- civics · legal-code-slate · `## The founding corpus` → `### The rule separating provocation from endorsement` · `### The volume rule` — **STAYS** — no `process: founding`, no received law on any books; these are the drafting rules for a corpus nobody has drafted.
- civics · legal-code-slate · `## The docket` → `### The sweep — a backstop, not a heartbeat` + `#### ⭐ The consequence: enactment has no human actor` — **STAYS** — no docket, no crossing sweep, no enactment; the general rule (*a sweep exists only where a state change must be stamped*) is stated as the docket sweep's justification and no shipped sweep in `residency.md`/`activity.md` cites it, so it goes with the mechanism it argues for.
- civics · legal-code-slate · `## The roll` → `### Why it is excellent pedagogy` — **STAYS** — no disenfranchisement roll, no `enfranchised` flag; lens-1 case for an unbuilt amendment-library entry.

### civics · `docs/slates/tails/household-design-pack.md`

- civics · household-design-pack · `## Part 0 — with one holder a mirror, with two a commons` — **STAYS** — the commons read it argues for is the act-attributed condition producer, which is UNBUILT (the shipped axis is the shell clock only; the slate's own Part 9 says every claim depends on it).
- civics · household-design-pack · `## Part 3 — aggregate, never report` — **STAYS** — a rule against building a per-person split over a household read that does not exist yet; its source doctrine is already the state's in `press.md` (*the state aggregates, never reports*) and `watershed.md`, so the household instance goes with the household.
- civics · household-design-pack · `## Part 5` → the *SAFETY property* blockquote — **DUPLICATE → `furnishing.md § Restore routing` + `chattel.md § onDestruct GC`** — *evicted, never stripped* is a property of SHIPPED mechanism (`ParcelApi.revokeUse` reaps the body; `ChattelApi.evictToStorage` is the lease-end sweep, *intact, titled, recoverable, never destructed*; held goods evacuate rather than destruct) and both docs state it; the blockquote is replaced with a pointer that keeps the Part 8 cross-reference. Neither doc is in this batch's write list, so nothing was inserted.
- civics · household-design-pack · `## Part 10 — Pedagogy` — **STAYS** — every bullet's lesson (free-riding at N=2, the running household contract, marriage as a bundle, within-a-home invisible labor) rides the unbuilt household; the one shipped lesson (title vs tenancy) is documented as mechanism in `holding.md`.

### logistics · `docs/slates/builds/freight-slate.md`

Code check: `Lane`/`Route`/Journey/`DepotCounter`/`Warehouse`/the paper ship (`logistics.md`); `Exit.edgeMinutes` is spent only inside a Journey and ordinary `go` is free and instantaneous (`logistics.md § The cost surface is OPT-IN`, decided 2026-09-04); `teleport.yaml` is `requiresAnimate` and a teleport severs a hitch (`conveyance.md`); no tollgate, barricade, turnpike trust, antitrust record, guild or freight corpo anywhere under `packages/content/**`.

- logistics · freight-slate · `## Why the industry exists at all` — **MOVED → handoff (`settlement-model.md`)** — realm-level (why transport exists; von Thünen's rings generated, never authored) and `settlement-model.md` owns towns / von Thünen per the skill table yet no top-level or subsystem doc mentions von Thünen at all (`grep -ril thünen docs/` hits slates only); § 8 *Connective tissue* is the natural neighbour. Verbatim text under Handoff; the slate section is left in place until the coordinator's insert lands.
- logistics · freight-slate · `#### The invariant this actually protects: no economic rate may be wall-clock` + `## Audited: every production system already complies — except movement` + `## The legal implication: this one CANNOT be a statute` — **STAYS (contradicted)** — the rule is realm-level and a natural Tier-A candidate for `measurement.md`, but the shipped decision it would have to describe goes the other way: `logistics.md § The cost surface is OPT-IN` records that eleven `go`s or an `msh` script move a hitched rig and its cargo in zero game time at wire speed, i.e. freight throughput IS command-rate-bound today and the tension was *accepted knowingly* (option 2, *make the rig the gate*, parked pending playtest). A reference doc must not state a rule the code does not hold; the section stays beside its already-flagged sibling `## Why the design already closes it` (contradicted in the logistics ledger). ⚠ Coordinator: when option 2 lands, this is a one-row `measurement.md` Tier-A insert (*no economic entitlement may depend on the rate at which a member's commands are processed; what the polity cannot measure the kernel must foreclose*).
- logistics · freight-slate · `## Topology — freight is NOT hub-and-spoke (but it becomes it)` — **GRADUATED → `logistics.md § The depot`** (*Why point-to-point, and why the hub is emergent*) for the utilities-are-trees / freight-is-an-O-D-matrix / hub-is-emergent-and-the-switch-is-capacity / three-networks argument — the doc stated the shipped conclusion (*routing is point-to-point; consolidation is a hauler's decision, never a topology the engine imposes*) with a one-clause why; a faithful compaction (~20 lines) inserted, the four sub-sections replaced with a pointer after diffing. **STAYS** for `### The consequence that matters most: the monopoly is at the HUB` (Munn) and `### Two things that fall out free` — they argue for the UNBUILT depot antitrust arc and express-vs-standard pricing.
- logistics · freight-slate · `### The line is capacity, not goods` — **GRADUATED → `logistics.md § The teleport defect, fixed`** (*Why the line is capacity, not goods*) — shipped (`requiresAnimate` teleport, pack rides, hitch severs, *freight still does not teleport*) and the doc had the what without the mail-fast/freight-slow why; cut to a pointer after diffing. `### For vehicles: don't write an exclusion — site terminals where wheels can't go` — **STAYS** — a cart-access terminal is a world-decidable future event, not a shipped mechanism; nothing in `packages/content/tpa` sites terminals by `wheelPassable`.
- logistics · freight-slate · `## Economy and lore` → *transport cost is a spread* · *both a guild and a corpo* — **STAYS** — arbitrage is a consequence, not a mechanism, and the teamsters' guild vs freight corpo is in the slate's own `Left` (no guild, no freight corpo row exists).

### logistics · `docs/slates/builds/logistics-slate.md`

- logistics · logistics-slate · `# Part 3` → `## The cost surface, and why every rung survives` · `## ⚠ The one guard that keeps this from reading as slop` — **DUPLICATE → `logistics.md § The lane`** (*Why an incumbent, and why no tech ladder*): the doc already carries the argument in full (capacity and reach move in opposite directions; no rung dominates or goes extinct; the railroad does not go to your door; every anachronism must be economically motivated), so the prose was cut to pointers; the seven-row surface table, the *magic is a point on the surface* line and the stratification payoff were kept (the table is the design the doc compacts, not a restatement). `## The second axis is your economic ladder` — **STAYS** — rate discrimination as the antitrust arc's arrival argues for the UNBUILT arc (the rate card ships and a superseded card is kept as its evidence, but no route has two prices for two shippers and nothing reads one).
- logistics · logistics-slate · `# Part 4` → `## What the colony games teach` — **STAYS** — the operator rung it argues for (*you configure lines; you never drive*) has no player verb: `ServiceRoute` is an authored commons row, and `CarrierBusiness` positions are filled by brains; the shipped driver rung is documented as mechanism in `logistics.md § The Journey`.
- logistics · logistics-slate · `# Part 7` → `## They go together for a reason, not by coincidence` (*the checkpoint is the instrument*) · `## ⭐⭐ Freight is the denominator` — **STAYS** — no checkpoint/customs object exists (`logistics.md § What is deliberately not here`: *blocked, not deferred*), and the realm-wide goods denominator is exactly what `logistics.md` says shipping without customs forgoes (*private books do not aggregate*). `## ⚠ Two doctrine constraints, from measurement.md` — **DUPLICATE → `measurement.md` Part 1 (l.99, the only-rater rule) + Part 6 (never a gauge) + `press.md § the state aggregates, never reports`** — the section says so itself; cut to a pointer that keeps the one concrete application (an index is a basket, therefore layer 2).
- logistics · logistics-slate · `# Appendix` → *Information is a complete graph. Goods are a star* + the closing paragraph — **DUPLICATE → `settlement-model.md § 8`** — the blockquote and its gloss are there verbatim; replaced with a one-line pointer keeping the closing sentence.

### ranching · `docs/slates/builds/ranching-slate.md`

Code check: `packages/content/trade-ranching/` ships `livestock.yaml`/`ox.yaml`/`farm-dog.yaml`, `HerdRegistry` (a registrar Idea — no `Herd` Stuff class), `Herdbook`, the taps, `handle`, `breed` (writes SERVED only); no class declares `grazingDemandPerGameDay`, nothing feeds a head, no genome, no resistance term; `stockmanship` is not among the 31 shipped `Discipline` rows of the platform pack (the trade's own `idea/Discipline/` carries the ranching one).

- ranching · ranching-slate · the first paragraph of the old status block (*ranching is the economic half of owned animals*) — **DUPLICATE → `ranching.md § The individual is the base case (D19)` + `§ Three ROLES`** — already removed from the slate by the one-status-block tidy (commit 37b0ee793, `status-blocks.md`); its shipped half is the doc's three-roles framing and its *managed as herds, not befriended as individuals* clause is contradicted by D19. Nothing to do.
- ranching · ranching-slate · `## The family placement [DECIDED]` — **STAYS** for the Grange/Wardens placement and the production-family convention set (guilds are `guild-slate`'s and unbuilt; `husbandry.md` l.17 links the *five shared conventions* anchor as governing, so the framing must stay where it is linked); the closing *one shared substrate under two distinct experiences* paragraph is **DUPLICATE → `pets.md § The shape of it` + `ranching.md § Three ROLES`** (realised: `KeptAnimal` rung, kernel `Handling`, verbs on capabilities) and was cut to a pointer.
- ranching · ranching-slate · `### 5. One care model, three outputs` — **STAYS** — the unified care read it argues for is not one shipped surface (pets: bond = regard × handling + a feeding ladder; livestock: `flesh` with no feed loop; plants: `GrowingMixin`), and the shared *resistance* column is `disease-slate`'s unbuilt coupling.
- ranching · ranching-slate · `## Pedagogy` → intro + the six-discipline table — **STAYS** — four of six disciplines have no mechanism (animal nutrition, population dynamics, farm economics, epidemiology) and the two that do have no grazer; the lens-1 case belongs with the feed-loop requirements, and `ranching.md` has no pedagogy section to be a duplicate of.
- ranching · ranching-slate · `## Scope guardrails` — **STAYS** — the four rules were honoured by the build (no `Herd` class, one KIND row, no new categories, yield as a transform) but the section's live work is the follow-on's (*build the genome once* — no genome exists), and rules that govern an unbuilt breeding wave are the slate's to carry.

### magic · `docs/slates/builds/capability-magic-slate.md`

Code check: no derived physical capacity, no per-part muscle-mass baseline, no dynamometer (`vitals.md` l.376 still defers the attribute readings; the only derived-capacity read is `LoadBearing.getCarryCapacity`); `DisciplineChannel` ships `skill | knowledge | conditioning` (`platform/idea/Discipline.ts:40`) but no conditioning Discipline moves a body baseline; magic-side capacity shipped as `Species.facultyProfile` bands (`magic.md § The anatomical faculty`), not a measurable coupling; there is no affinity.

- magic · capability-magic-slate · `## Principle` — **STAYS (contradicted)** — Principle 3 (*the same four axes run down both sides*) is half-contradicted by the shipped faculty bands and the retired affinity (already flagged under the ledger's *Uncertain*); Principles 1–2 are the frame of the UNBUILT Part I; Principle 4 is one line already owned by `arcane-science.md`. `design-philosophy.md` takes only the fidelity axis, so there is no MOVE target; kept whole with the contradiction beside it.
- magic · capability-magic-slate · Part I `### Stats are derived and dynamic, not stored` (opening paragraph) + *Scaling is horizontal* under `### Advancement` — **STAYS** — the thesis of the unbuilt physical-capability half (no stored or derived STR/DEX, no conditioning channel wired to a baseline); the shipped analogue (derive-on-read competence, `measurement.md` A3) is documented as mechanism and does not need this case restated.

### chat · `docs/slates/tails/chat-slate.md` / `docs/slates/tails/comms-slate.md`

- chat · chat-slate · (no Doctrine entries — the ledger records none; its theses went with their shipped sections). Nothing to process.
- chat · comms-slate · `## Implant family` → *"Thoughts willed into existence → attribution is the trust boundary"* — **DUPLICATE → `comms.md § Two transports` (*gated by attribution only; no sensory gate*) + `§ Deferred` (*Implant security*)** — the thesis half is in the doc nearly verbatim (attribution is the implant trust boundary; spoofing is the high-end threat; the baseline is hardened by design), and the backlog half (spoofing gameplay, the hardened-baseline wave) is in the slate's `Left`; the paragraph was cut to a pointer, the *Language still applies* paragraph beneath it kept.

### encumbrance · `docs/slates/tails/encumbrance-slate.md`

- encumbrance · encumbrance-slate · `## What is *not* special: bearers` — **GRADUATED → `encumbrance.md § The gauge`** (*Why there is no `PorterMixin`*) — the scope boundary SHIPPED exactly as argued (`LoadBearingMixin` composes on `Creature`; no `PorterMixin` anywhere under `packages/server/src/mud` or `packages/content`; the ox is a `Hauler` on the draft term, not a bearer kind) and the doc stated the composition rule without the why (any Creature is the bearer; refusing the hill is a brain; the handoff is two existing primitives); inserted as a 10-line paragraph, the slate section cut to a pointer after diffing.

### senses · `docs/slates/tails/senses-slate.md`

- senses · senses-slate · `### What it's like to be a bat (the worked example)` closing paragraph + `### Sensorium-relative stealth` → *"The chain … Body-type determines the experienced world."* — **STAYS** — both examples the thesis is delivered through are UNBUILT and `senses.md § What's NOT in this build` says so by name (*alien sense channels (`echolocation`…) — Wave 3; body plans declaring alien ports don't yet unlock anything*; *sensorium-relative stealth — Wave 3*; the per-species hearing/tactile profiles the weighting needs are deferred too); the shipped half of the chain (organs → `PerceptionApi.sensorium` → the strip) is documented as mechanism. When the alien channels ship, the closing paragraph (*the gestalt composes from your channels, weighted by your profile … Nagel's bat, delivered; text can do this better than graphics*) is the `senses.md § Why` paragraph, verbatim.

## Handoff

One MOVE. Coordinator applies; the slate section stays in place until the
insert lands (cut-after-diff), then becomes a one-line pointer.

### `docs/settlement-model.md` ← freight-slate `## Why the industry exists at all`

Suggested placement: a new `## Absorbed from freight-slate — Why the
industry exists at all` immediately after § 8 *Connective tissue* (before
§ 9), or as a trailing sub-section of § 8. Verbatim text:

### Why the industry exists at all

**Transport exists because production and consumption happen in
different places.** So the industry's size is a direct function of how
much **spatial specialization** the production builds create. If
everything is made where it is used, there is no freight.

Which makes the payoff one of the great pedagogical objects:

> ⭐ **von Thünen's rings.** Land use organizes around a market by the
> ratio of **transport cost to land rent** — perishable, heavy, bulky
> goods locate near the market; durable, light, valuable goods locate
> far.

That is 1826 economics, and a world with honest geography and honest
transport cost will **generate** it rather than teach it. The closed
land-use vocabulary on `ParcelRecord` is what it expresses itself
through. **Nobody has to author the rings.**


⚠ Also for the coordinator (not a handoff, a flag): the freight slate's
**wall-clock invariant** (*no economic entitlement may depend on the rate
at which a member's commands are processed*; *what the polity cannot
measure the kernel must foreclose*) is a natural `measurement.md` Tier-A
row, but it is recorded here as STAYS (contradicted) because
`logistics.md § The cost surface is OPT-IN` accepts wire-speed rig
movement knowingly. If option 2 (*make the rig the gate*) is ever adopted,
the row is a one-line insert and the slate sections are cut then.
