# Amendment-library slate (working doc) — "political legos"

> **Status: the concept is settled; the *catalog* is the open, growing work.**
> The [draft constitution](../../governance/draft-constitution.md) ships as a **bare-bones
> kernel** — the firewall, the machine, and the provided tools, identical for
> every community on the platform. This slate specs the layer *on top*: a
> shared **library of model amendments** — pre-drafted, vetted, composable
> "political legos" a community adopts (through the kernel's ordinary Art. X
> process) instead of re-solving due process, monetary policy, or term limits
> from scratch. Model legislation meets a package registry meets the Creative
> Commons license picker: **governance-as-config for non-lawyers.**

See also:

- [draft-constitution.md](../../governance/draft-constitution.md) — **the kernel.** Its
  three-floor test (firewall / machine / deferred) is what *defines* a module
  slot: everything on floor 3 (rights, economy, roster, tool-adoption) is a
  library entry, not kernel text. Modules are adopted through its **Art. X**
  amendment process — there is no special mechanism; a module is just an
  amendment *someone already wrote and vetted.*
- [cooperative-slate.md](./cooperative-slate.md) — the governance design the
  modules draw from (chambers, influence, the provided tools, the throughlines).
- [economy-slate.md](./economy-slate.md) — the reserve / central-bank design,
  packaged here as the **economy module** (the kernel mandates only the
  firewall; *which* economy is a lego).
- [argument-map-slate.md](../tails/argument-map-slate.md) — the deliberation surface a
  **free-expression** module compels.

---

## The spine

1. **Kernel ships to all; the library is opt-in.** The constitution is
   deliberately minimal and identical everywhere. A community *differs* from
   its neighbors only by which modules it has adopted — never by editing the
   kernel. (Editing the kernel is a *fork*, Art. X §4; adopting a module is
   not.)
2. **A module is a pre-drafted amendment, nothing more.** No new mechanism: a
   lego is an Art. X amendment, authored once, vetted, and parked in the
   catalog for any community to adopt verbatim. Adoption runs the ordinary
   ratification path; the only thing saved is the *drafting and the footgun-
   hunting.*
3. **Most modules remove operator discretion over tools the kernel already
   built.** The executive builds the apparatus once and a community *already
   runs it* — a streamer hearing their own ban appeals is the judiciary at a
   jury pool of one. A module surrenders some operator discretion over it:
   **due process** widens the judicial jury pool from the operator to a
   sortition of equals and binds the operator to the verdict; **free
   expression** compels the deliberation surface and makes protected speech
   unsanctionable. The module ships no machinery — only a *constraint* on
   machinery that is already running.
4. **Composability is the hard requirement.** Modules must compose without
   silent conflict. The catalog carries dependencies and conflicts like a
   package manager (module *Property* may depend on a *Records/Privacy*
   module; *Term-Limits* conflicts with *PM-for-life*). Conflict resolution is
   at adoption time, not after.
5. **Curation has tiers.** A **standard library** (vetted, drafted to the
   kernel's own discipline — well-formed, footgun-free) versus
   **community-contributed** modules (use-at-your-own-risk until promoted).
   Same shape as a registry's official vs. third-party packages.
6. **Presets are distros.** Most communities won't assemble modules one by one;
   they pick a **bundle** — a curated set for a community archetype — and
   refine from there. The on-ramp is a preset, not a blank page.

---

## The catalog (initial legos)

Everything this build *deferred* is a slot. The starting set:

- **Rights modules** (floor-3, compel-a-tool):
  - **Due process** — widens the judicial jury pool from the operator (a pool
    of one) to a sortition of equals and binds the operator to the verdict
    (Art. VI): the async case process is unchanged — *who judges* and *whether
    the operator may override* are what move.
  - **Free political expression** — compels the deliberation surface; bars
    sanction for protected speech; bars judging by reputation over merits.
  - **Property** — in one's creations and holdings (depends on a records
    module). *A non-empty floor of this is now **kernel*** — every instance
    guarantees a holder a due-process-protected core the executive cannot
    seize at will ([polity-decision-register](../../polity-decision-register.md)
    Tier 1, *Resource & territory*). The module sets only *how far above the
    floor* the bundle extends.
  - **Privacy** — record-gating policy (integrity preserved, access by due process).
