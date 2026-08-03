# Wiki — implementation plan

> **Carve:** the unblocked half of
> [wiki-requirements.md](../requirements/wiki-requirements.md).
> **Out:** media upload (M3), search (Q1), notification delivery
> ([notification-slate](../slates/builds/notification-slate.md)).
>
> ⭐ **Revised 2026-08-03 against `origin/master` `629fb5cd`.** Two
> refactors landed: `reference-lifetime` (so `FieldMetaEntry` exists and
> `<composition>` is **unblocked** — see W9) and
> `refactor/lib-obj-taxonomy` (so **nothing instances `lib/`** — see C-7).
>
> Criteria numbering in the requirements runs **1–31, 34–51, 54–73** plus
> `44a` — the doc skips 32/33 and 52/53. 70 numbered items.

---

## 0. Corrections to the requirements — all six VERIFIED against master

The requirements describe machinery that has moved. Each of these was
checked in the tree, not assumed.

**C-1 · `accessGroups` is retired.** `ownerGroup` / `accessGroups` were
removed from `Zone` in property phase 0a — `lib/zone/Zone.ts` carries the
removal note, and `AccessRegistry.can` resolves title via
`ParcelApi.ownerOf` over the gated `parcels` collection. Namespace
ownership is a **parcel row**, not a zone field.

**C-2 · There is no "all signed-in players" group**, and a parcel has
exactly one owner (`{kind:'group'|'player'}`). The open edit floor cannot
be a group — see D-3.

**C-3 · No mixin is added.** `DocumentedMixin` was withdrawn in D7;
criterion 31's `Mixins`/`architecture.md` clause reduces to the component
category.

**C-4 · `MediaAsset.status` is `'draft' | 'approved'`**, not `pending`.

**C-5 · ~~`FieldMetaEntry` does not exist~~ — RESOLVED 2026-08-03.**
`reference-lifetime` merged. `lib/mixin.ts` exports `FieldMetaEntry` with
`persistent` / `marshaller` / `instruction` / `globIdentity` / `ref` /
`lifetime` / `inverse` / `authorable` / `authorPicker` / `runtimeState`,
and `MixinApi.getAllFieldMeta` collects it with **property-level merge up
the composition chain**. D9's `spoiler?: 0|1|2|3` is one more property
alongside its siblings — no new mechanism. **`<composition>` is
unblocked**; see Wave 9.

**C-6 · ⭐ `@CallSecurity` is INERT on a `Document`.** `ProxyApi.wrap` is
called only from `StuffApi.create` / `clone` / `createSync`; a Document
is constructed with `new` and never wrapped, and instance-method gating
is enforced *by that proxy*. This invalidates the requirements' "rendering
lives on `WikiPage`" and is why state and mutations live on a singleton
`Idea` instead.

**C-7 · ⭐ Nothing instances `lib/`.** `refactor/lib-obj-taxonomy` landed:
a class a template's `class:` resolves to lives in **`obj/`**, on both
axes — the `.ts` file and the template path — enforced by the new
CI-gating `pnpm lint:instanceable`. `FolderZone` moved to
`obj/FolderZone.ts` (`/obj/FolderZone`) while the abstract `Zone` /
`SpatialZone` stayed in `lib/zone/`.

**One planned file was on the wrong side:** `WikiNamespaceZone` is named
by `seeds/wiki/*.yaml`'s `class:`, so it is instanceable and belongs in
`obj/`. Corrected in §1.1. Everything else verified against `629fb5cd`
and unmoved — Documents (`ParcelRecord`, `MediaAsset`) stayed in `lib/`,
brains stayed in `lib/behavior/`, and all thirteen paths this plan
references still resolve.

---

## 1. Architectural spine

### 1.1 Where the code lives — no new `*Api`, no new module categories

