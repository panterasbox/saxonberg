# Specimen sheet: places and ideas

I traced this statically against `/home/claude/panterasbox/saxonberg`. I ran nothing, because deps aren't installed.
Paths are relative to `packages/server/src/mud/` unless they start with `content/`, which means `packages/content/`, or with `client/`.
"LC" means `platform/idea/cmd/perception/LookController.ts`. "SC" means `.../SenseController.ts`. "SSB" means `.../SingleSenseControllerBase.ts`.

---

## 0. Shared machinery (read this first; every place specimen uses it)

### 0.1 Bare `look` at a place: LC `lookAtLocation`, lines 170–480
The order of what gets emitted is below.

1. **Band read**, LC:201 `perceivedBandAt(actor, location)`. This is per-viewer, and the species `visionProfile.bandShift` applies to it. Thresholds come from `docs/subsystems/light.md:146-153`: `<1` pitch-black, `1–5` very-dim, `5–20` dim, `20–60` lit, `60–200` bright, `≥200` blinding.
2. **Too dark** (`pitch-black` or `very-dim`), LC:250-264. The room's prose is **withheld**. The viewer gets one uncarded scene containing the band phrase plus `── Obvious exits: …`, and **no card opens**.
   - `pitch-black` gives *"It is pitch dark. You can make out nothing of the place at all."*
   - `very-dim` gives *"Shapes and edges, no more — enough to move by, and to find a door."*
   - Both strings are at `lib/perception/Light.ts:124-133`.
3. **Body** (this gets CARDED). Lines join with single `\n` and no blank lines.
   - `Mml.location(location)` is the header. It is a late-bound `<location>` ref.
   - `location.getMarkupLong(actor)` follows, trailing whitespace trimmed (LC:289). This is the authored long text after every `static markupAugmenters` in the class chain has run, folded **root→leaf** (`api/mixin.ts:2382-2403`). That means `DetailedMixin.wrapDetailKeysAugmenter` runs *before* `VisibleMixin.senseStripAugmenter`. Detailed sits deeper in `Place`'s chain, and this contradicts the comment at `lib/description/Visible.ts:168-172`.
   - The floor puddle, if any (LC:297): `"A puddle of ${appearance} pools on the floor."` (`platform/idea/api/BulkableLogic.ts:706-717`).
   - `── Obvious exits: <exit>dir</exit>, …` from `actor.learnSurroundings(location, visibleContents)` → `obviousExitsFor(viewer)`, which is **per-viewer** (LC:330, `lib/boundary/Exitable.ts:594-598`). A door shows as `dir (door, stateWord)`.
   - `── You also see: <occupants>, <items>.` (LC:336-391).
     - Organisms go through `actor.composeOccupants`, which is density-collapsed according to `social.verbosity`.
     - Inert items render as `Mml.thing`, resolved eagerly.
     - Placed items (things ON a host) are excluded via `getLooseContents`. So are adornments, and so is anything the viewer doesn't `perceives`.
     - `Mml.list` switches to block layout (one item per line) past 4 items (`api/mml.ts:291`). Identical items are **not** grouped.
   - Passive concealment hints (LC:401-417). For each concealed and undiscovered content or exit within `concealment.hintCutoff` of the viewer's perception, the authored `hint` is printed, or *"Something here doesn't sit quite right."* if there is no hint.
4. **Card open**, LC:428: `CardApi.open(context,'subject',{prose: body, subjectId})`.
5. **Separately sent, UNCARDED** (each is its own `sense.survey` scene):
   - The light band phrase, if it isn't null (LC:441-447). Only `dim` (*"It is dim here; you can make the place out, but not much of it."*) and `blinding` (*"The glare here is hard to look into."*) have a phrase. `lit` and `bright` print nothing.
   - The tint line (LC:456): *"The light here comes ${word}-tinted through the glass, and lies ${word} on the floor."* It needs a coloured boundary conduit, such as a stained window. None of the specimens has one.
6. **The body scene**, marked `meta.carded = instanceId` (LC:465). The client suppresses it from the transcript when the card is on screen (`client/src/store/cardFeedSlice.ts:242-254 cardedFrameIsCovered`).
7. **Notices, UNCARDED** (LC:470-477): `"A notice here: " + opening.describe()`. The describe string is `"HELP WANTED — ${noun}${, pay}${ (N places)}; ${asks|no prerequisite}."` (`lib/employment/Opening.ts:66-73`).

Send order in the transcript: band phrase → tint → room body (hidden if carded) → notices.

### 0.2 Bare `sense`, which is what every ARRIVAL runs
`lib/spatial/Mobile.ts:610-618 autoSenseOnArrival` calls `forceCommand('sense')`.

SC `senseLocation` (SC:150-247) is **not** the same as `look`:

- It has **no light-band check at all**. A pitch-black room still prints its full prose and opens a card.
- It has **no band phrase, no tint line, no puddle line, no help-wanted notices, and no concealment hints**.
- Prose is `getMarkupLong(actor, { filter: sensorium })`.
- `── You also see:` lists people and things together through `Mml.actor`, with no `composeOccupants` density collapse (SC:206-221).
- It opens the subject card (SC:235) and marks the body carded.

**Consequence:** on first arrival a browser player sees the card and nothing else from the room. Light, notices and hints exist only for players who type `look` afterwards.

### 0.3 `smell` / `listen` / `feel` / `taste` at a place
These are the SSB subclasses.

- `smell` (`SmellController.ts`) prints *"You smell X — from A, B."* when the smell modality's concentration at the location reaches the species acuity threshold (`normal`=10).
- `listen` prints *"You hear X — from …"* when amplitude ≥ 10 dB (`lib/perception/Sound.ts:80`).
- **Otherwise both fall through to `SSB.senseLocation` (SSB:140-170).** That prints the header plus `getMarkupLong(actor, {filter:[channel]})`.
  - `stripBySense` keeps **all untagged prose** (`api/mml.ts:1093-1130`). Only `<sense channel>` regions are dropped, and `<detail>` wrappers lose their anchor.
  - So in a room whose prose has no `<sense>` tags, `smell` and `listen` **print the whole visual description again**.
  - It is uncarded, and there's no exits or contents line.
