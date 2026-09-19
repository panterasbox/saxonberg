# Executive slate — the log, the levers, the civil service, and the reports

> **Status: PARTIAL** — the branch is *running*: five offices with founder
> default, `/compact/executive` holding the platform roots, the
> operator-axis verbs (`reserve`, `office`, `config`, `pack`, `eval`,
> `reload`, `wizard`, `cms`, `git`), AppSettings, the diagnostics store,
> pack status, the reconcile, and the whole build cycle (requirements →
> plan → build → MR → finalize → deploy). What does not exist is any
> **record** of an executive act: ten `*_events` ledgers ship and the
> executive has none.
> **Left:** the **executive log** (append-only; principal · authority
> invoked · act · authorization · sunset) · the **Schedule of
> Parameters** as a live, tiered control surface (AppSettings + a tier per
> row; `config` re-gated from wizard to tier) · **emergency acts** as
> logged, sunsetting overrides · the **civil service as public charters**
> (the same primitive as the corpos') · the **reports** the branch owes
> (the faucet/sink statement · the census · the docket · the log digest) ·
> the agent-session principal · the fiat-phase handover record
> **Size:** a build (the log + the tiers are Stage A and small; charters
> and reports ride the institutions and bootstrap builds)

> **Captured 2026-09-18.** The Compact has almost no code because the
> constitution is a draft; the user's read is that the executive can be
> designed now because — unlike the other branches — *it is already
> running, between the founder and the coding agents.* This slate says
> what that branch is, what it has, what it lacks, and what to build
> first. Design conversation, captured; not requirements.

See also:

- [draft-constitution.md § Art. V](../../governance/draft-constitution.md)
  — the branch's text; §3 (executes only what is authorized), §4 (a civil
  service of chartered institutions), §6 (programming the machine is an
  executive function; the judiciary verifies), §7 (human enforcement is
  bounded, recorded, recusal-gated, reviewable), §9 (administration is
  human; the polity tunes the levers). Art. XI (what binds the founder:
  code, publication, exit). Art. XII (every emergency act logged,
  auto-sunsets, reviewable). Art. VII (the record).
- [institutions-slate](./institutions-slate.md) — the charter primitive
  (grant · duty · term); Part 3's *no authored field may create money*;
  the intake floor that reads a docket.
- [courts-slate](./courts-slate.md) — the Compact-jurisdiction cases
  that read the executive log (disbarment, Art. VI attestation,
  contested emergency acts).
- [attestation-slate](./attestation-slate.md) — the judiciary's
  verification leg (§6), which makes the SDLC constitutional rather than
  habitual.
- [wizard-duty-slate](./wizard-duty-slate.md) — *a covert operator act
  produces no event*; wizardry as a fiduciary role. The log is its
  missing half.
- [economic-bootstrap-requirements](../../requirements/economic-bootstrap-requirements.md)
  — the first build that mints Schedule rows in numbers; the reserve's
  three instruments are the first report.
- [measurement.md](../../measurement.md) — *the mirror shows you*; the
  no-gauge rules a report must respect; layer 3's entrenchment tiers,
  which the Schedule's tiers mirror.
- [app-settings.md](../../subsystems/app-settings.md),
  [governance.md](../../subsystems/governance.md),
  [access.md](../../subsystems/access.md) (the operator axis; the
  executive organization), [content-packs.md](../../subsystems/content-packs.md)
  (`pack_installs` — the one executive act that already leaves a record),
  [diagnostics.md](../../subsystems/diagnostics.md),
  [press.md](../../subsystems/press.md) (the Gazette prints what is
  public), [docs/workflow.md](../../workflow.md) (the build cycle).

---

## The mapping — Art. V already describes the workflow

> *"The executive implements the legislature's requirements and enforces
> the law by code… Programming the machine is an executive function,
> requiring specialized knowledge; that the implementation conforms to
> the requirements is verified by the judiciary."* — Art. V §6

