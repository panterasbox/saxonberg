# Attendant — the storefront-attention substrate (staging)

> **Status: BUILT + GRADUATED (2026-07-16).** Shipped in the Attendant+Goodkin cycle; the source of truth is now [../subsystems/attendant.md](../subsystems/attendant.md). Retained for design rationale.
>
> _(original: locked design, 2026-07-15.)_ A *universal* subsystem —
> "walk into a storefront, wait, get attended to one at a time." Every service
> venue (bar, bank, ticket office, future shops) runs it, configured differently.
> Surfaced from the Terminus banking design
> ([terminus-banking.md](./terminus-banking.md)) but it is **not banking** — it's
> foundational, and it should be built *underneath* the bank, not inside it.
> Feeds a future requirements → plan → build cycle.

---

## 0. Why it exists

"Being served at a counter, one at a time" is a universal human experience, so it
wants to be **one subsystem every venue runs** — configured, not reimplemented
per shop. The thing that makes it non-trivial (and that must be designed in from
the start, not bolted on): **giving one player exclusive access to a resource in
a multiplayer world requires anti-grief eviction.** An exclusive hold with no
revocation policy is a broken system by construction — trivially griefable. So
the substrate ships **with** a lease/revocation model (§4); the lease *is* the
exclusive access.

---

## 1. The universal model

An **attention relationship**: a *server* attends *customers* one at a time; the
rest wait in an *order*; being-attended unlocks a venue-specific *service act*.

- **Attendant Point** — the counter / desk / window / register where service
  happens. A venue has one or more. It owns the queue.
- **Server(s)** — who attends (an NPC, or a player employee), drawn from the
  employment roster's **on-shift** set. A server attends *one* customer at a time
  — that's where "one at a time" comes from. More servers = more parallel lanes.
- **The Queue** — the ordered set of those waiting for a server to free up.
- **The Attendant Act** — the venue's own verb (`order` / `deposit` / `buy-fare`),
  gated on *being currently attended*. **The subsystem is the wrapping (getting
  seen); the verb is the payload.** Bar, bank, ticket office = the same wrapping
  around a different payload verb.

---

## 2. The keystone that keeps it from being anti-fun

