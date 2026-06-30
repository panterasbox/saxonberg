# Provenance, ownership & git-in-runtime — the authorship substrate

> **Status: exploratory — the structural gap between Build 5 (authoring)
> and Build 9 (producer influence).** Build 5 (`cms-slate`,
> `scoped-authoring-slate`, `authoring-intelligence-slate`) designs how
> content and code are *authored*; Build 9 (`cooperative-slate`,
> `draft-constitution`) needs to know *who made what*, so it can route
> **producer influence** — earned by the engagement authored content
> draws — to its creators. Nothing today carries that: there is
> **zone-level ownership and nothing else** — no authorship attribution,
> no ownership on leaf templates or code, no versioning, no dependency
> graph. This slate is the missing **provenance substrate**: a
> first-class, hierarchical, individual-or-group **ownership** model over
> *both* the content and code namespaces; **authorship** attributed to
> people; a **dependency-DAG** so infrastructure earns from what's built
> on it; and an **in-runtime VCS** (the git workflow, elevated from
> `cms-slate`'s external-editor overlay to the authoring spine) that
> delivers all of it and doubles as the machine that versions **law**.

This slate is **driven by** producer influence but is **broader** than
it: the same substrate serves content management, the released-content
gate, versioned legislation (Art. X amendment = branch/edit/merge), and
the argument-map's version-controlled proposals. Producer influence is
the first and most demanding consumer, not the only one.

## See also

- [cms-slate.md](./cms-slate.md) — **the sibling to extend, not
  duplicate.** Designs the three authoring surfaces (in-game light, web
  CMS, external-editor-via-git), the `GitApi` source-tree harness (a
  *thin VC overlay* on the source repo), `domain_history` op-log
  versioning for content, and the draft/publish changeset model. This
  slate **elevates** that GitApi from an external-editor overlay into the
  in-runtime authoring spine, and adds the two things cms-slate doesn't:
  **ownership-as-attribution** and the **dependency graph**.
- [scoped-authoring-slate.md](./scoped-authoring-slate.md) — establishes
  `/home/<playerId>/` homedirs, the dorm-as-homedir, and the
  ownership-scoped permission ladder (player → builder → wizard). The
  **sandbox** end of sandbox→release.
- [authoring-intelligence-slate.md](./authoring-intelligence-slate.md) —
  the LSP / semantic model; orthogonal (validation, not provenance).
- [cooperative-slate.md](./cooperative-slate.md) §§ *Three kinds of
  contribution*, *Two merit channels* — producer = "creation, measured by
  the engagement your content earns"; the **infrastructure** work the
  engagement-measure "can't *see*" is exactly what the dependency-DAG
  makes partly visible.
- [draft-constitution.md](../../governance/draft-constitution.md) Art. X (amendment =
  versioned law), Art. VII (the tamper-evident record) — **the same
  VCS** this slate stands up.
- [influence-allocation-requirements.md](../../requirements/influence-allocation-requirements.md)
  — the producer faucet's **routing-resolver seam** (Layer-1 authorship /
  Layer-2 engagement faucet) is the consumer this slate feeds; v1 routes
  to a single owner, this slate is how that becomes the full owner graph.
- [access.md](../../subsystems/access.md), [zone.md](../../subsystems/zone.md)
  — `Zone.ownerGroup`/`accessGroups`, `GroupRef`, the nearest-ancestor
  `lookupField` walk this generalizes.
- [hot-reload.md](../../subsystems/hot-reload.md),
  [persistence.md](../../subsystems/persistence.md),
  [templates.md](../../subsystems/templates.md),
  [deployment.md](../../deployment.md) — the live substrate (below).

## Current state (grounded)

What exists today, from a code scout:

- **Seed → DB.** `mud/seeds/*.yaml` → `SeederManager` → the `domain`
  collection (insert-only, idempotent; re-seed is a manual
  `deleteOne + restart`). `bootstrapManifest` (`mud/bootstrap.ts`) clones
  singletons at boot in `dependsOn` order. Sibling seeders
  (`AppSettingsSeeder`, `EmoteSeeder`, …) for other collections.
- **Template ↔ class.** `Template.class` is a source-relative path (e.g.
  `/obj/Avatar`), resolved by **dynamic import at clone time** — there is
  **no central path→constructor registry**. `ModuleApi.stamp` maps each
  class → a module ID (`mud/obj/Avatar#Avatar`) for **call-security
  gates**, not template resolution.
- **Ownership.** `Zone.ownerGroup` / `accessGroups` (`GroupRef`,
  inheritable via the nearest-ancestor `Zone.lookupField` walk) + the
  `AccessApi` predicates (`can` / `canMutateZone` / `isAuthor` /
  `isWizard`). **Only zones own.** No ownership on leaf templates, no
  ownership on TypeScript modules.
- **Authoring.** The `write` verb (content `-c` → `TemplateApi.saveTemplate`;
  source `-s` → `SourceTreeApi.write`, developer-gated) over the
  Workspace (`contentCwd`/`sourceCwd`); the Author mixin
  (`clone`/`reload`/`eval`). `eval` runs in a soft `vm` sandbox; **no
  runtime TS-class authoring**, **no `createdBy`/`authoredBy` on anything**.
