# Wiki foundation — requirements

**Kind:** feature (with a content pilot)
**Leads from:** kernel (the public route, anchors, pack coverage). **First consumer:** the silk pilot
set this build writes; then the documentation agents that follow it, trade by trade.

The owner (2026-10-30): *"The wiki is the game's marketing material until we have a real playable demo
with real content — especially if we put it outside the auth wall."* And: *"I'm gonna wanna do this
with a build agent, at least the first pass. Once we have some foundation laid down we can generate
more articles with just a documentation agent."* This build lays that foundation: a public page anyone
can be linked to, the real-world anchor every page wants, packs able to ship their own pages, and one
trade written end to end so the page shapes are settled for everything after. Seeding slates:
[wiki-content-slate](../slates/builds/wiki-content-slate.md),
[real-world-anchors-slate](../slates/builds/real-world-anchors-slate.md); the wiki itself is
[wiki.md](../subsystems/wiki.md).

## What already exists

- **The wiki** — pages, revisions, rollback, sticky anchors, typed subjects (a template, a mixin, a
  command), the reveal model and its spoiler levels, the guest floor (guests read in the client,
  editing needs a character).
- ⭐ **The transcluding components are already built.** `<help verb="…">` renders a command's help
  topic live — *"editing the verb's YAML updates every article quoting it."* `<composition>` renders
  the live panel for `kind="template"`, `kind="mixin"` and `kind="command"`. So command and mixin
  pages need **no new component**; the pilot uses these.
- **Pages ship in packs** — `content/wiki/<namespace>/<slug>.md`, installed as `pack:<id>` with
  compare-and-swap, so a page a player edited is a recorded conflict, never overwritten.
  `wiki-starter` holds ~22 pages; ⭐ `corpo-goodkin` already ships a lore page, so a pack other than
  `wiki-starter` can.
- **The coverage rule** — every path a pack ships under a claimed root must lie under a claim of that
  pack or a host, wiki pages included.
- **`help`'s REST routes** — read-only, all behind `requireAuth` today.
- **The deep-link intent route** is designed ([deep-links-slate](../slates/builds/deep-links-slate.md))
  and **not built**; its intents include *read*.