| Concern | Home | Category |
|---|---|---|
| Page + revision rows | `lib/wiki/WikiPage.ts`, `lib/wiki/WikiRevision.ts` | Document |
| Namespace zone | ⭐ `obj/WikiNamespaceZone.ts` (`extends` `obj/FolderZone`) | Stuff class — **instanceable, so `obj/` (C-7)** |
| Render contract (types + vocabulary) | `lib/wiki/render.ts` | Named value-object — the `lib/behavior/brain.ts` precedent |
| Budget | `lib/wiki/RenderBudget.ts` | Named value-object |
| Word diff | `lib/wiki/SourceDiff.ts` | Named value-object |
| Components | `lib/wiki/components/<name>.ts`, sole export `component` | Brain pattern |
| Page state + mutations | `obj/WikiRegistry.ts` (`extends Idea`) | Stuff class — `AccessRegistry` precedent |
| Render pipeline | `obj/WikiRenderer.ts` (`extends Idea`) | Stuff class |
| Verb | `cmd/system/wiki.yaml` + `obj/command/system/WikiController.ts` | YAML + Controller |

**Not `obj/api/WikiLogic.ts`** — that category is defined as "a
*convertible Api's* logic", and there is no Api. `obj/<Name>Registry.ts`
is the shipped shape for a gated state-owning singleton.

**Not methods on `WikiPage`** — see C-6.

**Documents stay in `lib/`.** `WikiPage` / `WikiRevision` are never named
by a template's `class:`, so C-7 does not move them — the shipped
`lib/parcel/ParcelRecord.ts` and `lib/media/MediaAsset.ts` are the
precedent. Components stay in `lib/wiki/components/` for the same reason
brains stayed in `lib/behavior/`: a path-resolved module is not a Stuff.

### 1.2 Gate strings

```ts
const WikiControllerOnly = SecurityPolicies.FromModule(
  '/obj/command/system/WikiController',
);
```

String form, matching `AccessApi.setWizardMembership`, because
`pnpm lint:gates` validates concrete `FromModule` strings against a real
module + export — the class form is invisible to that lint.

Registry **reads** are ungated so the renderer can resolve snippets and
link targets. `WikiRenderer.render` / `.redactSource` are
`AnyOf(FromModule(WikiController), FromTemplate('/obj/WikiRegistry'))`.

⭐ **That gate is what makes criterion 49 structural.** Components live at
`/lib/wiki/components/*`, which is not in the allowlist, so a component
re-entering the renderer takes a `SecurityError` — a gate, not a depth
counter.

### 1.3 One gate for spoilers

`WikiRenderer` has two faces over one `#effectiveLevels` walk:

- `render(body, opts)` → display MML: over-ceiling nodes **deleted**,
  over-appetite nodes **tagged** `<spoiler level="n">`.
- `redactSource(body)` → source string with over-ceiling fragments
  deleted. Feeds `history`, `diff`, the conflict payload.

Both derive the reader from `ExecutionContextApi.getActingAuthor()`
**internally**, never a parameter — which is what makes criterion 24
assertable on the wire.

### 1.4 The pipeline — stage order frozen in Wave 2

```
render(body):
  1. parse            Mml.parseTree(body)                 [W2]
  2. expandSnippets   fixpoint, depth cap, cycle detect   [W2 no-op → W4]
  3. resolveLinks     [[Page]] → <link> / redlink         [W2 no-op → W3]
  4. resolveComponents  path-resolved, budgeted           [W2 no-op → W5]
  5. gate             MAXIMUM levels → omit / tag         [W2]
  6. emit             serialise back to MML               [W2]
```

Later waves fill stage bodies; **no wave adds a stage.** 2-before-4 is D6.
`render` takes a **body, never a page id** (A4) — `pageId` rides `opts`
for self-reference only.

---

## 2. Decisions the requirements left open

**D-1 · Edit transport — the shipped body side-channel.** `payload:` block
in the YAML; `CommandApi.overlayBodyFields` overlays only `payload:`
fields and greedy strings, so selectors and flags are structurally
unreachable. Controller mirrors `ForumController.resolveBody`: inline
greedy → `fields` → `PromptApi.compose`. **No new transport.**

**D-2 · Frontmatter as options, not a YAML preamble.** `--title`,
`--spoiler`, `--tag`, `--subject`, `--related`; the payload carries body
only. Free type/enum validation, scriptable, and no second authored-format
parser in the mudlib.