- **Versioning.** **None** — only `Document.createdAt`/`updatedAt`. No
  commits, branches, diffs, history, review, rollback, or merge.
  `HotReloadApi` keeps only current+previous. `cms-slate`'s `GitApi` and
  `domain_history` op-log are **designed, not built**.
- **Dependency graph.** Build-time TS `import`s only; the bootstrap
  manifest's `dependsOn` is boot-ordering, not a general graph. **No
  runtime model** of template→class→module dependencies.

The substrate is a clean slate for provenance — which is the
opportunity and the size of the build.

## The principles

1. **Provenance is one first-class substrate, not a side-effect.** Who
   *made* a thing (authorship → credit), who *controls* it (ownership →
   rights), what it is *built on* (dependency lineage → upstream credit),
   and how it *changed* (history → audit & rollback) are facets of one
   layer — because **producer influence** and **versioned law** both read
   it, and both are load-bearing.

2. **One ownership model over two namespaces.** Content (template paths)
   and code (module paths) share a **single hierarchical, individual-or-
   group, nearest-match** ownership model — "own a path at any level; the
   nearest ancestor owner wins," CODEOWNERS-style. This is the codebase's
   *house pattern* already (zone field inheritance, biome outward-walk,
   address longest-prefix, `PathTrie`) — so the resolver is not new
   substrate, just generalized from `Zone.ownerGroup` to both trees and
   to leaf-level.

3. **Authorship is attributed to people; ownership is attached to paths.**
   A **diff is always one person's act** (authorship / credit — the
   diff-attribution instinct); a path's **owner** is who controls it (and
   may be a team). Keep them distinct: credit flows from authorship,
   rights flow from ownership. An in-runtime VCS gives the first for free.

