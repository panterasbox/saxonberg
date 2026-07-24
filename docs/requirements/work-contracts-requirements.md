# Work contracts & arrangements — requirements

The buildable kernel of the livelihood slate's work model
([livelihood-slate](../slates/builds/livelihood-slate.md) §5–§6): the
**clause primitive** with engine verification, the **gig** (a Contract
that escrows, settles, or breaches), a **physical job board** as the
discovery surface, and the **arrangement generalization** of the
shipped employment engine — compensation bases as authorable terms,
the ledger-leg-kind discipline, and the proprietor's **draw** as a
named money movement. This is the income backbone the platform
doctrine requires (kill→reward is severed; livelihood comes from
work), landing on shipped substrate: the employment engine
([employment.md](../subsystems/employment.md)), conserved banking
([banking.md](../subsystems/banking.md)), MQL system mode
([mql.md](../subsystems/mql.md)); verification is on-demand state
reads at turn-in — no engine chokepoint is instrumented.

## Goals

- A **clause** is a first-class unit of work: `{shape: achieve |
  maintain, condition}` where `condition` is a query over modeled
  world-state, evaluated by the **engine** (never an agent's diegetic
  witness). The hard rule is enforced at the contract boundary: a
  clause may only be escrowed if its condition is engine-verifiable;
  fuzzier intents are rejected from the system-backed path.
- A **Contract** (gig) runs the five-state lifecycle — open →
  claimed/escrowed → settled | breached — end-to-end on a **delivery**
  gig: reward escrowed as a real held balance out of the issuer's
  account, released when the contractor **turns the job in**
  (an explicit `complete` action) and the condition verifiably holds
  at that moment, reverted on breach/expiry/abandon, with attribution
  recorded both ways.
- Two **claim modes**, chosen per gig by the issuer: **exclusive**
  (one claimant, claim expires back to open) and **open-bounty** (no
  claim; anyone may turn it in — the first verified completion
  settles).
- **Two-beat completion.** A contractor can capture fulfillment **at
  the destination**: `fulfill` runs the same engine verification at
  that moment and appends an engine-sealed `fulfilled` record to the
  contract's event chain — the proof-of-delivery. `complete` at the
  board then redeems **either** live verification **or** a valid
  post-claim `fulfilled` record, so the payout survives later state
  drift (the recipient taking the crate inside is the *point* of
  delivering it). Trustworthiness is by construction: the record is
  written only by gated logic after the engine itself verified the
  condition — call security is the authentication.
- **Players can post gigs** as well as claim them (players employing
  players), self-funded via escrow from their own balance, with
  conditions constrained to templated shapes (v1: delivery).
- A **physical job-board fixture** is the discovery surface: a Thing
  placed in a locality, affording the **subcommand-dispatched `job`
  verb** (bare = browse; `post`/`claim`/`complete`/`abandon`
  subcommands — the `party`/`bulletin` house pattern) via its
  own `commandContributions`; `fulfill` is the one standalone travel
  verb.
- **Compensation bases become authorable terms** on a Position: the
  shipped time-wage is joined by **per-settlement** (piece-rate) and
  **share-of-flow** (a conserved split leg at the moment a flow
  moves), expressed as data, not subclasses.
- **Ledger-leg-kind discipline**: every economically distinct money
  movement carries a distinct, named leg kind. Existing kinds are
  audited and the missing ones added — at minimum the **draw**
  (proprietor take-home, distinct from wage) and the escrow
  hold/release/revert family. The vocabulary is documented as the
  future tax-policy hook.
- The **draw** exists as an operable movement: a proprietor moves
  money from their Business account to their personal account as a
  `draw` leg, never silently as a wage.

## Non-goals

- **The systemic job generator** (the world posts its own needs —
  "Dave's gin is low → a haul gig posts itself"). Authored gigs only
  this build; the generator is its own later build.
- **The public-works program** — floor wage + demand-matched pool
  (slate §8) — gated on the Circulation Reserve build.
- **The appropriation / public-sector contracting** (slate §7.3) —
  needs no substrate from this build beyond what ships anyway.
- **Entity forms** (sole-prop/S-corp/C-corp analogs) and differential
  tax rates; this build only lays the leg-kind vocabulary they will
  read (slate §6.2).
- **Franchise / operator agreements** and entity↔entity arrangements
  (slate §7.4 — retail S4 territory).
