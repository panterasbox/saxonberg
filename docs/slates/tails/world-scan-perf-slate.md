# World-scan performance slate — the `world:` seed is O(n), and indexing only half-fixes it

**Captured 2026-09-01.** An inventory of every runtime `world:` MQL query
— each a full O(n) scan of the object registry — plus the triage that
falls out of one sharp observation: **a by-mixin index only helps when
the mixin is selective; for a broad mixin you still pay, and for the
worst sites you were scanning to rebuild a relationship something else
already owns.**

> **Status: design conversation + verified inventory, captured. Not
> requirements.** Call sites verified against `master` at capture; line
> numbers will drift — the enclosing function names are the durable
> anchors.

**Provenance:**

> **User: "any inventory on anything that's doing mql queries with
> 'world' … things that do a full scan of every stuff item in the game.
> we have to get rid of that shit or somehow make it performant."**
>
> **User (the crux): "even if we index mixin.X, depending on what X is
> the scan could still be really expensive."**

**Sits on:** [mql.md](../../subsystems/mql.md) (the `world` seed + system
mode — **read first**), [antipatterns.md](../../antipatterns.md)
(§ Bespoke Object-Search Algorithms), [employment.md](../../subsystems/employment.md)
(the roster that two of the worst sites should be reading),
[boot-time-build] doctrine (cache at the chokepoint that writes;
invalidation by construction — the index pattern here).

---

## Part 0 — The finding: `world:` is the *sanctioned* mechanism, and it is O(n)

Two facts that must be held together:

1. ⭐ **`world:[mixin.X]` is not the antipattern — it is the fix for the
   OLD antipattern.** `pnpm lint:world-scan` (CI-gating) bans bespoke
   `StuffApi.getAllObjects()` filter-loops and herds them onto MQL. So
   the goal is **not** "get rid of `world:`" — it is "make `world:`
   cheap, or stop asking it questions a relationship already answers."
2. ⚠ **Every `world:` query is a full O(n) scan.** `resolver.ts:324`
   resolves the `world` seed to `StuffApi.getAllObjects()` — the entire
   `#indexes.byId` registry — and the `[mixin.X]` / `[class.X]` filter
   is applied **after**, per object. The registry maintains a
   `byTemplatePath` PathTrie but **no by-mixin or by-class index**. So
   `world:[mixin.X]` walks every object in the game and tests each.

The three sanctioned raw-`getAllObjects` homes (the lint allowlist —
`resolver.ts`, `ResidencyLogic`, `stuff.ts`) are correct and out of
scope; this slate is about the `world:` *consumers*.

---

## Part 1 — ⭐⭐ The crux: indexing `mixin.X` is a PARTIAL fix

A by-mixin index turns O(n) into O(matches). **That is a win only when
`matches` is small.** The call sites split exactly on the selectivity of
X, and the split is the whole design:

- **Selective X** (few displays, few banks, ~5 locomotion modes) → an
  index makes the query effectively free. Clean win.
- **Broad X** (`EmployedMixin` = every employed NPC+player;
  `SlottedMixin` = most wearables; `PersistableMixin` = nearly
  everything) → the index hands you a huge set and you still pay
  O(matches). **Indexing does nothing that matters.**

⭐⭐⭐ **And the tell for the broad sites is that they are scanning to
reconstruct a relationship another object already holds.** `flowSplitsFor`
walks *every employed actor in the game* to pay one business's wages —
but the Business already has a roster. That is not a query to make
faster; it is a query to **stop making**, by asking the owner.

So there are **three** remediations, not one.

---

## Part 2 — The full inventory (17 sites), triaged

### Bucket A — selective population → **by-mixin/class index wins** (~8)

| site | query | rough pop | note |
|---|---|---|---|
| `CommandController.resolveScreen` | `[mixin.DisplayMixin]` | dozens | per-command (Aether display resolve, `house` verbs) — warm, so the win matters |
| `BankingLogic.findBranchOf` | `[mixin.BankMixin]` | handful | find-one-by-`getBank()` key → a bank-key map is even better than a mixin index |
| `AttendantLogic.allPoints` | `[mixin.AttendantMixin]` | dozens | registry sweep |
| `EmploymentLogic.allBusinessesImpl` | `[mixin.BusinessMixin]` | dozens | registry sweep |
| `TitleController.books` | `[class.PlatBook]` | handful | per-title command |
| `OuterWarren.admitFor` | `[class.OuterWarren]` | handful | per-login admit |
| `PressLogic.holdsAnyPublishingPosition` | `[mixin.PublisherMixin]` | few | permission check |
| `LocomotionLogic.allModes` | `[class.LocomotionMode]` | **~5 singletons** | ⭐ these never change — a cached roster is trivial and beats even an index |

### Bucket B — broad population, keyed subset → **read the owner, NOT an index** (~5)

These stay expensive at scale *even indexed*, because the mixin is broad
and the caller wants a narrow keyed slice. **Two are money paths.**

| site | query | wants | should read |
|---|---|---|---|
| ⚠ `EmploymentLogic.flowSplitsForImpl` | `[mixin.EmployedMixin]` (broad) | employees of **one business** with share-of-flow | the **Business roster** ([employment.md](../../subsystems/employment.md)) — **MONEY PATH** (wage/tip remittance) |
| ⚠ `EmploymentLogic.holdersByPositionImpl` | `[mixin.EmployedMixin]` (broad) | holders of **one org's** positions | the org roster, keyed by position |
| `SlotLogic.findOccupiedSlots` | `[mixin.SlottedMixin]` (broad) | who holds **one item** | a **back-reference on the item** ("what slots am I in?"), not a reverse world sweep — warm (equip/unequip/combat) |
| ⚠⚠ `maintains.holdingsUnder` | `[class.HoldingWarren]` | holdings under **one extent** | keyed-on-extent lookup. **This is an NPC BRAIN → per-tick scan** — the worst frequency profile in the set |
| `MagicLogic.execMisidentify` | `[mixin.IdentifiableMixin]` (broad) | **one** arbitrary decoy (`others[0]`) | a descriptor/decoy pool, or at minimum **early-exit** — it builds the whole filtered list to take element 0 |

