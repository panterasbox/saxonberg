# Land, Compute & License (design doc)

> **Status: design capture, not built.** Records the 2026-07-16 design session on
> the property/federalism/compute/licensing model. Deepens and connects several prior
> threads — see [cooperative-slate.md § The money membrane](./cooperative-slate.md)
> (economy), [§ How territory is held](./cooperative-slate.md) (tenure floor), and the
> memory notes `property-substrate`, `tenure-federalism-resolution`,
> `residential-realestate-progression`, `content-packs-slate`. Nothing here changes
> shipped code; it's the conceptual + mechanism design behind the compute economy and
> the license regime. **The video treatment is manifesto `rerecord-appendix-b.md`
> ("The Land")** — a *descriptive/anthropological* appendix, downstream of
> `rerecord-appendix-a.md` ("Ratification & the Dials"), since most of what's here is a
> dial a community sets at ratification.
>
> **The spine:** *the same public/private structure appears three times — in the land,
> in the compute, and in the license — because they're one system seen three ways.*

## Movement 1 — The land is the code

- **The land = the code/data namespace** — the three trees (source / templates /
  documents), carved into **parcels** (the shipped parcel-title substrate:
  `subdivide` / `parentParcel` / `PathTrie` longest-prefix). A parcel is a titled
  patch of the namespace.
- **A parcel carries three independent things:**
  - **title** — who owns it: personal / group / commons.
  - **compute** — its meter, from birth (see Movement 2). *Compute rides on the
    parcel, not on publishing.*
  - **publish-state** — is it live in the shared world? The **permissions / state-access
    axis**, the anti-cheat boundary.
- **The publish gate** is the security boundary, *not* the compute boundary:
  - **pre-gate / sandbox** (`/home/<playerid>/`, and a group-owned WIP space) — isolated,
    state can't leak, **no permission to touch shared state.** Powerless by design.
  - **post-gate / published** — live, permissioned, mutates real state (Narnia,
    Middle-earth).
- **Public land vs. private land** (the title axis, in the published tier — this *is*
  the federalism):
  - **public / commons** = the kernel (`Stuff.ts`, the Apis, the engine). The shared
    ground every holding stands on. The `core` default in the parcel `ownerOf` walk.
  - **private / estates** = author-held content (Narnia). Due-process-protected.
- **Why it's *federalism*, not just property:** the public kernel is the **supreme,
  shared layer every private holding is bound by** — an estate runs *on* the public
  code and can't override the physics the kernel defines. Federal/local, made of
  **public code over private code.** Lands on Ch 5's *law = code*: public law is the
  public code (the kernel); a private zone's rules are the code it may write above it.
- **Property is protected by due process, not exclusivity.** Access is *not* exclusive
  (oversight reaches everywhere); authority is real because it **binds even the
  executive** — nothing seized without a court. "Authority is the protection, not the
  exclusivity."