- **Economy module** — the reserve / central-bank from the economy slate:
  quantity-not-price monetary policy, the dual mandate, treasury-execution
  wiring. The *big* lego; a community may instead adopt a gift-economy module,
  or none (kernel requires only the firewall).
- **Tenure & compute-allocation module** — *how* a group comes to **hold** a
  subdivision, and how the one real scarcity (compute) is allocated. Three
  regimes as the module's settings: **homestead** (build-to-hold; the
  *Frontier* default — register D8), **chartered grant** (the legislature
  grants territory + a compute quota), **commons** (no private title;
  Ostrom-style collective pool). Pairs with a compute-allocation mechanism
  (market / quota / commons-pool) riding the kernel rule that allocation be
  *rule-bound, not discretionary*. The **centralization↔federalism dial**
  lives here: the kernel guarantees a protected holder-floor
  (federal-by-construction); this module sets how far above it a community
  sits (centralized-by-degree). Where uniform structure matters most — for a
  future inter-instance federation — is why that floor is kernel, not a lego.
- **Institution-roster module** — charters for operations / treasury-execution
  / enforcement / onboarding / content-stewardship (Art. V §4's default roster,
  packaged). Sub-modules per institution so a small community charters only
  what it needs.
- **Executive modules** — **term limits**; constructive-no-confidence tuning;
  investiture thresholds.
- **Judiciary modules** — the two core knobs (**jury-pool composition**, from
  pool-of-one toward full sortition; **bindingness**, overridable → binding),
  plus sortition parameters (pool sizes, tenure thresholds, over-draw factor),
  the reasoning-rule set, and appeals depth.
- **Merit modules** — the asymmetric recognition channels (Art. III §§6–7):
  the consumer **renown** wiring (regard as a bounded multiplier on earned
  influence; optional peer-allowance sourcing — never a standalone mint) and the
  producer **merit-pay** bank (a legislature-capped, competence-evaluated,
  recusal-gated, sub-decisive mint of *producer* influence only — merit pay for
  unpaid creators).