- The universe biome declares no `_defaultAmbientSoundLevel` (`content/base-library/.../biome/universe.yaml`), so the ambient sound floor is 0 (`platform/idea/modalities/SoundModality.ts:111-120`).
- **Biome `_ambientSmellMml` / `_ambientSoundMml` have NO consumer anywhere.** A grep finds only the getters at `lib/biome/Biome.ts:325-336`.

### 0.4 The card, as wire and as render
**Fields.** `DETAIL_FIELDS` (`api/mql-subscription.ts:120-137`) is the field set. Each field is projected only if some mixin on the subject declares a `subscribableFields` descriptor for it.

| field | source | value for a room |
|---|---|---|
| displayName | `Stuff` `getPresentation()` | header phrase; also the card **title** (`platform/idea/CardRegistry.ts:409-411`) |
| primaryKeyword | `Perceptible` | first keyword |
| shortDescription, longDescription, illustration | `Visible` (`lib/description/Visible.ts:185-226`) | `longDescription` = `getMarkupLong(viewer)` **with augmenters** (detail anchors, stand phrase…) |
| details | `Detailed` | `[{ids:[key,...keywords], description, hasChildren}]`, viewer-lensed |
| contents | `Container` (`lib/spatial/Container.ts`) | REF_FIELDS per loose, visible, perceived child (`displayName`, `quantity`, `primaryKeyword`, `placement`, `holds`) |
| exits | `Exitable` (`lib/boundary/Exitable.ts:386-420`) | `getObviousExits()` → `{direction, door?}`. ⚠ **viewer-blind**, not `obviousExitsFor(viewer)` |
| holds | `Container`, static `true` | |
| quantity, bulkMaterial, mass, worn, placed, placement | | absent on a room: no Stackable / Tangible / Attired / Placing / Containable |

**Subject kind.** `subjectKind` comes from `subjectKindOf` (`CardRegistry.ts:205-210`). A `Place` maps to `'location'`; an `Idea` maps to `'idea'`.

**Client render** (`client/src/components/cards/CardBodies.tsx:1345-1530 MqlBody`), for `location`:
- `DetailTrail` (root label = `primaryKeyword`)
- `PlaceIllustration`
- `RoomDescription`: `longDescription` MML, clamped to 2 lines with a `more` toggle. A detail anchor click drills **inside the card**; it sends no command.
- `WaysOut`: label "Exits", bare-direction chips that send `go <dir>`.
- `WornList`
- `HereList`: "Here", the first 5 rows, then `+N more` (`HERE_SHOWN=5`, :207). Each row sends `look <primaryKeyword>`.
- `PlacedList`
- `ActionRow`: "What it affords". It shows only `source==='subject'` verbs and sends `<verb> <primaryKeyword>`.
- `Composition`: "Interfaces" mixin chips, 3 visible, then `+N more`.

**Never rendered.** The handed `prose` rides on `card-opened` (`CardRegistry.ts:456`) and is only used as the terminal fallback. **The card never renders it.** So everything that exists only in `body`, and not in a field, is invisible on the card:
- the puddle line
- `── Obvious exits` as seen by this viewer (the card uses its own viewer-blind `exits`)
- `── You also see`, which is replaced by `contents` (no density collapse, no occupant/item split)
- concealment hints

The band phrase, tint and notices reach the transcript *because* they are sent uncarded.

`bulkMaterial` and `detailMaterial` are on the wire but listed in `DESCRIPTION_FIELDS` (`CardBodies.tsx:383-398`), and nothing renders them. **No card ever names a material.**

### 0.5 Hidden exits and `search`
- `SearchController.buildScope` covers room contents plus `getExits()`, including hidden ones.
- `resolveAndRender` prints *"Your search turns up: <exit>north</exit>."* or *"You search, but turn up nothing you hadn't already."*, plus any remaining hints (or *"Something here still nags at you, just out of reach."*).
- Then `learnSurroundings(room, [], 'searched')`, which writes to the map (`SearchController.ts:171-221`).
- Discovery is a sticky per-viewer DISCOVERY belief. After it, `obviousExitsFor(viewer)` includes the exit, so the transcript `── Obvious exits` shows it and `go north` works.
- **The card's `exits` field never shows it**, because `getObviousExits()` filters `!exit.isHidden()` (`Exitable.ts:500-505`) and `isHidden()===isConcealed()` stays true (`lib/boundary/Exit.ts:454`).

---

## 1. Dave's Bar: `content/saxonberg-lounge/content/world/lounge/location/bar.yaml`

### a. Chain and mixins
- **Row chain:** `bar.yaml` (class `/world/lounge/location/Bar`) `extends: /trade/hospitality/location/bar` (class `/platform/location/Locale`).
- **Class chain:**
  - `world/lounge/location/Bar.ts` → `platform/location/Locale.ts`
  - → `lib/location/Locale.ts` = `SingletonMixin(Location)`
  - → `lib/location/Location.ts` = `Staged(Exitable(CartesianCoordinates(Place)))`
  - → `lib/stuff/Place.ts` = `Addressable(AmbientLit(Atmospheric(Adornable(Container(Visible(Detailed(Perceptible(Stuff))))))))`