### Bucket C — broad population, genuinely wants ALL, cold path → **leave it** (2)

| site | query | why it is fine |
|---|---|---|
| `AppBootstrap.shutdown` + `Persistable.capturesAtShutdown` | `[mixin.PersistableMixin]` (broadest) | wants literally all of them, **once, at shutdown**. O(n) is correct. |
| `mixin.getAllGlobIdentityFields` (doc) / dev `[mixin.GlobbableMixin]` reload | `[mixin.GlobbableMixin]` | a dev-triggered "reload every globbable" — rare, wants all |

### Also present, benign frequency (verify before touching)

`Census.takeCensus` (`[mixin.CirculatingMixin]`) is scheduled/periodic;
fine unless the interval is tight. It is a candidate for the index if
`CirculatingMixin` turns out selective.

---

## Part 3 — The remediation, in priority order

⭐ **Priority is frequency × population, and it does NOT track "is it a
world scan."** The order:

1. ⚠⚠ **The money paths first, independently of any index work.**
   `flowSplitsFor` + `holdersByPosition` scan every employed actor in
   the game to pay/enumerate one business's staff, on a money path, and
   **the roster already exists on the Business.** This is a
   read-the-owner fix with no new substrate — pullable now, and the
   highest value. (Bucket B)
2. ⚠ **The per-tick brain.** `maintains.holdingsUnder` is a world scan
   *per NPC per cadence*. Keyed-on-extent lookup. (Bucket B)
3. **The item back-reference.** `findOccupiedSlots` on equip/combat
   paths. (Bucket B)
4. **The by-mixin/class index substrate** — maintained at the
   register/unregister chokepoint in `stuff.ts` (beside `byTemplatePath`),
   `Map<mixinName, Set<Stuff>>` + `Map<className, Set<Stuff>>`,
   invalidation by construction. Flip the resolver's `world:[mixin.X]` /
   `[class.X]` path to consult it. This makes **all of Bucket A** free at
   once and is the one piece of new substrate. (Bucket A)
5. **`allModes` → cached roster.** Trivial; the modes are immutable
   singletons. (Bucket A, special)
6. **`execMisidentify` → early-exit or a decoy pool.** (Bucket B)
7. **Leave Bucket C.**

> ⭐ **The index (step 4) is deliberately NOT step 1.** The instinct is
> to build the shiny substrate first, but the money-path fixes need no
> substrate and carry more value, and the index does **nothing** for the
> broad-mixin sites that are the actual scaling risk. Substrate last.

---

## Part 4 — The rule this leaves behind

`lint:world-scan` already enforces "search via MQL, not bespoke loops."
It should gain a companion norm (doc, maybe lint later):

> ⭐⭐ **`world:[mixin.X]` is for a SELECTIVE, GLOBAL population you
> genuinely want all of. If you are filtering the result down to one
> business / one item / one extent / one owner, you want that owner's
> relationship, not a world scan — no matter how well the mixin is
> indexed.**

The narrower MQL seeds already say this: `reachable` / `person` /
`inventory` are actor-anchored; a business's roster is a direct read.
`world:` is being reached for where an anchored query or a relationship
read belongs. The index makes the *legitimate* `world:` uses cheap; it
must not become the reason the illegitimate ones feel fine.

---

## Open questions

1. **Is the by-mixin index keyed on mixin NAME or on the full active-mixin
   set?** Augmentation confers mixins at runtime ([augmentation.md](../../subsystems/augmentation.md));
   `getActiveMixins` can change post-register. The index must update on
   augment/unaugment, not only register/destruct — or it silently misses
   conferred mixins. This is the invalidation-by-construction hard part.
2. **Does `[class.X]` want subclass matching?** `world:[class.LocomotionMode]`
   matches subclasses today (post-scan `instanceof`). A class index keyed
   on exact constructor would miss them; keyed on the prototype chain is
   heavier to maintain.
3. **Selectivity of `CirculatingMixin` / `PublisherMixin`** — measure
   before deciding Bucket A vs B for the borderline ones.
4. **How many objects is `n`, actually?** `StuffApi.getObjectCount()`
   at a populated boot. The whole priority order assumes n is large
   enough to matter; confirm it. (The boot-time build showed the world
   stands up a lot of Stuff.)

---

## What this slate does NOT cover

- **The raw-`getAllObjects` allowlist** (`resolver`, `ResidencyLogic`,
  `stuff.ts`) — correct as-is; the residency sweeps *must* walk raw
  proxies (documented at both loops).
- **The `flat` seed** (`resolver.ts:634`, also `getAllObjects`) — it is
  the deep-contents scan, a different consumer; audit separately.
- **MQL subscription re-resolve cost** ([mql-subscription.md](../../subsystems/mql-subscription.md))
  — a live `world:` *subscription* re-scans on every dep change, which is
  strictly worse than a one-shot. ✅ **Checked at capture: zero `world:`
  subscriptions exist** — every inventoried site is one-shot. Re-audit if
  one is ever added; a live `world:` subscription would be Bucket-B-urgent
  on arrival.