- **Membership / Sybil module** — the participation threshold, the
  Sybil-resistance policy, citizenship gates (fills Art. II's `[OPEN]`).
- **Emergency-powers profile** — the sunset window, the post-hoc-review terms
  (fills Art. XIII's `[OPEN]`).
- **Representation modules** — caucus rules, delegation, party structure.

## Presets (distros)

- **Operator's table** — the default made explicit: the judicial process run at
  a **jury pool of one**, overridable — a streamer's own ban-appeal flow, no
  discretion yet surrendered. The shape a streamer starts in. Pairs with the
  **homestead / Frontier** tenure setting (register D8) — the lowest-activation
  on-ramp.
- **Creator collective** — producer-weighted, light economy, due process on,
  property on; expression compelled.
- **Full republic** — every right compelled, full economy, full institution
  roster, sortition judiciary mandatory. The end state Art. XI ratifies toward.

## Standard-model situation

Each module is a **version-controlled amendment document** (the same
versioned-law-document thread the argument-map leans on) — a `Document`-backed
artifact, not world-tree `Stuff`. The **catalog/registry** is itself a
Document: a list of available modules with metadata (tier, version,
dependencies, conflicts). Adoption is an Art. X ratification that writes the
module into the community's constitution and the tamper-evident archive.
Resolution — "do these modules compose?" — is a **governance package manager**
check run at adoption time.

## Prior art (where to draw / what to avoid)

- **Model legislation** — the Model Penal Code, the Uniform Commercial Code
  (the good: vetted, reusable, a common vocabulary across jurisdictions); ALEC
  model bills (the caution: pre-drafted law as a *capture* vector — curation
  and transparency are the antidote).
- **Package registries** (npm / apt / Nix) — dependency, version, and conflict
  resolution; official-vs-community tiers; the supply-chain-trust problem the
  curation tier inherits.
- **Creative Commons license chooser** — composable legal modules a non-lawyer
  assembles from a menu; the exact "governance-as-config" ergonomic to copy.
- **Comparative-constitution corpora** (the Constitute Project, template
  constitutions) — the menu-of-provisions pattern at constitutional scale.
- **DAO governance frameworks** (Aragon / Colony / DAOstack templates) —
  governance-as-config already tried; what they lacked is *our* throughline
  (no engagement substrate, so the configured polity went apathetic — the game
  is the engine they didn't have).

## Buildable now — the small-scale slice (v1)

- a handful of **hand-authored standard-library modules** (due process,
  free expression, term limits, the economy module) as static amendment docs;
- the **catalog** as a flat Document list with minimal metadata;
- adoption via the existing Art. X path (no automated conflict resolution —
  hand-checked at first);
- one or two **presets** (Operator's table, Full republic) as named bundles.

This is enough for the first communities to onboard with a *choice* rather than
a blank constitution — the on-ramp the whole reframing is for.

## Open problems — deferred to scale

- **Conflict / dependency resolution** — the governance package manager
  (compose-check at adoption). Hand-checked in v1; automated later.
- **The curation / vetting pipeline** — who promotes a community module into
  the standard library, and the footgun-review standard (the kernel's own
  three-floor discipline, applied to modules).
- **Module versioning + community upgrades** — how an adopted module is updated
  when the standard-library version advances (opt-in re-ratification).
- **Inter-community portability** — a module authored in one community surfaced
  for another; the shared vocabulary that makes legos *inter*operable.
- **Capture-resistance of the catalog itself** — the ALEC caution: keep
  module provenance and curation transparent in the archive, so a popular-but-
  bad module can't masquerade as vetted.
- **A full surface doc** — graduates to `docs/subsystems/` once a slice ships.

---

## The US-amendment walk (2026-07-31)

A gap-finding exercise: the US Constitution's amendments, amendment by
amendment, against this platform. Three outcomes — **KERNEL** (already
guaranteed, not a module), **HAVE** (already in the catalog above), and
**GAP** (a drafting candidate). The exercise's value is the gaps; the
kernel findings are almost more interesting.

### Already kernel (do not draft these — they exist)

- **Petition (1A)** — the **open floor IS the petition right**: anyone
  may put a proposal down, and every decision starts there. Built.
- **Self-incrimination (5A)** — the intrinsic/social split
  ([enforcement-slate](./enforcement-slate.md)) is **stronger than the
  original**: traits are not merely privileged, they are
  **inadmissible**. No court subpoenas who you are.
- **Involuntary servitude (13A)**, in part — **exit is bedrock**;
  nobody can be bound to stay. What remains draftable is indenture
  *within* the world (below).

### Already in the catalog

Speech (*free political expression*) · due process · privacy ·
property · term limits · judiciary knobs · representation.

### The gaps — drafting candidates

| Amdt | Module | Note |
|---|---|---|
| **1** | **press freedom** | the big one — see [press-slate](./press-slate.md) |
| **1** | **religion: establishment** | may a locality fund/require a faith from its treasury? |
| **1** | **religion: free exercise** | may it *ban* a practice? The hard case already exists: sentient sacrifice is designed as evil — the exact shape of a real free-exercise conflict, made safe by fictional pantheons |
| **1** | **assembly** | may a committee bar gatherings on public land, given venues are property? |
| **2** | **arms** | offered, never imposed (ranged-slate) |
| **3** | **quartering** | may the state billet officers in your rooms? Real given officer quarters + the allowance cascade |
| **4** | **search standard** | when may a guard search person, home, inventory? Sharpens *privacy* with the evidence firewall |
| **5** | **takings** | may the polity take a parcel, with compensation? The registry makes it concrete |
| **6** | **speedy trial** | ⚠ **pressing** — async justice can strand someone *forever* with no clock |
| **6** | **confrontation** | pairs directly with the testimony model (face your accuser's claim) |
| **6** | **counsel** | makes **advocacy a profession** |
| **7** | **civil jury** | contract disputes — escrow + clauses already supply the docket |
| **8** | **punishment ceiling** | perma-death? total forfeiture? indefinite confinement? Answers [prison-slate](./prison-slate.md)'s open ceiling |
| **10** | **reserved powers** | the federalism statement; partly in the tenure module, deserves its own |
| **13** | **no irrevocable contract** | debt bondage / indenture: a contract must never alienate exit |
| **14** | **incorporation + equal protection** | ⚠ **structurally the biggest**: does the floor bind *localities* or only the Compact? And may a locality discriminate by clade — the allegory with teeth |
| **15/19/26** | **suffrage by category** | may standing be barred by species or origin? Same allegory, different clause |
| **16** | **taxation power** | does a locality have one, in what forms? |
| **18/21** | **prohibition + repeal** | the best teaching pair in the document — a ban that failed and was *undone*; smuggling already emerges mechanically |
| **23** | **capital representation** | do the City of Saxonberg's residents vote? DC's exact problem, on Compact land ([saxonberg-city-slate](./saxonberg-city-slate.md)) |
| **25** | **succession & incapacity** | ⚠ **pressing** — the PM goes linkdead. Not hypothetical in an online polity |
| **27** | **officer pay** | self-dealing on salary; the budget lines exist |

**Added by the press/secrecy pass (2026-07-31):**

| — | Module | Note |
|---|---|---|
| **1A-adjacent** | **classification / transparency** | who may seal official records, for how long, under what review — and the FOIA path (request → refusal → appeal). *Seal, don't hide*: existence public, content withheld ([press-slate](./press-slate.md)) |
| **1A-adjacent** | **private association** | any group's private comms as a *right*, symmetric — distinct from state classification, which is a *power*. Required so in-game politics stays in-game rather than migrating to Discord |
| **conflict** | **source protection ⊗ confrontation** | a catalog-level *conflict* entry, not a module: the press module's privilege and the confrontation clause's right genuinely oppose |

**Three flagged as urgent rather than fun:** *speedy trial* and
*succession* are operational problems an online polity will hit early,
and *incorporation* decides whether every other module binds one layer
or two — it should be settled before the catalog grows.

## The executive veto (module — added 2026-07-31)

**(User: "a veto power for the PM — it ensures things that are
technically challenging or risky to enforce have a higher bar to
clear.")** Note the rationale: this is a **feasibility veto**, not
the usual balance-of-power one — and it suits this world, because
**the executive really is the engineering org that must build and
enforce the thing**, so it is the party that knows the cost.
"Governing is shipping software" makes the veto *engineering
pushback on a spec* — and "unenforceable" is a legitimate veto
reason in real practice too.

**It bites hardest exactly where intended:** on **directives** (the
CR class in [legal-code-slate](./legal-code-slate.md)) — the
instruments that create executive work. Self-executing instruments
(parameters, prohibitions) burden the executive far less, so the
feasibility argument is weaker there, and the asymmetry shows
naturally.

**Overridable by supermajority is the "higher bar"** — technically
risky things need *more consensus*, never prohibition. Sits in the
existing **Executive modules** group beside term limits,
constructive-no-confidence tuning, and investiture thresholds.

### Two flavors, and the reason to split them

| | Says | Override |
|---|---|---|
| **Return for cause** | "this cannot be built as written — here is the cost and the risk" | lower bar; often just a redraft |
| **Veto** | "I object" | higher bar — the political one |

**With a single veto, every objection gets dressed as feasibility.**
Forcing the PM to declare which — **on the record** — is an
accountability gain, and a PM whose technical objections repeatedly
prove false becomes visible. That is the check on the check.

### Open

- **Does it reach amendments?** Usually not — constitutional change
  typically bypasses the executive, and welding something above
  ordinary law argues for that.
- **The override threshold in a three-chamber system** — 2-of-3 is
  the ordinary bar, so an override presumably wants supermajorities
  *within* chambers rather than a fourth body.

### The mechanic, settled: a veto RAISES THE THRESHOLD (added 2026-07-31)

Worked in [legal-code-slate § The veto window](./legal-code-slate.md).
A veto does **not** kill a bill — the bill stays on the floor and keeps
accumulating, and enacts if support crosses the **override bar**. So:

- **there is no override ceremony to design** — the override *is* the
  same continuous accumulation against a higher line;
- the bar uses **units already in hand** — breadth 3, depth +X, or both;
- **a veto makes a law harder, never impossible.**

**Which is where the two flavors land: technical and political
objections raise the bar by *different amounts*, on the record** — and
a PM whose technical objections keep proving false is visible in the
docket. Rails: **one veto per bill** (the raise persists), and the
charter declares **which instrument types are vetoable**. *Return for
cause* is untouched — it sends a bill back to the proposal stage
instead of raising its bar, which is exactly the difference between
return and veto.

### The pocket veto is excluded by construction (added 2026-07-31)

Worth knowing before drafting override rules: **enactment has no human
actor.** The governance sweep owns crossing detection, hold-through
expiry, and enactment, so the pipeline is **crossing (machine) → veto
window (human *may* act) → enactment (machine)** — see
[legal-code-slate § The sweep](./legal-code-slate.md).

> **The executive's power is to *stop*, never to *complete*.** So an
> office cannot quietly kill a law by declining to act on it: **no act
> was ever required.** The pocket veto exists only if a charter
> explicitly grants one — which makes it an *available lego*, never a
> silent default.

A real institutional pathology excluded **by construction rather than
by rule**, and it reads well diegetically: *the legislature's assent is
the act; enactment is a consequence, not a ceremony.*

### ⚠ Cross-module interaction: veto × sunset

**Vetoing a *renewal* is far more powerful than vetoing an
enactment**, because with a sunset in play the executive need not
overcome the status quo — **the status quo is already death.** A PM
who wants a law gone can simply decline its renewal and run out the
clock. Exactly how real shutdown politics works, and any polity
adopting both modules should be able to see it coming. **This is
what the catalog's conflict/dependency metadata is for.**

## The roll: disenfranchisement by inactivity (module — added 2026-07-31)

**(User, 2026-07-31.)** A **lego**, not a kernel default — because it
is *the* historically abused mechanism, and the point of the library
is that abusable things get argued about rather than assumed.

Designed in full in
[legal-code-slate § The roll](./legal-code-slate.md). The short form:

- **What it does** — after a declared window of inactivity, a member
  leaves the **roll** (the `totalStanding` denominator that `turnout`
  and `support` are measured against). **Standing is untouched**;
  return re-enfranchises **immediately and automatically**.
- **What it insures against** — without it, a churning population
  makes quorum unreachable and the only remedy is **lowering
  `vote.quorum`**, a **one-way ratchet** held by the very group a low
  quorum empowers. The fix belongs on the denominator (automatic,
  neutral), not the threshold (discretionary, irreversible).
- **The load-bearing rail** — **restoration must never be
  discretionary.** The instant re-enfranchisement requires someone's
  decision, the module is a suppression tool. Also: notice before
  removal; affects the roll and *nothing* else.
- **⚠ Decay keeps running while off the roll**, or the module
  resurrects the park-and-return exploit. Shape:
  **re-enfranchisement is instant, re-empowerment is earned.**

**Catalog metadata:**

| Field | Value |
|---|---|
| **Axis** | franchise / eligibility |
| **Parameter** | the inactivity window (organic law) |
| **Depends on** | a standing-based electorate (any conviction-weighted chamber) |
| **Conflicts with** | opt-in registration (an alternative that starts degraded rather than degrading slowly) |
| **Tier** | organic — the window is tunable; the mechanism is structural |

**Why it belongs in the library specifically:** roll maintenance is
genuinely necessary *and* genuinely abused, and the whole fight is
**"how long is prolonged, and who decides?"** The sympathetic case is
concrete — the **seasonal player**, hard in winter and gone all
summer — so a legislature setting the window is having the real
argument, not a costumed one.

## Elections (module — added 2026-07-31)

**Elections are a lego, never a kernel feature.** The kernel's
executive is **parliamentary**: the PM holds office by commanding the
confidence of a majority of chambers, and direct election would make a
**president with a rival mandate** — see
[cooperative-slate § How the prime minister is chosen](./cooperative-slate.md).

So the module never reaches the PM. It offers **elected seats** in the
three places a polity might legitimately want them:

| Target | Notes |
|---|---|
| **chamber-internal representative seats** | Art. IV §6 already lets a chamber create them; the *emergent* alternative is delegation, which needs nothing built |
| **the apparatus offices** (the five seats) | the constitution's default is PM appointment — *legitimacy is the PM's, competence is the institutions'* |
| **locality governments** | where Tiebout does the arguing |

**Catalog metadata:**

| Field | Value |
|---|---|
| **Axis** | selection method |
| **Parameters** | term length, eligibility, whether terms are limited |
| **Depends on** | an office to fill (governance's seat apparatus) |
| **Conflicts with** | *emergent representation* via delegation (both can exist; they compete for the same job) |
| **Never applies to** | the Prime Minister — kernel-fixed as confidence-held |

> **The pedagogy is the point: let a polity elect its central bank
> governor and find out.** Electing regulators is a real and widely
> criticized design, and **discovering why beats being told** — the
> library's whole thesis, with a worked example.

## Free movement of goods (module — added 2026-07-31)

**The Commerce Clause, and the failure that produced it.** Out of the
[freight slate](./freight-slate.md)'s tollgate design: if every
locality may toll goods crossing its border, **trade fragments** —
exactly the failure the Articles of Confederation had, and exactly why
the Commerce Clause exists.

- **What it does** — bars **discriminatory tolls and internal
  tariffs** at the Compact tier: a locality may charge for *use of
  infrastructure it owns* (a turnpike, a bridge), but may not charge
  goods **because of where they come from or go**.
- **The distinction that carries it** — **cost recovery vs. barrier to
  trade.** A weight-based toll on a road you maintain is the former (a
  heavy wagon really does more damage); a levy on *foreign* grain is
  the latter. The line is drawn by *what the charge varies with*, which
  is legible in the toll's own parameters.
- **Why it belongs in the library rather than the kernel** — **a polity
  that does not adopt it gets to discover why it exists.** That is the
  library's whole thesis, attached to one of the genuinely important
  lessons in federalism.

**Catalog metadata:**

| Field | Value |
|---|---|
| **Axis** | inter-jurisdictional commerce |
| **Tier** | Compact-level (it binds *localities*, so a locality cannot adopt it for itself) |
| **Depends on** | jurisdiction (the coverage walk) + parcel title — both shipped |
| **Conflicts with** | locality revenue modules that rely on transit levies |
| **Pairs with** | rate caps on chokepoint tolls (the small-scale antitrust response — historically real for turnpikes) |

> **The pedagogy: the argument for adopting it is invisible until
> somebody defects.** One locality tolls its neighbour's grain, the
> neighbour retaliates, and the case for a common rule writes itself —
> in the docket, out of real acts.

### Sibling: the common-carrier duty (added 2026-07-31)

**Same principle, pointed at a facility instead of a border.** From
[freight-slate § The depot as a business](./freight-slate.md): a
**depot's** monopoly is not geographic but a **network effect**
(everyone consolidates where everyone else does), so **a rival cannot
break it** — a depot with no traffic is useless. Which changes the
remedy:

> **The turnpike gets a RATE CAP. The depot gets a DUTY TO SERVE ALL
> COMERS ON EQUAL TERMS.**

**Non-discrimination rather than price control** — historically the
elevator cases and then the ICC. Worth carrying as its own small module
beside *Free movement of goods*, because **the pair teaches that the
remedy has to match the SHAPE of the monopoly**: geographic monopolies
are disciplined by price, network monopolies by access.

## Statutory right-of-way (module — added 2026-07-31)

**The holdout problem, and LULU inverted.** Out of the utilities pass
([delivery-slate § Distribution](./delivery-slate.md)): distribution
networks follow **rights-of-way**, because the road corridor is the only
continuous, publicly-controlled land you can run a main along. But a
line still has to cross **private** ground somewhere.

- **What it does** — grants a chartered utility the right to run
  distribution across private land **with compensation**, rather than
  by negotiated consent parcel-by-parcel.
- **The problem it solves** — **the holdout.** *Everybody* wants the
  water, and **one landowner can block a whole district** by refusing.
  Consent-only is not a neutral default; it hands a veto to whoever is
  most stubborn or most opportunistic.
- **The symmetry worth teaching** — this is **LULU inverted**
  ([zoning-slate](./zoning-slate.md)): LULU is *nobody* will host the
  thing everyone needs; holdout is *anyone* can block the thing everyone
  needs. **Same collective-action failure, opposite sign**, both
  resolving **upward**, both with **compensation** as the honest
  mechanism.
- **Why it is a lego, not kernel** — it is a genuine taking, and a
  polity that values absolute title should be able to **decline it** and
  discover what unserved districts feel like.

**Catalog metadata:**

| Field | Value |
|---|---|
| **Axis** | property vs. infrastructure |
| **Parameters** | compensation basis; which services qualify; whether a route must be *least-intrusive* |
| **Depends on** | parcel title + a chartered provider |
| **Pairs with** | the **LULU siting/compensation** module (the inverse case) |
| **Conflicts with** | an absolute-title property module |

> **Both halves are the same lesson from opposite ends: some goods
> cannot be assembled by consent alone, and the honest answer is not
> force but *force plus payment*.**

## Full faith and credit (module — added 2026-07-31)

**Does a Terminus deed mean anything in Hinkley Hills?** A judgment? A
marriage? A charter? Out of the notary decomposition
([insurance-slate § the notary](./insurance-slate.md)), which found
that cross-jurisdiction recognition is **constitutional, not
notarial** — there is no job here, there is a rule.

- **What it does** — obliges a locality to **recognise instruments,
  titles and judgments** validly made in another.
- **Why it matters immediately** — a **suburb next door** makes it
  concrete rather than theoretical: **the first cross-border deed is
  the test case**, and freight makes cross-border *contracts* routine.
- **The failure without it** — every locality is an island: deeds do not
  travel, judgments are unenforceable one street over, and a debtor
  escapes by moving. **Forum-shopping and evasion by relocation** are
  the emergent pathologies, and they are *exactly* what the doctrine
  was written to stop.
- **The honest tension** — recognition also **imports** the other
  polity's choices. A locality that bans a practice must still honour a
  neighbour's instrument enacting it. **That is the whole real
  argument**, and it is a good one to make players have.

**Catalog metadata:**

| Field | Value |
|---|---|
| **Axis** | inter-jurisdictional recognition |
| **Tier** | Compact-level (it binds *localities*) |
| **Depends on** | the parcel registry + the document tree + jurisdiction |
| **Pairs with** | **Free movement of goods** (the commerce half) — this is the **instruments** half |
| **Partial adoptions** | recognise *titles* but not *judgments*; recognise but with a **local registration** step (the apostille shape) |