**D-3 · The access ladder** (replaces `accessGroups`, per C-1/C-2).
`protection` on `WikiNamespaceZone`, resolved by the shipped
`Zone.lookupField` walk:

| protection | check |
|---|---|
| `anyone` | signed-in Avatar |
| `editors` | `AccessApi.can(actor, 'edit', nsZone)` |
| `moderators` | `AccessApi.canMutateZone(actor, nsZone)` |

Bootstrap mints **one** group, `wiki-editors`; moderators are its
`'owner'`-role members, because the substrate already distinguishes the
two and a second group would need `GroupApi.isMember` in a controller —
which the antipattern table forbids. Per-page `protection` takes the MAX
with the namespace's, so a page can only be tightened.

**D-4 · Sticky anchors minted into the stored source.**
`<h2 anchor="uses">`, with `flatten` emitting `## Uses {#uses}` so the
edit form round-trips. Belt: `reconcileAnchors(prior, next)` adopts the
prior anchor at the same index when heading counts match, else mints from
slugified text. Survives rollback because the anchor is in the snapshot.

**D-5 · The pipeline charges the budget; the component reads it.**
`ctx.budget` is read-only. Components are untrusted input's executor —
self-charging would make the bound advisory. Limits from `app_settings`.

**D-6 · Conflict on the wire — a new `Note` kind.** Note kinds are
explicitly append-only, so this is the sanctioned extension.
`wiki-edit-conflict` carries `page`, `section?`, `baseRev`, `currentRev`,
and base/current/submitted bodies — **all three through `redactSource`**.
`autoEscalationFor` → `declined`.

**D-7 · Diff hand-rolled, no dependency.** `lint:imports` enumerates the
npm allowlist and `lib/**` may not import outside `src/mud/`, so a `diff`
package is unreachable from where the algorithm belongs. Word-level LCS
in `lib/wiki/SourceDiff.ts`; whitespace normalised before tokenising.

**D-8 · A tag vocabulary distinguishes component from markup.**
`api/mml/tags.ts` → `Mml.isKnownTag`. Unknown + safe charset = component
candidate; unknown + unsafe = literal text.

**D-9 · Appetite dial: one `static settings` entry on `obj/Avatar.ts`.**
`EnvironmentMixin`'s schema walk is over the host's prototype chain, and
Avatar already documents this carve-out. ⚠ Flag at review under criterion
7 — it is a reader preference, not a wiki field on a game model. Ship a
per-invocation `--spoiler <n>` too. **Ceiling is derived**, not stored:
L3 iff `isWizard`, L2 iff `canMutateZone`, L1 iff `can(read)`, else 0.

**D-10 · No `wiki search` subcommand.** Search is out of the carve; a
subcommand answering "not available" puts a lie in `help wiki`.

**D-11 · `<image key>` only.** The subject-illustration half of criterion
39 needs `<composition>`, which is blocked.

**D-12 · No `<mql>` component.** `MqlApi.resolveMany` needs a context
carrying an actor — handing a component reader identity, which C1
forbids. It needs a viewer-free system-mode scope decided on purpose.

**D-13 · No `recordAuthoring` wiring.** `wiki_revisions` *is* the wiki's
authorship ledger with the same context-derived author rule; a second
ledger for one fact. Reversible in a line.

**D-14 · Sandbox policy `refuse` for both collections** — `COLLECTION_POLICIES`
is a total record, so omission is a compile error. Matches the
audit-flipped `Blueprints` / `MediaAssets` precedent.

---

## 3. Waves

Each wave independently green (`pnpm test`, `pnpm lint`, the script lints
— now including the CI-gating **`pnpm lint:instanceable`** (C-7) — and
type-clean) and committable.

> **W1 markup · W2 the body-not-id render path · W3 `rev`.** The
> requirements flag `rev` and body-not-id as un-retrofittable; both land
> before any client-visible surface is written against their absence.

