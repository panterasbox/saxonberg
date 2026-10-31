# Wiki content slate — writing our own wiki, and reading it without logging in

> **Status: UNBUILT** — designed at high level 2026-10-30 with the owner. What ships: the wiki — pages,
> revisions, rollback, sticky anchors, typed subjects, the live architecture panel, components that
> report live values, the reveal model and spoiler levels ([wiki.md](../../subsystems/wiki.md)); wiki
> pages as a content-pack kind (`content/wiki/<namespace>/<slug>.md`), installed through the wiki as
> `pack:<id>` with compare-and-swap, so a page a player has edited is a conflict, never overwritten
> ([content-packs.md](../../subsystems/content-packs.md)); the `wiki-starter` pack (~22 pages); guests
> reading in the client, editing requiring a character; real-world anchors
> ([real-world-anchors-slate](./real-world-anchors-slate.md)).
> **Left:** pages shipped by the pack that adds the thing · `wiki-starter` for cross-cutting concepts
> and guides · `/finalize` graduating the player-facing version into the pack's pages · the demo-first
> content pass, an agent per pack, reviewed in batches · live values transcluded, never restated ·
> spoiler levels for discovery content only · the public read route, rendered by the same pipeline at
> level 0 · link previews and a read deep link · caching
> **Size:** a build

Settles the [wiki slate](../tails/wiki-slate.md)'s open question 5 (anonymous read).

## 0. The ask **[DECIDED — the owner]**

*"I kinda also wanna start generating content for our own wiki, but I'm not sure how I wanna do this
or manage it. … I'd like to actually have wiki articles for most of our game concepts, and I want it
in the demo now, not wait until launch, because this stuff really helps people understand the game. I
wouldn't mind also figuring out how to render our wiki outside of a logged-in session, so we can just
hotlink to it from wherever and you don't have to auth to pull it up (but you do to edit, obviously)."*

## 1. ⭐⭐ Who owns which pages **[DECIDED — the owner]**

- **Each pack ships the pages for what it adds** — trade-glass documents glass, trade-rubber the cure.
  The page changes in the same build that changes the mechanism, by the same agent, so it never
  drifts. *Trade is mechanism, locality is expression*, applied to documentation: the thing documents
  itself.
- **`wiki-starter` keeps the cross-cutting pages** — concepts no single pack owns (death and the shade,
  the clock, money, jobs, the Compact) and the guides.
- **`/finalize` graduates the player-facing version** — as it graduates knowledge into the subsystem
  docs, it writes or updates the pack's wiki pages for what the build added.

## 2. ⭐⭐ Generating the content **[DECIDED — the owner]**

- **Agents write from what is true** — the subsystem doc, the rows, the verbs; an agent per pack.
- ⭐ **Pages never restate a number; they transclude it.** The components already report live values
  (the composition panel shows a template's values). The legal-code slate's *values are interpolated,
  never restated*: a page that shows oak's live density cannot go wrong when the density changes.
- **Real-world anchors render on subject pages** — the *in the real world* line.
- **The owner reviews in batches**, merged through each pack's MR like any content.
- **Demo first** — the pages a demo player meets: the newcomer path, death and passage, the clinic,
  the clock, money and jobs, the trades in the demo areas. Then the long tail.
- **Help and the wiki cross-link, never duplicate** — help leans systems (verbs, collections, Apis,
  generated); the wiki leans concepts, processes and guides; each points at the other.

## 3. ⭐⭐ Spoilers — open explanation, gated discovery **[DECIDED — the owner]**

The design already assumes a wiki: farming and medicine follow the **anti-wiki rule** — knowing how a
thing works never substitutes for doing it (a condition's signs do not tell you this patient has it;
knowing a cure window does not make you hit it). So **processes are explained openly**. The reveal
model's spoiler levels are for **discovery content** — arcane research results, lore mysteries, story
arcs.

## 4. ⭐⭐⭐ Reading without logging in **[DECIDED — the owner]**

- **A live public route on the game server** — a page's own URL, rendered server-side to HTML through
  **the same render pipeline** at the anonymous floor: public readers see spoiler level 0 only. The
  live architecture panel still works — the world is right there.
- **Link-preview tags**, as the [deep-links slate](./deep-links-slate.md) specified for watch pages, so
  a wiki link previews in Discord; a **read** deep-link intent opens the same page inside the client.
- **Editing needs a character** — the guest floor's reasoning, unchanged: an unattributable edit cannot
  be undone by talking to anyone.
- **Caching** — a public route on one box.
- **Not a static export** — that would survive downtime, but goes stale between exports, cannot run
  the live panel, and spends CI minutes.

## 5. The build **[LEAN]**

1. **The public route** — level-0 pages, the shared renderer converting to HTML, link-preview tags,
   caching, a rate limit; registered before the client's catch-all.
2. **The read intent** — the deep link that opens a page in the client.
3. **`/finalize`'s wiki step** (done with this slate) and a check that each page's subject still
   resolves.
4. **The demo content pass** — an agent per pack against the demo list, reviewed in batches.

## 6. The lens pass

1. **Pedagogy** — the game's processes explained by the people who built them, with live values and
   real-world anchors.
2. **Expression** — a pack documents what it adds; players edit what they know.
3. **Immersion** — the wiki stays out of fiction. **Participation** — a public page anyone can be sent
   to; a commons anyone with a character can improve.
4. **Values** — discovery content stays discovered.
5. **Continuity** — pages transclude, so they survive tuning.
6. **Economy** — no CI minutes; the server renders what it already knows.
7. **Governance** — open editing with fast rollback, unchanged.

## 7. Open

1. **The demo list** — exactly which pages, in what order.
2. **The URL shape** — beside the deep links' `/go/…`, or its own path.
3. **The public route's cache** — how long, and invalidated by a page edit.
