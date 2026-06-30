# Wizard authority & the code-trust lockdown — requirements

This build formalizes a two-tier authoring status and closes the
**content→code bypass** that currently undermines it. The premise:
in a Node + proxy-security stack, anyone who can author a line of
TypeScript can subvert the entire security apparatus — so that power
must be a *trusted* capability, held by **wizards** and no one else.
Everyone else who authors is a **protowizard**: they may edit content
templates, YAML-via-content, and database documents, but they may not
write code — *and they may not author content that names code to run.*
That second clause is the load-bearing one: a content template is data,
but several of its fields resolve to executable code, so "can write
content" silently grants "can run code" unless those fields are gated.

The wizard capability already exists in the engine as the
`'developers'` group / `AccessApi.isDeveloper` "TS-escape axis"; this
build renames it to `wizards` / `isWizard`, closes the bypass, and adds
the promotion chain (`archwizards` confer wizard status; the operator
manages archwizards; a Prime Minister plugs in above them later).

Seeded by [access-slate](../slates/tails/access-slate.md) (the tier
ladder + the `forceX`/wizard checks) and
[scoped-authoring-slate](../slates/builds/scoped-authoring-slate.md)
(the personal→granted→wizard ladder, the vetted-catalog model, "abuse
unexpressible not policed"). Load-bearing subsystem docs:
[access.md](../subsystems/access.md) (the five axes, the four
bootstrap groups, the documented class-allowlist gap),
[templates.md](../subsystems/templates.md) /
[persistence.md](../subsystems/persistence.md) (the clone pipeline +
Hydrator that turn `data.*` into running code),
[provenance.md](../subsystems/provenance.md) (the single
`TemplateApi.saveTemplate` chokepoint), and
[behavior.md](../subsystems/behavior.md) (brain-path resolution).

## Goals

- **One code-trust axis.** All TypeScript-authoring/execution doors
  (`eval`, `reload`, source `.ts` writes via `write -s`/`mkdir -s`/
  `rm -s`/`cp`/`mv`, and CMS source-file read/write) gate on a single
  `wizards` capability — the renamed `developers` axis. A non-wizard
  can reach none of them.
- **Protowizard is the complement, unstored.** "May author content but
  not code" is *not* a new flag — it is exactly "has content-write
  access (`can(…,'write',…)`) and is not a wizard." Nothing new
  persists for it.
- **No non-wizard content write can cause non-wizard-vetted code to
  load or run.** The direct code-naming fields (`class`,
  `hydratorClass`, `behaviors[].brain`) are wizard-only-writable,
  enforced at the universal `TemplateApi.saveTemplate` chokepoint; the
  transitive template-reference fields are thereby closed by
  construction.
- **Wizard status is conferred, not self-granted.** `archwizards` may
  grant/revoke wizard status through a gated verb; archwizard
  membership is operator/root-managed (env seed + the `group` verb).
- **The bypass closure cannot silently regress.** A drift-guard fails
  if a new template/document field that resolves to a module export is
  added without joining the gated set.

## Non-goals

- **The Prime Minister / governance office.** The chain stops at
  `operator/root → archwizards → wizards`. The constitution's Article V
  PM (the executive who "programs the machine") plugs in above
  `archwizards` when governance is built; not modeled here. See
  [draft-constitution.md](../governance/draft-constitution.md) Art. V.
- **The v2 wizard-curated allowlist.** v1 makes the direct code-naming
  fields *wizard-only-writable* (a protowizard cannot set them at all;
  they author by cloning/customizing wizard-made templates). The
  relaxation that lets protowizards *pick among* a wizard-vetted set of
  safe classes/brains — the scoped-authoring "vetted catalog" — is a
  later build.
- **The scoped-authoring GUI, decor catalog, quotas, and per-field
  value-validators** for cosmetic fields (`description`/`name`
  moderation, etc.). That is the
  [scoped-authoring-slate](../slates/builds/scoped-authoring-slate.md)
  build; this build only ships the *code-trust* half of the gate.
- **Audit-sink wiring** for denials (access-slate Pillar 5 / MudlogApi).
  Denials surface as the existing `controller-rejected` envelope notes;
  nothing more.
- **Runtime (clone/hydrate-time) deny.** Enforcement is write-time at
  the save chokepoint, not a refusal deep in the clone pipeline.
- **Per-action grant filtering** on the access `can()` core.

## Surface decisions

### Wizard = the renamed `developers` axis (group, not Avatar flag)

The existing `'developers'` managed group / `AccessApi.isDeveloper`
*is* the TS-escape axis and already gates every code door. Rename it:
group `'developers'` → `'wizards'`, `isDeveloper` → `isWizard`,
validator `requiresDeveloper` → `requiresWizard`, env seed →
`WIZARD_PLAYER_IDS` (mirroring `STREAMER_PLAYER_IDS`). Membership *is*
the player-level flag; the group form reuses the existing `group`
verbs, the lazy member cache + `onChange` invalidation, and the
bootstrap-seed pattern. No new persistent field on Avatar/User.

### Protowizard is unstored — the complement

There is no `protowizard` group or flag. A protowizard is any actor
with content-write access (lounge / a zone `ownerGroup` / `core`) who
is not in `wizards`. "Can edit content, can't write code" falls out of
the existing content-write gate (`can(…,'write',…)`, no `isWizard`)
plus the new code-field gate below.

### The lockdown gates 3 direct fields; the rest close transitively

The audited code-naming fields split into **direct** (name a module/
class/export) and **transitive** (name another template, which then
resolves *its* `class`). The gate applies wizard-only to the direct
set at save time:

- `class`
- `hydratorClass`
- `behaviors[].brain`

(Command-YAML `validators` is also direct, but command YAML is a
source-tree file already behind the wizard source gate — confirm no
content/document path can set a validator/controller module path.)

The transitive set — `adornments[].template`, `exits[].destination`,
`exits[].door`, `populates[]`, `container`, `warren`, `startLocation`,
`routes[].to`/`.warren` — gets **no per-field gate**. They are closed
by construction: every template a transitive field can resolve to must
itself have passed the `class` gate, so a reference can only ever
instantiate a wizard-vetted-or-protowizard-safe class. This rests on
the class gate being *universal* across every template-write path
(see Constraints).

### v1 = wizard-only-writable on the direct fields

A protowizard write that sets or changes `class`/`hydratorClass`/
`behaviors[].brain` is rejected. Protowizards author by cloning/
customizing wizard-authored templates (which already carry these
fields) and editing cosmetic `data`. They never type a class or brain
path freehand. (This is the catalog model; the allowlist relaxation is
the deferred v2.)

### Promotion chain: operator → archwizards → wizards; PM deferred

`archwizards` is a new bootstrap-seeded managed group
(`ARCHWIZARD_PLAYER_IDS`). Its members may confer/revoke wizard status.
Archwizard membership itself is operator/root-managed for now (env seed
+ the `group` verb), with operator/root as the unremovable floor. The
Prime Minister office that will later own archwizard membership is out
of scope.

### Grant surface = a dedicated `wizard grant/revoke` verb

Wizard conferral rides a dedicated verb (`wizard grant <player>` /
`wizard revoke <player>`) gated on archwizard membership, toggling
`wizards` membership — rather than overloading `group add wizards`.
Dedicated is clearer and gives the conferral act its own auditable
surface. (If the planner finds the `group`-admin reuse strictly
simpler with equal clarity, that's an acceptable collapse, but the
verb surface is the intended shape.)

## Constraints

- **The chokepoint is `TemplateApi.saveTemplate`, not `CmsLogic`.** Per
  [provenance.md](../subsystems/provenance.md) both the in-world
  `write -c` verb and the REST CMS funnel through `saveTemplate`.
  Gating only in `CmsLogic` would leave the in-world `write -c` path
  open. The planner must confirm *every* template-write path funnels
  through the gated chokepoint; any path that bypasses it is a hole to
  close in this build.
- **Actor from execution context, never caller-supplied.** The wizard
  check at the gate derives the acting author from
  `ExecutionContextApi` (`getActingAuthor` / `getCurrentCommandGiver`),
  never a passed-in principal. See project rule
  *gated-api-actor-from-context*. The REST CMS path uses its existing
  session→`runRoot` attribution bridge.
- **Default-deny + a drift-guard on the gated field set.** The set of
  direct code-naming fields must be defined so that a *newly added*
  field resolving a module export (`resolveExport` /
  `resolveExportSync` / `loadClassByPath` / dynamic import) cannot
  silently escape the gate — via a structural rule or an enumerated
  list backed by a failing test/lint. The audit's residual risk
  (a custom Hydrator subclass adding an instruction field) is exactly
  what this guard catches. (Structural-vs-enumerated is a plan
  decision; the *guarantee* is the requirement.)
- **Insert-only seeder migration.** The `SeederManager` is insert-only;
  renaming `developers`→`wizards` by changing the seed name mints a
  fresh empty group and orphans the old one. Existing developer-group
  members must not be silently stranded — a one-time migration
  (rename the doc, or re-seed members) is in scope.
- **No new module categories.** The grant verb is an ordinary
  controller + YAML pair (`mud/cmd/...` + `obj/command/.../...`);
  `archwizards` is bootstrap-seeded in `AccessRegistry.postRegister`
  exactly like `streamers`. The wizard check stays on `AccessApi` /
  `AccessRegistry`. See
  [CLAUDE.md](../../CLAUDE.md) Module Categories.
- **Vocabulary reconciliation.** `docs/story-bible.md` currently uses
  "wizard" for content authors/world-builders (which under this build's
  vocabulary are *protowizards*). The doc sweep reconciles the terms
  (wizard = code-trust; protowizard = content).

## Acceptance criteria

- `isWizard` replaces `isDeveloper` across all call sites (~14); `eval`,
  `reload`, source-tree writes, and CMS source read/write all gate on
  `wizards`; a non-wizard is denied each (tested).
- A non-wizard template write (both in-world `write -c` **and** the CMS
  content path) that sets or changes `class`, `hydratorClass`, or any
  `behaviors[].brain` is **rejected** at `saveTemplate`; the same write
  by a wizard succeeds (tested on both paths).
- An authorized protowizard editing only cosmetic/non-code fields
  (`description`, `name`, ordinary `data` values) of a content template
  in their slice still **succeeds**.
- The transitive closure holds: a test demonstrates that a protowizard
  cannot reach code execution through a transitive reference field
  (e.g. an `adornments`/`exits`/`populates` entry pointing at a
  template with a dangerous `class`) because that dangerous-class
  template cannot have been protowizard-authored.
- The drift-guard fails (test or lint) when a new module-resolving
  field is introduced without joining the gated set.
- `archwizards` is bootstrap-seeded (env `ARCHWIZARD_PLAYER_IDS`);
  `wizard grant/revoke <player>` succeeds only for an archwizard giver
  and toggles `wizards` membership; a non-archwizard is denied (tested).
- The migration leaves existing developer-group members with wizard
  access (tested or scripted + noted).
- A subsystem doc records the wizard/protowizard partition, the
  code-trust axis, the code-naming-field gate (direct + transitive
  closure), and the `archwizards` chain — folded into
  [access.md](../subsystems/access.md) (extending its existing axes +
  retiring the "class-allowlist gap" note) or a new sibling doc, with a
  `CLAUDE.md` doc-map entry if new.
- `story-bible.md` vocabulary reconciled.

## Cross-references

- **Seeding slates** —
  [access-slate](../slates/tails/access-slate.md),
  [scoped-authoring-slate](../slates/builds/scoped-authoring-slate.md)
- **Subsystem docs** — [access.md](../subsystems/access.md),
  [templates.md](../subsystems/templates.md),
  [persistence.md](../subsystems/persistence.md),
  [provenance.md](../subsystems/provenance.md),
  [behavior.md](../subsystems/behavior.md),
  [call-security.md](../subsystems/call-security.md),
  [grouping.md](../subsystems/grouping.md)
- **Governance** —
  [draft-constitution.md](../governance/draft-constitution.md) Art. V
  (the deferred PM seam)
- **Project rules** — `gated-api-actor-from-context`,
  Module Categories ([CLAUDE.md](../../CLAUDE.md))
