# Navigation server slate — what the server must change for the client's models

**Status:** slated 2026-11-14, a sub-slate of the navigation build
([navigation-requirements](../../requirements/navigation-requirements.md)).
**Size:** a set of light server touches. The owner's plan: *"a first pass
trying not to touch the server much, then follow up — some light server
touches are probably fine."* Each item says whether the navigation build
needs it (**first pass**) or it follows (**follow-up**).

The client draws the pane from four classes of data:

| class | meaning | latency |
|---|---|---|
| **A — on the client today** | pushed on every move in `Whereabouts`, for the room you stand in | instant |
| **B — on the client after the navigation build** | the copy of your map documents, and the zone-facts read | instant |
| **C — a server round trip** | fetched on hover, then cached (glossary terms through the help REST API; later, a live describe) | ~100 ms once |
| **D — the server does not have it** | the items below | none until built |

**What `Whereabouts` carries today (A)**, for the current room only: the
place's name; the building's name; every enclosing Locality's **name and
address**, outermost first; `x, y, z`; the perceivable exits as
`WayRecord`s (direction, state, `crossesZone`, destination name, the
boundary's name); weather, season, day or night; the innermost
jurisdiction's name.

## The items

### S1 — Claims carry where the place is **[first pass — in the requirements]**
Zone, coordinates and level written on every place claim at perception
time; a told or charted source passes on what it knew. Without it no map
can be drawn from your knowledge ([location-graph.md](../../subsystems/location-graph.md);
the firewall decides it).

### S2 — The copy of your map reaches the client **[first pass — in the requirements]**
A transport for your map documents, kept current by deltas, repaired
after a gap, consistent across a reconnect, a restart and a second
device. Reuse the subscription path or card pushes before adding a third
push path ([client-knowledge-model-slate](./client-knowledge-model-slate.md)).

### S3 — A zone-facts read **[first pass]**
The zone's kind and cell size, and a **derived label** (*"this grid of
rooms, 3 m cells"*) — never its true extent or levels, which would tell you
what you have not explored. The zone's path travels spoiler-tagged (S9).

### S4 — Each Locality on the wire **[follow-up, partly first pass]**
Today only a Locality's name and address reach the client, and only the
**innermost** jurisdiction. A breadcrumb's tooltip wants, per Locality:
its government (the Locality carries `_governmentKey`), its kind (realm,
city, district — derived from the address tier; there is no field), and
its description once Localities have one (23 of 24 have none; needs
Named/Visible on Locality, per
[locality-knowledge-slate](./locality-knowledge-slate.md)). Climate lean
and street lighting are on the Locality too, but read as outdoor
conditions (the status bar's). **First pass:** government and kind, cheap
reads on the coverage walk `Whereabouts` already does.

### S5 — The first-visit claim for a Locality **[first pass — in the requirements]**
Entering a Locality you have no claim for writes one with what it
declares learnable; the breadcrumb reads it.

### S6 — A route plan reaches the client as data **[first pass]**
`RoutePlan` (legs, cost, assumptions) is plain data, but `route` prints
MML only. The route lens and a room tooltip's *To get there* need the
structured plan — knowledge-gated, planned over your own map, never the
index.

### S7 — What a door looked like when you saw it **[first pass]**
Edge claims do not record a way's state (`open · shut · locked · window`)
at the time you saw or tried it. The *refused* lens and a door's *last you
knew* need it. Banked like the keywords are: what you saw is what you
learned.

### S8 — Door names and openings on edge claims **[follow-up]**
A way's boundary name (*the iron-bound door*) and opening reach the client
only for the room you stand in. A tooltip on a remote way shows *a door*
until this lands.

### S9 — Paths travel spoiler-tagged **[first pass]**
⚠ A claim's `place` is the place's **identity path** and its `label` its
**template path** (`Cartographer` writes it as *"the row behind the
place"*). The owner's position (2026-11-14,
[spoiler-slate § Paths are a spoiler](../tails/spoiler-slate.md)): **paths
are a spoiler on the appetite axis** — hidden by default, one deliberate
click to see, never prevented. So the copy of your map carries them
**tagged with a spoiler level**, as the wiki's reveal model does
(*appetite keeps and tags; capability deletes*), and the client collapses
them unless the player's appetite says otherwise. The same holds for a
zone's path (S3) and anything else a tooltip shows that names a row.

## Not here

- **A live describe** for items, people and doors you are looking at —
  the [tooltip-slate](./tooltip-slate.md)'s.
- **Glossary terms** — the help REST API already serves topics (class C);
  no server change.
- **Trail, notes, prices seen, NPC hours** — the *your map grows* build.
