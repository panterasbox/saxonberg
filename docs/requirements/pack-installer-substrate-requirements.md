# Pack installer substrate — requirements

The first build cycle of the content-pack program (waves 0 + 1 of the
ordering in [content-packs-slate](../slates/builds/content-packs-slate.md)
addendum 24): rename the template collection to what it is, give the
installer a per-deployment **install record** so reconciliation becomes
**three-way** (pack-changed vs operator-changed becomes computable),
grow the **ops resolution surface** (dry-run, diff, resolve, pin,
export), and prove the whole machine by converting **newbie-wilds**
into the fourth content pack. The unit registry and per-pack roster
live in [content-pack-units](../slates/builds/content-pack-units.md);
the shipped substrate this extends is
[content-packs.md](../subsystems/content-packs.md).

## Goals

- The `domain` collection is renamed **`content`** everywhere (enum,
  driver policies, docs), with a boot-time `renameCollection` migration
  that is idempotent and safe on fresh, current, and pre-rename DBs.
- Every pack install/sync writes a **per-pack install record**
  (`pack_installs`): pack id, version, principal, status
  (applied/failed), a diagnostic copy of render-time parameters, and a
  **per-row baseline** — `{path → {kind, hash}}` over the canonical
  serialization of each row *as written*.
- Reconcile is **three-way** for every shipped kind (domain templates,
  name-banks; quantity is stateless RAM and exempt): file-changed +
  DB-unchanged applies silently; DB-diverged + file-unchanged keeps the
  DB; **both-changed surfaces as a conflict and never merges**.
- **Conflicts are pull, not interrupt**: an unresolved conflict leaves
  the DB row as-is, lands a diagnostic, and is listed by `pack status`.
  Install/sync never blocks on one.
- The **ops surface** exists as `pack` subcommands: `status` (per-pack
  state, open conflicts, pins), `install --dry-run` (full reconcile
  report, zero writes), `diff <id> [path]` (three bodies: baseline /
  DB / pack), `resolve <id> <path>` with exactly three modes
  (`--take-pack`, `--keep --pin`, `--export`), and `pin`/`unpin`.
- **Pins are loud**: a pinned row is skipped by every future reconcile
  and *reported* every time (`N rows pinned, skipped`), and recorded in
  the install record.
- **`--export`** writes the DB version of the artifact back to the
  pack's source file in the workspace (the git round-trip), leaving the
  conflict open until a later sync observes file == DB.
- A **flat-key uniqueness check** runs across the install set before
  any write (name-bank keys today; the mechanism takes a key-extractor
  per kind so later kinds reuse it). A collision aborts the pack's
  install, naming both claimants.
- **A managed group's owner can be an OFFICE.** Group ownership
  resolves through `holdsOffice` on read (absence of a handoff row =
  the founder default) — never a stamped player id, never an
  `isFounder` check. When the seat changes hands, every committee it
  owns follows.
- The **`pack-installers` committee** exists: a managed group, zero
  members at birth (structure), owned by the **Prime Minister's
  office**. The `pack` verb is gated on **membership in that
  committee** — `isWizard` appears nowhere in the install path.
- **`packages/content/newbie-wilds`** exists as the fourth pack: the 21
  `seeds/domain/newbie-wilds/**` rows move to it (paths unchanged), the
  seed files are deleted, and on an existing dev DB the rows are
  **adopted** (stamped in place, no wipe, no data migration) with the
  first-apply baseline normalization logged loudly.

## Non-goals

- **New contribution kinds** — documents, settings, subjects,
  command-view, wiki CAS: wave 2a/2b.
- **Pack zero, the boot manifest, `requires:`, staffing-at-install,
  seeder retirement** (all ten seeders keep running): wave 3.
- **Path renames** (`/domain/`→`/world/`, `/trade/`), the hearthworks
  re-cut, trade packs, archetypes: wave 4.
- **Staging** (stage-in-game → apply-at-boot) and **parameters** — the
  record carries their slots (`status: staged`, `parameters`), but
  nothing writes them this cycle; all packs stay first-party and
  boot-installed.
- **Maintainers-first conflict routing** — conflicts go to the
  diagnostics store + `pack status` only; routing to a pack's
  maintainers group needs wave 3's `requires:`.
- **Media, the repo split, third-party namespacing, uninstall.**

## Surface decisions

### The record is one document per pack, in its own collection

`pack_installs`, keyed by pack id. One record per pack (reconcile is a
per-pack batch; nothing queries baselines across packs). Its own
collection deliberately: the installer's ledger must live where no
contribution kind can ever reach (the `parcels`-not-in-`content`
reasoning; slate A17.1). Registered in `Collections.ts` +
`COLLECTION_POLICIES`.

### Hashes are of the rendered artifact

The baseline hash covers the canonical serialization of what was
actually written (for a template row: `class`/`hydratorClass`/`data`;
for a name-bank: the bank body). `baseline == current` means
untouched-since-install regardless of how the file got there. Hash
algorithm and canonicalization are the planner's choice; stability
across boots is the requirement.

### Adoption baseline normalizes once, loudly

First apply against a pre-record DB writes the baseline as-of what it
just wrote — pre-existing divergence is silently normalized exactly
once (the migration bridge). Requirement: one unmissable log line per
adopted pack stating the row count and that this is the one-time
normalization.

### `--keep` without `--pin` does not exist

Keeping the DB without claiming the row re-fires the same conflict on
every future update. Keeping means claiming: the row pins (the
operator choosing the gentler policy — the legitimate party), and pins
are surfaced on every reconcile so they cannot rot.

### Offices are heads; committees are hands (the recurring model)

Wizardness gates TypeScript only — so the `pack` verb's
`requiresWizard` dies this cycle, replaced by the governance model
that answers every future permission surface the same way:

