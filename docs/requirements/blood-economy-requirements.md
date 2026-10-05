# Blood-bank economy — requirements

**Kind:** feature (content-led, with thin kernel substrate extensions)
**Leads from:** content — first consumer is the Terminus infirmary blood
bank (the `{category: blood, level: 2, unit: L}` par already authored on
the infirmary Business, today with nothing filling it). The kernel
extensions (a type-aware par read, the gift-credit wiring, the issue
act, the consent predicate) each have that one live consumer in this
same build.

The blood *core* shipped with the clinical-medicine build — `test` /
`bleed` / `transfuse` / `operate` / `prescribe`, blood as a perishable
*typed* unit, the transfusion-reaction, the marrow donation cost — and
cold storage (MR !320) shipped the powered blood fridge that lets a bank
hold a unit for weeks instead of hours. What is still missing is the
**economy around the bank**: nothing produces blood to fill the par, a
gift earns nothing, a shortage is invisible, and there is no civic
institution that holds and issues the supply. This build wires those
over shipped substrate. It executes the `blood-slate` v1 — **gift-only
meaning the donor is never paid** (the patient still pays a service fee
for the processing around the gift); the Titmuss *paid-donor* lever stays
out. Seeding slate: `blood-slate`.

## What already exists

Surveyed this cycle (three product-level passes, paths in the plan's
grounding):

- **The blood core** (`blood.md`, trade-medicine): a player `test`s to
  learn a blood type (the only surface — no sheet renders it; `untested`
  until tested), `bleed`s a unit into a bag (a long durative act costing
  volume + the slow `marrow` reserve), and `transfuse`s a unit back
  (matched restores; unmatched inflicts the transfusion-reaction; saline
  is the volume-expander floor). A drawn unit is a perishable typed
  Material carrying species, type, labelled-flag and donor identity.
- **The demand already exists.** Five `operate` operations each declare a
  `bloodCostL`; surgery is the standing consumer of banked blood.
- **Cold storage** (just shipped): the ward's blood fridge keeps a unit
  cold for weeks; a carried cooler holds it off-grid; the freezer
  compartment makes ice and is explicitly *not* for blood (freezing ruins
  a unit).
- **The par + restock spine** (`employment.md`, `retail.md`): a Business
  authors `parLines: [{category, level, unit, supplier?, exemplar?}]`;
  the `restocks`/`stocks` brains drive a par toward level from a
  `supplier:` Business on a cadence (live at the bar and general store).
  On-hand is a *derived* read (`stockSheetFor`), never stored.
- **The org substrate** (`employment.md`, `governance.md`): a Business
  Idea with `positions` (`fulfills`/`purchases`/`requires:{discipline,
  band}`), a `roster`, `banksAt`, `operatingLocations`, and an
  `appointingAuthority` whose `kind: office`/`committee` carries a
  **founder-default holder** (so the org is never ownerless and the seat
  hands off without touching employment records). Appointed via
  `appoint`/`apply`/`clock`.
- **The three credit ledgers**: the **chronicle** deed (`recordDeed` /
  `recordChronicleOnce`, the `chronicle` verb), **disposition**
  evidence (generosity/compassion, minted from an authored
  `dispositionValence` on an act — ⚠ no act authors one yet; this build
  would be the first), and **renown** (⚠ materialized — a donation that
  raises standing must append *and* schedule a recompute, the shipped
  `seedTo` pattern).
- **The demand channels**: `say`/`shout` (a room ask), the press
  `notice` on the ticker (pull-only, no badgering — the Gazette's
  priced-index beat is the precedent), and NotifyPolicy (opt-in,
  silent-by-default, rate-limited).
- **Accountability** (`accountability.md`): a producer appends a `harm`
  row with a producer-supplied `consent` boolean (the bad-meal
  precedent); a row derives as a crime when `!consented && sentient`.

