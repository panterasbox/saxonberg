# Specimen sheet — agents (what a viewer standing in the room actually gets)

Repo: `/home/claude/panterasbox/saxonberg`. All paths below are relative to
`packages/server/src/mud/` unless they start with `packages/`. Traced statically
(no server run). "Cannot determine" is said where it applies.

---

## 0 · Shared machinery (read this first — every specimen runs through it)

### 0.1 The class chains (verified by reading, NOT the census helper)

The census helper (`census.py --class X`) omits the entire `Creature` base
(~26 mixins) and returns **nothing** for `PrimaryAvatar` (it is `export default`
over `lib/character/Avatar`). Verified chains, innermost → outermost:

| rung | file:line | mixins (inner → outer) |
|---|---|---|
| `Stuff` → `Agent` | `lib/stuff/Agent.ts:24` | Tangible, Wet |
| `Creature` | `lib/creature/Creature.ts:151-229` | Propertied, Organism, Slotted, BodyPlanSlots, Attired, Slottable, Posed, Reserved, Vitals, Soilable, Metabolic, Respiration, Thermal, ThermalRegulation, Exerting, Visible, Perceptible, Disguisable, Containable, Container, LoadBearing, Concealable, Postmortem, Hygiene |
| `Actor` | `lib/creature/Actor.ts:83-84` | Sensor, Engaged, Mobile, Perception, Combatant |
| `Character` | `lib/character/Character.ts:103-120` | Employed, Hiding, BeliefStore, Status, Persona, Dispositioned, Gendered, Perceiver, Vocal, Soul, Memorized, Caster, Hauler, CommandGiver, Advancement (+ class-level `markupAugmenters = [bodyAugmenter]`, :165) |
| `NPC` | `lib/npc/NPC.ts:36-40` | Behaved, Costumed, Props |
| `Cast` (platform) | `platform/agent/Cast.ts:23`, `lib/npc/Cast.ts:127` | Named, Singleton, CastMixin over NPC |
| `Extra` | `platform/agent/Extra.ts:37` | plain `NPC` + `keepsPersonalRegard() → false` |
| `Beast` | `platform/agent/Beast.ts:42` | Behaved over **Actor** (not Character) |
| `DraftAnimal` | `platform/agent/DraftAnimal.ts:57` | Hauler, Mountable over Beast |
| `KeptAnimal` | `lib/creature/KeptAnimal.ts:91-121` | Named, BeliefStore, Handling over Actor; then Status, Bonded, Behaved, Branded, Chattel, Persistable |
| `ShelledCharacter` | `lib/shell/ShelledCharacter.ts:42` | Focused, Environment, Alias, Workspace, Author over Character |
| `Avatar` | `lib/character/Avatar.ts:166-203` | Named, SubjectSubscriber, PartyMember, Wardrobe, Contacts, NotifyPolicy, Calendar, Aether, HasInteractive, ClientState, SaxonbergClient, Forkable, Estate, Cartographer, Persistable |

### 0.2 Markup augmenters (the `look` long-description pipeline)

`Mml.augment` → `augmentMarkupImpl` (`api/mml.ts:193-210`) walks
`MixinApi.getAllMarkupAugmenters` (`api/mixin.ts:2373`), **root → leaf**, so the
fold order on a person is fixed by composition depth:

