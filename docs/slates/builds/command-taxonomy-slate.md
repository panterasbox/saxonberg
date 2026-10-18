# Command taxonomy — fewer verbs, each one doing more

**Status:** slate · **Left:** design + the sweep · **Size:** one build (a
refactor/sweep, kernel-led; first consumer: every institution verb).

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

## Open questions

- Does `category:` replace the directory, or mirror it (with a gate that
  they agree)?
- Which institutions exist: is the counter (`buy`/`sell`/`consign`/
  `reclaim`/`menu`/`order`) one institution or acts on goods?
- Does a subcommand inherit its institution's arg (the book bound once at
  the top level), or does each subcommand bind its own (today's
  `store.yaml` repeats the book per subcommand)?
