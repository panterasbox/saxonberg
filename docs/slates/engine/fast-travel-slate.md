# Fast-travel slate (working doc)

> **Status: PARTIAL** — v1 shipped (network · credential · on-demand
> travel), and the TPA reform (2026-09-02) added fares and a gate `status`
> derived from supply → [fasttravel.md](../../subsystems/fasttravel.md)
> **Left:** wayfinding (published schedules + route maps as Readables — the
> `scheduled`/`cycle` advance modes and the Terminus hub shipped) · terminals
> that WEAR · the maintenance round the self-governing Authority now owes ·
> disruption events / rerouting / sabotage (beyond a cut or closed line) ·
> cross-restart credential durability (no body section here — the design is
> fasttravel.md § Credential caveat (v1))
> ⭐ **2026-11-17 direction** (§ *Carriers, tickets and mass*, at the end): carriers lease gates,
> the bearer ticket and the starting ticket, mass-and-container pricing, "walk first" as one
> carrier's policy, precision only off the network.
> **Size:** a wave

Working slate for **fast travel** — the *Eternal City Teleport Authority*
network (the *Eternal City* naming is historical — the pack is
realm-neutral `/system/tpa`). Teleport-based transit across the world, distinct from the
**locomotion** subsystem (physical room-to-room movement). The lounge-
exit and home-routing (char-gen/onboarding) ride this.

The load-bearing decisions:

1–4 — the directed network of public terminals · public infrastructure with
   the last mile on foot · scan-to-register · the implant + card credential —
   shipped → [fasttravel.md](../../subsystems/fasttravel.md) § The network
   model, § The two halves, § Unlock = scan-to-register.

5. **Living infrastructure (intent now, loop later).** Terminals/routes
   are **stateful, designed to be disruptable** (breakdowns, maintenance,
   delays, congestion, sabotage). The *seam* exists; the maintenance/
   disruption **loop is a later wave** — it's the fun, not the v1.

See also:

- [docs/slates/onboarding-slate.md](../client/onboarding-slate.md) /
  [docs/subsystems/char-gen.md](../../subsystems/char-gen.md) — the **lounge
  terminal** + dorm-lobby home-routing ride this network; the lounge-exit
  is the first/simplest terminal use.
- [docs/slates/augmentation-slate.md](./augmentation-slate.md) — the
  **credential as an implant module** (a travel augment); cards as the
  alternative.
- [docs/subsystems/spatial.md](../../subsystems/spatial.md) /
  [zone.md](../../subsystems/zone.md) — terminals are locations; teleport
  is the existing mechanism the travel act reuses.
- [docs/subsystems/locomotion.md](../../subsystems/locomotion.md) —
  **distinct**: locomotion is physical movement; fast travel is
  network teleport. The last-mile walk uses locomotion.
- [time.md](../../subsystems/time.md) — drives
  **scheduled** terminals (later mode).
- [docs/subsystems/messaging.md](../../subsystems/messaging.md) /
  [message-rendering-slate.md](../client/message-rendering-slate.md) /
  language — published **schedules + route maps** are Readables; a route
  map is a layout/diagram (later).
- [docs/slates/access-slate.md](../platform/access-slate.md) — the credential
  authorizes travel; some terminals/routes may be gated.
- [docs/design-philosophy.md](../../design-philosophy.md) — liberal diegesis
  (the Authority, scan-to-register, living infrastructure).

---

## Principle

1–4 shipped (above).
5. **Built to be living infrastructure** — dynamic seam now, disruption
   loop later.

---

## Why teleport (and why it's magic)

Why teleport and not a train → graduated to
[fasttravel.md](../../subsystems/fasttravel.md) § Why teleport, and not a
train.

So the network's *reach is the un-genre thesis made navigable*: the
departures board lists places that have no business on the same map, and
that incongruity is exactly the "you're in for anything" promise in
concrete, walkable form. The route map is a content surface for it (see
the EU staging Stop) — most stops mundane, a few impossible, the lines
running *out* past the edge of any one reality.

*Naming note superseded* — the pack is realm-neutral `/system/tpa`,
content-named the Teleport Authority (fasttravel.md intro); "Eternal" is
the EU slate's question alone.

---

## The model

Shipped → [fasttravel.md](../../subsystems/fasttravel.md) § The two halves,
§ The network model, § Targeting and the departures board, § The verbs,
§ Timetable & advance policy (the `scheduled` / `cycle` advance modes
shipped as mechanism; no shipped row authors one yet).

