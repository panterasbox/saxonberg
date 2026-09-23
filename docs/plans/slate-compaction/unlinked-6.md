# Slate-compaction pass — unlinked-6 batch ledger

Eight slates whose status block names no subsystem doc. Branch
`design/slate-compaction`. Procedure: `.claude/skills/compact-slate/SKILL.md`.
Write list: **none** — every graduation is in a *Handoff* section below,
verbatim, with its target doc named. Line numbers are the ORIGINAL file's.
Originals saved under the scratch dir `unlinked-6/orig/` for diffing.

Batch-wide findings first:

- **Seven of eight are what their stamps say — unbuilt design** (deduction,
  mirror, record-integrity, agency, client-audio, odometer) or an honest
  PARTIAL (eager-residency). Every stamp was re-verified against code and
  the negative findings are recorded per slate with the paths grepped.
  The cuts in those seven are almost all **second status blocks** (the
  one-status-block calibration) and one **superseded** section (mirror's
  *unwritten siblings* — three of the four have since been written).
- **The one real compaction is `lib-statics-homes-dossier`** (220 → 38): a
  self-marked SUPERSEDED dossier whose ruling shipped and is in
  `antipatterns.md` verbatim (the ladder's rung 1 IS its *widened line*).
  Reduced to a pointer stub keeping the one paragraph nobody else carries
  (six pure-but-domain statics ruled *move, but not yet*), with a handoff
  to put that line on `value-object-statics-slate`'s `Left`; deletable once
  that lands.
- ⚠ The batch brief called odometer *"a tail of the recent grain-chain
  build"*. Nothing in the tree supports it — the only `odometer` in code is
  the haulage trade honouring the slate's *bright line* (*the same act done
  better is the odometer failure*). Treated as the code shows: UNBUILT.