> **Law points at OFFICES → offices own COMMITTEES → committees hold
> permissions → members are appointed by whoever holds the owning
> seat.**

An office is a single accountable seat (founder-default per
governance.md); a committee is a managed group doing work. The law
never points at a committee; permissions never accumulate on an
office. The bridge is office-owned groups (above). For pack install:
the `pack-installers` committee, owned by the PM (executive —
administering platform content, the CB-Governor-in-the-executive
reasoning). No new office is minted: the PM's portfolio covers it
until the polity charters a Minister of Operations and transfers the
committee — an ordinary in-world act, not a build. Day one the founder
holds PM by default, appoints members via the ordinary `group add`,
and installs; the check is always `holdsOffice`-mediated membership,
never founder identity. (`pack-installers` is the first
platform-level instance of the same structure/authority machinery
wave 3 builds for pack maintainer groups.)

### Quantity is exempt from the record

The quantity kind is loaded into RAM from the file each boot — cache
degree zero, no DB row to diverge, nothing to baseline. The record's
`sideEffects` notes that the kind ran; that is all.

### `diff` renders three bodies, wiki-style

Baseline / yours (DB) / theirs (pack), presented in the same shape the
wiki's CAS conflict uses — same doctrine (no machine merge), same
future muscle memory. Rendering is plain text through the normal
message surface; no client work.

## Constraints

- **Layering**: all new logic lives in `PackLogic`
  (`/obj/api/pack`, module-private functions, `FromModule` gates);
  `PackApi` stays the thin decorated shell. No new Api, no new module
  categories, no free-floating helpers.
- **Writes ride the `PersistApi` chokepoint** as today. The
  `saveTemplate` code-field-gate bypass is a known, accepted gap while
  packs are first-party (slate Part 8 #1); this cycle must not widen
  it (no new write path that skips the chokepoint).
- **SeederManager coexistence is preserved**: the installer touches
  only stamped/adopted rows for paths its packs ship; seeders stay
  insert-only on the shrunken `seeds/` tree. Disjoint by construction,
  including after the newbie-wilds move (its seed files are gone, so
  the seeder cannot re-insert them).
- **Rename mechanics**: the `content` rename must cover
  `Collections.ts`, `PersistenceManager` policies, and every string
  literal; the migration runs before any collection access, is a no-op
  when `content` already exists, and never runs `renameCollection`
  over a live `content` collection. Grep-clean is the bar: no
  remaining `'domain'` collection literals outside the migration and
  historical docs.
- **Test bootstrap**: anything touching the wired runtime imports
  `test-bootstrap`; `pnpm lint:test-bootstrap` stays green. The full
  suite runs once per the testing doctrine — no re-runs without a
  source change.
- **No `Date.now()`-style drift in hashing** — baselines must be
  reproducible from content alone.
- **Conflict diagnostics** use the existing `DiagnosticApi` store —
  no new notification machinery.
- **Wizardness gates TypeScript only** — no new or surviving
  `isWizard`/`requiresWizard` on any install-path verb or Api method
  this cycle introduces or touches.

## Acceptance criteria

- Fresh DB: boot installs all four packs, `pack_installs` holds four
  applied records with full baselines; `pack status` lists them.
- Existing dev DB (pre-rename, pre-record): one boot performs the
  collection rename + adopts newbie-wilds + writes baselines, with the
  one-time normalization line logged; a second boot is a no-op.
- Three-way behavior is test-covered per cell: silent update
  (file-changed/DB-clean), keep (DB-diverged/file-clean), conflict
  surfaced (both), nothing (neither) — for both the domain kind and
  name-banks.
- A surfaced conflict: appears in `pack status` and the diagnostics
  store; `pack diff` shows three bodies; each `resolve` mode
  test-covered — `--take-pack` updates row + baseline; `--keep --pin`
  records the pin and the next sync reports and skips it; `--export`
  rewrites the source file and the conflict clears on the next sync.
- `pack install --dry-run` on a modified pack reports the exact change
  set and writes nothing (DB hash-identical before/after).
- The appointment ceremony is driven end-to-end: the founder (as
  default PM) `group add`s a member into `pack-installers`; that
  member runs `pack` verbs successfully; a non-member is refused with
  a diegetic decline; a wizard who is NOT a member is refused
  (test-covered — the axis is membership, never wizardness); handing
  the PM office to another player transfers appointment power with no
  data migration.
- Flat-key collision (two name-banks, one key) aborts that pack's
  install before any write, naming pack, key, and both claimants;
  test-covered.
- `pnpm lint:gates`, `lint:instanceable`, `lint:imports`,
  `lint:module-scope` green; full suite green (one run).
- `docs/subsystems/content-packs.md` updated: the record, the
  three-way policy, the ops verbs, the newbie-wilds pack, the
  `content` collection name. CLAUDE.md's collection list line updated
  to `content` (sweep-time if contended).
- Newbie-wilds is walkable in a driven session after install (the
  crossroads reachable, NPCs present) — verify by driving, not by
  suite.

## Cross-references

- [content-packs-slate](../slates/builds/content-packs-slate.md) —
  addenda A10 (installer model), A17 (record + collisions), A22
  (access; the wizard-gate debt), A24 (wave ordering)
- [content-pack-units](../slates/builds/content-pack-units.md) — the
  unit registry + strategy interface
- [content-packs.md](../subsystems/content-packs.md) — the shipped
  substrate this extends
- [diagnostics.md](../subsystems/diagnostics.md) — conflict surfacing
- [persistence.md](../subsystems/persistence.md) — the chokepoint
- [governance.md](../subsystems/governance.md) — the Office substrate
  the committee model rides
- [grouping.md](../subsystems/grouping.md) — managed groups
