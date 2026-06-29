# Help system (Wave 1) — requirements

The in-game **rulebook**: a uniform, searchable, navigable index of how
the world *works* — its commands and its engine/API surface — served as a
**structured server-side data contract** a future client help pane will
consume. This build delivers the `HelpTopic` schema, a boot-warmed index
harvested by **one projector per subdivision** (commands + API this
cycle), a **REST help data API** returning structured navigable JSON, and
re-points the existing `help` verb to render off the same index. The
governing posture is the slate's: **transparent by default, hidden only
by an explicit spoiler gate** — and a specific product thesis: the API
browse is the **player → contributor on-ramp**, the surface through which
a player learns the mixin/type model that powers the world around them.

Seeded by [docs/slates/builds/help-slate.md](../slates/builds/help-slate.md)
(Wave 1). Replaces the current `HelpController` + unconsumed TypeDoc
`author-surface.json` scaffold.

## Goals

- **One uniform `HelpTopic` schema** spans both subdivisions; the index,
  search, typeahead, REST contract, and `help` verb know *only* this
  shape, never a subdivision-specific one.
- **A boot-warmed index** (`/obj/HelpCatalogue` singleton) built by
  **harvesting projectors** — the index pulls; content never registers
  itself.
- **A commands projector** turns every command (YAML + controller) into a
  `HelpTopic`, preserving everything `CommandModel.getHelpText()` already
  assembles (verb, aliases, syntax, options, subcommands, examples).
- **An API projector** turns the engine surface into navigable topics in
  **three graded kinds**:
  - `api` — callable facades (`*Api` statics), grouped by face;
  - `mixin` — the capability model (`Container`, `Visible`, `Mobile`, …),
    **the centerpiece**: what the capability means + the methods it
    confers + how it composes;
  - `type` — supporting value-objects / option / result shapes (lighter
    treatment, real topics).
- **The mixin roster is complete** — sourced from the `Mixins` registry
  (`lib/mixin.ts`), not only from types that happen to appear in a
  signature, so the model has no holes.
- **Relations are typed** (`method-of` / `confers` / `composes` /
  `requires` / `consumed-by` / `see-also`), so the pane can render and
  navigate the hierarchy rather than a flat see-also list. Relations fall
  out of the projection; they are not hand-authored.
- **`help api <Type.member>` renders real content** — a readable
  signature string + the TSDoc summary, plus `@param`/`@returns`/
  `@example` when authored. Driven by an **enriched `author-surface.json`**
  (the existing projection pipeline, extended to carry signature + summary
  per member).
- **A REST help data API** returns the structured JSON the future pane
  needs: a light index slice (for instant render + local typeahead), a
  per-kind topic list, a single full topic (body + relations), and search
  grouped by `kind`.
- **The `help` verb keeps working**, rendering off the same index (a
  landing/index view + per-topic drill-in), with light grammar polish so
  bare `help <verb>` resolves a command topic.
- **Spoiler/capability gating is a read-time filter seam** — present in
  the schema and applied on every read, but a no-op pass at the
  **anonymous floor** this cycle (everything visible); shaped so the real
  ceiling drops in later.
- **The world→model bridge is shaped, not wired** — topic ids and the
  `mixin` relations are designed so a later inspection→help cross-link
  ("this bed is `Surfaced` → open the `Surfaced` topic") is a clean add,
  not a rework.

## Non-goals

- **The client React help pane.** Designed in a separate layout-system
  session. This build ships the server data contract (DTOs + REST API)
  the pane will consume; it renders no client UI.
- **The inspection↔help bridge wiring.** Inspection (`look`/`analyze`)
  linking to help topics is Wave 2 and drags in the inspection pane that
  session is not touching. Shaped (ids + relations) but not built here.
- **Wave 2 subdivisions** — taxonomies / immutable defs / units (Species,
  Clade, body plans, Unit catalog), mechanics (formulas + constants), the
  standalone `help` **Document** collection for concept topics, and the
  **co-located `help:` prose** harvest. Adding them later = adding a
  projector; the interface does not change.