**Therefore what is genuinely new here is** a thin wire over the above:
(1) **a supplier that fills the blood par** — the divested dispensing
window is restocked from the upstream (collection + distribution) the
corpo *kept*, NPC-fed, so the combat supply exists regardless of players;
(2) **a gift mints credit** — donating appends a chronicle deed +
generosity/compassion disposition + a renown move, while self-use mints
nothing, and the **donor is never paid**; (3) **a type-aware bank** —
shortage is legible by type and the summons names it ("anyone
O-negative?"); (4) **the civic draw** — a seat-gated `issue` of a typed
unit (the gift is not sold; the transfusion carries a **service fee** for
the processing, on the shipped treatment-billing rail), plus the
**donor-card directive + consent ladder** and a harm-on-non-consent
append; (5) **failure is reachable and self-teaching** — the acts permit
the historical mistakes and the record shows what went wrong. Everything
else is rows (including the corpo lore — the Decree, the ghost on the
window).

## Goals

- The infirmary blood bank **holds a typed stock that refills toward par
  from NPC donors on a cadence**, so a combat blood supply exists whether
  or not any player donates.
- Blood is a **universal-service good with an NPC-guaranteed floor**:
  *nobody dies for lack of blood that physically exists — or for
  inability to pay for it.* A dying patient with a compatible unit on hand
  is always served (by the NPC attendant if no player acts; the fee is
  handled after), and no operator — player or corpo — can withdraw that
  floor.
- A player **donating blood as a gift** (to the bank, or to a named
  person in need) earns a recorded deed, generosity/compassion evidence,
  and a move in local standing — and **the same act for one's own use
  earns none of it**. The **donor is never paid** (the gift/sale thesis,
  at the donation end).
- **The patient pays for the service, not the gift.** A transfusion
  carries a **service fee** (the processing/testing/cold-chain around the
  donated unit — not the blood itself), billed on the shipped
  treatment-billing rail; the donor's gift is never commodified.
- A blood **shortage is legible by type** — a named shortage a player can
  read (the press ticker) and a room summons for a specific type — and
  the pull to answer it is the value offered (a life, the credit), never
  a badgering nudge.
- The city's dispensing point is **an independent, privately-operated
  window that still bears the old corpo's name** — the Goodkin ghost sign
  over a door Goodkin no longer runs (the Paramount divestiture). It is
  **NPC-run** (a private proprietor, bound by the floor as a regulation on
  a private operator — the EMTALA shape), and the **upstream supply stays
  the corpo's** — the NPC-backed floor. The *mechanism* is generic (a
  second bank is rows). ⚠ **Deliberately private, not civic** — mixing a
  public charter and a private market in one life-or-death good is the
  messy case (real healthcare); one clean model (private operator +
  regulatory floor) is chosen instead.
- ⚠ **Players do not operate the window in v1 — NPC-run, at least for
  now.** A player participates by **donating** (the gift credit) and by
  **receiving** (consent, `order transfusion`) — the pure-upside halves.
  A player does **not** apply/clock the registrar seat, issue units, or
  make the scarce-unit allocation: handing a player the controls on a
  good whose failure mode is a *third party's* death is the hazard, and a
  *private* player operator sharpens it. The floor is honoured by the NPC
  proprietor. **The player-operator ceiling** (the registrar vocation, the
  values-lens allocation moment) is **deferred** → `blood-slate`.
- **The historical failure modes are reachable and self-teaching.** The
  acts never paternalistically block the mistake (transfuse untyped,
  cross-clade in desperation, skip screening, let the cold chain lapse);
  the consequence and the legible record (accountability + the forensic
  reader) teach what the forebears learned the hard way.
- **Prior consent is first-class — the donor card.** A player sets a
  standing directive on their identity (*will receive / won't receive /
  registered donor*) decided in calm, and a transfusion reads it before
  anything else; the emergency reach is only the fallback when no
  directive exists.
- An authorized attendant can **issue a typed unit** from the bank
  gift-only, leaving a chain-of-custody record; and a transfusion
  **honours the consent ladder** (directive → ask-if-conscious →
  implied-if-dying → a conscious refusal always wins), with a
  non-consented administration recorded as harm.

## Non-goals

- **Player operation of the window** (holding the registrar seat via
  apply/clock, issuing units, the scarce-unit allocation, running drives
  for standing) → `blood-slate`, deferred "at least for now" by user
  decision. The window is NPC-run; players donate and receive. This is
  the floor/ceiling split's ceiling, deferred.
- **The paid market and its policy lever** → `blood-slate` (the Titmuss
  lever), deliberately out until the economy can carry
  poverty-correlation; v1 keeps the seam (donation records *why*).
- **The black market in blood** → `policing-slate`.
- **Component therapy** (plasma/platelet separation, separate shelf
  lives) → `blood-slate` v2.
- **Disease transmission through the supply** → rides the Titmuss lever,
  `blood-slate`.
- **A second/competing blood bank, exhibition franchises, the "AMC"
  texture** → the paid-donor future. v1 is **one window** in the city:
  gift-dispensing has nothing to compete over, so a second bank has no
  economic reason to exist *until* blood can be sold (the deferred
  Titmuss lever) — at which point competition arrives with its own
  justification. The mechanism is generic so these are rows when the
  lever lands.
- **The corpo's upstream as operable content** (running collection or
  distribution as a player) → a later build; v1 models the **dispensing
  window** and leaves the kept upstream as the NPC supplier + lore.
