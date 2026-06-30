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