**Waiting is a background state, not a modal lock.** You join the queue and you're
*free* — look around, talk, sit, read the board — and you're **poked when it's
your turn**. You are never frozen at a "please wait." Only the brief moment of
*being served* occupies you. This single rule is what makes a universal queue
tolerable in a MUD (you *mill about*, you don't stare at a spinner).

---

## 3. Config axes — how venues differ on the one subsystem

Every venue sets these; the substrate is shared:

1. **Servers** — how many parallel lanes (1 clerk / 3 tellers / the whole bar
   staff).
2. **Queue discipline** — FIFO line / take-a-number / by-appointment / scrum /
   status-priority. *How the order is decided.*
3. **Attendant duration** — instant / a beat / a real dwell. *How long a server is
   occupied per customer* (a soda is instant; a loan talk is a dwell).
4. **Priority & skip** — who jumps (recognized / premium / staff). *The status
   lever* (being known = being received).
5. **Skin** — the diegetic face: a physical line, a numbered ticket + "now
   serving" board, or personal reception. *The character.*

*Banking example (each corpo = a config):* **Goodkin** = priority-skip for the
recognized + near-zero duration (reception) · **Veshko** = take-a-number + real
duration + no skip (the DMV) · **Hollis** = scrum · **Vionne** = appointment.
Same subsystem, five configs — "doesn't work the same way, runs the same
subsystem."

### Line vs number vs both — resolved functionally

Both are **queue disciplines** (axis 2); their *real* functional difference is one
thing — **must you stay present to hold your place?**

- **Model a line** — presence holds your place (leave the room, lose your spot;
  you and your position are *in the line*).
- **Take a number** — a `Ticket` holds your place (wander off, come back; the
  number is your claim).

A venue picks; the world has both; a busy venue can even run both (a ticket that
*orders* a physical waiting area). The subsystem just needs an order and a rule
for what forfeits it.

---

## 4. Anti-grief — exclusive access is a LEASE, not a LOCK

The governing requirement. **You hold the server's attention only while actively
using it. Idle → the lease is revoked → the next person is served.**
Holding-without-using is not a state the system allows.

**Mechanism = residency's idle-eviction pointed at a lease** — it reuses shipped
machinery rather than inventing a primitive:

- **Recency via dispatch-touch.** Every service act (deposit, order — any command
  dispatched) touches the lease's recency, the same signal residency already uses
  to know an object isn't abandoned. Actively transacting keeps the counter — and
  this is what distinguishes a *legit-slow* customer (thinking, typing; a generous
  timeout, reset by each action) from an *idle griefer*.
- **A lazy real-time sweep** (griefing is a real-time act, so the watchdog is
  real-time, not game-time — the `ScheduleApi.recurring` residency pattern) finds
  stale leases and **aborts** them: a `service-idle` `AbortReason` on the shipped
  engagement/preemption substrate → the holder is bumped, the next pulled up.
- **Default-EVICT** (residency's `canEvict` default-cull): the griefer gets no
  veto. The venue configures the *timeout and grace* (Goodkin generous, Veshko
  short), never *whether* eviction happens.

**Hard cases:**
- **Linkdead = immediate release.** Disconnect-and-hold is the classic grief; the
  presence layer already fires `PlayerDisconnected` → the lease drops instantly.
- **The queue is griefable too.** Holding a *position* idle (a `Slotted`
  physical-line spot) blocks people as much as holding the front — so the
  idle-drop applies to the whole queue: go idle / leave the room / linkdead *in
  line* → you lose your place; a take-a-number `Ticket` **expires** on idle. Both
  disciplines get the drop.

**It wears the venue's face.** Eviction is **diegetic and escalating**, never a
jarring kick: the server nudges — *"Anything else for you?"* → *"I'll have to help
the next person now."* → moved along. Same mechanism, skinned per venue (Goodkin
warm-but-firm; Veshko cold — *"Next."*). The anti-grief *is* characterization.

**Active-hogging** (a *non-idle* griefer doing endless tiny transactions to keep
the server busy): v1 covers most of it with **re-queue-to-the-back** (served or
evicted → the end of the line, no instant re-cut). The fuller answer — a
*fairness cap under contention* (the server yields to waiting customers between
your transactions when a line is long) — is a real refinement but risks
interrupting legit heavy users, so it's **deliberately deferred** (§9), not
reached for now. Idle-eviction + back-of-line is the complete-enough core.

---

## 5. In Stuff terms (and what's shipped)

- **A `AttendantMixin`** on the service-point fixture (a `Thing`) — holds the queue
  state + the config above. New — this is a real new subsystem (`lib/attendant/`,
  name provisional).
- **Servers = on-shift employees** — the employment engine already models "who's
  working"; servers are the staff assigned to a point. Reuse.
- **Being-attended = a `SustainedEngagement`** — the shipped activity substrate is
  exactly "two parties occupied together for a duration." Single-server
  serialization *falls out of* the engagement slot (a server can't engage two at
  once); durative service is a longer engagement, instant service a zero-duration
  one.
- **The Queue** = an ordered list on the point (or a `Slotted` physical line for
  occupiable, visible positions you watch yourself advance in).
- **Take-a-number** = a `Ticket` `Thing` + a "now serving" **dynamic `Detail`**
  (the crossing `tower`-reads-the-clock pattern).
- **Waiting** = a lightweight membership + a **poke** on your turn — *no
  engagement, you're free* (the §2 keystone).
- **The lease/eviction** = the residency idle-sweep (recency dispatch-touch + lazy
  real-time `ScheduleApi.recurring` sweep + default-evict) ⊕ the engagement
  `AbortReason` framework; real-time watchdog; linkdead release via the presence
  layer.

---

## 6. Instances — every storefront runs it

The bar (`order`/`serve`/`mix`), the bank (`bank open`/`deposit`/`pay`), the TPA
ticket office (`buy` a fare), future shops — **same wrapping, venue payload verb,
per-venue config.** Adopting Attendant **retrofits the existing venues**: the bar
becomes a Attendant instance (it can configure *zero-wait* to behave exactly as it
does today, but it *runs the subsystem*); the ticket office likewise. The Goodkin
bank is then just the config *reception / priority-skip, near-zero duration, warm
eviction*.

Concretely: at the **bar**, the on-shift bartender is the *server*,
`order`/`serve`/`mix` the payload, discipline **informal/scrum + zero-wait** (you
don't queue at a bar — the bartender gets to you); the retrofit changes the feel
~nothing but earns the lease (you can't hog the bartender idle). At the **ticket
office**, the clerk (Tootie) is the server, `buy`/`procure card` the payload, a
more formal counter config. Same substrate, three faces.

---

## 7. Completeness + scope

The lease/eviction ships **as part of the subsystem, non-optionally** — you don't
build exclusive-access-in-multiplayer and *then* add anti-grief; the lease *is*
the exclusive access. Anything less is the half-grown, exploitable version we
don't build.

It's a **foundational subsystem, not a bank feature.** The correct scope: build
Attendant *complete* (the disciplines that matter, the engagement, the lease) and
make bar + bank + ticket-office real instances — bigger than "the bank," but
right. **Sequence it before the Goodkin bank** (it's underneath everything), so
the bank arrives as one clean instance of it.

---

## 8. Generality — the two resource-grief guards

Handing players a shared or exclusive resource in a multiplayer world is
inherently griefable, and there are **two classic patterns, each with its standard
guard** (see the `anti-grief-resource-guards` memory):

- **Exclusive resource** — one holder at a time (a server's attention, a
  workbench, a single-occupancy machine, a podium, a research station) → a
  **LEASE**: held only while actively used, **revoked on idle** (§4). The
  lock-*hog* guard; kin to residency's eviction. Attendant's service-lease is its
  first consumer.
- **Common-pool resource** — a shared pool everyone draws from (a cash till, a
  limited stock, a shared supply) → a **QUOTA**: a per-actor cap so no one
  consumes the pool to deny others. The commons-*drain* guard. First worked
  instance: the bank's per-account withdrawal limit (see
  [terminus-banking.md](./terminus-banking.md) §8).

Don't lift shared primitives **yet** (let each system own its version), but build
both clean enough to **lift later** — the next few systems (crafting stations,
shops, resource nodes) will each want one guard or the other.

---

## 9. Staffing, hours & the unstaffed point

A service point assumes a server — but staff go off-shift (after hours,
understaffed, a brand-new venue). The de-risking split: **the server is only the
CASH + relationship interface.** Ledger ops (`pay`, and balance/statement/transfer
— which should live on the wallet) are **self-service from anywhere**; only
physical-cash ops and the relationship need a person. So an unstaffed/closed point
**never locks a player out of their money** — the card always works; only cash +
service are gated.

**Three staffing states, derived from the employment roster** (so *hours = the
roster*; "closed" = an empty on-shift window — reuse the shipped engine):

1. **Staffed & open** — a server attends; the full queue/relationship experience.
2. **Self-service** — no server, but a **machine** does bounded cash ops (no human,
   no relationship, no enrollment, a *lower* quota). A per-venue config.
3. **Closed** — no cash/service here; shuttered, come back during hours. (The card
   still works elsewhere — never a lockout.)

The venue configures self-service-machine vs close-when-unstaffed. Falls out for
free: a **liveness rhythm** (busy hall by day, dim/shuttered by night — world-clock
+ roster driven, which the city-economy Atmosphere wants anyway). The **anti-grief
guards carry to self-service** (the machine is an exclusive point → the lease; its
cash ops → the quota) — the guards live on the substrate, not the human.

*v1:* the roster gives hours for free; simplest complete v1 = staffed during hours,
**closed** off-hours (the self-service machine is a clean later add, not a stub);
the card works throughout, so "closed" is never a lockout.

## 10. Deferred seams (named)

The **fairness-cap-under-contention** (active-hogging); appointment/scheduling
disciplines beyond FIFO + ticket; multi-server load-balancing niceties; the lifted
shared **exclusive-lease** primitive (§8); player-run/player-staffed service
points; a client queue-position card.