- **Emergent trait-driven NPC donation** (a callous neighbourhood runs
  short because its population won't give) → deferred to `blood-slate`;
  v1's NPC supply is a reliable restock cadence, because NPCs earn no
  *standing* by arithmetic (standing = renown × participation) so the
  interesting trait feedback only lands on players anyway.
- **Epoch-gated typing** (a pre-Landsteiner world where transfusion is a
  blind gamble until blood groups are *discovered*) → a future beat, not
  v1; v1 treats blood science as ambient. Historically grounded (human
  transfusion predates ABO by ~240 years and was a coin flip) and worth
  building someday as the knowledge on-ramp.
- **A blood-type display on a character sheet** → nowhere deliberately;
  type stays a fact you learn by `test`, per the slate (knowing is a
  belief, learned by being tested).
- **Lineage inheritance of blood type** → `lineage-slate`; v1 assigns
  type by the shipped precedence (author pin → species frequencies →
  roll).

## Placement

The **mechanism is a generic substrate**; the **Terminus corpo bank is
content**.

- ⭐ **Name the substrate, not its first consumer.** What we are building
  is *a gift-only civic bank of typed, perishable units, with an
  un-withdrawable floor* — the shape of a **milk bank, a vaccine bank, a
  seed bank**, not a `BloodBank`. Blood is its first content. The plan
  names the mechanism generically so a later milk/vaccine bank is rows.
- The **blood acts** (`test`/`bleed`/`transfuse`) and the blood Material
  stay in `trade-medicine`, where they shipped.
- The **par/restock, org, credit-ledger, accountability, treatment-
  billing, and corpo** substrate is kernel/platform + the shipped corpo
  system, already generic — this build *extends* it (type-aware par read,
  the gift-credit wiring, the `issue` act + its service fee, the consent
  ladder + the identity directive) rather than forking it.
- The **dispensing window is an independent Business** that bears the
  corpo's name (the ghost sign) — its own small operation, player-holdable
  — while the **corpo keeps the upstream** (collection + distribution) as
  the NPC supplier that fills the window's par. The divestiture is the
  product fact; which `appointingAuthority` shape the independent window
  uses is the plan's.
- The **window, its seats, the upstream supplier edge, and the typed
  stock** at the Terminus infirmary are **content rows**; the **Decree +
  the ghost name** are corpo lore (one paragraph + one NPC line).
- ⭐ **The test: a second bank needs zero code** — another locality
  authors the window Business with a typed par and an upstream supplier,
  and it works. The trade=mechanism / locality=expression line.
- Whether the Terminus rows ride `trade-medicine`, the corpo pack, or a
  thin new pack is the plan's call; the product requirement is only that
  the bank is a *generic donation-bank over the shipped Business + corpo
  substrate*, not a hardcoded NPC caste.

## Collisions

Everyone this touches already lives at **the Terminus infirmary**
(`/world/terminus/infirmary/`):

- **The physician's practice** is already a Business there (physician +
  nurse positions, hours 7–19, `banksAt: goodkin`) — and it currently
  carries the `{category: blood, level: 2, unit: L}` par line. ⚠ **The
  blood par must move off the practice onto the independent blood
  window** — the blood people are *separate from medical*. Two Businesses
  at one location (the medical practice and the blood window) must stand
  up and attribute independently.
- **Goodkin is the ghost, not the operator.** The infirmary already
  `banksAt: goodkin`, and the warm sunrise-stone house is the name
  everyone still associates with blood — but post-Decree it runs only the
  upstream; the **window is independent** and just wears the sign. (The
  money-bank relationship is unaffected; the blood relationship is the
  one the Decree severed.)
