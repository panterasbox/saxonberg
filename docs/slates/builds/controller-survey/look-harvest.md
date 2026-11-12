# LookController — packages/server/src/mud/platform/idea/cmd/perception/LookController.ts (770 lines)
**What the command is:** `look [at|in|inside] <one thing>`, defaulting to `$focus` (the room); describes a detail, the room, a thing, or (with `in`) a container's ledger. View: `content/platform/cmd/perception/look.yaml` (one optional greedy object arg, `onExcess: prompt`, `--peek`).
**Verdict:** ~30% coordination, ~38% presentation, ~17% game rule, ~13% unclear (objects' self-reports appended by class), ~2% parsing/routing. A player can rewrite the wording, but cannot rewrite `look` without also re-triggering four world writes and re-knowing a dozen per-class facts that exist nowhere but here.

| lines | class | what it does | why this class | if misplaced: where it belongs, size of move |
|---|---|---|---|---|
| 1–75 | coordination | header, 20 imports, `LookModel`, `LOOK_INLINE`, `ROOM_LISTING` | the import list is itself the symptom: Fire, Employment, Chattel, Bulkable, AppSettings, Light | — |
| 74 `ROOM_LISTING` | unclear | `'here:i:visible:[not mixin.AdornmentMixin] - me'` — who/what is in the room | it is "what to show" (presentation) AND the honest-fog rule (a concealed thing is absent from your world); a rewrite that changes the query changes what you perceive | if rule: a named MQL seed/perception query (`here:perceived`), small |
| 81–84 | parsing/routing | `prep === 'in' \| 'inside'` → `lookInto` (self-dispatch on a word) | the view declared the prepositions and then the controller branches on which one bound | the view: a second shape `look in <x>` → the `inventory` ledger controller; small |
| 87–94, 603–615 | coordination | empty result → "You don't see any…"; non-Visible → "You can't see…" + notes | every controller writes this | — (the empty case is binder-shaped; see harvest) |
| 97–105 | coordination | renders what MQL bound: `via.detailPath` → detail; bound === location → room | dispatch on the SHAPE MQL returned, not on words | — |
| 109–111 | game rule | `isSoilable` → `await reconcileAiring()` before describing | reconcile-on-read of world state; a rewrite that forgets it shows stale cleanliness | the object: an async "settle before observed" hook every observer calls; medium (substrate) |
| 116–123 | presentation | `look in`: `InventoryController.ledger` or "is shut"/"nothing inside" | wording; but imports another controller's static | — |
| 137–177 | coordination + presentation | detail: `getDetailFor(viewer, dotted)`, tip + description | the object answers; controller frames | — |
| 209 | game rule (infra) | `PerceptionApi.preloadForSenseGate` before the band read — "the BOOT link"; without it every room is midnight | a rewrite that omits it silently changes the light of every room | `PerceptionApi`/vision: warm on use inside `perceivedBand`; small |
| 224–235 | presentation | "Your surroundings are indistinct." fallback | wording | — |
| 252–272 | game rule + presentation | `LIGHT_BANDS_TOO_DARK_TO_DESCRIBE` withholds the description and the card; `learnSurroundings` in the dark; glow; exits by feel | which band hides the prose is perception's fact; the words are presentation | perception/the place's describe, given the viewer's band; medium |
| 296–302 | coordination | `getMarkupLong(actor)` — the augmenter seam | the right seam, already | — |
| 305–308, 329, 480–485 | unclear | floor puddle (`BulkableApi.floorPuddleSummary`); help-wanted notices (`EmploymentApi.noticesAt`), sent uncarded | showing them is a display choice, but the KNOWLEDGE that these facts exist lives only here; a rewrite silently loses them | an (async) room augmenter each; medium (needs async augmenters + carded-prose) |
| 337–339 | game rule | `actor.learnSurroundings(location, visibleContents)` — writes the player's map document | a rewrite that drops the call stops the map learning; the controller decides WHEN a place is perceived | the dispatcher/perception: "a `sense.survey` of a place is a perception moment"; medium |
| 346–401 | presentation | loose contents (`getLooseContents`), occupants via `composeOccupants`, items resolved now | grouping, ordering, form; rules delegated | — (the double gate in 375–391 is a recorded perception defect, not look's) |
| 410–425 | game rule + presentation | hint candidates = contents + EVERY exit incl. hidden (`as unknown as Stuff`); `hintsFor`; tell or "doesn't sit quite right" | which things may hint is concealment's rule, assembled here | perception: `hintsFor(actor, place)` builds its own candidates; small |
| 436–439, 469–474, 726–733 | coordination | open card first, then `carded` meta, send | every card verb | — |
| 449–467, 557–588 | game rule + presentation | band line; tint line: reads raw `signalAt`, `colour.depth() < tintLegibleAt()` (an AppSettings dial with a 0.25 fallback, parsed here) | legibility of a tint is a perception threshold; only the sentence is look's | vision/`Light`: `legibleTint()`; small |
| 503–530 | presentation (with an embedded table) | glow in the dark: `brightestFireNear`, `FireApi.incandescenceOf`, fallback Kelvin→hue thresholds (2000/3000) | the words are presentation; the Kelvin table is a physical fact duplicated beside `incandescenceOf` | the fallback table onto fire/vision; small |
| 532–546 | coordination | `perceivedBandAt` with try/catch → null | plumbing | — |
| 618–620 | game rule | `actor.learnIdentityOf(target)` — writes the belief store | world write triggered by the verb; a rewrite forgets it and strangers stop being tracked | as 337–339; medium |
| 633–669 | unclear | appended by class: `isPlacing` → "On it/Hanging from it"; `isChattel` → "Owned by" (async, hides title-derived owners); `isDisplay` → `readScreen` (async) | each object's self-report; a rewrite must know all three classes exist | the mixins' (async) augmenters (slate § 2 rows 24–26); medium, blocked on async augmenters |
| 675–693 | presentation | Wearing/Holding/In it, four inline then `` `inventory kw` `` | the rule is `visibleContentsOf`; this is grouping and the cutoff | — |
| 701–723 | game rule | close look at a container runs `resolveSearch(actor, contents, 'glance')` + hints | looking is a perception ACT that discovers concealed things; drop it and players find less | perception/concealment: "a deliberate look is a glance", called by the same hook as 337; medium |
| 738–769 | presentation | exits line, door + `stateWord()` | wording; shared with the card in spirit only | `Exitable` if the card should share it; small |

**What a player rewriting it would be forced to copy today:**
- four world writes/settles: `reconcileAiring`, `learnSurroundings`, `learnIdentityOf`, the glance `resolveSearch`;
- the boot warm `preloadForSenseGate` (or every room is midnight);
- the darkness threshold and that no card opens in the dark;
- the per-class self-reports (puddle, notices, placing, owner, screen) and the hint candidate set;
- the tint dial parsing; the uncarded-scene workaround for anything the card would swallow.

**Hard cases (unclear) and the question each raises for a rule:**
- Puddle/notices/placing/owner/screen: is *what an object says about itself* the verb's presentation or the object's? If the object's, a rewrite gets them for free; if the verb's, every look-alike verb must re-know them.
- `ROOM_LISTING`: a display filter or the honest-fog rule? It is both; the hidden-thing exclusion is a game rule, the adornment exclusion is a display choice, in one string.
- `learnSurroundings`/`learnIdentityOf`: the act of perceiving has consequences. Is *when* you perceived something the verb's to decide (presentation of time) or a fact the dispatcher/perception should infer from the scene topic?

**Rules this controller suggests:**
1. **A rewrite must not be able to change what the world records.** Test: delete the controller body except one `send`; does any document/belief/map/discovery stop being written? If yes, that call is misplaced. Evidence: 337, 618, 706.
2. **The verb renders; the object reports.** Test: does the line branch on `MixinApi.isX(target)` to append that thing's own fact? Then it is the mixin's (augmenter). Evidence: 633–669, 305.
3. **Thresholds are the world's, sentences are the verb's.** Test: is there a number or dial deciding WHETHER something is perceived? It belongs to perception. Evidence: 252, 570, 523.
4. **No warm-up in a controller.** Test: would a replacement that omits the call render a different world? Evidence: 209.

---

# HarvestController — packages/server/src/mud/platform/idea/cmd/inventory/HarvestController.ts (199 lines)
**What the command is:** `harvest <plant|ground> [--at <field>] [--with <tool>]`, an engaged act whose plan the plant (or ground) returns. View: `content/platform/cmd/inventory/harvest.yaml`; sibling `HarvestWordedController.ts` (40 lines) overrides the three static word methods only.
**Verdict:** ~62% presentation, ~28% coordination, ~10% parsing/routing, ~0% game rule in the controller. The CONTROLLER reached the owner's goal; the conversion did not, because disambiguation (how it asks) and a raw-text resolution moved into the model, where no controller replacement can reach them.

| lines | class | what it does | why this class | if misplaced: where it belongs, size of move |
|---|---|---|---|---|
| 1–46 | coordination | header, imports, `HarvestModel` | — | — |
| 50–58 | coordination | no target → "You don't see any…" + `empty-result` | identical in look; every required-arg controller repeats it | binder: a required arg that bound nothing refuses there; small, cross-cutting |
| 59–68 | parsing/routing | `--at` typed but unbound → "You don't see any…" | the binder already bound or failed the option; controller re-checks its raw | binder: an option whose query matched nothing is refused by the binder; small |
| 69–77 | parsing/routing | `!isGrowing && !isCultivable` → "isn't a plant" | duplicates the view's `requires: GrowingMixin\|CultivableMixin`; exists for TS narrowing | a typed model from `requires:` (or an assertion helper); small |
| 78–83 | parsing/routing | builds the request; **`typed: model.target.raw`**; `isSoil(patchBound)` re-narrows the `--at` `requires: SoilMixin` | hands the player's raw words to the plant, which substring-matches its label (`Growing.ts` 1583–1585, `typed.includes(w)`, mid-word) to decide WHICH plant was meant | MQL: the label as a keyword on the plant, scored by `scoreCandidate`; drop `typed`; small–medium |
| 84–95 | coordination | `this.constructor` for static words; `engageAct(plan, {begin, refused, done})` | the plumbing; the static-through-constructor is forced because the controller is destructed when `execute` returns | the base could take the words object once; small |
| 97–133 | presentation | `refusalWords`: switch over 12 reasons, `never` exhaustiveness | wording — except below | — |
| 105, 107–109 | unclear | `part-unnamed`/`not-a-part-here` render `Mml.fromMarkup(line)` — prose the GROUND wrote (`Soil.resolvePartFor` → `soilPartRefusal()`) | the reverse leak: presentation (and the choice to REFUSE listing parts rather than ASK) lives in the model | the ground returns the parts as facts; the controller words or prompts; small |
| 115 | game rule (in words) | "a billhook, or an axe" | which tools satisfy is the plant's `getHarvestTool()` capability; the refusal facts don't carry `need`, so the words guess | add `need` to the refusal facts; trivial |
| 136–143 | presentation | `beginWords` | wording | — |
| 146–189 | presentation | `doneWords` by `pick`/`annual`/`swath`; dropped-in-the-row, last-of-it | wording over facts the plan returned | — |
| 192–198 | presentation | `standingPhrase` banding a fraction | banding a number into words is display | — |

**Did the conversion reach the goal?** For the controller, yes: no world reads, no world writes, the Worded sibling changes every word and nothing in the world. But the replacement test asks what a player could CHANGE, and three things a player plausibly wants to change are now out of reach of any controller:
- *how it disambiguates*: on a divided field, harvest refuses with the ground's own sentence listing the fields; a player who wants a prompt instead cannot, because the ground decided to refuse and wrote the words (`Soil.ts` 1146–1160);
- *which plant the words meant*: `Growing.harvestPlanFor` re-resolves the target from `req.typed` (label substring), `rootedAreaCrop` and `ripeSibling()` ("the binder takes the first match"). These are the one-resolution-rule slate's carve-outs, not removed but moved from controller to model, now invisible to both the view and MQL;
- the Worded exemplar proves only *wording* is swappable; it does not exercise asking, ordering or cadence, so it would pass even if those were locked.

**What a player rewriting it would be forced to copy today:** the two "don't see any" checks, the narrowing re-check, `typed: model.target.raw` (omit it and a labeled trial plant gets cut instead of the stand), and the static-word/`this.constructor` pattern.

**Hard cases (unclear) and the question each raises for a rule:**
- `line` from the ground: when the model refuses with a list of choices, is that a refusal (model) or a question (controller)? Rule needed: *a model returns the choices; the controller decides whether to refuse or ask.*
- `typed`: passing raw text to a model looks like clean "facts in" but is resolution by another name. Should `.raw` crossing into a model count against `lint:controller-resolution`?
- `ripeSibling()` substitution: "a ripe stand of the same kind beside it" may genuinely be a world fact (cutters cut the ripe cane), or an MQL ranking preference (prefer harvestable candidates). Which?

**Rules this controller suggests:**
1. **Disambiguation is presentation.** Test: if the model can return "you meant one of these", it returns the set, never the sentence. Evidence: 105–109 vs `Soil.resolvePartFor`.
2. **Raw words stop at MQL.** Test: does any request object carry `.raw`? Then a resolution rule is hiding in the model. Evidence: 80 / `Growing.ts` 1583.
3. **Refusal facts carry what the words need.** Test: a refusal sentence names something (a tool, a stage) not in its facts. Evidence: 115.
4. **The exemplar must swap asking, not just wording.** Test: a Worded variant that prompts instead of refusing should be writable with no model change. Evidence: `HarvestWordedController.ts` 22–39.
