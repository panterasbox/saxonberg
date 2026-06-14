# Excluded-Api unblock slate (continuation / handoff)

Working slate capturing the next piece of work AND the resume state, so a
context compact/clear loses nothing. Captured 2026-06-14 mid-session.

## Current status (all committed/pushed — safe)

- **MR !63** `feature/surface-architecture` → `master` (panterasbox/saxonberg),
  on the **build-1 worktree** (`/home/bobalu/play/saxonberg/build-1`).
- The **surface-architecture refactor** is complete: P0 (`StuffApi.singletonSync`)
  → DP.1 (Scene/Prose/PathTrie → lib) → P1 pilot → P2 tooling (@hook tag,
  three-tier `author-surface.json` projection, lint family) → P3 sweep
  (23 Apis converted to `/obj/api/<feature>` logic singletons; `schedule`
  partial; 6 bootstrap-special + ~21 cycle-bound excluded) → Docs landing
  → Verification. **Full suite 4128 passed, tsc + eslint + `lint:gates` clean.**
- The **lib/ export-purity** follow-up is complete (9 commits, in MR !63):
  zero non-exempt free-function exports remain in `lib/`. Exempt: mixins,
  decorators, `api/` test-only `eslint-disable` exports, the
  `setClientStateUpdatePush` DI seam, and 3 test-seam helpers
  (`detectEmotePrefix`/`stripEmotePrefix`/`senseStripAugmenter`).
- Uncommitted in the working tree: the surface-architecture **doc-landing
  edits were already committed** (`c360cee9`). The only uncommitted file is
  THIS slate. (Docs are committed by the build owner at finalize; this slate
  is future-work capture.)

## The work: unblock the cycle-bound excluded Apis

### The finding (verified)
The ~21 cycle-bound excluded Apis are NOT 21 intrinsic problems. Their faces
crash at boot (`class XLogic extends Idea` runs while `Idea` is still
`undefined`) only because they're **value-imported during `lib/stuff/Stuff.ts`
init**, via exactly **three** bootstrap value-edges:

| edge | pulls onto init path | nature |
|---|---|---|
| **`api/shadow.ts → api/command.ts`** (keystone) | **command + its whole closure** (~15: array, command-line, group, message, mql, prompt, prose, shell, mml, mudlog, recognition, belief, containment, quantity) | 2 runtime calls `CommandApi.applyShadowDelta(host, shadow, 'attach'/'detach')` in `ShadowApi.attach`/`detach` — a layering inversion (shadow → up → command) |
| `lib/stuff/Stuff.ts → api/grammar.ts` | grammar | 1 presentation-time `GrammarApi.pluralize(this, base)` (Stuff.ts:184) |
| `api/stuff.ts → api/event.ts` | event | `EventApi.emit(StuffCreated/Destructed)` in StuffApi register/destruct |

The bootstrap-special 6 (`security`, `module`, `proxy`, `execution-context`,
`stuff`, `mixin`) are NOT in scope — they ARE the substrate every Idea is
built from (chicken-and-egg). They stay static forever.

Per-Api internal carve-outs do NOT help: the crash is the *face file* being
init-imported; any `import { XLogic }` from the face crashes regardless of how
the Api's internals are split. **The lever is severing the upstream edge**,
after which the freed Apis convert WHOLE via the existing recipe.

### Mechanism decision: DI seam, NOT event-driven (SETTLED)
`EventApi.emit` dispatches to subscribers via **`queueMicrotask` (async)**
(`api/event.ts:~340`). So an event-driven `StuffShadowChanged` decoupling
would make the affordance-surface update ASYNC, breaking the guarantee that a
command issued right after `ShadowApi.attach` sees the updated affordances.
**Therefore: late-binding DI seam** (mirror `SecurityApi._registerShadowApi`):
- `ShadowApi` exposes `_registerCommandShadowHook(fn)`; drop
  `import { CommandApi } from './command'`.
- `CommandApi` registers `applyShadowDelta` via that hook at module-load;
  `ShadowApi.attach`/`detach` call the injected fn **synchronously**.