| Art. V says | what it is today |
|---|---|
| the legislature's **requirements** (§3, §6) | `docs/requirements/<x>-requirements.md` — the bill |
| the executive **implements** (§6) | `/plan` → `/build` → the MR — the founder and the coding agents |
| **enforces the law by code**, uniformly, without discretion (§6) | the lint family, the gates, call-security, the reconcile, the conservation chokepoint |
| the judiciary **verifies conformance** (§6, Art. VI) | the MR review, the drive, `/finalize` — habitual today; constitutional once the attestation slate's go-live predicate exists |
| a **civil service of chartered institutions** (§4) | five offices; `/compact/executive` holding the roots; the reserve; the TPA authority; the press office; the pack maintainers |
| **the deliberation surface** (§8) | the forums' Subject layer + argument organizer |
| **administration is human** (§9) | the founder, in a chair, deciding what to build next |

⭐ **The branch is not missing. It has power without legibility** — and
every other clause of Art. V is about legibility: *bounded, recorded,
recusal-gated, reviewable* (§7); *every emergency act logged,
auto-sunsets, reviewable after the fact* (XII); *what binds the founder
before ratification is code, publication and exit* (XI).

## ⚠⚠ The gap, in one fact

Ten append-only event ledgers ship: `accountability_events`,
`authoring_events`, `chattel_events`, `contract_events`,
`disposition_events`, `forum_events`, `parcel_events`,
`participation_events`, `producer_events`, `renown_events`. **There is no
executive one.** `reserve mint`, `office assign`, `config`, `pack
install`, `eval`, `reload`, `wizard`, a CMS publish, a `git` push from
inside the game — every act on the operator axis produces no row saying
who did it, under what authority, or why. The wizard-duty slate already
named it: *a covert operator act produces no event.* Art. V §7, VII, XI
and XII all forbid exactly this, and it is the cheapest thing in this
slate to fix. (`pack_installs` is the one exception — a pack install
already leaves a record with applied-by and the maintainers line. It is
the exemplar, not the rule.)

---

# Part 1 — The executive log

An eleventh ledger, `executive_events`, in the house shape (append-only;
current state derivable from it; refused under the sandbox; a dispute is
answerable here, which is the only reason any current state can be
trusted). One row per act on the operator axis:

| column | meaning |
|---|---|
| **principal** | who acted — an identity path; for an agent session, the session's principal (Part 5) |
| **authority invoked** | *which* office, mandate or title the act was performed under — `office:central-bank-governor`, `title:/compact/executive`, `wizard`, `charter:reserve` |
| **act** | the verb and its resolved arguments, as the command line the record layer already captures |
| ⭐ **authorization** | the thing this act *executes* — a requirements doc path, a bill, a Schedule row, a court order. **Empty is legal and meaningful**: it means the act was discretionary |
| **sunset** | for an emergency act (Part 3): when it lapses unless re-authorized |
| **effect** | the durable ids it produced — a ledger `txId`, an `office_holders` row, a pack-install id, a settings revision |

Three consequences:

- ⭐⭐ **§3 becomes a column.** *Executes only what the legislature has
  authorized* is checkable: an act with an authorization is executing;
  an act without one is discretion, and discretion is either within the
  seat's mandate (Part 4) or an emergency act (Part 3). There is no third
  kind.
- **It closes the wizard-duty hole.** The covert act now produces a row.
  That does not make it impossible — runtime guards constrain code that
  goes *through* the framework, and a wizard has left it by definition —
  but the *framework-mediated* operator surface, which is all of the
  verbs above, is recorded, and an act that bypasses the surface is
  visible as an effect with no row. Fabrication remains the operator's
  to answer for; the log is what the answer is checked against.
- **It is what the other branches read.** The Compact-jurisdiction
  courts (disbarment; a contested emergency act); a no-confidence bill;
  the ratifying convention inheriting the fiat phase.

**What counts as an act.** Anything gated on the operator axis — a
verb-level `requiresWizard` / `requiresArchwizard` / office validator,
a `canAtPath` write over `/compact/**`, a CMS publish, a pack install,
sync or export, a settings write, a `git` push from inside the game, an
`eval`. The list is derived from the gates, never enumerated by hand —
the lint-family pattern: a gated verb that does not log is a lint
failure.

---

# Part 2 — The Schedule of Parameters as the control surface

> *"…the polity shapes it only by tuning the levers — the values in the
> Schedule of Parameters…"* — Art. V §9

This month invented a dozen Schedule rows — dormancy and escheat
thresholds, the ladder's gates *N* and *M*, the window rate and haircut,
the issuance coefficient, charter terms, panel size, the filing fee. The
draft constitution's Schedule lists a dozen more. **AppSettings is
nearly this already** — a keyed vocabulary with yaml-seeded defaults, a
singleton, one read Api, and the `config` verb. What it lacks is the one
thing that makes a lever a lever rather than a variable:

