# Terminus — the city build track

> **Status: roadmap, 2026-07-12. Mostly anticipatory.** The sequenced build plan
> for Terminus at street level — the street map + city services + the venue
> economy. Design source: `docs/staging/terminus-city.md` (districts, map,
> neighborhoods, the Atmosphere/Ledger economy model, the institution-archetype
> principle). This track names *where we're headed and in what order*; each phase
> enters the normal slate → requirements → plan → build loop when its turn comes.
> Near-term is **P0–P2**; the rest is anticipatory. Not canon; ratify geography
> into `story-bible.md` on sign-off.

## The spine (locked layout)

South → north: the **Gate** (TPA terminal · port · city gate · the sea) at the
south; **University Avenue** running **east–west** across the middle (the
civic/commercial heart); the **Campus** at the north head, with the
**Confluence** (Marrow + Mere meeting) just behind it. The combined river runs
south through the city, splitting **West Bank** (working/everyman) from **East
Bank** (prestige/new-money), crossed where University Ave spans it. Landward
valley roads run north past the campus to the domains/Marches/front; the
**Garrison** guards the northern approaches. *(Note to confirm into canon: the
Confluence sits at the northern head by the campus, the port at the southern
river-mouth — softens the bible's "port-city at the confluence" line, preserves
campus-on-the-ruins.)* Full map in the staging doc §2.

## Critical path

**P0 (space) → P1 (life) → P2 (proof).** P3–P5 roll out in parallel on that
foundation. P1 is the load-bearing one — the map is a dead shell without it.

## Phases

### P0 — Street-map spine *(near-term · foundation)*
- **Goal:** lay the navigable geography everything else attaches to.
- **Build:** the core axis (Gate → University Avenue → campus-edge) as walkable
  rooms; the river + banks + bridges; the district/neighborhood skeleton (named
  spatial nodes, lightly furnished — not full venue build-out).
- **Reuses:** Location/spatial substrate, Zone, addressing (`Locality`/AddressApi
  — the address graph can ride the wire graph, per the underground note).
- **Deliverable:** a walkable core spine + the neighborhood map as spatial units.

### P1 — Economy floor (Atmosphere / Ledger) *(near-term · life support)*
- **Goal:** the DAU-independent NPC-baseline economy — the anti-ghost-town floor.
- **Build:** per-neighborhood aggregate demand model (Layer A, notional, the
  circular flow); business viability on the NPC floor; the **Circulation Reserve
  autopilot** (floating terms-of-trade controller, §7); the firewall (Atmosphere
  can't call `postTransaction`).
- **Reuses:** `Business`/P&L (add the `baselineCapture` revenue term), banking
  conservation + CB + `reserve` verb + governor office, residency cull,
  ScheduleApi/WorldClock.
- **Deliverable:** neighborhoods carry a demand model; the reserve holds its band
  default-safe; businesses stay viable on the floor regardless of DAU.

### P2 — First archetype: the tavern *(near-term · proof)*
- **Goal:** prove the archetype-×-tier pattern *and* the economy together, at the
  lowest cost (the bar substrate is shipped).
- **Build:** the tavern **composition template** + the 6-row **tier table**
  (Shallows local → Wharfside chophouse → Nightside dive → Old Quarter taproom →
  Gray shebeen → Vionne club); the Layer-A demand hook; the access-policy
  (open/regulars/vouched/recognition-gated).
- **Reuses:** the whole Dave's-Bar stack — `Business`/roster/shifts/wages/tips,
  `Menu`/order/serve/craft, `Bar`, `TipJar`, `settle`/tabs/salesTax,
  `BrandedBottle` back-bar, `RecognitionApi`, the `covers`/`tends` brains.
- **Deliverable:** class-tiered taverns alive across the anchor neighborhoods;
  the archetype pattern validated; the class-probe visible.

### P3 — The everyday archetype set *(anticipatory · rolling)*
- **Goal:** fill neighborhoods with their repeating, class-tiered venues — the
  lived-in city.
- **Build (each = a small archetype × tier build):** market/grocer, clinic, shop/
  boutique, residence-block, workshop, bathhouse/laundry, neighborhood shrine,
  bank-branch/moneychanger, pawnshop/fence.
- **Reuses:** crafting, banking, vitals/medic (clinic), stewardship/residency
  (residence), worship (shrine).
- **Deliverable:** every anchor neighborhood has its everyday palette, viable on
  the floor.

### P4 — City services + the admin-sim *(anticipatory)*
- **Goal:** the municipal-services layer + the "run the city" job.
- **Build:** fire/watch/hospital/waste/utilities with **coverage** (and the
  uneven-coverage/redlining theme — corpo/private-provided historically, the
  polity municipalizing it); the admin-sim surface (zoning/business-slots, the
  demand/supply/vacancy dashboard, the governor's reserve/subsidy levers).
- **Reuses:** office substrate (Lands & Works), banking (treasury/subsidy), the
  P1 economy floor.
- **Deliverable:** services with coverage; the administrator/governor role is
  playable and consequential.

### P5 — Landmarks + the war home-front *(anticipatory)*
- **Goal:** the singular civic + military venues.
- **Build:** Museum (design exists), Forum (forums shipped), TPA terminal (seed
  exists), counting-houses/exchange, consulate row; the Garrison/muster
  (contract board), arms works, watch house — the combat-loop hook (players
  *fill contracts*).
- **Reuses:** forums, office substrate, combat-core (build-1 shipped),
  fast-travel/TPA.
- **Deliverable:** the civic + military singulars; combat contracts flow outward
  to the frontier.

### P6+ — The long tail *(anticipatory · just-in-time)*
Full neighborhood realization, specialty venues, the diplomatic quarter, the
underground (drains/wire), deeper admin-sim, boom/bust dynamics, player-founded
businesses.

## Cross-references / reconcile
- Economy + venue design: `docs/staging/terminus-city.md` (§6 economy, §7 reserve
  autopilot, §8 tavern archetype when folded in).
- The **attuned allegory** (`docs/staging/eternal-university/attuned-dispossession-allegory.md`)
  — the Registrar + the redlining covenant are property-allegory venues that
  share the ledger; land them in P3/P4.
- The **underground** note (drains/wire) — the address graph rides the wire graph;
  the drains-meet-ruins seam sits under the campus (north head).