- `command.ts` must be **eager-imported at boot (after Idea)** so the hook
  registers — and in the test harness too (else affordance tests skip the
  update). Check `src/mud/bootstrap.ts` + `src/mud/test-setup-registries.ts`.
- This breaks the static `shadow → command` edge while keeping behavior
  identical. (Keeps the logical coupling; doesn't fully fix the layering, but
  the async-emit finding forces the sync DI approach.)
- `applyShadowDeltaImpl` is at `api/command.ts:3264`; the public wrapper
  `CommandApi.applyShadowDelta` at `api/command.ts:1297`.

`Stuff → grammar` and `stuff → event`: same injection pattern (a registered
pluralizer / a registered emit reference), or lazy — each frees one Api.

### Phasing
- **Phase A — sever the keystone** (`shadow → command` DI seam + eager-import
  command at boot & in tests). Re-run the cycle BFS (below) to confirm command
  + its ~15-Api closure are off the init path. Self-contained structural fix;
  verify full suite green. **STOP/checkpoint here** (recommended) before the sweep.
- **Phase B — convert the freed Apis** to logic singletons via the locked
  recipe. Includes the riskiest central files: `command` (173 importers),
  `mql`, `mml`, `message`, `containment`. Plus array, group, prompt, prose,
  shell, mudlog, recognition, belief, command-line, quantity.
- **Phase C — sever `Stuff → grammar` + `stuff → event`**, convert grammar + event.

### PENDING DECISIONS (need build owner — asked, not yet answered)
1. **Branch/MR placement.** Recommended: NEW branch off `feature/surface-architecture`
   → new MR stacked on !63 (keeps !63 reviewable; clean separate concern).
   Alternative: extend !63.
2. **How far in one go.** Recommended: do Phase A + verify the cycle breaks,
   STOP for confirmation before the Phase B sweep (since B touches the riskiest
   files). Alternative: push straight A→B→C.

## Recipe to resume the conversions (the locked P3 recipe + corrections)

For Api `foo` / class `FooApi`, convert to a thin forwarding shell over a
logic singleton (exemplars: `api/material.ts` + `obj/api/MaterialLogic.ts`;
guts variant `obj/api/LocomotionLogic.ts`):
- New `obj/api/FooLogic.ts`: `export class FooLogic extends Idea`, NO
  `PostRegistrationMixin`. Former public statics → public INSTANCE methods,
  byte-identical signatures (async stays async).
- **Gate PER METHOD** (never class-level — class-level also gates inherited
  Stuff/Idea framework methods like `getTemplatePath` that the framework calls
  during `register`, denying them): `@CallSecurity(FooApiCallers)`,
  `const FooApiCallers = SecurityPolicies.FromModule('mud/api/foo#FooApi')`.
- **Intra-singleton self-calls** (`this.x()` to another public method) are
  DENIED under a bare `FromModule` gate → either extract a module-private FREE
  FUNCTION both call, or gate `AnyOf(FromModule('mud/api/foo#FooApi'), SelfOnly)`.
- Former `static #` helpers → module-private free functions (NOT `#` instance
  methods — they throw through the call-security proxy). Constants → placed.
