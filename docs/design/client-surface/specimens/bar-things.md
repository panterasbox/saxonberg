# Bar things — what the server actually produces (static trace)

Repo: `/home/claude/panterasbox/saxonberg`. Read only, nothing run. Paths below are relative to
`packages/server/src/mud/` unless they start with `packages/`. Line numbers come from the
checkout as read.

---

## 0. Shared machinery (read this first; each specimen refers back to it)

### 0.1 The `look <thing>` pipeline (`platform/idea/cmd/perception/LookController.ts`)

1. **Soilable reconcile first.** If the target is Soilable, `reconcileAiring()` is awaited
   before rendering (`:100-102`).
2. **Header + long** (`:584`):
   `` Mml.compose`\n${Mml.actor(target)}\n\n${Mml.fromMarkup(target.getMarkupLong(actor))}\n` ``
   This gives a blank line, the linked display name ("a pint glass"), a blank line, the
   augmented long, then a newline. ⚠ `getMarkupLong` is called with **no `opts`**, so no sense
   filter applies. (Docs and the Visible doc comment say `look` passes `['vision']`, but it
   does not.)
3. **`── <heading>: …`** for each Placing member that has items (`:590-604`). The heading
   comes from the Placement row (`on.yaml` → `heading: On it`). This loop does **not** filter
   by `perceives`/visibility, but the card's `placed` field does.
4. **`── Owned by <holder>.`** only if Chattel AND `getChattelId()` is non-empty AND the owner is
   an organization or player (`:608-617`). Chattel ids are minted only by `stampChattel` at
   Buy/Check/Consign/Name (`platform/idea/cmd/retail/BuyController.ts:182`, etc.). So a
   prop-spawned thing never says this.
5. **`── <screen>`** if Display and `readScreen` is non-null (`:623-626`).
6. **`── Wearing/Holding/In it: …`** if Container, capped at 4 with
   `` and N more things — `inventory <kw>` `` (`:632-650`).
7. **`\nLooking closely, you notice …`** plus hint lines, Container only, from the `glance`
   search (`:658-680`).
8. The card opens with `prose: body`, and the frame is stamped `carded` (`:683-690`).

⚠ **Run-on `──` lines.** Every `──` append is `` `${body}── …` `` with **no `\n`** before it.
The body ends in `\n` after the long, so the first `──` line starts a fresh line. A second
one is glued straight after the first's final period ("…bottles.── Owned by Dave's Bar.").
`docs/subsystems/spatial.md:582` shows them on separate lines; the code doesn't do that.
`InventoryController.ledger` *does* join with `\n` (`platform/idea/cmd/inventory/InventoryController.ts:97`).
None of the six specimens hits two `──` lines in its common states, but any Chattel+Container
or Placing+Chattel thing would.

`Mml.list` (`api/mml.ts:777-821`) switches to block style at more than 4 items (`INLINE_LIST_THRESHOLD = 4`,
`:291`), giving `"\n  item"` per entry. The trailing `.` then sticks to the last item. Inline
lists use the Oxford ", and".

### 0.2 Augmenter order (`api/mml.ts:193-210`, `api/mixin.ts:2373-2405`)

`getAllMarkupAugmenters` walks from leaf to root and then **reverses**, so **root-most
mixins run first**. For the `Thing` base
(`Wet(Visible(Detailed(Perceptible(Tangible(Containable(Stuff))))))`, `lib/stuff/Thing.ts`) the
order is **Detailed.wrapDetailKeys → Visible.senseStrip → Wet.wetness**. ⚠ The Visible doc
comment (`lib/description/Visible.ts:165-172`) says senseStrip runs *before* wrapDetailKeys.
That's backwards.

`Good = Chattel(Concealable(Thing))` (`lib/stuff/Good.ts`) adds **Chattel.titleLine** next.

The augmenters these specimens actually meet:

| Augmenter | Mixin / class (file:line) | Condition | Text appended |
|---|---|---|---|
| wrapDetailKeys | Detailed (`lib/description/Detailed.ts:945`) | host has authored `details` | wraps matching words in `<detail key=…>` (none of the six author details → no-op) |
| senseStrip | Visible (`lib/description/Visible.ts:391`) | always | drops `<sense channel>` regions not in filter∩sensorium; **untagged prose always survives** (`api/mml.ts:1098-1138`) |
| wetness | Wet (`lib/wetness/Wet.ts:132`) | band ≠ dry | `\n\nIt is damp.` / `It is wet.` / `It is soaked through.` |
| titleLine | Chattel (`lib/chattel/Chattel.ts:133`) | container has `termsLineFor` (a retail `Stock`) | **space-joined** (not a paragraph): `The shop asks …` / `Held on X's terms until sold; …` / `On consignment for X at …` (`lib/retail/Stock.ts:607-627`) |
| bulkContents | Bulkable (`lib/bulk/Bulkable.ts:1012`) | interior slot | `\n\nIt holds ${appearance}.`; when empty and VesselKind has a category: `The ${category} is empty.` (`:1037`). Liquids get **no level word** (only gases get `gasLevelWord`, `:1004-1010`) |
| brandMark | Branded (`lib/corpo/Branded.ts:121-130`) | brand resolves | `\n\n${brand.name} — a product of ${corpo.label}.` or `… — an independent label, carried by no corpo.` |
| verdict | GradedReceptacle class (`platform/thing/GradedReceptacle.ts`) | `getMaker() !== ''` | `\n\nIt looks ${band}: ${why}.[ Made by X.]` |
| durable | Durable (`lib/material/Durable.ts:128`) | condition < 0.8 or mended | `It is worn.` / `badly worn` / `broken`; `It has been mended[ by X].` |
| assembly | Assembled (`lib/craft/Assembled.ts:439`) | always | **`It is one piece.`** when `bill === null && parts.length === 0` (`:443-446, 967`); otherwise the parts/joints sentence |
| soil | Soilable (`lib/cleanliness/Soilable.ts:797`) | dirty / smelly | `It is <soilPhrase>.` and/or `It smells/reeks of X.` (vision line gated on `filter` incl. vision; smell line on smell) |
| contentsFreshness | CraftVessel class (`platform/thing/CraftVessel.ts:132-146`) | interior non-empty and band ≠ fresh, filter ∈ {vision, smell} | `It smells faintly off.` / `It has gone bad — the smell is unmistakable.` / `It is rotten, crawling and foul.` (`lib/material/Freshness.ts:154-158`) |
| palate | Palatable (`lib/metabolism/Palatable.ts:224`) | **only when `opts.filter` exists** and includes taste or smell; non-empty interior | aroma line; `It tastes a, b and c.`; competent+: `You pick out …`; proficient+: `The making of it reads <band>.` / age line |

