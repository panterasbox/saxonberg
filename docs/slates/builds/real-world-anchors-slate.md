# Real-world anchors slate — linking our models to Wikipedia, honestly

> **Status: UNBUILT** — designed at high level 2026-10-30 with the owner. What ships: the wiki — typed
> subjects (a page is about a template, a mixin, a command), the render pipeline, the reveal model;
> the wiki and `help` as out-of-fiction surfaces ([wiki.md](../../subsystems/wiki.md)); reality-shaped
> rows — species, materials, conditions, foods, Disciplines — and Principle 4, *reality-shaped models
> seed from real data* ([design-philosophy.md](../../design-philosophy.md)); study.com's taxonomy,
> whose only external anchor is a DBpedia subject id ([integration-spec](../../study-com/integration-spec.md)).
> **Left:** a Wikidata anchor on reality-shaped rows · the relation kind (is · models · contrasts) and
> its note on how we differ · the wiki's and `help`'s *in the real world* line · DBpedia derived from
> the anchor for the study.com crosswalk · ingesting Wikidata data at authoring time · a census of
> anchor coverage, then a ratchet · authoring support for finding the right id
> **Size:** a build

## 0. The ask **[DECIDED — the owner]**

*"I wanna talk about connecting to Wikipedia. Not literally, but a lot of our models are real things,
and it'd be cool to provide links to Wikipedia, like from our own wiki, where appropriate. … I'd
imagine there'd be pages for most game concepts and any processes you have to learn to understand how
they work in the game. There's a lot of that now, and more coming with all the trades. I know there's
that DBpedia thing that study.com uses too."*

## 1. Wikipedia, DBpedia, Wikidata

| | what it is | license |
|---|---|---|
| **Wikipedia** | the articles | CC-BY-SA — attribution and *share-alike* |
| **DBpedia** | a project that *extracts* structured data from Wikipedia's infoboxes and categories; each article gets an address built from its **title** | CC-BY-SA, inherited |
| **Wikidata** | the structured knowledge base that *feeds* Wikipedia — infobox data, cross-language links; each thing has a permanent id (cheese is `Q10943`) | ⭐ **CC0 — public domain** |

Wikipedia does not use DBpedia; DBpedia is built from Wikipedia. study.com uses DBpedia because its
concepts carry a `dbpedia_subject_id`.

## 2. ⭐⭐⭐ The anchor is a Wikidata id **[DECIDED — the owner]**

- **Permanent** — a DBpedia address is an article title and breaks when the article is renamed; a
  Wikidata id never changes.
- **Every language** — one id reaches every Wikipedia, and DBpedia's own records link back to it.
- **DBpedia is derived** — the address study.com needs comes from the anchor, never stored beside it.

## 3. ⭐⭐ Anchors live on the rows **[DECIDED — the owner]**

On **the row that models the thing**, not on a wiki page: the species row, the material, the
condition, the food, the process profile (a cure, an anneal, a maturation, a fractionation), the
Discipline. Every surface that reads the row gets the anchor.

- **The wiki and `help` render it** as an *in the real world* line beneath the subject — from the
  page's typed subject to its row to the anchor.
- **Out of fiction only** — wiki.md already makes the wiki out of fiction, and `help` is too. `look`,
  `analyze` and every in-world line never link out: a player inside the world does not get a hyperlink
  to Earth.

## 4. ⭐⭐⭐ The relation says what the link means **[DECIDED — the owner]**

The world departs from reality on purpose — the heavy world, the two postulates, the 12× clock, the
pace fudges, invented species — so a bare link would claim *"this is what Wikipedia describes"* where
it is not.

| relation | means | example |
|---|---|---|
| **is** | the same thing | cheese · *Hevea brasiliensis* · lye |
| **models** | our mechanism models this, with stated differences | Newton's law of cooling · Chvorinov's rule · START triage |
| **contrasts** | invented, and this is the real idea it is built against | the aether → *luminiferous aether* · the heavy world → *planetary density* |

A *models* or *contrasts* anchor carries **a one-line note on how we differ**. It is the college
slate's source ladder turned outward: knowing where a model departs from reality is the information
literacy the platform exists to teach.

## 5. ⭐⭐ What we take, and when **[DECIDED — the owner]**

- **Links are free** — a URL.
- **Wikidata's data is free to ingest** (CC0) — densities, binomial names, lifespans, melting points —
  Principle 4 with a clean source, recorded with its provenance.
- ⛔ **Wikipedia's prose is never copied in** — share-alike would put our wiki under its license.
- ⛔ **Nothing at runtime** — anchors are authored and data is ingested at authoring time; the game
  never calls Wikipedia or Wikidata while running.

## 6. ⭐ The study.com crosswalk gets candidates for free **[LEAN]**

The crosswalk from our Disciplines to study.com's concepts is described as wholly authored. With
anchors on Disciplines, our *metallurgy* and a study.com concept whose DBpedia subject is *Metallurgy*
**match mechanically** — still confirmed by hand, no longer hunted for.

## 7. The build **[LEAN]**

1. **The anchor field** — a Wikidata id, a relation, an optional note — on the reality-shaped row
   kinds.
2. **The wiki's and `help`'s line**, read from the subject's row.
3. **The DBpedia derivation** for the crosswalk.
4. **A census, then a ratchet** — count the species, material, condition, food and Discipline rows
   with no anchor; gate today's count as the ceiling; it may fall, never rise.
5. **Authoring support** — a way for an author to find the right id and relation, offline from the
   running game.

## 8. The lens pass

1. **Pedagogy** — the bridge from the game to real knowledge, with honest notes where we differ: the
   platform's thesis in one line.
2. **Expression** — an author anchors a row once; every surface shows it.
3. **Immersion** — the fiction never links out. **Participation** — players follow the thread from
   the wiki to the world's real counterpart.
4. **Values** — no claim that an invented thing is real.
5. **Continuity** — anchors do not change with epochs.
6. **Economy** — none.
7. **Governance** — what a polity's wiki says about reality is the commons' to edit; the anchor's
   relation is on the record.

## 9. Open

1. **Which row kinds first** — species and materials have the cleanest matches.
2. **Process pages** — whether a trade's process (vulcanization, nixtamalization) is anchored on its
   profile row or on a wiki page with no row.
3. **The ingestion tooling** — its own build, when a seeding pass needs it.
