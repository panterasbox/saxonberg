# Printing slate — making copies of a text that is a thing

> **Status: PLACEHOLDER SHIPPED** — the paper build (MR !521, 2026-11-05)
> shipped `trade-printing` as **what paper implies about printing, and no
> more**: a case of counted type, a forme that is set, proofed, pulled and
> distributed, a hand press, a modern printer, a pen that copies, the
> Gazette's shop. It was never designed as printing. The owner: *"I don't
> feel like we really had a design discussion on most of printing."* This
> slate is that discussion's start; its build replaces the placeholder.
> **Left:** printing's labor in time (the fixed-vs-marginal curve made felt)
> · what a printed page LOOKS like in a game made of text · images (woodcut,
> engraving, the poster) · type founding · the jobbing printer's trade ·
> who may print what (licensing, the clandestine press) · print-and-bind
> **Size:** a build (content-led; `trade-printing` and the Gazette)
> **Neighbors:** [paper-and-printing-slate](./paper-and-printing-slate.md)
> (the medium — its § 5 printing, § 6 demand, § 7 licensing are this
> slate's inputs) · [press-slate](./press-slate.md) (journalism and
> publishing, which reach everyone for free and are NOT printing) ·
> [paper.md](../../subsystems/paper.md) (what shipped)

## 1. ⭐⭐⭐ The premise: text is the platform's primitive

The owner (2026-11-05): *"printing is basically images and text, which are
the primitives in the entire game platform for us. It's not just paper and
printing that are concerned with text, every interface in the game is."*

So the assumptions we make about other trades do not hold. A smith makes a
thing the game otherwise lacks; a printer makes text, and the game is made
of text, and the platform copies and moves text at no cost — every message,
every card, every release reaches its readers free. **"Printing makes
copies of text" is therefore worth nothing here.** What printing is worth
must come from what paper adds to text, and from what copying a THING
costs.

## 2. ⭐⭐ What paper adds to text (the thesis — shared with paper.md)

Interface text is addressed to you, current, provenance-free and gone when
read. Paper is the opposite on four axes, and these are the only reasons a
printed copy is worth making:

1. **A text that is a thing.** It lies somewhere, belongs to somebody, can
   be carried, lost, burnt, torn or stolen, and is read by whoever holds it
   (the bearer receipt, the torn directory page, the sealed letter).
2. **A text frozen in time.** A screen shows the document now; paper shows
   it as of a day. Paper goes stale, contradicts the present, and becomes
   evidence. Only paper can do this; the game's own text is always current.
3. **A text with marks of its making.** A hand, a maker's device, a
   misprint, a watermark, a forgery — provenance you can inspect.
4. **A text that reaches where the network does not.** At the speed of
   whoever carries it, into places with no screen and epochs before the
   aether. Distribution is logistics.

## 3. ⭐⭐ What printing IS, then

**The cost of copying a thing-text.** Printing's lesson — why the press
changed the world, and why licensing it was political — is the curve: a
large FIXED cost (setting the type, cutting the block) and a small MARGINAL
cost (a sheet, a pull of ink, a minute at the bar). The hand copyist pays
the whole cost for every copy; the press pays it once. ⚠ The placeholder
hides the curve: every act is instant, so setting a page costs a keystroke.

## 4. Forks — decided by the lenses (2026-11-05, the owner: *"let the lenses decide"*)

- **F1. Printing's labor takes TIME — [DECIDED, lens 1].** Composing at a
  compositor's rate per page (by band), the press at its sheets per hour,
  distribution at its rate; the hand copy at a copyist's rate per page.
  The fixed-vs-marginal curve is the Discipline; an instant act hides it.
  Exertion and the engagement framework carry it (the cordage `twist` is
  the timed-craft precedent). The abstraction law: an act may be shortened
  only while it still costs somebody the activity.
- **F2. Misprints stay — [DECIDED, lens 1; lens 2 satisfied].** Errors
  derive from the compositor's competence (seeded, never drawn) and
  proofing is the skill that finds them. ⭐ Lens 2's worry — a player's
  words corrupted for flavor — is answered by the medium itself: **the
  document is the truth and is never altered**; a misprint lives only on
  that run's paper. The author controls it by choosing the hand and by
  proofing, and a second run from a corrected forme is a new edition.
- **F3. What may be printed — [GRAIN, lens 4/7].** Whatever you can read
  you can set (printing is copying, and paper is read by whoever holds it);
  a polity may license, censor or guarantee the press (paper slate § 7),
  with the criterion, the appeal and the entrenchment tier named. The
  clandestine press is the anonymous press room on paper.
- **F4. Images are half of printing — [DECIDED, lens 2].** A player-made
  image becoming a THING — a woodcut in a broadside, a poster, an engraved
  plate — is creative expression at its fullest, and the block or plate is
  a reusable original (the fixed cost again). Relief from forestry's
  `carve`, intaglio from a burin on copper; the image is the author's own.
  ⚠ OPEN within it (lens 4): where the image comes from — drawn by the
  player, uploaded, generated — and how an uploaded image is moderated.
- **F5. Continuity — [DECIDED, lens 5, shipped].** The press, the modern
  printer and a screen answer the same commands (`print`, `read`, `show`);
  only the dynamics change (errors, cost, freezing). The covenant keeps a
  later instrument idle.

## 5. ⭐⭐ OPEN — what a printed page looks like, in a game made of text

The one place in the game where the FORM of text should matter. Today a
printed sheet reads as a sentence: *"The sheet reads: …"*. The platform
already renders MML with fonts by register
([message-rendering.md](../../subsystems/message-rendering.md)) and a
right-column card feed ([card-surface.md](../../subsystems/card-surface.md)).
Recommended (lens 3a — the fiction cannot betray itself): **a page renders
as a page** — a card in its typeface (the case's font: blackletter, roman,
a typewriter), set in its measure, the misprints visible as turned letters,
the handwriting in a hand, the stains and the burn. Then the four things
paper adds are SEEN, not told. ⚠ Needs the owner: how far the client goes
(a card type for paper; layout; an image on the page).

## 6. Also for the build

- **Type founding** — type metal cast in a hand mould (moulding, shipped);
  the case's counts come from somewhere.
- **The jobbing printer** — handbills, posters, tickets, forms, labels
  (paper slate § 6's demand); the Gazette's own run; Rejection's print shop
  as the rows-only second venue.
- **Print-and-bind** — a printed book from its sheets (`fit`, the deferred
  raise arm; paper slate § 12.3).
- **Distribution as logistics** — a bundle of copies is freight; a
  newsboy is a route.

## 7. What the placeholder shipped, and keeps until this build

`TypeCase` (glyph counts, debited by setting, refused by name),
`Forme` (`compose` / `proof` / `distribute`, misprints by band),
`Press` (pulls the forme onto paper, ink by the page), `Printer`
(prints a document as it stands, no errors; modern — a medieval covenant
keeps it idle), `Pen` (`copy`, a copy bound to nothing), `PrintingMixin`
(the run: the covenant, the paper, the ink, the frozen edition, a sheet per
copy), the Gazette's shop and its ledger extract (`print ledger`). See
[paper.md § Printing](../../subsystems/paper.md). The build may replace
any of it; the medium it prints on (editions, sheets, books) is paper's
and stays.
