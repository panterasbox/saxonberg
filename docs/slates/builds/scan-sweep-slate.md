# Scan sweep — ask the scope that holds the answer, not the world

> **Status: UNBUILT.** Surveyed in the maritime build's review
> (2026-10-13), which fixed its own scans and left these ten in other
> subsystems' code. Every finding below was re-verified against the code
> on 2026-10-14, with the file and line.
> **Left:** the ten defects in § *Build order* — three that run per
> command or per beat (the help-wanted sign on every `look`, `journey`'s
> sea names, the mind-driven screen) first — and the ratchet in § *The
> gate*.
> **Size:** a build — one sweep across seven subsystems, bundled to pay
> the full suite once.

*Opened from the maritime review, on the user's ask: "we should do a
survey of anything else that's doing registries or full scans of things
for stupid reasons."*

---

## The rule, and the precedent

**A question has a scope that holds the answer. Ask it.** *Which craft
am I aboard* is the structure catalogue's keyed walk up the room's path;
*what can I see at sea* is that sea's own list; *which business operates
here* is the business index. Reading every object of a kind and
filtering is the shape to remove — not because it is always slow (a
mixin bucket read is cheap while the bucket is small) but because the
cost then grows with the WORLD rather than with the question, and
because a slice of the world is a thing somebody has to be allowed to be
handed (`lint:world-scan`'s header says it plainly).

⭐ The maritime build is the worked precedent (MR !358, B-89/B-90): the
horizon and the weather lean stopped reading every resident `Voyaging`
object; `StructureCatalogue` grew a keyed index (`byExtent`, `within`,
`onExpanse`); the expanse answers what is on it (`sightables()`); the
boarding exit walks berth → ship → sea → that sea's nodes, once; and
two `RegistryWideReaders` entries were deleted.

## Build order — the ten defects

Ordered by how often each runs; the first three are per command.

1. ⭐⭐ **The help-wanted sign re-enumerates every business on every
   `look`.** `EmploymentLogic.businessByKey`
   (`platform/idea/api/EmploymentLogic.ts:1484`) treats a MISS as a stale
   memo: it drops the cache and re-reads every business
   (`allBusinesses`). Most rooms have no business, so a miss is the
   ordinary answer, and `LookController.ts:315` (`noticesAt`) asks it
   for the room and each fixture on every look. The same path serves
   `apply`, `wallet` (`WalletController.ts:154`), `order`
   (`OrderController.ts:452`), the access check
   (`AccessRegistry.ts:198`) and `donate` (trade-medicine). ⭐ Fix: the
   location index is maintained on write (a business standing up or
   going away updates it), so *no business here* is an answer, never a
   reason to rescan.
2. **`journey` reads every expanse node in the world** to recognise a
   sea name: `JourneyController.seaNodeNamed`
   (`transport/src/idea/cmd/movement/JourneyController.ts:360`) calls
   `Template.findByClass('/platform/idea/ExpanseNode')` — every node row,
   plus every `extends` row (item 10) — per unrecognised destination.
   The sea already answers by name (`Expanse.nodeByKeyword`); the
   traveller's place says which sea (`ExpanseApi`).
3. **A mind-driven screen tries every display in the world.**
   `CommandController.resolveScreen` (`lib/command/CommandController.ts:90`),
   for an actor with an implant, takes `findByMixin('DisplayMixin')` and
   awaits `mayDrive` on each (the house-shop verbs). The displays a mind
   can drive are the ones PAIRED to the actor — the actor's own records
   should answer, and `mayDrive` should run over that handful.
4. **`branchOf` rescans on a miss.** `BankingLogic.findBranchOf`
   (`BankingLogic.ts:315`) memoises a hit but not a miss, so validating a
   custodian that has no live branch rereads the `BankMixin` bucket every
   time, on a money path. A negative entry, dropped when a branch stands
   up, closes it.
5. **`requiresPublisher` reads every publisher.**
   `PressLogic.holdsAnyPublishingPositionImpl` (`PressLogic.ts:171`) walks
   the `PublisherMixin` bucket per validation. Whether the principal holds
   a publishing position is a question about THEIR employments.
6. **A disconnect walks every attendant point.**
   `AttendantLogic.onPlayerDisconnected` (`AttendantLogic.ts:97`) calls
   `allPoints()` to drop one customer. The points that hold a lease or a
   queue place for that player are few; a customer → points index
   (maintained by lease and queue writes) answers directly. (The idle
   sweep's walk of every point is legitimate — it IS a sweep.)
7. **Residency's spawn sweep walks the whole registry** for
   `Circulating` objects (`ResidencyLogic.ts:458`, `getAllObjects()`)
   where the mixin bucket already holds exactly those.
8. **An MQL path atom with no live clone walks every object.**
   `StuffApi.findTemplatesByPath` (`api/stuff.ts:1637`, reached from
   `api/mql/resolver.ts:388`) is an O(N) walk of `byId` matching `path`,
   ungated. The registry's template-path index, or `Template.findByPath`,
   answers a non-glob path directly.
9. **The wiki's composition page reads the whole template table.**
   `lib/wiki/components/composition.ts:403` —
   `Template.findDescendants('/')` per render. It wants the class →
   rows index the composition question is actually about.
10. ⚠ **The hidden cost under the template finders.**
    `Template.findByClass` and `findWhereDataHas`
    (`lib/stuff/Template.ts:492,561`) union every row carrying `extends`,
    materialised, on EVERY call (`#inheritedMatches`). Its docstring says
    *"one extra query, at boot-warm time"* — true of the catalogues, not
    of the ~18 callers, some of which run at runtime (item 2). Either the
    `extends` set is memoised per process and dropped on a template write,
    or runtime callers are moved to an index.

## Legitimately global — NOT defects

Recorded so the sweep does not chase them: the shutdown capture
(`captureAtShutdown`), the census and the eviction / reset sweeps
(engine self-maintenance over raw targets, deliberately not MQL),
street lighting once a night (`settleStreetLighting`), the presence
fan-outs over ONLINE players, boot warms, and the wizard tools.

## The gate

`lint:world-scan` already refuses bespoke `getAllObjects()` loops and
stray `world:` queries; the sanctioned registry-wide read is
`StuffApi.findByMixin` from a `(template, method)` pair named in
`RegistryWideReaders` (`api/stuff.ts:88`). **12 pairs today.** ⭐ The
proposal is the census-then-ratchet pattern
([lint-family.md](../../lint-family.md)): gate the pair count at 12, so
it may fall and never rise, and let this sweep drive it down — items 3,
4, 5 and 6 each remove a pair. ⚠ The Template finders (item 10) and
`findTemplatesByPath` (item 8) sit outside that list entirely; whether
they want a census of their own runtime callers is the plan's question.

## Open questions

1. **Negative caching vs maintained indexes.** Items 1, 4 and 6 can be
   closed either way. A maintained index is the stronger answer (it is
   what the structure catalogue grew) but needs every writer to report;
   a negative memo is smaller and goes stale safely only if the stand-up
   path clears it. The plan picks per item.
2. **Is the help-wanted sign the right consumer at all?** It costs a
   lookup per fixture per look to find that nothing is hiring. If the
   business index answers by room, the fixture walk may be unnecessary.

## Cross-references

- [employment.md](../../subsystems/employment.md) · [banking.md](../../subsystems/banking.md) · [press.md](../../subsystems/press.md) · [attendant.md](../../subsystems/attendant.md) · [residency.md](../../subsystems/residency.md) · [mql.md](../../subsystems/mql.md) · [wiki.md](../../subsystems/wiki.md) · [templates.md](../../subsystems/templates.md) · [display.md](../../subsystems/display.md)
- [expanse.md](../../subsystems/expanse.md) — the maritime precedent
- [lint-family.md](../../lint-family.md) — census, then ratchet
