# Call security performance — the investigation, and what it found

> **Status: PARTIAL** — the five gate optimizations (50 µs → 2.1 µs) and
> the boot work shipped →
> [call-security.md](../../subsystems/call-security.md) ·
> [persistence.md](../../subsystems/persistence.md)
> **Left:** `findDescriptor` accessor-ness caching · the static-Api apply
> thunk · hoisting the viewer-invariant checks out of `describeCore` ·
> `pushDirect`'s second `describeCore` entry · three small libations-
> drive loose ends (§8, arguably belongs on libations-slate rather than
> here — see the compaction ledger)
> **Size:** a tail

*2026-08-30, from the libations live drive (MR !206). The founder's
framing: "it's probably not just one thing, it's probably a few
optimizations working together." That turned out to be exactly right —
five changes, each worth between 1.3x and 10x, and none of them the
thing the first profile pointed at.*

**Result: a proxied method call went 50 µs → 2.1 µs. 2000x a raw call →
424x. And flat in stack depth, where it used to double.**

---

## 1-3, 5-6 — SHIPPED, graduated to call-security.md § What a gated call costs

The instrument (`bench-gate.ts`, the four benchmarking gotchas), the
five findings (caller proof per call site not per call; the gate no
longer gates its own `ShadowApi` collaborators; five closures per
dispatch collapsed to one; `resolveCallPolicy` cached with a generation
stamp; the frame stack as a linked list), the measured arc (50 700 ns →
2 140 ns, 424x), the rule ("a loop over N objects that makes a gated
call per object costs N gate dispatches"), and what was NOT traded away
(tamper resistance, viewer-relative naming, the destroyed-object inert
guard) are all in
[call-security.md § What a gated call costs](../../subsystems/call-security.md#what-a-gated-call-costs)
— code-verified: `claimFramePush` / `_frameMutatorAllowlist`
(`lib/security/execution-context.ts`), `ShadowApi._gateEntries()`,
`resolveCallPolicy`'s generation-stamped cache, `FrameNode`'s linked
list — all present exactly as described. Not reproduced in the doc: the
per-step intermediate arc (7300 → 4500 → 3500 → 3150 ns as each of the
five changes landed) and the specific per-site percentage table from
the live drive (`GetController` 96.5%, etc.) — both are measurement
provenance for a decision already fully stated, recoverable from git.

---

## 4. The boot-time finding — SHIPPED, graduated to persistence.md

**Boot is not CPU-bound, and the gate was never its problem** — a fresh
boot's CPU profile was 76% idle while 96% blocked on Mongo round trips
(`StuffApi.clone` → `Template.findByPath` reading uncached, every time).
Built 2026-08-31 (`perf/boot-time`, MR!209): the resident whole-`content`
cache (991 rows, <600 KB, so a MISS is an answer not a reason to ask)
and the permanent `SAXONBERG_QUERY_TRACE=1` instrument — both in
[persistence.md § The resident `content` cache](../../subsystems/persistence.md)
and § The query trace. Warm boot 270 s → 35 s; fresh boot 5.7 min → 109 s
to world open. One reasoning paragraph from this section is NOT yet in
persistence.md — see Handoff in the compaction ledger.

---

## 7. Left on the table

- **`findDescriptor`** walks the prototype chain and allocates a
  descriptor per level, on every property access. ~55 ns of the
  remaining 2.1 µs. The safe form caches only *accessor-ness* per
  prototype (a method does not become a getter under HMR) and skips the
  walk entirely for the common case. Not done: the reward no longer
  justifies touching the get trap.
- **The static-Api wrapper's apply thunk** — one closure per static Api
  call, off the dispatch path but everywhere else.
- **Recognition, and the walk around it.** Salvaged from the retired
  `gate-cost-slate`, which measured the MQL scope walk before the gate
  was fixed and named two candidates the pass above never took:
  - **Hoist the viewer-invariant checks out of `describeCore`.**
    `isSensor(viewer)` / `isPerception(viewer)` are the same for all ~35
    candidates in one walk and are re-asked per candidate.
  - **`pushDirect` calls `describe` AND `perceivedKeywords`**, and for an
    ORGANISM the latter re-enters `describeCore` a second time
    (`RecognitionLogic:390`).
  - Caching recognition per (viewer, target) per resolve was considered
    and is **low value**: each candidate is visited once per resolve, so
    the win is smaller than it looks.

---

## 8. The overnight drive (2026-08-31) — what the fixed gate made reachable

The performance work was never the point; it was what made the world
drivable. With a dispatch at 2.1 µs and the economy funded, the whole
libations acceptance surface came within reach in one session.

**Checklist items verified live, on a world dropped and rebuilt from
nothing:** 1 (fresh boot), 2 (the back loop — Mara restocking with no
player: `cogs -309, wages -68, subsidy 20000`), 3 (the keeper loop, no
wizard), 4 (the tablet in a stranger's hands: the sheet shows, the wallet
refuses), 5 (**a drink**), 6 (the glass pool), 8 (packs + lints).

⭐ **The drink, end to end, scripted from an empty world:** a player
hired by Dave through his dialogue tree, `wallet use house`, eleven
purchases at the cash-and-carry stamped to the bar, carried back,
shelved, ice poured into the bin — then:

```
order gin & tonic  -> a highball glass is set down in front of you.
look highball      -> "A tall straight-sided glass. It is on the rocks,
                      fizzing, with a lime. It looks fair: honestly made,
                      if unremarkable. Made by Remy. It holds a gin and
                      tonic, fizzing over ice.  In it: a lime."
feel highball      -> "A highball glass feels cool."
```

Garnish, carbonation, ice, grade, crafted provenance, temperature — the
plan's own acceptance line ("a G&T colder than the rail — `feel`") in
one read.

### The bugs the drive found, in the order they mattered

1. **Nothing funded the world.** Money supply 0; every venue drifting
   negative on wages; `buy` refused. → `banking.openingCapital`.
2. **The supply aggregate raced itself** — nine businesses opening at
   once wrote six `bank_supply` rows. Exposed, not caused, by (1).
3. **A disambiguated pick anchored focus on the WORD**, so every later
   command re-asked and the session went silent. → `#<stuffId>`.
4. **`feel` and `taste` had never run.** Both verbs, both validators,
   both modality singletons ship — and no body plan granted touch or
   taste. A verb gated on a capability nothing confers fails closed and
   quietly forever.
5. **Six keyword collisions in one room**, and the substring rule
   underneath them (`kw.includes(query)` — a keyword claims every word
   inside it).

### ⚠ Still open

- Item 7: **the card arm is verified** — the clean two-socket test I
  should have run first. The keeper drives the tablet RESTING in the
  room; both sockets receive `card-opened stock/"house stock"`, and the
  bystander gets only the card, never the keeper's prose. *The display
  you can see shows X.*
  ⚠ My earlier "the bystander never got it" was two mistakes at once: a
  dead WebSocket, and a tablet in someone's POCKET (which correctly
  shows nobody — `sees()` needs to perceive the screen). The video arm
  stays undrivable: no row ships one, by ruling.
- Dilution over a game-hour, the mojito's `muddled` marker, and the
  bitters 1 mL debit: not yet driven.
- `put ice in bin` answers "an ice bin isn't a place". Correct — the bin
  is Bulkable and the verb is `pour ice into bin`, which is what the
  restocks brain does — but the message helps nobody, and the plan's own
  checklist says `put … in bin`.

## Cross-references

[call-security.md](../../subsystems/call-security.md) ·
[templates.md](../../subsystems/templates.md) ·
[residency.md](../../subsystems/residency.md) ·
[persistence.md](../../subsystems/persistence.md) ·
[antipatterns.md](../../antipatterns.md) ·
[testing.md](../../testing.md) ·
*(supersedes the retired `gate-cost-slate` — its surface is salvaged above)*