---

## The lounge tie

*Superseded by the code* — the lounge terminal is `both`, comped, and routes
to the Terminus arrival gate; the born-with floor (lounge · Terminus · the
crossroads) replaces state-routing, and home is a walk from campus, not a
dorm-lobby terminal → fasttravel.md § Unlock = scan-to-register (born-with
floor), § Terminus; residence.md.

---

## What it reuses vs reveals

**Reveals (deferred subsystems / seams):**
1. ~~**Economy / currency / fees** — v1 is free/comped.~~ *Superseded*: fares,
   the network fee, the arrival surcharge and the mana charge shipped →
   fasttravel.md § The transit-fare economy.
2. **Object condition / maintenance / repair** *(later loop).* The
   living-infrastructure dynamism (breakdowns, maintenance, disruption,
   sabotage) is a stateful-device + repair pattern — a later wave. The
   *seam* (terminals/routes are stateful) exists now; the loop doesn't.
3. **Scheduled mode + published schedules/route-maps/hubs** — the bus-
   station style + wayfinding content; later (ties world-clock +
   Readables + the onboarding signs).

---

## Open questions / forks (mostly settled)

All six settled and shipped — 1 both (a `TravelCard` + the born-with
`CredentialWalletUpdate`: fasttravel.md § The two halves) · 2 scan-to-register
(§ Unlock) · 3 fees: *deferred* was overtaken — fares shipped (§ The
transit-fare economy) · 4 the seam shipped and `status` now DERIVES from
supply; only wear + the round remain (§ Seams & deferred surface) · 5
on-demand shipped, and the `scheduled`/`cycle` modes as mechanism
(§ Timetable & advance policy) · 6 per-terminal `directionality` content
(§ The two halves; Terminus is the first to use `arrival`).

---

## Build order

**Wave 1 — the minimal network + the lounge.** Shipped → fasttravel.md.

**Wave 2 — scheduled mode + wayfinding.** Scheduled terminals (world-
clock); published schedules + route maps (Readables); transport hubs.

**Wave 3+ — living infrastructure.** The condition/maintenance/disruption
loop (breakdowns, repair, delays, rerouting, sabotage); the Authority as
a faction/maintainer. **(Economy/fees land whenever that subsystem does.)**

---

## What this slate does NOT cover

- **Locomotion** (physical movement) — a separate subsystem; the last-
  mile walk uses it.
- ~~**The economy** — fees are a deferred hook; v1 is free/comped.~~ Fares
  shipped (fasttravel.md § The transit-fare economy).
- **The maintenance/disruption *loop*** — later; the stateful seam is here.
- **Char-gen / onboarding** — they *consume* the lounge/lobby terminals;
  defined in their slates.
- **The author/housing content** — the dorm/lobby are content; this just
  places terminals in public nodes.

## ⭐⭐⭐ Carriers, tickets and mass — a direction, not decisions **[LEAN; owner direction 2026-11-17]**

Talked through with the owner while designing the walk from the lounge to the campus (the TPA
station is on that path; [university-avenue-slate](../world/university-avenue-slate.md)). The owner:
*"Now's the time to fuck with shit before there's a real network riding on any of it,"* and *"we
can revisit any of it."*

### The lens: who holds which extent

The owner: power is exactly what write access to an extent gives you. *"Some extents control the
network and some control just the individual nodes, and then there's other shared content. How
it's all divvied up determines what parties control what interests in the entire experience and
can do things like set rates or issue tickets."*

What ships already has two interests: **the network** (the Authority, self-governing over the TPA
pack's own extent, taking a network fee) and **the node** (the business operating each departure
terminal fixture, taking the rest of the fare; for Terminus, the city).

The direction maps onto how air travel actually splits:

| layer | who holds the extent | what writing to it lets them do |
|---|---|---|
| **the fabric**: the physics of teleporting, its workings, mana | the arcana system | what any teleport costs; which workings exist |
| **the station**: a terminal building | **the place** (Terminus holds its station; the lounge its terminal) | lease gates, set the station's rules, collect rent |
| **a carrier**: usually a corpo | the carrier's own extent | its gates' equipment, routes, timetables, fares, tickets, whether it takes cargo |
| **the Authority** | the TPA's own extent | open: standards and a common board above the carriers, or one carrier among several (the public line) |

