# Corpos slate (working doc) — the marks and the fault line

> **Status: PARTIAL** — phase 1, the mark substrate and the v1 roster,
> shipped → [corpo.md](../../subsystems/corpo.md). The roster's LORE
> shape (ethos-only, no entity form) is itself superseded by
> [institutions-slate](./institutions-slate.md) Part 6, which is a
> still-**unbuilt** design of its own — see the note below.
> **Left:** the multipolar approval vector · competition + rival-tanking ·
> sponsorship · approval→access gates · player-founded corpos ·
> portfolios beyond booze · numeric tuning
> **Size:** a build

> ⭐ **2026-09-18 — the roster's LORE is superseded by
> [institutions-slate](./institutions-slate.md) Part 6**: each corpo is
> now an entity FORM with a charter (Goodkin a credit union, Veshko the
> shareholder bank across the avenue, Vionne a partnership, Hollis a
> public company holding an unexercised charter, Aevex a sole trader),
> and `/corpo/<key>` title moves from the organization to a
> `<key>-committee` group. The mark substrate and the faction axis below
> stand. ⚠ Institutions-slate is itself UNBUILT (its own status block
> says so) — the rewrite is a decision, not yet code; the roster below
> matches what corpo.md ships today.

Corpos are a handful of fictional megacorps that own most of the private
sector — a cross-cutting **affiliation/competition fault line** for
players, and a **mark** stamped on the actual goods of the world. Driven
into existence by Dave's Bar needing its brands *truthfully owned*;
foundational world-content well beyond it.

See also:
[vision.md](../../vision.md) (the origin sketch — "Organizational Affiliation
/ Corporations," tentative) · [advancement-slate](./advancement-slate.md)
(**corp = the cross-cutting third social axis**, guild/party/corp) ·
[daves-bar-slate](./daves-bar-slate.md) (the first consumer — the back-bar's
booze is corpo-owned) · [affiliation-slate](../tails/affiliation-slate.md)
(related deferred faction/org work) ·
[institutions-slate](./institutions-slate.md) (the entity-form/charter
rewrite of the roster, Part 6 — unbuilt). Substrate:
provenance/maker's-mark (the mark), [belief](../../subsystems/belief.md)
/ renown (the approval scope).

---

## The world frame, the mark, and the v1 roster — shipped

The five-corpo-plus-independents frame (not Good/Evil, tribal not
moralistic; each corpo distinguished by sector + ethos + aesthetic), the
mark mechanism (`Corpo`/`Brand` reference-identities, `BrandedMixin`,
brand→corpo resolution), and the authored v1 roster (Veshko, Goodkin,
Vionne, Hollis, Aevex, the independents, the two rivalry pairs, Dave's
back-bar as the legibility payoff) all shipped as authored content and
are documented in full at
[corpo.md](../../subsystems/corpo.md) — see especially § "Why three
axes", § "The mark is diegetic, not the provenance ledger", and § "Authored
content (v1, the booze slice)". ⚠ The roster's *shape* (ethos-only, no
entity form or charter) is what
[institutions-slate](./institutions-slate.md) Part 6 will rewrite —
still unbuilt; see the note at the top of this file.

## The player axis — closed (Phase 2 design)

The mark (Phase 1) shipped; here is the closed design for the **player's
relationship to the corpo landscape** — the third social axis, the **"earn"**
axis (you *form* a party, *join* a guild, **earn** standing with corps).

**The relationship is the standing-vector — not a membership.** You never
"join" a corpo. Each corpo regards you (a signed standing) and your *conduct*
moves each independently; the pattern across all of them *is* your factional
identity. Substrate: **regard/renown scoped to corpo entities** — the
subject-scoped standing shape guild/party reputation already use, **not** a
new faction model. *(Resolves the approval-substrate question: reuse, don't
build.)*

**Employment is the strongest conduct-input — and the closest thing to
"allegiance."** Working for a corpo (the employment engine) is the deepest
alignment: it maxes your standing with them and tanks their rivals'. But it's
*employment + the resulting standing*, recognized by others — **not** a
membership card. "A Veshko agent" = employed-by-Veshko + high-Veshko
standing, worn as recognition. *(Resolves standing-vs-agency: agency is
employment; there is no separate corp-membership primitive.)*

