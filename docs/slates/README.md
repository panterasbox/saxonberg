# Slates — the design backlog, sorted by what is left

222 slates. Every one carries a **status block** under its title:

```
> **Status: PARTIAL** — what shipped → [subsystem.md](…)
> **Left:** the named things that remain
> **Size:** a build · a wave · a tail
```

Read the block, not the folder — and if the block is wrong, fix it
there. This index is generated from those blocks.

**Status** — `UNBUILT` (nothing shipped) · `PARTIAL` (substrate shipped,
surface remains) · `ABSORBED` (nothing left; retired and deleted).

**Size** — the unit this project actually works in:

| size | means | where it lives |
|---|---|---|
| **a build** | its own cycle: requirements → plan → build → MR | `builds/` |
| **a wave** | rides another build | `tails/` |
| **a tail** | small, opportunistic | `tails/` |

⚠ The folder is **derived from the size**, not from history. It used to
encode a judgment nobody re-made at sweep time, so `builds/` filled with
shipped work and `tails/` with build-sized remainders. A `deferred-rpg/`
folder is gone entirely — combat, magic, party, concealment and
materials-response all shipped, which made the name actively misleading.

---

## ⭐ Greenfield — nothing shipped yet (52)

Pick from here for a clean cycle with no existing substrate to respect.