- **The "frontier" term drops away** at this level. It was doing two jobs, neither a
  foundational tier: (a) the "shared dev space" = the *group-owned sandbox* cell (an
  ownership question, not a new kind of land); (b) Lockean homestead = a
  *compute-allocation regime* (a module — see Movement 2), because the namespace isn't a
  fixed pie (it's infinite); the scarce thing is the compute, not the land.
- **Group-WIP organization** (a dedicated `/studio/<id>/` branch vs. the general tree +
  an owner tag + search) is an **implementation detail** — deferred, doesn't change the
  model. `/home/` is always personal.

## Movement 2 — The scarcity is compute

Three levels:

- **Level 0 — the pie (total capacity).** The physical box (AWS). Sized by **capital**
  (real dollars from the treasury pay the bill → more funding, bigger box), adjusted by
  the **legislature** (rare). The honest floor under everything — the polity's total
  power is bounded by the server it can afford. **Firewall check:** capital grows the
  *pie*, never buys a *slice* — a whale funding a bigger box grows the commons' total
  compute, allocated by quality, not by who paid.
- **Level 1 — the slices (self-balancing allocation).** The keystone move:
  > **Separate title from entitlement.** *Title* is permanent, protected property (never
  > seized without a court). Compute *entitlement* is a **derived, live value** — how
  > much a parcel gets to run *right now* — computed on-read (the competence / renown /
  > trait precedent, nothing stored, nothing seized):
  > **entitlement = f( producer-standing [track record of quality], demand [engagement],
  > activity [live vs. dormant] )**, with **tunable coefficients** (the dial; set rarely,
  > by the polity — no per-parcel polling, ever).
  - **You never *downsize a parcel*** (that's the dictating to avoid). A low-earning or
    idle parcel's entitlement simply falls; its liveness drifts toward **dormancy**
    ("lights off"); the owner keeps their land the whole time, revivable by adding
    quality or drawing an audience. Responsive, not punitive. Law-2-clean (you're never
    *taxed* for holding; idle self-rations via dormancy; you *earn* liveness).
- **Level 2 — scaling out (deferred).** Sharding a hot parcel into load-balanced copies
  (MMO-style). A new economy dimension ("scale horizontally"). The escape valve when one
  parcel outgrows a single box's slice.

**Over-budget is two different problems (only one needs a human):**

- **Throughput (too many visitors)** — self-caps automatically: a **capacity door**
  (party-aware — your group is admitted as a unit; held slots so you're never split from
  the people you came with). No editing.
- **Baseline bloat (content too heavy even quiet)** — the *only* case needing the human
  edit. **The system sets the budget + the ultimatum; the owner does the cutting** (the
  editorial choice is never the system's). Ladder: **flag + target + deadline → grace
  (keeps running) → uncured → dormancy** (dark, content fully preserved, revivable) →
  truly abandoned → **reversion** (the residency/eviction substrate). Owner's two levers,
  both theirs: **cut** (trim, their call what goes) or **improve** (raise quality/demand
  → the function grants more). **A guaranteed floor**: every parcel gets a baseline it's
  *never* squeezed below (the `/home/` "never spaceless" analog), so the ultimatum only
  ever chases genuine bloat.

**Scarcity must be *felt* — and it must be *legible*.**

- Being turned away at a full door is the mechanism *working*: you learn a shared
  resource is finite and valued only by bumping into it. Don't apologize for the
  friction; it's the whole point of the economy (the cleanest gamification-mirror
  instance).
- The friction is only tolerable if it's **fair and understood** — same DNA as the
  record (verify-don't-trust). When you're in line you can see the **live load** (47/50),
  the parcel's **earned budget** and the visible signals behind it, and the **allocation
  formula itself** (public code, weights set by the polity — not a hidden operator knob).
  And **your waiting *is* the demand signal** — standing in line is the input pushing the
  area's budget up; you're on the demand side of a market, not at the mercy of an
  algorithm. Whether waiting moves the needle depends on the weights (see open Q) — but
  the formula is public, so you can *read* why you're waiting and what would clear it.

**Admission taxonomy — match the model to the content's shape** (don't rank claims at
the door; that's opaque/gameable/firewall-adjacent):

1. **Casual persistent commons** (town square, vista) → equal queue, party-aware door,
   felt scarcity. **The only place the wall belongs.**
2. **Personal / quest / session content** → **instanced** (your own copy), never gated by
   strangers. Urgent *personal* content lives here.
3. **Live shared events** (concert, ceremony) → **ticketed / reserved**, capacity
   *provisioned ahead*. Urgent *group* content lives here.

(2) and (3) lean on the deferred instancing/provisioning (Level 2); near-term they're
"keep timed content off the crowded commons + a reservation seam." Value knob: *how
much* you instance — too much fragments the shared world into single-player bubbles.

**Subsidiarity — the federated allocation (this is the sharpest "federalism"):**

- Allocation is **hierarchical/delegated, not flat.** The public entitlement function
  sizes a **top-level block** (to a managed group / estate); the holder **sub-allocates
  within their block by their own policy, at their own granularity**; children can
  re-subdivide. Turtles down the parcel tree (subdivide / parentParcel already support
  it).
- **The autonomy boundary:** the public formula operates **only at the seam** between the
  commons and the top-level holder. **Below that seam the commons doesn't reach in** —
  your internal quotas are your business. (This is the "trim without dictating" tension,
  resolved by the *boundary* rather than a nicer algorithm.)
- **The Ch 7 dial recurses.** A managed group running its block is a **mini-polity** —
  it runs its internal allocation on its *own* dial (lead-decides → members-vote). The
  operator↔republic dial applies at *every* level, over each level's own block.
- **Accountability recurses to the local constituency.** The commons answers to the whole
  polity (its formula public, on the record); a group's internal split answers to *its
  own members*, not the commons. Legibility is local.
- **Reconciles "territory is property, not politics / no Dept of Narnia":** the *public*
  state stays functional and non-territorial; *private* holders self-govern their held
  blocks (a group can be as political internally as it likes). Federalism = the
  **nesting of self-governing private blocks under the public commons**, each with a
  delegated slice of the one scarce resource.
- **Scaling bonus:** the central formula only ever sizes top-level blocks, not the
  millions of leaf parcels — delegation absorbs the depth. Subsidiarity as a performance
  property.

## Movement 3 — The license is the land, written as law

- **Content:** **CC-by-default, not CC-by-mandate.** Mandatory CC would forbid licensed
  content; an author (or a funded operator) may license on other terms. Open default,
  author's choice.
- **Code — the mechanical reality:** because the platform is mixins-all-the-way-down,
  *every* author extension links against the core (imports `Stuff`, the security gate,
  the mixin machinery) — so under plain **AGPL-3** it's a **derivative work → forced
  open.** "You can't escape the platform": you always compose the core, so you always
  derive. **Today all invention is bound to AGPL** — a dealbreaker for a licensed game
  layer.
- **The resolution — a composition/linking exception** (the LGPL / Classpath pattern;
  legal to bolt onto AGPL via GPLv3 §7 additional permissions). Move the copyleft
  *boundary*:
  > **Modifying the core is copyleft; building *on* the core is not.** Edit a core file
  > → AGPL, shared back. Compose the core's mixins into your *own new* classes → the
  > exception frees them; license as you choose.
  - The **mixin architecture makes the boundary crisp** — not the usual murky
    "is-my-plugin-a-derivative" fight, but an architectural fact: you either edited a
    core mixin or added a new one that composes them. The composition seam *is* the
    license boundary.
- **Two guardrails:**
  1. **Visibility is mandatory everywhere, separate from reuse.** Every running piece of
     code is *inspectable* (the security gate sees all code anyway) → a proprietary
     combat system is **source-visible but not copyable.** Verify-don't-trust survives in
     the licensed tier. Licensing controls *reuse*, never *opacity*.
  2. **The core commons still grows** — the one cost is that *extensions* are no longer
     force-shared; but every improvement to the *substrate* stays copyleft, so the shared
     foundation keeps compounding. Only the towers on it can be private.
- **The license architecture = the land architecture, in law:** **public code = AGPL**
  (the shared law, copyleft); **private invention + content = the author's license**
  (proprietary allowed, visible-but-owned).
- **Distribution — two shippable kinds:** **content-packs** (pure data; CC-default or
  licensed; installed pre-startup) + **code-modules** (invention; AGPL if it touches the
  core, the author's license if it composes-and-extends). A paid "Tower of X" = a
  proprietary code-module + its content-pack, both source-visible, on an open core it
  can't fork closed.

## The kernel/necessity refinement (what's actually constitutional)

The interrogation that reframed the kernel/module split:

- **"Kernel" was smuggling two questions.** *What does the machine need to function?*
  (can it decide at all?) vs. *what does the point need?* (is it worth running?).
- **The test:** *strip it away — can the machine still decide? If yes, it's a choice, not
  a necessity.*
- **The true necessity-kernel is tiny:** the **decision machine** (three chambers +
  branches + amendment process) + **attribution/provenance** (so contributions are
  measurable — the producer chamber runs on *attribution*, not *property*: you keep
  standing earned from past engagement even if the work is later seized) + the **engine
  physics** that keep the shared box from crashing (compute-metering, the security gate,
  an honest record) — which sit *below* the constitution, more laws-of-nature than
  clauses.
- **Everything that makes it *good* — the firewall, property, due process, the compute
  floor — is a *choice the community entrenches*** (eternity clause) or a
  **participation-enabler** (installed at ratification), **not founding kernel.** A
  plutocracy where money buys power *functions* as a decision machine; we floor the
  firewall by *choice*. Property is the same: an amendment-roster / eternity item, not a
  founding necessity.
- **So almost none of the compute economy or the license regime is constitutional.** The
  constitution guarantees *the machine that lets a community choose* its own land,
  compute, and license regime. **Even the floor is chosen** — Ch 7's amendment-roster
  logic, followed all the way down.

## Open questions (values, not mechanism)

- **Quality vs. demand — which dominates the entitlement function?** A brilliant-unvisited
  vs. shallow-popular parcel. Demand-weighted → lines self-clear; quality-weighted → a
  popular-shallow line *persists as a legible values statement*. The coefficient weights
  *are* this choice.
- **The compute floor** — per-citizen or per-parcel, and how big.
- **Whether demand should count at all** (invites building-for-clicks) vs. quality-only
  (purer, slower to reward a newcomer nobody's found yet).
- **Content openness** — mandatory-open vs. author's-choice — turned on the fork right:
  *does forking need to rebuild the whole world, or just the system?* Resolved toward
  **author's-choice (reservable/licensable) + a hard visibility floor** — because the
  compute model already gives authors real property (the live parcel), so copyright
  exclusivity isn't needed to own something, and exit-of-the-*system* survives.
- **Instancing balance** — how much to instance before the shared world fragments.
- **Group-WIP namespace** — dedicated branch vs. tagged-and-searchable (implementation).

## Cross-refs

- Economy home + reconception: [cooperative-slate.md § The money membrane / § How
  territory is held](./cooperative-slate.md).
- Kernel/module + the three-floor test: [../../governance/draft-constitution.md](../../governance/draft-constitution.md).
- Content-packs (the pure-data distribution unit): `content-packs-slate.md`.
- Courts / eminent-domain (the takings path private→public): `courts-judiciary-primitive`
  (memory).
- Video: manifesto `rerecord-appendix-b.md` ("The Land"), downstream of
  `rerecord-appendix-a.md` ("Ratification & the Dials").
