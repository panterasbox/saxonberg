# The document tree — a third CMS-managed store (slate)

> **Status: slate / pre-requirements. Decision made 2026-06-27** (the dorm-warren
> CMS-inspectability question forced it). A **third tree** alongside the TS
> **source tree** (`SourceTreeApi`) and the Mongo **template tree**
> (`TemplateApi`): a general, **path-addressed JSON-document store**, CMS-managed
> exactly like the other two. It **generalizes** the scripting build's
> path-addressed player-script store (build-3 embryo) rather than letting
> per-feature stores proliferate. First content consumer: **dorm-warren.**

---

## The decision

**Content lives in three path-addressed trees, three concerns:**

| Tree | Holds | Surface |
|---|---|---|
| **source** | TypeScript source | `SourceTreeApi` |
| **templates** | Mongo `domain` — **reusable clone-sources** | `TemplateApi` |
| **documents** *(new)* | **per-instance / arbitrary JSON** | the document tree |

**The line that decides what goes where:** *templates = reusable clone-sources;
documents = per-instance mutable state.* A `Bed` or `DormRoom` is a template; your
*specific* room's customizations are a document.

## Why (the reasoning)

1. **The CMS was built for this.** Its unified tree is already *N backends behind
   backend-discriminated refs* (`TemplateApi` + `SourceTreeApi`). A third backend
   is the **intended extension point**, not a special case.
2. **The embryo already exists.** Scripting (build-3) is building a
   path-addressed, CMS-editable document store for player scripts. This is
   "**generalize that one**," not "build a new thing" — and the alternative is N
   ad-hoc per-feature stores.
3. **It keeps the template tree honest** — reusable clone-sources only, not
   bloated with one per-player document per Warren-constituent-type.
4. **Hydration is *not* new work.** The `Hydrator` already hydrates from a
   template's `data`; **a document just *is* `data`**, so hydrating from the
   document tree **reuses the same machinery.** The tree is a storage/management
   concern, not a new hydration path.

## What it is

- A **path-addressed JSON-document store** — each doc at a path
  (`/<root>/eu/dorm/<playerId>`), carrying **metadata** (type, owner, schema-ref)
  and validated against a **per-type schema** (a dorm-room doc against the
  dorm-room schema; a script against the script schema).
- A **gated save chokepoint** (mirroring `TemplateApi.saveTemplate`) so every
  write threads **provenance** (`authoring_events`) and **access** — **owner-
  scoped** (you edit *your* dorm room, not your neighbor's).
- **CMS backend integration** — a third `ContentRef` backend; the same explorer
  + editor, managed the same way.
- **Hydration** — reuse the `Hydrator`'s data path (a document *is* `data`).

## The Warren-constituent pattern (the standard this sets)

The **go-forward standard** for Warren constituents and per-instance state:

- **Hybrid two-layer.** A reusable **base template** (template tree — the
  structure, and the CMS-inspectable *"lesson"*) + a per-instance **customization
  document** (document tree — the instance state, owner-scoped).
- The Warren **buds a constituent by cloning the base + overlaying the
  document.** "Live running code" = that composition.
- **Exemplar:** the dorm room — base `DormRoom` template + per-player
  customization document (genre + palette picks + roots; the soul layer derives
  from the occupant's traits). See [dorm-warren-slate](./dorm-warren-slate.md).
- **Avatar is the legacy.** Per-player template at `/obj/Avatar/<playerId>` — it
  predates the document tree. **Migrate it later when convenient; don't force it
  now**, and don't spread the per-player-template workaround to new things. Accept
  the brief non-uniformity to get the clean go-forward standard.

## Open decisions / dials

1. **Path scheme + root** — where the document tree roots and how paths are
   structured (and whether scripts migrate onto the general tree or stay a branch
   under it).
2. **Metadata + schema model** — the per-type schemas, validation, and the schema
   registry.
3. **The gated-save shape** — mirror `TemplateApi`'s chokepoint; provenance +
   owner-scoped access.
4. **Overlay/composition semantics** — how a customization document parameterizes
   a base template at hydration (merge rules, what a document may/may not
   override).
5. **Migration order** — which existing per-player-template things (Avatar) move,
   and when.

## Dependencies & relationships

- **CMS** ([cms.md](../../subsystems/cms.md) / [cms-slate](./cms-slate.md)) — the
  third backend; the inspect/edit surface.
- **Scripting** ([scripting-slate](./scripting-slate.md), build-3) — the existing
  embryo to generalize.
- **Provenance + access** ([provenance.md](../../subsystems/provenance.md)) — the
  gated save.
- **Templates + the Hydrator** ([templates.md](../../subsystems/templates.md)) —
  the hydration reuse.
- **Warren / MultiLocation** ([location.md](../../subsystems/location.md)) — the
  constituents this backs.
- **Dorm-warren** ([dorm-warren-slate](./dorm-warren-slate.md)) — the first
  content consumer + the Warren-constituent pattern in action.