4. **Credit flows up the dependency DAG, with per-hop decay.** Engagement
   credits the **proximate** creator most (the sword's designer), and a
   **diminishing long tail** flows upstream — the `Weapon`-class author
   earns a slice of everything built on it, the engine author less again.
   This makes **infrastructure partly visible** to the engagement measure
   (shrinking the slate's "work the measure can't *see*" gap that
   otherwise falls entirely to human merit-pay) — *without* pretending to
   measure the *quality* judgment, which still goes to merit-pay.

5. **Git-in-runtime is the authoring spine.** Authoring — code **and**
   content — happens through an in-runtime VCS: **sandbox/branch**
   (a homedir or team sandbox) → review → **merge/release** (into the
   general domain). One machine delivers diff-attribution (P3), the
   **released-content gate** the producer faucet needs (unreleased earns
   nothing), history/rollback, and — the convergence — **versioned law**
   (Art. X amendment = branch/edit/merge; the argument-map's
   version-controlled proposals). This *elevates* `cms-slate`'s GitApi
   from an external-editor overlay to the in-runtime workflow.

6. **The polity stays flat — credit resolves to individuals.** A team /
   zone is a **routing label**, never a political organ. Shared content's
   credit splits to individuals by a **declared** weighted split (not a
   governed divvy → no federalism), **static between fixed global
   adjustment windows** (the split is a *franchise-shaping instrument*; an
   on-demand re-cut is a gerrymander that could swing a live producer-
   house vote, so re-cuts are decoupled from the bill calendar), with
   **redirect-the-faucet-not-reslice-the-pool** semantics (a re-cut
   changes only future flow, never claws back earned standing). *(These
   constraints are already settled — see the influence requirements doc.)*

## The model — four layers

**Layer A — Ownership (rights).** A path-ownership resolver over both
namespaces: `ownerOf(path) → GroupRef` by nearest-ancestor walk, with a
declared per-recipient **split** when the owner is a team. Generalizes
`Zone.ownerGroup` to leaf templates and to module paths. Reuses
`GroupRef` + the `lookupField` walk. Assignment, transfer, and
co-ownership are the open questions (below).

**Layer B — Authorship (credit routing).** Per-artifact attribution of
*who created/changed it*, attributed to **people** (not just the owning
group), sourced from the VCS diff stream (Layer D). This is the
**routing resolver** the producer faucet already expects: "given engaged
content, who earns and in what shares" — Layer A's split × Layer B's
diff-attribution, resolved to individuals.

**Layer C — Dependency lineage (upstream credit).** A runtime model of
`template → backing class → imported modules`, so engagement credit can
flow up the DAG with decay (P4). `Template.class` gives the first edge
for free; the class→module import graph must be extracted (build/reload
time) into a runtime model. Per-hop decay + anti-gaming guards are the
design crux (open questions).

**Layer D — The in-runtime VCS (the spine).** The git workflow as a
runtime system: branches/sandboxes, commits (diff-attributed to people →
Layer B), review, merge-to-release (→ the producer faucet's released
gate), history/rollback, and the same machine versioning **law**. Subsumes
and extends `cms-slate`'s `GitApi`. The central architecture question
(below) is whether code (already git) and content (Mongo `domain` +
op-log) **unify** under one VCS or are **bridged** by a common provenance
overlay.

## Worked scenarios

- **Solo sword.** Author A writes a `katana` template in their homedir
  (sandbox — earns nothing). On **release** (merge to `/domain/...`), the
  template's owner = A, authorship = A. Players wielding katanas in a
  released zone draw engagement → producer credit to A (proximate), a
  decayed slice to the `Weapon`-class author, less to the engine author.
- **Team zone (Narnia).** `/narnia/**` is owned by the Narnia group with
  a **declared split** `{A:40, B:30, C:30}`, frozen until the next global
  quarterly window. Engagement in Narnia routes by the split to A/B/C's
  *own persistent* standings. A new contributor joining mid-quarter gets a
  share of *future* flow at the next window; a departing member keeps what
  they earned (redirect-the-faucet).
- **Infrastructure author.** D wrote the `Weapon` class everyone's
  weapons extend. D authored no *content* with measured engagement, yet
  earns a steady long-tail of producer influence from the dependency DAG
  — the slate's "infrastructure the measure can't see," made partly
  visible. The *quality* of D's work (was it good infra?) still routes to
  human merit-pay.
- **Versioned law.** An amendment is a **branch** on the law tree; debate
  is the argument-map over the diff; ratification is a **merge**; the
  history is the tamper-evident archive (Art. VII). Same VCS as code and
  content.

## Open questions

- **Real git vs git-like; unify vs bridge.** Code is already git
  (`deployment.md`, `cms-slate`'s GitApi); content is Mongo (`domain` +
  the designed `domain_history` op-log). Do we (a) bring content under a
  real VCS too (one repo, one model), or (b) keep two stores and lay a
  common **provenance overlay** (authorship + history + ownership) across
  both? cms-slate currently assumes (b). The user's "whole git workflow
  in-runtime" leans toward (a) or a strong (b). **This is the central
  architecture decision.**
- **Building the runtime dependency graph.** Extract class→module imports
  at build/reload time into a runtime DAG? How deep does credit flow, and
  how are dynamic / reflective deps handled?
- **Gaming the credit DAG.** Wrapper-spam (insert a trivial class to skim
  a hop), circular deps, dependency-injection-for-credit. Guards:
  substantive-dependency threshold, hop cap, decay steepness, and the
  merit-pay backstop for the genuinely-unmeasurable.
- **Ownership assignment & transfer.** How does a path acquire an owner —
  first author on release? Explicit grant by an ancestor owner? How are
  transfer, co-ownership, and disputes handled (and is *that* where any
  team-internal governance pressure reappears — the federalism edge to
  hold)?
- **Co-versioning content + code.** Can one logical change span a content
  edit and a code edit atomically, or are they separate histories bridged
  by the overlay?
- **Sandbox isolation & runtime code authoring.** `vision.md` flags
  `isolated-vm` for user-authored mods. How isolated are homedir/team
  sandboxes; can players author *code* (not just data) safely there
  before release?
- **Decay & split tuning.** Per-hop decay curve, the global
  split-adjustment cadence, proximate-vs-upstream share — all
  Schedule-of-Parameters constants, calibrated against a running game.

## Rough build order

1. **Ownership as first-class over both namespaces** (Layer A) —
   generalize `Zone.ownerGroup` into a path-ownership resolver; add
   leaf-template and module ownership; nearest-match. *Smallest, highest-
   leverage, reuses the house pattern; directly upgrades the producer
   routing resolver past single-owner.*
2. **Authorship attribution** (Layer B) — `createdBy` / diff-attribution
   feeding the routing resolver. Minimal first cut even before the full
   VCS.
3. **Sandbox → release** — generalize `scoped-authoring`'s homedirs +
   `cms-slate`'s draft/publish into the released-content gate the producer
   faucet consumes.
4. **The in-runtime VCS** (Layer D) — the big one; resolves unify-vs-bridge;
   subsumes `GitApi`.
5. **Dependency-DAG credit flow** (Layer C) — the producer-attribution
   enrichment; needs the runtime dep graph + anti-gaming.
6. **Versioned-law convergence** — Art. X amendment + argument-map
   proposals on the same machine.

## What this slate does NOT cover

- The **producer faucet / standing / band** themselves — that's the
  influence build (this slate feeds its routing resolver).
- The **authoring LSP / diagnostics** (authoring-intelligence-slate) and
  the **web CMS UI** (cms-slate).
- **Conviction voting / chambers / bills** (cooperative-slate) — except
  that versioned law shares this VCS.
- The **in-world economy** and crafting (economy-slate, crafting-slate).
- The **merit-pay** human-judgment channel — the dependency-DAG shrinks
  but does not replace it.

## Once shaped into requirements

This is a large surface — likely **several** requirements cycles, not
one. The natural first slice (and the one the influence build most wants)
is **Layer A + B**: first-class hierarchical ownership over both
namespaces plus people-level authorship attribution — enough to take the
producer routing resolver from single-owner to the real owner graph,
*without* yet building the full in-runtime VCS or the dependency DAG.
Start there; the VCS spine and the credit DAG are their own builds.