- **`@internal` doc comment ON the `export class` line**, NOT the file head
  (a leading file comment becomes TypeDoc's module comment → fails to exclude).
- Name-collision guard: if a former static collides with an inherited
  Stuff/Idea method (e.g. `isDestroyed`), rename the logic-internal method,
  keep the facade name.
- `api/foo.ts` forwarding shell: `logic()` helper using `StuffApi.singletonSync(
  '/obj/api/foo', () => new ((HotReloadApi.getCurrentExport(FILE,'FooLogic')
  as typeof FooLogic | null) ?? FooLogic)())`; byte-identical static forwarders;
  `SecurityApi.decorateApiClass(FooApi)`. Author-facing types re-exported
  type-only from the face; DP.2: relocate any non-Api `export class` to lib.
- **`ApiOnly` is already widened** (`lib/security/SecurityPolicies.ts`) to
  `FromModule('mud/api/**') OR FromTemplate('/obj/api/**')`, so logic
  singletons keep Api-tier privileges for ApiOnly-gated downstream calls.
- Two-singleton (registry/state-backed) Apis: re-point the backing
  Stuff/Registry gate `AnyOf(FromModule(api), FromTemplate('/obj/api/foo'))`;
  registry-class registration → module-level slot in the Logic file. (See
  the worldclock/scheduler/mql-subscription/soul commits for exemplars.)
- Per Api: add a deny test (mirror `api/__tests__/material.test.ts`'s
  "singleton encapsulation" describe), commit, keep suite + tsc + eslint green.

### Wave-D special cases (Phase B)
- `mql`/`mml` have **sealed subdirs** (`api/mql/`, `api/mml/`) — only the
  parent facade's statics migrate; the subdir stays the private impl package
  (sealed-subdir ESLint rule). `message` exports `Scene` (already in lib) —
  only `MessageApi` statics convert. `command` is huge — isolated commits,
  full suite each.

## How to verify the cycle is broken (the BFS)

Run from `packages/server` (value-only import BFS from Stuff.ts; type imports
stripped). After Phase A, command + its closure should NOT appear:

```bash
node -e '
const fs=require("fs"), path=require("path");
const ROOT=process.cwd()+"/src/mud";
function listTs(d,o){for(const e of fs.readdirSync(d)){const p=path.join(d,e),s=fs.statSync(p);if(s.isDirectory()){if(e==="__tests__")continue;listTs(p,o);}else if(e.endsWith(".ts")&&!e.endsWith(".test.ts")&&!e.endsWith(".d.ts"))o.push(p);}}
const files=[];listTs(ROOT,files);
const ex=(p)=>{for(const c of[p+".ts",p+".tsx",path.join(p,"index.ts")])if(fs.existsSync(c))return fs.realpathSync(c);return null;};
function deps(f){let s=fs.readFileSync(f,"utf8");s=s.replace(/\b(?:import|export)\s+type\s*\{[^}]*\}\s*from\s*['\''"][^'\''"]+['\''"]\s*;?/g,"").replace(/\bimport\s+type\s+(?:\*\s+as\s+)?\w+\s+from\s*['\''"][^'\''"]+['\''"]\s*;?/g,"");
const d=new Set();const RE=/\b(?:import|export)\b[^;]*?\bfrom\s*['\''"]([^'\''"]+)['\''"]/g;let m;while((m=RE.exec(s))){const sp=m[1];if(!sp.startsWith("."))continue;const r=ex(path.resolve(path.dirname(f),sp));if(r)d.add(r);}return[...d];}
const g=new Map();for(const f of files)g.set(fs.realpathSync(f),deps(f));
const start=fs.realpathSync(path.join(ROOT,"lib/stuff/Stuff.ts"));const seen=new Set([start]);const q=[start];
while(q.length){const n=q.shift();for(const x of(g.get(n)||[]))if(!seen.has(x)){seen.add(x);q.push(x);}}
const api=[...seen].filter(p=>/\/mud\/api\/[^/]+\.ts$/.test(p)).map(p=>path.basename(p,".ts")).sort();
console.log("cycle-bound (value-reachable from Stuff.ts):\n  "+api.join(" "));'
```

Verification battery each step: `pnpm exec tsc --noEmit`; `pnpm vitest run`
(full); `pnpm exec tsx scripts/check-gate-strings.ts` (exit 0); `pnpm lint`
(0 errors). `pnpm exec typedoc` + `pnpm exec tsx scripts/project-author-surface.ts`
for the doc projection.

## Cross-refs
- Plan/requirements (will be retired at finalize): `docs/plans/surface-architecture-plan.md`,
  `docs/requirements/surface-architecture-requirements.md`.
- Subsystem docs updated this build: `call-security.md`, `hot-reload.md`,
  `architecture.md`, `antipatterns.md`, `CLAUDE.md`.
- This is the Thread-8 "Api boundaries are provisional" reorg, made concrete:
  the productive reorg is cutting a few cross-layer dependency edges
  (chiefly `shadow → command`), not reshuffling the Api assortment.
