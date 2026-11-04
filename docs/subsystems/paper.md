# Paper — the medium, the mill and the press

⭐ **The Document is the source of truth; paper is one way of showing it.**
A screen shows a document **live**; a printed sheet shows what the document
said **on the day it was printed**, and whoever holds the sheet reads it.
Everything below is that rung, the mill that makes the sheet, or the press
that puts a document onto it.

Built by the paper build (MR on `reqs/paper`, 2026-11). Packs:
`trade-papermaking` (`/trade/papermaking`), `trade-printing`
(`/trade/printing`); venues at Heart's Delight (the paper mill) and Terminus
(the Gazette's print shop).

## Reading: two faces, one verb

- **`read`** takes a written thing (`MarkedMixin`) or a screen
  (`DisplayMixin`). A screen is read off what it shows (no light gate — it
  is its own light); a written thing is perceived, decoded, read.
- **Derived marks.** `Marked.refreshMarks(viewer)` (`@hook`, harbors' too)
  runs before a read: a printed sheet reads its edition, a book its open
  page, a ledger its house's papers. `getMarkText()` stays sync.
- **What reading teaches.** `Marked.teach(reader)` (`@hook`) runs after the
  text lands: a chart writes its places into the map; a printed recipe, or
  a notebook page that names one, writes *known-of* into the chronicle —
  never `make` (the recipe ladder).
- **Ash.** A burnt marked thing (its material swapped to its char) reads
  *"nothing but ash"* — the ink rule's shape.

## The frozen rung — editions

- Document kind **`edition`** at `<source>/editions/<hash of the pages>`,
  written only by **`DocumentApi.freezeEdition`**: path pinned, kind pinned,
  owner derived from the source (or the records under a register prefix),
  idempotent by the pages, throws on a source that names nothing.
- **`DocumentApi.pagesOf(path)`** renders any stored document as pages,
  exhaustive over the closed kind table (a new kind is a compile error);
  `null` for a kind that does not read as a page.
- An edition freezes the text **as set** (a forme's misprints included);
  an edit or retraction of the source never reaches it.
- **Access by possession** (D6): a sheet reads its edition with no title
  check. Printing a private record is the printer's risk.

## The live rung — screens

- `DisplaySource` arm **`document`**; `readScreen` renders it through
  `pagesOf` at read time — an edit shows, a retraction reads *"withdrawn by
  its publisher"*.
- **`show <what> on <screen>`**: `DocumentApi.callUp(reader, word)` — the
  newest standing release whose headline or publisher answers to the word,
  else a paper of the reader's own. The screen's pairing decides who drives.
- ⚠ Coverage (a handset off grid) is the off-grid build's; every screen
  fetches today.

## The sheet, the book, the seal

- **`Sheet`** (`platform/thing/Sheet.ts`): folds sheet → folio → quarto →
  octavo and no further; writing wants **ink in hand** and **size** (an
  unsized sheet bleeds; a set coat of a `size`-tagged material, or
  `sized: true` on the row); soaked (`soaked` band) it latches `pulped` and
  goes on the next tick, leaving its `pulpTemplate`; torn, each half keeps
  its half of the words, bound to nothing; `markText` is stack identity.
  A mill's sheet carries its making: `color` (the vat's water), `evenness`
  (the vatman's band), `formed`, `pressed` — formed and dried unpressed it
  is `isCockled()`.
- **`Book`** (`platform/thing/Book.ts`): a notebook's pages are a `book`
  document at `/home/<writer>/books/<key>`, minted at first write; a
  borrower reads and is refused the pen (`AccessApi.canAtPath`); `read` /
  `write` / `tear <book> page <n>`; a torn page leaves a gap.
- **`RegisterBook`**: a fixed ledger that holds nothing — `registerPrefix`
  names the papers it lists on each read.
- **`Envelope`**: shut, it vetoes in and out; `seal` (gum or wax — wax wants
  wax in hand). On `Sealable`: `seal`, `sealBroken` — opening breaks it,
  closing never mends it, a look says so.
- **`TearableMixin`** + `tear`: sheet, book, garment (rags, mass for mass,
  not while worn), envelope, `Packet` (spills).
- **`Ticket extends Sheet`.**

## Bearer paper

`ReceiptTerms.bearer` + `Store.receiptPaper`: a bearer deposit freezes the
receipt as an edition and hands the depositor a sheet bound to it; a bearer
withdraw presents the sheet (in hand or one wrapper down, never through a
seal). The depositor without it is refused; a settled one is answered so
and stays in hand; a hand copy (bound to nothing) presents nothing. The
depot's warehouse is bearer; the ice houses stay registered.

## The epoch covenant

`SpatialZone.admitsEpochThrough` (inherited by `lookupField`) and
`Tool.admittedAt(place)` — the first reader of the `epoch` stamp. A medieval
covenant keeps the press (industrial) and the printer (modern) idle and
admits the pen.

## The mill (`trade-papermaking`)

`Stamper` (switch on; beats clean rags to pulp at the race's power for the
hours it ran), `PulpVat` (the bath affords `dip`: a wet sheet on the
mould's wire, colored by the vat's reach — a persistent load makes brown),
`PaperMould` + `couch` (onto the post: the press bed), the press squeezes
the post, the loft dries it, the size tub sizes it. The mill buys clean
rags; a paint rag is another row. `Packet` (bag, carton); labels pasted
with `fit <label> to <good> with <pot>` (`Faced.pasteOn`), let go in the
wet unless the glue resists damp (`Faced.releaseDampGlue`).

## The press (`trade-printing`)

`TypeCase` (the font, capital), `Forme` (`compose` debits the case and
seeds the compositor's errors; `proof` corrects a seeded share; nobody is
told what was missed; `distribute`), `Press` (pulls the forme as set, ink
by the page), `Printer` (a document as it stands), `Pen` (`copy` by hand,
with the copyist's slips, bound to nothing). Misprints are **seeded, never
drawn** (`lib/Misprint.ts`, docs/uncertainty.md).

## Deferred

Retting, the stamper's fouling as a discharge, brown paper in the drive (no
persistent discharge exists), pasteboard/carton/book **bills** and `fit
notebook`, wallpaper (R4), filter paper (R3), parchment (R6), iron-gall from
galls, type metal and casting sorts, the woodcut handbill, the almanac's
year, the shop counter selling copies, the handset. See the paper plan's
wave notes and the paper slate.