- **Substrate that shipped BESIDE a slate, recorded under Uncertain rather
  than cut**: `Avatar.lastSeen` (a recency stamp, read by character select
  — eager-residency's W1 first bullet, in a different place); `analyze
  postmortem` (deduction's competence-gated derivation without its
  casebook); `AccessApi.isAgentOf` (a second hand-rolled narrow agency the
  agency slate names only one of, and it opens with the `isWizard`
  short-circuit the slate's own guard forbids).
- **Two stale keys / links, not rewritten**: odometer keys the subject on
  `templatePath` (a person keys on `getIdentityPath()`); eager-residency
  links `../tails/property-slate.md` (the file is in `builds/`).
- **`Left` grew on six of eight** — the body wins; the open questions and
  the fork sections were unrepresented in the stamps.

---

## docs/slates/builds/eager-residency-slate.md — 239 → 233 · Status PARTIAL → PARTIAL

The stamp was honest. The mechanism it names is in the tree: `pinsResidency`
(`lib/persistence/Persistable.ts`, `KeptAnimal.ts`), the roll
`ResidencyLogic.pinNow` (`platform/idea/api/ResidencyLogic.ts:806`, armed by
`ResidencyWarden.ts:57`), the login ask `Estate.restoreSlice` →
`ctx.standUpKeyed` (`lib/chattel/Estate.ts:236,255`), tests at
`lib/chattel/__tests__/ResidencyPin.test.ts`. Everything the slate calls
unbuilt is unbuilt: `pinNow` reads no tier and no allowance (its own
docstring at `:796` says *"the roll admits every pin today"* and points at
this slate); `Bonded.canEvict` (`lib/husbandry/Bonded.ts:703-710`) still
returns `!(stamped && alive)` — no lapse; `ParcelRecord.allowance`
(`lib/parcel/ParcelRecord.ts:193`) is *"INERT 0a seam"*; no `lint:*` in
`packages/server/package.json` censuses `standUpKeyed`/`placedIn` callers
or recency consumers. `residency.md § ⭐ The load half — the residency pin`
(l.437-525) carries § 1's answer and § 2's pager table nearly verbatim,
including the D21 reversal narrative and the *"what is slated, not built"*
pointer back here. Two cuts.

### Cut (SHIPPED · DOCUMENTED)
- `## 1.` → the first paragraph *"What loads X has one honest answer… A named animal is."* (57–64, 8) — code: `ResidencyLogic.pinNow`, `Persistable.pinsResidency`; doc: `residency.md § The load half` → *The question it answers* (same sentences). One-line pointer left; the second paragraph (*this slate is everything the mechanism deliberately does not decide*) is spine and stays
- `## 2.` → the intro + the three-row pager table (73–80, 8) — code: `ResidencyWarden.warm` (boot) + `Estate.restoreSlice` (login) + the cold-tail sweep; doc: `residency.md § The load half` → *Pinning, not swap* (page-in / page-out / no fault), `§ Deferred` → *Memory-pressure-driven aggressiveness … not built*. One-line pointer left. The ⚠⚠ never-fault paragraph stays: its narrative is documented but its **gate** (*no `postRegister`, no `materialize`, no traversal may call `standUpKeyed`…*) is unbuilt and is W0

### Kept (UNBUILT)
- the status block (re-stamped) · *Captured* · *Provenance* (four user quotes — the slate's framing) · *Sits on*
- `## 1.` second paragraph · `## 2.` → the never-fault gate paragraph
- `## 3. ⭐⭐ Two tiers of account` — no tier, no *N*-day `AppSettings` key, no mirror line, no consumer ceiling (see Uncertain for `Avatar.lastSeen`)
- `## 4. ⭐ Three-party admission` — `pinNow` never consults `ParcelApi`; the allowance field is inert; no commons budget line; no degradation order
- `## 5. The house — dissolved` — a decided non-build (nothing loads a house; the hearth would opt in itself). Kept: `residency.md` states the emit-set rule but not the house conclusion, and it is the rule the next opt-in cites
- `## 6. The lapse` — `Bonded.canEvict` is still the outright veto
- `## 7. The keyless good in a public room` — options a / b / c undecided; `Estate.restoreSlice` stands up keyed entries only (`:251` *"a keyed entry's state is {}"*)
- `## 8. Open questions` 1–4 — all open. Q2 (*ship both*) is half-true today — the roll and the login ask both exist — but the *bounded by active owners* clause waits on § 3, so it stays
- `## 9. What the build looks like` W0–W3

### Uncertain — kept
- `## 3.` → *"the recency read has one consumer (`ResidencyLogic`)"* and `## 9.` W1 → *"`lastSeen` on the account (layer 1)"* — a recency stamp already exists: `Avatar.lastSeen` (`platform/agent/Avatar.ts:287`, persistent, `markSeen` on both the deliberate-leave and the linkdead path at `:1403`), read by character select (`Login.ts:456`). `ResidencyLogic` does **not** read it. So W1's first bullet is half-shipped in a different place (the Avatar, not "the account"), and the ceiling-of-one census would start from today's one consumer (the roster), not from `ResidencyLogic`. Mechanism unbuilt; premise stale
- *Sits on* → `[property-slate](../tails/property-slate.md)` — **broken link**: the file is `docs/slates/builds/property-slate.md` (the README's folder is derived from size, so slates move). Not rewritten (cuts only); the sweep or the cluster pass fixes the path
- Overlaps for the cluster pass: the compute allowance / heartbeat count ↔ `builds/property-slate.md` (Layer A/B); the mirror line ↔ `mirror-slate.md` (this batch); the commons deficit-mint ↔ `banking.md` `reserve mint`; *disenfranchisement by inactivity* ↔ `measurement.md` Tier C

### Handoff
- none

### Status block
- Status: PARTIAL → PARTIAL (added the 2026-09-19 code-verified clause)
- Left: *two tiers + the may/may-not table · three-party admission · degradation order · lapsing · keyless good · never-fault gate* → same six, with *the recency-consumer ceiling* and *the commons budget line* named (both in the body, unrepresented) and § 7's *a / b / c*
- Size: a build → a build

---

## docs/slates/builds/client-audio-slate.md — 233 → 238 · Status UNBUILT → UNBUILT

Nothing exists. `audio` / `jukebox` / `spotify` / `ambient` hit nothing in
`packages/client/src` (`*.ts`, `*.tsx`), `packages/server/src`,
`packages/types/src` or `packages/content`; `docs/subsystems/*.md` never
mention a jukebox or Spotify. The seams the slate would ride are as it says:
`display.md` (the per-viewer `cockpit.watch` push, `refreshViewer`),
`streaming.md` (`watch … on <screen>`), `media.md` (self-hosted assets).
One cut (the second status block). The file grew by five lines because
`Left` grew.

### Cut (SHIPPED · DOCUMENTED)
- the second status block *"design conversation, captured. Not requirements… must be re-verified…"* (15–18, 4) — history under the one-status-block rule; its one live clause (re-verify the Spotify facts before building; a live bug) is folded into the canonical block's status line and is already `Left`'s last item + Q8 + Part 4 catch 2

### Kept (UNBUILT)
- the status block (re-stamped) · *Captured* · *Provenance* · *Sits on / borrows*
- `## Part 0 — The finding` · `## Part 1 — The client audio player` · `## Part 2 — Why the jukebox as pictured is not buildable` (platform facts, dated) · `## Part 3 — The zorkmid point` · `## Part 4 — The embed` + both subsections · `## Part 5 — Open questions (the substrate)` 1–5 · `## Open questions (the Spotify tier)` 6–8 · `## Part 6 — The alternative` · `## What this slate does NOT cover`
- all open questions are open; none is answered by code or a doc

### Doctrine — kept, labelled
- none (Part 0's *two features, one Spotify problem* is the slate's own framing, not a thesis about the game)

### Uncertain — kept
- none contradicted by code. The platform facts in Parts 2 and 4 are dated (capture 2026-09-01) and the slate itself says so; not a code question. Overlaps for the cluster pass: the jukebox as a `DisplayMixin`-style device ↔ `display.md`'s source kinds (Q5 asks whether audio is a third source on `resolveFor`); the zorkmid sink ↔ `banking.md`

### Handoff
- none

### Status block
- Status: UNBUILT → UNBUILT (added the code-verified clause + the re-verify caveat from the cut block)
- Left: *the client audio player · the Spotify embed tier · the zorkmid priority queue · the bar jukebox object · re-verifying the Spotify platform facts* → the same five, plus *the source's home (Q1) + autoplay gesture + mix · the loose-sync-or-frame-lock decision (Q6) · the purchasable-zorkmids gate (Q7) · the self-hosted / licensed tier (Part 6)* (the body wins: Parts 5 and 6 and the two forks were unrepresented)
- Size: a build → a build

---

## docs/slates/builds/odometer-slate.md — 230 → 219 · Status UNBUILT → UNBUILT

Unbuilt, as stamped. No counter store, projection, milestone or title
vocabulary under `packages/server/src`, `packages/content`,
`packages/client/src` or `packages/types/src`; no subsystem doc mentions
an odometer. The only `odometer` in code is a term of art: the haulage
trade's *"the same act done better — the odometer failure"*
(`packages/content/transport/src/thing/HaulageRig.ts:63`,
`trade-haulage/src/idea/cmd/perception/MeasurePassageController.ts:13`,
`teamstering.yaml:17`), which is this slate's *bright line* being honoured
by another build, not the odometer being built. ⚠ The batch brief called
this *"a tail of the recent grain-chain build"*; nothing in the tree
supports that — the grain chain shipped no counter — so it was treated as
what the code shows: UNBUILT. The ledgers it would read exist
(`participation_events`, `renown_events`, the chronicle;
`participation.md:29,65`); the readout precedent it names (`score`) is
`platform/cmd/social/score.yaml`. One cut.

### Cut (SHIPPED · DOCUMENTED)
- the second status block → its first three paragraphs *"design-phase, deferred-rpg…"* / *"Not party-specific…"* / *"Sequencing decision (2026-07-28): CAPSTONE…"* (10–30, 21) — history under the one-status-block rule; the capstone decision and both of its reasons are now in the canonical status line, *subject-scoped* is `## Subject-scoping` in the body, and `launch-worklist.md:137-143` carries the sequencing. The fourth paragraph (the load-inert rule) is KEPT as doctrine (below)

### Kept (UNBUILT)
- the status block (re-stamped) · *See also* (every link resolves)
- `## What it is` · `## Milestones` · `## Nearly free — a readout over ledgers we already keep` · `## Subject-scoping` (see Uncertain) · `## Personal vs. social framing` · `## Settled decisions` 1–7 · `## Open questions` 1–5 (all open) · `## What this slate does NOT cover` · `## Once shaped into formal requirements` + the tests-gating paragraph

### Doctrine — kept, labelled
- the load-inert rule blockquote (31–40) — *no system's felt-progression story may DEPEND on the odometer*; a standing review question for every build. Cited by `launch-worklist.md:141` and honoured in code by the haulage trade, but stated in no subsystem doc. Candidate home: `advancement.md § Why` or `docs/design-philosophy.md`
- `## Principle — XP fuses two things; the lie is the fusion` — the split (journey tally vs capability input); `advancement.md` carries derive-don't-track but not this framing
- `## The bright line — downstream-inert` + `## Why this dissolves the balance problem` + `## Why a powerless counter is engaging` — the three arguments for a tally with no power. The first is the rule the haulage code cites as *the odometer failure*; it belongs beside advancement's *competence is derived, bands-only*

### Uncertain — kept
- `## Subject-scoping` → *"Keyed on a subject (`templatePath`), the renown/chronicle pattern"* — the person key is now `getIdentityPath()` (`CLAUDE.md § Go Through the API Layer`, `antipatterns.md § Keying a PERSON on getTemplatePath()`; every player Avatar shares one `templatePath`). `renown.md:64` and `chronicle.md:43` still say `templatePath` (the identity path `/platform/agent/Avatar/<playerId>` is what they mean), so the slate is no worse than the docs it cites, but a build must key the subject on the identity path. Mechanism unbuilt; the named key is stale
- `## Once shaped into formal requirements` 5 → *"the `score`/`me` + party-sheet precedent"* — `score.yaml` exists; there is no `me` verb (`platform/cmd/*/me.yaml` absent); the self card is `CARDS.self` on the widget shelf (`client-shell.md § The widget shelf`)
- Overlaps for the cluster pass: milestones-as-titles ↔ `belief.md` recognition + `identity.md`'s standing rungs; the party subject ↔ `tails/party-slate.md`; the aggregate-vs-specific argument ↔ `measurement.md`'s no-gauge rules (a lifetime tally shown to its owner is the mirror, never the feed)

### Handoff
- none (the doctrine is flagged above for the coordinator's one-pass decision, not graduated — it describes an unbuilt thing)

### Status block
- Status: UNBUILT → UNBUILT (added the sequencing reasons from the cut block and the code-verified clause)
- Left: *counter roster · the subject-scoped derive · milestones · the party and guild scopes · the readout surface* → the same five with their open questions attached (*the authoring surface (Q1) · the projection map (Q2) + whether participation shares the store (Q5) · the aggregate headline + its weighting (Q4) · milestones via belief (Q3) · double-attribution · personal-by-default readout*)
- Size: a build → a build

---

## docs/slates/builds/lib-statics-homes-dossier.md — 220 → 38 · Status SUPERSEDED → PARTIAL (a pointer stub; ABSORBED into value-object-statics-slate bar one paragraph)

Self-marked SUPERSEDED on 2026-09-15 with *retirement recommended*, *left
in place for the user's call*. Nothing links to it (`grep -rl
lib-statics-homes-dossier docs packages` → only this ledger). Its ruling
was made in-file (§ *The call*), executed by the `build/lib-statics` sweep
(merged 2026-09-14) and is documented: `antipatterns.md § A public static
on a lib value class` carries **the ladder** whose rung 1 is exactly the
dossier's *widened line* (*construction, a guard over its own closed
vocabulary, a lookup of it → stays on the value class, visible as
`value-static`*), the *would a reader look for it here* test (l.5030), and
*⭐⭐⭐ Therefore: not one of the 18 "homeless" subsystems needs an Api —
Held, and executed* (l.4990); `lint-family.md § lint:lib-statics` carries
the gate and the type-vs-world test. The five docs it caught naming a
phantom Api now each say the opposite: `trait.md:12,92` (*the Api OO sweep
retired `TraitApi`*), `metabolism.md:14` (*no `MetabolismApi`*),
`maturation.md:79` (*no MaturationApi*), `hazard.md:13-15` (*NO
`HazardApi`*), `concealment.md:168` (*NO `DetectionApi`*). `ls
packages/server/src/mud/api/` has no identification / wiki / advancement /
trait face — the four declined mints stayed declined. The `standing`
finding is `api-normalization-slate`'s status block + `Left` (*merge the
influence cluster — five Apis, one `lib/standing/`*).

**The one live remainder** is § 4: `Competence.derive` / `bandOf` /
`seedRunFor` (`lib/advancement/Competence.ts:119,192,221`) and
`TraitPosition.derive` / `deriveAxis` / `pronounced`
(`lib/trait/TraitPosition.ts:92,114,137`) are still public statics, ruled
*move, but not yet — on the list, not forgotten*. No list carries them:
`value-object-statics-slate`'s `Left` (as unlinked-1 left it) names
`GroundCharacter` / `OuterWarren` / `HoldingWarren` / `Login` / `readInt` /
`linearToDb` / `scoreEvents` and not these six. So the dossier is reduced
to a pointer stub keeping § 4 verbatim, under the calibration *a slate
whose only remainder another slate owns becomes a pointer stub*, and the
handoff asks for the six to be added to value-object-statics-slate's
`Left` — after which the coordinator can delete the file.

### Cut (SHIPPED · DOCUMENTED)
- the old status block (3–19, 17) — replaced by the stub's; its pointers to value-object-statics-slate § §B COMPLETE / § the registry cluster / § the 36 guards now point at sections that unlinked-1 cut (those bodies are `antipatterns.md`'s), so the new block points at the docs instead
- the framing paragraph *"Eighteen subsystems own public statics and have no Api…"* (21–25, 5) — the question, answered
- `## ⚠ First — read this, because it shrinks the question by half` (29–56, 28) — the widened-line proposal; doc: `antipatterns.md § The ladder, first match wins` rung 1 (construction · guard · lookup, verbatim) — the extension was kept, so the *confirm or cut* ask is closed
- `## The result: 9 subsystems need a home, not 18` intro + `### Needs no Api` table (60–79, 20) — evidence; each row's disposition is at its site (unlinked-1 ledger § value-object-statics *Artefacts verified*); doc: `antipatterns.md § Therefore: not one of the 18…` (*no new Api was minted by the sweep*)
- `## ⚠ Five subsystem docs name an Api that does not exist` (97–114, 18) — resolved: all five docs now state the negative (paths above). The one-line doctrine (*a doc naming an Api is not evidence the Api is needed*) → Handoff, optional
- `## What I am asking you to rule` 1–4 (118–133, 16) — all four answered in `# The call`, which is itself cut below
- `# The call` intro (137–144, 8) + `## ⭐⭐ 1. Mint nothing. Not one new Api.` (146–168, 23) — executed; doc: `antipatterns.md:4990` (*Held, and executed*); the arithmetic (93 Apis / 1,097 statics, the thin/thin quadrant) is `api-normalization-slate` Part 6 (l.357). The *floor with a name* paragraph's why (the ratchet stops above 0 because Api-less systems wait on normalization for a face) is stated nowhere → Handoff
- `## 2. The widened line — keep it, and here is the principle` (170–186, 17) — doc: `antipatterns.md` rung 1 + *⭐ Under the governing test — would a reader look for it here?* (l.5030) + `lint-family.md § lint:lib-statics` (*`Freshness.growthRate` … belongs on a logic singleton*)
- `## What this leaves the sweep` (213–220, 8) — the sweep ran (563 → 337)

### Superseded — cut
- `### Needs a ruling — world-level statics with nowhere to go` table (81–93, 13) — by the executed rulings, row by row: identification → declined, cache cluster ruled (`WarmedIndex`, unlinked-1); standing → `api-normalization-slate`; wiki → declined; advancement / trait → **§ 4 kept**; lock → `BoundaryApi.mintKeyway` (`api/boundary.ts:123`); location → `Warren.cleanupOnDestruct` is rung 0 reflective (`antipatterns.md § Rung 0 is not optional`), `OuterWarren.conditionOf/admitFor` is on value-object-statics's `Left`; npc → `DialogueEffectRegistry.register` ruled `@internal`, no door (unlinked-1); commerce → `CommerceMenu.resolveIn` no longer exists (`lib/commerce/Menu.ts` has only `fieldMeta` / `commandContributions`)
- `## 3. standing — not four subsystems, and not four rulings` (188–204, 17) — by `api-normalization-slate` § 6.2 + its `Left` (*merge the influence cluster … into one `InfluenceApi`*), which the section itself says is where it is logged; ⚠ the *namespace barrel* it proposes was since **rejected** (api-normalization-slate: *⛔ the barrel pattern is retired — 6.5*), so the section is superseded on its own remedy too

### Kept (UNBUILT)
- the status block (re-stamped as the stub) · `## 4. Pure-but-domain … — move, but not yet` verbatim (its *§1* back-reference now resolves to the status block's *not one of the 18 needs an Api*)

### Uncertain — kept
- ABSORBED into `value-object-statics-slate.md`: the six statics of § 4 need a line on that slate's `Left` (handoff below); once there, this file has nothing of its own
- (checked, not uncertain) `CommerceMenu.resolveIn` (the cut table's last row) — no longer exists: `lib/commerce/Menu.ts` has only `fieldMeta` / `commandContributions` statics, and `resolveIn` hits nothing under `mud/api` or `mud/lib/commerce`. Resolved by the sweep

### Handoff (belongs in a doc outside my list)
- → `value-object-statics-slate.md` **Left** (append one item): *`Competence.derive` / `bandOf` / `seedRunFor` + `TraitPosition.derive` / `deriveAxis` / `pronounced` — pure-but-domain, ruled move-but-not-yet (the dossier § 4): destination is the face the normalization pass gives advancement / trait; until then they stay*
- → `lint-family.md § lint:lib-statics` (one sentence after *the population may not grow while the sweep moves the world-level half out*), verbatim from the cut § 1:

  **So the ~50 world-level statics in Api-less subsystems stay where they
  are**, and the ratchet stops at **≈50 + the type-level population**
  instead of at 0. That is a floor with a name and a reason, not a
  shortfall: `lint:lib-statics` records it, and the number falls to 0 when
  the normalization pass gives those systems faces.
- → `antipatterns.md § Therefore: not one of the 18 "homeless" subsystems needs an Api` (optional, one line), verbatim: *a doc naming an Api is not evidence the Api is needed* — four of these five would have been minted on that evidence alone.

### Status block
- Status: SUPERSEDED (*retirement recommended, left for the user's call*) → PARTIAL, a pointer stub (SUPERSEDED by its own ruling; ABSORBED into value-object-statics-slate bar § 4)
- Left: *(none — the old block had no `Left:` key; its body was "kept only as evidence")* → *§ 4: the six pure-but-domain statics, to be listed on value-object-statics-slate's `Left`*
- Size: *(unstated)* → a tail (of the normalization pass)

---

## docs/slates/builds/deduction-slate.md — 216 → 224 · Status UNBUILT → UNBUILT

Unbuilt, as stamped. None of the eight verbs exist as views
(`packages/content/*/content/*/cmd/*/{casebook,board,theory,reconstruct,present,link,post}.yaml`
→ nothing); no quest class, spine or mixin under `packages/server/src/mud`
or `packages/content/*/src` (`quest` hits only two unrelated comments).
The substrates it ties to are as it says (`advancement.md`, `belief.md`,
`chronicle.md`, `mql-subscription.md`, `card-surface.md`, `prose.md`); both
cross-references resolve (`eternal-university-narrative-slate.md`,
`docs/staging/eternal-university/experiences/census-form.md`). One
finding: **`analyze postmortem` shipped** — a competence-banded forensic
derivation (`platform/cmd/perception/analyze.yaml:134-161`, controller
`/trade/medicine/idea/cmd/perception/AnalyzePostmortemController`;
`mortality.md` — the corpse as a forensic Creature, legibility falling with
decomposition). It is the slate's *derive by `analyze`, never assert*
half without the *casebook* half: the reading is narrated and lands
nowhere. Recorded under Uncertain; not a contradiction. One cut. The file
grew by eight lines because `Left` grew.

### Cut (SHIPPED · DOCUMENTED)
- the second status block → its first paragraph *"sketch / pre-requirements. A design pass, not a spec. Authored 2026-06-27…"* (12–14, 3) — history under the one-status-block rule; the authoring date and driver moved into the canonical status line. The block's other two paragraphs (*Scope discipline* · *Hard line — not forums*) are KEPT as doctrine (below)

### Kept (UNBUILT)
- the status block (re-stamped) · `## The generic quest spine` · `## The forensic type` + `### Anti-spoiler` + `### The §11 hole` · `## Scope — instance the authored case` · `## The synthesis` table + the one-line model · `## Text-native first` (the eight-verb sketch + legibility) · `## One command language, two surfaces` · `## Ties to existing substrates` · `## Open questions / dials` 1–5 (Q2 is marked RESOLVED by the slate's own *Scope* section, not by code or a doc, so it stays — the lineage-slate Q17 precedent) · `## Cross-references`

### Doctrine — kept, labelled
- the *Scope discipline* blockquote (16–20) — *do not build one grand quest engine; a thin generic spine, types bring their own mechanics*
- the *Hard line — not forums* blockquote (22–26) — *truth is shown, not argued or voted; forums is for the civic aftermath*. `forums.md` is the boundary it cites; whether `forums.md` states the boundary from its side was not checked (outside the batch)
- `## One command language, two surfaces` → the *differentiator* paragraph (166–170) — *the collaborative deduction game was never built because graphics make a shared corkboard a nightmare; in text it is trivial*

### Uncertain — kept
- `## Text-native first` → `analyze <thing>` *"derive a finding (competence-gated…). Lands in the casebook"* and `## Ties` → *competence-gated `analyze`* — half-shipped in a different shape: `analyze postmortem` is competence-banded (competent / proficient / expert readings) and is exactly the *inferred from what is left, not read off the body* derivation, but there is no casebook for it to land in. A build starts from that stanza rather than a new verb
- `## Scope` → *"the morgue's steady corpse flow"* / EU §9 — the corpse and its decay clock exist (`mortality.md`); no morgue, no kill-list. Not contradicted
- Overlaps for the cluster pass: the party-scoped board ↔ `party.md` (the Party Idea shipped — the board's scope has a subject to key on); the web corkboard ↔ `card-surface.md` (one inspection card laid out by `StuffKind` — a board card would be a new kind); the §11 handler ↔ `eternal-university-narrative-slate.md` §8/§11; the civic-aftermath handoff ↔ `forums.md` / `civics.md`

### Handoff
- none

### Status block
- Status: UNBUILT → UNBUILT (added the code-verified clause + the `analyze postmortem` finding)
- Left: *spine · casebook · party-scoped board · `analyze`-derived findings · `post`/`link`/`theory`/`present` · cluster locking · `reconstruct` · the §11 node* → the same eight, plus *the regenerating-stream public wall · the corkboard render of the board card · wrong convergence (Q3) · the civic-aftermath handoff (Q4)*, with Q1 / Q5 attached to the items they open (the body wins: two sections and three open questions were unrepresented)
- Size: a build → a build

---

## docs/slates/builds/mirror-slate.md — 214 → 200 · Status UNBUILT → UNBUILT

Unbuilt, as stamped, and further out than anything else: no inbound
assertion, sensor-feed or parity seam anywhere under `packages/server/src`
(`parity` / `sensor` hit only the sensorium comments in `api/mml.ts`). The
one forward-compatibility cost it names is paid: a room carries declared
fields of its own — `furnishing.md:450` (`postedAs`). Its *See also*
targets resolve (`property-slate.md`, `stewardship-slate.md` are in
`builds/`). **The stale claim is the "Unwritten siblings" section**: it
says four designs *have no file in the corpus*; three now do —
`docs/slates/builds/instrumentation-slate.md`, `enforcement-slate.md`,
`bathroom-slate.md` (each stamped UNBUILT). Only the practicum thesis is
still memory-only (cited in `company-and-capital.md:446,517`,
`compact-political-science.md:146`; no slate). Two cuts.

### Cut (SHIPPED · DOCUMENTED)
- the second status block → its first two paragraphs *"design captured 2026-07-31, not built… Make the bed, and the bed is made."* / *"This is the gamification mirror thesis taken literally…"* (12–23, 12) — history under the one-status-block rule; both restate `## The thesis` (claims 1–3) and the canonical status line, which now carries the one-line thesis. The third paragraph (*Why it is not absurd, and why it is not now* — the futurism bet, captured so the substrate stops foreclosing it) has content of its own and is KEPT as a blockquote

### Superseded — cut
- `**Unwritten siblings — a real gap.**` → the intro sentence + the *Instrumentation* / *Enforcement* / *Bathroom* bullets + *"Cited by name rather than by link throughout"* (48–59, 62–65; 16) — by the three slates having been written (paths above). A one-line note names them; the *Practicum* bullet (60–61) stays because it is still true

### Kept (UNBUILT)
- the status block (re-stamped) · the *Why it is not absurd* blockquote · *See also* (its *"unwritten, below"* qualifiers on enforcement and the practicum are now half-stale — see Uncertain) · the *Practicum* bullet
- `## The thesis` (claims 1–3) · `## The cheating problem, and the answer` · `## The bedroom, as the exemplar` · `## What the platform already has` (every bullet names a shipped substrate; kept because the section is the slate's *ties*, not a claim of the mirror having shipped) · `## Open questions` — all eight open · `## What this slate does NOT cover`

### Doctrine — kept, labelled
- `## The cheating problem, and the answer` → *density, not verification*; *at sufficient density, to game it is to actually live the thing you are gaming*. The slate's one original idea; it belongs with `measurement.md`'s Mara/Aletheia property (*the mirror shows you*) if the mirror is ever built, and nowhere yet
- `## Open questions` → *Sensor silence* → *absence is neutral, and the mirror only ever adds; the game must remain whole for a player with no instrumentation* — the slate calls it *close to a first principle*

### Uncertain — kept
- *See also* → *"the enforcement design (… unwritten, below)"* and *"the practicum thesis (… unwritten, below)"* — enforcement is now written (`enforcement-slate.md`); the practicum is not. The list was not rewritten; the superseded note above the practicum bullet says which is which
- `## What this slate does NOT cover` → *"the furnishing build, in flight"* — furnishing shipped (`furnishing.md`); the D7 room-level-state seam it consumes is `postedAs`. Conclusion unchanged; tense stale
- `## What the platform already has` → *"The evidence firewall (the unwritten enforcement design)"* — the design is written; whether `enforcement-slate.md` still calls it *the evidence firewall* was not checked
- Overlaps for the cluster pass: the two-tier / opt-in question ↔ `eager-residency-slate.md § 3` (this batch — a different two-tier, but the same *what membership may not mean* discipline and the same `measurement.md` Tier C); calibration / trust tiers ↔ `instrumentation-slate.md`'s three gates; condition ↔ `stewardship-slate.md`

### Handoff
- none

### Status block
- Status: UNBUILT → UNBUILT (added the code-verified clause, the paid seam, and the one-line thesis from the cut block)
- Left: *inbound channel · density threshold · privacy invariant · sensor-silence · calibration/trust tiers · diegetic-or-marked* → the same six plus *what is admissible (the INTRINSIC/SOCIAL firewall) · claim, corroboration and decay · opt-in without a two-tier world* (the body wins: three of the eight open questions were unrepresented)
- Size: a build → a build

---

## docs/slates/builds/record-integrity-slate.md — 213 → 218 · Status UNBUILT → UNBUILT

Unbuilt, as stamped, and the stamp's premise re-verified: no `prevHash`,
`hash` chain, Merkle checkpoint or randomness beacon under
`packages/server/src` (`beacon` hits only the `Beacon` light-source Thing
and `Switchable`); `positions` is still a mutable current-state cache —
`packages/server/src/schema/positions.yaml:18` *"holding is idempotent, so
the write is an upsert"* — with no `position_events`, docket or roll
collection beside it (the *three the legal build adds* are still the
legal-code slate's). `GitApi` snapshot-and-push exists (`git-workflow.md`)
as the slate says. Every link resolves (`docs/governance/draft-constitution.md`,
`branch-policy-slate.md`, `cooperative-slate.md`, `legal-code-slate.md`,
`press-slate.md`, `influence.md`). One status block already; no cuts. The
file grew by five lines because the status line grew.

### Cut (SHIPPED · DOCUMENTED)
- none

### Kept (UNBUILT)
- the status block (re-stamped) · *Captured* + the two framing paragraphs + the *Related* list
- `## Start with the uncomfortable part` · `## The guarantee decomposes into three` · `## ⭐ Fabrication has a defense we already built` (the roll is unbuilt too — `legal-code-slate.md`; the *third consumer* argument stands) · `## Scope: governance only` + `### positions is the odd one out` (still true — the upsert) · `## Anchoring` · `## Then ship the verifier` · `## Sealed records fall out free` · `## Draws need an external beacon` · `## The honest limits` · `## Two implementation hazards` · `## Build order` 1–7 · `## Open questions` 1–6, all open

### Doctrine — kept, labelled
- *"We don't rewrite history" and "you can prove we didn't" are different products* (22–23) · *A hash chain the operator can recompute is theater* (40) · *If the verification runs on our box, it isn't verification* (128) · *an integrity branch that must be trusted has failed* (138–140) · *Tamper-evidence guarantees the record, never the law* (174–176) — five one-line theses embedded in unbuilt sections; the constitution's Art. VII and the manifesto chapter are their published home, per the slate's own framing. Not cut; flagged for the coordinator's one pass

### Uncertain — kept
- none contradicted by code. `## Scope` → *"the three the legal build adds (the Roll, the docket, `position_events`)"* — the legal build has not happened; the sentence is forward-looking and reads correctly. Overlaps for the cluster pass: `position_events` event-sourcing ↔ `influence.md` (conviction's `realSince` is already an event fact) and `legal-code-slate.md § The roll`; the bank ledger's sealed chokepoint ↔ `banking.md` (Q4); the dormant-account roll ↔ `eager-residency-slate.md § 3` (this batch — a second consumer of the same recency measurement, which that slate's *ceiling of one* would refuse; the two slates should meet in requirements)

### Handoff
- none

### Status block
- Status: UNBUILT → UNBUILT (added the code-verified clause)
- Left: the same seven items, with *the single-writer append discipline* attached to chaining (the body calls it *the real design work in the build*) and *the grinding attack named in requirements* attached to the beacon
- Size: a build → a build

---

## docs/slates/builds/agency-slate.md — 206 → 215 · Status UNBUILT → UNBUILT

Unbuilt, as stamped. `ExecutionContextApi.getActingAuthor`
(`api/execution-context.ts:500-525`) still resolves **one** principal from
the frame stack (the non-forced single-giver rule; the REST
`tagActingAuthor` stamp) — no principal/agent pair, no `onBehalfOf`, no
agency frame in `api/execution-context.ts` or `lib/security/`. `UseGrant`
is still the parcel lease shape (`lib/parcel/ParcelRecord.ts:95`,
`grants[]`; `parcel.md § grants[]`). The employment reading is exactly as
the slate has it: `BuyController.ts:256,261` calls
`EmploymentApi.ensureOperatorAt(venuePath)` then `operatingAccountOf` and
never consults the seller; `EmploymentApi.businessOfProprietor`
(`api/employment.ts:196`) is proprietor-only. **One new fact**: the sweep
deduplicated a second narrow agency into the kernel —
`AccessApi.isAgentOf(actor, owner)` (`platform/idea/api/AccessLogic.ts:146`,
*"a member of the group the parcel owner resolves to — the owner-conferred
authority a landlord's staff act under (Walter at Mayfield Row, Katie at
Duncan Hall)"*). It is group-membership-as-agency over a parcel owner, the
slate's *this person may act as this business* shape a second time, and the
generalization would subsume it too. Every link resolves
(`tails/incapacity-slate.md`, `psychology-slate.md`, `balance-slate.md`,
`delivery-slate.md`, `freight-slate.md`, `legal-code-slate.md`). One cut.
The file grew by nine lines because the status line and `Left` grew.

### Cut (SHIPPED · DOCUMENTED)
- the second status block *"design conversation, captured. Not requirements. Small primitive, wide reach…"* (17–19, 3) — history under the one-status-block rule; its one sentence of content (*small primitive, wide reach — it unblocks rather than does*) moved into the canonical status line

### Kept (UNBUILT)
- the status block (re-stamped) · *Captured* · the user quote · *Related*
- `# ⭐⭐⭐ The constraint that decides the shape` (still exactly true — `getActingAuthor`'s docstring: *NEVER taken from a caller-supplied value*) · `# ⭐⭐⭐⭐⭐ The rule: authority flows from the principal, attribution stays with the agent` · `# Scope` · `# ⚠ Guards` · `# ⭐ What it unblocks` · `## ⚠ Checked: employment is NOT agency` + `### Which tells us what agency is actually FOR` + `### There IS one hand-rolled narrow agency` (see Uncertain — there are now two) · `## ⚠⚠ Delegation is NOT agency` · `# Open questions` 1–5, all open

### Doctrine — kept, labelled
- *Agency is a property of the EXECUTION CONTEXT, not an argument to a function* (42–43) and *authority flows from the principal, attribution stays with the agent* (50) — the two theses; `call-security.md` carries the constraint they derive from (the principal is context-derived) but not the agency consequence, which describes an unbuilt thing
- *Code-trust NEVER flows through agency — the one axis nothing may launder* (98) — the standing wizard-axis rule applied; already doctrine in `access.md`'s code-trust lockdown and `balance-slate`
- *Place-derivation for the counter; agency for the road* (156) · *Delegation STEERS. Agency ACTS.* (180) — boundary statements between this and two other designs

### Uncertain — kept
- `### ⭐ There IS one hand-rolled narrow agency, just not that one` — there are now **two**: `businessOfProprietor` (the one it names) and `AccessApi.isAgentOf` (`AccessLogic.ts:146`, deduplicated from `isBuildingAgent` / `isDormsAgent` in the residence packs). Same shape (a narrow *may act as*), a second consumer the generalization must subsume; ⚠ `isAgentOf` opens with an `isWizard` short-circuit its own docstring calls *a known wrong shape* — which is the slate's *code-trust NEVER flows through agency* guard being violated by the very seam agency would replace. Requirements should name it
- `# ⭐ What it unblocks` → *"the custodian / receiver — currently a bespoke role in `contract.md`"* — `contract.md`'s only custodian is the custodian **bank** (escrow *custodied at the issuer's own bank*, l.180, 268, 347); there is no custodian / receiver *role* there. The bullet's pointer is wrong, or names the tails/incapacity-slate receivership that is unbuilt. Kept; requirements should re-source it
- Overlaps for the cluster pass: the UseGrant shape ↔ `psychology-slate.md` (the slate says so); deputies / impound-on-claim ↔ `tails/incapacity-slate.md` Q5; delegation ↔ `legal-code-slate.md`; the road commerce ↔ `delivery-slate.md` / `freight-slate.md` / `logistics.md` (logistics shipped — whether the haulage labor market resolves a payee off-venue is worth a look before requirements)

### Handoff
- none

### Status block
- Status: UNBUILT → UNBUILT (added the code-verified clause naming both hand-rolled agencies)
- Left: *the agency grant · the principal/agent split · the closed capability-kind vocabulary · the fiduciary / self-dealing guard · the code-trust non-flow rule* → the same five plus *subsuming the two hand-rolled agencies (a manager who is not the proprietor) · the record shape (Q2) · no sub-agents (Q3) · ratification (Q4) · agency under the principal's absence (Q5)* (the body wins: the subsumption case and four open questions were unrepresented)
- Size: a build → a build


---

## Batch totals

| slate | lines | Status | Left items | Size |
|---|---|---|---|---|
| eager-residency-slate | 239 → 233 | PARTIAL → PARTIAL | 6 → 6 (+3 sub-items) | a build → a build |
| client-audio-slate | 233 → 238 | UNBUILT → UNBUILT | 5 → 9 | a build → a build |
| odometer-slate | 230 → 219 | UNBUILT → UNBUILT | 5 → 6 (+Q1–Q5 attached) | a build → a build |
| lib-statics-homes-dossier | 220 → 38 | SUPERSEDED → PARTIAL (pointer stub; ABSORBED into value-object-statics-slate bar § 4) | 0 (no key) → 1 | (unstated) → a tail |
| deduction-slate | 216 → 224 | UNBUILT → UNBUILT | 8 → 12 | a build → a build |
| mirror-slate | 214 → 200 | UNBUILT → UNBUILT | 6 → 9 | a build → a build |
| record-integrity-slate | 213 → 218 | UNBUILT → UNBUILT | 7 → 7 (+2 sub-items) | a build → a build |
| agency-slate | 206 → 215 | UNBUILT → UNBUILT | 5 → 10 | a build → a build |

1,771 → 1,585 lines. Cuts: 15 entries SHIPPED·DOCUMENTED (10 of them in
the dossier; 5 are second status blocks) · 0 graduated (no write list) ·
4 superseded (the dossier's two tables + § 3 · mirror's *unwritten
siblings*) · 0 ABSORBED / 0 deletions (one pointer stub recommended for
deletion after its handoff lands) · 17 Uncertain entries · 6 doctrine
groups flagged · 3 handoff paragraphs (all from the dossier: →
`value-object-statics-slate` `Left`, → `lint-family.md § lint:lib-statics`,
→ `antipatterns.md`, the last optional).

Files touched: the eight slates above and this ledger. No subsystem doc,
no index file. Not committed.