Several of these never check `opts.filter`: wetness, titleLine, bulkContents, brandMark,
verdict, durable, assembly. So they print on `smell`/`listen`/`taste`/`feel` too.

### 0.3 The single-sense verbs (`SingleSenseControllerBase.ts:175-215`)

`smell|listen|taste|feel <thing>` → `` target.getMarkupLong(actor, { filter: [channel] }) ``
→ `\n<name>\n\n<text>\n`. Untagged prose survives the strip. **No specimen authors a
`<sense>` region or any sense field**, so each of these verbs prints the *visual* long
description plus every filter-blind augmenter line. The only overrides:

- **Feel on a Thermal target** (`FeelController.ts:84-90, 105-125`) prints just
  `` `${Shown} feels ${band}.` ``. Bands: cold <273 K, cool <290, comfortable <305, warm
  <320, hot <345, scalding (`lib/perception/Touch.ts:53-60`). There's a burn check too.
- **Smell / Listen** override only the *location* branch (they use the ambient signal); a
  *thing* target falls through to the base.
- The verb yamls require only the actor's organ (`requiresTaste` etc.); the target is
  `requires: any`. So `taste stool` is legal.

`sense <thing>` (`SenseController.ts:244-280`) uses `filter = physical sensorium`. That's the
look text **plus** filter-gated lines (palate, soil smell), plus the Placing `──` lines. It
has **no** Owned-by, display, In-it or glance lines.

### 0.4 The inspection card (`lib/connection/Cards.ts:217-229`; `api/mql-subscription.ts:106-138`; client `packages/client/src/components/cards/CardBodies.tsx:1345-1508`)

The `subject` card projects `DETAIL_FIELDS`: displayName, quantity, primaryKeyword,
shortDescription, longDescription, illustration, details, bulkMaterial, mass, contents, worn,
exits, placed, placement, holds. `projectFields` omits only `undefined`, so `null` and `[]`
are sent (`api/mql-subscription.ts:314-340`).

Each field is declared by a mixin:

