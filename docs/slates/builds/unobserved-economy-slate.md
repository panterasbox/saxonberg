# Unobserved economy — what the realm's NPC trade does while nobody is there

> **Status: UNBUILT.** Cut out of the scan sweep (2026-10-14), whose
> requirements had drifted from *loading content by reference* into
> *simulating supply and demand* — a different design. Today the NPC
> economy keeps running with nobody online because ~50 houses and their
> premises rooms are BOOTED so their brains fire; the scan sweep leaves
> those entries in place, each with its reason pointing here.
> **Left:** whether the realm's NPC trade runs while unobserved at all ·
> if it does, how it is computed without loading the places it moves
> between (⭐ against the location graph's record, not live content) ·
> what a player arriving after a gap sees at a counter, a job board, the
> cash-and-carry and the Gazette · the faucet question the guild slate
> already raised.
> **Size:** a build.

*Opened 2026-10-14 from the scan-sweep requirements review. The user:
"counters refilling on load like what are we even doing here? this build
is all the sudden about solving the problem of customer demand in npc
run shops? how did we get there?"*

---

## How the question arose

The scan sweep's rule is that content loads only when a player's act
forces it, by following authored references — never by search, never at
boot. Applied to the houses, it would unboot ~50 of them. But those
houses are booted for a reason that is not about loading: their NPCs run
**cadence brains with nobody present** (`presenceGated = false`), and
those brains walk literal player verbs between places (`behavior.md`:
*"no verb only an NPC can use"*):

| beat | what it does between places |
|---|---|
| `consigns` (shopkeeping) | goods-yard hands carry floor stock to the cash-and-carry and consign it |
| `restocks` (Mara) | buys the bar's par shortfall from suppliers; posts gigs on the job board |
| `hauls` | the carter takes any posted haul nobody took |
| `farms` | the farm consigns to the farmers market |
| `stocks` (shopkeeping) | the general-store keeper buys on terms, borrows, shelves, repays |
| `supplies` / `banks` (medicine) | blood carried to the ward fridge |
| `prints` | the Gazette posts the price index everyone sees at login |
| the roster tick | shifts, cover, wages, vacancies, the closed sign |

The scan sweep's first draft tried to keep all of that true by
*deriving* it at the receiving end — refill-by-elapsed-time counters,
derived consignments, derived gigs, Gazette editions. That is an economy
design, and it belongs here.

## ⭐ The location graph is the record movement is computed against

The user, on the cut: *"your whole walking goods between places is
exactly why we gave the location graph its own record and source of truth
that's easily scannable so you don't have to load all that content to
pathfind."*

The `location_graph` collection ([location-graph.md](../../subsystems/location-graph.md))
is a projection of the world's shape — one row per place, its edges and
costs — that `Traversal` routes over **without loading a single room**.
So the question is never "load the goods yard and the cash-and-carry so
a hand can walk between them": a delivery is a route over the graph with
a cost and a duration, computed from records, and the content at either
end loads only when a player arrives there. This is the substrate any
answer here should stand on.

## Questions this slate must answer

1. **Does the NPC economy run while nobody is online?** The mining doc's
   *"supply must not be a function of concurrency"* says yes; the
   balance slate's 370k unobserved brain invocations a day says it must
   not cost that. The middle answer is derived trade over the graph.
2. **What is a delivery when nobody is watching?** A route over the
   `location_graph` with a duration; goods leave the source's record and
   arrive at the destination's when either end is next loaded — through
   the money chokepoint, never a raw balance.
3. **What does a player see on arrival** at a counter, a job board, the
   cash-and-carry, the Gazette, after a gap? (The scan sweep's
   requirements draft had answers; they are inputs, not decisions.)
4. **The faucet.** The residency reset sweep restocks counters from
   nowhere; the guild slate says that erases the Carriers' paymaster.
5. **Who pays for unobserved compute** (`compute-is-a-metaresource`).

## Collisions

- `credit-slate` drive step 6 (the keeper borrows with nobody connected)
- `livelihood-slate` (the NPC job board a new player earns from)
- `press-slate` / `gazette-slate` (the price index at login)
- `spawn-distribution-slate`, `guild-slate` (the faucet)
- `eager-residency-slate` (who may keep a thing loaded unobserved)
- `npc-behavior-slate` (*"simulate what someone can see; derive the
  rest"*), `agent-coordination-slate` (`presenceGated` as the equity axis)

## Cross-references

- [location-graph.md](../../subsystems/location-graph.md) — the record
- [employment.md](../../subsystems/employment.md) · [retail.md](../../subsystems/retail.md) · [residency.md](../../subsystems/residency.md) · [behavior.md](../../subsystems/behavior.md) · [credit.md](../../subsystems/credit.md) · [press.md](../../subsystems/press.md)
- [scan-sweep-slate](./scan-sweep-slate.md) — where this was cut from