| # | owner | augmenter | condition → text (verbatim) | hosts |
|---|---|---|---|---|
| 1 | Wet (`lib/wetness/Wet.ts:132,120-124`) | `wetnessAugmenter` | band ≠ dry → `It is damp.` / `It is wet.` / `It is soaked through.` | all four |
| 2 | Organism (`lib/species/Organism.ts:132-144`) | `ageAugmenter` | lifeStage `aged` → `It is grey about the muzzle and slow to rise.`; `senescent` → `It is very old.` `getLifeStage()` is null for any HasInteractive body (:305) and null when the species has no `ageCurve` (`platform/idea/species/Species.ts:1621`) | effectively cat only (sapiens/sensitivus/caballus-major have no `ageCurve`) |
| 3 | Attired (`lib/slot/Attired.ts:352-368`, phrasings `lib/slot/Impression.ts:78-167`) | `impressionAugmenter` | non-empty `wornStack()` + body plan → ≤2 clauses (quality = mean `gradeBand`; upkeep = wet/soil/condition; brand when one mark covers the whole stack). Phrase chosen by FNV seed of **(host id, facet digest, viewer id)** → e.g. `Dressed plainly.` / `Turned out well, but grubby.` | anyone wearing graded garments |
| 4 | Vitals (`lib/vitals/Vitals.ts:697-728`) | `missingPartsAugmenter`, `scarsAugmenter` | `Missing the left hand.` / `A pale scar marks the <part>.` | all |
| 5 | Soilable (`lib/cleanliness/Soilable.ts:797-821`; Creature override `lib/creature/Creature.ts:436-468`) | `soilAugmenter` | vision: bare-skin soil only → `Their hands are bloodied.` (`Your` if self); smell (≥ `cleanlinessOdourNoticedPpm`, default 10): `It smells of X.` / ≥100 `It reeks of X.` (body + worn layers, `Creature.soilOdour` :389) | all |
| 6 | Visible (`lib/description/Visible.ts:174,391-419`) | `senseStripAugmenter` | drops `<sense channel>` regions outside filter∩sensorium; **runs AFTER 1–5**, so it never touches their lines | all |
| 7 | Combatant (`lib/combat/Combatant.ts:648-662`) | `combatStateAugmenter` | in a CombatApi session → `In combat — <poise>[, flags][, down].` poise ∈ steady/pressed/reeling/broken/open (`lib/combat/Poise.ts:36`), flags ∈ disarmed/prone/grappled/inspired (`lib/combat/CombatFlags.ts:18`). **Ignores viewer** (no CombatFog). | all |
| 8 | Bonded (`lib/husbandry/Bonded.ts:210-235`) | `bondAugmenter` | handling phrase + asking + bond-with-viewer line | cat |
| 9 | Branded (`lib/corpo/Branded.ts:120`) | `brandMarkAugmenter` | only if `getBrand()` | cat (inert) |
| 10 | Chattel (`lib/chattel/Chattel.ts:133`) | `titleLineAugmenter` | only if container has `termsLineFor` (a shop shelf) | cat (inert in a room) |
| 11 | `Character` class (`lib/character/Character.ts:146-157,165`) | `bodyAugmenter` ("the mirror") | always, if `flesh` reserve → `BODY_BUILD_PHRASE[flesh band][lean band]` capitalised + `.` (`lib/creature/Creature.ts:283-316`). Fresh body = flesh 55 / lean 50 (`lib/reserve.ts:169-183`) → **`In good flesh.`** | people only (Dave, hewer, player) — not horse/cat |

Each augmenter appends with `\n\n`. No other mixin in any of these chains
declares `markupAugmenters` (full grep of `static markupAugmenters`). In
particular **StatusMixin, Posed, Exerting, Engaged, Hauler, Mountable,
Employed, Persona have none.** `Detailed` is not composed on any creature, so
no `<detail>` keyword wrapping in a person's long.

### 0.3 `look <target>` (`platform/idea/cmd/perception/LookController.ts:547-688`)

1. Not Visible → `You can't see X.`
2. Organism target + BeliefStore viewer → `actor.learnIdentityOf(target, null)`
   (:575-577) — a stranger record; `know` never overwrites a known name with
   null (`lib/belief/BeliefStore.ts` ~558 `if (update.knownAs != null)`).
3. Body = `\n{Mml.actor(target)}\n\n{getMarkupLong(actor)}\n` (:584).
   `Mml.actor` default form is **`concise`** (`api/mml.ts:1041`) — so the
   header carries **no status, no worn feature**.
4. `Placing` → `── <heading>: …` (not on creatures). Chattel with id → `── Owned by …`.
5. Container → `PerceptionApi.visibleContentsOf(actor,target)`
   (`platform/idea/api/PerceptionLogic.ts:571-608`): for a person (agent + slotted),
   slot occupants classified by `spec.accepts` (`Wieldable` → held; `Wearable` or
   `userFacingDetail` → worn; else inside, own only); loose contents shown only to
   self. Lines: `── Wearing: a, b, c.` / `── Holding: …` / `── In it: …`; >4 →
   `…, and N more things — \`inventory <primaryKeyword>\`.` (:640-645).
6. Close-look glance over **`target.getContents()` — which for a person includes
   pockets** (:655-680): concealed + undiscovered items passing
   `resolveSearch(…,'glance')` print `Looking closely, you notice X.`; near-misses
   print the concealment hint / `Something here almost catches your eye.`
7. Opens the `subject` card with this prose, sends prose marked `carded`.
   Client drops carded prose when the card is visible
   (`packages/client/src/App.tsx:393-425`, `store/cardFeedSlice.ts:244`), so
   **in the browser the CARD is what the player sees**, not the prose above.

