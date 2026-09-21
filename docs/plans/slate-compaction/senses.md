# Slate-compaction pass — senses batch ledger

One slate. Branch `design/slate-compaction`. Procedure:
`.claude/skills/compact-slate/SKILL.md`. Write list: `senses.md` only.
Line numbers below are the ORIGINAL file's. Originals saved under the
scratch dir `senses/orig/` for diffing. Code was verified in
`packages/server/src/mud/{lib/perception,platform/idea/modalities,platform/idea/cmd/perception,lib/description,lib/message,lib/boundary,platform/thing}`,
`packages/content/platform/content/platform/{idea/modalities,cmd/perception}`
and `packages/content/**` (the content census).

Batch-wide findings before the per-slate detail:

- **The two 2026-09-18 legibility facts hold in the tree.**
  `LookController.ts:215,386` call `getMarkupLong(actor)` with no opts;
  `Visible.ts:413` is `const filter = opts?.filter ?? sensorium` — so
  `look` and `sense` render the same channels. `grep -rl '<sense channel'
  packages/content` → **0** files; no `smell:`/`touch:`/`hearing:`/`taste:`
  detail slot anywhere under `packages/content/*/content`. Every section
  of the slate that describes the `sense` verb is therefore SUPERSEDED by
  `docs/slates/builds/legibility-slate.md § Part D` (cut `sense`; arrival
  fires `look`; untagged prose becomes vision-channel prose), not cut as
  shipped-and-working.
- **The ESP "universal organ" half did not ship.** No BodyPlan row
  declares an ESP `sensoryPort`; ESP arrives only through the Avatar's
  `AetherImplant` (`Avatar.ts:1147-1151`, `Aether.ts:126`
  `_grantsModalities`), NPCs opt in per class (`Shade.ts:124`), and
  `emotes.md § Topic and modality` states the consequence plainly:
  *"non-implant NPCs miss emotes the same way they miss DMs."* The slate's
  *sentience implies telepathy* paragraphs are kept and listed under
  Uncertain as kept-but-contradicted.
- **The three "network" claims shipped as `family: field`.** The ESP rows
  (`idea/modalities/{verbal,emotive}-esp.yaml`) carry `family: field` per
  senses.md § Hybrid ESP framing; `ModalityFamily` (`Modality.ts:43`)
  reserves `'network'` for future routed-only modalities. Superseded, not
  unbuilt.
- **Three senses.md statements the code does not support** (flagged, not
  fixed by rewrite — two got a one-line insert, one is flagged only):
  1. `§ Masking` describes `max(viewer_threshold, ambient)` — there is no
     masking gate anywhere: `ListenController.ts:35` gates on
     `Sound.DEFAULT_HEARING_THRESHOLD_DB` alone, `SmellController.ts:54-59`
     on the acuity threshold alone; `grep -rn mask lib/perception
     platform/idea/modalities` → nothing. Inserted a one-line ⚠ under
     § Masking so the slate's deep-spec masking paragraphs (kept as
     UNBUILT) do not read as duplicates.
  2. `§ File layout (physics half)` places the seven concrete modalities
     at `lib/perception/modalities/` and rows at `seeds/lib/perception/
     modalities/`; they are at `platform/idea/modalities/*.ts` and
     `packages/content/platform/content/platform/idea/modalities/*.yaml`
     (only `__tests__/test-helpers.ts` remains in the lib dir). Inserted a
     one-line note under the layout block.
  3. `§ Single-sense verbs` + `§ Perception topic vocabulary` show per-verb
     topics (`sense.survey.smell`, `sense.ambient.*`, `sense.reading.*` as
     a tree); the code fires flat `sense.survey` / `sense.reading`
     (`SmellController.ts:42`, `SenseController.ts:73`,
     `MeasureTemperatureController.ts:44`) and `topics.md` is the closed
     root vocabulary now. Flagged only — that is a topics.md rewrite, not
     a senses.md insert.

---

## docs/slates/tails/senses-slate.md — 998 → 766 · Status PARTIAL → PARTIAL

