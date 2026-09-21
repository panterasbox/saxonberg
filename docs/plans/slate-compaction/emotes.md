# Slate-compaction pass — emotes batch ledger

One slate. Branch `design/slate-compaction`. Procedure:
`.claude/skills/compact-slate/SKILL.md`. Write list: `emotes.md` only.
Line numbers below are the ORIGINAL file's. Original saved under the
scratch dir `emotes/orig/` for diffing. Code was verified in
`packages/server/src/mud/lib/social/{Soul,Emote,EmoteGrammar}.ts`,
`platform/idea/SoulCatalogue.ts`, `platform/idea/cmd/social/{Emote,Soul,React}Controller.ts`,
`lib/command/CommandGiver.ts`, `lib/command/parsers/msh.ts`,
`lib/behavior/Behaved.ts`, `packages/content/expression/content/emotes/`,
`packages/content/platform/content/platform/cmd/social/{emote,soul,react}.yaml`
and `packages/client/src/components/social/`.

Four things a reviewer should know first:

1. **The old `Left` was too small, not wrong.** It named only the
   moderation control plane. The body also carries the Layer-2 client
   render toggle (no client code reads `social.emote.render`; nothing
   renders a frame's `payload.emoji`), Layer 3 (no `requires` field on
   `Emote`, no predicate seam), channel / remote-audience emotes (see 2),
   echo (see 3), and the moderation *primitives* the slate put in Wave 1
   (no `resolveExpressionPolicy`, no `strict` level, no sanitizer call site
   anywhere under `src/mud`). `Left` grew from 1 item to 8.