### Carriers

- **A departure gate is a carrier's gate.** Each carrier runs its own timetable, so the hub feels
  busy because carriers compete. The owner likes *"one terminal for arrivals, and then different
  departure gates each running their own schedule of departures … it makes the thing feel busy, like
  a real passenger hub."*
- **A dark gate is unleased.** A gate coming back into service because a carrier moved in, or a
  new destination was built, is a world event; keep at least one dark.
- **Regional and interdimensional carriers are route sets:** a regional line runs inside a realm;
  an interdimensional line connects realms through the lounge, where every realm connects. This is a
  business and content distinction, **not** a physical one: the aether is everywhere and crosses
  every boundary (it carries comms), unless an author deliberately shuts it off in a bounded space.
- **Cargo is a carrier's decision.** Freight carriers lease the wharf cargo terminal's gates
  ([logistics-slate § Cargo through terminals](../trades/logistics-slate.md)).
- ⭐ **"Walk first, then ride" becomes one carrier's policy, not a law of the network.** The public
  line keeps it (you register a place by going there). Another carrier sells tickets to places
  you've never been; another carries only members, or the invited.

### The ticket — a bearer token, not a credential

- **A new kind of thing:** a printed paper ticket (the paper system ships) for one named trip,
  **consumed by the carrier at boarding**. No registration, no wallet. The torn ticket stub already
  in the crossing's gutter is what's left of one.
- **⭐ Bootstrap every new character with one:** intake hands you a ticket from the lounge to
  Terminus, the operator's welcome, on whichever carrier runs that route. You arrive by ticket, the
  way first trips work for everyone.
- **A first trip registers the place** for carriers whose policy is walk-first, so a ticket buys an
  introduction to a place, never ongoing access.
- **Money versus experience.** The owner: *"I'd prefer the big content unlocks in this game come
  from experiences and not just money."* Money buys tickets from carriers that sell them;
  **experiences get you onto the others**: a members-only carrier, a guild's own line, an invitation
  from a resident (letters of introduction, visas), a class trip, a job posted abroad. The most
  interesting places can be the ones a ticket can't reach. Entry to Saxonberg, the capital, is its
  extent holder's policy.

### Mass, not height and not distance

- **⛔ Height climbed is out.** The shipped cost (mass × gravity × height climbed) is physically
  true under the postulate but tiny, makes a downhill hop free, and ignores what matters; the owner
  calls it nonsense. (arcane-science.md carries a revision note.)
- **⛔ Distance is out.** Latitude and longitude mean something only on one world, and nothing in
  the models measures how far each thing is from every other thing.
- **⭐ Mass is the cost.** *"Passenger travel is pretty cheap but freight goes up with mass. And
  maybe you pay for how much shit you're carrying too, or even by the type of containers you have,
  like your carry-ons on a plane."*
  - a passenger fare covers a person plus a **personal allowance** (the carry-on);
  - past the allowance you pay **by weight and by container class** (a crate, a pallet, a container:
    the unit loads), each its own rate;
  - freight goes through cargo carriers.
- **The story, if wanted:** the more matter moved, the more the working must hold in place.
- **A mass-based cost doesn't depend on which world you're on**, so interdimensional travel can use
  the same working: a point for unifying on one fabric. Unifying is the lean, not a requirement.
- **The money and mana arrangement stays as shipped** (the fare to the carrier; mana from the
  terminal's own supply or the traveller's, by the traveller's choice). It is complicated, and open
  to revisiting.

### The network is reliable; precision is for casting

The terminal is effectively the caster, which is why the network is predictable. The owner does not
want to touch the network's reliability. Precision belongs to ad-hoc casting
([spellbook-slate § Precision](./spellbook-slate.md)).

### Open

0. ⭐ **The headquarters is in Saxonberg** (2026-11-18,
   [saxonberg-city-slate](../world/saxonberg-city-slate.md) § 8a) — the network's window, whichever
   way open 1 goes.
1. **What becomes of the Authority:** the public carrier that keeps walk-first, or a standards body
   above the carriers.
2. **Who runs the lounge's routes:** the operator's own carrier (the lounge is the operator's brand),
   or an interdimensional corpo leasing its terminal.
3. **Gate leases:** what a station charges, and who may lease.
4. **The container classes and their rates.**
5. **The starting ticket's issuer** and what it says on it.