- **The public pre-auth face / standalone public docs render.** Wave 3
  (the public read-only surface). The capability seam shipped here is what
  later gates the anonymous-floor public projection.
- **The full spoiler substrate.** Owned by the spoiler slate; help only
  consumes the capability ceiling and this cycle stubs it at the floor.
- **`{{help:…}}` wiki transclusion.** Wave 2; the `HelpTopic` is the unit,
  but the transclusion consumer is the wiki build.
- **L3 developer source-surfacing** — topic `file:line` + "view source" +
  the CMS edit handoff. Slate-deferred.
- **Replacing the TypeDoc HTML site.** TypeDoc's `pnpm docs:server` HTML
  output stands as-is; this build consumes the JSON model, it does not
  retire the HTML.

## Surface decisions

### Pane transport — REST help data API

The future help pane gets its data over a **REST help data API**,
following the **CMS REST precedent** (`CmsApi`/`CmsLogic`, route
registration in `Backend`). Read-only `GET` endpoints over the index:

- a **light index slice** — every topic's `{ id, kind, title, summary,
  keywords }` — for instant pane render + client-local typeahead;
- a **per-kind topic list** (category drill-in);
- a **single full topic** by id (`body` + typed `relations`);
- **search** by query string, results **grouped by `kind`**.

Reasoning: the pane is a navigate → drill-in → read surface, structurally
identical to the CMS tree → read shape, and REST is the cleanest stateless
contract for it — and the same endpoints become the basis for the Wave 3
public web face. Read-only, so no CSRF/write-attribution machinery (unlike
CMS writes); session-aware only insofar as the viewer's capability tier
feeds the gating filter (a floor pass-through this cycle). The WS
establish-snapshot + query-frame alternative was considered (more native
to the in-world socket) but rejected in favor of one stateless contract
that also serves the public face.

### API renderable content — enrich `author-surface.json` (option A)

`project-author-surface.ts` is **extended** so each consumer member
carries a rendered **signature** string and a **TSDoc summary** (and
`@param`/`@returns`/`@example` text when authored). The API projector
reads this enriched `author-surface.json` at boot.

Reasoning: keeps a **single artifact and pipeline** — `author-surface.json`
is already "the model the help browser will read." Right-sized at runtime
(the projected surface, not the multi-MB raw `api-model.json`). The
TypeDoc-shape knowledge (rendering a readable signature from nested type
JSON) lives in the projector where it belongs; the runtime index stays
dumb. Rejected: committing a dedicated generated artifact (drift trap,
cuts against the repo's derive-don't-store ethos) and reading raw
`api-model.json` at boot (re-implements the projection's filtering at
runtime, 20× the bytes).

### Artifact availability — graceful degrade

`author-surface.json` is a gitignored build artifact. If it is absent at
boot (docs not built), the API projector yields **no `api`/`mixin`/`type`
topics** and logs **one boot warning**; command topics and boot itself are
unaffected. In dev, `pnpm docs` (→ `docs:project`) produces it. Wiring
`docs:project` into the server build/deploy step so production always has
it is a **follow-on ops item** (noted, not built here).

### Content — first-class mixins, typed relations, complete roster

The mixin/type tier is **first-class browse topics**, not cross-ref-only.
The API browse is the on-ramp to authorship, so the model is the
destination, not noise. Mixins get the **richest** treatment (meaning +
conferred methods + composition), supporting `type`s a lighter one. The
roster is **complete** (every `Mixins` registry entry projects a topic).
Relations are **typed** so the hierarchy is navigable.

### What help does NOT show (the cuts)

- **Security/gating policy strings** (`@CallSecurity(FromModule(...))`).
  Presence in the surface *is* the permission statement
  (`callable == visible`); the policy is redundant plumbing.
- **The re-export report (lint #2).** Build-tooling stderr, never a topic.
- **Private / protected / internal / constructor / inherited-duplicate /
  field / accessor members.** Already filtered by the projection; staying
  filtered is the point (methods-are-the-contract as a doc filter).
- **A rich-doc *requirement*.** A member is **not** dropped for thin
  TSDoc — it **degrades to signature-only**. Inclusion follows the
  callable surface, not doc completeness (and honestly exposes where our
  TSDoc is sparse).
- **Source `file:line` / "view source"** — slate-deferred L3.

### Verb grammar — light polish, index-backed

The `help` verb keeps its subcommand shape and is re-pointed at the index:

- bare `help` → the landing/index (categories + counts);
- `help <verb>` → that command's topic (bare fallthrough, the common
  case — no longer requires the `verb` subcommand word);
- `help api <target>` → the API topic by id / `Type.member`;
- `help search <q>` → search, results grouped by `kind`.

Rendered server-side to MML on the existing `system.shell.help` topic. The
existing `help verb <name>` form keeps working.

### Index home + harvest — `/obj/HelpCatalogue`, `HelpApi` facade

The index is a singleton at **`/obj/HelpCatalogue`** (an
`Idea`+`PostRegistrationMixin`, bootstrap-manifest entry, `warm()` on
`postRegister`), following the `TopicCatalogue`/`RecipeCatalogue`
precedent. `warm()` runs the projectors and holds `Map<id, HelpTopic>` +
the derived category/keyword indexes. A thin **`HelpApi`** facade
(`api/help.ts`) is the call surface the verb controller and the REST layer
go through. Reads are transparency-by-default; the capability filter is the
only gate (floor pass-through this cycle). The exact Api / logic-singleton
/ catalogue split (two-part like `RecipeCatalogue` vs. three-part like
`CorpoCatalogue`/`CorpoLogic`) is the planner's call within these
precedents.

### DTO home — `@saxonberg/types`

`HelpTopic`, the typed `relation` shape, the category descriptor, and the
REST request/response shapes live in **`@saxonberg/types`** (the wire DTO
package the client consumes), alongside the existing `TopicDescriptor` /
`CmsReadResult` / MQL-subscription wire types.

## Constraints

- **No new module category.** "Projector per subdivision" must fit the
  existing taxonomy — candidate homes are value-objects / methods in a new
  `lib/help/` subsystem folder and/or the catalogue singleton, **not** a
  new module kind. If the planner believes a projector needs a category of
  its own, that requires explicit sign-off before creation (per CLAUDE.md
  "DO NOT INVENT NEW ONES" + the prefer-fewer-directories rule).
- **Go through the Api layer.** The verb controller and REST layer reach
  the index via `HelpApi`, never by grabbing `/obj/HelpCatalogue`
  directly; the catalogue's read methods are gated to the facade per the
  `AccessRegistry`/`AccessApi` precedent (or ungated like
  `RecipeCatalogue` if the planner judges transparency-by-default makes
  gating noise — decide against those two precedents).
- **`HelpTopic.body` is `MmlString`.** Bodies render through the existing
  MML pipeline (server extensions + client `parseMml`); the `help` verb's
  terminal output and the pane's rich body read the same field.
- **The enriched projection stays pure + tested.** `projectAuthorSurface`
  remains a pure function unit-tested on a small fixture model; the
  signature-string renderer (TypeDoc type-JSON → readable signature) is
  the riskiest new logic and gets fixture tests for generics, unions, and
  optional/rest params.
- **Harvest, don't register.** Projectors are pulled at `warm()`; no
  content-side hook pushes topics into the index (substrate-no-content-
  hooks rule). HMR reproject on a changed command/api artifact is
  desirable but follows the catalogue's existing invalidation pattern.
- **Anonymous floor is a real seam, not a TODO.** Every read passes
  through the capability filter so that turning the floor into a ceiling
  later is a one-place change, not a retrofit across the query surface.

## Acceptance criteria

- A uniform `HelpTopic` (id, kind, title, summary, keywords, body,
  typed relations, spoiler, source) is defined in `@saxonberg/types` and
  is the only shape the index/search/REST/verb traffic in.
- `project-author-surface.ts` is extended to carry a rendered signature
  string + TSDoc summary per consumer member; a unit test asserts the
  enriched fields on a fixture model (incl. a generic, a union, and an
  optional/rest param signature).
- `/obj/HelpCatalogue.warm()` builds topics from **both** projectors at
  boot; a test asserts a command topic's content matches the source
  `getHelpText()`, and that **every `Mixins` registry entry** has a
  corresponding `mixin` topic (complete roster).
- A `mixin` topic carries its conferred methods and **typed** relations
  (`confers` / `composes` / `consumed-by` at minimum); a test asserts the
  relation kinds for one representative mixin (e.g. `Container`).
- `help api ContainmentApi.move` renders a real signature + summary (not
  the placeholder); a test covers the api-topic body.
- The REST help endpoints return: the light index slice, a per-kind topic
  list, a single full topic by id, and search results **grouped by
  `kind`**; tests cover each endpoint's response shape against the
  `@saxonberg/types` DTO.
- Search matches across `summary`+`body`; typeahead matches across
  `title`+`keywords`+`kind`; both resolve across **both** subdivisions via
  the uniform fields (a test queries a term that hits a command and an
  api/mixin topic).
- The capability filter runs on every read and is a verified **no-op pass
  at the anonymous floor** (a test asserts nothing is withheld at the
  floor, and that the filter is the single chokepoint).
- With `author-surface.json` absent, boot succeeds, command topics are
  present, api/mixin/type topics are empty, and exactly one boot warning
  is logged (a test covers the degrade path).
- Bare `help`, `help <verb>`, `help api <target>`, and `help search <q>`
  all render off the index through `system.shell.help`; the legacy
  `help verb <name>` form still works.
- A subsystem doc exists at `docs/subsystems/help.md` describing the
  schema, the index + projector seam, the REST contract, the capability
  floor seam, and the deferred bridge; the help-slate's absorbed Wave 1
  content is reconciled and its surviving waves preserved.

## Cross-references

**Seeding slate**
- [docs/slates/builds/help-slate.md](../slates/builds/help-slate.md) — Wave 1.

**Adjacent slates (non-goals land here)**
- [docs/slates/builds/wiki-slate.md](../slates/builds/wiki-slate.md) — `{{help:…}}` transclusion consumer (Wave 2).
- [docs/slates/tails/client-shell-slate.md](../slates/tails/client-shell-slate.md) — the shared reading substrate + public read-only surface (the pane + Wave 3 face).
- [docs/slates/deferred-rpg/spoiler-slate.md](../slates/deferred-rpg/spoiler-slate.md) — the reveal substrate the capability seam consumes.

**Load-bearing subsystem docs**
- [command-spec.md](../subsystems/command-spec.md) + [command-routing.md](../subsystems/command-routing.md) — the command projector's source (YAML + controller, `getHelpText()`).
- [topics.md](../subsystems/topics.md) — `TopicCatalogue` singleton + session-establish snapshot precedent.
- [crafting.md](../subsystems/crafting.md) — `RecipeCatalogue`/`RecipeSeeder` (ungated catalogue + Api) precedent.
- [corpo.md](../subsystems/corpo.md) — `CorpoCatalogue`→`CorpoLogic`→`CorpoApi` three-part precedent.
- [cms.md](../subsystems/cms.md) — the REST data-API + route-registration precedent for the pane transport.
- [mql-subscription.md](../subsystems/mql-subscription.md) + [inspection-pane.md](../subsystems/inspection-pane.md) — the WS transport alternative considered, and the deferred bridge's far side.
- [messaging.md](../subsystems/messaging.md) + [message-rendering.md](../subsystems/message-rendering.md) — the MML `body` render (verb terminal + pane).
- [mixins.md](../subsystems/mixins.md) — the `Mixins` registry, the complete-roster source.
- [response-envelope.md](../subsystems/response-envelope.md) — the `help` verb's controller outcome contract.
- CLAUDE.md → **Documentation** + `scripts/project-author-surface.ts` — the author-surface pipeline this build enriches and consumes.
