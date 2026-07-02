# Corpos slate (working doc) — the marks and the fault line

> **Status: the model is settled; the roster is authored (v1, booze slice);
> the player-facing faction gameplay is now DESIGNED (Phase 2, below) but
> unbuilt.** Corpos are a handful of
> fictional megacorps that own most of the private sector — a cross-cutting
> **affiliation/competition fault line** for players, and a **mark** stamped
> on the actual goods of the world. Driven into existence by Dave's Bar
> needing its brands *truthfully owned*; foundational world-content well
> beyond it.

See also:
[vision.md](../../vision.md) (the origin sketch — "Organizational Affiliation
/ Corporations," tentative) · [advancement-slate](./advancement-slate.md)
(**corp = the cross-cutting third social axis**, guild/party/corp) ·
[daves-bar-slate](./daves-bar-slate.md) (the first consumer — the back-bar's
booze is corpo-owned) · [affiliation-slate](../deferred-rpg/affiliation-slate.md)
(related deferred faction/org work). Substrate: provenance/maker's-mark (the
mark), [belief](../../subsystems/belief.md) / renown (the approval scope).

---

## The world frame

**A handful of megacorps own most of the private sector; independents are the
exception, not the rule.** Entirely fictional (per vision — separate from any
real-world entity). **Five** corpos plus **the independents** — enough for real
tribal allegiance and rivalry, few enough to stay legible. Each corpo is
distinguished by **sector-of-origin + culture/ethos + aesthetic**, *not* crude
Good/Evil (that clashes with "value as physics, not RPG" and makes the fault
line moralistic instead of tribal). They are *all* self-interested; what differs
is **how they operate and what they value** — and each ethos is a magnet for a
different player temperament, which is what makes affiliation a real, arguable
choice.

## The model — a mark + a multipolar approval vector

Two pieces, modeled cleanly (**not** `GroupApi` — that's for player groups):

- **A corpo is a *mark*** — a brand stamp on things, riding the
  **provenance / maker's-mark** layer (provenance at corporate scale: "a product
  of [Corpo]"). A corpo is a **reference-identity** — an `Idea` singleton, the
  same shape as `Material` / `Species` / a brand — and **brand → corpo** is a
  stamp resolving to one authored corpo. The mark is a **queryable property on
  every product, business, and venue** a corpo touches: *the real thing every
  Stuff instance carries.* Independents carry **no** corpo mark.
- **Player ↔ corpo is a multipolar faction-approval vector** — *not*
  membership. You hold a **signed standing with each corpo independently**
  (beloved by one, blacklisted by another, neutral on a third); the **pattern
  across all corpos *is* your factional identity** ("a Populist loyalist,"
  "anti-corpo," "playing both sides"). You affiliate **by conduct, not a click**:
  patronize a corpo's brands / work for them / advance their interests → up;
  favor rivals / go independent → down. So everyday play *is* your corpo
  politics, diegetically (conduct → reputation, multipolar). The **independent
  path** is a *region* of the approval-space (low/neutral across all corpos),
  not a faction to join. Substrate home: probably **regard/renown scoped to
  corpo entities** — open, not asserted.

The fault line: affiliating confers **built-in collaborators and antagonists**
spanning every discipline (corp is *cross-cutting* — your corpo has fighters,
merchants, scholars; you align on loyalty/economics, not craft). Corpo-vs-corpo
rivalry plus corpo-vs-independent tension is PvP/PvE structure emergent from
*economics*, not an arbitrary red-vs-blue.

## The roster (v1)

Names and aesthetics are the founder's to finalize; the *ethos* slots are the
load-bearing part. Each entry: origin sector · ethos · aesthetic · temperament
it magnetizes · signature booze (each corpo owns a wider portfolio; booze is the
first authored slice for the bar).

- **Veshko — the Ruthless Optimizer.** Heavy industry / materials / logistics ·
  efficiency, vertical integration, "results are the only morality" · brutalist
  grey, a wordmark not a logo · *pragmatists, min-maxers* · **Volk** vodka — the
  cheap, ubiquitous well-rail default; industrially perfect, soulless, fine.
- **Goodkin — the Paternalist.** Consumer staples / food / household ·
  "we take care of our own," company-town loyalty, benefits that bind · warm
  sunrise colors, a friendly mascot, folksy-but-corporate · *belonging-seekers
  (and it unsettles others — the velvet cage)* · **Goodkin Reserve** — a
  nostalgic blended whiskey, "the one your dad drank."
- **Vionne — the Prestige House.** Luxury goods / fashion / media · status,
  exclusivity, "you've arrived" · gold-on-black, minimalist-expensive serif ·
  *status-seekers, aesthetes* · **Vionne Noir** — a fancy-bottled gin you order
  to be *seen* ordering; the overpriced-premium where price≠quality bites
  hardest (good, not transcendent, priced like a religion).
- **Hollis — the Populist.** Mass retail / fast food / cheap goods ·
  anti-elitist, "honest value for honest folk," loud cheerful marketing (while
  being a megacorp) · bright red-and-yellow, jingles, a wisecracking mascot ·
  *the everyman, the anti-snob* · **Old Hollis** — cheap, cheerful, proud of
  being cheap; the anti-Vionne.
- **Aevex — the Disruptor.** Tech / augments / synthetics · innovation, "the
  future, now," slightly evangelical · sleek white-and-neon, lowercase, glassy ·
  *early adopters, futurists* · **aevex zero** — a lab-engineered synthetic
  spirit, uncanny-perfect, divisive (purists recoil, futurists evangelize).
- **The Independents** — *not* a corpo, no mark: the microdistillers, the family
  operations, the craftspeople who refuse the corpo path. Small-batch,
  premium-*positioned*, the home of the anti-corpo stance and the eventual
  **player-distiller**. (Dave's carries a few — e.g. **Crowsfoot Gin** out of
  some local outfit — plus the house infusions.)

**Rivalries (the fault-line map):**
- **Vionne vs. Hollis** — the class war, elite vs. everyman (siding with one
  antagonizes the other's loyalists).
- **Veshko vs. Aevex** — old industry vs. new tech; the future of *how things
  get made*.
- **Goodkin** floats apart — the one everyone has *feelings* about.
- **Independents vs. all of them** — the structural outsiders.

The legibility payoff (on Dave's back-bar): Volk in the well, Vionne Noir up top
catching the light, Old Hollis beside it for regulars who'd rather die than pay
for Vionne, a lonely aevex zero nobody trusts, a Crowsfoot Gin from the little
place across town. **The shelf itself takes a side** — exactly the diegetic,
conduct-driven affiliation the model wants.

## Scope

- **Near-term (forced by Dave's Bar): the marks + the booze portfolios.** Author
  the five corpos as mark-identities and assign brand ownership, so every bottle
  is truthfully owned. This is the only corpo work the bar needs.
- **Phase 2 (the cross-cutting-axis build) — now designed below, unbuilt:** the
  multipolar approval vector, competition, sponsorship, and approval→access.

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

- **Portfolios beyond booze** — each corpo owns a wide line (augments, food,
  tools, media…); authored as consumers need them (content pacing, not a
  design fork).
- **Player-founded corpos** — the deferred apex (above); revisit with
  economy/cooperative maturity.
- **Numeric tuning** — conduct→standing rates, the rival-tanking coupling,
  approval→access thresholds. Tuned against a running game.

*(Approval-substrate, competition/sponsorship, and independents are resolved
in the Phase 2 design above.)*
