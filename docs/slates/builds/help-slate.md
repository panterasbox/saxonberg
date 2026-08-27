# Help slate (working doc)

> **Status: Wave 1 shipped (2026-06) — see
> [docs/subsystems/help.md](../../subsystems/help.md); Waves 2–3 shape
> proposed.** The **systems** half of the reading
> substrate — the in-game **rulebook**: how the world *works* (commands,
> immutable-at-runtime types/taxonomies, mechanics, formulas + numbers,
> the engine/API surface). **Developer-maintained** (unlike the
> community wiki), so help metadata co-locates honestly with the thing it
> documents. Governing pillar: **transparent by default, hidden only by
> an explicit spoiler gate with a reason** — the education mandate, and
> the deliberate inverse of old-MUD obfuscation. Content from **three
> sources** (projected structured values · co-located prose · standalone
> docs in a `help` collection), all harvested into **one uniform
> `HelpTopic` schema** by a **projector per subdivision** → **one index**
> → search / typeahead / grouped results. One `help` verb (subcommand
> args). The Topic is also the **transclusion unit** (`{{help:…}}`).
> Served **two faces over one index**: authed in-client (full dialed
> range) and **public pre-auth** (anonymous-floor) on the public
> read-only surface. `api-model` is **both** a topic-kind and a
> standalone public artifact.

This slate exists because help has outgrown its current scaffold (the
`HelpController` + the TypeDoc `api-model.json` it consumes). The game is
information- and number-dense — RPG systems, costs, thresholds, formulas
— and the education aspect *requires* transparency about what things are.
Help is where that transparency lives at the **system/type** level; its
neighbors (wiki, inspection) cover the rest.

See also:

- [client-shell-slate.md](../tails/client-shell-slate.md) — owns the **shared
  reading substrate** (viewer + search + spoiler + transclusion). Help
  is the **Docs** source for the frame's grouped search, and a consumer
  of the **public read-only surface** for its pre-auth face.
- [spoiler-slate.md](../deferred-rpg/spoiler-slate.md) — the reveal substrate help
  consumes. Help sets the **transparency-by-default** posture; the
  **capability ceiling** does help's pre-auth gating for free (anonymous
  = the floor tier).
- [wiki-slate.md](../tails/wiki-slate.md) — the **content** half of the
  systems↔content pair. Cross-transcludes help via `{{help:…}}`; the
  `HelpTopic` is that transclusion unit.
- [docs/subsystems/command-spec.md](../../subsystems/command-spec.md) +
  [command-routing.md](../../subsystems/command-routing.md) — the command
  YAML + controllers the command projector reads; the `help` verb +
  `HelpController` follow the standard MVC pattern.
- the **TypeDoc `api-model.json`** pipeline (see CLAUDE.md → Documentation)
  — the `api` projector's source; today's `HelpController` already
  scaffolds against it.
- [docs/subsystems/race.md](../../subsystems/race.md) +
  [zone.md](../../subsystems/zone.md) +
  [quantities.md](../../subsystems/quantities.md) — the immutable-at-runtime
  definitions help projects (Species/Clade/body plans, taxonomic Zones,
  Unit catalog).
- [docs/subsystems/messaging.md](../../subsystems/messaging.md) +
  [message-rendering.md](../../subsystems/message-rendering.md) — the MML the
  topic body renders in; the shared renderer + click model.
- [persistence-architecture-slate.md](../tails/persistence-architecture-slate.md)
  — standalone help topics are plain `Document`s (a `help` collection).
- [docs/deployment.md](../../deployment.md) — the pre-auth web view the
  public help face is part of.

---

## Principle

1. **Help is the rulebook.** How the world *works* — systems, types,
   commands, API, formulas/numbers — at the **system/type** level. Not
   instance narrative (wiki), not live percept (inspection).
2. **Transparent by default; hidden only by an explicit spoiler gate
   with a reason.** The education mandate, and the deliberate inverse of
   old-MUD obfuscation. Numbers are **projected** so they're always
   exposed and accurate; obfuscation must be *justified* by a
   reveal-condition, never ambient.
3. **Developer-maintained.** Unlike the community wiki, the same hand
   authors the game and its help — so co-locating help metadata with the
   thing it documents is honest, not a violation.
4. **Reuse the shared substrate; project, don't retype.** Viewer,
   search, spoiler, transclusion are the shell's; values are auto-derived
   from their authoritative source so they can't drift or be hidden.

---

## The line: help vs wiki vs inspection (runtime mutability)

Everything is an instanced Stuff with state, so the discriminator is
**does it change at runtime?**

