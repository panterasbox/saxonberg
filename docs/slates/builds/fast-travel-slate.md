# Fast-travel slate (working doc)

> **Status: architecture set, build it minimal; living-infra deferred.**
> A directed network of public **terminals** you teleport between, gated
> by a **scan-to-register** credential. Designed to be living
> infrastructure (breaks down, gets disrupted) — but that dynamism is a
> later wave; v1 is the network + credential + on-demand travel, with the
> lounge-exit as the first use.

Working slate for **fast travel** — the *Eternal City Teleport Authority*
network. Teleport-based transit across the world, distinct from the
**locomotion** subsystem (physical room-to-room movement). The lounge-
exit and home-routing (char-gen/onboarding) ride this.

The load-bearing decisions:

1. **A directed network of public terminals.** Terminals are nodes;
   **routes (hyperlanes)** are *directed edges*; **not all-to-all** — an
   authored topology. You travel only where a terminal routes.
   **Topology is per-terminal authorial + emergent:** whoever places a
   terminal in a room wires its destinations (like authoring an exit); the
   MUD-wide network is just the sum of those choices — no central planner
   determines routes. The **Authority** (oversight group) owns **standard +
   health, not shape**: the uniform device spec (why every terminal looks
   identical) and the wear/maintenance loop — never the topology.

2. **Terminals are *public infrastructure*; the last mile is on foot.**
   Terminals live in lobbies / stops / hubs — never in private/instanced
   space. You fast-TP to the **dorm lobby**, then walk to your room.
   Private space hangs off the network by foot. (This keeps the network
   clean and makes lobbies local social nodes.)

3. **Unlock = scan-to-register.** You reach a terminal **by other means
   first** (walk, story); **scan your credential at it to add it to your
   allowed list**; *then* you can fast-TP to it. Explicit, diegetic
   registration — not auto-unlock.

4. **The credential is implant + card.** A baseline travel module on the
   implant (frictionless) and/or a physical card (loseable/lendable). It
   holds your **registered-terminals** list (and, when the economy
   exists, pays the fee).

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
- [docs/slates/world-clock-slate.md](../tails/world-clock-slate.md) — drives
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

1. **Directed network of public nodes** (terminals + routes), not
   all-to-all; last mile on foot.
2. **Scan-to-register** to unlock; **on-demand** travel to registered
   destinations.
3. **Credential = implant/card** holding the registered set.
4. **Teleport, not conveyance** — distinct from locomotion.
5. **Built to be living infrastructure** — dynamic seam now, disruption
   loop later.

---

## Why teleport (and why it's magic)

Principle 4 says teleport, not conveyance. The *reason* is load-bearing:
the network connects places that aren't physically connectable. A tube,
a train, a bus can only reach what's on the same continuous ground — but
this world is **un-genred** (see
[design-philosophy.md](../../design-philosophy.md) /
[eternal-university-slate.md](../builds/eternal-university-slate.md)), and its
destinations don't share a ground. You can't take a tube ride to Narnia
or a space station; only **magic teleport** can stitch a fantasy campus,
a sci-fi station, and a pocket-universe lounge into one transit map.

So the network's *reach is the un-genre thesis made navigable*: the
departures board lists places that have no business on the same map, and
that incongruity is exactly the "you're in for anything" promise in
concrete, walkable form. The route map is a content surface for it (see
the EU staging Stop) — most stops mundane, a few impossible, the lines
running *out* past the edge of any one reality.

**Naming note.** The operator's "Eternal" is earned by this
everywhere-and-nowhere reach, not by any one city. Per the EU slate's
naming note, *"Eternal"* belongs to the **University** and the **teleport
network**; whether the surround city shares it is open there.

---

## The model

**Terminal** (a public-area location node):
- **Directionality** — `arrival` / `departure` / `both` (per-terminal
  content; e.g. the lounge terminal is *both* — a returnable hub).
- **Interaction mode** — **on-demand** (interact → pick a destination, a
  closed-choice prompt) is v1; **scheduled** (cycles destinations on a
  world-clock timetable, bus-station style) is a richer per-terminal mode
  later.
- **Operator** — the Eternal City Teleport Authority (flavor; later a
  faction/maintainer).
- **State** — designed disruptable (condition), for the later living-
  infra loop.

**Route (hyperlane)** — a directed edge A → B. The authored topology; a
terminal's outbound routes = where you can go from it.

**Credential** (implant module and/or card) — your **registered-terminals
list**, grown by **scan-to-register** at terminals you've reached by
other means; authorizes travel (and pays the fee, when the economy
exists).

**The travel act:** reach a terminal by other means → **scan** to
register it → later, at a departure-capable terminal → **on-demand pick a
registered destination it routes to** → **teleport** to the arrival-
capable terminal. (Reuses teleport + prompts.)

