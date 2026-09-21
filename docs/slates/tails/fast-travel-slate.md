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

- [docs/slates/onboarding-slate.md](../builds/onboarding-slate.md) /
  [docs/subsystems/char-gen.md](../../subsystems/char-gen.md) — the **lounge
  terminal** + dorm-lobby home-routing ride this network; the lounge-exit
  is the first/simplest terminal use.
- [docs/slates/augmentation-slate.md](../tails/augmentation-slate.md) — the
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
  [message-rendering-slate.md](../tails/message-rendering-slate.md) /
  language — published **schedules + route maps** are Readables; a route
  map is a layout/diagram (later).
- [docs/slates/access-slate.md](../tails/access-slate.md) — the credential
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