| | Scope | Surface | Maintainer |
|---|---|---|---|
| **Immutable-at-runtime definitions** (Species, Clade, units, types) + systems + commands + API + concepts | system / type | **Help** | developer |
| **Mutable instances'** narrative (this NPC, this area) | instance | **Wiki** | community |
| **Mutable instances'** current truth | instance, viewer-relative | **Inspection** (`look`/`analyze`/`identify`) | the game |

"The goblin as a species" is help; "this goblin bleeding in the corner"
is inspection; "the legend of the goblin king" is wiki. Mutability
decides.

---

## Content model — three sources, all developer-maintained

1. **Projected structured values** — command specs (command YAML +
   controllers), immutable-def / taxonomy / unit values, mechanic
   formulas + their constants, the API surface (TSDoc → `api-model`).
   Auto-derived from the authoritative source. This is the **transparency
   layer**: the numbers are projected, not retyped, so they can't drift
   or be quietly hidden.
2. **Co-located prose** — developer annotation next to the thing: a
   `help:`/`description:` block on a command YAML, a doc-comment (TSDoc)
   on a class, a help field on an immutable definition. Projected
   alongside the values. (TSDoc is already exactly this pattern — a
   precedent, not a new idea.)
3. **Standalone conceptual topics** — overviews, "getting started," "how
   combat works" — things that span many artifacts or none. Plain
   `Document`s in a **`help` collection** (paralleling the `wiki`
   collection), developer-authored.

"Help text goes where it goes" — co-located when there's a natural home,
standalone in the collection when there isn't. The design work isn't
*where it's stored*; it's **what gets included** and **the uniform topic
shape**.

The index **harvests** all three (pull); content never **registers
itself** (push) — aligned with the substrate-no-content-hooks rule.

---

## The interface: one uniform Topic, many projectors

The structure that spans the subdivisions: the index, search, typeahead,
and viewer know **only** the uniform Topic — never a subdivision-specific
shape.

```
HelpTopic {
  id:        string     // stable address: command/go · taxonomy/clade/elf
  kind:      string     //                · mechanic/damage · concept/combat · api/StuffApi
  title:     string
  summary:   string     // one-liner for typeahead + result rows
  keywords:  string[]   // "movement" → go ; aliases for matching
  body:      MmlString  // projected values + co-located prose, rendered
  relations: TopicRef[] // see-also, cross-subdivision
  spoiler:   {…}        // level + capability (the shared gate)
  source:    string     // where it was projected from (dev traceability)
}
```

**N projectors → 1 Topic → 1 index → 1 search/typeahead/viewer.** A
projector per subdivision (commands, taxonomies, mechanics, concepts,
api) reads its source and emits Topics; adding a subdivision = adding a
projector, the interface never changes. The index is built by harvesting
projectors at boot / on reload (HMR reprojects a changed command's
topic); standalone docs are harvested from the `help` collection.

> Validate under real load — the uniform shape is the bet; revisit if a
> subdivision strains it.

**The `help` verb.** One verb, argument shape (subcommand-fallthrough,
the `chat`/`wiki` pattern — no two-word verbs): `help` (the index/
landing), `help go`, `help clade elf`, `help combat`, `help api
StuffApi`. `HelpController` resolves args against the index.

**Search + typeahead** run over the uniform fields — typeahead:
prefix/fuzzy on `title`+`keywords`+`kind`; search: full-text over
`summary`+`body` — returning results **grouped by `kind`**. This index
is the **Docs** source for the shell frame's grouped search palette; the
`help` verb queries the same index. One index, two front-ends.
Client/server split: the server builds the index; a searchable slice
ships to the client for snappy typeahead; the verb path queries
server-side.

**The Topic is the transclusion unit.** `{{help:command/go}}` from a wiki
page renders that topic's `body`. One schema serves help browsing, frame
search, and wiki transclusion.

---

## Two faces over one index (auth + the public surface)

The spoiler **capability ceiling** does the auth gating for free —
anonymous = the floor tier:

- **Authed, in-client** — the full dialed range: player → teacher →
  developer/L3 (the L3 source-surfacing tier, shared with the wiki's
  source viewer; "view source" hands off to the CMS to edit).
- **Public, pre-auth** — the **anonymous-floor** projection of the same
  index, served on the **public read-only surface** (with stream
  overlays + metrics). Most of help is public (transparency-by-default +
  open source), minus spoiler-gated content. This is the pre-auth web
  view CLAUDE.md already foreshadows.

**`api-model` is both** — a topic-`kind` (`api`) inside the unified index
*and* a standalone public docs render. We render from the JSON ourselves
(consistent look + unified search), rather than depending on TypeDoc's
HTML.