### 0.4 `sense` / `listen` / `smell` / `feel` / `taste`

- `sense <x>` (`SenseController.ts:244-284`): header + `getMarkupLong(actor,{filter: full sensorium})`; no Wearing/Holding lines, no glance, no card.
- Single-sense (`SingleSenseControllerBase.ts:176-215`): `getMarkupLong(actor,{filter:[channel]})`. `Mml.stripBySense` (`api/mml.ts:957`) removes only `<sense>` regions — **untagged prose always survives**. None of the four specimen rows author any `<sense>` region, so `listen dave` / `smell horse` print the full visual long description plus every augmenter line except soil (soilAugmenter honours the filter: marks only under `vision`, odour only under `smell`).
- ⚠ `look` passes **no** filter (`LookController.ts:584`) although Visible's docstring says `look` passes `['vision']`; consequence: `look` prints the smell line too.

### 0.5 Presentation forms actually used for these surfaces

| surface | form | file |
|---|---|---|
| `look <x>` header, act lines, card `displayName` | `concise` | `LookController.ts:584`; `api/mql-subscription.ts:330-334` |
| room survey roll-call | `presence` (+ status) | `LookController.ts:356-364`; `platform/idea/api/SocialLogic.ts:524-526` |
| targeting keywords, disambiguation | `distinguishing` (+ first worn Wearable in **slot order**, + decay) | `platform/idea/api/RecognitionLogic.ts:293-338,541-562` |
| profile header | `concise` (recognized → formal name surface) | `platform/idea/api/ProfileLogic.ts:148-155,197-215` |

Recognition (`RecognitionLogic.ts:371-476`) applies **only to Persona hosts**
(every `Character`: Dave, hewer, player). Stranger stem =
`presentationPhrase('stranger')` = the own ladder minus disguise and name →
**authored `shortDescription` in its `register`**, else species common name
(`lib/stuff/Stuff.ts:422-445`). Non-Persona (horse, cat) render their
presentation to everybody alike.

### 0.6 The subject card wire (`lib/connection/Cards.ts:217-229` → `fields:'detail'`)

`DETAIL_FIELDS` (`api/mql-subscription.ts:120-138`) projected by
`projectFields` (:314-338; `displayName` replaced by `describeFor(viewer)`):