| slate | left to build |
|---|---|
| [agency](./builds/agency-slate.md) | the agency grant (UseGrant-shaped · scoped · revocable) · the principal/agent split in the execution context · the closed capability-kind vocabulary … |
| [alignment](./builds/alignment-slate.md) | the vertical derivation off the chronicle (deed → demigod affinity; domain authored, direction measured) · the horizontal off the conviction record … |
| [alignment-religion](./builds/alignment-religion-slate.md) | nothing here — design from builds/alignment-slate.md (the two asymmetric axes, pantheon-as-legend, the mirror, `Faction`) |
| [altar](./builds/altar-slate.md) | `AltarMixin` · `swear` / `offer` / `consecrate` / `dedicate` · accreted weight as renown-of-the-object · the patron taxonomy + taint · the prophet's wilderness altar … |
| [amendment-library](./builds/amendment-library-slate.md) | the module registry + an adoption path over Art. X · the presets (distros) … |
| [attestation](./builds/attestation-slate.md) | the `attestation_events` collection · the closed assertion vocabulary (`approves`/`objects`/`notes`) · the go-live predicate on the CMS save/publish split … |
| [authored-vs-procedural](./builds/authored-vs-procedural-slate.md) | the design pass itself · a `forage`/`gather` verb (none exists) · *cultivated* as a category · a census gate tying a species row to a way to occur … |
| [authoring-intelligence](./builds/authoring-intelligence-slate.md) | the platform-semantic model (template-path completion, reference validation, mixin-composition rules, lease scope) · the LSP server · the VS Code extension … |
| [bathroom](./builds/bathroom-slate.md) | the washing/cleanliness state · the mirror self-recognition read · the closed restroom archetype set · the bathhouse venue · water-as-utility metering … |
| [blood](./builds/blood-slate.md) | the genotype/phenotype endowment · the compatibility cost curve · the donation loop + the bag · screening · the trait payoff … |
| [branch-policy](./builds/branch-policy-slate.md) | the `policy` kind + the `writers` allowlist · the longest-prefix resolve at `DocumentApi.save` · nearest-wins + self-amendment … |
| [call-security-pass](./builds/call-security-pass-slate.md) | the `@Audited` permit-and-watch rail · re-gating the ~35 ungated-and-sealed mutators · a caller-template + caller-function trust primitive … |
| [campus-grounds](./builds/campus-grounds-slate.md) | the labs · the archive + literature-substitutes-for- fieldwork · the three teaching field sites · the combat facilities … |
| [client-audio](./builds/client-audio-slate.md) | the client audio player (ambient emission → playback) · the Spotify embed tier · the zorkmid priority queue · the bar jukebox object … |
| [college](./builds/college-slate.md) | the course catalogue + reader in the study.com taxonomy … |
| [deduction](./builds/deduction-slate.md) | the thin generic quest spine (milestones · branches · completion) · the casebook word-bank · the party-scoped board · `analyze`-derived findings … |
| [demo](./builds/demo-slate.md) | the mock issuer adapter · the aged demo world · the threshold-ceremony beats · aid-post content · the fountain acoustic prop · the mobile-floor check … |
| [discovery](./builds/discovery-slate.md) | the forage verb + the patch Stuff · biome-authored tables with derived, depleting stock · the NetHack consumable distribution … |
| [education-integration](./builds/education-integration-slate.md) | earn-by-learning (the vocational lab as a crafting venue) · the student → TA → instructor ladder · the corpo sponsor funding a cohort against outcomes … |
| [enforcement](./builds/enforcement-slate.md) | the enforcement-mode vocabulary (wall · camera · witness · norm) as a committee-picked field · the evidence firewall … |
| [eternal-university-narrative](./builds/eternal-university-narrative-slate.md) | the whole arc — the three-tier serial crime, Dunny and Wren, the killer + the panic · the census mechanic (roll · enumerator · count → conviction-voting) … |
| [faith](./builds/faith-slate.md) | the deed-tag vocabulary + the four tags Part 1 needs (`aid.treat`, `aid.attend-dying`, `harm.nonconsented`, `ritual.attend`, honouring `since`) … |
| [fishing](./builds/fishing-slate.md) | the catch-distribution field · the landing contest · the fish and aquatic-harvest roster · the method ladder (rod · trap · net · spear) · the three water regimes … |
| [flowers](./builds/flowers-slate.md) | the act record (who gave what, to whom, publicly) · the wiki floriography with NO shipped meanings table … |
| [forestry](./builds/forestry-slate.md) | the forestry trade pack · felling + conversion verbs · seasoning · the stand-as-record · the silviculture Discipline · estovers + forest law … |
| [grid](./builds/grid-slate.md) | the service declaration on `ParcelRecord` (default connected, author disconnection) · connection-not-consumption metering … |
| [guild](./builds/guild-slate.md) | the `Guild` Idea + charter schema · the `guild:` GroupProvider + ranks · focus-tagged `TranscriptEntry` + charter-weighted `Competence` · contract claim gates … |
| [hunting](./builds/hunting-slate.md) | the wild population as a record materialized on encounter · `track` + the method ladder · *ferae naturae* + game law + close seasons · poaching enforcement … |
| [implements](./builds/implements-slate.md) | the implement class itself · choosing what it modifies (magnitude / cost / band-reach) · BUC on the effect axis · the stacking rule, before content exists … |
| [instrumentation](./builds/instrumentation-slate.md) | the `analyze`/`measure` channel → capability + competence table · the instrument-declared dial (so a pack contributes a subcommand) · the readout ladder … |
| [insurance](./builds/insurance-slate.md) | the policy-as-contract + reserve ratio · cargo underwriting · the mutual · the credit vocation · the ratings agency · the accountant · the notary/scrivener … |
| [lineage](./builds/lineage-slate.md) | person + household records · a `kind: 'gallery'` field + row payload · the gallery UI (grid/detail/reroll/lock) · endowed appearance that actually renders … |
| [llm-content](./builds/llm-content-slate.md) | the director agent + its locality prompt · the forced-cast command-bus seam · the ambient narrator · script emission · sponsorship funding … |
| [map](./builds/map-slate.md) | the 2D per-floor grid + the player minimap · the 2D node-graph · the 3D procedural box render · the draft-template and live-Stuff adapters … |
| [mind](./builds/mind-slate.md) | the equanimity Reserve + the stress equilibrium (the deferred `traits-stress` build named in trait.md) · the dials that configure "yourself" · situational conditions … |
| [mirror](./builds/mirror-slate.md) | the inbound assertion channel · the density threshold · the never-see-the-raw-feed privacy invariant · sensor-silence as neutral · calibration/trust tiers … |
| [notification](./builds/notification-slate.md) | the subject-keyed event · the durable subscription · derive-on-read delivery · coalescing + digest · the both-ends spoiler gate … |
| [odometer](./builds/odometer-slate.md) | the counter roster (editorial, chosen against observed play) · the subject-scoped derive over chronicle/participation/advancement · milestones … |
| [pharma](./builds/pharma-slate.md) | the actives/pharmacopoeia content · extraction as a process · glass vessels · the assay instrument · the apothecary + assayer vocations · the illicit branch … |
| [presence-hollowing](./builds/presence-hollowing-slate.md) | presence-vs-hollow as a physical state on an agent · who perceives it (ESP · the attuned reader dial · sacred instruments) · binary or degree … |
| [prison](./builds/prison-slate.md) | `PrisonMixin` (a locality you cannot leave) · the three enforcement tiers in content · the federal facility on its reserved Saxonberg site · terms and the appeal path |
| [quest-modeling](./builds/quest-modeling-slate.md) | the template primitive · the beat + condition-detection seam · the choice function (utility, not a tree) · the genre library … |
| [record-integrity](./builds/record-integrity-slate.md) | event-source `positions` → `position_events` · `prevHash` chaining with canonical serialization · the Merkle checkpoint · anchoring via `GitApi` to third-party hosts … |
| [rendering](./builds/rendering-slate.md) | the knacker · the tanner · the chandler · `tallow` / `soap` / `candle` · the carcass → named-materials seam in ranching · the one-pack-or-three cut |
| [resilience](./builds/resilience-slate.md) | Tier 1 code-trust auditing (eval payloads, source-tree writes) · the Api tier's default-open · per-call time budgets · input reaching dangerous constructs … |
| [room-condition (pack)](./builds/room-condition-design-pack.md) | `SoilableMixin` · the room debris field · `sweep` / `wipe` / `tidy` / `dispose` · the `restQuality` aggregation · the pest threshold … |
| [sanitation](./builds/sanitation-slate.md) | `collect` + the impound yard · the abandonment rule and the two legal regimes a locality picks · the salvage yard (assay, the three exits, the lossy loop) … |
| [saxonberg-city](./builds/saxonberg-city-slate.md) | the Locality + parcel spine · the residential district and its launch stock · the PM's Residence (office-keyed tenure) · the three chamber halls + the Central Bank … |
| [warranty](./builds/warranty-slate.md) | the representation/assertion primitive · post-delivery clause verification on contract.md · the remedy ladder (rescission … |
| [wizard-axis-cleanup](./builds/wizard-axis-cleanup-slate.md) | W0 `lint:wizard-axis` allowlist · W1 the four lease/provision `isWizard` bypasses + the `execScript` verdict … |
| [wizard-bar](./builds/wizard-bar-slate.md) | ⭐ the conspicuous record of wizard reads/impersonations (the one non-retrofittable piece) · the safe-harbour standard text · admit (exam + archwizard flip) … |
| [wizard-duty](./builds/wizard-duty-slate.md) | re-gating those four off the code-trust axis · break-glass declared-purpose logging for reads and impersonation · `su` as an agency consumer … |

## ⭐ Continuations — substrate shipped, a build's worth remains (78)

Pick from here to deepen something that already works. Cheaper to start
(the ground is proven) and the slate says exactly where the edge is.

| slate | left to build |
|---|---|
| [acquisition](./builds/acquisition-slate.md) | forums leaving the default loadout · the `dorm-key` record + the `presentsKey` wallet read · the payment credential required at hire · the conferral certificate … |
| [advancement](./builds/advancement-slate.md) | the loadout (capacity-not-decay + warm-up) · guilds (venue, mentors, credential, membership-as-affordance) · the Reserve-shaped stakes engine · declared focus … |
| [affiliation](./builds/affiliation-slate.md) | House as a provider plus its char-gen touch (the near-term axis) · Guild as the class system · Corp as the competition overlay — the last two deferred game design |
| [antecedents](./builds/antecedents-slate.md) | the `background:` effort→prior function (kind × years × at) · the zero-write crowd prior · authored acquaintance (Gap 1) … |
| [auction](./builds/auction-slate.md) | the `auction` + `bid` verbs · the lot-as-contract mapping · silent (sealed) mode first, then the live auctioneer `SustainedEngagement` with reset-on-bid … |
| [balance](./builds/balance-slate.md) | the jurisdiction stamp on the 4 unstamped ledgers (#0a-0c) · the cross-jurisdiction enumeration · the void-at-write validity predicate · the `bound` instrument … |
| [capability-magic](./builds/capability-magic-slate.md) | the `Transform` primitive's Api (polymorph is its own build) · multi-cell spell composition · wards as a mitigator layer · the frontier nouns Storm / Spirit / Time … |
| [cast-archetype](./builds/cast-archetype-slate.md) | the archetype rows themselves (closed `role` + `temperament` kinds, open entries) · the lens-vs-seed dual compilation · the `requires` config gate + its lint … |
| [cms](./builds/cms-slate.md) | lease-scoped trees + `domain_history` versioning · the draft/changeset overlay + atomic publish · the law==code review gate … |
| [cms-connectors](./builds/cms-connectors-slate.md) | scoped personal access tokens (content-vs-source scope) · the MCP server (`tree`/`read`/`write`/`diagnostics`/`run`) · WebDAV over `source` + `document` … |
| [combat](./builds/combat-slate.md) | pursuit / the chase · rout & rally retreat · the morale + de-escalation suite · the `guards` intervention brain · the client `CombatCard` · NPC-vs-NPC crews … |
| [combat-experience](./builds/combat-experience-slate.md) | T5 composure/luck (`traits-stress`; `g(composure)` is inert) · T7/T8 loadout-as-chemistry · T11 aftermath · T12 de-escalation · T13 morale & surrender … |
| [content-packs](./builds/content-packs-slate.md) | the unbuilt trades (butchery · milling · forestry · fishing · medicine · sanitation · funerary · repair · papermaking · insurance) · localities-as-compositions … |
| [cooking](./builds/cooking-slate.md) | the tending wave (durative cook · doneness · braise) · cold storage/icebox · compost · preservation + the victualler · the baker pack |
| [cooperative](./builds/cooperative-slate.md) | the capital faucet / stake ledger · Twitch identity binding · the three chambers + the ballot · delegation guardrails · the in-world reserve + the budget process … |
| [corpos](./builds/corpos-slate.md) | the multipolar approval vector · competition + rival-tanking · sponsorship · approval→access gates · player-founded corpos · portfolios beyond booze |
| [cosmetics](./builds/cosmetics-slate.md) | the appearance-mark carrier on a body (the `Looks` cell) · the personal-services vocation + graded cuts · tattoos · the dye-plant crop rows |
| [crafting](./builds/crafting-slate.md) | skill-as-control (the declared next crafting wave) · defects & failure as diegetic events … |
| [credit](./builds/credit-slate.md) | splitting `reserve mint` into issuance + appropriation · naming the perpetual · chartering the `treasurer` seat and retiring the Governor … |
| [currency](./builds/currency-slate.md) | a second issuer + who may authorize a mint · opt-in acceptance lists / corpo scrip · the peg as a redeemable standing offer · wages-in-scrip consent |
| [daves-bar](./builds/daves-bar-slate.md) | the succession arc · tabs + customer records (regular / 86'd) · corpo faction-approval standing · the Scene composer's crowd aggregation for a full room … |
| [delivery](./builds/delivery-slate.md) | providers + coverage + metering (power, aether) · the aether-line ↔ comms unification · post/mail to an address · the broadcast/field carry |
| [disease](./builds/disease-slate.md) | `ContagionSpec` (routes · host range · reservoir) — `Condition.contagion` is still `null` with no consumer · the husbandry-is-immunity coupling · quarantine … |
| [disease (pack)](./builds/disease-design-pack.md) | `ContagionSpec` itself · the two unifications (one burden engine · one hygiene read) · the room-condition half of immunity, which is also unbuilt … |
| [economy](./builds/economy-slate.md) | faucet/sink + inflation balance · the bazaar · market aggregation · the currency-reset event … |
| [eternal-university](./builds/eternal-university-slate.md) | the arrival gate · the Quad + the walkway spine · Student Services (registrar + housing office) · the Health Center clinic · the Campus Store · the academic hall … |
| [fire-combustion](./builds/fire-combustion-slate.md) | the fire service (§ below) — the brigade, prevention, and fire insurance · arson-as-crime · map-scale wildfire · burning-DoT as a combat weapon … |
| [food-safety](./builds/food-safety-slate.md) | molds (Part 10) — the second population's visible surface |
| [freight](./builds/freight-slate.md) | the barricade · the tollgate + turnpike trust · warehousing as a business · the wainwright · rail + timetables · navigation as a discipline · customs and tariffs |
| [fridge (pack)](./builds/fridge-design-pack.md) | the cold-container substrate (`CoolboxMixin` + atmosphere on `Container`) · the icebox … |
| [gazette](./builds/gazette-slate.md) | the docket — unedited, chronological, complete · the events-not-significance rule enforced structurally · locality-scoped gazettes as shipped content … |
| [git-workflow](./builds/git-workflow-slate.md) | the content/document → git bridge (a Mongo→file export) · finer-than-branch review · per-user `/home` submodules |
| [health-vertical](./builds/health-vertical-slate.md) | the diagnosis surface (record and be scored on a hypothesis) · a `resolution.by` dispatcher · medicine materials + the apothecary · outbreak and contagion content … |
| [help](./builds/help-slate.md) | Wave 2 — taxonomy/unit and mechanics projectors, co-located `help:` prose, the standalone `help` Document collection, the Docs search group, `{{help:…}}` transclusion, … |
| [identification](./builds/identification-slate.md) | the instrument seam (`analyze X with Y`) · partial identification (`identificationLevel`) · the experience/social ID verbs (`taste`, `learn from`) … |
| [inquiry](./builds/inquiry-slate.md) | the `Law` catalog Idea · the `predict` lab-notebook loop · knowledge banking of confirmed laws · the publish + replicate library … |
| [land-compute-and-license](./builds/land-compute-and-license.md) | compute metering and the entitlement function (quality vs demand weights) · the per-citizen or per-parcel compute floor … |
| [legal-code](./builds/legal-code-slate.md) | the append-only Roll + the derived Code · the instrument taxonomy + the closed clause-`kind` vocabulary · prose⊗clause authoring tooling and its lint · sunsets … |
| [livelihood](./builds/livelihood-slate.md) | §4's macro (the author budget-account model + the Circulation Reserve) · §8's public-works floor + match · piece-rate and share-of-flow comp bases · entity forms … |
| [logistics](./builds/logistics-slate.md) | piracy · live cargo and drovers (the steer walks, the carcass rides) · infrastructure politics — tollgate, turnpike trust, barricade, banditry, congestion, road wear … |
| [lounge](./builds/lounge-slate.md) | the pizza-as-consensus toy · the TV/remote standing signal + the derived channel lineup · the jukebox · the social minigames · emergent-personality Dave |
| [magic-items](./builds/magic-items-slate.md) | the item-by-item catalog walk, shipped as CONTENT packs — and ⚠ the cut is undecided (horizontal "twenty wands" vs a vertical "everything one shop stocks") … |
| [mana-economy](./builds/mana-economy-slate.md) | the SOURCE — sited mana nodes on the terminus-condition × access-mode grid (a `ManaMain` just refills today) · the CHARGER as a trade … |
| [mana-economy (pack)](./builds/mana-economy-design-pack.md) | mana deposits + prospecting/refining · magic water as a traded bulk good · the piped-mana utility tier · the Confluence in Terminus canon · the three vocations |
| [medic-judgment](./builds/medic-judgment-slate.md) | stop auto-selecting (player picks target + modality) · cues without names on `assess`/`analyze` · triage under the deterioration clocks … |
| [metal-chain](./builds/metal-chain-slate.md) | Stage B, below the water table — shaft/hoist/pump · the drainage commons + the hoist toll · sulfides and roasting · collapse, entrapment, rescue … |
| [mining](./builds/mining-slate.md) | everything below the water table — shaft/hoist/pump · the drainage commons + hoist toll · sulfides and roasting · collapse entrapment + the rescue clock … |
| [money-integrity](./builds/money-integrity-slate.md) | pass 1 the census over surfaces A–E (create · mutate · persist/restore · sandbox cash crossing · destroy) · pass 2 the gates … |
| [mortal-vessel](./builds/mortal-vessel-slate.md) | Thesis 4, moderation as diegetic capability-state · Thesis 5, the prison ↔ Hades unification · the law-enforcement half of Thesis 3 |
| [mortality](./builds/mortality-slate.md) | the re-embodiment service as content (the temple vs clinic vendors, employer coverage, the price of walking out) … |
| [multilocation](./builds/multilocation-slate.md) | the procedural-spatial consumers (the dungeon, the desert) · the summoned-graph host · the lounge's preference-vector matchmaking math |
| [narration](./builds/narration-slate.md) | the authored narration fragment on `ActSignature` · the platform-owned band-blind frame at `self.*` · the acts-never-axes readable record … |
| [npc-behavior](./builds/npc-behavior-slate.md) | the upper rungs of the ladder — intent-match, the code-tier `scripted-behavior` brain, the LLM brain · the `addressed` and `given` triggers … |
| [onboarding](./builds/onboarding-slate.md) | the `onboarded` flag + lounge-exit routing · Dr. Limen (seat, model-backed brain, the reply contract) · the onboarding-progress flags and their subscription … |
| [persistence-architecture](./builds/persistence-architecture-slate.md) | Wave 3 — un-Stuff `PersistentHydrator`, the marshallers and `obj/hooks/` (`DomainHook` + `hooks.yaml`) into path-resolved, lazy, re-resolved modules on the shipped bra … |
| [pets](./builds/pets-slate.md) | the taming encounter · the bond + four-needs care loop · the accept/refuse hook · the off-screen resolution + digest · home range … |
| [physiology](./builds/physiology-slate.md) | the capacity vocabulary + the `governs` rename (waves 2–3 block the rest) · the organ roster (brain · spine · liver) … |
| [policing](./builds/policing-slate.md) | the three enforcement tiers · the closed policy vocabulary + resolve-on-read enforcement · arrest and custody · the constable kit bundle as a budget line … |
| [power-utility](./builds/power-utility-slate.md) | the supply reference on `Energized` fixtures · outage propagation + directional network failure over exit edges · gas as the second conduit commodity … |
| [press](./builds/press-slate.md) | the newspaper as an organization + its newsroom roster (publisher → editor-in-chief → editor → reporter) · subscription / push distribution · bylines … |
| [property](./builds/property-slate.md) | the compute-allowance scarcity (the field is inert) · dormancy-as-reclamation · un-fusing author from owner · real-estate above one lot (resale, leases, valuation) |
| [provenance](./builds/provenance-slate.md) | the dependency DAG (infrastructure earning from what rides it) · the contributor-set / team split behind `authorOf`'s derivation seam … |
| [psychology](./builds/psychology-slate.md) | the scoped disclosure grant · the therapist's file object · the psychology vocation + its Discipline · privilege and the conflict class … |
| [ranching](./builds/ranching-slate.md) | breeding (gestation · birth · heredity; nothing writes `bornAt`) · bees — the hive, pollination, forage range, swarming (AC 14 unmet) … |
| [ranged](./builds/ranged-slate.md) | W2 cover + armor · W3 bows/crossbows/less-lethal/acoustics · W4 guns (the field model, reliability, registration) · the range, armory and accessory content |
| [rejection](./builds/rejection-slate.md) | everything below the water table — shaft, hoist, pump · the drainage commons + the hoist toll and district · sulfides and roasting … |
| [reputation](./builds/reputation-slate.md) | susceptibility · the NPC consumers · the governance-influence coupling · the substance economy's brand-trust · the anonymity/disguise counterweight … |
| [retail](./builds/retail-slate.md) | S2 the Circulation Reserve (the welfare-floor buy) · S3 producer + real cost/supply pricing · S4 player-owned storefronts and the market arena |
| [sampling-and-labs](./builds/sampling-and-labs-slate.md) | the sample object + its provenance field · bench instruments and the campus lab as a place · the hand-tool middle tier (lens, streak plate, hardness kit) … |
| [spawn-distribution](./builds/spawn-distribution-slate.md) | the creature half — a procgen-NPC generator over the NameBank / species dossier / `PersonaMixin` · create-monster · the respawn clock + faucet economics … |
| [species](./builds/species-slate.md) | every actual difference — the ectotherm · scent-based recognition · cannot-metabolise-a-staple · equipment incompatibility · no speech organs (aether only) … |
| [standing-mint](./builds/standing-mint-slate.md) | published weights as readable content · the distributional impact statement · rater agencies as a player institution · disclosure regulation as passable law … |
| [stewardship](./builds/stewardship-slate.md) | premises + utilities (the lease's money leg) · the allowance meter · the cascade + the zoning authority · the Stewardship Discipline |
| [supply (pack)](./builds/supply-design-pack.md) | the unified source model over tap/well/standpipe/rain · the rivalry axis (the household commons) · the power half — substation, socket, and one shared `supplyReport` read |
| [textiles](./builds/textiles-slate.md) | leatherwork + tanning (blocked on a hide faucet) · wool and its left edge — felting, fulling, knitting (blocked on ranching) · patterned weaving · piece bleaching … |
| [towns](./builds/towns-slate.md) | Rejection Act I + the inert `stocks:` table · Heart's Delight (gated on winter) · Hinkley facades/neighbours/the Death Man + `knock` · Rejection's support half … |
| [venue-and-supply](./builds/venue-and-supply-slate.md) | V6 — `needs` past the closed six (ground/water/sun) and producer `yields` · V5 `lint:supply` · V4 the five support archetypes · V2 the uniform `kind: office` sweep … |
| [zoning](./builds/zoning-slate.md) | the emission/nuisance model over `signalAt` · the cap at the boundary · the LULU host problem · nonconforming use · derived settlement type … |

## Waves — rides another build (57)

Not a cycle of its own. Pull one in when its host build is in flight.

| slate | left to build |
|---|---|
| [affordance-suggestion](./tails/affordance-suggestion-slate.md) | the generative `narrow()` direction (no consumer yet) · the relational axis still only says no · a structured reason on a disabled row · server-side command history … |
| [aluminium-can](./tails/aluminium-can-slate.md) | the granular bulk phase (`requiredClosureFor`, so a sack is honestly open) · the deposit as law + a contract leg · the `fill` recipe · `remelt` + `Recipe.energyKWh` … |
| [argument-map](./tails/argument-map-slate.md) | claim dedup / canonicalization · integrity-grade summarization · automated convergence detection · proposal version-control · the vote consumer · the plural-lens explorer |
| [augmentation](./tails/augmentation-slate.md) | the medical install/remove procedure · the char-gen augment loadout · translation, prosthetic, sensor, motor and cognitive augments · the failure and hacking modes |
| [bulkable](./tails/bulkable-slate.md) | mixing/solutions · the `sealed` gas level + the phase→closure map · `Container`+`Bulkable` · universal auto-compose · amount-aware `appearance` … |
| [chat](./tails/chat-slate.md) | the role overlay · the channel config block · mentions + the offline inbox · group-projected channels (party/guild/zone) · edit/delete · pinned + announcement mode … |
| [client](./tails/client-slate.md) | the wiki + forum search ports (both still unwired) · the notification tray (read `NotifyPolicy`/`NotifyRule` first) · output logging / clips / attestation … |
| [client-cockpit](./tails/client-cockpit-slate.md) | the `study` and `classroom` modes · the content surface (video + transcript payloads, diegetic triggers, completion events) · the live-tutor / classroom shape … |
| [client-shell](./tails/client-shell-slate.md) | search as a frame primitive (Q3) · the public read-only surface (metrics · overlays · public docs) · the declarative mode model · mode determination (Q1) … |
| [combat-tactics](./tails/combat-tactics-slate.md) | cover-as-status (ranged W2) · the `physical` conduit channel for cross-room shots · the Skirmish / Kite preset · the magic-interplay questions at `MagicLogic.deliverAt` |
| [comms](./tails/comms-slate.md) | dynamic-reach shout (the voice-projection attribute) · language gating on acoustic + encoded-cognition implant · regional channels … |
| [concealment-detection](./tails/concealment-detection-slate.md) | the knowledge economy (sharing / selling / transferring found secrets, maps as currency) · `frisk` and searching a downed body … |
| [console-filtering](./tails/console-filtering-slate.md) | transcript search · sender filter · compact mode · timestamps · brief mode / `prose.verbose` · per-room verbosity memory |
| [content-pack-units](./tails/content-pack-units.md) | the media-asset unit (byte sync + receipt pairing) · the position-def unit (A19) · the contract-form unit · `requires.kinds:` · `requires.office` … |
| [deed-tags](./tails/deed-tags-slate.md) | the closed deed-tag vocabulary + its three-tier resolver (the topics pattern) · the petition-not-override path · getting `crime` out of layer 1 … |
| [development](./tails/development-slate.md) | coverage / FAR / efficiency as derived ratios · the `subdivide` ceiling correction (only productive children draw) · a consequence for over-draw (inert today) … |
| [display-manifestation](./tails/display-manifestation-slate.md) | driver policy off the closed `pairing` enum and onto `AccessApi.can` · the network / channel / guide addressing layer · multiple simultaneous sources per screen |
| [distance-perception](./tails/distance-perception-slate.md) | vista references (a `Detail` resolving a remote Stuff) · the bounded one-hop peek (`look <exit>` / `--peek`) · what buys privileged multi-hop reach, and its tiers … |
| [dorm-warren](./tails/dorm-warren-slate.md) | the bounded mixin-field editor + the dorm tier filter · the CMS-inspectable lesson rung · the roommate NPC half + its trait tracking · hand-authored custom prose … |
| [emotes](./tails/emotes-slate.md) | the moderation control plane — moderator verbs, per-scope expression levels + duration, the sanitizer implementation and shared denylist, audit logging and appeals, en … |
| [farming](./tails/farming-slate.md) | plant genetics — cultivars and fixed-vs-segregating lines (husbandry.md still says "no genetics") · the controlled-environment tier past the free greenhouse (hydroponics) |
| [fast-travel](./tails/fast-travel-slate.md) | scheduled mode + wayfinding (published schedules, route maps, hubs) · terminals that WEAR · the maintenance round the self-governing Authority now owes … |
| [field-substrate](./tails/field-substrate-slate.md) | the water table (adit boundary + oxide/sulfide, one field two systems) · foraging stock as the first DERIVED field · the seeded × derived composition seam … |
| [forums](./tails/forums-slate.md) | the ephemeral bill lifecycle · the rules-of-order procedure mode · the latent collection-watch abstraction |
| [hand-slot](./tails/hand-slot-slate.md) | picking Option A vs B (layered `:worn` / `:held` slots) · wrist slots · single-hand wearables · `SlotSpec.accepts` as an array if A … |
| [hearth-and-larder (pack)](./tails/hearth-and-larder-design-pack.md) | the indoor room-ambient bump (a hearth that warms its room, named a follow-on in thermal.md) … |
| [household (pack)](./tails/household-design-pack.md) | `ParcelApi.householdOf(extent)` — the domicile ∩ extent read · the gate made COLLECTIVE plus the leave-and-ascend-alone exit … |
| [language](./tails/language-slate.md) | the `Language` Idea + catalogue · `Character.languages` proficiency · the `decode` literacy gate · `Vocal.speechLanguage` + the speech garble render-gate … |
| [lifecycle-signals](./tails/lifecycle-signals-slate.md) | the `quiesce`/`persist`/`flush`/`close` phase vocabulary · the subsystem subscription seam · per-subscriber failure isolation + a per-phase deadline … |
| [locomotion-as-activity](./tails/locomotion-as-activity-slate.md) | the durative `TraverseActivity` promotion · the sync/async split · the duration model · the `engagedMode` storage migration … |
| [materials-response](./tails/materials-response-slate.md) | the `Recipe` craft-stamp of {material, construction, grade} · repair / scrap / reforge · the `crush` / `heat` / `corrosion` channels … |
| [mql-subscription](./tails/mql-subscription-slate.md) | the client-side subscription lifecycle in the cockpit · widget composition + cache coherence · shadow-aware projection · `mql-subscribe-update` … |
| [naming](./tails/naming-slate.md) | the rename act (notify every recognition holder · decay window · chronicle deed) · Defense A, `learnIdentity` refusing a conflicting name … |
| [npc-dialogue](./tails/npc-dialogue-slate.md) | the scripted free-text `intent-dialogue` responder (pattern/synonym tables + the `addressed`/`handleMessage` trigger + the implant `tell` entry) · the LLM front-end … |
| [pack-seams](./tails/pack-seams-slate.md) | named boundary sockets + graft points · the `fills:` manifest key · one-filler-per-socket refusal at reconcile · the provides/needs capability vocabulary … |
| [party](./tails/party-slate.md) | the party purse + payout split · the crew's durable name (renown-as-subject over a party chronicle) · the odometer layer · party morale · the client party card … |
| [patina (pack)](./tails/patina-design-pack.md) | `SeasonedMixin` (the accrual band + the use-then-care cycle) · the `takesPatina` material field · maintenance verbs accruing … |
| [preservation](./tails/preservation-slate.md) | smoking · the victualler / packing house · salt as a mined and taxed staple · the agricultural year (winter stores) · wetness → water-activity coupling … |
| [recognition](./tails/recognition-slate.md) | player-set nicknames (`name X as Y`) · memory decay · voice/scent recognition · MQL compound feature-handles · the aether id-aug ambient trigger |
| [residence-ladder (pack)](./tails/residence-ladder-design-pack.md) | room condition (dirt · debris · tidiness) as a producer · folding `Durable` wear and spoilage into `propertyCondition` · the Stewardship Discipline … |
| [scope-modality](./tails/scope-modality-slate.md) | modality as a per-verb scope axis · per-modality container permeability · transparent containers (sight-through walls) … |
| [scoped-authoring](./tails/scoped-authoring-slate.md) | ⭐ the `describe` verb (the prose rung — no such verb exists; blocked on a moderation validator) · the vetted-catalog membership validator behind `make` … |
| [script-interaction](./tails/script-interaction-slate.md) | the fail-closed guard when a controller would prompt with no `interactive` · the sweep of existing fallbacks, one commit per subsystem … |
| [search](./tails/search-slate.md) | the equipment term on `effectivePerception` (lens, loupe, ocular augment) · terrain-matched camouflage over the `Biome` chain … |
| [senses](./tails/senses-slate.md) | smell trails / temporal persistence · echolocation (the active-sense pattern) · the full ESP local-field walk … |
| [social-graph](./tails/social-graph-slate.md) | the message-restyle live wiring (needs a sync contacts fast-path) · Wave 4 recognition-state coupling — consent friending and recognition-gated bucketing |
| [species-expansion](./tails/species-expansion-slate.md) | the personhood casts (flesh golem · doppelganger · zombie · synth · mind flayer) … |
| [spoiler](./tails/spoiler-slate.md) | progress / integrity reveal conditions on percepts · server-side fact-gating in the Scene/percept projection · role-conditioned reveals … |
| [supply-chain](./tails/supply-chain-slate.md) | fungible consignment (bulk on the store counter) · a business account that can buy (`BuyController`'s payer) · rung 2, direct farmer→distiller purchase · rung 4, the firm |
| [tenancy (pack)](./tails/tenancy-design-pack.md) | room-condition attribution `(actor, target, extent)` · the check-in condition snapshot at `grantedAt` · the deposit as a contract escrow leg · the eviction act … |
| [trade-roster](./tails/trade-roster-slate.md) | the 15 unminted Disciplines (foraging · fuelcraft · electrical-work · carpentry · masonry · leatherwork · ceramics · glasswork · baking · bookkeeping · apothecary … |
| [tradition](./tails/tradition-slate.md) | the `Law` catalog · the Law/Tenet split · `Tradition` as an Idea carrying an attention order · null laws · the notebook · what lands in the Transcript … |
| [trait](./tails/trait-slate.md) | the equilibrium / expressed split · the deviation narrator · the self-view showing acts not positions · the valence-scale denominator … |
| [vitals](./tails/vitals-slate.md) | the affliction driver — disease and poison have no `inflict` path at all · medical instruments + consumable-crafting past the bandage … |
| [weather](./tails/weather-slate.md) | fog → visibility · snow depth · vector wind · moving fronts · a weather-pin write Api (it blocks the `storm` Discipline) … |
| [world-scan-perf](./tails/world-scan-perf-slate.md) | the money-path owner reads (`flowSplitsFor`, `holdersByPosition` off the Business roster) · the per-tick `maintains.holdingsUnder` extent lookup … |
| [youtube-relay](./tails/youtube-relay-slate.md) | outbound `liveChatMessages.insert` · the quota accountant + coalescing and drop policy · per-player `youtube.force-ssl` OAuth … |

## Tails — small and opportunistic (35)

| slate | left to build |
|---|---|
| [access](./tails/access-slate.md) | the structured audit sink (call-security Pillar 5 — `MudlogApi` is unwired) … |
| [affordance-verb](./tails/affordance-verb-slate.md) | source-scoped invocation (`watch::set`, sigil unsettled) and its parse wiring · the verb-provenance help listing (which object and mixin affords each verb) … |
| [api-normalization](./tails/api-normalization-slate.md) | delete `api/identity.ts` · fold `array`/`path-pattern`/ `grammar`/`proxy` · split `command` + `banking` · re-run the measurement script · read the broad-thin quadrant |
| [async-commands](./tails/async-commands-slate.md) | a line-level `--async`/`--sync` prefix so a bare typed multi-statement script detaches without the `script` verb · a per-actor async concurrency cap … |
| [auth-providers](./tails/auth-providers-slate.md) | account merge · provider-side token revocation · incremental chat scopes (`user:write:chat`) … |
| [author-typography](./tails/author-typography-slate.md) | the ~6–10 author display tokens (typewriter · handwriting · script · inscription · blackletter · poster) · the token→face map … |
| [call-security-performance](./tails/call-security-performance-slate.md) | `findDescriptor` accessor-ness caching · the static-Api apply thunk · hoisting the viewer-invariant checks out of `describeCore` … |
| [collision](./tails/collision-slate.md) | the `guards` brain (agentive third-party blocking) · room capacity as a field + validator · the `push` verb and its activity |
| [connection-origin](./tails/connection-origin-slate.md) | the developer-gated IP read · the `whois`/`locate` lookup verb · city / region resolution · a persisted last-seen country |
| [connection-quality](./tails/connection-quality-slate.md) | the three-band jitter state (fine / laggy / unstable) · the opt-in party publish as an `AFK`-style status rather than a number … |
| [credential-wallet](./tails/credential-wallet-slate.md) | deputization as a native tenant · the issuer-authorization ledger (validity derived, the record a presentation) … |
| [dgg-relay](./tails/dgg-relay-slate.md) | the dgg WebSocket transport · the anonymous read path · the developer-key credential (it rides no OAuth spine) · the two-way write path, which is the point of it |
| [dossier](./tails/dossier-slate.md) | Q2 the materialized trio (participation + influence still seed-and-fold; make `renownOf` derive) · Q3 a seeded condition's cause · Q4 dossiers for organizations … |
| [electricity](./tails/electricity-slate.md) | AC vs DC · full Kirchhoff current division · hand-chains, damp-not-pooled floors and humidity · Joule→fire · magic `Create·Lightning` · power as a grid |
| [encumbrance](./tails/encumbrance-slate.md) | per-item placement refinement (a frame pack beating the worn floor) · augment-conferred capacity · gravity/environmental margins · tissue-derived mass · numeric tuning |
| [external-chat-relay](./tails/external-chat-relay-slate.md) | YouTube outbound |
| [host-slot-activities](./tails/host-slot-activities-slate.md) | sit/lie/mount/drive as interruptible durative engagements · `SlotApi.claimPending` · the decode half of `read` as a duration |
| [incapacity](./tails/incapacity-slate.md) | impound-on-a-claim · the preserving (never improving) receiver · return and reclaim · the docket entry … |
| [kick-relay](./tails/kick-relay-slate.md) | phase-2 posting (`kick-reauth` + `chat:write` through the existing throttle/echo-suppress) · boot-time webhook-subscription reconciliation · `kick.com/video/…` URL forms |
| [libations](./tails/libations-slate.md) | metered water + power on the P&L (the supply design pack) · the ice machine and the bar's first socket · carbonation going flat · a glassware supplier |
| [message-rendering](./tails/message-rendering-slate.md) | the `<box>` tag — and first the decision whether the cockpit layout work already covers what it was for |
| [metabolism](./tails/metabolism-slate.md) | wired nutrient deficiencies (scurvy) · hangover · chronic-toxin leaching content · magic ingestion (potions) · fuller-stomach absorption · bulk-source eating … |
| [mixin](./tails/mixin-slate.md) | `Invisible` as a perception override · `Sleeping`/`Resting` (sensory cutoff + command gating) · `Writable` · `Mixable` / `Combinable` … |
| [multi-currency](./tails/multi-currency-slate.md) | a second issuer and the corpo scrip that motivates one (with its coinage) · the money-changer as a merchant · the pegged issuer's redemption window … |
| [prompt-stack](./tails/prompt-stack-slate.md) | Tier 2 kinds `numeric` / `multiChoice` / `password` · Tier 3 `paginated` + `quiz` · multi-prompt stacking visuals + dismissal UX |
| [reactions](./tails/reactions-slate.md) | the analytics event-stream tap · the emote-flood salvage · reactability beyond chat-first |
| [reference-lifetime](./tails/reference-lifetime-slate.md) | four undeclared instance-ref sites (`SandboxCrossingExit.crossing`, the `ExitableVessel` caches, `LoungeWarren._reapTimers`, the `DormWarren` maps) … |
| [residency](./tails/residency-slate.md) | the game-time reset sibling — `resets:` + `ResettableMixin`, restock vs field-revert, the presence skip |
| [sandbox](./tails/sandbox-slate.md) | chronicle presentation of wire deeds · in-circle accountability + consent · disposition symmetry · SHADOW read composition + scope-keyed unique indexes … |
| [scripting](./tails/scripting-slate.md) | the piping model over the built `Pipeline` AST node + the value→field binder · the block forks (`it`-only vs explicit params) · the `improv` seam · LLM-director authoring |
| [social-inspection](./tails/social-inspection-slate.md) | the `who --group <g>` filter · the `privacy.showSpecies` threshold (Q2) … |
| [spoilage (pack)](./tails/spoilage-design-pack.md) | the `WetMixin` saturation → `a_w` conversion · alcohol and acidity as real preservatives · staling by oxidation · dish-as-ingredient … |
| [thermal](./tails/thermal-slate.md) | sauna / steam rooms · per-region frostbite · object-to-object conduction · inter-room ventilation · the indoor room-ambient convection bump · heated vehicle cabins |
| [water (pack)](./tails/water-design-pack.md) | open question 2, does rain wet uncovered things other than soil · open question 3, the windowsill pot's indoor/sky-exposed ruling … |
| [wire-suite growth](./tails/wire-suite-growth-slate.md) | boot groups beyond the one · the compressed-clock group (farming's growth arc is its first customer) · farming's yard legs (one actor must hold the seed AND own the lot) · metal-chain's provisioning leg · the crafting cookhouse scene → `cooking.dirty` · the prose-census ratchet · a Mongo snapshot reset path · world litter — plus the TEN content findings the first green run handed over, each with its owning trade |
| [wiki](./tails/wiki-slate.md) | search integration · the level-3 source embed · the rest of the transclusion palette · open questions 5–7 |

---

## Keeping this honest

- **At `/finalize`**, update the status block of every slate the build
  touched. A slate whose `Left:` is empty is `ABSORBED` — salvage any
  open question into the subsystem doc, then delete it.
- **Deferred design never lives in a plan.** Plans are execution
  artifacts and get deleted at the sweep; anything that outlives the
  build is extracted back here first. Three sections were rescued this
  way on 2026-09-06 — farming's Stage B (133 lines), farmstead's Tier 3
  criteria, and the apartment plan's deferred seams — all of which had
  been invisible to anyone reading the backlog.
- **Duplicate ground is the standing hazard.** Known pairs covering one
  subject from two ends: disease ↔ disease (pack) · recognition ↔
  identification · authored-vs-procedural ↔ spawn-distribution ↔
  discovery · argument-map ↔ forums · supply (pack) ↔ power-utility ·
  college ↔ education-integration ↔ eternal-university-narrative.
  Merge on contact rather than letting a third appear.
