# Paper & printing — requirements

**Kind:** feature
**Leads from:** content (two trades and two venues); the kernel adds one thing,
the **static rung of a display**, whose first consumer is this build's printed
page and whose second is the cannery's label
([cannery-and-bottling-slate](../slates/builds/cannery-and-bottling-slate.md) § 6a).

Nothing in the realm is made of paper. The Terminus Gazette publishes every
edition to the ticker and prints on nothing; the assay report is a linen slip
*"because there is no paper material row in the tree."* This build makes paper
from rags at a water mill on the Delight, and prints the Gazette on it in a
print shop in Terminus: type cast, set, proofed, printed and put back in the
case. A printed thing is the **static rung of a display**: it shows a document
the way a screen does, but frozen at the moment of printing, needing no power,
costing labor per copy, and **impossible to recall**. That last property is
the build's lesson and the reason paper survives the information age.

Seeding slate: [paper-and-printing-slate](../slates/builds/paper-and-printing-slate.md),
with the paper-first decision of 2026-11-02 (MR !515): paper builds ahead of
the cannery and owns the static rung.

## What already exists

- **Reading and writing on things.** `read` reads the marks on a written thing
  (ink needs light; embossed marks read by touch); `write <words> on <thing>`
  adds text to anything that takes writing, and wet ink runs. `label` writes
  your name on a thing. Literacy is out of scope (as `read` already says).
- **The press subsystem.** Publishers are organizations; the Gazette is one,
  with Hesper Quill in its `editor` seat posting the price index to the ticker
  each edition. A release can be **edited and retracted** — the revocable,
  free-to-copy carrier that print stands against.
- **Displays.** A tablet, a wall TV and the terminal's board are one thing; a
  screen's prose is *read off it* per viewer. Every display today is powered
  and driven and goes dark on boot. There is no static rung.
