# Paper — requirements

**Kind:** feature
**Leads from:** kernel — paper as a **medium** (how a document reaches a sheet,
a screen or a mind, and what holding paper means) is platform substrate; its
first consumers ship in this same build: the Gazette's print run, the bearer
warehouse receipt, the notebook, and the carton. The trades (the mill, the print
shop) follow it and are content-led.

Paper is two things at once. It is a **material** — light, cheap once there is a
mill, and fragile: it tears, it burns, water ruins it. And it is a **medium** —
whatever is written on it travels with it. The realm has neither today: nothing
is made of paper (the assay report is linen *"because there is no paper material
row in the tree"*), the Gazette publishes to the ticker and prints on nothing,
and the warehouse receipt's bearer slip was cut because nothing read it back.

This build makes paper from rags at a water mill on the Delight, and decides
what paper **is** in a world that already stores its information three ways —
Ideas (what the world knows), Documents (durable records a parcel or business
keeps) and a person's own claims (what someone has been told or read). The
answer, agreed with the owner on 2026-11-02:

> **The Document is the source of truth. Paper is one way of showing it** — the
> static rung of a display, beside the screen, the phone and the implant. Paper
> is bound to its document, frozen at the moment it was made, needs no power,
> costs labor per copy, **cannot be recalled**, and is readable by whoever holds
> it. What paper is *for* is not decided per epoch; it falls out of which other
> carriers reach a place.

Seeding slate: [paper-and-printing-slate](../slates/builds/paper-and-printing-slate.md),
with the paper-first decision of 2026-11-02 (MR !515) and the design conversation
that followed it. This is one build covering all of it; the plan stages it.

## What already exists

- **Marks on things.** `read` reads marks (inked needs light; embossed reads by
  touch); `write <words> on <thing>` writes into a surface's fixed writing room;
  wet ink runs. `label` writes a name a thing answers to.
- **Documents.** A closed set of kinds owned by a parcel, business or player:
  press releases (editable and retractable), maps, recipes, bills of lading,
  warehouse receipts, water rights. No revision history, deliberately.
- **Reading already teaches.** Reading a bar menu mints a *known-of* claim on
  the recipe ladder (*unknown → known-of → can-make*); reading a **chart** writes
  *charted* claims into your map, errors and all; arcana's spellbooks put a
  working in your mind and set how fast re-reading restores it. The chronicle
  separates a **claim** (told or read) from a **deed** (done).
- **Credentials.** Every credential is *a presentation*; *"validity is always the
  issuer's to confirm — a ledger lookup where reachable, physical or social
  trust where not."*
- **Storage.** `store withdraw` hands a deposit back and settles its receipt; the
  storage slate named the receipt's depositor as *the field a transfer rewrites*.
- **Displays.** A tablet, a wall TV and the terminal's board are one thing; prose
  is read off a screen per viewer. All are powered, driven and dark on boot.
- **Carriers and epochs.** Players carry a phone; the implant is elective; some
  places are off grid. Epoch is a **stamp on the instrument**, and a parcel's
  covenant may refuse later instruments. Terminus is industrial; the country
  around it is medieval.
- **Persistence.** Owned goods persist with their owner wherever they are placed;
  unowned goods in a staged place are restaged.
- **Packaging.** Sacks (jute, holding bulk) and crates (slats, holding goods).
- **Inputs** (shipped, or landing with paint !513): linen; rags; lampblack;
  linseed oil; hide glue and starch paste; copperas and gall tannin; lead, tin,
  ingot moulds, crucibles and the Founding discipline; the screw press; moulds
  that drain (the moulding design already names *pulp on the paper-maker's
  mould*); the drying loft; `dip`, `dry`, `fold`, `carve`, `strain`, `paint`.
  Faces carry coats.
- **Text-bearing goods** — scrolls, spellbooks, the tide almanac, the assay slip,
  the coat-check ticket, the take-a-number ticket, the signpost — none of paper.
- **Disciplines:** nothing for papermaking or printing.

**Therefore what is genuinely new here is:** paper and board as materials and the
mill that makes them; paper as the static rung of a display, bound to a
document and frozen; reading a document on any carrier; access by possession;
bearer paper; the book; the `copy` ladder (pen, press, printer); inks; type and
the forme; woodcut; bookbinding; parchment; paper packaging and wallpaper; and
two Disciplines.

## Goals

### Paper as a medium
- **Every document can be shown on any carrier.** `read` answers the same on a
  sheet, a screen, the phone and the implant. Any document a reader may see can
  be called up on a phone or implant wherever there is coverage, and printed.
- **Paper is bound to its document and frozen.** A sheet carries a reference to
  the document as it was when the sheet was made. When the document's owner
  later edits or retracts it, every outstanding sheet still shows what it showed.
  Five hundred copies of one edition are one record, not five hundred.
- **Paper is readable by whoever holds it.** A document on the network is
  readable by whoever its owner lets read it; a sheet is readable by whoever has
  it in hand. Print a private record and anyone who takes the paper reads it.
- **Reading paper writes claims, never deeds.** A recipe on paper teaches
  *known-of*; a chart writes *charted* claims; a spellbook keeps its shipped
  behavior. Nothing read advances a Discipline or confers *can-make*. Errors on
  the paper travel to the reader.
- **Records stay in the document tree.** A business's ledger book is a live
  presentation of its own records; any extract made for someone else is frozen
  paper. Burning the books destroys the books, never the record.

### Bearer paper
- **Paper can carry a claim.** Registered paper (the record names a person) is
  evidence the issuer checks; bearer paper (the record names whoever presents
  it) **is** the claim. Handing it over transfers it; stealing it works; losing
  it loses the claim. Spent paper is refused when presented — *"already settled"*
  — and stays in your hand.
- **Forgery is decided by the issuer.** A forged slip fails wherever the issuer
  can check its own record and works only where it cannot, on trust.
- **First consumers:** the warehouse receipt becomes bearer paper; the coat-check
  ticket and the take-a-number ticket become paper.

### Little paper and big paper
- **Blank paper is interchangeable; written paper is unique.** Blank sheets stack
  (sheet, quire, ream); a sheet with anything on it leaves the stack.
- **A book is sheets kept together**, with a page count and room per page. One
  book, filled three ways: a **notebook** its owner writes in page by page, a
  **printed book** whose copies share one frozen edition, a **ledger** a business
  keeps. A page can be torn out — the book has a gap, the page is little paper.
- **Folding makes the format.** A sheet folded once, twice, three times is folio,
  quarto, octavo: the size of a page is how many times it was folded.
- **Spellbooks become paper books** and keep their reading behavior. **The tide
  almanac is printed for a year** at printing time and goes stale after it, as an
  almanac does.

### Paper as a material
- **Paper tears, burns and drowns.** A torn sheet loses what was on the torn part.
  Paper catches easily and its information burns with it. Wet paper runs its ink,
  then returns to pulp. Handling wears it.
- **Paper packaging is paper made into shipped containers.** A paper bag is a sack
  of paper; a carton is a crate of board. It is light — its whole advantage — and
  it fails: soaked or torn, it gives way and its contents spill.
- **Board** — pasteboard (sheets pasted together), corrugated board (fluted paper
  between liners), and **papier-mâché** (pulp or paste in a mould).
- **Wallpaper is a coat on a wall's face**, pasted; damp peels it and fire takes it.
- **Filter paper** is a finer filter for the shipped `strain`.

### Making it
- **Paper from rags.** Sell clean rags at the mill's door; tear a worn garment
  into rags. Ret, `beat` in the stamper (which runs on what the river gives),
  `dip` the mould, `couch` onto felt, press the post, `dry` in the loft, size it.
- **Grade comes from the making and the water.** Fiber, beating, the vatman's
  hand, sizing — and iron in the water browns the sheet. A mill on clean water
  makes white paper; the same mill below Rejection's mine water makes brown.
  Unsized paper is blotting paper: ink bleeds on it.
- **Ink is made.** Iron-gall writing ink (galls, copperas, gum — the dyer's
  iron-tannin black, one chemistry in two trades); printing ink (lampblack ground
  into boiled linseed oil).
- **Parchment** from a skin limed, stretched and scraped, never tanned.
- **The `copy` ladder is one act across epochs**, the instrument deciding speed,
  cost and fidelity: the **pen** (by hand, one copy at a time, errors by the
  copyist's competence), the **press** (a forme, a print run), the **printer**
  (a document sent from a phone, no forme). Each instrument carries its epoch, so
  a medieval covenant can refuse the printer and keep the scribe.
- **The press.** Type metal (lead, tin, imported antimony) poured into the hand
  mould, one sort at a time. **Type is capital**: a case holds a finite font,
  and a page that needs more of a letter than the case holds cannot be set.
  `compose` a document into the forme — misprints by the compositor's competence,
  unannounced; `proof` finds some, by competence; `print` pulls copies;
  `distribute` returns the type.
- **Woodcut.** A block `carve`d and printed on the same press; the image is the
  author's own.
- **Bookbinding.** Fold the printed sheets, sew the gatherings, cover with board.

### The venues
- **The paper mill** at Heart's Delight, on the Delight's flats beside the
  millrace and the sawmill race. It buys rags at its door and makes paper, board
  and the paper goods made from them.
- **The print shop** in Terminus, the Gazette's printing house: each edition can
  have a print run beside its ticker line, sold over the counter; jobbing work
  (handbills, posters, tickets, labels) between editions.

## Non-goals

- **Licensing the press** → stays in the paper slate until a polity wants it; the
  engine gives a polity tools and never imposes a license. Nobody can stop a
  printing yet; recorded as a gap under lens 7.
- **Rejection's print shop** → a later content pass; rows only (see Placement).
- **Banknotes** → the bank and the money-warehouse slate (*"a gold receipt passed
  hand to hand is a banknote"*). **Receipts as collateral** → credit. **Futures**
  → storage. This build's bearer paper is the mechanism they will use.
- **The watermark and engraving** → wait on the metal-forming rung (wire drawing;
  copper plate and rolling press) in the
  [cannery-and-bottling-slate](../slates/builds/cannery-and-bottling-slate.md).
- **Etching** → waits on acids; the paper slate.
- **A domestic antimony source** → the metal chain's Stage C
  ([metal-chain-slate](../slates/builds/metal-chain-slate.md)); imported until then.
- **Wood pulp, the typewriter and the copier** → later rungs of the `copy` ladder,
  in the paper slate.
- **The cannery's claims** — the lot code, the recall, the label law → the
  cannery, as a customer of the carton and the printed label.
- **A rag-and-bone vocation** → nowhere, deliberately, until a player wants it.
- **Reading that advances a Discipline** → nowhere; competence comes from deeds.
  A *studied* claim kind is a candidate for a later build.
- **Document revision history** → nowhere, deliberately. Only versions that paper
  is holding are kept.
- **Reading somebody's documents remotely** (surveillance) → nowhere in this
  build; access on the network stays the owner's to grant.
- **Literacy** → out, as `read` already states.
- **Moving existing linen paperwork** (the assay slip, the icehouse book) to
  paper → a content pass after this build.

## Placement

- **Kernel (the platform):** paper as a medium — the static rung on the display
  substrate, the frozen edition, reading a document on any carrier, access by
  possession, bearer and registered paper, the book, the `copy` ladder's common
  act, and the paper and board materials themselves (a depot's receipt is paper,
  and the depot is platform). Its composers — a page, a ticket, a receipt, a
  carton, a label — have no common pack ancestor.
- **`trade-papermaking`** (its own `/trade/` root): the mill's process, board,
  papier-mâché, the paper goods (bag, carton, envelope, wrapping paper, filter
  paper, wallpaper).
- **`trade-printing`** (its own `/trade/` root): inks, type founding, the forme
  and the press, the printer, woodcut, bookbinding.
- **Tanning:** parchment and vellum as rows on the shipped trade.
- **Arcana:** spellbooks re-made of paper, keeping their behavior.
- **Diving:** the tide almanac, printed for a year.
- **Localities:** the mill is Heart's Delight's; the print shop is Terminus's.
- ⭐ **A second instance needs no code.** A second mill, a second print shop
  (Rejection's), a second book, a second kind of bearer ticket — rows.

## Collisions

- **The Delight's flats** carry two works on one race; the mill is a third draw
  on the same reach, and its waste water reaches Heart's Delight's lower farms and
  Terminus, which drinks last.
- **The Gazette** has a publisher and an editor (Hesper Quill) but no premises; the
  print shop gives it a house. Her edition beat keeps posting to the ticker; the
  print run is the shop's to take or not.
- **The warehouse receipt** is a record today with no object; it gains bearer
  paper. Who may withdraw changes from *the depositor* to *whoever presents the
  receipt* — a real change for anyone holding deposits.
- **The coat-check ticket and the take-a-number ticket** are carried things with
  no material; they become paper and can now be lost to rain or fire.
- **Spellbooks and the tide almanac** become paper (see Goals).
- **Rags** ship with paint, and oily rags self-heat; the mill wants clean ones.
- **Sacks and crates** stay as they are; paper bags and cartons join them.
- **Verbs:**
  - `press` is the ticker's; the printing act is `print` (the common word wins).
  - `cast` is arcana's; type is poured into the hand mould, never `cast`.
  - `dip` is reused to form a sheet and to size it (immerse, withdraw with a coat).
  - `dry`, `fold`, `carve`, `strain`, `write`, `read` are reused as they are.
  - `label` stays write-a-name; affixing a printed label is `paste`.
  - `paint` stays the brush's; wallpaper is `paste`d.
  - `sew` stays tailoring's garments; binding is `bind`.
  - `cp` is the shell's; the player's act is `copy`.

## Surface decisions

### The document is the truth; paper shows it
Paper never holds a private copy of a document's content. It is bound to the
document. While the document is unchanged, a sheet and the network show the
same thing. When the owner edits or retracts a document that has paper out in
the world, the version the paper was made from is frozen first and the paper
keeps showing it — one frozen edition shared by every sheet, kept only because
paper holds it. **The alternative — paper turning to trash on an edit — was
rejected**: an edit in Terminus would dissolve paper in a pocket in Rejection,
which nobody in the fiction did (lens 3a), and it is the censor's dream; it
would delete the one property paper keeps once the network exists.

### Persistence needs nothing new
Paper is ordinary goods. Owned paper persists with its owner wherever it is
placed; unowned paper in a staged place is restaged like anything dropped there;
a poster belongs to whoever pinned it. A sheet's own state is small — what it
shows and whether it is torn, wet or burnt. Short handwritten marks stay on the
thing, as today; a book's pages live in a document. No new collection.

### Ledgers
Any ledger is a document. A business's own book is a live presentation of it,
kept current as entries are made. Destroying records is an act on the document
by its owner, never arson (lens 7).

### Teaching — claims, never deeds
Reading on any carrier writes claims (*known-of*, *charted*); doing writes deeds.
The refusal to `make` what you have only read about is the progression UI.

### Bearer paper
Registered or bearer, by whom the record names; the issuer's record decides every
presentation; spent paper is refused, not destroyed; forgery succeeds only where
the issuer cannot check.

### One book
Notebook, printed book and ledger are one thing filled three ways; the notebook
is the reference case.

### Epochs — no paper logic, only carriers and instruments
| epoch | a document reaches you by | paper is for | copying |
|---|---|---|---|
| prehistory | marks on things | — | carving, painting |
| medieval | paper | everything | the pen |
| industrial | paper; the aether radio for the urgent | mass print, forms, tickets, bags, board | the press |
| modern | the phone, on demand | irrevocable, bearer, offline, private, presence, packaging | the printer |
| future | the implant | the deliberate: the secret, the original, bearer value | the printer |

Paper itself carries no epoch. The pen, the press, the printer, the bag machine
and the corrugator carry theirs, and a covenant decides which a place admits.

### Packaging
Paper bags and cartons are the shipped sack and crate made of paper and board.
Wet or torn, they give way and spill (the shipped breakage path). Light is the
reason to use them.

### The mill's site — the Delight
Clean water upstream of the mine water, so its sheets are white; its waste goes
downstream to the farming valley's lower reach and Terminus.

### The rag supply
The mill buys rags at its door from anyone; a worn linen or cotton garment can be
torn into rags.

### Antimony
Imported, sold in Terminus.

### Verbs
Reused: `read`, `write`, `dip`, `dry`, `fold`, `carve`, `strain`, the screw
press, pouring into a mould. New: `tear` (rags from a garment; a page from a
book; a sheet), `beat`, `couch`, `copy`, `compose`, `proof`, `print` (the press
pulls a forme; a printer takes a document), `distribute`, `bind`, `paste` (a
label onto a thing; sheets into board; paper onto a wall). No verb is conferred
by a band; a refusal tells a novice what lifts it.

### Disciplines
**Papermaking** and **printing** (composing, proofing, presswork, binding). Type
casting rides the shipped Founding.

## Lens pass

1. **Pedagogy** — absorbency and sizing; iron in the water browns paper; reading
   is a claim and doing a deed; type as finite capital; misprints and proofing;
   folding makes the format; the carrier ladder and what each epoch keeps paper
   for; why a soaked carton spills. Disciplines: papermaking, printing, Founding.
2. **Creative expression** — the ordinary case is a player's own words: a letter,
   a notebook of recipes, a handbill printed and pinned up, a woodcut. Anything a
   player can read on a phone they can print. A second mill, shop or book is rows.
3. **Immersion / participation** — paper is a thing in the world: rained on,
   burnt, torn, stolen, left behind. The vatman, the compositor, the binder are
   real seats. **A player can do something we did not want**: print a scandal the
   editor later retracts and watch the copies outlive it; steal a bearer receipt
   and empty a deposit; forge a ticket where nobody can check.
4. **Values** — paper or the network: possession or permission, irrevocable or
   editable. Printing something private puts it in the hands of whoever takes it;
   keeping it on the network keeps it out of pockets. No gauge; the player decides.
5. **Continuity** — `read` and `copy` answer the same in every epoch; only the
   carrier and the instrument change. **Who holds the obsolete half:** the scribe
   when the press arrives, the printer and the print run when the network
   arrives — in this realm, the medieval country around industrial Terminus.
6. **Economy** — produces paper, board, ink, type, printed copies, books and
   packaging; consumes rags, water, galls, copperas, lampblack, linseed oil, lead,
   tin, antimony, skins and labor. Demand already there: the Gazette, the depot's
   receipts, the tickets, the grocer's and shipper's goods. The mill fouls water
   that somebody downstream drinks.
7. **Governance** — the press owner decides what prints; records are destroyed
   only by their owner, on the document; bearer paper makes possession the
   claim. **Gap:** nothing can stop a printing until a polity builds a license.

## The drive

Paces: `instant` (no clock) · `short` (up to about a game day) · `staged` (a
span's outcome set directly with wizard tools) · `span` (weeks or seasons). Each
step names its assertion: `player` or `staged`.

### Blocking drive

**The mill**
1. `instant · player` — Sell clean linen rags at the Heart's Delight mill's door;
   the mill pays. An oily rag is bought cheaper or refused, with the reason.
2. `instant · player` — `tear` a worn linen shirt into rags.
3. `staged · staged` — *(twin of soak 1)* Rags already retted.
4. `short · player` — `beat` them in the stamper; pulp. With the race slowed
   (staged), beating is slower.
5. `instant · player` — `dip` the mould in the vat, `couch` the sheet onto felt;
   repeat to build a post.
6. `short · player` — Turn the screw press on the post; `dry` the sheets in the loft.
7. `instant · player` — `look` at a sheet: white, its weight and evenness in words,
   unsized. `write` on it with iron-gall ink: the ink bleeds.
8. `short · player` — Size sheets (`dip`, then `dry`). `write` on one: it holds.
9. `instant · staged` — The same sheet made at a staged mill on the Kestrel below
   Rejection is brown.
10. `short · player` — `paste` sheets into pasteboard; make a carton and a paper
    bag at the mill.

**Ink and parchment**
11. `staged · staged` — *(twin of soak 2)* Galls already steeped. Mix with copperas
    and gum: iron-gall ink. Grind lampblack into boiled linseed oil: printing ink.
12. `staged · staged` — *(twin of soak 3)* A skin already limed. Stretch and scrape
    it: parchment.

**Little paper**
13. `instant · player` — Write a letter on a sheet; hand it to a second player; they
    `read` it. Hold it to a lamp in the dark: unreadable without the light.
14. `instant · player` — `tear` the letter: the torn-off half carries the half of
    the text it held. Wet a sheet: its ink runs. Burn one: gone.
15. `instant · player` — A second player takes a printed copy of the first player's
    private record from their room and reads it (access by possession).

**The book**
16. `short · player` — `fold` printed or blank sheets into quarto, `bind` them with
    board covers: a notebook of N pages.
17. `instant · player` — Write a recipe you can make on page 3; `read` page 3.
    Lend the notebook: the borrower reads it and gains *known-of*; `make` still
    refuses them until they build it once by hand.
18. `instant · player` — `tear` page 3 out: the book has a gap; the page reads alone.
19. `instant · player` — Read a spellbook: its shipped behavior holds; burn it:
    gone. Read the tide almanac: a year of tides, the same as the shore's.

**The phone and the copy ladder**
20. `instant · player` — Call up a Gazette release on the phone; `read` it. Off
    grid, the phone cannot fetch it; a printed copy still reads.
21. `instant · player` — In a place that admits a printer (staged), `print` the
    release from the phone: a sheet. In a medieval-covenant place the printer is
    refused, naming the covenant; `copy` the sheet by hand onto another with a pen:
    slower, and a novice's copy carries errors.

**The press**
22. `instant · player` — At the Terminus print shop, buy antimony; make type metal;
    pour one sort in the hand mould.
23. `instant · player` — Hesper posts an edition. `compose` it into the forme as a
    novice. On a long release the case runs short of a letter: refused, naming it;
    shorten the job or cast more, and set it.
24. `instant · player` — `proof` the forme: some errors found; correct one.
25. `short · player` — `print` a run on sized paper; paper and ink are used per copy.
26. `instant · player` — `read` a copy: the release as set, a missed misprint included.
27. `instant · player` — Hesper edits, then retracts the release. The ticker and the
    press room change; the printed copy reads unchanged; a second copy reads the
    same as the first.
28. `instant · player` — Buy a copy over the counter. `distribute` the type: the case
    is whole.
29. `instant · player` — `carve` a woodcut block, lock it with type, `print` a
    handbill with the image; `paste` it up in a room; a passerby reads it.
30. `instant · player` — Restart the world: the copies, the notebook and the poster
    read the same.

**Bearer paper and records**
31. `instant · player` — Deposit a crate at the depot; receive a paper receipt.
    Hand it to a second player; they `store withdraw` with it and get the crate.
    The depositor, without the paper, is refused. Present the spent receipt again:
    *already settled*, and it stays in hand.
32. `instant · player` — A hand-written copy of a receipt presented at the depot
    is refused (the depot checks its record).
33. `instant · player` — Check a coat; the ticket is paper; soak it until it
    pulps: the coat is not handed over without the ticket's claim (the rack's
    shipped fallback applies).
34. `instant · player` — Read the print shop's ledger book: its current records.
    Burn it: the records still read on a phone with access; print an extract:
    frozen.

**Packaging and the house**
35. `instant · player` — Pack goods into a carton; carry it — lighter than the crate.
    Soak it: it gives way and the goods spill to the floor.
36. `instant · player` — The grocer sells into a paper bag; tear it: it spills.
37. `short · player` — `paste` wallpaper onto a room's wall; `look`: the wall is
    papered. Damp it (staged): it peels.
38. `instant · player` — `strain` through filter paper: finer than the cloth.

### Soak drive

1. `span · player` — Rags in the retting vat over days to weeks until ready to beat.
2. `span · player` — Galls steeped over days give the tannin for iron-gall ink.
3. `span · player` — A skin in the lime pit over days until it can be scraped.
4. `span · player` — The mill working a season: its waste shows in the Delight
   below it, at Heart's Delight's lower farms and at Terminus.
5. `span · player` — The tide almanac goes stale when its year ends.

## Acceptance criteria

- A player can make white, sized paper at the Heart's Delight mill from rags using
  only player verbs; `look` names its color, weight, evenness and sizing; ink
  bleeds on unsized paper and holds on sized.
- The same making on iron-bearing water produces brown paper, authored nowhere.
- Iron-gall ink, printing ink, pasteboard, a carton, a paper bag and parchment can
  each be made from their inputs.
- Any release a player may see can be read on the phone where there is coverage,
  and printed where a printer is admitted; a medieval covenant refuses the printer
  and still allows copying by hand.
- After a release is edited or retracted, every copy printed before reads as it
  did; the ticker reads the change.
- Whoever holds a sheet can read it, whatever the owner of its document allows on
  the network.
- Reading a recipe on paper gives *known-of* and never lets the reader `make` it.
- A notebook can be written page by page, read by page, lent, and have a page torn
  out; spellbooks still work and now burn.
- A novice's forme carries misprints nobody announces; `proof` finds some; the rest
  appear in every copy; a case short of a letter refuses the setting and names it.
- The print shop sells Gazette copies over its counter and prints a jobbing
  handbill with a woodcut.
- A paper warehouse receipt handed to another player lets them withdraw the
  deposit and leaves the depositor refused; a spent or forged receipt is refused.
- Paper tears (losing the torn part's text), burns, and runs then pulps when wet;
  a wet or torn carton or bag spills its contents.
- Printed copies, notebooks and posters read the same after a world restart.
- The blocking drive runs green in under half an hour of wall time.

## Cross-references

- [paper-and-printing-slate](../slates/builds/paper-and-printing-slate.md) — seeding slate
- [cannery-and-bottling-slate](../slates/builds/cannery-and-bottling-slate.md) — the label and carton's next customer
- [storage-slate](../slates/tails/storage-slate.md) — transferable receipts
- [off-grid-slate](../slates/builds/off-grid-slate.md) — the carriers and coverage
- [display.md](../subsystems/display.md) · [press.md](../subsystems/press.md) ·
  [document-store.md](../subsystems/document-store.md) · [credential.md](../subsystems/credential.md) ·
  [storage.md](../subsystems/storage.md) · [furnishing.md](../subsystems/furnishing.md) ·
  [chronicle.md](../subsystems/chronicle.md) · [scripting.md](../subsystems/scripting.md) (the recipe ladder) ·
  [location-graph.md](../subsystems/location-graph.md) (charted claims) · [faces.md](../subsystems/faces.md) ·
  [mould.md](../subsystems/mould.md) · [watershed.md](../subsystems/watershed.md)
- Paint (MR !513) — rags, lampblack, linseed oil, paste and glue, coats