- **Liability scope-context** on the accountability ledger (slate
  §6.5) — a later, small, self-contained build.
- **Maintain-clause violation detection.** The maintain shape exists
  in the clause vocabulary, and the shipped time-wage is documented
  as its paid-by-interval instance — but no violation-detection
  engine ships until a consumer (a bouncer-shaped job) exists.
- **The adjudication stack** (bounty legitimacy, authorization
  laundering, illicit contracts — slate §2). The Contract record
  carries the seams (issuer, terms); the legal reasoning is content
  + later builds.
- **Gating and pricing sophistication**: no standing/competence gates
  on claiming (named deferral), no difficulty-band or demand-driven
  pricing — the reward is issuer-set stance (Law 1: a transfer,
  safe to author freely).
- **Client surfaces** (cockpit board pane) — the board is
  server-first; a pane can ride the wire later.
- **Cozy downtime** mechanics (slate's biggest open experiential
  question) — untouched here.
- **The general trusted-recording instrument** (a player-usable
  capture of session state / message frames, engine-sealed and
  reconstructable by an authenticating agent — the "tricorder"; the
  courts' evidence substrate). The contract `fulfilled` record is
  its narrowest instance; the general instrument is its own future
  design (evidence/testimony), not this build.

## Surface decisions

### Scope: the full kernel in one build

The gig machinery and the arrangement generalization ship together.
They are cohesive (both are "arrangement terms as data"), the
arrangement half is small on top of the shipped engine, and splitting
them would leave the leg-kind vocabulary — the load-bearing
commitment — homeless.

### Discovery: a physical board fixture

A `JobBoard` Thing placed in a locality (first placement: Dave's
Bar's lounge), affording the verbs via `commandContributions` —
content affords content, no core-mixin affordance. Diegetic, Track-B
server-first, zero client dependency. A placeless query verb/pane is
deferred. Multiple boards can exist; a gig is posted *to a board*
(the board is the pool's visibility surface, not the pool itself).

### Claim modes: both, per-gig

- **Exclusive**: acceptance escrows and locks the gig to the
  claimant; the claim carries a **game-time expiry** (AppSettings
  dial) after which it reverts to open — squatting cannot block a
  board. Delivery-shaped work defaults exclusive.
- **Open-bounty**: no claim step; the gig is escrowed at posting and
  stays open until someone's `complete` verifies. The
  fulfiller/completer is the command giver, so attribution is
  inherent — no eligibility gate needed; anyone may `fulfill`, a
  `fulfilled` record redeems only for its own actor, and a
  concurrent second `complete` is refused by the terminal-state
  guard. On an exclusive gig, only the claimant may `fulfill` or
  `complete`.
- Both modes support an optional posting-level expiry (escrow reverts
  to issuer).

### Verification: explicit turn-in; the engine judges the claim

Completion is an **explicit player action**, in two beats.
**Capture** (`fulfill`, at the destination): the engine checks the
condition against modeled state **at that moment**, viewer-blind,
and on success seals a `fulfilled` record into the contract's event
chain. **Redeem** (`complete`, at the board): settles on live
verification or a valid `fulfilled` record. In both beats the player
petitions and the state decides — the engine-as-observer doctrine
intact, with no ambient detection machinery: no engine chokepoint is
instrumented, and a new job template is just a new predicate (the
extension seam the vocabulary widens through). For delivery, the
verification enforces strict possession semantics: the item must
rest in/on the destination and **not** inside the presenter (or any
creature) — "you're still carrying it" is a crisp refusal; `fulfill`
also requires the presenter to be at the destination (the handoff is
diegetic, not remote). Ambient detection (witness hooks; `EventApi`
only for genuinely global broadcasts) is named-deferred for
maintain-clause violation and the systemic generator, where turn-in
structurally can't work. v1 ships **templated condition
shapes** rather than free-form authored predicates: the delivery
template (*item X inside container/location Y*) is the proving
instance. Player-posted gigs are restricted to these templates —
which is both the anti-grief boundary (no free-form MQL in a hostile
mouth) and the honest scope of what v1 verifies. The template
vocabulary is the extension seam later builds widen (cull, escort,
restock).

### Breach must be felt, cheaply

Breach/expiry reverts escrow, records the event durably, and applies
an **issuer-side regard nudge** against the contractor (the shipped
`RegardApi` seam, the combat-witness precedent) — a real, per-viewer,
social consequence with zero new mechanism. No global reputation
write (reputation consumers read the ledger later).

### Storage: current-state row + append-only events

The parcel/chattel precedent: a `contracts` current-state collection
(the lifecycle record) plus an append-only `contract_events`
chain (posted / claimed / fulfilled / released-back / settled /
breached /
reverted), keyed on durable ids (`templatePath` for parties). Money
legs live only in the bank ledger; contract events reference them
(`fulfilled` carries no money — it is the engine-sealed
proof-of-delivery).

### Every account names a real custodian

Surfaced during planning and adopted as a requirement: no account may
be held *nowhere*. Today's venue/city/worker accounts are
self-custodied (`bankPath` = the owner's own non-bank path) and the
sales-tax `treasury` row has an empty one — a recorded owner with no
accountable custodian institution. The rule: **only the state banks
at the central bank** (a CB account belongs solely to an organ of the
polity acting under the legislature; the sole current occupant is the
`treasury`), and **everything else banks at a commercial bank** (v1
default: the Goodkin branch, via a `banking.defaultCustodianBankPath`
setting) — city governance is content, not the state; Terminus is
private group-owned land. Escrow follows the real model: an agent's
(the contract system's) per-contract accounts custodied at the
commercial bank. Account creation refuses a custodian that isn't a
real bank or the CB; existing rows are restamped idempotently at
boot (a cache-field fill — no money moves).

### Escrow is conserved banking, not a new store

Escrow is a real held balance moved by the sealed `postTransaction`
chokepoint — new leg kinds (`escrow-hold` / `escrow-release` /
`escrow-revert`), held in a **per-contract real account**
(`escrow:contract:<id>`, owner = the contract, custodied at the
default commercial bank per the custodian rule; NOT a sentinel — a
sentinel has no balance row and would break `reconcile` while escrow
is in flight). The row is deleted at contract close, so live escrow
rows scale with open contracts and the append-only ledger remains
the permanent record. Posting fails if the issuer can't fund the
escrow. No credit, anywhere (standing rule).

### Compensation bases: data on the Position

`Position` grows a compensation term: `{basis: time | per-settlement
| share-of-flow, rate | split}`. Time is the shipped behavior,
unchanged (regression-pinned). Per-settlement pays a conserved leg
per attributed achieve settlement. Share-of-flow generalizes the
consignment/royalty split (a conserved split leg at revenue time —
same primitive, now nameable on an employment arrangement). No real
venue consumes piece-rate yet (the mine is unbuilt); it is exercised
at test level against a test Business — per the systems-over-content
stance, no fake content venue is authored just to demo it.

### The draw

A proprietor-gated movement (participant contract: the Business
party to the record) from the Business account to the proprietor's
personal account, carried as a `draw` leg kind. Surfaced as a verb
on the banking surface (planner picks the exact verb shape within
the existing `banking` category). The wage path is untouched.

### Naming and category

The command surface is **two verbs**, per the house subcommand
discipline (one dispatch-on-subcommand verb per feature —
`party`/`bulletin`/`fight`/`office` — never a verb per operation):
the board-afforded **`job`** (bare = browse;
`post`/`claim`/`complete`/`abandon` subcommands with per-subcommand
args + validators) and the standalone self-afforded **`fulfill`** (a
diegetic physical act that must travel with the courier — affordance
is per-verb, so it cannot be a subcommand of the board-afforded
`job`). Both land in a new `work` command category (the `retail`
precedent). The Api pair is the standard gated
`ContractApi`/`ContractLogic` at `/obj/api/contract`.

## Constraints

- **Conservation**: every money movement is a leg through
  `BankingLogic.postTransaction`; no contract code touches balances
  directly. `reconcile`/`moneySupply` must stay green with escrow in
  flight.
- **Actor from context, never a parameter**
  ([gated-api-actor-from-context], docs/antipatterns.md): poster,
  claimer, presenter (`fulfill`), completer, and drawer are derived
  from execution context.
- **Module taxonomy**: gated Api/Logic pair; value objects in the
  existing `lib/employment/` (one common work-system namespace, the
  `lib/standing/` precedent — no new subdir; the Api pairs stay
  separate); no free-floating helper modules; no new module-scope
  execution.
- **MQL is how you search**: engine-side enumeration uses MQL system
  mode with namespace filters — no raw `getAllObjects` scans (the
  antipattern sweep's rule).
- **Content placement**: the `JobBoard` class per obj-vs-lib
  placement rules; its seed + any content verbs in the owning
  `domain/` namespace; verbs afforded by the fixture's
  `commandContributions`, never a core mixin.
- **Scheduling**: expiries ride `ScheduleApi`/game-time (the
  roster/wage precedent) — no bare timers; observe-first sweep
  posture where applicable.
- **Persistence**: `contracts`/`contract_events` follow the
  Document + append-only-events precedent; writes via the gated
  logic only; `PersistApi` chokepoint discipline (`lint:pm`).
- **Employment regression**: the shipped time-wage path and all
  existing employment/banking tests remain byte-identical in
  behavior; comp-basis generalization is additive.
- **No credit**: escrow requires funds up front; a post that can't
  fund is rejected. No negative balances introduced anywhere.
- **Docs discipline**: mixin/marker/registry conventions
  (`Mixins.X`, `MixinApi.isX`) for anything mixin-shaped; new
  AppSettings under a `contract.*` (or `work.*`) namespace with
  seeded values in `app-settings.yaml`.

## Acceptance criteria

- **Lifecycle**: tests cover both completion beats — open → claim →
  escrow → deliver → `complete` → settle (live verification at
  turn-in), and open → claim → deliver → `fulfill` → *state drifts*
  (crate removed) → `complete` → settle (redeemed against the sealed
  `fulfilled` record) — plus open → claim → expiry/abandon → revert
  (escrow returns to issuer, breach recorded, regard nudge applied).
- **Verification boundary**: a gig whose condition is not an
  engine-verifiable template is rejected at posting; a gig settles
  **only** through `complete`, backed by verification that ran while
  the condition held (live or at `fulfill`) — never ambiently on the
  state change itself; `fulfill` and live `complete` are refused
  while the item is still carried by the presenter, and `fulfill` is
  refused away from the destination.
- **Claim modes**: exclusive lockout is enforced (second claimant
  rejected; only the claimant may `complete`); an expired exclusive
  claim reverts to open; an unclaimed open-bounty settles for the
  first completer whose verification passes, and a second `complete`
  is refused by the terminal-state guard.
- **Player posting**: a player posts a templated delivery gig funded
  by their own balance; an NPC-issued gig draws escrow from the
  Business account; both settle identically.
- **Conservation**: `reconcile` and `moneySupply` are green with
  contracts in every state; escrow legs carry the new kinds; the
  full leg-kind vocabulary is asserted by a test (no untyped legs).
- **Comp bases**: a test Business pays per-settlement on attributed
  settlements and share-of-flow on a revenue split; the time-wage
  suite passes unchanged.
- **Draw**: a proprietor draws from the Business account as a `draw`
  leg; a non-proprietor is refused by the participant gate.
- **Custodian rule**: account creation refuses an empty or non-bank
  `bankPath`; the boot restamp moves self-custodied/empty rows to the
  default custodian bank and the `treasury` to the CB, idempotently,
  balances untouched, `reconcile` green; escrow rows carry
  `owner: contract:<id>` + the custodian `bankPath` and are deleted
  at contract close (no rows for terminal contracts).
- **Board**: `jobs`-style browse lists open gigs on the board's
  locality (bare `job`); post/claim/complete/abandon work as `job`
  subcommands through the board's afforded verb; `fulfill` works
  away from the board (afforded from self by the born-with implant —
  the handoff happens at the destination); both verbs carry help
  text.
- **Docs**: a new `docs/subsystems/` doc for the contract/work
  substrate; `banking.md` gains the leg-kind vocabulary section;
  `employment.md` gains the comp-basis terms; the livelihood slate's
  §5.3/§6 built-state markers updated at sweep.

## Cross-references

- Seeding slate: [livelihood-slate](../slates/builds/livelihood-slate.md)
  (§5 the work model, §6 the arrangement schema; §7–§8 are later
  builds).
- Subsystem docs: [employment.md](../subsystems/employment.md),
  [banking.md](../subsystems/banking.md),
  [mql.md](../subsystems/mql.md) (system mode),
  [command-spec.md](../subsystems/command-spec.md),
  [belief.md](../subsystems/belief.md) (regard),
  [chattel.md](../subsystems/chattel.md) /
  [parcel.md](../subsystems/parcel.md) (events-chain precedent).
- Related in-flight requirements: none (apartment-requirements is a
  separate track).
