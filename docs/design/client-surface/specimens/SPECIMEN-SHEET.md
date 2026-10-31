# Inspection card — specimen sheet

Static trace of what the server actually produces when a player inspects a real row, against
`panterasbox/saxonberg@9550937c6` (2026-10-30). Nothing was run: the npm registry was blocked in
the design session, so the game could not boot. The four detailed traces this summarizes sit
beside this file (`bar-things.md`, `carried-things.md`, `agents.md`, `places-ideas.md`), each
with file:line citations.

Specimens: pint glass · Crowsfoot gin · back-bar · bar stool · Volk neon sign · house tablet ·
blue vial · white loaf · linen shirt · belt knife · corpse · Dave · a hewer · draft horse · a cat ·
another player · Dave's Bar · the lounge · the oak clearing · oak · a species · the lounge
business.

## 1. What the server produces — three shapes, and only three

Every inspection result today is built from:

1. **Authored prose.** The row's `longDescription`. Words that match the row's `details`
   keys are wrapped in `<detail>` (Detailed's augmenter). These are the breadcrumb drill-ins
   the client already supports.
2. **State paragraphs, one per mixin augmenter**, appended in composition order (root-most
   first: `api/mml.ts:193-210`). Each one is one mixin's perceivable face, in words. Examples
   from the specimens:
   - Bulkable: "It holds a pint of beer with a finger of head." / "The pint is empty."
   - Branded: "Crowsfoot Gin — an independent label, carried by no corpo."
   - Crafted (via a class `getLong`): "It looks fair: honestly made, if unremarkable. Made by Mara."
   - Durable: "It is worn." / "It has been mended by X."
   - Assembled: "It is one piece." — on every unbilled object; noise.
   - Soilable: "It is <soil phrase>." / "It smells of …"
   - Wet: "It is damp." / "wet" / "soaked through"
   - Freshness (vessel contents): "It smells faintly off."
   - Materials-response: "Protection — edge ●○○○ · point ●○○○ · …" / "Delivery — …";
     "Playstyle — reach short ○○○○ · guard good ●●●○ · balance light · one-handed"
   - NutritionLabel: "Nutrition: carb 6360000mg, protein 748600mg, fibre 86000mg" (raw mg, noise)
   - Agent body (Attired impression, exertion's mirror, vitals marks): "Dressed plainly." ·
     "In good flesh." · "Missing the left hand." · "A pale scar marks the left forearm."
   - Location: forestry stand "Oak stands here — about twelve trees' worth, old, planted by
     nobody alive."; a floor puddle.
3. **Controller lists**, each `── <heading>: …` from LookController: On it (Placing, heading
   from the Placement row) · Owned by (Chattel with a minted id) · the display's screen line ·
   Wearing / Holding / In it (capped at 4, then "and N more — `inventory x`") · Obvious exits ·
   You also see · hint lines for near-perceived concealed things. A room also sends uncarded
   lines: the light band ("It is dim here; you can make the place out, but not much of it."),
   a tint line, and help-wanted notices ("HELP WANTED — …").

There is no fourth shape: **no short "state words", no salience, no per-mixin summary method**.
My earlier comps invented those.

## 2. What the card gets today — less than `look`

The card is a field projection (`DETAIL_FIELDS`), not the prose. It receives
displayName · primaryKeyword · shortDescription · longDescription (prose 1 + 2 above, as one
markup string) · illustration · details · bulkMaterial (the object's own material, then hidden
by the client) · mass · contents · worn · exits · placed · placement · holds.

It loses everything in shape 3 except exits, worn, contents and placed: no Owned by, no screen,
no **Holding**, no hints, no light, no notices. In card mode the look frame is suppressed, so
those facts vanish. It adds noise rows ("Holds — yes", "Placement — on"). Ideas have a client
layout but no ordinary command opens one.

## 3. What the specimens need that nothing produces (gaps)

- **Levels**: liquids say only "holds X" or "is empty". No full / half / dregs.
- **Seal state, lit/dark, screen on/off, used vs clean glass**: modeled, never said.
- **Who sits on a stool**: posture is a slot, not a placement; neither card nor look says it.
- **Agent presence**: status line, posture, engaged, away/linkdead never reach `look` or the card.
- **Grade without a maker**: the gin's authored `gradeBand: fine` is invisible.
- **Players can't author their own appearance**: every stranger reads "a human" with the same
  species paragraph.
- **Single-sense verbs replay the visual text**: almost nothing authors `<sense>` regions, and
  most augmenters ignore the filter, so `taste stool` prints the stool's appearance.
- **Arrival runs `sense`, not `look`**: no light band, no notices, no hints, and the full
  description even at midnight.
- **Ideas**: oak is reachable only through the wiki (spoiler levels on measured properties);
  a species only through char-gen; a business not at all.

## 4. Privacy and correctness bugs found on the way

1. A person's `contents` (their pockets: hewer's pick, timber, glowcap jar) and exact mass reach
   every viewer's client. Only the client hides them.
2. `── Owned by <holder>` and "Made by <maker>" use the true, viewer-blind name.
3. The corpse is named "body of <true name>" to everyone; it renders with the `npc` tag.
4. The combat line shows true state to every viewer (no fog).
5. "It looks fair … Made by Mara." survives washing, so an empty clean glass keeps its last drink's maker.
6. Affordance subject/actor attribution depends on command-stack order for any verb several
   objects offer, so a card's "What it affords" is accidental.
7. Card action links target ambiguous keywords (`bottle` on every spirit, six `stool`s).
8. `──` lines after the first run together with no newline. Placing lists have no cap (a
   stocked rail prints 50+ bottles).
9. Authored prose contradicts state: "ranked with bottles" on an empty rail; "the stock sheet
   never far from its screen" while it is dark.

## 5. What this means for the card

- The card should render the **same three shapes** as `look`, not a parallel field model.
- The one server change it needs is for `look`'s result to arrive **as segments, not one
  string**: each segment knows its shape (prose / state / list / notice) and its **source
  mixin or controller line**. `Mml.augment` already iterates augmenters per mixin, so it can
  tag what it appends. With segments the card can attribute each state line to its interface
  (legible architecture), drop or quiet boilerplate (Assembled's "one piece"), render pip rows
  as pips, and stop losing the `──` lists.
- **Quiet is the augmenter's own business, as Freshness already does**: it says nothing when
  fresh. "It is one piece." and the never-used verdict are the two to quiet.
- **Group, don't list**: the back-bar's rail and a corpse's contents want "12 bottles ▸",
  identical items collapsed, expanded in place.
- **Fix the privacy bugs before the card shows more**: pockets, owner names, maker names, corpse names.