- **The ward** (cots, tariff slate, the basin, the just-placed blood
  fridge + cooler, the dressing cabinet) is where the window sits — it
  needs an `operatingLocations` fixture there (a donation couch / the
  registrar's desk) without displacing the practice's. **The transfusion
  service fee rides the same billing the practice already uses for
  `order treatment`** — not new money substrate.
- **The physic garden** (north of the ward) and the **counting-houses
  avenue** (the ward's southwest exit, which carries the grid feeder the
  fridge draws) are unaffected but are the neighbours.
- **The physician + nurse cast** stay the practice's; the window brings
  its **own cast** — a **crusty independent registrar** who keeps the
  Goodkin name out of habit and trust, is the floor that always serves a
  dying delver, runs the drives, and delivers the Decree in a line to
  anyone who asks — plus the donor NPCs that feed the supply.
- The **general-store cold room** (the other cold-storage consumer) is
  unrelated and elsewhere.

## Surface decisions

### The supply backbone — NPC donors stand up the bank
**Q:** Where does the bank's blood come from, given a player can't be the
backbone (at 12× a donor's marrow regrows a unit in ~28 real hours)?
**A:** A **Blood Service org** whose supply is **NPC donors giving on a
cadence**, filling the bank toward par via the shipped restock spine.
Player donation is a *choice* layered on top, never the load-bearing
wall. **Chosen by lenses 6 + 3b** — it creates real vocations (registrar,
phlebotomist, screener) and an institution to participate in, where a
clinic-function would create neither.

### Gift-vs-self is what mints credit
**Q:** A `bleed` today mints nothing; when does donation earn the
chronicle/disposition/renown credit?
**A:** When the unit is **given** — to the bank, or transfused into a
*named other* — not when drawn for one's own use. Generosity for routine
giving, compassion when answering a named person; a chronicle deed; a
renown move in the locality. **This is the gift/sale thesis** (payment
severs the disposition credit) expressed as gift-vs-self, since v1 has no
sale. The revival it buys also mints the recipient a deed ("someone's
blood brought you back") — the slate's best-donor loop.

### Type-aware shortage and the summons
**Q:** Is the bank's stock and shortage legible by blood type?
**A:** **Yes.** The bank's shortfall is readable per type, a shortage
posts as a type-named press notice, and a room summons names the type
("anyone O-negative?"). **Chosen by the user**, and it is the slate's
headline payoff — typing creates *occasions where a specific stranger
becomes necessary*, which almost nothing else in the design does.

### Dispensing is a seat-gated, gift-only issue act
**Q:** How does a unit leave the bank to be used?
**A:** A new **`issue`/`requisition`** act: an on-shift window attendant
dispenses a typed unit, appending a chain-of-custody record. The **unit
is not sold** (the donor's gift is never commodified — you do not `buy`
blood); the **transfusion carries a service fee** for the processing
around it, billed separately on the treatment rail. **Chosen by lenses
6/3b/7/4** — it is the registrar's actual job (economy), makes the window
a counter you transact with (participation), names who may draw and
leaves an auditable trail that is a malpractice record and a credential
at once (governance), and keeps the *gift* off the price tag while the
*service* is honestly charged (values). Raiding the fridge with `get` was
rejected: "authorized" would have no criterion.

### The floor is NPC-run; the player-operator ceiling is deferred
**Q:** Blood is life-or-death. Do we hand players the controls on a good
whose failure mode is a *third party's* death?
**A:** **No, not in v1.** Blood is a **universal-service good**: unlike
every luxury trade shipped (a failed gin shop just doesn't clear a
nice-to-have), a blood bank that fails *kills*. We walked the floor/ceiling
split (players operate above an NPC floor) and the user chose the **safer
reading**: the window is **NPC-run**, and players touch only the
pure-upside halves — **donating** and **receiving**.
- **The floor — NPC-honoured, un-withdrawable:** the emergency case (a
  dying patient + a compatible unit on hand) is always served by the NPC
  proprietor, **regardless of ability to pay** (the fee is on the house
  for the dying). On a *private* operator this is a **regulation** (the
  EMTALA shape: a private clinic must stabilise an emergency), which is
  the one clean model — see *The Paramount divestiture*.
- **The player/NPC asymmetry holds, downsized:** an NPC giving or
  dispensing is *plumbing* (supply, no standing); a player **giving** is a
  *character act* (deed, trait, standing). The measurement doctrine's
  feed-measures / mirror-shows-you, now only on the donation side.
- **The ceiling is deferred** → `blood-slate`: the player-registrar
  vocation, running drives, stocking rare types, and the values-lens
  **scarce-unit allocation** (a player deciding who gets the last unit —
  the richest content we found) all wait. ⚠ This is a real loss from the
  lens pass (lens 4's allocation moment and lens 3b's institution-to-run),
  taken knowingly: handing a player the kill switch on a life-or-death
  good — *especially a private operator who could withhold for profit* —
  is the hazard, and "at least for now" keeps it NPC. When it returns, the
  abuse-is-a-governance-story guard (the custody/accountability ledger)
  and the floor are what make a player operator safe to allow.

### The Paramount divestiture — the ghost on the window
**Q:** Who runs the city blood trade, and why isn't it the obvious house?
**A:** The **Paramount Decrees shape.** One corpo — **Goodkin** — was once
the integrated blood monopoly (collection + distribution + dispensing). A
clean **antitrust Decree** (a private monopoly over a life-or-death good
was intolerable) forced it to divest **one** link. It kept the two that
hold the value — **collection + distribution** (the processing/testing/
cold-chain, where the service fee's margin lives) — and gave up the least
profitable: **dispensing**, which in a gift world makes no money. The
infirmary's blood window is now **independently operated but still bears
the Goodkin name** — the sign outlived the ownership. **Chosen with the
user**, and it does a lot of work at once:
- **It answers vertical integration permanently.** Integration *happened*;
  the state broke it; re-integrating is now illegal — a named, forbidden
  ambition if we ever want a menace, not a plot hole.
- **The divested window is a private operator under a regulatory floor.**
  The kept upstream is the NPC-backed, un-withdrawable supply floor; the
  divested window is a small, local, **privately-run** operation (an NPC
  proprietor — the registrar herself, who kept the Goodkin name). It is
  **not** a civic charter: a public/private hybrid in one life-or-death
  market is the messy case (real healthcare), so the window is cleanly
  private, and the floor rides it as a regulation (EMTALA). It is the
  piece a player *could* one day run — deferred (NPC-run for now).
- **It uses Goodkin as a ghost, not the operator** — the name everyone
  trusts, over a door the house no longer runs. The misread ("so Goodkin
  runs it?") *is* the history lesson, delivered by the registrar's one
  line.
- **It keeps the map honest.** One window; no competing storefronts,
  because gift-dispensing has nothing to compete over. The Decree is
  realm-wide, so Terminus needs no special exception.

⚠ Honest cost: it muddies the pure collective-action lesson into a
divested-but-corpo-shadowed commons — a gain in realism and teachability,
a shift from the slate's "civic habit" framing.

### The gift is the donor's; the sale is the service
**Q:** Isn't blood sold? A transfusion isn't free, and it isn't all labor.
**A:** Right — and the money goes in a specific place. **The donor is
never paid** (gift-only, the Titmuss line, at the *donation* end). **The
patient pays a service fee** — for the testing/processing/cold-chain that
makes a donated unit safe and available (reagents and refrigeration, the
"not all labor" part), **not** for the blood-as-substance. The gift is
never commodified; the service around it is a legitimate charge, on the
shipped `order treatment` billing rail. **Chosen by the user.** It
sharpens everything: it is airtight *why* the corpo kept distribution
(that is where the margin is — the window takes only thin clinical-labor
markup); it gives a second bank a real economic reason to exist *once blood
can be sold* (the deferred lever, self-justifying); and it hardens the
floor — the dying are served **even when they can't pay the fee** (the fee
is handled after), real emergency-care ethics. Titmuss is untouched: the
deferred lever is still *paying the donor*, the only payment that corrupts.

### The historical failure modes are reachable and self-teaching
**Q:** The history is the lesson — how does a player learn it?
**A:** By being allowed to **make the forebears' mistakes**, deterministically,
and seeing the consequence (never by a paternalistic block; competence
buys refusal-*judgment*, never a safer act). Each real blunder has a
reachable in-game analogue: the **untyped gamble** (skip `test`, transfuse
unlabelled — Blundell 1818), **blood too far across the tree** (cross-clade
in desperation — Denys' animal blood → the ×2 reaction), **skipped
screening → a tainted unit** (a drunk/sick donor's blood enters the
supply), the **cold-chain lapse** (let the feeder cut, the vault spoils).
And the mistake **leaves evidence** — the accountability ledger records
who gave what, the forensic reader (`analyze postmortem`, shipped) reads a
reaction-death back to its cause. Failure is information, not a dead-end:
the mirror shows you. **Independent of the lore** (no catastrophe backstory
required — the Decree is clean antitrust).

### Prior consent — the donor card — is first-class
**Q:** How is consent handled, given a dying patient cannot give it?
**A:** A **consent ladder** with a **standing directive on your identity**
at the top — the "donor card," a *declared value* set in calm (*will
receive / won't receive / registered donor*):
1. **The directive** is read first.
2. **Conscious, no directive** → asked (explicit consent).
3. **Dying/unconscious, no directive** → implied consent (may be treated).
4. **A contemporaneous conscious refusal always wins** — over a prior
   "will receive," even to death (medically correct; the agency beat).

The floor guarantees **availability and NPC willingness, never forced
administration** — a conscious objector is never overridden. The
*registered-donor* half is also how the Service knows whom it **may** call
on, so the summons reaches only people who checked the box — **no-badgering
by construction.** A transfusion done against the ladder appends a **harm**
row (the poisoner's shape, producer-side); the same ledger is a
malpractice trail and a credential depending on outcome. **Chosen by the
user** (the advance-directive ethic — you decide before the crisis, not
during it).

### Compatibility must be legible
**Q:** The anti-essentialism lesson (compatibility cuts *across* species)
is the pedagogical payoff — how does a player ever see it?
**A:** The compatibility structure must be **readable in-world** — the
physician/registrar tells you, or a chart at the clinic, or an instrument
reading — so a player can derive "I'm O−, here's who I can help, and it's
a dwarf and an elf, not my own kind." **Required by lens 1**: without a
legible surface the mechanic is built and its point is hidden. (Exact
surface is the plan's; the product requirement is *the graph is
derivable, not opaque*.)

### Shelf life is game-time
**Q:** Game-time or real-time spoilage?
**A:** **Game-time** — already settled by what shipped (blood is a world
Material on the freshness clock, kept by the cold fridge). Noted only
because it couples supply pressure to `setScale`; the rates are dials.

### The holder — a private NPC proprietor; the floor is the corpo's upstream
Two holders, by the divestiture (see *The Paramount divestiture*). The
**dispensing window** is an **independent, privately-owned** Business run
by an **NPC proprietor** (the registrar, who kept the Goodkin name),
bound by the regulatory floor. **Not** a civic charter and **not**
player-held in v1 — player operation is deferred. The **kept upstream**
(collection + distribution) is the **corpo's** — the NPC-backed,
un-withdrawable supply floor behind the window, never a player's to switch
off. (The exact `appointingAuthority` shape — a private `entity`
proprietor — is the plan's.)

## Lens pass

1. **Pedagogy** — blood type teaches biological compatibility that cuts
   *across* species (a dwarf and an elf can share; two elves might not) —
   the anti-essentialist refutation, true of real ABO; the bank teaches
   the collective-action / free-rider problem (a perishable public good
   nobody can stockpile), and under a corpo, the ethics of a donated good
   under private control (the advance-directive ethic via the donor card).
   ⭐ **Finding → requirement:** the compatibility graph must be **legible
   in-world** or the across-species lesson is hidden (see *Compatibility
   must be legible*). ⭐ **And the history is taught by repeating it** — the
   acts let a player make the forebears' mistakes (untyped gamble,
   cross-clade, skipped screening, cold-chain lapse) and read the
   consequence off the record (see *The historical failure modes*). The
   craft Disciplines are the shipped `nursing`/`medicine`; no new skill
   bar — the real teaching is civics and history.
2. **Creative expression** — the ordinary case is rows (a second bank is
   authored — a ghost-named independent window in a city, a civic bank on
   a frontier — zero code);
   the bespoke case (a rare-type donor drive, a species whose blood is
   incompatible with the common pool → *more fragile, its own drive*,
   expressed as allele frequencies + a clade edge + a type-targeted par)
   is authored without forking. ⭐ **Finding → posture:** name the
   mechanism generically (a civic donation bank), not `BloodBank`, so a
   milk/vaccine/seed bank is rows later — *name the substrate, not its
   first consumer.*
3. **Immersion / participation** — ⭐ fills a real institution-shaped
   hole: an independent NPC-run window (the ghost name), a summons that
   makes a specific stranger matter, a donation that is remembered. ⚠ Two
   immersion requirements fall out: the **NPC supply needs a visible
   face** (a donor cot / an occasional "someone gives blood" beat — not a
   number that rises by itself), and the floor is **availability, never
   forced treatment** (a conscious refusal stands). ⚠ **Participation is
   DOWNSIZED in v1:** the player participates as donor and patient, not as
   operator — the "institution a player runs" and the emergent
   corner-the-supply politics are **deferred** with the ceiling (they
   return when a player may hold the window; the floor + custody record
   are what will make them safe then).
4. **Values** — the *give / don't* choice stands: no scale, no ranking,
   an **unearned distinction** (your type is just true) that makes
   universal donors community assets; standing by the locality (renown),
   the deed by the chronicle, gift-only keeps the act an act of character.
   ⚠ The second values moment — *who gets the last scarce unit* (a genuine
   undecidable, the richest content we found) — is **deferred with the
   player-operator ceiling**: in v1 the NPC proprietor allocates by a plain
   rule (oldest-compatible-first), not a player's judgement. Noted as the
   lens's biggest deferral.
5. **Continuity** — the mechanism holds across epochs: a bank that holds
   typed perishable units, issued on authority, answers the same acts
   whether the era is medieval or industrial; only the **dynamics scale**
   — the cold chain is the dial (an icebox bank runs short and leans
   harder on donation; the powered fridge holds for weeks), and the
   paid-market lever is the late beat. ⭐ **Decision:** blood science is
   **ambient in this realm, not an epoch/knowledge unlock** (matches what
   clinical-medicine shipped; the setting has aether and magic, it is not
   literal 1300s). The historically-grounded *epoch-gated typing* version
   (transfusion as a pre-Landsteiner gamble until groups are discovered)
   is noted as a future beat, not v1.
6. **Economy** — ⭐ a **life-or-death good inverts the usual player ruling.**
   For every luxury trade, a failed player business is harmless (the
   market just doesn't clear a nice-to-have); blood is a
   **universal-service good** where "go without" = die, so the supply and
   emergency-dispense **floor cannot be withdrawn by a player** — the NPC
   institution guarantees it; players operate above it. Produces: a
   reliable typed supply + the registrar/phlebotomist/screener vocations
   (courier later). Consumes: donor volume/marrow, cold-chain power,
   wages. ⭐ **Who pays what:** the **donor is never paid** (the gift); the
   **patient pays a service fee** for the processing around the gift (the
   margin the corpo kept when it divested the free-dispensing window).
   Gift-dispensing having no margin is *why* there is one window and no
   competition — until the paid-donor lever creates one. The demand was
   there first (surgery's `bloodCostL`, the bleed).
7. **Governance** — the trade's shape is a **state act** (the antitrust
   Decree that broke the monopoly and forbids re-integration). When the
   window judges *who may draw*, the criterion is the seat (on-shift,
   authorized), the record is the custody/harm ledger, and the operator —
   player or NPC — is **bound by a regulatory floor** (*you may run the
   window; you may not let a dying person die for your inventory, or for
   their empty purse*). Abuse (hoarding, mis-issue) is legible, recorded,
   punishable — a governance story, never a silent death. The paid-donor
   policy is a future legislative choice (not built).

## The drive

Driven at the Terminus infirmary on a live world.

1. **The bank is stocked, by NPCs, under a name that isn't its owner.**
   Arrive at the ward. The blood window wears the **Goodkin** sign; it
   holds **typed** units (e.g. "O+ 1.5 L, A− 0.4 L, O− — none") because the
   upstream has been filling it on a cadence. Ask the registrar and get
   the history in a line (*"we keep the name — Goodkin hasn't run this
   window since the Decree"*). Confirm the stock is **derived from the
   units actually in the fridge**, not a stored number — and that there is
   a **visible donor** presence (a donor on the couch / a "someone gives
   blood" beat), not a number rising by itself.
2. **Surgery spends it, and the patient is billed for the service.** A
   patient needs a rupture-repair (0.3 L). The clinician transfuses a
   compatible banked unit; the stock for that type drops, and a
   **transfusion service fee** lands on the patient's bill (the
   processing, not the blood) on the shipped treatment rail. (Demand is
   real and pre-existing.)
3. **A shortage becomes legible.** Drive the O− stock to zero (surgeries
   / issues). A **press notice** posts — "the Terminus infirmary is short
   of O−" — readable on the news ticker and the start-screen press room.
   No push, no toast, no badger: it is on the ticker because someone
   reads the ticker.
4. **The summons.** In the ward, the NPC registrar asks the room
   **"anyone O-negative?"** — a specific kind of stranger is now needed.
   (Pure pull: the room ask + the ticker; no targeted message.)
5. **A player learns their type, reads the map, sets their card, and
   gives.** An untested player `test`s (a drop, a one-line answer) to
   learn they are O−. They then read the **compatibility surface** (the
   registrar / a clinic chart) and can see *whom they can help* — and that
   it crosses species (a dwarf, an elf) rather than following their own
   kind. They set their **donor card** (register as a donor; and their
   receive/refuse directive). Then they `bleed` a unit into a bank bag and
   **give it to the bank** (the gift act). Confirm: a **chronicle deed**
   is recorded, **generosity** (and **compassion**, because the ask was a
   named shortage) evidence appends, and local **renown moves** (append +
   recompute). Then the control: a player who `bleed`s into their *own*
   bag for their *own* use earns **none** of the three.
6. **The NPC registrar issues / dispenses a unit.** A patient `order`s a
   transfusion at the window; the NPC registrar dispenses a compatible
   unit — the **unit itself is not sold** (no `buy` of the gift), though
   the transfusion's **service fee** applies — and a **custody record**
   appends (who issued what, to whom), readable on `analyze bank`. (The
   issue act is seat-gated to the window's on-shift staff — all NPC in
   v1; a player cannot issue. The scarce-unit allocation-as-a-player's
   values-call is **deferred** with the operator ceiling; the NPC
   allocates oldest-compatible-first.)
7. **You can make the forebears' mistake.** Transfuse an **untested /
   unlabelled** unit into a typed patient without matching — it is *not*
   blocked (you are Blundell, 1818). On a mismatch the transfusion-reaction
   fires; the patient sickens on the shipped cascade; and the
   **accountability ledger records who gave it**, readable afterward
   (`analyze postmortem` if it kills). The lesson is the consequence, not a
   refusal. (Same shape reachable for cross-clade and a skipped-screening
   tainted unit.)
8. **The consent ladder.** A patient with a **donor-card directive** has
   it read first (a "won't receive" refusal holds even unconscious; a
   "will receive" pre-grants). With no directive: a **conscious** patient
   is asked; a **dying/unconscious** one is treated under implied consent.
   A **conscious refusal always wins**, even to death. Transfuse against
   the ladder (a conscious or pre-registered "no") and confirm a **harm**
   row appends against the administrator (the poisoner's shape).
9. **The backbone and the floor hold with no players.** With no player
   donating, the window still refills toward par from the upstream on its
   cadence — the combat supply does not depend on a player. The floor: the
   NPC registrar serves a dying patient with a compatible unit on hand
   under implied consent, and **a patient who cannot pay is still served**
   (free at the point of care, not turned away) — nobody bleeds out beside
   a full fridge. (The window being NPC-run, the floor is simply the
   proprietor's regulated behaviour; a hoarding *player* operator is not a
   v1 case — it returns with the deferred ceiling.)
10. **A second bank is rows.** (Author-level check) a second window — a
    Business with a typed blood par and an upstream supplier — stands up a
    working typed bank with no new code.

## Acceptance criteria

*(Observable from outside the code.)*

- At the ward, the blood bank shows **typed** stock, and that stock
  reflects the units actually held (draw one out, the reading drops).
- Leaving the bank alone, its stock **rises toward par over game-time**
  from NPC donors — with no player having donated.
- A player who **gives** blood (to the bank or a named other) afterward
  sees it in their `chronicle`, moves on the touched traits, and rises in
  local standing; a player who draws blood **for their own use** sees no
  deed, no trait move, no standing change.
- When a type runs out, a **named shortage for that type** is readable on
  the press ticker without the player being pushed or nagged; and the
  room summons names the type.
- The **NPC window dispenses a typed unit** on an `order transfusion`;
  the issue is seat-gated (NPC staff only in v1 — a player cannot issue),
  and it leaves a record a player can read (`analyze bank` / the custody
  trail).
- **The patient pays for the service, not the gift:** a transfusion lands
  a service fee on the patient's bill (on the shipped treatment rail), the
  donor is never paid, and the donated unit itself is never a priced
  `buy`.
- **The floor holds regardless of purse:** the NPC registrar serves a
  dying patient with a compatible unit on hand even if they **cannot pay**
  (free at point of care, not turned away).
- **A player can make a historical mistake and learn from it:** an
  untyped/cross-clade/tainted transfusion is *not* blocked, it inflicts
  the reaction, and the record shows who gave it (readable post-mortem).
- A player can **set a donor-card directive** in advance; a transfusion
  **reads it first** — a pre-registered refusal holds even when the
  patient is unconscious, and a conscious refusal wins even to death; a
  transfusion against the directive shows up as harm attributable to
  whoever gave it. The donor-registration flag is a **readable roll** (on
  `analyze bank`), never a push — a non-registrant is never nagged.
- The **compatibility structure is legible in-world** — a player can
  learn not just *their type* but *whom they can give to / receive from*,
  and see that it crosses species rather than following their own kind.
- A compatible-across-species, incompatible-within-species donation
  **works** (the clade graph is not a hierarchy) — nobody is ever
  hard-blocked from a donor pool.
- The city window is an **independent, privately NPC-run operation
  wearing the Goodkin name**: asking the registrar yields the divestiture
  history; the upstream that fills it is the corpo's (never a player's to
  switch off); the window is **not player-operated in v1** (no apply/clock
  into the registrar seat); and a second window elsewhere works off the
  same mechanism as rows.

## Cross-references

- **Seeding slate:** `docs/slates/builds/blood-slate.md`
- **Subsystems:** `blood.md` (the core), `employment.md` +
  `governance.md` (the org, par, seats), `corpo.md` (the houses that run
  the city trade), `retail.md` (the restock brains), `chronicle.md` /
  `trait.md` / `renown.md` (the gift credit), `comms.md` / `press.md` /
  `social-graph.md` (the summons, no-badgering), `accountability.md`
  (consent/harm), `identity.md` / `credential.md` (the donor-card
  directive), `thermal.md` + `energy.md` (the cold chain the fridge
  rides).
- **Related slates:** `cold-chain-slate` (the shipped fridge this
  depends on), `species-slate` (costs-not-ranks for the clade graph),
  `legal-code-slate` (the future gift/paid policy object),
  `freight-slate` (the later cold-chain courier vocation).