---

## Open questions

1. **Index load behavior** — the uniform-topic index under real volume
   (many commands + taxonomy values + api symbols). Wait-and-see;
   revisit the shape if it strains.
2. **Public subset** — render the *whole* index at anonymous capability
   (gated content withheld), or curate which kinds go pre-auth? Lean:
   whole index at anonymous floor; spoiler does the rest.
3. **api-model rendering** — render from JSON into the unified format +
   a public docs view (lean, consistent) vs. keep TypeDoc HTML for the
   standalone site.
4. **Where mechanic numbers project from** — constants in code vs the
   app-settings store (`AppApi`) vs content. The projector reads wherever
   the number authoritatively lives (cross-ref the app-settings
   direction).
5. **Index build trigger** — boot + HMR reproject on artifact change;
   confirm freshness contract.
6. **Typeahead locus** — client-side over a shipped slice (lean) vs
   server round-trip.

---

## Build order / waves

**Wave 1 — unify what exists. BUILT — see
[docs/subsystems/help.md](../../subsystems/help.md).** The `HelpTopic`
schema (in `@saxonberg/types`) + the `/platform/idea/HelpCatalogue` index harvester;
projectors for **commands** (YAML + controllers, `getHelpText()` verbatim)
and the **api-model** (the enriched `author-surface.json` + the complete
`Mixins` roster, first-class graded `api`/`mixin`/`type` topics with typed
relations); the `HelpApi` read chokepoint + a no-op-at-floor capability
filter; a **REST help data API**; the `help` verb + `HelpController`
querying the index (bare-fallthrough `help <verb>`, legacy `help verb`
preserved); search + typeahead across both subdivisions; graceful degrade
when the artifact is absent. Outcome: command help + API reference live
under one searchable index + verb + REST contract.

**Wave 2 — widen the projectors + author surface.** Projectors for
**immutable defs / taxonomies / units** (Species, Clade, body plans,
Unit catalog) and **mechanics** (formulas + constants); **co-located
`help:` prose** harvest; the **`help` Document collection** for
standalone concept topics; the **Docs** group in the frame search; the
Topic-as-transclusion-unit for wiki `{{help:…}}`.

**Wave 3 (or parallel) — the public face.** Render the anonymous-floor
index + `api-model` on the **public read-only surface** (pre-auth), and
the standalone public docs render.

**Later.** Developer-tier L3 source surfacing in topics (shared with the
wiki source viewer + the CMS edit handoff).

---

## What this slate does NOT cover

- **Mutable-instance data** — inspection (`look`/`analyze`/`identify`)
  and wiki narrative. Help is system/type level only.
- **The shared reading substrate** (viewer / search / spoiler /
  transclusion) — owned by [client-shell-slate.md](../tails/client-shell-slate.md).
- **The spoiler reveal substrate** — owned by
  [spoiler-slate.md](../deferred-rpg/spoiler-slate.md); help consumes it and sets the
  transparency-by-default posture.
- **The wiki** (content half) — [wiki-slate.md](../tails/wiki-slate.md).
- **The public read-only surface mechanics** (gather-on-bus /
  project-off-bus / default-deny) — the shell slate's public surface
  section (which, now with metrics + overlays + help/docs as consumers,
  likely wants its own slate). Help is just a consumer.
- **Assessment integrity** — the assessment/education-vertical system
  (flagged by the spoiler slate), not here.
- **The RPG numbers/formulas themselves** — game-design content. Help
  *projects and documents* them; it doesn't define them.

---

## Once shaped into formal requirements

This boils down to:

- The **`HelpTopic`** schema + an **index** harvested by a **projector
  per subdivision** (commands + api in Wave 1; taxonomies/units/mechanics
  + co-located prose + a `help` Document collection in Wave 2).
- A **`help` verb + `HelpController`** resolving argument shape against
  the index; **search + typeahead**, results grouped by `kind`; the same
  index feeding the frame's **Docs** search and `{{help:…}}`
  transclusion.
- **Transparency by default** (projected values can't drift/hide) with
  the **spoiler capability ceiling** gating reveals — and the
  **anonymous floor** gating the **public pre-auth face** on the public
  read-only surface.
- **`api-model` rendered both** as an `api` topic-kind and a standalone
  public docs view.
- Tests: a projected value matches its source and reprojects on reload;
  typeahead/search resolve across subdivisions via the uniform fields;
  spoiler-gated content is withheld below capability (and at the
  anonymous floor pre-auth); `{{help:id}}` transcludes a topic body into
  a wiki page.

Index load behavior, the exact public subset, the api-model render
choice, and the L3 source tier wait for later / shared work.
