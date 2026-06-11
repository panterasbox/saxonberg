# Authoring intelligence slate (working doc)

> **Status: architecture set; it's a brain, not a feature.** The
> content-semantics intelligence — the layer that *understands the engine's
> content model* and answers "what's valid / what completes / what's wrong"
> for authored content. **One semantic model, surfaced three ways:** live in
> the **web code editor**, live in **external editors** (via LSP), and
> **authoritatively** at the server **save-gate** (the access layer's
> validation). LSP is just the delivery mechanism to editors; the
> *intelligence* is the substance, and it's the same brain as the access
> layer's content-validation.

Working slate for **authoring intelligence** — the brains behind authoring:
the completions, diagnostics, hovers, navigation, and validation that
understand *our* content (templates, mixins, leases, schemas,
cross-references), not just generic TypeScript. It's carved out of the CMS
slate because it isn't a CMS *feature* — it's a **multi-consumer subsystem**
(web editor, external editors, and the server save-gate all consume it),
which is the same test the access and MultiLocation substrates passed.

The load-bearing decisions:

1. **The intelligence is the substance; LSP is delivery.** The hard, novel
   thing is *understanding our content semantics*. LSP (the Language Server
   Protocol) is merely how that understanding reaches editors — write it
   once, any LSP-capable editor consumes it. The slate is about the brain,
   not the protocol.

2. **One model, three faces.** The same semantic model is surfaced as: (a)
   **live, advisory** feedback in the web editor, (b) **live, advisory**
   feedback in external editors (via LSP), and (c) **authoritative** checks
   at the server **save-gate** (the access layer). Build the model once;
   surface it advisory-in-editor and authoritative-at-save — the exact
   advisory/authoritative split the access layer already draws.

3. **Editor-agnostic by design.** Because it's a language server, the web
   Monaco editor consumes it (via `monaco-languageclient`) **and** a coder's
   own VS Code consumes it (via a small extension). This is the keystone of
   the CMS's external-editor priority: the engine-aware intelligence travels
   to whatever editor a coder prefers.

4. **Three composed layers.** TS (engine `.d.ts` → type validity +
   IntelliSense — mostly off-the-shelf), YAML (JSON schemas like
   `command.schema.json` → schema validity + completion — mostly
   off-the-shelf), and the **custom platform-semantic layer** (the novel
   part: template-path completion, reference validation, mixin-composition
   rules, lease/scope awareness, cross-template navigation). The third layer
   is the build.

5. **Scope to the lease + ship the type surface.** It loads the engine's
   compiled **`.d.ts`** (the type *surface*, not source) + only the author's
   **lease-scoped** content — never the whole world — and stays in sync with
   the **server version** being authored against. This is the answer to "our
   codebase has a lot going on": IntelliSense is fast *and* correct without
   drowning the worker.

See also:

- [docs/slates/cms-slate.md](../builds/cms-slate.md) — the **authoring app** that
  consumes this in its web code editor; also the **external-editor path**
  (git + the VS Code extension) this intelligence travels over. The CMS owns
  the *UI*; this owns the *brain*.
- [docs/slates/access-slate.md](../tails/access-slate.md) — the **authoritative
  face**: the save-gate (recompile + lint + invariants + the lease gate)
  consumes this same model; the **lease/scope rules are an input** to the
  intelligence (lease-aware completions/diagnostics). The advisory/authoritative
  split mirrors access's command-validators-vs-core-gate.
- [docs/standard-model.md](../../standard-model.md) — the engine content model
  the intelligence understands (the `.d.ts` source: kinds, traits, Apis).
- [docs/subsystems/command-spec.md](../../subsystems/command-spec.md) /
  `command.schema.json` — the YAML/command-spec schema source the YAML layer
  validates against (and that the CMS content-editors are *also* generated
  from — shared schema).

---

## Principle

1. **Brain, not feature** — a semantic model of our content, not an editor
   widget.
2. **One model, three faces** — live-web, live-external (LSP), authoritative-save.
3. **Editor-agnostic** — write once, consumed by any LSP editor.
4. **Three layers** — TS (off-the-shelf) + YAML (off-the-shelf) + the custom
   platform-semantic layer (the build).
5. **Lease-scoped + type-surface** — load defs + your scope, sync to the
   server version, never the whole world.

---

## The model

### One semantic model, three faces

The intelligence is a model of: the engine's **types** (`.d.ts`), the
**YAML schemas**, the **platform rules** (mixin composition, lease scope,
cross-references), and the **lease-scoped content tree**. From that one
model, three surfaces:

| Face | Rigor | Consumer | Delivery |
|---|---|---|---|
| **web editor** | advisory (instant UX) | the CMS code editor | in-browser worker and/or `monaco-languageclient` → LSP |
| **external editor** | advisory (instant UX) | the coder's own VS Code | a VS Code extension → LSP |
| **save-gate** | **authoritative** | the access layer | the server validation step |