⭐ **Every row carries a tier, and the tier says who may turn it.**

| tier | who may write | examples |
|---|---|---|
| **eternity** | nobody — founding anew | `exec.confidence`; the firewall |
| **amendment** | the legislature by Art. X | the tier of a tier; the Note's non-recourse |
| **organic** | the affected chamber's supermajority | the window rate; the ladder's gates; charter terms |
| **executive** | the seat the row names, within published bounds | the haircut within its band; a dormancy threshold within its band |
| **operator** | the fiat phase only; sunsets at ratification | anything not yet assigned a tier |

`config` is **re-gated from `requiresWizard` to the row's tier** — the
wizard-duty slate's axis hygiene (*none of this should be using
`requiresWizard`; that is for exactly one thing — writing TypeScript*).
A write within your tier is a logged executive act with `authorization =
the row`. A write outside your tier is refused — or, forced, is an
emergency act (Part 3). The Schedule is one visible panel with a
hand-print on every row, which is what *tuning the levers* has to mean.

The tiers are measurement.md's layer-3 entrenchment tiers (A amendable
by nobody · B by whoever ships the code · C by the polity) with the
executive's band added underneath; the two vocabularies should be one.

---

# Part 3 — Emergency acts

> *"Every emergency act is logged to the archive, auto-sunsets after a
> short fixed period unless re-authorized by the legislature, and is
> judicially reviewable after the fact… Prefer auto-sunset + post-hoc
> review over pre-authorization — speed in the crisis, accountability
> after it."* — Art. XII

An emergency act is **any operator-axis act outside the actor's mandate
that the actor forces anyway**: a Schedule write above tier, a reserve
override, a production `eval`, a pack sync that overrides a title
conflict. The mechanism is one flag on the log row plus a sunset:

- it is **flagged** at the moment it is forced — the verb takes an
  explicit `--emergency` and refuses the out-of-tier act without it, so
  nobody stumbles into one;
- it carries a **sunset** (a Schedule row: short); ⚠ this is a clock, and
  it is the legitimate kind — a statute about an *act*, like dormancy is
  a statute about a person, not a sim clock on a thing;
- what it changed **reverts at sunset** unless the legislature
  re-authorizes it (a bill naming the log row) — for a Schedule write,
  the prior value; for an override, the prior state where one exists;
  for the irreversible (an `eval`), the sunset is the review deadline
  rather than a revert;
- it is **reviewable** — the Compact-jurisdiction court's docket lists
  open emergency acts, and any member with standing may file against
  one.

⭐ During the fiat phase every operator-tier act is, formally, an
emergency act with the founder's charter as its standing
re-authorization. Naming it so costs nothing and means ratification
finds a log already in the right shape.

---

# Part 4 — The civil service as public charters

> *"The administration is a civil service of chartered institutions, each
> with a bounded mandate, its own staffing, judicial oversight, and
> durability beyond any officeholder — institutions, not hierarchies."*
> — Art. V §4

The institutions slate gave corpos the charter — **grant · duty · term** —
as a document the ledger can check. §4 says the administration is the
same shape, held publicly. The executive's institutions, each an
organization with a charter:

| institution | grants | obliges | the seat |
|---|---|---|---|
| **the reserve** | issuance by the two rules; the window | the three numbers, published; the dashboard never totals | the officer |
| **the treasury** | appropriation from its account | the faucet/sink statement; the Note's recovery | the treasurer |
| **the registry** | filings; the cap tables | the docket of filings | a clerk (NPC) |
| **the courts' clerk** | files, serves, draws, enters | the docket | a clerk (NPC) |
| **the press office** | the Compact's releases | the anonymous press room stays open | the comms position (staff, not an office) |
| **the works** (TPA) | the network; fares to the city budget | the board for everyone | the Authority |
| **ops** | deploy; the DB; the infra | the executive log's own integrity; the deployment manifest | the operator |

Two things this buys. **The mandate boundary** — Part 1's *authority
invoked* column resolves to a charter, and an act is either inside its
grant or it is not. And **durability beyond the officeholder** — a
charter is a document, a seat is a row, and the institution is what
survives both; which is the property the founder most needs to have
built before stepping back.