2. **`emotes.md` claims a channel / DM emote path that does not exist.**
   `renderEmote` / `renderFreeForm` have **no caller outside `Soul.ts`**;
   `ChatController` / `DmController` never touch emotes; `emotePrefixed` is
   consumed only by `CommandGiver._runChain`. Only a directed *target*
   crosses rooms (`scope: 'online'`). Two doc sentences said otherwise
   (§ SoulMixin *"Channel-routed and DM-handle-routed emote paths call the
   render methods"*; § What's deferred *"The canonical channel / DM
   audience ships now"*) — the code proves them false, so both were
   amended (recorded under *Doc fixes* below), and the slate's Reach /
   Echo / Provenance / comms sections are KEPT as the unbuilt design.
3. **`social.emote.echo` was never declared.** `Emote.echo` (the field)
   ships; the setting the slate and `emotes.md § What's deferred` both
   name appears nowhere in `packages/` — only `social.emote.render` is in
   `SoulMixin.settings`. Fixed in the doc; the slate's Echo section keeps it
   as design.
4. **The slot-kind decision is SHIPPED · UNDOCUMENTED.** `EmoteGrammar.ts:27-31`
   says why `literal` and `enum` were dropped (`literal` is redundant with
   the template text; `enum` was the moderation foundation and moderation is
   deferred); `emotes.md § The grammar substrate` states the two kinds with
   no why. Graduated. ⚠ This also makes the slate's kept moderation design
   **contradicted by the shipped taxonomy** — it stands on `enum` slots
   that do not exist — so *Typed grammar slots* and the whole *Moderation*
   section are KEPT and listed under Uncertain, not cut.

---
## docs/slates/tails/emotes-slate.md — 1177 → 741 · Status PARTIAL → PARTIAL

The trunk (Layers 0/1) shipped in 2026-06 and `emotes.md` carries it in
detail; reactions (Layer 4) shipped as its own build (`reactions.md`).
What has never had a line of code: Layer 2's client toggle, Layer 3, any
channel-audience emote, echo, and every moderation noun
(`resolveExpressionPolicy` / `strict` / `sanitiz` / `denylist` / `NFKC`
match nothing under `src/mud` except unrelated `Status.ts` / `GitLogic.ts`
hits). Code paths for the shipped half: `lib/social/Soul.ts` (mixin,
`social.emote.render` schema entry at :91, `act.emote` + `emotive-esp` at
:254), `lib/social/Emote.ts` (`echo` :47, `disabled` :62, `valence` :71 —
no `requires`), `lib/social/EmoteGrammar.ts` (`SlotKind = 'stuff' | 'free'`
:32), `platform/idea/SoulCatalogue.ts`, `api/soul.ts`,
`lib/command/CommandGiver.ts:1012-1037` (the inline fallback + free-form
on `emotePrefixed`), `lib/command/parsers/msh.ts:35` (`detectEmotePrefix`),
`platform/idea/cmd/social/{EmoteController,SoulController,ReactController}.ts`,
`lib/behavior/Behaved.ts:426-432` (`ctx.emote(verb)` → `SoulApi.resolve`),
`lib/character/Character.ts:103` (composes `SoulMixin`),
`packages/content/expression/content/emotes/*.yaml` (34 rows),
`packages/content/platform/content/platform/cmd/social/{emote,soul,react}.yaml`,
`packages/content/platform/content/platform/idea/Topic/act.emote.yaml`.

### Cut (SHIPPED · DOCUMENTED)
- the second status block *"Status: SHIPPED 2026-06 — substrate graduated…"* (10–15, 6) — history; the canonical block is kept and re-stamped
- `## Principle` → the *"The substrate decision: emoting is a capability on the being…"* paragraph (126–136, 11) — code: `Soul.ts`, `SoulCatalogue.ts`, `api/soul.ts`; doc: `emotes.md` intro + § `SoulCatalogue` + `SoulApi`. The "Soul" naming why inside it was undocumented → graduated (below). Pointer left; the three numbered claims above it are KEPT as doctrine
- `## What's already solved (don't relitigate)` (140–172, 33) — pre-existing substrate the slate chose not to redesign: `MessageFrame` body/topic/payload, topic + tags axes, the `Scene` audience split, `ProseApi` pronoun filters, structural `<name>` attribution → `messaging.md`, `topics.md`, `prose.md`. History; heading removed
- `### The capability: SoulMixin, parallel to VocalMixin` (199–251, 53) — code: `lib/social/Soul.ts` (`interface Soul`, `EmoteOptions.fills` :41, `emote`/`emoteFree`, Containable-wins routing), `Character.ts:103`; doc: `emotes.md § SoulMixin — rendering and verb-side send`. The naming/placement blockquote (`lib/social/`, `_mixinName = 'SoulMixin'`) shipped as written. Heading + pointer left
- `### The dynamic-verb seam (the one new engine bit)` (402–422, 21) — code: `CommandGiver.ts:1012-1037` (approach A, inline, no controller); doc: `emotes.md § Dispatch paths` (a). The optional (B) curated-subset schemas did not ship; the need it served (a visible palette) is met by `GET /api/emotes` → § The client read face. Heading + pointer left
- `### Free-form emote (the "emote" emote)` (424–435, 12) — code: `cmd/social/emote.yaml` → `EmoteController.ts`, `msh.ts:35` (`:` and `;`); doc: `emotes.md § Dispatch paths` (b), (c). Heading + pointer left
- `## Layer 4 — Reactions / aggregation (recommend its own slate)` (648–681, 34) — code: `cmd/social/react.yaml` (`react [--to] [--msg <#>] <emote>`), `ReactController.ts`, `client/src/components/ReactionBar.tsx`, `EmotePicker.tsx`; doc: `reactions.md` (§ The `react` verb, § Gutter → commandId, § Per-user controls, § The emote picker), `emotes.md § The Emote value shape` (`tags[0]` grouping). The recommendation was followed. Heading + pointer left
- `### Scenario A — catalog emote, directed + custom` (797–807, 11) — doc: `emotes.md § The grammar substrate` (three frames from one template; "happily" binds as a `free` slot after the optional `stuff` slot skips). Heading + pointer left
- `### Scenario B — free-form emote` (809–813, 5) — doc: `emotes.md § Dispatch paths` (b), (c). Heading + pointer left
- `### Scenario F — reaction (future reactions slate)` (837–841, 5) — doc: `reactions.md § The react verb`. Heading + pointer left
- `### Messaging` (863–869, 7) — shipped (topic `act.emote`, `.modality('emotive-esp')`, `toTarget` in heavy use) → `emotes.md § Topic and modality`. Heading + pointer left
- `### Prose` (871–876, 6) — shipped as the pre-bound `s`/`es`/`ies` variables + `verbForm` → `emotes.md § The grammar substrate`. Heading + pointer left
- `### Command routing / parsing` (878–886, 9) — shipped: the inline fallback + `EmoteGrammarRunner.bind` (positional, YAML order, greedy trailing `free`) → `emotes.md § Dispatch paths`, § The grammar substrate. Heading + pointer left
- Open questions **Q2** (952–954) `lib/social/` · **Q3** (955–957) `emote` + `:`/`;` · **Q6** (964–966) `act.emote` · **Q8** (972–974) conjugation variables + `verbForm` · **Q10** (977–980) reactions → own cycle, shipped · **Q11** (981–983) brains resolve by verb string through `ctx.emote(verb)` → `SoulApi.resolve` (`Behaved.ts:426`; `behavior.md` brain-context table, l.153) — each replaced by a one-line *Resolved →* note
- `## Build order` → Wave 1's shipped bullets (1025–1048, 24: `SoulMixin.emote()`, `Emote` + catalogue + `SoulApi`, bootstrap, the grammar/typed slots, ESP reach, echo reservation, the fallback resolver, `emote`/`:`) and the *`world.expression.emote` topic + client subscription* bullet (1055, 1) — replaced by one summary bullet that also names what did NOT ship from that wave (the echo setting, the moderation primitives). The moderation-primitives bullet and the mixed tests bullet are KEPT
- `## Build order` → Wave 2's *Optional `emoji` field + payload delivery* bullet (1064, 1) — code: `Emote.emoji`, `.payload({ verb, emoji, tags })` in `Soul.ts`
- `## Build order` → *Adjacent / future* → the Reactions bullet + the Comms-subsystem bullet (1077–1084, 8) — both shipped (`reactions.md`; `comms.md`, `chat.md`). Replaced by a one-line note
- `## What this slate does NOT cover` → the *Reactions/aggregation machinery* bullet (1097–1098, 2) and the *comms substrate* bullet (1118–1121, 4) — scope exclusions of things that have since shipped; removed
- `## Once shaped into formal requirements` → the `SoulMixin` bullet (1134–1136), the `Emote` record-shape bullet (1137–1140), the Reach bullet (1141–1143), the `Emote extends Document` bullet (1149–1152), the dynamic-verb bullet (1153–1154), the free-form bullet (1155), the Bootstrap bullet (1156–1157), the Layer-4-hook bullet (1167–1168) (18 lines) — all shipped (several in a different shape — see Superseded); the boil-down keeps only the unbuilt bullets + the mixed tests bullet + the closing paragraph

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- `### Typed grammar slots` → the *why* of the shipped taxonomy (not the slate's text — the code comment `EmoteGrammar.ts:27-31`) → inserted at `emotes.md § The grammar substrate` as the paragraph *"Why two, not the slate's four"* (11 lines: `literal` is the template text; `enum` was the moderation foundation and left with moderation; a moderation build revives it as a third `SlotKind`; pointer to the slate). ⚠ The slate section itself is KEPT (see Uncertain) — it is the unbuilt moderation design
- `## Principle` → the "Soul" term-of-art / `Soul`-vs-`Emote` naming split (inside the cut 126–136 paragraph) → inserted at the top of `emotes.md § SoulMixin — rendering and verb-side send` (5 lines)
- `## What emotes are NOT` (776–791, 16) — code: `Soul.ts` `emote()` composes + sends a Scene and mutates nothing; posture is `lib/posture/` → the *Not state changes / posture* bullet inserted at `emotes.md § What emotes are vs. what they aren't` as a new paragraph after *Emotes are NOT speech* (7 lines). The other two bullets (not dialogue, not a client decoration) were already in that section. Heading + pointer left

### Superseded — cut
- `### The catalog is content — its own Mongo collection` (253–334, 82) — by content-packs wave 2: a `documents` row of `kind: 'emote'` (`Emote` is a value shape over `data`, not a `Document` subclass; no `emotes` collection in `src/schema/`; `aliases` → `searchTerms`, never dispatched) → `emotes.md § The Emote value shape`, § `SoulCatalogue` + `SoulApi`, § The `soul` authoring suite. The runtime-authoring payoff shipped (`soul make`, title-gated to the soul committee). Heading + note left
- `### The grammar reduction (author less than the essay implies)` (336–371, 36) — by the code: one Liquid template per emote with `{% if %}` for slot presence (no `plain`/`directed`/`custom`/`customDirected` matrix); the *open sub-decision* (auto-derivation depth) resolved as all-explicit templates → `emotes.md § The grammar substrate`. Heading + note left
- `### Topic` (448–456, 9) — by the code: `act.emote`, not `world.expression.emote` (one leaf for catalog + free-form, payload distinguishes) → `emotes.md § Topic and modality`. Heading + note left
- `### Reach` → the first paragraph *"…no per-sense or per-medium gating… No modality…"* (460–471, 12) — by the code: reception IS modality-gated (`emotive-esp` in the recipient's sensorium via `SensorMixin.filterMessage`; the baseline `AetherImplant` confers it to every player, non-implant NPCs miss emotes) — the "just works" outcome holds for players, the mechanism is the opposite of ungated. Directed remote delivery shipped as `scope: 'online'` → `emotes.md § Topic and modality`, § Universal ESP target delivery. Note left; the audience paragraphs below it are KEPT (channel case unbuilt)
- `### Bootstrap & the starter roster` (552–582, 31) — by the `expression` content pack: 34 one-file-per-verb rows at `/expression/emotes/<verb>`, `PackApi.install` + three-way reconcile; no `seeds/social/emotes.yaml`, no `SoulApi.seed()`/`load()`, no `PersistenceManager.createIndexes` entry (the former `EmoteSeeder` is gone) → `emotes.md § Starter roster — the expression pack`. The ~40-emote list is content, not backlog (`bogleg`, `curtsy`, `beckon`, `facepalm`… are one `soul make` each). Heading + note left
- `### Persistence / MongoDB` (888–897, 10) — by the document-store row (above). Heading + note left
- Open questions **Q1** (942–951) catalog home → documents row · **Q4** (958–960) auto-derivation → one explicit template · **Q5** (961–963) fallback resolver + fetched palette instead of schemas · **Q17** (1011–1014) reach → modality-gated, channel audience still open — each replaced by a one-line *Resolved →* note naming the doc section

### Kept (UNBUILT)
- the status block (re-stamped) · the framing paragraphs · the provenance paragraph · *See also* (all links kept — none pointed only at a cut section; ⚠ the `persistence.md` bullet's annotation *"the emote catalog is its own MongoDB collection"* is stale inside spine — noted, not edited)
- `## Scope & layered design` — framing (the layer map + the moderation cross-cut). ⚠ Rows 0/1 and 4 of the table are shipped; kept whole as the slate's map
- `### Typed grammar slots (the moderation foundation)` — see Uncertain
- `### NPCs emote — and the immersion gate` — one paragraph, mixed: NPC parity shipped (`Character` composes `SoulMixin`; `Behaved.ts` `ctx.emote`), the per-source-class render lever (player vs NPC emoji suppression) has no code — `social.emote.render` is one global enum
- `### Reach` → *"So reach reduces to one question: who's the audience?"* + the three-context bullets + the closing paragraph — the channel-members audience has no dispatch path (see finding 2); directed-remote shipped as self + target at `scope: 'online'`
- `### Echo` — see Uncertain
- `### Provenance without the hokey prose` — see Uncertain
- `## Layer 2 — Emoji / hybrid rendering` — mixed: `Emote.emoji` + payload + the `social.emote.render` setting shipped (`emotes.md § What's deferred` says so); the client toggle (nothing under `packages/client/src` reads `social.emote` or renders a frame's `payload.emoji` — the only emoji consumers are the reaction picker/bar), the per-channel key and the per-source distinction are unbuilt
- `## Layer 3 — Honorary / entitlement-gated emotes` — no `requires` on `Emote`, no predicate seam (`emotes.md § What's deferred` confirms)
- `## Moderation` — all five subsections (`### The guarantee is structural`, `### The expression policy is a shared comms gate`, `### Free-text sanitization`, `### The remaining leak: entity names`, `### What's in scope here vs. the moderation subsystem`) — see Uncertain
- `### Scenario C` (mixed — the per-source setting half) · `### Scenario D` · `### Scenario E` · `### Scenario G`
- `### Shell / environment` — see Uncertain · `### Client` (mixed: the glyph-per-setting render unbuilt; the Layer-4 gutter + aggregation UI shipped) · `### Capability/entitlement (Layer 3)` · `### The comms subsystem (routing only)` (the channel-audience routing) · `### Speech (say/tell) + moderation`
- Open questions **Q7** (see Uncertain) · **Q9** · **Q12** · **Q13** · **Q14** · **Q15** · **Q16**
- `## Build order` — the intro paragraph (⚠ its second sentence is history), Wave 1's moderation-primitives bullet + the tests bullet (mixed: only the bold strict-mode test is unbuilt), Wave 2's setting-axes + client-render bullets, all of Wave 3, *Adjacent*'s entitlement sources / chaining / moderation control plane
- `## What this slate does NOT cover` — the remaining eight bullets (⚠ the *RPG capability system* bullet links `capability-magic-slate.md`; not verified, not my cut)
- `## Once shaped into formal requirements` — the echo, moderation-primitives, Layer 2, Layer 3 and tests bullets + the closing paragraph (⚠ which still says the reactions machine and comms substrate "wait for their own work" — one sentence, kept)

### Doctrine — kept, labelled
- `## Principle` → the three numbered claims (*natural language is the medium; an emote is a diegetic act; emoji is a presentation layer chosen by the recipient*) — the subsystem's thesis; claims 1–2 are realized by the shipped shape, claim 3's recipient-side half is the unbuilt Layer 2. Candidate home: `emotes.md`'s intro / § What emotes are (which already states the first two in its own words), or the slate

### Uncertain — kept
- `### Typed grammar slots (the moderation foundation)` (373–400) and the whole `## Moderation` section (685–773), Q7, Q13 — **kept but contradicted by the shipped taxonomy**: the design stands on `literal` / `entity` / `enum` / `free`; the code shipped `stuff` / `free` and dropped `literal` + `enum` *because moderation was deferred* (`EmoteGrammar.ts:27-31`). The strict-mode guarantee as written cannot hold on the shipped kinds (every catalog emote's manner slot is `free`). Requirements for a moderation build must revive `enum` (now graduated into `emotes.md § The grammar substrate` as the stated path) rather than inherit the slate's four-kind table as if it existed. Not cut: no `resolveExpressionPolicy`, `strict`, sanitizer or denylist exists anywhere
- `### Echo` (493–531) — `Emote.echo` (`'default' | 'always' | 'never'`) shipped as a reserved field; the `social.emote.echo` setting the section says v1 reserves does **not** exist (only `social.emote.render` is in `SoulMixin.settings`); the routing has no code and no channel emote to echo yet. `emotes.md § What's deferred` claimed the setting — fixed (below). Kept whole (paragraph rule)
- `### Provenance without the hokey prose` (533–550) — the mechanism it asks for (a `<chan>` region in the complete string) exists as an MML identity tag (`api/mml/tags.ts:61`) and chat posts carry channel identity as metadata (`chat.md`), but there is no remote emote to label. Kept as design for the unbuilt channel emote
- `### Shell / environment` (899–905) — `social.emote.render` shipped but **global**, not per-channel and with no player-vs-NPC axis (`Soul.ts:84-87` says per-channel is "reserved"); `social.emote.echo` absent. Kept whole
- `## Scope & layered design` → the layer table's *Lives in* column names `platform/idea/cmd/EmoteController.ts`, `catalog (home TBD)` — stale addresses inside a kept framing block
- Overlaps for the cluster pass: the moderation control plane + sanitizer + entity-name moderation ↔ any moderation slate (none found under `docs/slates/` by name — `ls docs/slates/*/ | grep -i moder` is empty; the slate calls it "its own future slate" and it does not exist yet); channel-audience emotes + echo ↔ `comms-slate.md` / `chat.md § deferred`; Layer 3 entitlement gating ↔ the advancement/conferral vocabulary (`advancement.md` conferrals are the nearest shipped "entitlement source")

### Doc fixes (existing sentences changed because the code proves them false)
- `emotes.md § SoulMixin — rendering and verb-side send`: *"Channel-routed and DM-handle-routed emote paths call the render methods… (channel members instead of in-room peers)."* → appended *"— that is the contract for them; **no such path is wired yet** (`renderEmote` / `renderFreeForm` have no caller outside the mixin — see What's deferred)."* Evidence: `grep -rn renderEmote packages/server/src/mud` hits only `Soul.ts`; `ChatController.ts` / `DmController.ts` contain no emote reference
- `emotes.md § What's deferred` → the *Layer 4 reactions + tags aggregation* bullet said *"no `react` verb, message-id surfacing, or client aggregation UI ships"* → replaced by a *since shipped* pointer to `reactions.md` (contradicted the same doc's § The Emote value shape, which already says `tags[0]` is consumed)
- `emotes.md § What's deferred` → the *Echo routing* bullet: *"and the parallel `social.emote.echo` setting reserve the data shape"* → *"(the slate's `social.emote.echo` setting is **not** declared — only `social.emote.render` is in `SoulMixin.settings`)"*; *"The canonical channel / DM audience ships now; the in-room echo waits"* → *"It waits on the channel path above"*
- `emotes.md § What's deferred` → **inserted** a new bullet *Channel / remote-audience emotes* (6 lines) stating that no dispatch path composes an emote to a channel or DM audience and pointing at the slate's § Reach / § Provenance — so the doc's deferred list matches the slate's `Left`

### Handoff (belongs in a doc outside my list)
- none. Nothing cut belongs in `reactions.md` (it already carries Layer 4 in more detail than the slate), `messaging.md` or `social-graph.md`. ⚠ For the coordinator, not a handoff: `packages/server/src/mud/lib/social/Soul.ts:10` carries the same *"Channel-routed and DM-handle-routed emotes call `renderEmote`…"* sentence as a code comment — code, not my remit

### Status block
- Status line: added what shipped (the mixin, the row + runner, catalogue + Api, the pack, the three dispatch paths) and the reactions pointer
- Left: *the moderation control plane — moderator verbs, per-scope expression levels + duration, the sanitizer implementation and shared denylist, audit logging and appeals, entity-name moderation* (1 item) → *the Layer-2 client render toggle (`social.emote.render` honoured, per channel and per source) · Layer 3 honorary / entitlement gating (the `requires` predicate seam) · channel / remote-audience emotes (routing over comms) · echo (the `social.emote.echo` setting + the routing) · the provenance label on remote emotes · the typed-slot taxonomy for moderation (`literal` / `enum`) · the moderation primitives (the shared `resolveExpressionPolicy` gate, the `free` / `strict` levels, the strict-mode structural guarantee, sanitizer call sites) · the moderation control plane (…)* (8 items — the body wins: seven unbuilt sections were unrepresented)
- Size: a wave → **a build**. The old stamp priced only the control plane. What remains is heterogeneous — the moderation seam alone (a pre-dispatch gate on `say`/`tell`/emote, a third `SlotKind`, the strict-mode tests) is a cycle; Layer 2's client toggle is a tail; Layer 3, the channel path and echo are each a wave on somebody else's build (chat / comms). Summed, more than one wave with no shared host — stamped *a build*; the coordinator may prefer to split it at the cluster pass (moderation → its own slate; channel emotes + echo → `comms-slate`/chat). ⚠ The file stays in `tails/` — the folder is derived from Size by the generated README, which I do not touch
