# Client knowledge model slate — a replica of what you know, not a mirror of the world

**Status:** slated 2026-11-10, from the navigation-pane conversation
([map-slate § Lenses](./map-slate.md)). **Size:** a wave — proposed as the
**foundation wave of the navigation build**, not a client refactor of its
own. **Supersedes the shape of**
[mql-subscription-slate § Shadow model (future)](../tails/mql-subscription-slate.md#shadow-model-future)
while keeping its pipeline (normalizer → shared store → selectors).

## Why now

The client was built for *what is in front of me now*. Early on the
owner floated a client-side **shadow model** — a general-purpose model of
server state to build any experience on — and it was set aside as
over-engineering. The mql-subscription slate kept the design (its own
motivating example: *a mini-map that fills out as you explore*), and
`card-surface.md` left a tripwire: a widget reading the client's stuff
registry to answer real questions is *"the on-ramp to a client-side
shadow model — stop and have that conversation explicitly."*

The navigation pane is that conversation. The minimap, the Zone tab, the
room view and the lenses all need **knowledge that outlives the current
view** — places you are not in, claims with their dates, your trail —
and several views over the same records at once. The owner: *"we're
going to want … these models sent down to the client so it can work off
them, refreshed whenever the server decides it needs to send an update —
we have to make this stuff performant."*

## What exists (2026-11-10)

- **zustand**, one store (`packages/client/src/store/index.ts`, ~2,000
  lines) plus slices. Card records are read directly; there is no
  selector layer.
- **`stuffRegistry`** — a `Map` of rendering metadata per stuff id, a
  side-effect cache whose only sanctioned reader is `MmlRenderer`'s
  click resolution ([card-surface.md § Client stuff registry](../../subsystems/card-surface.md)).
- **Server-side personal knowledge** — the per-player `map` document
  (`/home/<key>/map/<locality address>`), claims with `channel`, `band`,
  `firstSeen`, `lastSeen`, read by `NavigationApi.readMap(viewerKey,
  prefix)` ([location-graph.md](../../subsystems/location-graph.md)).
  It renders as MML today and reaches no client model.
- **MQL subscriptions** — per-Interactive, delta-pushed; each
  subscription's last result lives on its own and dies with it.

## The shape **[LEAN]**

The 2026 design mirrored server **objects** — every thing ever seen, by
id. Since then the server gained what is actually authoritative here:
**the player's own knowledge documents.** So the client model is a
**replica of your personal models**, not a mirror of the world:

1. **The knowledge replica** — what you know: your map claims, and as
   they are built your notes and pins, your trail, prices you have seen,
   NPC hours you have learned. **The server owns it**; the client holds a
   versioned copy kept current by deltas, with gap detection and a
   resync. Nothing in it is invented on the client — so it survives a
   reconnect and a second device, and the evidence firewall
   (only your own knowledge leaves the server, never the location-graph
   index) holds by construction.
2. **The zone-facts cache** — what is true of a zone and changes rarely:
   its shape, structures and their faces, boundaries, levels. Versioned
   per zone, fetched once, invalidated by version.
3. **The session cache** — live entities and senses: today's
   `stuffRegistry`, normalized; sound and smell events; party
   positions. Per session, dropped at logout.
4. **Selectors are the only way in.** The minimap, every lens, the room
   view and the Zone tab are derived views over the three stores,
   memoized. A new lens is a selector, not a new wire.

## Performance **[LEAN]**

- The knowledge replica lives in **its own zustand store**, apart from
  the UI store, so a burst of claim updates never re-renders the card
  surface.
- Records normalized by id; lens computations are memoized selectors
  keyed on the records they read.
- The library is not the problem — zustand stays; the shape is the
  change.

## Risks

- **Drift.** A second copy of anything drifts. Hence a replica of
  server-owned, versioned documents with resync — never a model the
  client assembles from frames.
- **Per-viewer presentation.** Safe only because everything in the
  replica is already projected for this viewer (the server sends your
  view of a thing, never the thing).
- **Scope creep into a world mirror.** The bound is: your knowledge, the
  zone you are in, the session.
- **Last-writer-wins** across two devices editing notes — the
  card-surface slate's open edge, inherited here.

## Open

1. **Persist the replica on the device** (IndexedDB) so a returning
   player's map paints before the socket is up — or memory only?
2. **Push or pull.** Does the server push a delta whenever it writes a
   claim, or does the client pull a zone's slice when you enter it
   (or both: pull on entry, push while inside)?
3. **The wire.** A new envelope family for replica deltas, or MQL
   subscriptions over the map document as the transport (the
   subscription slate's normalizer seam)?
4. **Which per-player records are new.** Trail, notes, prices seen and
   NPC hours learned do not exist server-side yet; each is a knowledge
   record the map's lenses need (see map-slate's candidate list).
5. **`stuffRegistry`'s migration** into the session cache, and whether
   `MmlRenderer` reads through a selector afterwards.

## Cross-references

- [map-slate](./map-slate.md) — the first consumer: the pane, the Zone
  tab, the room view, the lenses
- [mql-subscription-slate § Shadow model](../tails/mql-subscription-slate.md#shadow-model-future)
  — the original design, its pipeline and its seam
- [card-surface.md](../../subsystems/card-surface.md) — the stuff
  registry and the tripwire
- [location-graph.md](../../subsystems/location-graph.md) — the map
  document, the claims, the firewall
- [locality-knowledge-slate](./locality-knowledge-slate.md) — Locality
  facts as claims, read by the breadcrumb