⭐ The corpos' charters and the civil service's are **one primitive**. The
difference is who holds them — a `<key>-committee` group or the
executive — and whether renewal is the polity's act (private) or an
amendment's (public).

---

# Part 5 — The agent-session principal

The coding agents are civil service under §6, and it is fine — an agent
under a plan is *programming the machine*. What the log needs is for an
agent's acts to be attributable. Today an agent acts as the founder
(the founder's wizard, the founder's session). The honest record is
**principal = the founder, acting through = the session**, with the
session identified — which the record layer's per-player frame store
already nearly does for a human session. A `Claude-Session:` trailer is
already on every commit; the in-game log wants the same handle.

What makes it *constitutional* rather than merely how things are is the
verification leg — the attestation slate's go-live predicate turning
"the MR was reviewed" into "the judiciary attested." Until then the
SDLC is the executive checking its own work, which Art. XI permits in
the fiat phase and Art. VI will not after. ⚠ Named, not solved: an agent
that opens an MR and an agent that reviews it are the same principal
today. The pool primitive (courts) is the eventual answer to *who
verifies*; the interim answer is that the founder attests, in the log,
by name.

---

# Part 6 — The reports

Reporting is the mechanical half of accountability, and none of it is
the branch's own yet. *The mirror shows you.*

| report | cadence | reads | who prints it |
|---|---|---|---|
| **the reserve's three numbers** — money per active member · the default rate on window paper · the basket index | continuous; per currency; never totalled | the ledger, the roster, the NPC shops' asks | the reserve's dashboard; the Gazette prints the index |
| ⭐ **the faucet/sink statement** — EVE's Monthly Economic Report: money created by source (the perpetual, the Note, opening capital) against money destroyed (fees, fines, drains, defaults), per currency | monthly (a game-year) | the ledger | the treasury; the Gazette |
| **the census** | continuous | the residency census, the roster, the three player states | the executive; the Gazette prints the headline |
| **the docket** | continuous | the courts | the clerk |
| **the executive log digest** — acts by authority, emergency acts open, sunsets pending | monthly | the log | the executive; the legislature reads it in full |
| **pack status and the diagnostics store** | continuous | `pack_installs`, `diagnostics` | ops; already exist, not yet *owed* |

The no-gauge rules apply to every one: a report shows what the engine
honestly measures, per referent, never a score; the Gazette is
journalism over it, contestable by a rival paper; nothing in a report is
the only rater of anyone.

---

# Part 7 — The fiat phase, made legible

Art. XI: the founder governs by fiat until the population threshold, and
what binds them meanwhile is **code, publication and exit**. Code and
exit exist. **This slate is publication.** The goal is not "build the
executive branch" — it is running — but to make the fiat phase legible,
so that ratification inherits a record rather than a story: every act
logged with its authority; every lever on one panel with a tier; every
institution a charter; every report owed and printed. At ratification
the founder's operator tier sunsets, the log is the archive, and nothing
about how the branch works has to change — only who holds the seats.

---

# Open questions

1. **The log's retention and the reset policy.** Append-only forever, or
   the record layer's nightly reset for some kinds? *Leans forever* — it
   is the archive Art. XII names.
2. **Does a `git` push from outside the game log?** The commit trailer
   is the record there; the in-game log records the *deploy*, which is
   ops' act. *Leans: deploy logs; the commit is its authorization.*
3. **The emergency sunset length.** Short. A Schedule row; *leans a
   game-week* (a real half-day) for a Schedule override, longer for a
   pack override.
4. **Tier assignment for existing AppSettings rows.** A census: every
   current key gets a tier or lands in `operator` by default, and the
   burn-down of `operator` rows is the ratification readiness meter.

# Build cut

**Stage A — the log and the tiers.** `executive_events` + the
gate-derived act list + the lint; the tier column on AppSettings +
`config` re-gated + the `operator` default + `--emergency` and its
sunset. Small, and everything else writes to it.

**Stage B — charters and reports.** Rides the institutions build (the
charter primitive) and the bootstrap (the reserve's numbers, the
faucet/sink statement).

⭐ The DRIVE for Stage A: **the founder mints, assigns an office, sets a
Schedule row within tier, forces one above tier with `--emergency`, and
reads all four back from the log with their authorities; the forced one
reverts at sunset; a session-run act shows the session's handle.**