- **Pressing and setting.** The screw press (wine, cheese, tile); moulds that
  drain (the moulding design already names *pulp on the paper-maker's mould*
  as a drain set, the cheese hoop's physics); `impress`; the carpentry drying
  loft as its own air space; `dip` (candles, glaze); `dry`.
- **Water.** The Delight's flats carry Heart's Delight's millrace and sawmill
  race; the grist mill grinds at whatever the river gives. The Kestrel brings
  Rejection's mine water down to Terminus at the confluence.
- **Inputs, shipped or landing with paint (!513):** linen from the textiles
  chain; **rags** (squares of old linen); **lampblack**; **linseed oil**; hide
  glue; the dyer's **copperas** and **gall tannin** (as mordants); lead and tin
  as metals, ingot moulds, crucibles and the Founding discipline. Paint's
  requirements hand *"paper sizing and bookbinding"* to this build.
- **Text-bearing goods** — scrolls, the assay slip, the icehouse book, the
  coat-check ticket, the signpost — none of them paper.
- **Disciplines:** nothing for papermaking or printing.

**Therefore what is genuinely new here is:** paper as a material (from rags,
by beating, forming, couching, pressing, drying and sizing), its grade, ink as
a material (iron-gall and printing), antimony and type metal, the forme
(compose, proof, print, distribute), the static rung of a display with the
printed page as its first member, the paper mill on the Delight, the Gazette's
print shop in Terminus, and two Disciplines.

## Goals

- **Paper is a material the realm makes.** Rags become sheets at a water mill;
  a sheet has a grade a reader can tell — weight, evenness, color, sized or
  not — and every part of the grade comes from how it was made and **from the
  water it was made in**.
- **Sizing teaches absorbency.** Ink written on unsized paper bleeds; sized
  paper holds it. Unsized paper is blotting paper, a product in its own right.
- **Ink is made, not stocked.** Iron-gall writing ink from galls, copperas and
  gum (the dyer's iron-tannin black, one chemistry in two trades); printing ink
  from lampblack and boiled linseed oil.
- **Type is capital.** Type metal (lead, tin, imported antimony) is poured into
  a hand mould one sort at a time; a case holds a finite font, and a page that
  needs more of a letter than the case holds cannot be set.
- **A printed page is a frozen document.** Setting a Gazette release in type
  freezes the version set; `read` on any copy shows that version. When the
  editor edits or retracts the release, the ticker changes and **no printed
  copy does**.
- **Misprints come from the compositor's competence, and `proof` finds them.**
  A correction made before the run is clean; one made after it is a second
  printing, and the first copies are still out.
- **The Gazette prints.** Each edition can have a print run as well as a ticker
  line, sold over a counter; the print run against the ticker is a real
  business choice (paper and labor per copy, no power, no network, no recall).
- **The static rung is the display substrate's**, not a paper special case: a
  later label, sign or ticket composes on it with no new mechanism.

## Non-goals

- **Parchment and vellum** — skins limed, stretched and scraped → rows on
  tanning; a tail slate split from the paper slate at sweep.
- **Woodcut and engraving** → a printmaking tail on this build's press (the
  block is `carve`d; engraving waits on the metal-forming rung).
- **Bookbinding** → a tail (folding, sewing gatherings, boards, paint's glue).
- **The watermark and banknotes** → wait on the cannery build's metal-forming
  rung (wire drawing) and the bank issuing paper.
- **Board, cartons and paper bags** → arrive with the cannery as the mill's
  customer ([cannery-and-bottling-slate](../slates/builds/cannery-and-bottling-slate.md)).
- **Licensing the press** → nowhere until a polity wants it; the engine gives a
  polity the tools and never imposes the license (governance lens 7). Stays in
  the paper slate.
- **A rag-and-bone vocation** → nowhere, deliberately, until a player wants the
  job. The mill buys rags at its door from anyone.
- **Rejection's print shop** → the second venue, rows only, a later content
  pass. The test that it needs no pack code is recorded under Placement.
- **A domestic antimony source** → the metal chain's Stage C ([metal-chain-slate](../slates/builds/metal-chain-slate.md));
  antimony is imported until then.
- **Wood pulp, the typewriter, the copier, the printer** → later rungs of the
  same `copy` ladder, in the paper slate.
- **Literacy** → out, as `read` already states.

## Placement

- **Two trades, two packs.** Papermaking (the mill: rags to sized sheets) and
  printing (inks, type founding, the forme, the press) are different trades
  practised in different places, the way textiles, dyeing and tailoring are.
  Each owns its mechanism under its own `/trade/<industry>` root.
- **The static rung is kernel.** Its composers — a page (printing), a label
  (the cannery), a sign or ticket later — have no common pack ancestor, so it
  belongs with the display substrate.
- **The venues are locality content.** The paper mill is Heart's Delight's, on
  the Delight's flats beside the millrace and the sawmill race. The print shop
  is Terminus's, the Gazette's printing house, taking jobbing work on the side.
- ⭐ **A second instance needs no code.** A second mill or a second print shop
  (Rejection's) is rows naming the trades' mechanism.

## Collisions

- **The Delight's flats** already carry two works on one race. The paper mill
  is a third draw on the same reach; what the river gives is shared, and the
  mill's waste water goes into what Heart's Delight's lower farms and Terminus
  then drink.
- **The Gazette** has a publisher and an editor but **no premises**: Hesper
  stands in the counting-houses' avenue block. The print shop gives the
  Gazette a house; Hesper's edition beat keeps posting to the ticker, and the
  print run is the shop's to take or not.
- **The ticker's `press` verb** owns the word *press*; the printing act is
  `print` (the common word wins). The screw press is a thing you turn, not a
  verb, and stays so.
- **`dip`** (candles, glaze) is reused for forming a sheet and for sizing —
  each is immersing a thing and withdrawing it with a coat.
- **`dry`** is reused for the loft.
- **`cast`** is arcana's; type is poured into the hand mould by the shipped
  pour-into-a-mould path, never a second `cast`.
- **`label`** stays the write-your-name verb; a printed label is the cannery's.
- **The assay slip and other linen paperwork** stay linen in this build; moving
  them to paper is a content pass after it.
- **Rags** ship with paint (oily rags self-heat); the mill wants clean linen
  rags, and an oily rag makes a poor sheet.

## Surface decisions

### The order — paper first, owning the static rung
The owner, 2026-11-02. The page is the rung's natural first member; the
Gazette is the demand already there; the cannery arrives later as a customer.

### The static rung — what a printed page is
A printed thing shows a document, like a screen; what differs is the dynamics:
frozen at printing, no power (it needs light to read), costs labor and material
per copy, never revocable, carried rather than networked, killed by fire and
water. `read` answers on a page as on a screen. **A page's content persists**
— unlike a screen, it is not dark on boot; a printed copy is the same copy
after a reboot.

### Printing a release freezes it
The compositor sets a document — a Gazette release, or any written sheet — into
the forme. What is set is the version at that moment. Each copy pulled shows
the forme as set, **misprints included**. Editing or retracting the release
afterwards changes the ticker and the press room and leaves every copy alone.
(Lens 4: irrevocability is why censors seize presses, and the player learns it
by watching it happen.)

### Misprints and proofing
Composing carries errors in proportion to the compositor's competence; nobody
is told where they are. `proof` on the forme (or a pulled proof sheet) finds
errors, again by competence; a found error can be corrected before the run. A
missed error is printed in every copy. (Instrumentation's rule: competence
resolves detail, never access.)

### Type is capital
A case holds a finite count of each sort. Setting consumes sorts from the case
into the forme; `distribute` returns them after the run. A page that needs more
of a letter than the case holds cannot be set until more is cast. Casting is
pouring type metal into the hand mould: one sort per pour.

### Paper grade comes from the making and the water
- **Fiber** — clean linen rags; oily or dirty rags make a worse sheet.
- **Beating** — under-beaten pulp makes a weak, uneven sheet.
- **Forming** — the vatman's competence sets evenness and weight.
- **The water** — iron browns rag paper (glass's logic). A mill on clean water
  makes white paper; the same mill on the Kestrel below Rejection makes brown.
  Derived from the water the mill draws, never authored on the sheet.
- **Sizing** — sized or not; unsized is blotting paper.

### The mill's site — the Delight
On the Delight's flats at Heart's Delight. Clean water upstream of the mine
water, so its sheets are white; its waste goes downstream into the farming
valley's lower reach and Terminus. (Lens 6 and 7 conflict produced by
geography, not authored.)

### The rag supply
The mill buys rags at its door from anyone. A worn linen or cotton garment can
be torn into rags. No rag-and-bone NPC.

### Antimony
Imported, sold in Terminus. The domestic source is the metal chain's.

### The Gazette's print run
The print shop is the Gazette's printing house; a print run is taken per
edition when somebody sets and pulls it (a player at the shop's seats, or its
hands). Copies are sold over the shop's counter. The shop also takes jobbing
work — a handbill or a poster set from a customer's written sheet.

### Verbs
Reused: `dip` (form a sheet; size it), `dry` (the loft), the screw press (turn
it on the post of couched sheets), pouring into a mould (type), `read`,
`write`. New: `beat` (rags to pulp in the stamper), `couch` (the wet sheet off
the mould onto felt), `compose` (set a document into the forme), `proof`,
`print` (pull copies), `distribute` (type back into the case). No verb is
conferred by a band; a refusal tells the novice what lifts it.

### Disciplines
Two: **papermaking** and **printing** (composing, proofing and presswork). Type
casting rides the shipped Founding discipline.

## Lens pass

1. **Pedagogy** — absorbency and sizing (blotting paper); iron in the water
   browns the sheet; misprints and proofing; type as finite capital; the
   carrier ladder (paper frozen and irrevocable, the ticker live and
   revocable). Disciplines: papermaking, printing, Founding.
2. **Creative expression** — the ordinary case is a player's own text: write a
   sheet, have it set and printed, hand out a hundred copies. A second mill or
   shop is rows. Images wait for printmaking.
3. **Immersion / participation** — the vatman, the coucher, the compositor, the
   pressman are real seats; a handbill pinned up is a thing in the world;
   **a player can do something we did not want**: print a scandal the editor
   later retracts from the ticker and watch the copies outlive the retraction.
4. **Values** — the undecidable choice is what to print, knowing it can never
   be withdrawn. The printer decides; there is no gauge.
5. **Continuity** — the static rung answers `read` exactly as a screen does;
   `copy` runs scribe → press → copier → printer. Only the dynamics change.
6. **Economy** — produces paper, ink, type and printed copies; consumes rags,
   water, galls, copperas, lampblack, linseed oil, lead, tin, antimony and
   labor. The Gazette (demand already there) pays for paper and presswork and
   sells copies; jobbing pays the shop between editions. The mill fouls
   water somebody downstream drinks.
7. **Governance** — the press owner decides what prints. Licensing waits for a
   polity that wants it. **Gap:** nobody can yet stop a printing, and that is
   recorded rather than solved.

## The drive

Paces: `instant` (no clock) · `short` (up to about a game day) · `staged` (a
span's outcome set directly with wizard tools) · `span` (weeks). Each step
names its assertion: `player` or `staged`.

### Blocking drive

1. `instant · player` — At the Heart's Delight paper mill, sell a bundle of
   clean linen rags at the door; the mill pays for them. Try an oily rag: it
   is bought cheaper or refused, with the reason.
2. `instant · player` — Tear a worn linen shirt into rags; they are rags.
3. `staged · staged` — *(twin of soak 1)* Rags already retted in the mill's
   vat-house.
4. `short · player` — `beat` the retted rags in the stamper on the race; pulp
   comes out. With the race slowed (staged), beating is slower — the stamper
   runs on what the river gives.
5. `instant · player` — `dip` the mould in the vat; the mould carries a wet
   sheet. `couch` it onto felt. Repeat to build a post.
6. `short · player` — Turn the screw press on the post; water leaves.
7. `short · player` — Hang the sheets in the loft and `dry` them.
8. `instant · player` — `look` at a sheet: white, its weight and evenness in
   words, **unsized**. `write` on it with iron-gall ink: the ink bleeds — it is
   blotting paper.
9. `short · player` — `dip` sheets in the gelatin size and dry them. `write` on
   one: the ink holds.
10. `instant · staged` — The same dip, couch, press and dry at a mill whose
    water is drawn below Rejection (staged venue): the sheet is brown.
11. `staged · staged` — *(twin of soak 2)* Galls already steeped. Mix them with
    copperas and gum: iron-gall ink. Grind lampblack into boiled linseed oil:
    printing ink.
12. `instant · player` — At the Terminus print shop, buy antimony; melt lead,
    tin and antimony into type metal; pour it into the hand mould: one sort.
13. `instant · player` — Hesper posts an edition to the ticker. In the shop,
    `compose` that release into the forme as a novice compositor. The case
    runs short of a letter on a long release: refused, naming the letter.
    Shorten the job (or cast more sorts) and set it.
14. `instant · player` — `proof` the forme: errors are found (some, not
    necessarily all, at a novice's competence). Correct one.
15. `short · player` — `print` a run of copies on sized paper with printing
    ink; paper and ink are consumed per copy.
16. `instant · player` — `read` a copy: the release as set, any missed misprint
    included.
17. `instant · player` — Hesper edits the release, then retracts it. The ticker
    and press room change; `read` the printed copy: **unchanged**.
18. `instant · player` — Buy a copy over the counter; carry it to another room
    and read it there with a lamp; in the dark it cannot be read.
19. `instant · player` — `distribute` the type; the case is whole again.
20. `instant · player` — Restart the world: the printed copy reads the same.
21. `instant · player` — Jobbing: write a handbill on a sheet, have the shop
    set and print ten copies, pin one up in a room; a passerby reads it.
22. `instant · player` — Wet a copy: the ink runs; burn one: it is gone.

### Soak drive

1. `span · player` — Rags left in the retting vat ferment over days to weeks
   until they are ready to beat.
2. `span · player` — Galls steeped in water over days give the tannin for
   iron-gall ink.
3. `span · player` — The mill working a season: its waste shows in the
   Delight's water below it, at Heart's Delight's lower farms and Terminus.

## Acceptance criteria

- A player can turn rags into a sheet of paper at the Heart's Delight mill
  using only player verbs, and `look` tells them its color, weight, evenness
  and whether it is sized.
- Writing on unsized paper bleeds and on sized paper holds.
- The same process on iron-bearing water produces a brown sheet, with no
  sheet-level authoring.
- A player can make iron-gall ink and printing ink from their inputs.
- A player can cast a sort, set a Gazette release, proof it, print copies, read
  a copy and distribute the type.
- A case short of a letter refuses the setting and names the letter.
- A novice's forme carries misprints that are not announced; `proof` finds some
  of them; uncorrected ones appear in every copy.
- Editing or retracting the release changes the ticker and leaves every printed
  copy as printed.
- A printed copy reads the same after a world restart, cannot be read in the
  dark, runs when wet and is destroyed by fire.
- The print shop sells copies over its counter and takes a jobbing handbill.
- The blocking drive runs green in under half an hour of wall time.

## Cross-references

- [paper-and-printing-slate](../slates/builds/paper-and-printing-slate.md) — seeding slate
- [cannery-and-bottling-slate](../slates/builds/cannery-and-bottling-slate.md) § 6a — the label, the rung's next consumer
- [display.md](../subsystems/display.md) — the substrate the static rung joins
- [press.md](../subsystems/press.md) — publishers, releases, edit and retract
- [mould.md](../subsystems/mould.md) — the drain set; pouring type
- [watershed.md](../subsystems/watershed.md) — the Delight, contamination by kind
- [instrumentation.md](../subsystems/instrumentation.md) — competence resolves detail
- Paint (MR !513) — rags, lampblack, linseed oil, glue
