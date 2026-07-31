# Import-boundary slate — the driver/mudlib split as a lint rule

> **Status: SHIPPED 2026-07-31** on `refactor/import-boundary`. The rule,
> the tier matrix, the `SourceTreeApi` resource face and the exception
> registry graduated to
> [architecture.md § The import boundary](../../architecture.md), with an
> antipattern entry in [antipatterns.md](../../antipatterns.md) and the
> lint in CLAUDE.md's lint family. `pnpm lint:imports` is CI-gating and
> green at **0 crossings, with an empty exception registry**.
>
> The slate is **fully absorbed** — a retirement candidate at the next
> sweep. Retained only for the record of what the sweep actually cost and
> the two residual tails below.
>
> **What shipped vs. what this slate predicted.** The plan held. Three
> refinements landed during the build:
> - The Api tier's Node built-ins are **enumerated**, not open (the
>   slate's first open question, resolved toward narrowness).
> - The seed-YAML fold became a **synchronous shipped-resource face on
>   `SourceTreeApi`** (`readResource` / `readYamlResource` /
>   `readJsonResource` / `parseYaml`, plus `toMudPath` / `resolveFrom`),
>   keyed on the caller's `import.meta.url` — a language construct, not an
>   import. No new Api was minted. `toMudPath` also retired the duplicate
>   `MUD_ROOT` that `CommandDefinition` and `CommandLogic` each computed.
> - The registry ended at **zero**. It first landed at six, on the
>   argument that four of them were "pure computation, so the exception
>   is safe." That argument was wrong on its own terms — the `ajv` entry
>   claimed routing through a gated Api would break ~120 command tests,
>   which the same commit had already disproved by routing
>   `CommandDefinition.fromYaml` through `SourceTreeApi.parseYaml`. On a
>   second pass every one of the six folded. The pattern that dissolved
>   them: **the part of a module that needs the capability is smaller
>   than it looks**, and the part that doesn't is the part worth keeping
>   in the mudlib (`EvalScript` keeps its sandbox allowlist and only asks
>   `ScriptApi` to run the code). The recurring mechanism is an opaque
>   handle — `CompiledSandbox`, `CompiledProse`.
> - Bonus tightening: `Document` and `Template` moving to `PersistApi`
>   let `check-pm-access.ts` drop two allowlist entries, so the mudlib
>   now has **no route to persistence except the facade**.
>
> **Residual tail (not worth a slate):** two, both deliberate.
> 1. Tests are blanket-exempt. If the rule wants tightening later, the
>    target is banning `../backend/` *value* imports from `__tests__/**`
>    (~10 files at ship time).
> 2. The rule governs **imports**, so ambient globals stay reachable from
>    the mudlib — `process.env`, `globalThis`, `Buffer`, `console`.
>    Closing those needs a different mechanism (an identifier lint, or a
>    real module sandbox). Worth knowing before treating the boundary as
>    a security perimeter rather than a strong architectural one.
>
> Historical survey numbers below were taken on `feat/capability-table`
> and are superseded by the ship numbers: **36 violating files → 0**, of
> which 29 fell to the `Collections` sweep alone.

## The rule

**Nothing under `packages/server/src/mud/` imports anything from
outside `src/mud/` — including Node built-ins — except the Api layer,
which imports and wraps.** Violations break the build.

This is the classic LPMud driver/mudlib boundary, stated for our tree:
mudlib code gets **no ambient capabilities** — no filesystem, no
network, no process, no crypto — it asks the gated surface. The rule is
the import-graph twin of the call-security doctrine
([call-security.md](../../subsystems/call-security.md)): call-security
governs *who may call what at runtime*; this governs *what code can even
reach at module level*. Together they make the sandbox/wizard code-trust
story ([access.md](../../subsystems/access.md)) checkable: untrusted
authored code that can only import mud modules can only do what the Apis
gate.

### The governed set and the tiers

| Tier | Files | May import |
|---|---|---|
| **Mudlib** (default) | everything under `src/mud/` not listed below | relative imports resolving **inside** `src/mud/` + `@saxonberg/types` + any `import type` |
| **Api layer** (exempt) | `mud/api/**` **and** `mud/obj/api/**` | the above + Node built-ins + an **enumerated** npm allowlist + `../backend/` value-imports |
| **Tests** | `**/__tests__/**` | unrestricted (v1; tighten later if wanted) |

*(As shipped there are **no** registry exceptions — the mechanism exists
but the list is empty. The historical text below assumed there would be
some.)*

Outside `src/mud/` (`backend/`, `services/`, `tools/`) is the driver —
it imports express/ws/mongodb by nature and is not governed.
`backend → mud` imports are always fine (the driver may know the
mudlib; never the reverse, except through the Api tier).

### The three shaping decisions (made at capture time)

1. **The exemption tier is both halves of the Api split** — `api/**`
   *and* `obj/api/**`. The `Api ↔ Logic` architecture makes `api/` a
   deliberately thin non-HMR forwarding shell; the actual capability
   usage (CommandLogic reading YAML views, PackLogic reading pack
   files, GitLogic driving `simple-git`) lives in the Logic singletons.
   Exempting only `api/` would force the wrap to forward *backwards*
   into logic that can't do the work. The tier is exactly the code
   that's already `@internal` and gated — the boundary and the
   doc-visibility boundary coincide, which is the
   `callable == visible == cared-about` invariant again.