- Stuff: displayName (viewer-aware via `describeFor`).
- Perceptible: primaryKeyword.
- Visible: shortDescription, register, **longDescription = `getMarkupLong(viewer)`** (same
  text as look's long, no opts), illustration.
- Detailed: details.
- Tangible: **bulkMaterial = the object's OWN material**, not its contents; mass.
- Containable: placement.
- Container: contents, holds (static true).
- Placing: holds (static true), placed.
- Bulkable: `bulkAmount`, **not in DETAIL_FIELDS**.
- Branded: brand, corpo, **not in DETAIL_FIELDS**.

Display, LightSource, Slotted/Postured, Durable, Soilable, Thermal, Serviceable and Crafted
declare **no** subscribable fields.

Client `MqlBody` for kind `thing`:

- title = displayName (`Card.tsx:232`);
- RoomDescription renders the longDescription markup, clamped with a "more" toggle;
- `Measured` prints every record field not in `DESCRIPTION_FIELDS` (`CardBodies.tsx:383-398`),
  and `formatValue` hides `{value:0}`. ⚠ `holds`, `placement` and `placed` are **not**
  deny-listed. So `holds:true` renders as a row **"Holds — yes"** and `placement:"on"` as
  **"Placement — on"**. `placed` is an array, so formatValue returns null and it's dropped.
  `bulkMaterial` IS deny-listed and nothing else renders it, so **material never appears on a
  card**;
- HereList ("Here", contents, 5 shown, then "+N");
- PlacedList (one label per heading, 5 shown, then "+N");
- ActionRow ("What it affords", `source==='subject'` and not disabled; sends
  `` `${verb} ${primaryKeyword}` ``);
- Composition ("Interfaces" chips, leaf-first order from `queryMixins`, 3 shown then
  "+N more").

⚠ **In card display mode the look prose frame is suppressed** once the card is on screen
(`packages/client/src/App.tsx:420-425`, `store/cardFeedSlice.ts:244-255`). The card has no
equivalent of `── Owned by`, `── <screen>`, `── Holding/Wearing`, or the glance/hint lines.
**Those facts disappear for a card-mode player.**

### 0.5 Affordances (`platform/idea/api/CommandLogic.ts:2037-2104`)

Iterate `viewer.getAffordances()`, newest-first from the command stack
(`lib/command/CommandGiver.ts:441-453`). `seen` dedupes **by verb before checking source**
(`:2075`), and an entry is `'subject'` iff `affordance.source === target` (`:2099`).

⚠ So a verb that several room objects contribute (`throw` from every Tangible, the five bulk
verbs from every Bulkable, the BarStation set from both the back-bar and the well) is tagged
`subject` **only for whichever contributor is newest on the stack**. For every other object
it's tagged `actor` and the card ActionRow hides it. The subject/actor split is
order-dependent for any non-unique verb.

`composition` = `getActiveMixins(target)` `_mixinName`s (the Interfaces chips).

Mixin contributions that matter here (all `peers` + `environment` unless noted):

- Bulkable (`lib/bulk/Bulkable.ts:534-550`): fill, pour, spill, drink, sip.
- Tangible (`lib/material/Tangible.ts:133-137`): throw.
- Assembled (`lib/craft/Assembled.ts:544-572`): fit, repair, salvage, name.
- Adornment (`lib/boundary/Adornment.ts:51-55`): `environment` only: hang.
- Container: `self` only (inventory/get/drop/put/give). These are the container's *own* verbs
  and never subject.
- BarStation class (`packages/content/trade-hospitality/src/thing/BarStation.ts`): mix,
  serve, garnish, flourish.

`sit` (`lib/character/Posed.ts:162`), look/smell/feel/taste (`lib/description/Perceiver.ts:247-262`)
and `wash` (`platform/thing/WaterFixture.ts:218`) are actor- or basin-sourced. **They never
show as the subject's own.** Peers are walked from `getContents()` plus one level into open
containers (`CommandLogic.ts:3586-3628`). Room **fixtures** (`getFixtures()`) are not, so an
adornment contributes nothing sideways.

---

## 1. Pint glass — `packages/content/trade-hospitality/content/trade/hospitality/thing/pint.yaml`

### a. Chain and mixins

The row has no `extends:`. `class: /platform/thing/ServingVessel`
→ `ServingVessel = PalatableMixin(CraftVessel)` (`platform/thing/ServingVessel.ts`)
→ `CraftVessel = Soilable(Contaminable(Serviceable(VesselKind(Crafted[⊃Graded](Thermal(Bulkable(Container(Good))))))))`
(`platform/thing/CraftVessel.ts:117-124`)
→ `Good = Chattel(Concealable(Thing))`
→ `Thing = Wet(Visible(Detailed(Perceptible(Tangible(Containable(Stuff))))))`.

The census helper printed only `Palatable`, which is incomplete. Verified effective set:
**Palatable, Soilable, Contaminable, Serviceable, VesselKind, Crafted, Graded, Thermal, Bulkable,
Container, Chattel, Concealable, Wet, Visible, Detailed, Perceptible, Tangible, Containable.**

- markupAugmenters: Detailed, Visible, Wet, Chattel, Bulkable, Soilable, Palatable, plus the
  CraftVessel class (contentsFreshness). Its `getLong()` override (`CraftVessel.ts:332-357`)
  appends working and verdict before any augmenter runs.
- subscribableFields: Stuff, Containable, Tangible, Perceptible, Detailed, Visible, Container,
  Bulkable(bulkAmount).

### b. Authored data

- `shortDescription: pint glass`, `register: indefinite`, `keywords: [pint, glass, pint-glass]`.
  primaryKeyword = `pint`.
- `longDescription: "A nonic pint glass with the bulge below the rim."`
- `category: pint` (the par key; also the word used in "The pint is empty.").
- `interiorBulk: true`, `interiorCapacity: 0.57`.
- None authored: details, mass (→0), material, sense fields, illustration, concealment.

**What fills it:** the recipe `packages/content/trade-brewing/content/recipes/pint.yaml`. It
takes `beer` category, `measureL: 0.5`, needs the `tap` capability,
`outputTemplate: /trade/hospitality/thing/pint`, and
`outputAppearance: "a pint of beer with a finger of head"`. The recipe appearance overrides
the material's (`CraftingLogic.ts:1756-1758`), so the ale material's own
`appearance: "a foamy amber ale"` (`trade-brewing/.../material/ale.yaml`) is **not** what
you'd read. The vessel is claimed (first clean, empty one) and stamped with
`maker/grade/recipe/craftedAt` (`CraftingLogic.ts:3003-3008`).

⚠ Dave's Bar par sheet: `ale`/`lager` lines carry **no exemplar**, "nothing in the realm for
an order to deliver" (`saxonberg-lounge/.../idea/business.yaml:155-165`). So a lounge pint of
ale needs a keg from outside the restock loop.

### c. `look pint`

The base comes from `CraftVessel.getLong`: authored long, then
`` ` It is ${parts}.` `` only when non-empty (`shaken, cloudy with air` / `stirred bright and clear`
/ `muddled` / `on the rocks` / `over crushed ice` / `fizzing` if the payload tags include
`carbonated` / `with <garnish>`), then **always** `` ` ${renderVerdict()}` ``.

`renderVerdict` = `` `It looks ${band}: ${VERDICT_PROSE[band]}.` `` plus `` ` Made by ${maker presentation}.` ``
when there's a maker (`lib/craft/Crafted.ts:29-35, 179-186`). The default gradeBand is
`fair`.

**Default (fresh from props, clean, empty, never used):**
```

a pint glass

A nonic pint glass with the bulge below the rim. It looks fair: honestly made, if unremarkable.

The pint is empty.
```
The augmenters after getLong: wetness (dry, nothing); titleLine (container is the glass rack,
not a Stock, nothing); bulkContents → `The pint is empty.`; soil (clean, nothing);
freshness (empty, nothing); palate (no filter, nothing).

`──` lines: not Placing; Chattel with no id → no Owned-by; not Display. It is a Container, so
an `In it` group only if a garnish is inside (none for a pint). There's a glance only if it
has contents.

**Served (pulled by Mara, ale, grade `fair`):**
```

a pint glass

A nonic pint glass with the bulge below the rim. It looks fair: honestly made, if unremarkable. Made by Mara.

It holds a pint of beer with a finger of head.
```
`fizzing` would appear only if the payload tags carry `carbonated` (`CraftVessel.ts:344-348`).
I couldn't determine statically whether cask conditioning tags it.

**Half drunk:** identical, because there is no fill word for liquids.

**Drained and soiled (used):** `…It looks fair: honestly made, if unremarkable. Made by Mara.\n\nThe pint is empty.`
It reads the same as the clean default except for the "Made by" sentence.

**After washing:** `wash()` (`CraftVessel.ts:182-206` → `Serviceable.wash`) clears
bulk/garnish/ice/contamination/technique/soiled but **not** `maker/grade/recipe`. So a clean
glass back on the rack still says *"It looks fair … Made by Mara."*

`look in pint` (`LookController.ts:107-114`) → `InventoryController.ledger` → `\na pint glass\n── Nothing you can see.\n`.
The beer is invisible to `look in`, because bulk isn't contents.

### d. Senses

- `smell pint` (filter `[smell]`): the same long and verdict, then `It holds a pint of beer…`,
  then the palate aroma line if the payload has `dissolvedAromatics`, the freshness line if
  off, and the soil odour if any. ⚠ The visual prose is printed for a smell.
- `taste pint`: as smell, plus palate. Ale and gin author no `tastes`, so no
  `It tastes …` line. Competent in the blend's discipline adds `You pick out ale.`; proficient
  adds `The making of it reads fair.`
- `listen pint`: the visual long, verdict and "It holds…". Pure noise.
- `feel pint`: Thermal → `A pint glass feels <band>.` only. A tap-fresh pint reads cool or
  cold depending on keg temperature, which I couldn't determine statically. On ice the
  temperature pins at the melt point (273 K) → **"cool"** (273 is not <273).
- `sense pint`: the look text plus the palate lines. So **`sense` hands you a taste reading
  without drinking** (the filter = sensorium includes taste).

### e. Card wire record

```
{ stuffId, displayName:"a pint glass", primaryKeyword:"pint", shortDescription:"pint glass",
  longDescription:<as look's long>, details:[], bulkMaterial:null, mass:{value:0,unit:"kg"},
  contents:[] (or garnish refs), holds:true }
```
`placement` is absent: it sits *in* the rack, not placed. `bulkAmount` isn't sent.

Rendered:
- title "a pint glass";
- prose;
- Measured: **"Holds — yes"** (mass 0 is hidden);
- "Here" list if garnished. ⚠ The label "Here" is a room word, odd for a glass's contents;
- ActionRow;
- chips: Palatable · Soilable · Contaminable · +N more.

### f. Affordances as subject

drink, fill, pour, sip, spill (Bulkable) and throw (Tangible). All six are also contributed
by every other glass and bottle in the room. With 60 glasses in the rack, whether any of them
shows as the pint's own is a stack-order accident (§0.5). The row and class add nothing.
`wash` comes from the basin and never shows as the glass's.

### g. Runtime state and how it surfaces

| State | Field | Surfaces? |
|---|---|---|
| fill level | `interiorAmount` vs capacity | **No.** Only full or not-empty ("It holds …") vs empty ("The pint is empty."). `bulkAmount` isn't sent to the card |
| what's in it | material + payload.appearance | yes, as one phrase |
| temperature | Thermal stamp | only `feel` (band word); nothing on look |
| ice | `iceKg`, `iceForm` | look: "on the rocks" / "over crushed ice" while non-empty |
| used/dirty-from-service | `Serviceable.soiled` | **Nowhere.** `isSoiled()` is read only by `isClaimable` |
| surface dirt | Soilable | look line when banded |
| germs on the glass | Contaminable | nowhere |
| spoilage of contents | Freshness | look/smell line when not fresh |
| who made the drink, quality | Crafted stamp | look verdict, which outlives the drink (bug-shaped) |
| claimable / clean / empty | derived | nowhere as such |

### h. Gaps and noise

- **Gap:** a level word ("full", "half-drunk", "dregs").
- **Gap:** the clean vs used distinction. The whole pool loop (claim → serve → bus → wash)
  turns on it, and nothing says it.
- **Gap:** temperature at a glance ("cold", "going warm").
- **Noise:** a quality verdict on an empty, never-used glass ("It looks fair: honestly made,
  if unremarkable."). It reads as a judgment of the glassware.
- **Wrong:** the verdict and "Made by" survive washing.
- **Leak:** "Made by" uses `getPresentation()` (viewer-blind true name,
  `lib/craft/Crafted.ts:42-50`), so a stranger bartender is named.
- **Noise:** on the card, "Holds — yes".
- Smell, listen and taste re-print the visual description.
- `look in pint` says "Nothing you can see." beside a full pint.

---

## 2. Bottle of Crowsfoot gin — `packages/content/trade-distilling/content/trade/distilling/thing/crowsfoot-gin.yaml`

### a. Chain and mixins

The row has no `extends:`. `class: /trade/distilling/thing/SpiritBottle`
(`packages/content/trade-distilling/src/thing/SpiritBottle.ts`)
→ `Bottle = VesselKind(Circulating(Sealable[⊃Bistate](GradedReceptacle)))` (`platform/thing/Bottle.ts`)
→ `GradedReceptacle = Thermal(Branded(Crafted[⊃Graded](Bulkable(Good))))` (`platform/thing/GradedReceptacle.ts`)
→ Good → Thing.

The census matches: **VesselKind, Circulating, Sealable, Bistate, Thermal, Branded, Crafted, Graded,
Bulkable, Chattel, Concealable, Wet, Visible, Detailed, Perceptible, Tangible, Containable.**
No Container, no Palatable, no Freshness.

- markupAugmenters: Detailed, Visible, Wet, Chattel, Bulkable, Branded, plus the
  GradedReceptacle class (verdict).
- subscribableFields: Stuff, Containable, Tangible, Perceptible, Detailed, Visible, Bulkable,
  Branded(brand, corpo).

Constructors: Bottle sets material glass, interiorBulk, 0.75 L, closure `liquidTight`, keyword
`bottle`. SpiritBottle sets closure `sealed`, keywords `[bottle, spirit]`, and
**`setPrimaryKeyword('bottle')`** (`SpiritBottle.ts:16-21`).

### b. Authored data

- `shortDescription: bottle of Crowsfoot gin`, `register: indefinite`.
- `keywords: [crowsfoot, gin, bottle, spirit, "bottle of crowsfoot gin"]`. The row replaces the
  constructor's keyword list but **not** the pinned primaryKeyword, so the effective
  primaryKeyword is **`bottle`** (`lib/description/Perceptible.ts:236` returns
  `primaryKeyword ?? keywords[0]`).
- `longDescription: "A bottle of Crowsfoot gin — a hand-numbered label, a crow's foot pressed into the wax."`
- `interiorMaterial: /trade/distilling/idea/material/gin` (`appearance: "clear, juniper-scented gin"`),
  `interiorAmount: 0.75`.
- `gradeBand: fine`, `_brandKey: crowsfoot-gin`. The Brand row is `name: Crowsfoot Gin`,
  `owner: ""`, so it's an independent.
- `category: spirit-bottle`, `materialTags`, `censusKey`.

### c. `look gin` (or `look crowsfoot`)

**Sealed, full, spawned (no maker):**
```

a bottle of Crowsfoot gin

A bottle of Crowsfoot gin — a hand-numbered label, a crow's foot pressed into the wax.

It holds clear, juniper-scented gin.

Crowsfoot Gin — an independent label, carried by no corpo.
```
The verdict is skipped because `maker === ''`, so the authored `gradeBand: fine` is
**invisible**. Sealed or open is **not said** anywhere.

**Bought for the bar** (`BuyController` stamps chattel): add `── Owned by Dave's Bar.`

**On the Crowsfoot goods-yard Stock** (`terminus/.../crowsfoot/thing/stock.yaml`, par 3):
titleLine appends **on the same line** as the long: `…pressed into the wax. On consignment for <consignor> at <price>.`
or `The shop asks <price>.`

**Empty:** `It holds …` is replaced by `The spirit bottle is empty.` (category slug with hyphens
turned into spaces). The long still describes a crow's foot pressed into the wax.

No other `──` lines: not Placing, not Display, not Container.

### d. Senses

- `smell gin` / `taste gin` / `listen gin`: the full visual long, then "It holds clear,
  juniper-scented gin.", then the brand line. ("Juniper-scented" reaches the nose only by
  accident, through the *visual* appearance.) There's no palate, because the class isn't
  Palatable. Tasting the sealed bottle isn't refused by anything I found.
- `feel gin`: Thermal → `A bottle of Crowsfoot gin feels comfortable.` at a ~20 °C room. The
  actual room temperature wasn't determined.
- `sense gin`: same as look.

### e. Card

```
{ displayName:"a bottle of Crowsfoot gin", primaryKeyword:"bottle", shortDescription,
  longDescription, details:[], bulkMaterial:{name:"glass",…}, mass:{0,kg},
  placement:"on" (when shelved on the back-bar) }
```
brand and corpo aren't requested.

Rendered:
- prose;
- Measured: **"Placement — on"**;
- ActionRow sends `drink bottle` / `pour bottle`, which is **ambiguous** among every
  SpiritBottle on the rail (all pin `bottle`). `look` has `onExcess: prompt`;
- chips: VesselKind · Circulating · Sealable · +N.

The glass material is sent and never rendered.

### f. Affordances

drink, fill, pour, sip, spill (Bulkable) and throw (Tangible). All are contested (§0.5).
Validator outcomes on a sealed bottle weren't traced. No `open`/`uncork` is subject-sourced;
`open.yaml` comes from Mobile (`lib/spatial/Mobile.ts:255`).

### g. Runtime state

| State | Surfaces? |
|---|---|
| fill level (0.75 L → dregs) | **No.** Only holds vs empty |
| sealed / opened | **No.** Bistate state has no augmenter |
| grade (`fine`) | **No.** The verdict needs a maker |
| brand / corpo | yes, prose line; not on the card |
| owner | `── Owned by …` in prose only; lost in card mode |
| shop terms | glued onto the long, in prose and card |
| temperature | feel only |

### h. Gaps and noise

- Gap: level, seal state, and grade. A "fine" bottle and a cheap one read the same unless
  made by a recorded maker.
- `primaryKeyword: bottle` makes every card link and action ambiguous.
- The authored "crow's foot pressed into the wax" never reacts to opening.
- The brand line partly repeats the long description.
- Noise: "Placement — on" on the card.

---

## 3. Back-bar — `packages/content/trade-hospitality/content/trade/hospitality/thing/back-bar.yaml`

### a. Chain and mixins

The row has no `extends:`. `class: /trade/hospitality/thing/BarStation`
(`packages/content/trade-hospitality/src/thing/BarStation.ts`)
→ `Station = Placing(Thing)`, with `fixedInPlace = true` (`platform/thing/Station.ts`).
It is **not Good**: no Chattel, no Concealable.

Census matches: **Placing, Wet, Visible, Detailed, Perceptible, Tangible, Containable.**

- markupAugmenters: Detailed, Visible, Wet.
- subscribableFields: Stuff, Containable, Tangible, Perceptible, Detailed, Visible,
  Placing(holds, placed).

### b. Authored data

- `shortDescription: back-bar`, `register: definite`.
- `keywords: [rail, back-bar, backbar, shelf]`, so primaryKeyword = **`rail`**.
- `longDescription: "A long mirrored back-bar, its rail worn smooth, ranked with bottles."`
- No placements authored, so it defaults to `['on']` (`lib/spatial/Placing.ts:237-241`).

What's on it:
- the trade bundle props `house-tablet (as: tablet)` and `tip-jar` with `on: back-bar`
  (`trade-hospitality/.../location/bar.yaml`; the lounge replaces the tablet with its own row
  via `as: tablet`);
- the bottles Mara buys against the par sheet. The rail **boots empty**
  (`saxonberg-lounge/.../location/bar.yaml` header). A full par is about 8 gin, 8 vodka,
  8 whiskey, 4 + 4 rum, 4 tequila, 2 each of the liqueurs and vermouths, 4 + 4 + 4 wine… — 50+
  bottles.

### c. `look back-bar` / `look rail`

**Fresh boot:**
```

the back-bar

A long mirrored back-bar, its rail worn smooth, ranked with bottles.
── On it: the house tablet and a tip jar.
```
The long claims "ranked with bottles" while it's empty.

**Stocked (more than 4 items, so a block list):**
```
── On it: 
  the house tablet
  a tip jar
  a bottle of Crowsfoot gin
  a bottle of Volk vodka
  … (every bottle, no cap)
  a bottle of X.
```
The Placing branch has **no LOOK_INLINE cap** (unlike the Container branch), so all 50+
bottles print. Identical bottles aren't grouped. Items aren't filtered by perceives in this
loop.

No Owned-by (not Chattel), no screen, no In-it (not Container).

### d. Senses

- `smell`/`listen`/`taste`/`feel back-bar`: "A long mirrored back-bar, its rail worn smooth,
  ranked with bottles." Not Thermal, so `feel` prints the visual text too.
- `sense back-bar`: the long plus the same `── On it:` line (`SenseController.ts:261-272`).

### e. Card

```
{ displayName:"the back-bar", primaryKeyword:"rail", longDescription, details:[],
  bulkMaterial:null, mass:{0,kg}, holds:true,
  placed:[{name:"on", heading:"On it", items:[REF records…]}] }
```
Rendered:
- prose;
- Measured: **"Holds — yes"**;
- PlacedList "On it": 5 rows plus "+N more", each a `look <primaryKeyword>` link. Every
  bottle is `look bottle`, which is ambiguous. The tablet is `look tablet`, the tip jar
  `look tip-jar`;
- ActionRow `mix rail`, `serve rail`, `garnish rail`, `flourish rail` (and `throw rail`), each
  only if not pre-empted;
- chips: Placing · Wet · Visible · +N. These are near-plumbing for this object.

### f. Affordances

mix, serve, garnish, flourish come from the BarStation class (`peers` + `environment`), and
throw from Tangible. ⚠ The **well** is also a BarStation with the identical list. Only
whichever of the two is newest on the giver's command stack shows these as `subject`; the
other's ActionRow loses them (§0.5). `throw` on a fixed-in-place station is probably disabled
by its validator, but I didn't trace that.

### g. Runtime state

- What's on it: yes, in prose and card.
- Stock level vs par: **not on the back-bar**. Only `house stock` derives it, on the tablet.
- Cleanliness or wetness of the rail: wetness line only if wetted; not Soilable.
- Nothing about the mirror, lighting or order.

### h. Gaps and noise

- Gap: a summarized shelf ("well stocked; short on gin") instead of 50 lines.
- Gap: grouping like bottles.
- Gap: the long's "ranked with bottles" is static fiction.
- Noise: "Holds — yes".
- Noise: the `rail` keyword as the card's handle.
- Noise: the trailing period glued to the last block-list item.

---

## 4. Bar stool — `packages/content/trade-hospitality/content/trade/hospitality/thing/stool.yaml`

### a. Chain and mixins

The row has no `extends:`. `class: /platform/thing/Chair`
→ `Soilable(Assembled(Crafted[⊃Graded](Durable(Postured(Slotted(Good))))))`, constructor
`fixedInPlace = true` (`platform/thing/Chair.ts`).

Census matches: **Soilable, Assembled, Crafted, Graded, Durable, Postured, Slotted, Chattel,
Concealable, Wet, Visible, Detailed, Perceptible, Tangible, Containable.** It is **not
Placing** and **not Container**.

- markupAugmenters: Detailed, Visible, Wet, Chattel, Durable, Assembled, Soilable. Crafted has
  none, so no verdict.
- subscribableFields: the Thing set only (Stuff, Containable, Tangible, Perceptible, Detailed,
  Visible).

### b. Authored data

- `shortDescription: bar stool`, `register: indefinite`.
- `keywords: [stool, seat, bar-stool, bar]`. ⚠ `bar` collides with the room and the counter.
- `longDescription: "A tall stool with a worn leather seat, shaped by whoever sits there most."`
- `restQuality: 0.8`, `mass: 6`.
- `staticSlots: [{name: 'sit:1', accepts: SlottableMixin, capacity: 1, postures: [sit], userFacingDetail: seat}]`.
  `userFacingDetail` is only a slot-targeting keyword (`lib/slot/Slotted.ts:73-74`); it does
  **not** create a Detailed entry.
- Six are spawned (`{template: stool, count: 6}`).

### c. `look stool`

**Empty, sound, clean:**
```

a bar stool

A tall stool with a worn leather seat, shaped by whoever sits there most.

It is one piece.
```
Durable at ≥0.8 says nothing. Assembled with no bill and no parts gives `It is one piece.`
(`lib/craft/Assembled.ts:443-446`). Soil is clean, so nothing.

**Occupied by Remy:** **identical.** Chair isn't Placing or Container, and sitting uses
`transferPosture` into the `sit:1` slot (`platform/idea/cmd/posture/SitController.ts`), not a
placement. ⚠ LookController's comment "A person sitting on a stool is placed on a host too"
(`:594`) and SenseController's (`:269`) are false for Chair. `SitController` itself says only
`You sit down.` / `X sits down.` and doesn't name the seat. The person's room presence form
adds only a user-set Status (`platform/idea/api/RecognitionLogic.ts:258-264`), never a
posture.

**Worn/filthy:** `\n\nIt is worn.` (and/or `It has been mended by X.`), then
`\n\nIt is <soil phrase>.` / `It smells of …`. "It is worn." on top of the authored "worn
leather seat" reads as a repeat.

No `──` lines (prop-spawned, no chattel id).

### d. Senses

`smell`/`listen`/`taste`/`feel stool`: the visual long plus `It is one piece.` Not Thermal, so
feel gets prose too. The soil smell line is the only filter-correct part. `sense stool` is the
same as look.

### e. Card

```
{ displayName:"a bar stool", primaryKeyword:"stool", longDescription, details:[],
  bulkMaterial:null, mass:{6,kg} }
```
Rendered:
- prose;
- Measured **"Mass — 6 kg"**;
- ActionRow from Assembled/Tangible;
- chips: Soilable · Assembled · Crafted · +N.

No occupant, no rest quality, no "free/taken".

### f. Affordances

fit, repair, salvage, name (Assembled peers) and throw (Tangible), all contested by other
Assembled and Tangible things. **`sit` is never offered as the stool's**, because it's the
actor's own verb from Posed. So the card's "What it affords" for a seat likely reads
`fit · name · repair · salvage`, minus disabled ones.

### g. Runtime state

| State | Surfaces? |
|---|---|
| who sits on it / free or taken | **Nowhere** (look, sense, card) |
| rest quality (0.8 × structure) | nowhere |
| wear / mends | look line when below "sound" |
| filth | look / smell line |
| ownership | none (no chattel id) |

The room's `stools` detail (lounge `bar.yaml`) claims one sits "empty on purpose": static
fiction.

### h. Gaps and noise

- Gap: occupancy is the single most useful fact about a bar stool, and nothing produces it.
- Noise: "It is one piece." on every look, smell and taste (repair pedagogy leaking into
  seating).
- Noise: "Mass — 6 kg".
- The six stools are indistinguishable, and `look stool` hits `onExcess: prompt` or the first
  match.
- The `bar` and `seat` keywords collide (the room's `stools` detail owns `seat`).

---

## 5. Volk neon sign — `packages/content/saxonberg-lounge/content/world/lounge/thing/neon-veshko.yaml`

### a. Chain and mixins

The row has no `extends:`. `class: /platform/thing/NeonSign`
→ `Adornment[⊃Slottable](Branded(LightSource(Thing)))` (`platform/thing/NeonSign.ts`).
It is **not Good**.

Census matches: **Adornment, Slottable, Branded, LightSource, Wet, Visible, Detailed,
Perceptible, Tangible, Containable.**

- markupAugmenters: Detailed, Visible, Wet, Branded.
- subscribableFields: the Thing set plus Branded(brand, corpo), which isn't in DETAIL_FIELDS.

Attached by the room's `adornments: [{template: neon-veshko, slot: sign:veshko}]` (lounge
`bar.yaml`). It lives in `getFixtures()`, not `getContents()`.

### b. Authored data

- `shortDescription: Volk neon sign`, `register: indefinite`.
- `keywords: [volk, sign, neon, veshko]`, primaryKeyword `volk`.
- `longDescription`: "A neon sign in Veshko's blunt industrial typeface — the word VOLK
  stamped out in hard amber capitals over a stylized cogwheel. It throws a warm, faintly
  migraine-bright glow across its corner of the back-bar and hums at a pitch you stop hearing
  after the first drink."
- `_brandKey: volk`. Brand row: `name: Volk`, `owner: veshko`, `category: vodka`. Corpo
  `label: Veshko`.
- `emittedIntensity: 95` (lumens), `emittedColorTemperature: 2000`.
- No sound or heat source is composed; the "hums" lives only in prose.

### c. `look volk`

**Always (lit; there's no off state):**
```

a Volk neon sign

A neon sign in Veshko's blunt industrial typeface — … hums at a pitch you stop hearing after the first drink.

Volk — a product of Veshko.
```
No `──` lines.

In the room `look`, adornments are filtered out of "You also see" (`LookController.ts:214`).
The sign appears only through the room's long ("Neon signs and brass tap handles wash the far
wall…") and its `signs` detail. Light reaches `look` only as the room's band phrase and
possibly a tint line (`LookController.ts:441-459, 514-533`); nothing is said per sign.

Targeting:
- `look neon` / `look sign` contend between the room detail `signs` (keywords include `sign`,
  `neon`), this sign, and the aevex sign (`zero, sign, neon, aevex`), giving `onExcess: prompt`.
- `look volk` also collides with any Volk vodka bottle on the rail
  (`terminus/.../veshko/thing/volk.yaml` keywords `[volk, vodka, …]`).
- `look veshko` is the only clean handle.

### d. Senses

- `listen volk`: the full visual long (which happens to contain "hums") plus the brand line.
  Room-level `listen` uses the SoundModality, and the sign isn't a sound source, so the room
  never hears it.
- `feel volk`: not Thermal, so the visual prose; no warmth.
- `smell` / `taste`: the visual prose.
- `sense`: same as look.

### e. Card

```
{ displayName:"a Volk neon sign", primaryKeyword:"volk", shortDescription, longDescription,
  details:[], bulkMaterial:null, mass:{0,kg} }
```
Rendered: prose (with the brand line); no measured rows (no holds or placement); no
ActionRow (fixtures aren't peers); chips Adornment · Slottable · Branded · +N.

### f. Affordances

None as subject in the room. Adornment's `hang` is environment-bucket only, which applies
when held. Tangible's `throw` isn't reached because fixtures aren't walked as peers.

### g. Runtime state

- Lit / dark: the flux can be set to 0 (`lib/perception/LightSource.ts` doc), but **no
  augmenter or field reports it**. The authored "throws a warm … glow" stays either way.
- Color and intensity: nothing per sign; only the room-level light band and tint.
- Brand / corpo: the prose line only.

### h. Gaps and noise

- Gap: on/off and "humming" as derived state.
- Gap: the sign's light isn't attributable from the sign itself.
- Gap: absent from the room roll.
- The brand line restates what the long says (Veshko, VOLK), but adds the fact that Volk is a
  vodka nowhere.
- Keyword collisions make the sign hard to address.

---

## 6. House tablet — `packages/content/saxonberg-lounge/content/world/lounge/thing/house-tablet.yaml` (and the trade row)

### a. Chain and mixins

Both rows: no `extends:`, `class: /platform/thing/Tablet` → `Display(Good)`
(`platform/thing/Tablet.ts`).

Census matches: **Display, Chattel, Concealable, Wet, Visible, Detailed, Perceptible, Tangible,
Containable.**

- markupAugmenters: Detailed, Visible, Wet, Chattel.
- subscribableFields: the Thing set. **Display declares none.**

### b. Authored data

| | lounge row | trade row (`trade-hospitality/.../thing/house-tablet.yaml`) |
|---|---|---|
| shortDescription | house tablet | house tablet |
| register | **definite** | indefinite |
| keywords | [tablet, house-tablet, screen, house] | same |
| long | "A scuffed tablet in a rubber case propped against the back-bar mirror, the stock sheet never far from its screen." | "…rubber case, the stock sheet never far from its screen." |
| pairing / shows | staff / [card] | staff / [card] |
| principal | `/world/lounge/idea/business` | `''` → `mayDrive` is false for everyone under `staff` (`lib/display/Display.ts:241-248`) |
| mass | 0.5 | 0.5 |

The lounge bar places it `on` the back-bar, replacing the trade row via `as: tablet`.

### c. `look tablet`

**Boot (the screen is dark; `_showing = null`, "a screen is dark on boot"):**
```

the house tablet

A scuffed tablet in a rubber case propped against the back-bar mirror, the stock sheet never far from its screen.
```
Nothing else: no chattel id, and `readScreen` returns null. The prose claims the stock sheet
is up while the screen is dark.

**After `house stock`** (`packages/content/trade-shopkeeping/src/idea/cmd/banking/HouseShopController.ts:221-226`
calls `show({kind:'card', cardId:'stock', …})`):
```
…never far from its screen.
── Showing: the stock card.
```
That text comes from `` Mml.compose`Showing: the ${source.cardId} card.` `` (`lib/display/Display.ts:233`).
It's engine and UI jargon. The sheet's contents aren't read out even though `source.prose`
holds them. A video source would read `Showing: <label>.`

The tablet isn't listed in the room roll, because it's placed on the back-bar; it's found
via `look back-bar`.

### d. Senses

`smell`/`listen`/`taste`/`feel tablet` print the visual long. Not Thermal. The screen line
isn't included in any sense verb.

### e. Card

```
{ displayName:"the house tablet", primaryKeyword:"tablet", longDescription, details:[],
  bulkMaterial:null, mass:{0.5,kg}, placement:"on" }
```
Rendered:
- prose;
- Measured **"Mass — 0.5 kg"** and **"Placement — on"**;
- ActionRow possibly `throw tablet` only;
- chips Display · Chattel · Concealable · +N.

**What the screen shows isn't on the card at all**: Display has no subscribable field, and
the `── Showing` line is prose-only, suppressed in card mode. (The stock card itself is pushed
separately to viewers who see the screen, via `Display.project`.)

### f. Affordances

Only Tangible `throw` (contested). Display contributes no verbs. `house stock` comes from the
venue and seat, and `watch` from Perceiver. So the card's "What it affords" never offers
"house stock".

### g. Runtime state

- On or off, and what's showing: prose `── Showing: the <id> card.` only.
- Who may drive it (pairing staff → employees or proprietor): nowhere. A thief can't tell.
- Principal ("signed in as Dave's Bar"): nowhere.
- Ownership: none (prop).

### h. Gaps and noise

- Gap: the screen's content or title ("the stock sheet: 6 lines short").
- Gap: "signed in as Dave's Bar".
- Gap: "you can drive this" / "locked to staff".
- Noise: "the stock card" (cardId slug plus the meta word "card").
- Noise: "Placement — on".
- Noise: an ActionRow offering `throw`.
- The trade row's empty principal makes it inert in any other venue that doesn't override it.

---

## 7. Cross-specimen patterns

1. **No sense-attributed authoring anywhere.** All six rely on untagged visual prose, so
   `smell/listen/taste` (and `feel` on non-Thermal things) print the visual description plus
   filter-blind augmenter lines: brand, "It is one piece.", "It holds …". Only Thermal things
   get a real `feel`, and only Palatable vessels get a real taste or smell.
2. **Augmenter lines are the only runtime state in words**, and they report categories, not
   levels. Liquid volume, seal state, a glass being used, temperature (on look), occupancy, and
   lit/dark have no producer. The one derived level-word set that exists is for gases.
3. **The card is a weaker look.** It drops Owned-by, the screen, held/worn and glance lines,
   and drops brand/corpo/bulkAmount/register. It shows the material but never renders it. It
   *adds* raw rows "Holds — yes" and "Placement — on". In card mode the prose that carried the
   dropped facts is suppressed.
4. **Subject affordances are unreliable.** Verb-level dedupe before source attribution means a
   pint, a bottle, a stool or a station shows its own verbs only if it's newest on the stack.
   Fixtures afford nothing. Seats never offer `sit`, and glasses never offer `wash`.
5. **The handle problem.** primaryKeyword drives card links and actions: `bottle` (pinned by
   class, on every spirit), `rail` (the back-bar), `volk` (shared with vodka), `stool` ×6.
6. **Static fiction vs state:** "ranked with bottles" (on an empty rail), "the stock sheet
   never far from its screen" (on a dark screen), "throws a warm glow" (with no off state),
   "a crow's foot pressed into the wax" (after opening), a stool "kept empty on purpose".
7. **Doc and code drift seen along the way:**
   - the look filter (docs say `['vision']`, code passes none);
   - the senseStrip/wrapDetail order comment;
   - `──` newline joining in spatial.md;
   - "a person sitting on a stool is placed on a host" (false for Chair).
