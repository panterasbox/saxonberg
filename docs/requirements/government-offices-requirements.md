# Government offices — requirements

The first substrate of the polity's structure: the **seats of
government** — the specific, apparatus-defined offices held by a named
officeholder, as distinct from the general-purpose **groups** (ad-hoc
player collections) and from the derived **chambers** (populations that
fall out of influence, never "filled"). An office is a *named seat with
a single holder — the founder by default, until handed off*. This build
models the office apparatus, makes the **founder the default holder of
every office** (so nothing runs ownerless), lets the founder hand a seat
to another player, exposes occupancy checks, and wires the substrate's
**first authority consumer** — the Governor of the Central Bank controls
the bank's `reserve` (mint/supply) lever. It does **not** build the
democratic filling process (investiture, elections, no-confidence,
sortition) — that is the deferred governance machinery.

Seeded by the [cooperative-slate](../slates/builds/cooperative-slate.md)
(the polity build) and grounded in the
[draft-constitution](../governance/draft-constitution.md) as the
authoritative apparatus definition (Art. IV legislature + House names,
Art. V executive / Prime Minister, Art. XI founding transition). At
founding the founder holds every seat (the pool-of-one), handing them
off as occupants step up — so the build also seats the founder over a
**Monetary Authority** (the Governor of the Central Bank), giving the
one apparatus whose system is *live from first boot* a named, accountable
holder. Directly unblocks the Prime Minister office the
[wizard-authority build](../subsystems/access.md) deferred (the seat
meant to own `archwizards`).

## Goals

- **An office is a first-class primitive, not a group.** A dedicated
  Office substrate with apparatus-defined identity, a branch, an origin,
  and a single holder — none of which the general-purpose group model
  carries.
- **The apparatus is authored, not user-created.** The set of offices
  that exist is defined as data and warmed at boot (the distinction from
  groups, which any player mints). v1 defines **five singular offices**:
  the four **constituted** seats — Prime Minister (executive); Speaker of
  the Producer / Patron / Consumer House (legislative) — plus one
  **founder-established** seat, the Governor of the Central Bank
  (executive). Each holds exactly one occupant.
- **Office `origin`: constituted vs founder-established.** *Constituted*
  offices are mandated by the constitution (the four above) and abolished
  only by amendment. *Founder-established* offices are stood up by the
  founder's pool-of-one power at founding and are **ordinary law** — the
  polity may later charter, replace, or abolish them (Art. VIII §3). The
  Monetary Authority is founder-established: administering the economy is
  an **executive** function (Art. V §9; VIII §4), so its branch is
  `executive`; it carries **no constitutional independence** (that would
  be a legislative choice, unmade).
- **The founder is the default holder — identified by credential.** Every
  office is held by the **founder** until explicitly handed off (the Art.
  XI pool-of-one), so nothing — least of all the live-from-boot money
  system — runs ownerless, with **no dependency on the founder having
  logged in**. The founder is marked by **external credential**: a Google
  email (`bobalu@panterasbox.com`) and/or a Twitch handle
  (`Bobalu_Smallberries`), resolved through the `User` ↔
  `GoogleProfile`/`TwitchProfile` link — NOT an internal playerId. This
  is **separate from the streamers axis** (its own concern).
- **Handoff changes the holder.** Assigning a player to an office sets an
  **explicit holder** that overrides the founder default; vacating
  removes it and the seat **reverts to the founder** (the founder is the
  permanent fallback, so a must-be-filled office is never ownerless).
- **Occupancy is checkable and persists.** `holderOf` / `holdsOffice` /
  `officesOf` plus a public roster; explicit handoffs survive restart.

## Non-goals

- **The filling workflow.** Investiture-by-bill, constructive
  no-confidence, elections — the democratic process by which the
  constitution says offices are *really* filled. Deferred to the
  governance machinery ([cooperative-slate](../slates/builds/cooperative-slate.md),
  constitution Art. V).
- **Juries, sortition, and the judiciary's selection-from-a-pool.** A
  jury is **not an office** — it is a *selection from a pool*
  (pool-of-one = the founder, so the founder decides every case at
  founding). That machinery, and any judiciary seat, waits for the
  political-machinery build. **v1 models no judiciary office.**
- **Multi-seat bodies.** Committees, boards, collegial bodies (a holder
  set rather than one holder). All v1 offices are singular; multi-seat
  cardinality is deferred (it arrives with the bodies that need it).
