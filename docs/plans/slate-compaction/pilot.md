# Slate-compaction pass — pilot ledger

Three slates, chosen to calibrate the rule on three shapes. Branch
`design/slate-compaction`. Procedure: `.claude/skills/compact-slate/SKILL.md`.
Write list: `pets.md` · `ranching.md` · `streaming.md` · `location.md`
(`ranching.md` needed nothing). Line numbers below are the ORIGINAL file's.

---

## docs/slates/builds/pets-slate.md — 1432 → 994 · Status PARTIAL → PARTIAL

⚠ The assignment read this slate's `Left:` as EMPTY and expected ABSORBED.
It was not empty — the stamp was written `**Left (Wave 2):**`, which the
README generator evidently does not parse. Wave 2 (the fear axis), Wave 3,
the off-screen life, home range, combat staging, welfare law and breeding
are all unbuilt (grep: no `homeRange`/`petLifeBetween`/fear/flee in
`packages/server/src/mud/**`; `PartyLogic.ts:276` still says *"Seam only;
pets are unbuilt this cycle"*; `CombatLogic.ts:3808` still culls
non-sentients; no `Stock` row's `stockLines` names an animal template).
The slate is a large PARTIAL. Re-stamped with a plain `**Left:**`.

### Cut (SHIPPED · DOCUMENTED)
- status block, the *"Read § Reconciliation 2026-09-08 before requirements"* pointer (16–22, 7 lines) — the three questions it points at all shipped; doc: `pets.md § The shape of it`, `§ Persistence`
- the stale second status block, para 1 *"design explored deep; not yet requirements"* (32–38, 7) — history; W0+W1 shipped (MR !257)
- `### The acquisition ladder` → **Adopted**: the *"purest statement of the spine"* blockquote + *cannot refuse the adoption, only the custody* (176–194, 19, except the two bullets listed under Superseded and Uncertain) — code: `lib/husbandry/Bonded.ts` (`FOLLOW_BOND`, `NAME_BOND`, the unnamed animal keeps no record), `lib/behavior/follows.ts`; doc: `pets.md § The verbs` (*"An unnamed animal is free"*)
- `### The acquisition ladder` → **Adopted**: anti-grind · cost · content bullets (197–207, 11) — code: `Bonded.offerRung`, `HOME_DAYS`, no number shown; `generic-objects/content/stuff/agent/cat.yaml` (the stray, on Hinkley Lane rather than the Duncan lobby); doc: `pets.md § Feeding` (*need paces the bond*), `§ The animal acts`
- `## The signature moments` → *"Free or nearly free"* block (251–258, 8) — code: `follows.ts`, `platform/idea/cmd/social/NameController.ts`, `feeds.ts`; doc: `pets.md § The animal acts`, `§ The verbs`
- `### Four needs — and only one is yours alone` (338–354, 17) — doc: `pets.md § The bond` (*"the floor stays delegable and the bond does not"*)
- `## Reconciliation 2026-09-08` → intro + `### What farmstead already paid for` (953–971 of the 953–1023 cut, 19) — code: `lib/creature/Creature.ts:109` (ChattelMixin composed; retires `CompanionMixin`), `lib/husbandry/Handling.ts`; doc: `ranching.md § Ownership`, `§ Handling`, `§ Three ROLES`
- `### DECIDED — Extras hold no beliefs` → paras 1–2 + the *latent, not live* status para (1026–1035, 10 · 1044–1048, 5) — code: `platform/agent/Extra.ts:52 keepsPersonalRegard() → false`, `lib/belief/BeliefStore.ts:768`; doc: `pets.md § Belief, recognition, age`. The institution-holds-the-opinion paragraph is KEPT (unbuilt — `institutionPath()` exists in `lib/employment/Employed.ts` but carries no regard)
- `### The MQL contract` (1109–1154, 46) — code: `api/mql/predicates.ts:76 isMine` (real now, via `stampedOwner()`), the `key` atom in parser+resolver; doc: `mql-grammar.md` l.440, `mql.md` l.451, `pets.md § Persistence` (`[mine]`). The three-storage-shapes table → Handoff below
- `### Lighter tier` → the maturation bullet (1196–1200, 5) — code: `ageCurve`/`lifeStageAt`/`massAt` (farmstead); doc: `race.md`, `pets.md § Belief, recognition, age` (senescence)
- `## The custody edge — RESOLVED: it's chattel` (1231–1256, 26) — code: `lib/creature/Creature.ts` composes `ChattelMixin`; doc: `ranching.md § Ownership, and the two one-liners`
- `## Build waves` → **Wave 0** D1/D2/D3 (1305–1328, 24) — code: D1 `lib/npc/Cast.ts:173` calls `hydrateBeliefs()`; D2 `api/mql/predicates.ts:76`; D3 `Extra.ts:52`; doc: `pets.md § Belief` (a `Cast` NPC's regard survives a restart), `§ Persistence`
- `## Build waves` → the *"(2026-07-30 — the two cheap answers …)"* paragraph (1356–1362, 7) — history of a plan that shipped

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- `### ⭐⭐ DECIDED — the bond composes per CLASS, not by hierarchy` (973–1022, 50) — code: `lib/creature/KeptAnimal.ts` (BeliefStore + Handling composed side by side on a `Creature`), `lint:kept-animals` → inserted at `pets.md § The shape of it` (16 lines: the three states true/false/null, why universal composition is unfalsifiable, why not `Character`)
- `### ⭐⭐⭐ DECIDED — a pet is a KEYED CLONE, not a minted singleton` (1049–1107, 59) — code: `NameController.ts` + `Bonded.ts` (explicit persistence key set at naming; owner-persisted chattel; estate reference) → inserted at `pets.md § Persistence` (19 lines: why not the `Avatar` mint, why identity+durability arrive together, why not seed+overlay)

### Superseded — cut
- `## Care & loss — light, on purpose` (283–322, 40) — by the code: regard never decays, handling decays to a floor, *difficult not feral*; D29 puts a pet under the one mortality rule → `pets.md § The bond`. Heading + one-line note left
- `### The acquisition ladder` → Adopted: *"Proximity buys opportunity; who you are decides"* + *"The cat can pick the wrong person"* (183–189, inside the 176–194 cut) — by the code: the bond is hand-feeding regard × handling; trait-compatibility and reputation do not enter it (`Bonded.ts`)
- `### Newly constrained — the 12× tending cadence` + `### The hole the clock change opened — CLOSED` (909–935, 27) — by `pets.md § The bond` (the bond's own clock; *asymptotic, never dead* was corrected by D29). One-line note left; the off-screen hole itself stays open in § The off-screen life
- `### Not a gap — a design decision` (1214–1230, 17) — by `pets.md § The shape of it` (already self-marked superseded). Heading + note left
- `## Sibling consumer — livestock & ranching` (1257–1302, 46) — by `ranching.md § Three ROLES, not three kinds of object` (the *Engine tier: Pet = Character* row is false). Heading + note left
- `## Scope guardrails` → *"Tameable fauna are Character-tier carves"* (1431–1432, 2) — by `pets.md § The shape of it`. Struck bullet + note left

### Kept (UNBUILT)
- `## The frame` · `## The spine` + `### Three layers` · `### Domesticability is a dial on the fear axis` · `### The taming encounter (Wave 2)` — the fear axis; nothing in code
- `### The acquisition ladder` → **Buy** (no pet-shop `Stock` row anywhere) · **Tame wild** · **Magic**
- `## The signature moments` → the brain tier (fetch, BUC sniff), shop-theft, deferred-but-shaped
- `## Bonding + needs` → the governing rule, `### The acts` (play/groom/preferred food unbuilt), `### The anti-grind is that the animal can say no` (the appraisal reaches only `offer` today — `pets.md § Open`), `### Care quality decides what it becomes` (training as transcript — `ranching.md` l.403 *"a follow-on beside pets"*), `### The cadence, at 12×`
- `## The off-screen life` (all subsections) + `### Home range`
- `## Combat` (all subsections) — `PartyLogic.sideOfImpl` rung 2 still a comment; `formationPathOf` two-rung; staging still keyed on `isSentient`
- `## Scale, welfare, and the law` (all) — no land-use companion ceiling (`lib/parcel/LandUse.ts:113` names companions only in a summary string)
- `## Breeding as an industry` (all) — `BreedController.ts` writes *served* only
- `## Reconciliation 2026-07-31` → `### Settled elsewhere` (mixed table), `### Newly constrained — the residence gate`, `### Cheap inheritances` (mixed)
- `## Reconciliation 2026-09-08` → the institution-held-opinion paragraph
- `## Subsystem stress` → intro, the structural-gaps table (the fear row), `### The legibility gap`, `### Lighter tier` (spawning + the wiring bullet)
- `## Build waves` → Wave 1 (mixed table: shop + off-screen life unbuilt), Wave 2, Wave 3
- `## Open questions` · `## Scope guardrails` (spine)

### Uncertain — kept
- Adopted → *"An adopted stray is no longer available to adopt anyone else"* — looked for exclusivity in `Bonded.ts`/`follows.ts`; regard is per-person in `BeliefStore`, nothing makes a stray exclusive; unsure whether that is unbuilt or rejected
- `## The off-screen life` — its outcome ladder has **Feral** and an *asymptotic, never dead* condition curve; both are contradicted by shipped decisions (`pets.md`: *difficult, not feral*; D29). Kept verbatim because `Left` names the off-screen resolution; requirements must reconcile
- `### The acquisition ladder` → Buy: *"every stocked animal is a Character-tier NPC pinned in memory"* and `## Scale` → the compute row — the mechanism is now the residency PIN on the chattel row (`pets.md § Persistence`) and a `KeptAnimal` is a `Creature`; kept inside unbuilt sections
- `### It works TODAY — but through the wrong door` — cites `class: /lib/npc/NPC` and `seeds/...` paths that no longer exist (`NPC` retired → `Extra`/`Cast`); the parenthetical *"CombatantMixin sits on Character … tameable fauna are Character-tier"* is stale. Kept inside the kept Combat section
- `### The legibility gap` — *"Sneak/crawl and auditory detection are explicitly deferred"* is stale (`stealth.md` shipped `sneak`/`run`); the manner-of-approach seam for Wave 2 is still open, so kept
- `### Lighter tier` → the wiring bullet — follow brain, `give`→`offer`, the dub verb (`name`) all shipped; *teleport carrying co-occupants* unverified (`ResidencyLogic.ts:117` mentions co-occupants only for residency); kept whole per paragraph rule
- Overlaps for the cluster pass: breeding ↔ `ranching-slate § Breeding`; the residence gate ↔ `stewardship-slate`; the Wardens/Grange split ↔ `guild-slate`

### Handoff (belongs in a doc outside my list)
- → `mql.md § The predicate / atom table` (beside the `key` atom), verbatim from the cut § The MQL contract:

  > **How the rest of the family interoperates** — three storage shapes, three
  > answers, and the middle row surprises people:
  >
  > | storage shape | examples | MQL |
  > |---|---|---|
  > | Stuff + keyed snapshot | cultivated plants, a holding's rooms, **pets** | ✔ visible; `mixin.X` + `[key=…]` |
  > | **Document** | herds, water rights, bills of lading, rate cards | ✘ **not queryable at all** — MQL is over Stuff |
  > | **Seeded, unmeasured** | heads before `draft`, deposit samples, ground character | ✘ **invisible by construction** — not in the registry |
  >
  > ⚠ **The herdbook is not MQL-able.** Herds are filed records read through
  > their register; no query reaches them. Know this before designing a verb that
  > assumes otherwise.
  >
  > ⚠ **Do not infer "is it tamed" from key presence.** `has` is a documented
  > no-op outside `prop.K`, so key-presence is not cleanly testable in the
  > grammar — and inferring state from storage is the same dishonesty the
  > city-watch decision rejects. Tamed is a mixin or a property, so the query
  > language can see it and the abstraction carries it.

### Status block
- Left: *(Wave 2) the accept/refuse hook for the OTHER verbs · the off-screen resolution + digest · home range · pet combat staging · breeding · the producer gap · the `cast:` re-mint* → *the fear/threat axis + the wild taming encounter (Wave 2) · the pet shop · the accept/refuse appraisal for `pet`/`call`/`stay` · fetch / BUC-sniff / guard brains + training as the animal's Discipline transcript · the off-screen resolution + digest + `Species.homeRange` · pet combat (the `sideOf`/`formationPathOf` owner rungs; staging + blame by ownership) · the companion ceiling + welfare law · breeding · the residence gate · the institution-held opinion for Extras · wild population / spawning + magic taming (Wave 3) · the producer gap · the `cast:` re-mint*
- Size: a build → a build

---

## docs/slates/tails/external-chat-relay-slate.md — 259 → 49 · Status PARTIAL → PARTIAL

### Cut (SHIPPED · DOCUMENTED)
- framing paras *"The relay turns a Twitch channel's chat into a frequency …"* + the panterasbot paragraph (32–43, 12) — shipped shape: `streaming.md` l.7 (*your own linked identity*); the retro is graduated (below)
- See also → `chat-slate`, `chat.md`, `messaging.md`, `message-rendering-slate` entries (50–63, 14) — they existed only for the cut sections
- `## Inbound (Twitch → game)` (109–127) — code: `mud/platform/idea/StreamRelay.ts` (`deliver` via the `onMessage` chokepoint), `backend/TwitchRelayReader.ts`; doc: `streaming.md § The relay state` (*"external speakers have no `Stuff` actor, so not `.scene`"* — the stringly-speaker wrinkle, stated), `§ The transports`
- `## Outbound (game → Twitch)` (129–149) — code: `backend/TwitchClient.ts:29,354` (`HELIX_CHAT_MESSAGES_URL`, `sendChatMessage`), `TwitchRelayReader.ts:116`; doc: `twitch-relay.md` (Helix, the incremental-scope reauth flow), `streaming.md § The transports`
- `## The echo problem` (151–167) — code: `StreamRelay.ts:51,256` (`ECHO_TTL_MS = 15_000`, `noteEcho` — tag-and-suppress, the recommended option); doc: `streaming.md § The transports` (*echo-suppress*)
- `## Provenance rendering` (169–178) — doc: `streaming.md § Identity / rendering` (service-coloured glyph on `relayTemplate`)
- `## Transport choices` (180–188) — code: `TwitchClient` EventSub session; doc: `streaming.md § The transports`
- `## Rate limits & flooding` (190–200) — doc: `streaming.md § The transports` (*token-bucket throttle*), `youtube-relay-slate` inherits *per-player + global token-bucket*
- `## Build waves` (247–259) — W1/W2 shipped; W3 is `youtube-relay-slate.md`
- (all of 69–216 and 232–259 replaced by one pointer line)

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- `## Why this is tractable now (panterasbot retro)` (233–245, 13) — code: `TwitchClient.sendChatMessage` is a stateless POST; no per-user socket anywhere → inserted at `streaming.md § The transports` after the Twitch paragraph (8 lines: outbound stateless under the player's token, one shared reader, never a per-user socket)

### Superseded — cut
- `> **Original shape (superseded for Twitch)**` block (22–31, 10) — by the retained 2026-07 status block, which already says how it landed
- `## Principle` (69–84) · `## The model: a binding facet on Channel` (87–107) · `## Reused vs. new` (202–215) — by the code: no `externalBinding` on `Channel`, player-initiated + memory-resident `StreamRelay`, not admin-curated → `streaming.md § The relay state`. One-line note left

### Kept (UNBUILT)
- `## YouTube (deferred — why)` — live-only + quota; `streaming.md § YouTube boundaries this cycle` confirms outbound is deferred

### Uncertain — kept
- The one remaining item is wholly owned by `youtube-relay-slate.md` (its `Left:` lists `liveChatMessages.insert`, the quota accountant, per-player `youtube.force-ssl`, the `GoogleProfile` extension). Per the rule (*two slates, same open thing → keep both*) this stays PARTIAL, a 49-line stub. **Merge candidate for the cluster pass** — nothing here is not also there
- *"per-player throttle + a global send queue"* — only the token bucket is verified in `streaming.md`; grep for `queue` in `TwitchClient.ts`/`TwitchRelayReader.ts` found nothing named so

### Handoff
- none

### Status block
- Left: *YouTube outbound* → *YouTube outbound (the design is owned by youtube-relay-slate.md; only the "why deferred" remains here)*
- Size: a tail → a tail

---

## docs/slates/builds/lounge-slate.md — 2373 → 2166 · Status PARTIAL → PARTIAL

Most of the body (l.430–2373, *Lounge, revisited*) is unbuilt design for
exactly the things `Left` names — grep: `pizza` 0 files, `jukebox` 0,
`waiter` 0, `lost-and-found` 0, no `seedMember`/`toppings`/`route`
matchmaking in `world/lounge/**` (`LoungeWarren.ts` ships `admitArrival`
least-full, `attachmentFor`, the bud/merge band; `location.md § Deferred`
lists toppings/matchmaking/the order console). The cuts are in the
original 2026-07 design (the shipped Warren + Dave's Bar) and in the
terminal/arrival section.

### Cut (SHIPPED · DOCUMENTED)
- the stale second status block *"design set; v1 is the social-elastic lounge + Dave's Bar shell"* (10–18, 9) — history; superseded by the current block
- `### The lounge as a LoungeWarren` → the commons-fixtures paragraph (133–138, 6) — code: `saxonberg-lounge/content/world/lounge/thing/terminal.yaml` (`seatIn: /world/lounge/idea/warren`), `world/lounge/idea/LoungeWarren.ts` (`wireHostFixtures`, `getBudThreshold`); doc: `location.md § Base mechanism vs lounge policy`
- `### Dave's Bar — the anti-lounge` → *"Drinks are vitals consumables"* + the two effect bullets + the sequencing note (238–255, 18) — code: `lib/metabolism/`, the bottles under `trade-distilling`/`trade-brewing`; doc: `crafting.md § Drink → metabolism (honest alcohol)`
- `### Wiring (mostly consumed)` (269–281, 13) — doc: `location.md § Landing: the startLocation spawn instruction`, `§ Recall (placement capture)`; `fasttravel.md`
- `### B — at the bar` (297–306, 10) — content: `world/lounge/location/bar.yaml`, `agent/dave.yaml`, `thing/bar-menu.yaml`, `thing/bar-counter.yaml`; doc: `crafting.md § Dave's Bar content`
- `## Build order` → **Wave 2** (354–357, 4) — effectful drinks (`crafting.md`), scripted Dave (`npc-dialogue.md` l.82: Dave is the first consumer of dialogue conditions; `dave.yaml` `behaviors:`)
- `## Once shaped into formal requirements` (390–427, 38) — history: the requirements doc was written and retired (`location.md`: *promoted via multilocation-lounge-requirements.md*); every unbuilt item it summarizes remains in its own section
- `### Settles open question 6` (704–710, 7) — code: `saxonberg-lounge/content/settings/lounge.yaml` (startLocation stamped at mint), sleep-as-logout (`residence.md § History — the furnishing build`)

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- `### The rule: "a mud in a mud"` (609–627, 19) · `### Arrival: a MOBILE terminal` (628–650, 23) · `### Departure: in the COMMONS` (651–669, 19) · `### And the bar is a destination, never a passage` (685–703, 19) — code: `terminal.yaml` (self-seats into the live host; `getArrivalRoom()` is `getContainer()`; the `LoungeTerminal` subclass retired by TPA reform P6), `LoungeWarren.attachmentFor` (north reserved for Dave's), `wireHostFixtures` → inserted at `location.md § Where the terminal stands, and why` (18 lines, a new `###` under *Base mechanism vs lounge policy*: the terminal as the load-balancing decision made physical; visible in the commons because a departure is an invitation; the bar a destination never a passage; the no-geography rule). One pointer line left under the `## Terminals, arrival …` heading

### Superseded — cut
- `### The flavor system` → the starter palette table (147–159, 13) — by `§ The palette` and `§ The menu — the mapping is PUBLISHED` in the same slate. One-line note left
- `### Dave's Bar` → *"Cocktails — decided-but-deferred"* (256–268, 13) — by the code: cocktails, employment and shifts shipped (`platform/thing/CocktailShaker`, `world/lounge/idea/business.yaml`, `employment.md`) with technique as an **open vocabulary the instrument owns** (`crafting.md § Technique`), not a continuous taste-profile; robots did not ship

### Kept (UNBUILT)
- `## Principle` · `### The lounge as a LoungeWarren` (the two unbuilt overrides) · `### The flavor system` (the principle + shape leans) · `### Seeding the tag-set` · `### Routing feel` · `### Dave's Bar` (the Dave paragraph — see Uncertain) · `### A` · `### C` · `## Open questions / forks` · `## Build order` W1/W3 (mixed) · `## What this slate does NOT cover`
- everything from `# Lounge, revisited` onward except the four graduated subsections and Q6: the constraints, start-a-table, the logout correction, furniture as scaffolding, no mechanics, the pedagogy + three guards, the minigames sandbox, the demo reel, the discipline, `### The threshold is PSYCHOLOGICAL` (see Uncertain), the pizza (all), the remote/screens/broadcasting (all), the remote's danger (all), the standing signal (all), the gameability doctrine, props/symmetry, the toppings as discipline families, the jukebox, staff/ownership/infinity, the lost-and-found + bin, the pizza end to end, the menu, parlor games, the deck in a CLI, screens: access vs attention-in-common

### Uncertain — kept
- *"Dave is a blank slate"* (decision 6, Principle 6, the Dave paragraph in `### Dave's Bar`) — `agent/dave.yaml` authors an **established** character: a washed-up actor with a Bruce Willis impression, three dispositions, a full dossier (`archetype: proprietor`, prologue, competence, renown). The premise is contradicted by content, but `Left`'s *emergent-personality Dave* rides on it; kept and flagged for requirements
- `### The threshold is PSYCHOLOGICAL` (a farewell narration on departure) — looked for *"steps into the terminal"* / *farewell* in the tpa pack; my grep path was wrong (`lib/fasttravel` does not exist) so this is unverified; kept
- `## Open questions` Q1 (drink effects — answered: effectful) and Q7 (the *Moonlighting* easter egg — `dave.yaml`: the obscure show stays buried, the Bruce Willis bit is kept direct) are answered by content; kept because open questions are spine
- `## Screens: access vs attention-in-common` + `### Two kinds of screen` — `display.md` ships `Screen`/`Remote` + the `remote` pairing but **no lounge row** (`display.md § The instances` points back at this slate's *Themed booths*), and does not state the attention-in-common rule or the lounge/Terminus split; kept as unbuilt
- `## What this slate does NOT cover` links `vitals-slate` / `fast-travel-slate` which may be retired; left for the sweep
- Overlaps for the cluster pass: the bar paragraphs (Dave, the demo reel, house games as a business) ↔ `daves-bar-slate.md` (PARTIAL); the Warren ↔ `multilocation-slate.md` (still present)

### Handoff
- none

### Status block
- Left: *the pizza-as-consensus toy · the TV/remote standing signal + the derived channel lineup · the jukebox · the social minigames · emergent-personality Dave* → *the flavor tag-set + `route` matchmaking + `seedMember` (the pizza-as-consensus toy: the served pie, the ordered slice, the standing order, the robot last mile + the pass + the pizza line, the published menu) · start-a-table growth · the departure ceremony · the lounge furniture (the contested screen + the remote as a standing signal, the info screen, the derived channel lineup + broadcasting as a business, the notice board, the window, the lost-and-found + the bin, unbuckling) · the jukebox in the bar + the aether update · the parlor games (the unrefereed deck, the board + rules-as-brain) · the soft-skills evidence framing (evidence in, no rewards out) · emergent-personality Dave*
- Size: a build → a build

---

## Calibration notes for the fan-out

1. **The stamp key must be literally `**Left:**`.** `**Left (Wave 2):**` read as empty upstream and nearly got a 1,400-line live slate deleted. Check the body before trusting a parsed "empty".
2. **A kept UNBUILT section can contradict a shipped decision** (the off-screen life's *Feral*; Dave the blank slate). The rule says keep verbatim; it should also say *flag it under Uncertain* so requirements sees it — which is what this ledger does.
3. **Older `> **Status:**` blocks are history, not spine.** Both big slates carried two or three; I cut the stale ones and kept the current block plus any framing paragraph with content of its own.
4. **"Shipped in a different shape" was the most common class**, not SHIPPED·DOCUMENTED — adoption-by-compatibility → hand-feeding; feral → difficult; cocktails-as-taste-profile → technique vocabulary. Each needed a one-line note naming where the shipped shape is written.
5. **A slate whose only remainder is owned by another slate** (the relay) survives as a stub under the two-slates rule. The cluster pass wants an *ABSORBED into <slate>* outcome.
6. **Nested bullets under a cut parent** — I kept the parent's opening lines as context for the surviving child bullet rather than orphan it; a reviewer may prefer the stricter cut.