The advisory faces give fast, in-editor feedback; the save-gate is the truth
(it also adds the access gate + recompile). Same model, two rigors — the
access layer's command-validator-advisory / core-gate-authoritative split,
applied to content.

### The three composed layers

- **TS** — feed the engine's `.d.ts` to a TS language service; get
  type-checking + IntelliSense against the standard model. Mostly
  off-the-shelf (Monaco's TS worker / the `tsserver`).
- **YAML** — JSON-schema-driven completion + validation (the
  `yaml-language-server` model), against our schemas (`command.schema.json`
  and friends). Mostly off-the-shelf (wire a YAML language service + our
  schemas).
- **Platform-semantic (the build)** — the novel layer, none of it
  off-the-shelf:
  - **template-path completion** (complete `/lib/…` paths that exist),
  - **reference validation** (a template that points at `/lib/x` — does it
    exist? is it the right kind?),
  - **mixin-composition rules** (this combo is illegal / requires X),
  - **lease/scope awareness** ("you can't reference that — it's outside your
    lease"; "you can't author here"),
  - **cross-template navigation** (go-to-def from a reference; find-all who
    reference this template),
  - **privileged-op flags** (this authored content calls a gated op it lacks
    authority for),
  - **the two-level composition vocabulary** (see below).

### The two-level composition vocabulary (mixins + combos)

The platform-semantic layer carries the **vocabulary the CMS composes
with** — two levels, the Standard Model's particles and compounds:

- **The mixin catalog (particles).** Each mixin as a first-class CMS
  citizen, not just its runtime interface: its **authorable fields** (what
  it contributes to a form), its config, and its **composition rules**
  (requires / conflicts). Engine-derived (the `Mixins` registry + each
  mixin's field schema). The **code editor** uses it to offer + scaffold
  composition; **any editor** uses it to render the right fields for a
  class's **effective mixin set** (so `Weapon` ≡ `Weaponable(Thing)` to the
  editor).
- **The combo catalog (named compounds).** A hierarchy of named
  compositions (`Weapon` = a thin composition-class). It **grows from
  authoring** — composing in the code tooling triggers a **use-existing /
  name-it** prompt (dedup + capture) — and feeds the content editor's
  **archetype picker** (discovery + reuse) and the composition tooling
  (familiarization). Behavior stays in the mixins; combos are thin
  composition. (Full authoring flow: [cms-slate.md](../builds/cms-slate.md) §
  *Composition & the combo catalog*.)

**The catalog family is open-ended — and decoupled from the runtime.** Mixins
and combos are the first two members; **brains** (NPC behavior modules — see
[npc-behavior-slate.md](../builds/npc-behavior-slate.md)) are a third, and hooks /
validators / other path-resolved module kinds will follow. They all share one
governing property: **the catalog is a CMS-side artifact the game framework
never depends on.** The runtime only ever does **path-resolution** — it
follows an explicit reference, lazy-loads, re-resolves; it never enumerates
and never reads a catalog. So a catalog is allowed to be as presumptuous as
the CMS likes — eagerly indexed, or even **partly hand-maintained** ("someone
keeps it up to date") — because it is **never load-bearing for runtime
correctness**. The worst failure of a stale or wrong catalog is a **palette
omission** (a real module that exists at a path doesn't show in the picker
until the catalog refreshes); you can still reference it by path *today* and
it works. A catalog bug can degrade the authoring UI; it can never break a
running game. That safe failure mode is *why* catalogs get to be loose — and
why discovery (tree-walk / lazy per-scope index / curation) is exclusively
this layer's concern, not the framework's.

### What the language service provides (the feature set)

Standard LSP surface, fed by the three layers: **completions**, **diagnostics**
(TS type errors + YAML schema violations + platform-rule violations),
**hovers** (type info, what-a-template-is, lease info), **go-to-def /
find-references** (cross-template nav), **rename** (scope- and
reference-aware), **code-actions** (quick-fixes; scaffolds — new
mixin/controller/template boilerplate).

### Where it runs

- **Web editor:** the TS layer runs in a browser worker (Monaco's TS worker);
  the platform layer runs alongside (in-worker, or via `monaco-languageclient`
  to a hosted LSP). *Fork:* in-browser (responsive, must load defs+scope) vs
  server-hosted LSP (always-current, round-trip latency) vs hybrid.
- **External editor:** a VS Code extension speaks LSP to a (server-hosted or
  bundled) language server — the same one.
- **Save-gate:** the access layer runs the **same semantic model**
  authoritatively at save (plus recompile + the lease gate). Whether it
  literally shares code with the LSP or just the model is an extraction
  question (below).

### Scope, the type surface, and version sync

The "huge codebase" constraint, answered: the in-editor service loads the
engine's **compiled `.d.ts`** (the type *surface*, generated and shipped —
not the source) **+ only the author's lease-scoped content**. It must track
the **server version** being authored against (stale types → wrong
completions). The `.d.ts` generation/version-sync is a build-pipeline
concern, but it's load-bearing: the intelligence is only as good and current
as the type surface it's fed.

### The shared-with-validation insight

The access layer's save-gate already has to answer "is this content valid?"
(recompile + invariants + the lease gate). That's the **same semantic
question** the editor answers live. So the editor's intelligence and the
server's authoritative validation **share a model** — ideally a shared core,
surfaced advisory (editor) and authoritative (gate). This is *why* the
intelligence is its own subsystem and not a CMS feature: it spans the editor
**and** the validation gate.

---

## Worked scenario

A dev edits a Narnia NPC template. As they type a `_extendsBiomePath`, the
**platform layer** completes only real biome paths in their lease; they
reference one outside their lease → an instant **diagnostic** ("outside your
lease"). They add a mixin combo the rules forbid → a red squiggle, with a
**code-action** to fix it. Go-to-def jumps to the referenced template.
They're in the **web editor** — but their teammate, in **VS Code**, gets the
*identical* completions/diagnostics from the same LSP. On save, the
**save-gate** re-runs the same checks authoritatively (plus the lease gate +
recompile) before persisting. One brain, three faces.

---

## Open questions

1. **In-browser vs server-hosted LSP** (vs hybrid) — responsiveness vs
   always-current-with-the-server; how much runs in the browser worker.
2. **The `.d.ts` pipeline + version sync** — how the engine type surface is
   generated, shipped to editors, and kept current with the server version.
3. **What the in-editor service loads** — engine `.d.ts` + lease-scoped
   content; the perf budget; how scope maps to what's resolvable.
4. **Shared core vs shared model** — does the save-gate literally run the
   same code as the LSP, or just the same semantic model? (The extraction
   call.)
5. **Feature scope v1** — completions + diagnostics first; rename /
   find-references / scaffolds later.
6. **Platform-rule source** — where mixin-composition / cross-ref / lease
   rules are *declared* so both the LSP and the gate read them from one place
   (not hand-coded twice).

---

## Build order

**Wave 1 — the model + a server, web-first.** The platform-semantic model
(template-path completion, reference validation, lease-awareness) +
TS-via-`.d.ts` + YAML-via-schemas, exposed as a language server consumed by
the **web Monaco editor**; the `.d.ts` generation/version-sync pipeline.
Completions + diagnostics first.

**Wave 2 — external-editor delivery (the priority payoff).** The VS Code
extension over the LSP + git sync (CMS slate) — coders get engine-aware
intelligence in their own editor.

**Wave 3 — depth + the validation merge.** Rename / find-references /
code-actions / scaffolds; and **share the core with the access layer's
save-gate** (extract the common semantic model so live + authoritative don't
drift).

---

## What this slate does NOT cover

- **The editor UI / CMS app** → [cms-slate.md](../builds/cms-slate.md). This is the
  brain; that's the body.
- **The access gate / leases / op model** → [access-slate.md](../tails/access-slate.md).
  Consumed as input (lease-awareness) and as the authoritative face (the
  save-gate); not redefined here.
- **The engine content model itself** (templates / mixins / the standard
  model) → [standard-model.md](../../standard-model.md). Understood, not
  defined.
- **The content-editor forms** → [cms-slate.md](../builds/cms-slate.md) (they share
  the *schema source* with this intelligence, but the form-generation is the
  CMS's).
- **Host isolation / running untrusted code** → [access-slate.md](../tails/access-slate.md);
  deferred.

---

## Once shaped into formal requirements

This slate boils down to:

- **One semantic model, three faces** — live-web (advisory), live-external
  (LSP, advisory), authoritative-save-gate — built once, surfaced advisory
  vs authoritative.
- **Three composed layers** — TS (`.d.ts`, off-the-shelf), YAML (JSON
  schemas, off-the-shelf), and the **custom platform-semantic layer** (the
  build): template-path completion, reference validation, mixin-composition
  rules, lease/scope awareness, cross-template nav, privileged-op flags.
- **The LSP feature set** — completions / diagnostics / hovers / go-to-def /
  find-refs / rename / code-actions — editor-agnostic (web Monaco + external
  VS Code, same server).
- **Scope + type surface + version sync** — load the engine `.d.ts` +
  lease-scoped content, synced to the server version; the `.d.ts` pipeline.
- **The shared-with-validation core** — the save-gate consumes the same
  model; platform rules declared once and read by both.
- Tests: a reference outside the author's lease is diagnosed live; an illegal
  mixin combo squiggles with a fix; template-path completion only offers
  existing, in-scope paths; the web editor and an external VS Code show
  identical diagnostics from one server; the save-gate re-checks
  authoritatively before persist; the in-editor service loads only the
  engine `.d.ts` + the lease scope, not the world.

In-browser-vs-hosted, the full feature set, scaffolds, and the
gate/LSP code-merge wait for their own waves.