Wave 1 shipped in a **different shape** almost everywhere the slate named
a mechanism: `PerceptionChannel` became `Modality` singletons with
per-modality walks (`lib/perception/Modality.ts`,
`platform/idea/modalities/*.ts`, `api/perception.ts`); the *network*
family became `family: field` (hybrid); the gestalt verb `sense` shipped
and is now being cut by legibility-slate Part D; the ESP "universal
organ" became the Avatar-only `AetherImplant`. So the biggest class here
is SUPERSEDED, and the biggest kept class is Uncertain (kept-but-
contradicted). Nothing in `Left` on arrival was false except *scalding
burn-damage* (shipped with the thermal build — `Touch.contactBurnEnergy`,
`FeelController.ts:128`, `GetController.ts:503`; senses.md § Touch says
so) — dropped from `Left`.

### Cut (SHIPPED · DOCUMENTED)
- second status block `> **Status: Wave 1 SHIPPED 2026-06…` + the *Refinement (2026-06, pre-ship)* paragraph (13–29, 40–47; 25 lines) — history; the authoring discipline half is senses.md § Authoring discipline, the "ESP organ universalized" half is the contradicted claim the body still carries (see Uncertain). ⚠ Its middle paragraph *"Still ahead (Wave 2/3 open work below)…"* (31–39) is **KEPT verbatim** as a standalone blockquote: two of its items — *the full ESP local-field walk* and *chemesthesis as its own modality* — have no other body home, and `Left` must point at the body. (Its *vitals burn-damage on scalding contact* clause is shipped — thermal.md — but the paragraph is kept whole.)
- `The load-bearing decisions:` 1–5 (55–94, 40) — 1: `Modality` + `PerceptionApi` (senses.md § `Modality` singletons + `PerceptionApi`; the no-generic-walker decision § Propagation walks); 2: `ModalityFamily` (`Modality.ts:43`); 3: `SenseController.ts` + `Mobile.autoSenseOnArrival` (senses.md § Gestalt verb, § Auto-on-entry) — now superseded by legibility Part D; 4: `Visible.ts` `senseStripAugmenter` (senses.md § `senseStripAugmenter`); 5: `Scene.modality` stamps (`Vocal.ts`, `Aether.ts`, `Soul.ts`, `Audible.ts`) + `Sensor.ts` `filterMessage` + `Aether.ts:126` `_grantsModalities` (senses.md § Per-frame modality attribution, § Organ-gates-modality widened with augments). Replaced by an 8-line pointer paragraph naming the shape differences
- `## Principle` (135–146, 12) — restates the five decisions; same evidence. Heading removed
- `### Vision (light) — shipped exemplar` body (184–186, 3) — code: `platform/idea/modalities/VisionModality.ts`; doc: light.md § Propagation: `VisionModality.signalAt`, senses.md § Propagation walks. Pointer left
- `## ESP` → *"(DM vs chat is routing within the verbal channel…)"* (238–240, 3) — code: `ChatController.ts`, `ChannelCatalogue.ts`, `Aether.ts` all stamp `verbal-esp`; doc: comms.md § Two transports, chat.md
- `## ESP` → the *Implants — the citizen-default* bullet (245–247, 3) — code: `Avatar.ts:1147-1151` occupies the `AetherImplant` for every Avatar; doc: comms.md (*"The baseline AetherImplant is universal and always-on for players"*), augmentation.md, senses.md § Organ-gates-modality widened with augments
- `## ESP` → the *Distinct render per channel* bullet (282–283, 2) — verbal → `speech.*` frames / comms, emotive → `act.emote` rendering; doc: comms.md § Two transports, emotes.md § Topic and modality
- `## The gestalt verb` → the *Viewer-relative* output bullet (399–401, 3) — code: `Visible.ts:404-419` (filter ∩ sensorium); doc: senses.md § `senseStripAugmenter`
- `## The gestalt verb` → *"The gestalt feeds the inspection-card room focus…"* (410–412, 3) — code: the card subscription's `getMarkupLong(viewer)` with no opts; doc: senses.md § `Mml.augment` + `MarkupAugmenter` widened, card-surface.md
- `## Single-sense verbs (deliberate focus)` body (415–420, 6) — code: `SmellController.ts` / `ListenController.ts` / `FeelController.ts` / `TasteController.ts` over `SingleSenseControllerBase.ts`, views `cmd/perception/{smell,listen,feel,taste}.yaml`; doc: senses.md § Single-sense verbs, § Bare-verb upgrades. Pointer left naming the still-deferred aliases `sniff`/`lick` + `--peek` (senses.md § What's NOT in this build)
- `## The percept connection (the physics under the card)` body (426–432, 7) — code: `PerceptionApi.canPerceive` + the per-controller thresholds + `CardRegistry.resolveSubject` behind the perception gate; doc: perception.md § The three layers, card-surface.md (*"Perception is re-checked on EVERY re-resolve"*), the `measure`/`analyze` family. Pointer left
- `## Authoring surface — events vs. state` intro (438–441, 4) — doc: senses.md § Authoring discipline. Pointer left
- `### Events stay single-channel per frame` body (445–459, 15) — code: `Scene.modality`, `SensorMixin.filterMessage`; doc: senses.md § Per-frame modality attribution (*"Multi-modality events … stay authored as separate `Scene.send` calls"*). ⚠ The third paragraph's *"delivered to every sentient organ in the room"* is the contradicted universal-organ claim; it is preserved in the kept ESP paragraphs, not here. Pointer left
- `### State goes multi-sense via MML <sense> tags` body (479–498, 20) — code: `api/mml.ts:957` `Mml.stripBySense`, `Visible.ts` `senseStripAugmenter`; doc: senses.md § `<sense channel="X">` MML wrapper, § `Mml.stripBySense`, § `senseStripAugmenter`. Pointer left carrying the ⚠ that the *untagged = perceivable to anyone* rule is being reversed by legibility Part D and that **0** content rows use a `<sense>` region
- `### Detail entries are multi-sense, shared keyword` body (502–528, 27) — code: `lib/description/Detailed.ts:50-141` (slot map, `getDetail(id, sense, parent?)`, `keywords:`), `applyDetails` mixed-shape rejection; doc: senses.md § Per-sense `Detail` slot map, § `<sense channel>` wrapper (`<detail sense=>` default vision). Pointer left noting the key is `keywords:` not `aliases:` and there is no `echolocation` slot (`SenseChannel` is the closed five), and that **0** content rows populate a non-vision slot
- `## Worked scenarios` → *Hot stove* bullet (556–557, 2) — code: `FeelController.ts:128` `Touch.contactBurnEnergy`, `MeasureTemperatureController.ts`; doc: senses.md § Touch (contact modality), thermal.md. Pointer bullet left
- `## What this stresses` → *light / sound* · *biome* · *quantities* · *perception.md* · *inspection-card / message-rendering* · *messaging / `SensorMixin`* · *DetailedMixin + MarkupAugmenter* bullets (567–570, 572, 579–581, 585–597; 22) — all senses.md (§ Propagation walks, § Touch, § Per-frame modality attribution, § Per-sense `Detail` slot map, § `senseStripAugmenter`), quantities.md, perception.md, card-surface.md. One pointer line left; the *wraps any keyword the viewer has at least one sense's entry for* clause inside the DetailedMixin bullet is the superseded wrap behaviour (below)
- `## Open questions` → Q1 (610–612) — resolved: per-modality walks, `VisionModality` relocated from `LightApi` → senses.md § Propagation walks. One line left
- Q3 (616–617) — resolved: one `PerceptionApi` over `family` → senses.md § `Modality` singletons. One line left
- Q5 (621–624) — resolved: latest-only, accumulate-per-focus parked → card-surface.md § Accumulate vs. latest. One line left
- Q6 (625–627) — resolved by history (Wave 1 + the contact verbs shipped 2026-06). One line left
- Q11 (644–648) — resolved: a family, `VerbalESPModality` + `EmotiveESPModality` → senses.md § Hybrid ESP framing. One line left noting the verbal channel's language gate is still unbuilt (comms.md § Deferred)
- Q13 (657–659) — resolved: ESP not in the `SenseChannel` union, rides frame-level `meta.modality` → senses.md § `SenseChannel` vocabulary, `Perceiver.ts:57`. One line left
- `## Build order` → **Wave 1** paragraph (667–678, 12) — history; shipped as `Modality` (differential rendering + dark-playable did not land and keep their sections). Pointer paragraph left
- `### SoundApi propagation and detection` → *Aggregate at a location* (776–784, 9) — code: `SoundModality.ts` linear-amplitude accumulator, `MAX_HOPS`; doc: senses.md § Propagation walks (*"Two 60 dB sources sum to ~63 dB"*)
- `## Once shaped into formal requirements` → the substrate bullet (950–953), the authoring-discipline bullet (973–985), the gestalt-verb bullet (986–988), the percept-tie bullet (989–990) (22 lines) — the same evidence as the sections they summarise; the gestalt bullet is superseded (legibility Part D)

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- `### Events that leave persistent affordances` (463–475, 13) — code: a lit thing is `LightSource` + `Thermal` surface band + `SmellSource` state read per-sense after a one-frame event → inserted at senses.md § Authoring discipline, after *"This split means content authors don't write the same thing five times"* (11 lines: *Events leave persistent affordances*). Pointer left
- `### Channel-keyed Conduit transmissivity` → *Walls are silent in v1* (753–758, 6) — code: `SoundModality.walkAt` / `AudienceGather` cross only `BoundaryAnchor` conduits + doorless exits (no geometric adjacency) → inserted at senses.md § Propagation walks, after the Sound bullet (8 lines: *Walls are silent*). Pointer left
- **Two corrective inserts into senses.md, not graduations** (the code proves the existing statements false; recorded here per the skill): a 7-line ⚠ under `§ Masking` (no masking gate exists — `ListenController.ts:35`, `SmellController.ts:54-59`) and a 6-line ⚠ under `§ File layout (physics half)` (modalities live at `platform/idea/modalities/`, rows under `packages/content/platform/content/platform/idea/modalities/`). No existing sentence was edited or removed.

### Superseded — cut
- `## The three physics families` body (165–176, 12) — by the code: `ModalityFamily = 'field' | 'contact' | 'network'` is a data field (`Modality.ts:43,98`), ESP rows carry `family: field` (`idea/modalities/{verbal,emotive}-esp.yaml`), `network` reserved → senses.md § `Modality` singletons + `PerceptionApi`, § Hybrid ESP framing. Heading + note left
- `## ESP — a channel family` → paragraph 1 *"a third physics family … network"* (223–228, 6) — same evidence → senses.md § Hybrid ESP framing. Note left
- `## The gestalt verb — perceive everything in one action` → intro + *Auto-fires on room entry* + *An explicit verb re-triggers it (lean `sense`)* (380–391, 12) — shipped 2026-06 (`SenseController.ts`, `sense.yaml`, `Mobile.autoSenseOnArrival` → `forceCommand('sense')`; senses.md § Gestalt verb, § Auto-on-entry) and **being cut** by `docs/slates/builds/legibility-slate.md § Part D` (arrival fires `look`; `look` already renders every channel because `LookController.ts:215,386` pass no filter and `Visible.ts:413` defaults to the full sensorium). Heading + a 6-line note left; the three unbuilt output bullets stay under the kept lead line *"The output — sight-led prose…"*
- `### Augmenter behavior under the gestalt` → paragraph 1 *"wraps a keyword … for any sense the viewer has at least one entry for … won't be wrapped for a viewer without touch"* (532–536, 5) — by the code: `Detailed.ts:813-838` `wrapDetailKeywords` wraps every canonical key, sensorium-blind (the strip pass has already removed unperceivable regions). Note left; paragraph 2 (click = `look <kw>`; the v2 sense-aware click) KEPT as mixed
- `## Worked scenarios` → *Taste-test: "off, faintly bitter" → a poison/spoilage cue* (558–559, 2) — by spoilage.md § What a player sees (the freshness band rides `look`/`smell`; `taste` gets the palate line) and its opening doctrine (*contamination: "no sense reports it at all"*). Pointer bullet left
- `## Open questions` → Q4 *Gestalt verb name* (618–620, 3) — resolved `sense`, then overtaken by legibility Part D. One line left
- `### SoundApi propagation and detection` → the `class SoundApi {…}` sketch + its intro (762–774, 13) — by the code: no `SoundApi`; `SoundModality.soundAt` (aggregate), `PerceptionApi.canPerceive` + `Sound.DEFAULT_HEARING_THRESHOLD_DB` (detection), `AudienceGather` first-hop direction for pushed events (perception.md § Discrete-event sound push). `loudestSourceAt` / `perceivedSound` / `reverbTimeAt` remain unbuilt and are named in the note. Heading + 6-line note left

### Kept (UNBUILT)
- the canonical status block (re-stamped) · the *Still ahead* blockquote paragraph (see the first Cut entry) · the framing paragraph · *See also* (all links kept — none point at a cut section) · `## What this slate does NOT cover`
- `## The `PerceptionChannel` substrate (what's shared)` — the five-part table is the only spec for `hearingProfile` / `tactileProfile` / `gustatoryProfile` (none exist: `Species.ts` has `visionProfile`, `olfactoryProfile`, `vitalProfile` only), smell *time decay*, taste emission, and the per-channel pedagogical rendering; see Uncertain for the substrate-shape note
- `### Hearing (sound)` (anchor to the deep spec) · `### Smell (olfaction)` (trails/persistence — no `scent`/`trail` anywhere under `src/mud`) · `### Touch / temperature` (texture/hardness off Material — `FeelController.ts` reads temperature only; `tactileProfile`) · `### Taste (gustation)` (see Uncertain)
- `## ESP` → the two-channel table (the *language-gated* cell is unbuilt — comms.md § Deferred: *"the 'hearing' frames carry no language metadata yet … Implant … also unbuilt"*) · *Organ = ESP-sensitive organ…* intro + the *Natural empathy* bullet · *sentience implies telepathy* · *This resolves the dog…* (all four under Uncertain) · *Multiplicity buys expressiveness* + tiers / innate variation / independent jam (no implant tiers, no dampener — `AetherImplant.ts` is one template) · *Deferred ESP channels*
- `## Species & body-type: the sensorium` — mixed table: organ layer shipped (`PerceptionLogic.ts:607-621`, `BodyPlan.getModalities`), profile layer 2 of 5, condition layer unbuilt (senses.md § What's NOT: *"Vitals organ-condition modulation. Slate Wave 2"*; no `sensorium` reference under `lib/vitals`)
- `### Senses humans lack are just new channels` · `### Differential rendering` · `### What it's like to be a bat` — no `echolocat|electrorecept|magnetorecept|pit-sens` anywhere in `src/mud` or `packages/content` except the `Perceiver.ts:57` exclusion comment
- `### Sensorium-relative stealth & NPC perception` (see Uncertain)
- `## The gestalt verb` → the lead line + the *salience threshold* · *Darkness becomes playable* · *Pedagogical-seam mode* bullets — senses.md § What's NOT: *"Salience-threshold engine … no engine threshold"*, *"real-world darkness-blocks-vision lands when light converges"*; no sectioned/measured gestalt exists (see Uncertain for the darkness bullet)
- `### Augmenter behavior under the gestalt` → paragraph 2 (mixed: click = look shipped; the sense-aware click is the v2 remainder)
- `## Worked scenarios` → *Enter a dark cellar* · *Dog tracks a scent* · *Student mode*
- `## What this stresses` → *Material* · *race / `BodyPlan`* (alien organs; the three profiles) · *vitals* · *access / command affordances* (see Uncertain) · *comms / implant / emotes* (see Uncertain)
- `## Open questions` → Q2 · Q7 (one coarse tactile channel shipped; the split fork is open) · Q8 (organ half shipped; the condition half open — kept whole) · Q9 · Q10 · Q12 (see Uncertain)
- `## Build order` → **Wave 2** (touch/taste/single-sense verbs shipped; `tactileProfile`/`gustatoryProfile`, per-channel instruments, organ-condition scaling not) · **Wave 3**
- `## Deep acoustic spec` → intro · `### Channel-keyed Conduit transmissivity` (the partial-value table + material-derived: `Door.ts:140-143` is binary open/closed with a *"future muffled-door subclass"* comment; `Window.ts:211` closed → 0; no `acousticImpedance`) · *Per-viewer detection* three gates + *The masking gate is real acoustics* (frequency: `Sound.ts` has no Hz; masking: none — see the batch finding) · *Localization* (see Uncertain) · `### Pedagogical seams` Seams 1–7 (Seam 1 is mixed: log addition shipped, `analyze sound` is not) · `### The analyze pattern` (the `analyze`/`measure` family exists — `AnalyzeLightController.ts` etc.; no `analyze sound`, no `SoundLevelMeter` / `SpectrumAnalyzer` / `Stethoscope` / `TuningFork` / `Sonar` anywhere) · `### Worked scenarios (the propagation/detection mechanics)` all five (`LocomotionMode.noiseLevel` exists — `LocomotionMode.ts:84` — but nothing emits a sound frame from it: no `footstep`/`SoundEvent` in `src/mud`; `Window` closed → 0 not 0.4; no `hearingProfile`)
- `## Once shaped into formal requirements` → the five-senses, ESP (see Uncertain), species-interface, smell-trails and tests bullets + the closing line

### Uncertain — kept
- `## The PerceptionChannel substrate (what's shared)` — the abstraction shipped as `Modality` (`signalAt`/`perceiveFor`, `family`, organ key) with **per-modality walks and no generic detection check** (senses.md § Propagation walks: *"remain independent code per the 'per-modality walks, not a generic walker' decision"*). The section's heading and its *"Built once; each sense plugs its physics in"* sentence describe the superseded shape; the table's unbuilt cells are why it stays. Requirements should read it as a checklist, not a design
- `### Taste (gustation)` — *"poison/spoilage detection"* contradicts spoilage.md: the freshness band rides `look`/`smell` and the SILENT contaminant population is reported by **no** sense (spoilage.md l.17). The palate line (crafting.md) is what `taste` reveals. Kept because `gustatoryProfile` + the consumables tie are unbuilt
- `## ESP` → *Organ = ESP-sensitive organ … ungated by design* · *sentience implies telepathy* · *This resolves the dog-doesn't-perceive-the-wave tension* (241–270) and `## What this stresses` → *comms / implant / emotes* (598–604) and `## Once shaped` → the ESP bullet (957–965) and Q12 (649–656) — **kept-but-contradicted.** What shipped: ESP arrives only via the Avatar's `AetherImplant` (`Avatar.ts:1147-1151`), NPCs opt in per class (`Shade.ts:124`; emotes.md: *"NPCs opt in per-class"*), **no** BodyPlan row declares an ESP `sensoryPort` (`grep esp packages/content/*/content/stuff/idea/species/BodyPlan/*.yaml` → nothing), and emotes.md § Topic and modality states *"non-implant NPCs miss emotes the same way they miss DMs."* The mechanism the slate wants is reserved and open (senses.md § Hybrid ESP framing: a telepath species *"can either declare an ESP modality on its BodyPlan via the existing `sensoryPorts` mechanism, OR carry a slotted biological-empathy organ"*), so the *policy* — every sentient BodyPlan declares one — is the unbuilt remainder. Requirements must reconcile: does the dog perceive the wave today? No.
- `### Sensorium-relative stealth & NPC perception` — *"No bespoke stealth code — it falls out of the substrate"* is contradicted by the shipped concealment gate, which is **vision-band only** (concealment.md § Deliberate v1 boundaries: *"Acoustic / olfactory propagation is not concealment-gated … Cross-modal concealment (a silence discipline) is the reserved actor-face stealth consumer"*). The per-observer generalization is the open remainder; the "no bespoke code" premise is false
- `## The gestalt verb` → *Darkness becomes playable* — legibility Part D's second decision (*untagged prose becomes vision-channel prose*, so a blind viewer's `look` reads sound/smell/touch only) is the mechanism for this bullet, and Part D flags that it *"disturbs a documented AC"* (the dark-room fixture in `Visible.ts`). Kept here; requirements for legibility own the call
- `### SoundApi propagation and detection` → *Localization (direction)* — HALF shipped: pushed events carry first-hop direction (`AudienceGather.ts:32-34`, `Scene.toAudible` renders *"From the north, a faint whistle."* — perception.md § Discrete-event sound push); the `listen` field-read walk (`SoundModality.walkAt`) records no direction. Kept whole because the paragraph describes the pull side
- `## What this stresses` → *access / command affordances — skills gate revelation + afford perception verbs* — the affordance substrate shipped (command-routing.md § Affordance attribution) and `assess` exists, but the `requires*` validators gate on the **sensorium**, not on a skill/Discipline, and I found no perception verb contributed by a skill object. Unsure whether "a skill contributes the revealing verb" is unbuilt or superseded by the advancement model (advancement.md); left for the cluster pass with advancement
- Overlaps for the cluster pass: the dark-room / untagged-prose rule ↔ `legibility-slate` Part D; scent trails + NPC tracking ↔ `stealth.md § wary brain` and the husbandry/ranching animal work; the ESP field walk / eavesdropping ↔ comms.md § Deferred; masking + `hearingProfile` ↔ the instrumentation slate (memory: check before any measure/analyze design); `tactileProfile` texture ↔ textiles.md (`clo`, hand-feel)

### Doctrine — kept, labelled
- `### What it's like to be a bat (the worked example)` → the closing paragraph (*"Same room, radically different percept … Nagel's bat-experience, delivered. Text can do this better than graphics"*) and `### Sensorium-relative stealth` → *"The chain: … Body-type determines the experienced world."* — the pedagogy-lens thesis of the subsystem. Not in `Left`; coordinator's call on home (senses.md *Why*, or the slate)

### Handoff (belongs in a doc outside my list)
- none. Everything that graduated belongs in senses.md. Three doc defects outside my list are flags, not inserts: `Visible.ts`'s docstring *"`look` passes `['vision']`"* is false (code, not docs — legibility Part D already names it); emotes.md is accurate; comms.md § Two transports' *"gated by … language"* cell for acoustic is aspirational and its own § Deferred says so.

### Status block
- Status line: added the legibility Part D pointer (the `sense` verb is being cut; `look` is the take-it-all-in verb)
- Left: *smell trails / temporal persistence · echolocation (the active-sense pattern) · the full ESP local-field walk · per-species `hearingProfile`/`tactileProfile`/`gustatoryProfile` · scalding burn-damage · RT60 reverberation · NPC scent-tracking · sensorium-relative stealth · the alien channels* (9 items) → *smell trails / temporal persistence + NPC scent-tracking · the active-sense pattern (echolocation) + the alien channels · differential per-channel rendering · sensorium-relative stealth / NPC detection · the full ESP local-field walk · the natural-empathy ESP organ on `BodyPlan` + implant tiers / innate variation / independent jamming + the deferred ESP channels · the verbal channel's language gate · per-species `hearingProfile` / `tactileProfile` / `gustatoryProfile` · organ-condition modulation (vitals) · touch texture/hardness off Material + the sub-modality fork · taste's consumables tie · the gestalt output now owed by `look` (salience threshold · dark-playable · the sectioned pedagogical mode) · the sense-aware click · skills afford perception verbs · chemesthesis · the deep acoustic spec (partial-transmissivity conduits + material-derived transmissivity · frequency + masking gates · `listen` localization · RT60 · Doppler · noise dose · `analyze sound` + the acoustic instrument roster · the biome-chain ambient resolver)* (17 items). *Scalding burn-damage* dropped (shipped — thermal.md). The body wins: the ESP policy, the profiles' consumers, the gestalt output, the whole deep acoustic spec and chemesthesis were unrepresented
- Size: a wave → **a build** — what remains is at least four waves riding different builds (hearing polish · smell trails + tracking · alien/active channels · ESP field physics); "a wave" described the 2026-06 remainder before the deep acoustic spec was folded in. ⚠ The file sits in `tails/`; the folder is derived from size — the coordinator's move, not mine

### Counts
- Cut (SHIPPED · DOCUMENTED): 31 entries, ~296 lines
- Graduated: 2 sections (19 lines out, 19 lines in) + 2 corrective inserts (13 lines in)
- Superseded: 8 entries, ~56 lines
- Kept: everything else, incl. 8 Uncertain entries + 1 Doctrine entry
- Pointer / note lines added to the slate: ~95 (incl. the 24-line status block)