- **Sericulture** — the trade, its rearing tray, the disease nobody can see, the cocoon's deadline,
  selection by `R = h²S`, the reel (fishing's verb), the silk house
  ([sericulture.md](../subsystems/sericulture.md)).

**Therefore what is genuinely new here is:** reading a page without logging in, the real-world anchor
and its line, confirming how a trade pack ships its pages, the *read* intent, and the first trade
written as the template for every other.

## Goals

- **A wiki page has a public URL** anyone can open, share and preview, showing what a guest would see.
- **A page says where its subject sits in the real world** — the same thing, a model of it, or an
  invented contrast — and links there.
- **Any pack can ship the pages for what it adds.**
- **A public page opens into the game** with one click.
- **One trade is documented end to end**, settling the shape of each page kind.

## Non-goals

- **Writing the other trades' pages** → documentation agents after this build, against the pilot's
  shapes.
- **Material pages** → after the [material-decomposition build](../slates/builds/material-decomposition-slate.md),
  so they are written against mixins, not 347 rows.
- **DBpedia derivation and the study.com crosswalk candidates** →
  [real-world-anchors-slate](../slates/builds/real-world-anchors-slate.md) § 6.
- **An authoring tool for finding Wikidata ids** → the anchors slate § 7; the pilot's ids are found by
  hand.
- **Ingesting Wikidata data into rows** → the anchors slate, when a seeding pass needs it.
- **The deep links' other intents** (watch, visit, join, claim, invite) →
  [deep-links-slate](../slates/builds/deep-links-slate.md).
- **A static export of the wiki** → nowhere, deliberately (stale, no live panels, CI minutes).
- **Progress-gated reveals** → [wiki-slate](../slates/tails/wiki-slate.md) Q6.

## Placement

Kernel: the public route beside the existing REST surface, registered before the client's catch-all;
the anchor field on the reality-shaped Idea rows and its rendering in the wiki; the read intent on the
client. Content: the silk pages in **`trade-sericulture`** (its own pages, per the decision that a pack
documents what it adds) and any cross-cutting page in `wiki-starter`.

## Collisions

- **The coverage rule** — a trade pack shipping `/wiki/…` pages must be covered. The build confirms
  how `corpo-goodkin`'s page is covered and makes the same true for trade packs, so the pilot's pages
  install cleanly; every pack can then follow.
- **`help`'s REST routes stay behind auth** — the public route serves the wiki only.
- **The client's catch-all** — the public page's path must not be swallowed by the client app, and the
  client must not shadow it.
- **The deep-link route** — if it does not exist when this build runs, this build creates it with the
  **read** intent only; the deep-links build adds the rest.
- **Link previews** — share the tag shape the deep-links slate specified for watch pages.

## Surface decisions

### The public route **[DECIDED — the owner, wiki-content-slate § 4]**

A page's own URL renders it server-side to HTML through **the same render pipeline** the client uses,
at the **anonymous floor** — spoiler level 0 only. Live panels and help transclusions render, because
the world is right there. Link-preview tags (title, summary, the subject's illustration when it has
one). Cached, invalidated by an edit to the page; rate-limited. An *Edit* button appears only for a
signed-in character, as the client card does today.

### The read intent **[LEAN]**

The public page carries **Open in Saxonberg**: the client opens on that page's card, as a guest if
signed out. ⚠ **A read intent shows no confirm card** — it changes nothing (the deep-links slate's own
note: *"a purely read-only intent may later skip it"*).

### The real-world anchor **[DECIDED — the owner, real-world-anchors-slate]**

On the reality-shaped Idea rows (species, materials, conditions, process profiles, Disciplines): a
**Wikidata id**, a **relation** — `is` · `models` · `contrasts` — and, for `models` and `contrasts`, a
**one-line note on how we differ**. The wiki renders it as an *in the real world* line beneath a
subject-bound page; `help` may show it too. **Never in-world.** A **census** counts the reality-shaped
rows without an anchor and gates that count as a ceiling — it may fall, never rise.

### The silk pilot **[DECIDED — the owner; the page set LEAN]**

Written in `trade-sericulture`, against the components that exist, describing **what ships**:

- **the trade page** — sericulture end to end, linking each piece;
- **process pages, by the rule** — a process gets its own page when the game models it as its own
  mechanism (its own rows, law or reading) or more than one system uses it; otherwise it is a section
  of the trade page. The build applies the rule to rearing by degree-days, the hidden disease, the
  stifling deadline, selection (`R = h²S`), reeling and degumming;
- **command pages** for the verbs silk uses — each built around `<help verb>`, with what the act
  models and why it works that way (`reel` is shared with fishing, which is itself worth saying);
- **mixin pages** for the mixins silk's objects compose — each built around `<composition
  kind="mixin">`;
- **anchors** on silk's reality-shaped rows (the silkworm, mulberry, the silk material, the disease).

Every page: processes explained openly (the anti-wiki rule), discovery content behind spoiler levels,
**live values transcluded, never a number restated**, `help` cross-linked rather than duplicated. The
owner reviews the set; its shapes become the template the documentation agents follow.

## Lens pass

1. **Pedagogy** — the game's processes, explained by the people who built them, with live values and
   honest real-world links.
2. **Expression** — a pack documents itself; players edit what they know.
3. **Immersion** — the wiki stays out of fiction; the world never links out. **Participation** — a
   public page anyone can be sent to; a commons anyone with a character can improve.
4. **Values** — no invented thing presented as real.
5. **Continuity** — transcluded pages survive tuning.
6. **Economy** — no CI minutes; the server renders what it already knows.
7. **Governance** — open editing with fast rollback, unchanged.

## The drive

Each step tagged by pace ([workflow.md](../workflow.md) § *No merge waits on the clock*) and, at
finalize, by how its assertion is made.

### Blocking drive

1. `instant` · player — signed out, open the silk trade page's URL in a browser: it renders, with the
   live panels and the help transclusions, and no Edit button.
2. `instant` · player — a level-1 spoiler on a pilot page is absent from the public page and present
   for a signed-in character whose ceiling admits it.
3. `instant` · player — paste the URL where previews render (or read the page's preview tags): the
   title, summary and image are right.
4. `instant` · player — **Open in Saxonberg** from the public page: signed out, the client opens as a
   guest on that page's card, with no confirm card.
5. `instant` · staged — edit a pilot page as a character; the public page shows the edit on the next
   load (the cache invalidated).
6. `instant` · player — the silkworm's page shows *in the real world* with its relation and link; a
   `models` page shows its note on how we differ.
7. `instant` · staged — boot a fresh world: the silk pages install from `trade-sericulture` with no
   coverage refusal; edit one, reinstall the pack, and the edit survives as a recorded conflict.
8. `instant` · staged — the anchor census reports its count, and adding an unanchored reality-shaped
   row fails it.
9. `instant` · player — `help reel` and the `reel` command page agree, because the page transcludes
   the topic.

### Soak drive

None — nothing here depends on game time.

## Acceptance criteria

- Anyone can open a wiki page by URL without signing in and see exactly what a guest would.
- A shared wiki link previews with the right title, summary and image.
- From a public page, one click opens the same page inside the game.
- A subject page says, and links to, where its subject sits in the real world, and how we differ
  where we do.
- A trade pack can ship its own pages, and a player's edit survives the pack's reinstall.
- Sericulture is documented end to end — trade, processes, commands, mixins — and the owner has
  reviewed it as the template.

## Cross-references

- [wiki-content-slate](../slates/builds/wiki-content-slate.md) ·
  [real-world-anchors-slate](../slates/builds/real-world-anchors-slate.md) ·
  [deep-links-slate](../slates/builds/deep-links-slate.md) ·
  [material-decomposition-slate](../slates/builds/material-decomposition-slate.md)
- [wiki.md](../subsystems/wiki.md) · [content-packs.md](../subsystems/content-packs.md) ·
  [sericulture.md](../subsystems/sericulture.md) · [help.md](../subsystems/help.md)