### Wave 1 — MML long-form
Modify `api/mml/flatten.ts` (h1–h3, nested list, table, spoiler),
`api/mml/markdown.ts` (**an options bag** — default behaviour
byte-identical, so chat/say/dm are untouched), `api/mml.ts` (`heading`,
`table`, `spoiler`, `isKnownTag`, `parseTree`), `MmlRenderer.tsx`.
New `api/mml/tags.ts`.
**Tests:** long-form round-trip + every new tag has `flatten` (**23**);
a **regression corpus written first**, asserting current chat output is
byte-identical.

### Wave 2 — The render pipeline
New `lib/wiki/render.ts`, `lib/wiki/RenderBudget.ts`,
`obj/WikiRenderer.ts` + seed. Modify `lib/paths.ts`,
`config/app-settings.yaml` (`wiki.render.*`), `obj/Avatar.ts` (D-9).
**Tests:** over-capability absent **from the string** (**24**),
over-appetite tagged (**25**), page default (**26**), MAXIMUM rule
(**59, 60**), body-not-id invariant, budget bounds (**48** partial).

### Wave 3 — Page model, `rev`, names, deletion, the verb
Three commits: documents → registry → verb/zones/access.
New `lib/wiki/WikiPage.ts`, `WikiRevision.ts`, `WikiNamespaceZone.ts`,
`obj/WikiRegistry.ts`, `cmd/system/wiki.yaml`,
`obj/command/system/WikiController.ts`, seeds for `/wiki` + four
namespaces + the topic. Modify `Collections.ts`, `PersistenceManager.ts`
(policies + indexes), `config/groups.yaml`, `config/parcels.yaml`.
Fill pipeline stage 3.
**Tests:** **1–8, 11, 19–22, 61–64**, plus an asserted negative for **7**.

### Wave 4 — Snippets
Fills stage 2 in `WikiRenderer` only.
**Tests:** **16, 17, 18, 47, 57, 58**.

### Wave 5 — Components
New `lib/wiki/components/{infobox,help,image}.ts` + four throwaway
fixtures. Fills stage 4.
**Tests:** **13, 14, 15, 48, 49, 54, 55, 56**.
> **12, 27, 28 are not satisfied here** — `<composition>` is blocked. This
> wave builds the seam so it is one file plus one `spoilerLevelOf` call.

### Wave 6 — The authoring loop
`--section`, `--summary`, `--draft`, `--rev`, `preview`; `resolveBody`;
`WikiEditConflictNote` in `packages/types`; drafts in the registry.
**Tests:** **34, 35, 36, 37, 38**.

### Wave 7 — History and diff
New `lib/wiki/SourceDiff.ts`; `diff` subcommand. **Redact before
diffing**, so an over-ceiling change produces no op at all.
**Tests:** **9, 10, 45, 46, 66, 67, 68**.

### Wave 8 — ⭐ `<composition>` (UNBLOCKED 2026-08-03)

The panel the whole design was for. Now buildable — `reference-lifetime`
landed.

**Modified**

| File | Contents |
|---|---|
| `lib/mixin.ts` | `FieldMetaEntry` gains `spoiler?: 0 \| 1 \| 2 \| 3` — "reveal level of this field's VALUE wherever it surfaces", one property beside `authorable` / `runtimeState`. `getAllFieldMeta` already merges property-level, so a subclass adding `spoiler` to a field its base declares `persistent` gets both. |
| `api/mixin.ts` | re-export unchanged; no new collector |

**New**