**The discovery loop:** explore on foot / via story to reach new
terminals → scan to register → fast-TP among your registered set
thereafter. Exploration unlocks convenience.

---

## The lounge tie

The lounge has the **first terminal** — `both`-direction, **comped** (no
fee), in a zone disconnected by foot but connected by terminal. Its
destinations are **state-routed** (the onboarding slate's lounge-exit):
**campus entry** if not onboarded, your **home (dorm lobby) + registered
set** after. The dorm **lobby** is a terminal; your room is a foot-walk
from it. So the lounge-exit + home-routing are just this network's first,
special nodes.

---

## What it reuses vs reveals

**Reuses:** teleport (the TP), prompts (on-demand picks), world-clock
(schedules, later), Readables + message-rendering (maps/schedules,
later), augmentation (credential-as-implant), npc-dialogue (operator/
maintenance NPCs, later), zones/locations (terminals), access
(authorization).

**Reveals (deferred subsystems / seams):**
1. **Economy / currency / fees** *(far off — multiple sessions away).*
   "For a fee" needs currency + payment; **v1 is free/comped** (or a
   placeholder), and the economy is its own much-later subsystem. Just a
   conceptual hook for now.
2. **Object condition / maintenance / repair** *(later loop).* The
   living-infrastructure dynamism (breakdowns, maintenance, disruption,
   sabotage) is a stateful-device + repair pattern — a later wave. The
   *seam* (terminals/routes are stateful) exists now; the loop doesn't.
3. **Scheduled mode + published schedules/route-maps/hubs** — the bus-
   station style + wayfinding content; later (ties world-clock +
   Readables + the onboarding signs).

---

## Open questions / forks (mostly settled)

1. **Credential: implant, card, both?** *Settled: both* — implant
   baseline + card variant; not load-bearing.
2. **Unlock model** — *Settled: scan-to-register* (reach by other means →
   scan → registered).
3. **Economy/fees in v1** — *Settled: deferred, free/comped v1*; economy
   is its own far-off subsystem.
4. **Maintenance/disruption loop in v1** — *Settled: deferred*; build the
   stateful seam, not the loop.
5. **Interaction mode v1** — *Lean: on-demand only*; scheduled is a richer
   per-terminal mode later.
6. **Directionality** — per-terminal **content** choice (arrival/
   departure/both); no engine constraint.

---

## Build order

**Wave 1 — the minimal network + the lounge.** Terminals (public-node
locations) + directed routes + directionality; the credential
(registered-terminals list) + the **scan-to-register** action; **on-
demand** travel (pick a registered destination → teleport); the **lounge
terminal** + dorm-lobby home-routing (the char-gen/onboarding dependency).
Free/comped (no fees). On-demand only.

**Wave 2 — scheduled mode + wayfinding.** Scheduled terminals (world-
clock); published schedules + route maps (Readables); transport hubs.

**Wave 3+ — living infrastructure.** The condition/maintenance/disruption
loop (breakdowns, repair, delays, rerouting, sabotage); the Authority as
a faction/maintainer. **(Economy/fees land whenever that subsystem does.)**

---

## What this slate does NOT cover

- **Locomotion** (physical movement) — a separate subsystem; the last-
  mile walk uses it.
- **The economy** — fees are a deferred hook; v1 is free/comped.
- **The maintenance/disruption *loop*** — later; the stateful seam is here.
- **Char-gen / onboarding** — they *consume* the lounge/lobby terminals;
  defined in their slates.
- **The author/housing content** — the dorm/lobby are content; this just
  places terminals in public nodes.

---

## Once shaped into formal requirements

This slate boils down to:

- The **terminal/route network** (public nodes + directed hyperlanes;
  last mile on foot) + per-terminal **directionality** and **interaction
  mode** (on-demand v1).
- The **credential** (implant/card) + the **scan-to-register** unlock +
  the **discovery loop**.
- The **travel act** (reach → scan → on-demand pick → teleport), reusing
  teleport + prompts.
- The **lounge terminal** (both, comped) + **dorm-lobby home-routing**
  (the char-gen/onboarding dependency).
- The **living-infrastructure seam** (stateful terminals/routes) without
  the loop; **economy** and **scheduled mode** as deferred hooks.
- Tests: travel only along registered + routed destinations; scanning an
  unvisited terminal registers it; fast-TP deposits at the arrival
  terminal (public node), never private space; the lounge routes by
  onboarded-state; no fee charged in v1.

Scheduled mode, schedules/maps/hubs, the maintenance/disruption loop, the
Authority faction, and fees (the economy) wait for their own waves.