2. **Type-only imports are exempt from the boundary.** `import type`
   is erased at compile — it confers zero runtime capability. This
   admits `bootstrap.ts`'s `BootstrapEntry` and the ~85 type-only
   `@saxonberg/types` imports for free while keeping the rule's
   meaning: no *capability* crosses. `@saxonberg/types` value-imports
   (~10 files, pure data/constants) are also allowed — it's part of
   the trusted surface.
3. **The npm allowlist for the Api tier is enumerated, not open**:
   `yaml`, `ajv`, `liquidjs`, `simple-git`, `geoip-lite`, `nanoid`
   (+ whatever the re-survey adds). express/ws/mongodb/passport stay
   banned even there — driver-level dependencies live in `backend/`.
   Notably the survey found **zero** direct mongodb/ws/express imports
   anywhere in mud already.

## The lay of the land (2026-07-30 survey)

Non-test files in `src/mud/` with out-of-tree imports, bucketed:

| Bucket | Count | Disposition under the rule |
|---|---|---|
| `fileURLToPath` from `url` | 91 (82 in `api/` — the `LOGIC_CLASS_FILE` hot-reload idiom) | api-tier legal; 9 outside die with the folds below |
| `@saxonberg/types` | 91 (~10 value-imports) | legal (decision 2) |
| `../backend/` escapes | 37 — ~30 are `Collections`/`PersistenceManager` from ledger-shaped lib classes; rest: `Application` (Avatar, Login), `ConnectionManager`, the three relay readers, `ConsoleTap`, one type-only | the worklist's bulk |
| built-ins/npm in `obj/api/*Logic` | 8 (Command, Pack, Quantity, SourceTree, Studio, Git, Connection Logic) | api-tier legal (decision 1) |
| built-ins/npm elsewhere | 9 (see worklist items 3–4) | fold or registry |

Tests add `vitest` (~770 imports) + `fast-check` — blanket-exempt.

## The refactor worklist, by leverage

1. **Move the `Collections` enum into mud** (`lib/persistence/` — pure
   vocabulary, a recognized module category) and have `backend/`
   import it from there. Kills ~30 of 37 backend escapes in one
   mechanical sweep. The residual `PersistenceManager` value-imports
   (`lib/persistence/Document.ts`, `lib/stuff/Template.ts`) route
   through the existing `PersistApi` — its surface may need a method
   or two.
2. **Avatar/Login → `Application`** (2 files): route through
   ConnectionApi/ConnectionLogic or a capture-at-use DI seam (already
   a recognized seam category in the export-discipline registry).
3. **Fold the seed-YAML readers** — `EnrollController`,
   `SoulController`, `DormThemes`, `HelpCatalogue` are all the same
   shape ("read a YAML file adjacent to me"); one Api method
   (TemplateApi/PackApi territory) retires all four.
   `lib/command/CommandDefinition`'s fs/yaml/ajv folds into
   CommandLogic, which already imports all three.
4. **The three genuinely-capability lib files** —
   `lib/persistence/EncryptedStringMarshaller` (crypto),
   `lib/prose/Prose` (liquidjs), `lib/script/EvalScript` (node:vm).
   Their *job* is the capability. Either move the capability half into
   their Logic singletons, or start them in the per-file registry with
   a reason each and refactor opportunistically. **Start with the
   registry.**
5. **Optional polish:** centralize the `fileURLToPath(new URL(...))`
   hot-reload idiom into a `HotReloadApi` helper taking
   `import.meta.url` — kills the `url` import from ~80 `api/` files.
   Not required (api is exempt); pure boilerplate reduction.

Net: **~40 files, ~30 of them one mechanical sweep.** One small MR.

## Enforcement

A **script**, `scripts/check-mud-imports.ts`, wired as
`pnpm lint:imports`, CI-gating — joining the lint family
(`lint:gates`, `lint:module-scope`; same precedent: ESLint 8's legacy
config can't host a local rule, and `no-restricted-imports` can't
express "relative import escaping a subtree" without resolver plugins).

- Implements the tier matrix + the per-file exception registry (entries
  carry a reason string — the export-discipline registry shape).
- Distinguishes `import type` / type-only specifiers from value
  imports (decision 2 requires it).
- **Must also catch dynamic `import()`, `createRequire`, and bare
  `require(`** — PackLogic and hot-reload use these legitimately
  (exempt tier), but a soundness hole there makes the rule decorative.
- Ships with a **report mode** (violations grouped by bucket, no exit
  code) — the first build step is running it to refresh this slate's
  counts.

## Build sequencing

1. The script in report mode (validates the survey, becomes the tool).
2. Worklist 1 (Collections sweep) — mechanical, biggest bite.
3. Worklist 2–3 (seams + YAML folds).
4. Registry entries for worklist 4; flip the script to CI-gating.
5. Optional worklist 5; document the rule in
   [architecture.md](../../architecture.md) (alongside the
   module-scope rule) and add the antipattern row.

## Open questions

- Should the Api tier's *built-in* set also be enumerated (fs, path,
  url, crypto, module, async_hooks, vm, child_process today) rather
  than "any built-in"? Cheap to do in the script; slightly noisier to
  maintain.
- Tests: keep unrestricted, or ban `../backend/` value-imports there
  too (10 files today)? Defer until the rule has bedded in.
- Does `seeds/` (YAML-adjacent TS, if any appears) ride the mudlib
  tier? Assume yes until a case argues otherwise.