- **Authority consumption — all but one deferred.** Holding an office
  conferring real power is mostly deferred (the PM owning `archwizards`,
  a Speaker controlling a chamber's floor). v1 ships the *check surface*
  those would consult but wires **only one** consumer — the **Governor →
  central bank** (see Surface decisions). The PM→`archwizards` link is the
  obvious next follow-on.
- **Chambers as populations.** The Producer/Patron/Consumer Houses
  themselves (membership derived from influence) are not modeled here —
  only the Speaker *seats* of those houses.
- **Terms / tenure / term-limits.** A holder holds until handed off; no
  term clock.

## Surface decisions

### Office is its own primitive (not a group)

A dedicated Office substrate, mirroring the `AccessRegistry` shape: an
`OfficeRegistry` singleton warms the authored apparatus and resolves the
founder credential; a gated `OfficeApi`/`OfficeLogic` pair is the
surface. An office is *not* a managed group — it carries a branch, an
origin, a single-holder model with a founder default, and
apparatus-defined identity the group model lacks, and it is
authored-in-code rather than user-minted.

### The apparatus is an authored constant; only handoffs persist

The five offices (key, display name, branch, origin) are an **authored
code constant** — they are constitutional, not operator-editable data,
so there is no definition collection or YAML to seed. **Only explicit
handoffs persist** (a sparse store of office → holder, one row per
handed-off office). At founding the store is empty and every office
resolves to the founder default; the store grows only as seats are
handed off. "Re-seeding never clobbers occupants" is trivial because
there is nothing to seed.

### The founder default + credential resolution

- **`isFounder(player)`** — resolve the player's Avatar → its `User` →
  the `User`'s `GoogleProfile.email` / `TwitchProfile.login`; true iff
  either matches the configured founder credential (Twitch `login` is the
  lowercased handle — match case-insensitively). Returns false before the
  founder has logged in (no matching `User` yet) — appointment is simply
  inert until then, which is correct.
- **`holderOf(office)`** — the explicit holder if one is stored, else
  **the founder** (presented by handle even while offline).
- **`holdsOffice(player, office)`** — explicit-holder match, OR (no
  explicit holder AND `isFounder(player)`).

### Handoff = authorized assignment; the appointer is the founder

`assign(player, office)` sets the explicit holder (replacing any prior —
auditable); `vacate(office)` clears it (reverts to the founder). Both are
gated on the **founder** (`isFounder` of the acting giver) — deliberately
**not** the orthogonal `isWizard` code-trust axis (governance authority
and code-trust stay separate — the wizard-build lesson). The
constitutional appointment processes (investiture, election) supersede
this later. The acting appointer is derived from execution context, never
caller-supplied.

### The check + roster surface

`OfficeApi`: `assign(player, office)` / `vacate(office)` /
`holderOf(office)` / `holdsOffice(player, office)` / `officesOf(player)` /
`isFounder(player)` / a roster read. The roster (offices, branch, origin,
current holder) is **publicly readable** — governance is transparent by
constitutional design (Art. VII).

### The one authority consumer: the Governor controls the central bank

The central bank's only control surface is the existing `reserve` verb
(`reserve mint <amount>` — the money faucet; `reserve supply` — the
audit), currently gated on `requiresWizard` (the **code-trust** axis —
the wrong axis: minting money is a monetary-authority act, not a
code-authoring one; `CentralBank.ts` itself notes its governance was left
unbuilt). v1 **re-gates `reserve`** from `requiresWizard` to **holding the
`central-bank-governor` office** — a `requiresGovernor` validator over
`OfficeApi.holdsOffice(giver, 'central-bank-governor')`. The Governor (the
founder by default, or a handed-off holder) controls the bank; a wizard
who is not the Governor can no longer mint. This is the office substrate's
first real consumer — the proof it works. (Only `reserve` moves;
`house`/venue-owner authority is a separate concern, untouched. A *generic*
"requires office X" validator is deferred to the second office-gated verb.)

### Verb surface

An `office` verb with subcommands (the `group`/`wizard` precedent):
`office assign <player> <office>` / `office vacate <office>` (the
mutating subcommands gated to the founder) and `offices` / `office list`
(the **public** roster, runnable by any player). No two-word verbs.

## Constraints

- **Module categories.** New `lib/governance/` subsystem home for the
  `Office` value-object + branch/origin vocabularies + the authored
  apparatus constant; `OfficeRegistry` singleton at `/obj/OfficeRegistry`
  (`Idea` + `PostRegistrationMixin`, manifest-warmed) mirroring
  `AccessRegistry`; `api/office.ts` (`OfficeApi`) +
  `obj/api/OfficeLogic.ts` (gated `FromModule('mud/api/office#OfficeApi')`).
  The verb introduces a **new `governance` command category** (controller
  in `obj/command/governance/`, YAML in `cmd/governance/`) — **approved**.
- **The public verb is afforded universally.** Because the roster is
  public, the `office` verb is afforded on a **universal player mixin**
  (the `group`-verb precedent — afforded via a per-Avatar mixin, NOT the
  operator-only `AuthorMixin`), with the founder gate on the
  `assign`/`vacate` **subcommands** only. A non-founder sees the verb and
  the roster but is denied the mutating subcommands.
- **Founder credential resolution.** The `OfficeRegistry` reads the
  founder credential from env (`FOUNDER_GOOGLE_EMAIL` and/or
  `FOUNDER_TWITCH_HANDLE`) and resolves it against
  `GoogleProfile`/`TwitchProfile`/`User` (collections `google_profiles`,
  `twitch_profiles`, `users`). Resolve lazily / re-checkable (the founder
  may not exist at boot). This is **orthogonal to** the `streamers` axis
  and the `isWizard` code-trust axis.
- **Gated-API actor from context.** The founder authority check derives
  the principal from the command giver / `ExecutionContextApi` — never a
  caller-supplied parameter (the `gated-api-actor-from-context` rule).
- **Persistence.** The apparatus is code; **only explicit handoffs
  persist** (a new collection — the `groups`/`bulletins` precedent — one
  row per handed-off office). Survive restart.
- **Decorate the Api.** `OfficeApi` ends with
  `SecurityApi.decorateApiClass(OfficeApi)`.

## Acceptance criteria

- The five offices (PM; Speaker of Producer/Patron/Consumer House;
  Governor of the Central Bank) are warmed at boot with their branch
  (executive/legislative) and origin
  (`constituted`/`founder-established`); no jury / judiciary office
  exists (tested).
- `isFounder` is true for an Avatar whose `User` carries the configured
  founder Google email or Twitch handle, false otherwise and false when
  no matching `User` exists yet (tested with stubbed profiles).
- With no explicit handoff, `holderOf` returns the founder and
  `holdsOffice(founder, office)` is true for **every** office (the
  founder-default / pool-of-one — tested).
- `assign(alice, 'prime-minister')` makes Alice the holder
  (`holdsOffice(alice)` true, `holdsOffice(founder)` false for that
  office); a second `assign(bob, …)` **replaces** Alice; `vacate` reverts
  the seat to the founder (tested).
- `officesOf(player)` lists every office a player holds, including the
  founder's full set when no handoffs exist (tested).
- A **non-founder** is denied `assign`/`vacate`; the founder is allowed
  (tested).
- The roster read is publicly readable and lists offices, branch, origin,
  and current holder (tested).
- Explicit handoffs persist across a registry reload (tested or
  scripted).
- The `reserve` verb is gated on holding the `central-bank-governor`
  office (via `requiresGovernor`/`holdsOffice`): the Governor (founder by
  default, or a handed-off holder) is allowed; a non-Governor — including
  a wizard who does not hold the seat — is denied (tested). No other verb
  changes gating.
- A subsystem doc (`docs/subsystems/governance.md`) records the office
  model (apparatus-vs-group-vs-chamber distinction, the founder-default /
  credential model, handoff, the check surface) with a `CLAUDE.md`
  doc-map entry; the `cooperative-slate` cross-references it.

## Cross-references

- **Seeding slate** — [cooperative-slate](../slates/builds/cooperative-slate.md)
- **Apparatus definition** — [draft-constitution](../governance/draft-constitution.md)
  (Art. IV legislature + Houses, Art. V executive/PM + §9 administration,
  Art. VIII economy-is-ordinary-law, Art. XI founding transition, Art. XII
  operator root-power floor)
- **Founder credential** — `lib/identity/User.ts`,
  `lib/identity/GoogleProfile.ts`, `lib/identity/TwitchProfile.ts` (the
  `User` ↔ profile link the founder resolves through); **separate** from
  the streamers axis ([livestream.md](../subsystems/livestream.md))
- **Unblocks / first consumer** — [access.md](../subsystems/access.md)
  (the deferred PM seat → `archwizards`; the `AccessRegistry` pattern
  this mirrors)
- **Related** — [grouping.md](../subsystems/grouping.md) (the
  general-purpose collection this is deliberately *not*),
  [influence.md](../subsystems/influence.md) (the chamber populations
  this is deliberately *not*), [banking.md](../subsystems/banking.md)
  (the live-from-boot `CentralBank` the founder-established Governor seat
  sits over)
- **Founding** — [founding-charter.md](../governance/founding-charter.md),
  [draft-constitution.md](../governance/draft-constitution.md) Art. XI
- **Project rules** — `gated-api-actor-from-context`, Module Categories
  ([CLAUDE.md](../../CLAUDE.md))
