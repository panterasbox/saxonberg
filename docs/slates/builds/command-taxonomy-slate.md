# Command taxonomy — fewer verbs, each one doing more

> **Status: UNBUILT** — seeded at the storage-and-ice review (MR !378,
> 2026-10-18); the follow-up MR is the user's.
> **Left:** the rule, written · `category:` on every view · a census then
> a ratchet · the sweep · a gate validating views against the schema ·
> scope order (the room-first seed).
> **Size:** a build — a refactor/sweep, kernel-led; first consumer: every
> institution verb.

Seeded at the storage-and-ice review (MR !378, 2026-10-18). The reviewer:
*"we have like hundreds of verbs now … each one of those is a command def
and a usage profile to keep track of in your head. I feel like we'd be
better off with fewer main verbs and rather make each command def just do
more … maybe we just need that framework expressed as metadata."*

## Where it stands

- **335 command views** across the packs; **44** use `subcommands:`. The
  24 categories (`cmd/<category>/`) are a filesystem convention only — no
  view says its category, no gate reads it, `help` does not group by it.
- `bank` (`BankController`, dispatch on `model.subcommand`) is the shape;
  `chat`, `office`, `cockpit`, `house`, `job` follow it.
- The storage-and-ice review moved custody to that shape: `deposit` /
  `withdraw` became `store deposit | withdraw | receipts`.

## The rule to decide (proposed at the review)

> **An act on the world is a bare verb; a transaction with an
> institution's book is a subcommand of the institution's noun.**

- *Acts* — `get`, `cut`, `saw`, `pour`, `swim`, `buy`, `sell`. English; a
  player types what they would say. They are kept few by the existing
  ladder: a protocol behind one verb (one `cut` for cloth and ice), and
  aliases for synonyms (`grind` → `mill`). Subcommanding them (`ice cut`)
  is worse for immersion and discovery.
- *Transactions with a book* — a bank, a store's book, a roster, an
  office, a ledger of any kind. Here the noun earns its keep three ways:
  discovery (bare `bank` says what the bank does), **no collisions** (the
  verb-collision ladder disappears for the whole class), and **one binding**
  (the institution is bound once for every subcommand).

The cost, stated: a subcommand is still a usage to learn. What is removed
is the GLOBAL namespace — ~20 institutions and ~250 acts instead of 335
peers.

## The work

1. **The rule, written** into `docs/subsystems/command-spec.md`, with the
   edge cases decided (is `buy` a counter transaction? — no: it is an act
   on a good; `consign`/`reclaim` — the consignment shelf's book, so
   `shelf consign | reclaim`?).
2. **`category:` on every view** — the framework as metadata, not a
   directory; `help` lists verbs by category.
3. **A census, then a ratchet** (`lint:family`'s pattern): a bare verb
   whose controller writes to an institution's ledger (bank, store book,
   roster, office) is counted; the count is the ceiling; the sweep drives
   it to 0.
4. **The sweep** — move each counted verb under its institution's noun,
   one view + one controller per institution (the `BankController`
   shape), retiring the bare views (no aliases kept: nothing is legacy).

5. **A gate that validates every command view against
   `command.schema.json`.** Today only the pack installer checks it, at
   boot: the storage-and-ice review shipped a view with top-level `args:`
   beside `subcommands:` (the schema refuses that), the lint family passed,
   and the platform pack — every verb in the game — failed to install on
   the next boot. A sweep that moves dozens of verbs under subcommands
   needs this gate FIRST.

6. **Scope order follows where the verb's object lives.** The binder
   tries a view's scopes in order and the first ADMISSIBLE match wins, and
   the `reachable` seed is itself `person ∪ here ∪ peers` — *your own gear
   first*. The reviewer's argument (2026-10-18): inventory changes less than
   location, so for a verb that acts on the WORLD (`cut`, `saw`, `fell`,
   `scrape`) the room is the better clue to intent — `cut ice` while
   carrying a block binds the block, not the sheet underfoot. For a verb
   whose object is IN HAND (`eat`, `drop`, `wield`, `give`) gear-first is
   the meaning. Decide: a room-first seed (`around`?) for world acts, or a
   per-view flag; audit the ~25 views that name `inventory` first and the
   158+ on `reachable`.

7. ⭐⭐ **One verb per ACT, not per word — and `reel` is the first case
   to undo** (user, the silk review, 2026-10-19). The silk build (MR
   !395) made silk reeling share fishing's `reel` view behind a
   `Reelable` shape. ⚠ That was a false unification by command-spec's own
   tell (*"if unifying would need a guard that re-asks which mechanic,
   the models are distinct"*): `ReelController` now narrows on the target
   (`reelableOf`) to choose between landing a fish (a turn in a live
   contest, no product) and reeling silk (a production step — cocoons in,
   a skein and pupae out, a sibling of `spin`/`weave`). The costs it
   shipped:
   - fishing's view grew a target, a `with <reel>` tool and `--count`
     that only silk uses, and `help reel` reads two trades;
   - `trade-sericulture` depends on `trade-fishing` for a WORD
     (`src/lib/Reelable.ts` lives in fishing);
   - the controller dispatches on target type — the thing
     `controllers-are-io-slate.md` wants out of controllers.

   **The undo, as discussed (not done — deferred to this sweep):**
   fishing's `reel` view and `ReelController` restored to their pre-silk
   shape (no target/tool/count; `Reelable.ts` and `reel-unified.test.ts`
   gone, and the sericulture → fishing dependency with them); silk gets
   its own view + controller in `trade-sericulture` (proposed word:
   **`unwind`** — free, plain English for the act, rung 1 taken by the
   challenger; `wind` is the University Avenue clock's and `draw` is
   banking's), afforded by `ReelingTool`, calling the plan/complete
   methods that already live on `Cocoons`. The `reels` brain and the silk
   drive's `reel cocoons …` steps follow the word. Docs: sericulture.md
   § *The reel*, fishing.md's note.

   **The policy to write into command-spec.md:** two claimants are one
   verb only if ONE controller serves both without narrowing on the
   target to decide what it is doing; a controller that branches on the
   target's type is the census's smell (count it beside the institution
   verbs in step 3).

## Open questions

- Does `category:` replace the directory, or mirror it (with a gate that
  they agree)?
- Which institutions exist: is the counter (`buy`/`sell`/`consign`/
  `reclaim`/`menu`/`order`) one institution or acts on goods?
- Does a subcommand inherit its institution's arg (the book bound once at
  the top level), or does each subcommand bind its own (today's
  `store.yaml` repeats the book per subcommand)?
