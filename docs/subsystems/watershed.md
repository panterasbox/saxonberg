# Watershed

> **Skeleton (W0).** Each wave fills in its own section as it lands; the
> doc is complete at W10. Built from
> [water-requirements.md](../requirements/water-requirements.md) and
> [water-plan.md](../plans/water-plan.md).

The subsystem that makes water **get somewhere**. Water already had
physics everywhere and weather nowhere: it is bulk matter you can fill,
pour and drink, the body has a `hydration` reserve, soil holds moisture
in litres. What was missing was every connection between them.

One relation supplies all of it: **every place has a position on a
watershed.** Flow, rights, diversion, storage, pollution and hydro power
are readings of that single fact, and the organising primitive
underneath is **gravity** — `mgh`.

## The spine

One edge, repeated at two scales: **precipitation integrates into a
place.** Once for soil (a bed fills from the sky) and once for a
watershed (a reach fills from its catchment).

## Contents

- Elevation — the zone field, and why `coords.z` is not it
- The precipitation integral
- `Watercourse` — topology authored, direction derived
- Flow, snowpack and navigability
- `Conduit` — the conveyance ladder
- Storage and control structures
- Rights
- Contamination and the counterplay ladder
- The three basins

## Where the code lives

| | |
|---|---|
| **kernel — the physics** | zone elevation (`lib/zone/Zone.ts`), the precipitation integral (`api/weather.ts` + `platform/idea/api/WeatherLogic.ts`), the pressure fallback (`platform/idea/api/BiomeLogic.ts`), the rain→soil edge (`lib/husbandry/Cultivable.ts`), the `water-right` document kind (`lib/document/DocumentKinds.ts`) |
| **`water` pack — the works** | `packages/content/water/src/` |
| **content** | the basins and Terminus's works — `world-seed`, `terminus`, `hinkley-hills` |

The split follows arcana's membership test: **a capability pack holds
what other packs' content names.**