| File | Contents |
|---|---|
| `lib/wiki/spoilerLevelOf.ts` | the one seam: `(ctor, field) => 0..3`, defaulting **open** (D9's decided fail-open). A value-object module, not a helper — it is the single place the default lives. |
| `lib/wiki/components/composition.ts` | resolves the subject's kind (D7): `template` → `Template.findByPath` → `class` → `MixinApi.queryMixins` + `getAllFieldMeta`; `mixin` → `StudioApi.describeMixin` **plus the inverse index** — what composes it; `command` → the YAML view + controller. Emits per-node levels from `spoilerLevelOf` (C3) and **never gates** (C1). |
| `lib/wiki/__tests__/composition.test.ts` | see below |
| `mud/__tests__/wiki-spoiler-fields.snapshot.test.ts` | the enumerating audit — every field the panel can surface, with its level |

**Tests**

| Covers |
|---|
| `<composition>` renders a subject's live architecture and **changes when the subject's composition changes, with no edit to the page** — **12** |
| a `spoiler`-declared field is omitted above capability and tagged above appetite, asserted on a **real render**, not the tag scan — **27** |
| the snapshot enumerates every surfaceable field + level, so an untagged spoiler is a **review diff, not a leak** — **28** |
| a seeded subject-bound page renders with a live panel — **29** (completes it) |
| ⭐ the **mixin inverse** — "what composes `Combustible`" — returns every composing class, the question no single template can answer |

> The seam was built in Wave 5 exactly so this wave is two new files and
> one property. That prediction held.

### Wave 9 — Maintenance, seeds, docs
New `backend/WikiSeeder.ts`, `config/wiki-pages.yaml` (~8 pages),
`docs/subsystems/wiki.md`. `links` / `wanted` / `orphans` / `dangling`.
Modify `CLAUDE.md`, `architecture.md`, `sandbox.md`, `messaging.md`.
**Tests:** **29 (partial), 30, 31, 40, 50, 51, 65, 70**.

---

## 4. Criteria not satisfied by this carve

| Criteria | Blocked on |
|---|---|
| ~~12, 27, 28, 29~~ | ✅ **UNBLOCKED 2026-08-03** — Wave 8 |
| 39 (illustration half), 41, 42 | shared media ingest (M3) |
| 43, 44, 44a | the search port (Q1) — no slate yet |
| 69, 71 | durable notification |

With Wave 9, this carve satisfies **every criterion except the twelve
owned by the three shared substrates** the wiki depends on and does not
own.

---

## 5. Risks

**R-1 · The markdown parser is on the chat hot path.** `parseMarkdown`
runs on every utterance. Pipe tables interact with `>` quote runs;
indent-nesting changes the list-run terminator. The options bag is the
mitigation and **the regression corpus must be written before the
feature**. If the opts bag leaks (a shared regex `lastIndex`), fork the
long-form parser rather than degrade `say`.

**R-2 · The resolver pass is the load-bearing new machinery.** Four
things each want to be outermost; wrong order is a silent correctness
bug, not a crash. Mitigation: the frozen stage list, plus a test that
asserts order *by observation* — a snippet emitting a component emitting
a `[[link]]`; the link must **not** resolve, proving 3 ran before 4. A
documented limitation; the fix if unacceptable is re-running stage 3, a
stage *body* change.

**R-3 · `Mml.parseTree` widens a sealed surface.** Return
`readonly MmlNode[]` and have the renderer build new nodes, not mutate.

**R-4 · Sticky anchors and rollback interact.** Rolling back restores
that revision's anchors, which may be fewer. A citation to a newer anchor
dangles — correct, but reads as a bug. Document it.

**R-5 · `AccessApi.can` ignores its `action` argument** (verified —
`_action` is discarded). The ladder differentiates by *which predicate it
calls*. Do not write a test expecting `can(a,'read',z)` and
`can(a,'edit',z)` to differ; they cannot.

**R-6 · `WikiRegistry` will be big.** Past ~700 lines, split maintenance
reads into `obj/WikiIndex.ts` — **not** a free-floating helper module.

**R-7 · `/wiki` is a new top-level template branch** beside `/lib`,
`/obj`, `/domain`, `/home`, `/studio`. Class paths stay `/lib/wiki/*`, so
`#validateClassPath` is satisfied; confirm no other prefix check assumes
the closed set.

**R-8 · ⭐ `redactSource` must parse, delete, re-serialise — it cannot
regex.** That means MML serialisation must round-trip:
`emit(parse(x)) === x` for well-formed bodies. **It does not today**
(attribute order, self-closing form, entities). Wave 2 must ship
`serialize` alongside `parseTree` with a round-trip property test, or
`redactSource` silently rewrites bodies it was only meant to filter.

**R-9 · Appetite tagging vs capability omission are easy to conflate.**
`level > ceiling` → **delete**; `ceiling >= level > appetite` → **keep and
wrap**. Same walk, and an inverted comparison leaks. Assert on the
**string**, never a level-annotated tree.