| field | descriptor | on an agent |
|---|---|---|
| displayName | `lib/stuff/Stuff.ts:210` | viewer-aware concise name |
| quantity | Stackable | omitted |
| primaryKeyword | `lib/description/Perceptible.ts:106-112` | **raw authored keyword, viewer-blind** |
| shortDescription | `lib/description/Visible.ts:186-190` | **raw stem, viewer-blind** (empty string `""` for a player — read returns `''`, not undefined, so it is sent) |
| longDescription | Visible :201-206 | `getMarkupLong(viewer)` — per-viewer, includes all augmenter lines |
| illustration | Visible :208-218 | own ?? species (`species/sapiens.png` for every human, also sensitivus) |
| details | Detailed | omitted (not composed) |
| bulkMaterial | `lib/material/Tangible.ts:174-181` | body material summary — **sent**, client hides `Measured` for agents |
| mass | Tangible :183-188 | **`{value: <kg>, unit:'kg'}` exact body mass — sent**, client hides |
| contents | `lib/spatial/Container.ts:356-390` | **every non-slotted, unconcealed, Visible child = the pockets** (no own/other check) |
| worn | `lib/slot/Attired.ts:550-570` | `wornStack()` (Wearable only, outermost-first), REF_FIELDS |
| exits / placed | Exitable / Placing | omitted |
| placement | `lib/spatial/Containable.ts:228-235` | placement name if placed on a member (e.g. a stool's) |
| holds | Container :391-402 | `true` on every agent (static) |

Client `MqlBody` (`packages/client/src/components/cards/CardBodies.tsx:1345-1480`):
for `subjectKind === 'agent'` it renders illustration, `RoomDescription`
(longDescription ?? shortDescription, :708), **WornList** ("Worn", :916-966),
**no** HereList (":1460 ⚠ Never for an agent: a person's contents are their
pockets"), no Measured, PlacedList, **ActionRow** (subject-sourced, non-disabled
verbs, sent as `<verb> <primaryKeyword>`, :526-572), **Composition** (mixin-name
chips from `resolveAffordances`, :574+). Title = `records[0].displayName`
(`Card.tsx:232`).

⚠⚠ **Privacy leak (confirmed statically):** the pockets are hidden only by the
client. `Container.contents.read` filters viewer-self, worn/slotted, adornment,
non-Visible, unperceived — never "is the viewer the holder". The only test of
the agent case projects with `viewer === avatar`
(`api/__tests__/mql-subscription.worn.test.ts:98-108`), which is exactly the case
that should see pockets. Same for `mass`.

⚠ **Held items are on no card field.** `worn` = Wearable only; `contents`
excludes every slot occupant; there is no `held` field. The prose `── Holding:`
line is the only carrier, and that prose is suppressed when the card shows.

### 0.7 Affordances (`platform/idea/api/CommandLogic.ts:2037-2112`)

Per viewer affordance: `source:'subject'` iff the verb was contributed by the
target (its `peers` contributions); otherwise `'actor'` if it has an object
positional. Every verb runs its validators (`evaluateAffordance` :2114+) and gets
state. Card ActionRow shows only `subject` & not disabled. Subject `peers`
contributions anywhere in these chains (full scan of `static commandContributions`):
`Tangible → throw` (binds the target as the thrown `item`, `mustBeHeld` → disabled
→ hidden on card), `Behaved → talk`, `Mountable → mount, ride`,
`Bonded → pet, call, stay, name, offer`. Nothing else (no `buy`, `hire`, `order`,
`trade` on a person; `order`/`menu` come from a `Menu`/`Tariff` THING).

### 0.8 Status, posture, presence — where each surfaces

- **Status** (`lib/status/Status.ts`): `authoredStatus` (persisted) or runtime `_runtimeStatus` (NOT persisted). Rendered only by `presence` form (`RecognitionLogic.ts:258-264` → `core, status`) = the room roll-call, and as `flavor` on `profile`. **Not on `look <x>` header, not on the card.** `status.yaml` help claims "Others see it alongside your name when they look at you" — false for `look <you>`.
- **Posture** (`lib/character/Posed.ts`, composed at Creature level): read only by mechanics (Metabolic, Vitals convalescence, Perception hide, Locomotion, requiresMounted). **No renderer anywhere** tells a viewer that someone is sitting/lying/kneeling. Only indirect: `look stool` lists a placed sitter under the stool's heading; `placement` on the card.
- **Presence** (`platform/idea/api/PresenceLogic.ts:96-109`): `reconnecting | engaged | idle | active` — avatars only, shown on `profile`/roster rows, gated by target's `privacy.showStatus` (`ProfileLogic.ts:259-272`). Not on look/card.
- **Wounds / fatigue**: no augmenter. Wounds → `assess` (`AssessController.ts`, medicine-gated). Fatigue/hunger (`bodyState`) → own self card only (`Creature.subscribableFields`, not in DETAIL_FIELDS).
- **Combat**: `In combat — …` line, universal.

---

## 1 · Dave (Cast) — `packages/content/saxonberg-lounge/content/world/lounge/agent/dave.yaml`

### a. Row → class → mixins
`class: /platform/agent/Cast`, `extends: /stuff/agent/costume/student`
(`packages/content/generic-objects/content/stuff/agent/costume/student.yaml`,
whose own class is `Extra` — Dave's `class` wins, `replace` rule).
Effective: Agent(Tangible, Wet) + all Creature + Actor + Character + NPC (Behaved,
Costumed, Props) + Named, Singleton, CastMixin.
markupAugmenters: Wet, Organism, Attired, Vitals×2, Soilable, Visible, Combatant, Character.
subscribableFields: Stuff(displayName), Tangible(bulkMaterial, mass, detailMaterial), Containable(placement), Container(contents, holds), Visible(shortDescription, register, longDescription, illustration), Perceptible(primaryKeyword), Attired(worn), LoadBearing(borneBurden, carryCapacity, loadRatio), Creature(bodyState), Named(name), Advancement(practisingCompetence, competenceDigest). Only the DETAIL_FIELDS subset ships on the card.

### b. Authored perceivable data
- `name: Dave`, `keywords: [dave, barkeep]`, `alternateNames: [barkeep, bartender]`, `pronouns: he`, species homo/sapiens, `register: proper`, `shortDescription: Dave the Barkeep`.
- `longDescription`: "Dave keeps to the back these days and lets the staff run the rail. When he does drift out front he can't quite help himself — a glass polished that didn't need it, a wink at no one in particular, and, if the mood takes him, a startlingly good Bruce Willis impression … Mostly, it took."
- Costume (inherited, `by-entry`, `lib/stuff/Staged.ts:541`): `student-shirt` (as shirt), `student-trousers`, `canvas-shoes` — all `gradeBand: fair`, linen, woven.
- No `authoredStatus`, no `bornAt`, no props.
- Dossier: `dispositions` (ambition −70, boldness 70, humility −70), `archetype: proprietor`, `prologue` ×2, `competence` (bartending expert, mixology competent, business-administration competent), `renown: familiar`.
- Behaviors: `introduces` (arrival), `enforces` (candidate; shout/warn/86 lines), `idles` (4-line pool), `greets` (arrival, 3 lines), `tree-dialogue` (engage; `warm` gated on `regard ≥ 30`, else `neutral`; `work` node dispatches `appoint $player to keeper`).

### c. `look dave`
Header (`concise`, tag `<npc>`):
- **Stranger:** `Dave the Barkeep` — stranger stem = `shortDescription` in `proper` register. The name is in the stem, so a stranger already reads it.
- **After introduction:** `Dave` (`knownAs` from `SoulMixin.introduceSelf`, `lib/social/Soul.ts:223-246`, fired by `/lib/behavior/introduces` on arrival if the arriver doesn't recognize him). Peers see `Dave the Barkeep introduces themselves as Dave.` (not pronoun-aware: "themselves" for `he`).
- Formal (profile, recognized): full name surface + alternates `barkeep, bartender`.

Long description (fresh state):
```
Dave the Barkeep            ← or "Dave"

Dave keeps to the back these days … Mostly, it took.

Dressed plainly.            ← one of: dressed plainly / turned out plainly /
                              wearing ordinary stuff / dressed without fuss /
                              plainly got up — chosen per (Dave, digest, VIEWER)

In good flesh.
── Wearing: a plain student shirt, a pair of sturdy trousers, a pair of canvas shoes.
```
(Wearing order = slot-map order, not outermost-first.) No age line (sapiens has no `ageCurve`).
Runtime variants: wet → `It is damp.` inserted FIRST (right after the long); bloodied hands → `Their hands are bloodied.` after impression; reeking shirt → `It smells of stale sweat.`; enforcing a fight → `In combat — pressed, grappled.` before the body line; lost a hand → `Missing the left hand.`. Sitting in the office chair: nothing. Under taser/wounds: nothing (only `assess`).

### d. sense/listen/smell
Identical long description (no `<sense>` authoring) — `listen dave` "hears" the whole visual portrait, the impression line and `In good flesh.`; soil marks drop, odour appears only on `smell`/`sense`/`look`.

### e. Card wire (stranger viewer)
`displayName: "Dave the Barkeep"` (→ `"Dave"` once introduced), `primaryKeyword: "dave"` (always, viewer-blind), `shortDescription: "Dave the Barkeep"`, `longDescription:` augmented text above, `illustration: "species/sapiens.png"`, `bulkMaterial`, `mass: {value, unit:'kg'}`, `contents: []` (no props), `worn: [shirt, trousers, shoes]` outermost-first, `holds: true`. Client renders title, sapiens picture, description, Worn list, "What it affords: talk", Composition chips (includes `NamedMixin`, `SingletonMixin`, `CastMixin`, `EmployedMixin`…).

### f. Affordances as subject
- `talk` — `lib/behavior/Behaved.ts:266` (static, every Behaved host). Controller runs the authored tree (`talk to dave`).
- `throw` — Tangible peers, disabled (`mustBeHeld`) → not on card.
- Hiring is **inside dialogue** (`work` node `dispatch: appoint …`), not an affordance. Ordering drinks is the house's `Menu`/`Tariff` thing, not Dave.

### g. Runtime state & per-viewer split
| state | surfaces? | per-viewer? |
|---|---|---|
| name | header changes stranger → acquaintance | belief (RECOGNITION record, persisted for players) |
| regard (Dave → you) | only by which dialogue node opens (`warm` ≥ 30) | Dave's belief about you |
| your regard of him | profile `You regard them warmly/coldly.` | viewer |
| dossier prologue / chronicle | profile, **recognized only** | gated by recognition |
| competence bands, renown band | profile, everyone | universal |
| status | none authored; presence form only | universal |
| posture, idle, "covering the bar" | not rendered (idles are emotes in the stream) | — |
| combat | `In combat — …` | universal, unfogged |
| clothing impression wording | same facts, viewer-seeded phrasing | wording per viewer |

### h. Gaps & noise
- Name leaks to strangers via `shortDescription: Dave the Barkeep`; introduction *shortens* the header.
- After introduction targeting tokens = `tokenize("Dave")` (`RecognitionLogic.ts:541-562`): **`barkeep`/`bartender` stop resolving** for an acquaintance (persons don't get authored keywords; alternateNames are not keywords) — while `talk.yaml`'s own example is `talk to the barkeep`.
- `primaryKeyword: "dave"` ships to strangers on the card and is what ActionRow sends (`talk dave`).
- Status help, `talk` help ("Look someone over (`examine`) for a hint") promise surfaces that don't exist.

---

## 2 · The hewer (Extra) — `packages/content/rejection/content/world/terminus/rejection/agent/hewer.yaml`

### a. Row → class → mixins
`class: /platform/agent/Extra`, extends student. Same as Dave **minus Named, Singleton, CastMixin**; `keepsPersonalRegard() → false` (`platform/agent/Extra.ts:58`). Same augmenters (Character body line included).

### b. Authored data
`shortDescription: hewer on tutwork`, `register: indefinite`, `keywords: [hewer, miner, tutwork]`, species `homo/sensitivus` (commonNames `sensitive, attuned-born`; illustration `species/sapiens.png`), no pronouns field (Gendered default — cannot determine the default value statically without reading Gendered; the row says "He" in prose). Long: "Wiry, grey with rock dust to the eyebrows, working a face with the unhurried economy of somebody who intends to still be doing it at the end of the shift. He nods and goes back to it."
Costume: parent's three + `- /stuff/thing/clothes/field-jacket` (bare string → key = path → **appended**, `docs/subsystems/templates.md` by-entry rule); jacket and shirt both claim torso (both band 0, not a layer violation). Props: `pick`, `timber-set`, `glowcap-jar` — staged by `ContainmentApi.move(inst, host)` (`lib/stuff/Staged.ts:319-321`) → **carried, not held**.

### c. `look hewer`
```
a hewer on tutwork           ← every viewer, always (no name exists; introduceSelf returns false)

Wiry, grey with rock dust … He nods and goes back to it.

Dressed without fuss.        ← 'fair' bank, viewer-seeded

In good flesh.               ← NB the prose says "Wiry"; the mirror says "in good flesh" until his reserves diverge
── Wearing: a plain student shirt, a rugged field jacket, a pair of sturdy trousers, a pair of canvas shoes.
```
No `Holding:` line — the pick is in his pockets. Whether `delves` wields it while working: cannot determine without tracing `/trade/mining/behavior/delves`.
Targeting (`distinguishing`): `hewer on tutwork wearing <first Wearable in slot order>` — likely the **shirt**, which the jacket covers. Authored keyword **`miner` never resolves** (persons get perceived tokens only).

### d. sense/listen/smell
Same as Dave's pattern. Working face: soil on bare hands → `Their hands are …` (vision) and odour (smell) once deposited.

### e. Card wire
`displayName/shortDescription: hewer on tutwork`, `primaryKeyword: hewer`, illustration sapiens, `mass`, `bulkMaterial`, `worn` ×4, **`contents: [miner's pick, set of mine timber, stoppered jar of glowcap]`** — pockets on the wire to any viewer (client hides). `holds: true`.

### f. Affordances
`talk` (Behaved; no dialogue spec → TalkController declines diegetically), `throw` (disabled). Nothing about his trade (no `hire`, no `buy ore`).

### g. Runtime state
Recognition: a stranger record only; all hewers share one identity path (not singleton) — a "met" hewer is every hewer. No personal regard by design. Employment (rostered, tutwork) is not described anywhere on look/card/profile except via competence bands on profile. Combat line as above.

### h. Gaps
- Pick/timber/jar invisible on `look`, visible on the wire.
- "Wiry" prose vs "In good flesh." mirror line contradict each other on a fresh body.
- `miner` keyword dead; distinguishing feature is a covered undershirt shared with ~45 student-costume NPCs.

---

## 3 · Creature — draft horse (`packages/content/transport/content/system/transport/agent/draft-horse.yaml`), cat (`packages/content/generic-objects/content/stuff/agent/cat.yaml`)

### a. Chains
Horse: `DraftAnimal` = Mountable(Hauler(Beast(Behaved(Actor)))). **Not Character** → no Persona (no recognition), no Status, no Named, no body line.
Cat: `KeptAnimal` = Persistable(Chattel(Branded(Behaved(Bonded(Status(Handling(BeliefStore(Named(Actor))))))))).
Augmenters horse: Wet, Organism, Attired (nothing worn → silent), Vitals×2, Soilable, Visible, Combatant. Cat: those + Bonded, Branded, Chattel.

### b. Authored data
Horse: `shortDescription: heavy draft horse`, indefinite, keywords `[horse, draft-horse, carthorse, shire, team, heavy, draft]`, `mass: 700`, long "Seventeen hands of deliberate animal with feathered feet … The collar has moulded itself to its shoulders over years." (the collar is prose, not an object), idles pool ×4. Species has no `ageCurve`, no illustration.
Cat: `shortDescription: thin cat`, `primaryKeyword: cat`, keywords `[cat, thin, stray, moggy]`, `handling: 0.25` (→ `flighty`, `lib/husbandry/Handling.ts:167`), long "A thin cat, grey where it is not dust-coloured … It watches you without any especial concern.", behaviors follows/feeds/homes. Species cat has `ageCurve` and `handlingRange`.

### c. `look horse` / `look cat`
```
a heavy draft horse

Seventeen hands of deliberate animal … over years.
```
That is all (plus wet/soil/scar/combat lines if they apply). **Hitched state, rider, load: no line** — Hauler/Mountable/Haulable declare no augmenter; a rider's mount slot is neither Wieldable nor Wearable → classified `inside`, hidden to non-self (`PerceptionLogic.ts:585-599`).

```
a thin cat                     ← "Mouse" for EVERYONE once named (names are public for animals, RecognitionLogic.ts:420-433)

A thin cat, grey … without any especial concern.

it swings away the moment you move, and it will go through a fence rather than past you It moves off as you look at it.
```
Bond line: `handlingPhrase()` (lowercase, no period) + `' '` + `BOND_PHRASE.off|holds|comes` (`Bonded.ts:198-235`) — rendered as one malformed sentence; "fence"/"gate" vocabulary is livestock's. `bondWith(viewer)` is **per-viewer** (regard × handling): `It moves off as you look at it.` → `It holds its ground and watches you.` (≥0.15) → `It comes to you.` (≥ FOLLOW_BOND). If it is asking someone: `It is at your feet, looking up at you.` / `It is at <X>'s feet, looking up.` Age stage: bornAt unauthored → age 0 → `newborn` (no phrase; but `isMature()` false).

### d. sense/listen/smell
Full long again on every channel. Horse in cold: no breath line (idle emote only).

### e. Card wire
Horse: `displayName: a heavy draft horse`, `primaryKeyword: horse`, shortDescription, long, no illustration, `mass` (700-based), `bulkMaterial`, `contents: []` (or whatever it carries), `worn: []`, `holds: true`. Client renders as agent (no HereList). Cat: same shape; `primaryKeyword: cat`.

### f. Affordances
Horse: `talk` (declines), `mount`, `ride` (`lib/slot/Mountable.ts`), `throw` (disabled). `hitch` is the CART's (`lib/slot/Haulable.ts` peers) — not on the horse's card.
Cat: `talk` (declines), `pet`, `call`, `stay`, `name`, `offer` (`lib/husbandry/Bonded.ts`), `throw` (disabled). Whether `pet` shows enabled while `flighty` depends on pet.yaml validators vs controller — not traced.

### g. Runtime state
Horse: universal presentation; no per-viewer anything. Cat: per-viewer bond line and per-viewer cat regard (BeliefStore); name universal; status decorates presence roll-call.

### h. Gaps
Bond-line punctuation/capitalisation bug; hitch/rider invisible on the animal; `talk` offered on animals (deliberate, declines); horse body condition (stockman's phrase) not on look (Character-only mirror).

---

## 4 · Another player (`PrimaryAvatar`, seed `packages/content/platform/content/platform/agent/PrimaryAvatar.yaml`)

### a. Chain
Character + ShelledCharacter + Avatar mixins (0.1). Augmenters = the person set (no Avatar mixin adds one). Avatar adds subscribable `playStanding`, `makeStanding`, `renown`… (`lib/character/Avatar.ts:466+`) — **not** in DETAIL_FIELDS.

### b. Authored data
Seed: `pronouns: they`, sapiens, alive. Embody overlay (`platform/idea/cmd/charactergen/EmbodyController.ts:681-711`): `name`, `surname?`, `_speciesPath`, `pronouns`, `aspiration`, `bio`, **`longDescription: species.getLongDescription()`**, `bornAt`; then aspiration outfit worn (:745-765). **No `shortDescription`, no keywords, no player-facing command writes either** (only `FireController` and admin `PlayerController` touch descriptions/pronouns).

### c. `look <player>`
```
a human                         ← stranger: no shortDescription → species commonNames[0]
Odile                           ← acquaintance (introduce / social.autoIntroduce)

A person of ordinary build, neither tall nor short, with the alert,
restless look of someone still deciding what to make of themselves.   ← identical for EVERY human player

<Impression line from the aspiration outfit grades>

In good flesh.
── Wearing: <aspiration outfit, slot order>.
── Holding: <anything in a Wieldable slot>.
```
- No age line (`getLifeStage()` null for HasInteractive).
- Pockets: NOT listed (person branch, `own === false`), but the glance (§0.3.6) scans them for concealed items.
- >4 worn → `… — \`inventory \`` with an **empty keyword** (players have no primaryKeyword) → a broken hint.
- Status: **absent** from look (concise). Present in the room roll-call (`a human, looking for a study group`) and profile.
- Sitting / lying: absent everywhere.
- Away/idle/linkdead: absent from look and card; a dropped avatar lingers and looks exactly like a present one. Only `profile`/roster show `idle`/`reconnecting`/`engaged`, and only if the target's `privacy.showStatus` allows.
- Masked (disguise `masksIdentity`): header = `appearsAs` (indefinite), name withheld even from acquaintances; kind tag `npc` (`RecognitionLogic.ts:521-538`).
- In combat: `In combat — reeling, prone.` true band to all.

### d. sense/listen/smell
Same pattern; `smell <player>` reads the sum of skin + worn-layer odour.

### e. Card wire (viewer ≠ target)
`displayName: "a human"` / `"Odile"`; `primaryKeyword` omitted; **`shortDescription: ""`**; longDescription (species + augmenters); `illustration: species/sapiens.png`; `bulkMaterial`; **`mass: {value: kg}`**; **`contents: [every pocketed, unconcealed item]` ← privacy leak**; `worn`; `placement`; `holds: true`. Held weapon/tool: on no field. Client: title, generic species picture, description, Worn list, no action row (no subject verbs enabled), Composition chips listing ~80 mixin names (AetherMixin, PartyMemberMixin, EstateMixin, …).

### f. Affordances as subject
Only `throw` (disabled). No `talk` (not Behaved). Everything a player does TO another player (`give`, `attack`, `follow`, `whisper`, `profile`, `introduce --to`, `assess`, `treat`) is `source:'actor'` — the card's ActionRow does not show them (radial may).

### g. Per-viewer vs universal
Per-viewer: name (RECOGNITION), impression wording, `Your/Their` in soil line, profile persona block (aspiration, bio, chronicle — recognized only), your label/regard. Universal: species stem, long description, body line, worn list, combat state, status (presence/profile only), competence & renown bands (profile).

### h. Gaps
- Every stranger player is the same "a human" with the same paragraph; there is no player-authored appearance surface.
- Pockets + exact mass on the wire; held items missing from the card; status & posture & presence missing from look and card.
- `inventory ` empty-keyword hint.

---

## Cross-cutting gaps & noise (ranked for UI design)

1. **Card leaks pockets** (`contents`) and exact `mass` for every agent; client-side hiding only.
2. **Card drops "Holding"**: no held field; the prose that has it is suppressed when the card is shown.
3. **No posture, no presence (away/linkdead), no status on `look`/card**; status only on the roll-call/profile; posture nowhere.
4. **Wounds/fatigue invisible on look** (only combat poise, missing parts, scars); `assess` is the surface.
5. Stranger stems: Cast rows bake the name into `shortDescription`; players have no stem but species; Extras' distinguishing feature is a covered shared undershirt.
6. Targeting after introduction loses role words (`barkeep`) for persons; authored person keywords (`miner`) are dead.
7. Augmenter order puts wetness first and body line last; several lines say "It" about a person (`It is damp.`, `It smells of…`) while soil says "Their".
8. Combat line ignores fog (true poise to all viewers).
9. Single-sense verbs return the visual portrait (no `<sense>` authoring on any agent).
10. Cat bond line is malformed; composition chips expose implementation names on people.
11. `look` passes no sense filter (doc says `['vision']`), so it prints smell lines.
12. The census helper misses the Creature base and Avatar entirely.