**What the competition is *over*: market + prestige — explicitly NOT
territory.** The load-bearing call:
- **Market** — whose brands and services the world chooses (economic share,
  refereed by the conserved economy). Non-sovereign, conduct-mediated, the
  pie can grow.
- **Prestige** — the world's aggregate regard for a corpo's ethos (the
  approval vector at corpo scale).
- **NOT territory / jurisdiction** — that is the polity's (territory =
  protected resource-tenure / governance). Corps own **property** (venues,
  brands — the mark) and contest **market**, but they do **not** hold
  **territory**. Keeping corps off territory is what keeps them *powerful,
  not sovereign*. *(Splits the old "competition/territory": property + market
  yes, jurisdiction no.)*

**Prosocial by construction.** Take EVE's *structure* (competing factions),
not its *culture* (scam/grief/predation). Because the win-condition is
**comparative excellence** (out-earn, out-prestige) and there is **no
mechanism to destroy a rival corpo** (they're authored, persistent), the
rivalry *cannot* collapse into griefing — you win by being better / more
favored (the house-cup / team-sports shape). Protect this at every
downstream decision.

**The rivals fault-line goes live.** The authored `rivals` edges (Vionne↔
Hollis, Veshko↔Aevex, Goodkin floats, Independents outside) become consumed:
conduct favoring one corpo *tanks its rival*, so the vector has structure
(not five independent dials) and the game plays out along the fault-lines.

**Sponsorship — how a corpo projects into the world.** A corpo charters /
funds an institution — a **guild branch** ("the Aevex Combat Academy"), a
**venue**, a **crew** — lending its prestige to what it backs (a
corp-sponsored guild's certification carries the corp's standing). This is
the corpo↔guild interlock (advancement-slate's "corp-sponsored branches") and
the EVE "corp-branded branch" reinterpreted honestly: **the corp sponsors
*institutions*; it does not hand out player memberships.**

**What standing *does* (the consumers — an access currency, not a power
stat):** contract access (a corpo hires those it favors), venue/amenity
access + prices, sponsorship eligibility (high standing → it backs your
crew/venue/branch), and the recognition halo (others regard you per their
stance toward your corpo). Economic + social access, never a combat buff.

**The mark extends — venues by ownership, people by standing.** `BrandedMixin`
marks *products* today; it extends cleanly to **venues/branches** (ownership
— a Veshko-owned bar *is* marked like a product). **People are NOT
`_branded`** — a person's corpo relationship is their dynamic *standing*
(+ any employment), surfaced via belief/recognition ("a known Veshko agent"),
not a durable ownership stamp. Ownership-mark for things; standing-recognition
for people.

**Independents = a region, not a positive faction.** Being independent is the
*absence* of corpo alignment (low/neutral across all) — a region of the
approval-space, not a unified faction with its own dial. Specific independent
outfits (a named microdistillery) can be authored as their own small
reference-identities later, but there is no monolithic "Independent Guild."
*(Resolves the independents question.)*

**Player-founded corpos: deferred (the apex).** v1 is the five authored
corpos + the independents you earn standing with. A player-founded corpo is
an apex like player-banks — it needs machinery to mint a new `Corpo` Idea,
its brands, and its entry into the rivalry graph — deferred with the
economy/cooperative maturity that supports it. The seam: a new Corpo Idea +
brands + a rivalry edge.

**Governance boundary (the wall).** Corpos are authored institutions /
reference-identities, **not** government (Offices/Chambers). *Powerful ≠
sovereign*: a corpo can economically dominate without legislating, holding
office, or owning territory. Corps compete *within* the polity's rules; the
monopoly of legitimate force and jurisdiction stays the polity's. This is
what stops the faction-game becoming a shadow government.

## Open (residual)

- Portfolios beyond booze — already decided as deferred, documented at
  [corpo.md § Deferred](../../subsystems/corpo.md#deferred) verbatim
  (authored as consumers need them; not a design fork).
- **Player-founded corpos** — the deferred apex (above); revisit with
  economy/cooperative maturity.
- **Numeric tuning** — conduct→standing rates, the rival-tanking coupling,
  approval→access thresholds. Tuned against a running game.

*(Approval-substrate, competition/sponsorship, and independents are resolved
in the Phase 2 design above.)*
