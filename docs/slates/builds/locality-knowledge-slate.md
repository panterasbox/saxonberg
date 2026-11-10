# Locality knowledge slate — what you know of a place is what your map says

**Status:** slated (2026-11-01, from the client-surface build's navigator
conversation). **Size:** small–medium. **Seeds from:** the owner, in the
!509 review: *"what you know about a Locality should be a product of your
map data. when you visit a locality for the first time and add it to your
map, you also add whatever metadata about the locality to the map that
gets read later by the breadcrumbs."*

## The decision already made

- **Zones are mechanism, not places.** A zone groups coordinates; many
  are scaffolding (a warren grid, mine cells). No Named / Perceptible /
  Visible on Zone. What a player sees of zones is derived facts — the
  cell, whether a way out leaves the zone — never a zone's name.
- **Locality and Structure are the fiction's places.** Structure is
  already Named + Perceptible + Visible + Detailed. Locality is a bare
  Idea with a `name` field and the tier-level fields (weather pins,
  climate lean, street lighting).
- **The navigator is navigation, the room is inspection.** Shipped in
  !509: the `map` card ("where you are") on the left, the room an
  ordinary inspection card in the gallery.

## What this slate builds

1. **A first visit writes the Locality into your map.** The
   `location-graph` map document already takes claims (`perception` ·
   `publication` · `told` · `bought`, each with `firstSeen` / `lastSeen`;
   ⚠ the shipped channels are `walked · seen · searched · published ·
   charted · told` — corrected 2026-11-10).
   Entering a Locality you have no claim for appends a **locality claim**
   carrying what you learned there: its name, its description (when it
   has one), its government, and whatever else it declares as
   learnable — dated, never corrected behind your back.
2. **The breadcrumb reads your map, not the live world.** Today the
   navigator's crumbs come from the live address walk (display-only).
   After this, a crumb is a claim: a Locality you have not recorded
   shows as unnamed ground, and one that has changed since shows what
   you knew, with its date.
3. **Inspecting a Locality reads your map's entry.** Clicking a crumb
   opens an inspection card about the Locality as you know it — not a
   `look` at something out of reach. This is why the `look terminus`
   scope question (should enclosing places count as "around you"?) is
   not needed.
   ⭐ **Revised 2026-11-09** ([map-slate § The navigation pane, revised](./map-slate.md)):
   when you **own an illustrated map** of that Locality, the crumb opens
   that map — the broad picture behind each crumb. This item is what a
   crumb does when you own none; which of the two wins when you have both
   is open.
4. **Locality gets descriptors to copy.** Locality composes
   `NamedMixin` (its `name` field moves there; rows unchanged),
   `PerceptibleMixin` and `VisibleMixin`, so it can carry what a first
   visit records. 23 of the 24 shipped Locality rows have no description
   yet; they say nothing rather than shipping invented prose.

## Open

- **Which characters keep a map at all.** `map` told the `tour`
  character *"You have no maps yet"* after walking the bar and the
  lounge: recording runs only for a `CartographerMixin` body
  (`Perceiver.learnSurroundings`). Does every player character keep a
  map, or is it a capability (a notebook, a skill)? The navigator's
  breadcrumb, once map-backed, is empty for anyone who doesn't.
- **What a Locality declares as learnable** — the epoch ceiling, the
  title holder, coverage (the map slate's zone metadata panel lists
  them). Each is a claim kind or a field on the locality claim.
- **Does a rename show?** A Locality renamed after your visit: your map
  keeps the old name until you return — consistent with the map's rule —
  but the breadcrumb should probably mark it stale the way an edge is.

## Cross-references

- [map-slate.md](./map-slate.md) — the zone navigation card (the rose,
  the interzone list, the zone metadata panel) this extends.
- [location-graph.md](../../subsystems/location-graph.md) — the map
  document, claims and channels.
- [address.md](../../subsystems/address.md) — Locality and the address
  walk.
- [iconography-slate.md](./iconography-slate.md) — the crumb and compass
  marks, through the one icon map.