- **Verified mixins:** Perceptible, Detailed, Visible, Container, Adornable, Atmospheric, AmbientLit, Addressable, CartesianCoordinates, Exitable, Staged, Singleton. The census also lists `Slotted`, which I didn't find in the chain; it probably comes in through Container or Adornable, but I didn't verify it.
  - With **markupAugmenters:** Detailed (`wrapDetailKeysAugmenter`) and Visible (`senseStripAugmenter`). That's all.
  - With **subscribableFields:** Stuff (displayName), Perceptible (primaryKeyword), Visible (4), Detailed (details), Container (contents, holds), Exitable (exits).

### b. Authored perceivable data
- **Parent (trade bar):**
  - `shortDescription: bar`, `register: indefinite`, `keywords [taproom, bar, barroom]`, and a long description that the child overrides.
  - Props: back-bar, well, 6 tools on the well, house-tablet and tip-jar on the back-bar, tap, ice-bin, water-tap, basin, glass-rack, and 6 stools (`count: 6`).
- **Child:**
  - `shortDescription: Dave's Bar`, `register: proper`, `keywords [bar, "dave's", dave]`, `illustration: location/bar.png`, `coords 0,0,0` in zone `/world/lounge` (`cellSize: 4.0`).
  - The long description has two paragraphs. It starts *"A narrow, warm room that smells of citrus peel and old wood…"*, mentions *"Neon signs and brass tap handles wash the far wall in an amber haze"*, and ends *"The lounge is back through the doorway to the south."*
  - `details`: signs, photos, mug, bills, slab, stools, each with keywords and a story.
  - `exits.north`: `/world/lounge/location/office`, `concealment: hidden`, `hint: "A hairline seam runs up the north wall behind the taps, and a thread of cooler air leaks from it — as though a door were pretending to be a wall."`
  - `adornments`: the `neon-veshko` NeonSign ("Volk neon sign", 95 lm, 2000 K) and the `neon-aevex` NeonSign ("aevex zero sign", 90 lm, 6500 K). NeonSign = `Adornment(Branded(LightSource(Thing)))`.
  - Props added: works-board, receiving-bench, 2× bandage (`as: dressing-1/2`, **no `on:`**, so they are loose on the floor despite the "behind the rail" comment), house-tablet (replaces the parent's), bar-counter ("bar", definite), and bar-menu ("chalkboard menu").
  - Cast: mara, remy, sloane, augie, dave. Shifts come from `idea/business.yaml` `rosterSlots`, and off-shift staff go to `/world/lounge/location/offstage`.
- **South exit:** wired at runtime by `LoungeWarren.wireHostFixtures` (`world/lounge/idea/LoungeWarren.ts:252-276`) as a doorless bidirectional north/south pair.

### c. `look` output reconstructed

**Light (derived; the same at every hour).**
- No ambient is authored, and the zone has no biome, so `isSkyLit()`→false and ambient is 0 (`lib/perception/AmbientLit.ts:347-354`).
- The only emitters are the two neon fixtures: 95+90 = 185 lm over a 16 m² cell = **11.6 lux → `dim`**.
- The lounge next door contributes nothing (it has no emitters). The hidden office exit is excluded from `getObviousNeighbours`.
- So every `look` sends this first, uncarded:
  > It is dim here; you can make the place out, but not much of it.

  …directly above prose about a "warm" room "lit from beneath" in "an amber haze". There's no day/night variation. A carried lantern would change it.
- *Caveat:* this assumes `emittedIntensity` is lumens and that the floor/zone scale is 16 m². That's what `light.md:189-200` says, but I didn't run it.

**Carded body.** The `<detail>` anchors come from the six canonical keys, matched with `\b…\b`, case-insensitive (`lib/description/Detailed.ts:911-936`).
```
<location>Dave's Bar</location>
A narrow, warm room that smells of citrus peel and old wood. The bar itself is a single <detail key="slab">slab</detail> of something dark and scarred, lit from beneath … <detail key="stools">Stools</detail> wait in a patient row. … Neon <detail key="signs">signs</detail> and brass tap handles … a chipped <detail key="mug">mug</detail> on a high shelf, and a few curling, signed dollar <detail key="bills">bills</detail>.

The lounge is back through the doorway to the south.
[A puddle of … pools on the floor.]            ← only if something was spilled
── Obvious exits: <exit>south</exit>.          ← north absent until searched
── You also see: <on-shift staff + players>, <items>.
[A hairline seam runs up the north wall behind the taps, … pretending to be a wall.]   ← conditional hint
```
- The `photos` detail never anchors, because the prose says "photographs", not "photos". It can only be reached by typing `look photos` or `look photographs`.
- **Items** in "You also see": the loose props are the back-bar, well, beer tap, ice bin, water tap, wash basin, glass rack, six separate bar stools, works board, receiving bench, two clean bandages, the bar, and a chalkboard menu. That's 18 entries, so `Mml.list` goes **block** (one per line). The tools, tablet and tip-jar sit on the well and back-bar as placements, so they're hidden from this list.
- **Occupants** depend on the clock:
  - Mon–Fri 06–14: Mara. Remy joins 12–22, so 12–14 is the two-person lunch rush.
  - 22–06: Sloane.
  - Sat–Sun 00–06: Sloane. 06–24: Augie.
  - Dave appears by cover reconcile.
  - Rendered with `composeOccupants`. In a bar this size the density tier is low, so everyone is named individually.
- **Hint:** it shows only when the north exit's `hidden` requirement minus the viewer's effective perception is ≤ `concealment.hintCutoff` (`platform/idea/api/PerceptionLogic.ts:1187-1207`). That depends on the viewer's competence and the dim light, so I can't decide it statically.

**After this, uncarded:**
> A notice here: HELP WANTED — bartender, ‹Money.render(4)› a game-hour; no prerequisite.

The bartender headcount is 5 against 4 rostered holders, so there's 1 opening and no "(N places)". The keeper seat has no headcount, so it never advertises. Source: `EmploymentLogic.ts:2077-2093`, `Opening.ts:66-73`.

**States.**
- **Before `search`:** exits = south. The hint may show.
- **After `search`:** *"You begin searching your surroundings."*, then after the timed action *"Your search turns up: <exit>north</exit>."* From then on, `── Obvious exits: north, south.` for that viewer, and the hint stops (`hasDiscovered` skips it).
- **Crowded vs empty:** only "You also see" changes. The bar has no warren, so there's no budding.

### d. `sense`, `smell`, `listen`
- **`sense`** (this is also what arrival runs): header + prose + exits + `── You also see:`. It lists every item *and* every person through `Mml.actor` in one list. There's **no dim-light line and no HELP WANTED notice**, so a player who only walks in never sees the job posting.
- **`smell`:** nothing in the bar is an odour source at rest. The rail ships empty; whether bottles or food once bought emit, I didn't verify. So this falls through to the prose, and the player is told the entire visual description, beginning with *"…smells of citrus peel and old wood"* (it reads as accidentally correct), including the neon, the photos, and so on.
- **`listen`:** same fall-through. The neon signs "hum" in prose, but NeonSign is not a SoundSource.

### e. Card wire record (one viewer)
```
displayName: "Dave's Bar"        primaryKeyword: "bar"   (first keyword; DetailTrail root shows "bar")
shortDescription: "Dave's Bar"   illustration: "location/bar.png"
longDescription: <the augmented prose above, with <detail> anchors>
details: [signs{ids:[signs,sign,neon,light,lights]}, photos{…}, mug, bills, slab, stools]  (+descriptions)
contents: [ ~18 item refs + staff/players ]   holds: true
exits: [{direction:"south"}]      ← never "north", even after the viewer discovered it
```
**What the client shows:** the illustration; prose clamped to 2 lines with 5 clickable detail words; Exits: `south`; Here: 5 rows + "+N more"; Interfaces chips (AddressableMixin, AdornableMixin, AmbientLitMixin…).
- No ActionRow. None of the room's own mixins contribute an `inventory`-bucket verb, and Container's `self` contributions don't count when the room isn't the giver.

**Reaches the transcript but not the card:**
- the dim-light phrase (sent uncarded)
- HELP WANTED (sent uncarded)
- the concealment hint
- the puddle line
- the viewer's discovered north exit
- the occupant/item split and the density-lensed occupant names

On a non-`terminal` client, the hint and the discovered exit therefore never appear in a browser after a carded `look`.

### f. Affordances as subject
None from the room itself. Verbs live on the props: `order` on the bar-counter, `read` on the menu and works-board, `put … on back-bar`, `tap`, `sit` on the stools, `apply` (because of the business), and `house` (keeper only). The room gives you `go`, `search`, `look`, and `survey` (Perceiver).

### g. Runtime state a player cares about
| State | Does it surface in words? |
|---|---|
| Who is on shift | Yes, the occupant list. |
| Whether you can get served | Only by trying `order`. |
| What's on the rail | Not in the room view; you need `look back-bar` (the "On it:" line) or `house stock` (keeper). |
| The house's deficit P&L | `house pnl`, keeper only. |
| The opening | The notice on `look` only. |
| The secret door | Hint, then search. |
| The light | One sentence on `look` only. |
| The bar's brand politics | The `signs` detail. The NeonSign adornments are not listed anywhere in look; `look volk` or `look aevex` might bind them, but I didn't verify adornment resolvability. |

### h. Gaps and noise
- The **dim phrase contradicts the warm, lit prose.** There's no light source behind the "lit from beneath" bar; the light is the neon only.
- **`photos` detail has no anchor** in the prose.
- **Keyword collisions:**
  - The `stools` detail claims `stool`/`seat`, and so does every `bar stool` prop (`trade-hospitality/.../stool.yaml` keywords `[stool, seat, bar-stool, bar]`).
  - The stool's `bar` also collides with the room's `bar` and the bar-counter.
  - The `signs` detail claims `sign`/`neon`, and so do both neon adornments.
  - I can't statically determine which wins.
- **The bandages lie loose on the floor** ("You also see: … a clean bandage, a clean bandage"), despite the comment.
- **Six stools listed one per line** make the item list long.
- **The card's exits are viewer-blind** (§0.5).
- **Arrival `sense` hides the hiring notice.**

---

## 2. The lounge: `content/saxonberg-lounge/content/world/lounge/location/lounge.yaml`

### a. Chain and mixins
- `class: /world/lounge/location/Lounge` = `LoungeMixin(WarrenMemberMixin(lib/location/Location))` (`world/lounge/location/Lounge.ts`). It is **not** a Locale and **not** a Singleton.
- Mixins: the Bar's set minus Singleton, plus WarrenMember and Lounge. Augmenters are again only Detailed and Visible.
- The Warren (`idea/warren.yaml`, class `LoungeWarren` = `Singleton(RoomWarren)`) owns membership.
- **Host vs satellite:**
  - The host gets `north` ↔ Dave's Bar (`LoungeWarren.ts:252-276`), and is plotted one cell south of the bar.
  - Satellites bud off the host at the bud threshold (default 10 interactives, `:60`). They hang off a star of `east, south, west, southeast, southwest` (`:69-75`), each with a back-exit.
  - Satellites reap below the merge watermark (3) after 60 s.
  - Host-seated fixtures (`seatIn: /world/lounge/idea/warren`) are the TPA terminal ("Teleport Authority terminal"), mana-main ("mana line"), and check-rack ("weapons-check rack"). They re-seat on host migration.

### b. Authored
- `shortDescription: lounge`, `register: definite`, `keywords [lounge]`, `illustration: location/lounge.png`.
- Long description: *"A low-ceilinged room … Mismatched armchairs and a sagging couch … a rug worn pale … A coffee machine ticks to itself … a hand-lettered sign above it that just reads BE NICE.\n\nA doorway north opens onto the warm light of Dave's Bar."*
- **No `details`, no props, no exits authored.**

### c. `look`
- **Light:** the lounge has no emitters. The host gets the bar's spill through the doorless north exit (`EXIT_TAU = 1.0`, `lib/perception/Modality.ts:109`), capped at the bar's own lux (`VisionModality.ts:701-727`). That's ≈11.6 lux, so **`dim`**: the same phrase as the bar.
- A satellite reaches the bar in two hops (`MAX_HOPS = 2`), so it's also ~dim. This is derived, not run.
- **Host body:**
```
<location>the lounge</location>       (late-bound; exact capitalisation per presentation layer)
A low-ceilinged room … BE NICE.

A doorway north opens onto the warm light of Dave's Bar.
── Obvious exits: <exit>north</exit>[, <exit>east</exit>, …satellite hubs].
── You also see: <players>, a Teleport Authority terminal, a mana line?, a weapons-check rack.
```
  I didn't verify whether `mana line` is an adornment; if it is, it's excluded.
- **Satellite body:** the same prose, *including "A doorway north opens onto … Dave's Bar"*. **That's false.** A satellite's only exit is its back-exit (e.g. `west` if it's the host's `east`), and there are no fixtures.
- **No notices** (no business operates here) and **no hints**.
- **Crowding:** the Warren keeps rooms ≤ ~10 interactives, so the occupant density never reaches the 30+ "strangers collapse" tier.
- **Runtime cues to room contents:**
  - *"A new doorway eases open along the wall."* when a satellite buds (`LoungeWarren.ts:308`).
  - *"A doorway eases quietly shut."* when one merges (`:320`).
- **Combat refusal:** *"Not in here. The lounge is for talk — take it next door."* (`LoungeMixin.ts:170-172`).

### d. `sense`, `smell`, `listen`
- **`sense`** is what new players see on login: header, prose, exits and the contents list, with no "dim" line.
- **`smell` and `listen`** fall through to the full prose, so `listen` "hears" the BE NICE sign and the coffee machine ticking. The coffee machine is prose, not an object.

### e. Card
```
displayName: the lounge   primaryKeyword: lounge   illustration: location/lounge.png
longDescription: plain (no anchors — no details)   details: []
contents: players + host fixtures    exits: host [{north},{east}…] / satellite [{west}] …
```
- The prose has no clickable words.
- On a satellite the card's own prose says north while the Exits row doesn't. That's a contradiction visible on one card.
- Not on the card: the dim phrase is shown uncarded, and the bud/merge cues are transient frames.

### f. Affordances
None from the room. The terminal (`teleport`/route verbs), the check-rack (`check`/`claim`), and Warren `survey` carry them.

### g. Runtime state
- Which instance you are in (host or satellite): **never said in words**. You can only infer it from the exits.
- Population: the occupant list.
- Budding and merging: one-line cues.
- Where Dave's Bar is from a satellite: not said, and contradicted by the prose.

### h. Gaps
- Satellite prose lies about the north doorway.
- Nothing in the prose can be clicked.
- "dim" is derived purely from the bar's neon, so the lounge reads exactly as bright as the bar.
- The landing sense omits the light line.

---

## 3. Outdoor: the oak clearing, `content/rejection/content/world/terminus/rejection/hanging-wood/oak-clearing.yaml`

I chose this one because it is under the sky, has a biome, has derived stand prose, and ties to specimen 4 (oak). Zone: `hanging-wood/rejection.yaml`… the zone is `/world/terminus/rejection/hanging-wood`, a CartesianZone with `cellSize: 10.0`, so 100 m².

### a. Chain and mixins
- `class: /trade/forestry/location/Wood` (`content/trade-forestry/src/location/Wood.ts`) = `Persistable(Stand(Soil(Reserved(Locale))))`.
- Mixins: the Bar set + Reserved, Soil, Stand, Persistable (census agrees).
- **Augmenters:** Detailed, Visible, and **Stand** (`standAugmenter`, `content/trade-forestry/src/lib/Stand.ts:226-231, 267`), which runs last.
- `commandContributions.inventory = [fell.yaml, tap.yaml]` (`Stand.ts:258-264`). These are subject-sourced verbs for people standing here.

### b. Authored
- `shortDescription: oak clearing`, `definite`, `keywords [clearing, "oak clearing", oaks, wood, "hanging wood"]`, `_biomePath: /stuff/idea/biome/outdoor/woodland`.
- `ambientIntensity: 3500` (calibration), `ambientColorTemperature: 5800`, `areaM2: 100`.
- Long description: *"The ride opens out into a clearing where the canopy has been let go, and the light comes all the way down. The oaks here are the old ones … a panel of hazel … You could stand here for an hour and not hear the yard."*
- `mix`: oak 12 standing out of a capacity of 14, ash 4 out of 6.
- `details.oak` (keywords oak, "big oak", tree, girth, crown).
- Exits south (ride, `edgeMinutes 3`) and west (ashery, 2).
- Prop: `panel-north`.
- No illustration.
- The woodland biome (`content/trade-forestry/content/stuff/idea/biome/outdoor/woodland.yaml`) is a SkyExposedBiome:
  - humidity 70%, wind 2 m/s
  - `_ambientSoundMml: "birdsong high up, and the small sounds of leaf-litter"` and `_ambientSmellMml: "leaf-mould, damp bark and green wood"`. **Neither is ever rendered** (§0.3).

### c. `look` across states
Lux = 3500 × skyFactor × (1 − 0.6·cloud) ÷ 100. The inputs:
- `skyFactor = 0.1 + 0.9·sin(sun altitude)` above the horizon (`light.md:910-920`, `CelestialLogic.ts:41`).
- Latitude 42.
- `weather.cloudDimFactor = 0.6`.
- Clouds: clear 0, overcast .7, rain .9, storm 1, fog .6, snow .85 (`lib/weather/WeatherType.ts:136-172`).

| state | ≈lux | band | what `look` sends first (uncarded) | is the prose shown? |
|---|---|---|---|---|
| clear, equinox noon | 27 | lit | nothing | yes |
| clear, summer noon | 33 | lit | nothing | yes |
| **clear, winter noon** | 16 | dim | "It is dim here; …" | yes |
| overcast / rain / storm, noon | 16 / 12 / 11 | dim | "It is dim here; …" | yes |
| sunset (sun at horizon) | 3.5 | very-dim | — | **withheld:** you get "Shapes and edges, no more — enough to move by, and to find a door.\n── Obvious exits: south, west." and **no card** |
| night, high full moon | ≈1 | very-dim | same | withheld |
| night, moonless | 0.07 | pitch-black | "It is pitch dark. You can make out nothing of the place at all.\n── Obvious exits: …" | withheld, no card |

The weather dim factor is a stamp written only when the boundary fan-out runs, which only happens for occupied scopes (`weather.md:599-644`). An abandoned room keeps a stale stamp.

**Lit or dim carded body:**
```
<location>the oak clearing</location>
The ride opens out into a clearing … The oaks here are the old ones … You could stand here for an hour and not hear the yard.

Oak stands here — about twelve trees' worth, old, planted by nobody alive. Ash — about four trees' worth.
[A puddle of <water appearance> pools on the floor.]     ← after rain fan-out while occupied
── Obvious exits: <exit>south</exit> and <exit>west</exit>.
── You also see: <panel-north's name>[, people].
```
- **The stand line is variable.**
  - `standingNow(sp)` grows with the increment and shrinks with `fell`.
  - When every species drops below one tree, it becomes *"Nothing stands here that is worth the axe — stumps and brash."*, with "…and the saplings somebody planted." added if there are plantings.
  - Each planting adds *"An oak sapling, planted by <name> on the Nth day of the Mth year."*
  - Source: `Stand.ts:420-457`.
- **`oak` never gets an anchor.** The prose says "oaks", which doesn't match `\boak\b`, and the stand phrase is appended *after* the detail wrap runs. So the clearing's own `oak` detail is unreachable by click, on the card or in the transcript.
- **Weather** never produces a sentence in `look`. There is no "it is raining" and no `look up` (deferred, `weather.md:662,686`). Weather shows up only as the dim band phrase, the puddle line (which says "floor" in a forest), and wetness on bodies. The full read is `analyze weather` (`weather.md:306-315`).
- **Ground and snow** appear only on `look ground`/`look floor`, because the floor is an Adornment and its augmenters are on the *floor* (`lib/ground/Floor.ts:423-462`):
  - *"It is <material appearance>, bare earth."* (or another `GROUND_KIND_PHRASES` entry)
  - plus a snow overlay: *"A dusting of snow lies over it." / "Snow lies ankle-deep." / "Snow lies knee-deep; walking is work."* (the ground sentence is masked at knee-deep and deeper) / *"Snow lies deep here, and whatever is under it is under it."*
  - *"A skin of ice lies on the standing water."* when frozen.
  - The room `look` never mentions snow at all.

### d. `sense`, `smell`, `listen`
- **`sense`** (arrival) at night: the full daylight prose and the card, with **no darkness handling**. A player walking in at midnight sees "the light comes all the way down", while `look` one second later says pitch dark.
- **`smell` and `listen`:** no modality sources, so both fall through to the full prose. `listen` then prints "You could stand here for an hour and not hear the yard." The biome's birdsong and leaf-mould strings are never used.

### e. Card
```
displayName: the oak clearing   primaryKeyword: clearing
longDescription: prose + "\n\nOak stands here — … Ash — …"   (the stand phrase IS on the card: it is an augmenter)
details: [{ids:[oak,big oak,old oak,tree,girth,crown], …}]   illustration: (none)
contents: [panel-north, …]   exits: [{south},{west}]
```
- **ActionRow:** "What it affords: fell · tap" (subject-sourced), which send **`fell clearing`** / **`tap clearing`**. FellController's handling of a location-bound target is unverified.
- **Interfaces chips** include StandMixin, SoilMixin and ReservedMixin.
- The card's `longDescription` only re-projects on a `longDescription` field change or a ShadowChangedEvent, so **the stand count on a live card goes stale after a `fell`** until refresh.
- **Not on the card:** the band phrase, the puddle, darkness (the dark branch opens no card; a `sense` in the dark opens a full one), weather, ground and snow.

### f. Affordances
`fell [species|bole|sapling] [with axe]`, `tap` (which refuses: "a stand is a number of trees, not a stem"), the panel's coppice verbs, `look ground`, `analyze weather/light/soil…`.

### g. Runtime state
| State | Does it surface? |
|---|---|
| Trees standing | Yes, in words, on look and the card. |
| Who planted what | Yes. |
| Soil moisture and nitrogen reserves | Not in look; maybe `analyze soil`, not verified. |
| Light / time of day | Only as a band phrase, or as withheld prose. |
| Weather | No sentence; only `analyze weather`. |
| Snow | Only `look ground`. |
| Puddles | One line, transcript only. |

### h. Gaps
- Arrival `sense` ignores darkness, and the card shows daylight prose at midnight.
- Biome smell and sound MML are dead data.
- The `oak` detail is unanchorable.
- Snow and weather are invisible at room level.
- The puddle line says "floor" outdoors.
- The ActionRow sends `fell clearing`.
- The stand phrase goes stale on a live card.

---

## 4. Oak, an Idea: `content/base-library/content/stuff/idea/material/wood/oak.yaml`

### a. Chain
- `class: /platform/idea/material/Material` → `lib/material/Material.ts:211-232` = `SingletonMixin(PerceptibleMixin(Idea))`.
- **No Visible, no Detailed, no Container.** There are no augmenters, and the only subscribable field is `primaryKeyword` (Perceptible) plus displayName.

### b. Authored
- `name: oak`, `keywords [oak]`.
- density 750, specificHeat 2000, thermalConductivity 0.17, electricalConductivity 1e-4, waterAbsorptionCapacity 28, autoignitionTemperature 570, heatOfCombustion 16, ashFraction 0.01, alkaliShare 0.15, hardness 40, toughness 60, edibility false, nutrients [cellulose], toxicity [], composition [].
- tags [wood, mixture, organic, flammable, once-living], seasoningDays 365, greenShrinkage 0.1, cleavability 0.9.
- `biologicalSource {speciesPath …quercus/robur, tissueType: wood}`.
- **No shortDescription or longDescription. No `appearance`.**

### c. Player-facing reads
1. **`wiki oak`**: the only full read. `content/wiki-starter/content/wiki/main/oak.md` has prose plus `<composition kind="template" of="/stuff/idea/material/wood/oak"/>`.
   - `describeTemplate` (`lib/wiki/components/composition.ts:~150-205`) emits a table. It has one row `class /platform/idea/material/Material` and one row `composes PerceptibleMixin, SingletonMixin`, then one row per *declared* field with a non-empty authored value, sorted.
   - Each row carries `SpoilerLevels.ofField` and `ofFieldName`.
   - **Level 0 (open):** biologicalSource ("speciesPath /stuff/…/quercus/robur, tissueType wood"), cleavability 0.9, greenShrinkage 0.1, keywords oak, name oak, seasoningDays 365, tags.
   - **Level 1, name open (`spoilerName: 0`):** alkaliShare, ashFraction, autoignitionTemperature 570 K, density 750 kg/m³, edibility no, electricalConductivity 0.0001 S/m, hardness 40 MPa, heatOfCombustion 16 MJ/kg, nutrients cellulose, specificHeat 2000 J/(kg·K), thermalConductivity 0.17 W/(m·K), toughness 60 MJ/m³, waterAbsorptionCapacity 28%.
   - Omitted as empty: composition, toxicity.
   - Units are best-effort from the marshaller singleton.
   - **How a reader sees level 1:** an ordinary player's ceiling is 1 and their default appetite is 0, so level-1 values are **kept and wrapped `<spoiler level="1">`**, collapsed, one click (`docs/subsystems/wiki.md:162-245`). A guest's ceiling is 0, so the values are **deleted**.
   - **Inconsistency:** seasoningDays, greenShrinkage and cleavability are world measurements but sit at level 0. `docs/.../wiki.md` and `lib/mixin.ts:220-227` say to "collapse what the WORLD measures".
2. **`look oak` or `look /stuff/idea/material/wood/oak`:**
   - A bareword won't find an Idea, because `look` scope is `["$focus","reachable"]` (`content/platform/content/platform/cmd/perception/look.yaml`).
   - A path seed is "open to everyone" (`docs/mql-grammar.md:222`; `api/mql/resolver.ts:823-830`). If it binds, LC:552-572 refuses with *"You can't see oak."*, because Material is not Visible. No card opens.
3. **Indirectly**:
   - On any oak Thing's card, `bulkMaterial {name:"oak"}` is on the wire **but not rendered** (§0.4).
   - Readings (`DensityReading`, `ChemistryReading`, `ResponseReading`) report properties of instances, with instruments.
   - Floor and puddle phrases use `getAppearance() || getName()`.
   - The clearing's `mix` names "Oak", but that comes from the stand's own `name`, not the Material.
   - Char-gen's dossier reads only a species' *default tissue* material (§5).
4. **`help oak`:** `help` takes non-verb topics as API/collection docs (`cmd/system/help.yaml`). Whether a Material template resolves there is unverified.

### d/e/f
- No sense output and no subject card in practice.
- If a subject card were ever opened on an Idea: no illustration, no Measured/Exits/Here/Placed, only DetailTrail + RoomDescription + ActionRow + Interfaces (`CardBodies.tsx:1437-1520`). It would also have to pass the perception gate in `CardRegistry` and `resolveAffordances` (`CommandLogic.ts:2041`).

### h
- The only route to the facts is the wiki, plus measurement.
- The card's material field is dropped by the client.
- The spoiler tagging is uneven, as described above.
- The epistemics substrate (knowing vs reading) doesn't exist (`wiki.md:169-206`).

---

## 5. A species: `content/species-and-names/.../hominidae/homo/sapiens.yaml`

### a. Chain
`class: /platform/idea/species/Species` (`platform/idea/species/Species.ts:639-660`) = `SingletonMixin(VisibleMixin(Idea))`. It is **Visible**, but not Perceptible and not Detailed. The only augmenter is senseStrip.

### b. Authored
- `binomial Homo sapiens`, `commonNames [human, man, person]`, `illustration species/sapiens.png`.
- longDescription: *"A person of ordinary build, neither tall nor short, with the alert, restless look of someone still deciding what to make of themselves."*
- baseMass 70, stature 1.75, naturalAttacks [fist/blunt], innateMixins [CasterMixin].
- vitalProfile (7 vitals), bloodGroups.
- lifespan 0–120, circadian diurnal, diet omnivore.
- `visionProfile {scotopicMin: pitch-black, photopicMax: blinding, bandShift: 0}`.
- facultyProfile, nameBankKeys, sentient.

### c. Player-facing reads
1. **Char-gen dossier** (`platform/idea/api/SpeciesLogic.ts:128-237`, sent in the `system.charactergen.state` payload as `SpeciesDossier`).
   - Classification: the Linnaean ladder from the path.
   - Biology:
     - Lifespan "~120 years"
     - Active diurnal
     - Diet omnivore
     - Vision (`describeVision`)
     - Smell: omitted for sapiens, which has no olfactoryProfile
     - Sex "XY · sexual"
   - Anatomy: body plan biped, senses, locomotion, "N equip slots".
   - Composition: the default tissue material, flesh. Rows are Tissue, Density (with `spoiler` from Material fieldMeta, level 1), and Edible (level 1).
   - **The species `longDescription` and `illustration` are NOT in the dossier.** Neither are its own level-1 fields: vitalProfile, bloodGroups, facultyProfile, innateMixins, naturalAttacks.
2. **In play:**
   - The species is the last rung of the handle chain ("a human"; see `docs/subsystems/presentation.md`).
   - Organism `getIllustration` falls back to the species portrait.
   - `composeOccupants` groups strangers by species common name plus a worn feature at density tier ≥2 (`SocialLogic.ts:580-607`).
   - `bandShift` changes every `look`'s band for that viewer.
3. **Wiki:** there is no `sapiens` page among the 16 starter pages. If one were written, its composition panel would show the fields above, with the level-1 rows collapsed (`Species.ts` fieldMeta: handlingRange, biddability, vitalProfile, bloodGroups, facultyProfile, innateMixins, naturalAttacks, affordedGambits are all `spoiler:1, spoilerName:0`). Everything else is level 0, including diet, visionProfile and lifespan.
4. **`look` via a path seed:**
   - Species IS Visible, so `lookAtTarget` would render `\n<species presentation>\n\n<longDescription>\n` and **open a subject card with `subjectKind:'idea'`**. Whether the path seed binds through `look`'s scope and the perception gate is unverified.
   - That card would be prose-only, plus an Interfaces row (SingletonMixin, VisibleMixin). Its `displayName` comes from `getPresentation()` on a non-Named Idea, and I didn't determine what that returns.

### h
- The species prose and portrait are authored but have no first-class reader.
- Spoiler levels are honoured in the dossier only for the tissue Material's rows, not for the species' own.

---

## 6. The lounge business: `content/saxonberg-lounge/content/world/lounge/idea/business.yaml`

### a. Chain
`class: /platform/idea/Business` → `BusinessEntity extends BusinessMixin(PublisherMixin(OrganizationMixin(Idea)))` (`platform/idea/Business.ts:396-409`). It is **not Perceptible and not Visible**: no keywords, no description. The census helper returned an empty set.

### b. Authored
- `name "Dave's Bar"` (the same string as the room).
- appointingAuthority entity: dave. `call: regulars`.
- Positions:
  - bartender: wage 4/game-hr, `fulfills [bartending]`, `headcount 5`.
  - keeper: wage 0, `purchases: true`, no headcount.
- rosterSlots for mara/remy/sloane/augie. `banksAt goodkin`.
- `operatingLocations [bar, bar-counter]`, `offstage`.
- 46 parLines. Eight of them have no exemplar and can never be ordered: the vermouths, the three wines by colour, ale, lager, and vinegar.

### c. Where a player meets it, in words
- **The `look` notice in the bar**: *"A notice here: HELP WANTED — bartender, ‹4› a game-hour; no prerequisite."* It is uncarded and missing from arrival `sense` (§0.2).
- **`apply` / `apply for bartender`:** a refusal names the number you're short (`cmd/employment/apply.yaml`). Then `clock on`/`clock off` handles wages.
- **`order`** at the bar-counter is served by whoever holds `fulfills` on shift, under the `regulars` call rule.
- **Chattel line:** `look <bought bottle>` → *"── Owned by Dave's Bar."*. The holder presentation comes from the Business (LC:605-617).
- **Keeper only, via `house …`:**
  - `house book`, `pnl`, `payroll`, `par`, `stock`, `roster`, `price`, `freight`, `traffic` (`cmd/banking/house.yaml`, `opens_card: stock`).
  - `wallet use house`.
- **Publisher:** press releases in the news ticker. Whether this business publishes anything I didn't trace.
- **Dave's office prose** describes "a green ledger open to a column of red, the bar's honest deficit". That's static prose and doesn't track the actual P&L.

### d/e/f
No sense output, no card, no direct affordances. It can't be targeted: with no keywords, a path seed binds at best to "You can't see …" (LC:552-572).

### h
- No player can read the business's roster, positions or par sheet unless they hold a seat. Only the derived notice and the refusals expose it.
- The notice is lost to browser players who only arrive and never `look`.
- The authored name equals the room name, so "Owned by Dave's Bar" is ambiguous between the room and the house.

---

## Cross-cutting findings (design-relevant)
1. **Arrival is `sense`, and `sense` is the impoverished verb.** It has no darkness withholding, no band phrase, no notices, no hints and no puddle line, yet it is what mints the room card. `look` is richer, but most of the extra is sent uncarded or hidden behind the card.
2. **The card is a field projection.**
   - What it gets: augmenter-folded prose (detail anchors, stand phrase) and authored fields.
   - What it misses: every room-level sentence composed in the controller (light, tint, notices, hints, puddle, the occupant lens), and per-viewer exits. `exits` is viewer-blind, so discovered secret exits never show on the card.
3. **Derived state reaches prose in two different ways.** Augmenters on the room's own class reach both the card and the transcript. Sentences built in the controller reach only the transcript, and only on `look`. Floor and snow augmenters live on an adornment and need `look ground`.
4. **Single-sense verbs at a place usually echo the visual prose.** Biome smell and sound MML are unconsumed.
5. **Ideas have no perception path.**
   - Material: wiki composition panel only. It's spoiler-tagged at level 1, so values are collapsed for players and deleted for guests.
   - Species: char-gen dossier only, and it drops the species prose.
   - Business: derived notices, refusals, and keeper-only `house` output only.
   - `subjectKind:'idea'` card bodies exist in the client but have no ordinary opener.
