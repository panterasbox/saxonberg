# trade-drilling

The drilling trade, a **capability pack**: everything that answers *how
does a bore work*, and nothing that answers *what is under this hill*.

- **The acts** — `bore` (alias `drill`), `bail`, `line`, `hire`,
  `dismiss` — as `content/trade/drilling/cmd/drilling/` views with their
  controllers in `src/idea/cmd/drilling/`. ⚠ None carries a deed gate:
  sinking a hole is labour, and the owner's skill is exercised at the
  **siting**, not at the beam.
- **`Wellhead`** (`src/thing/Wellhead.ts`) — the hole itself, and the
  reason this build needs no new verbs to get fluid out of the ground.
  It is `Bulkable` with all four policy seams overridden, so the shipped
  `fill <vessel> from <wellhead>` and the shipped gas-escapes physics are
  the whole withdrawal story. Its state is the hole's: `depthM`,
  `linedToM`, the banked swings, the liner, the straw's draw.
- **`Derrick`** (`src/thing/Derrick.ts`) — the instrument that affords
  every act. ⭐ The instrument affords the verb; the furniture does not.
- **`DrillingOutfit`** (`src/idea/DrillingOutfit.ts`) — a `Business`
  whose seats are authored on its seed row and whose payroll **is** the
  cost of depth. ⭐⭐ Drilling is not collaborative; it is **employing**.
  A crew of NPCs satisfies it exactly as a crew of players does, because
  what the design wants from the crew is a wage bill, not a conversation.
- **`BoreRegistry`** (`src/idea/BoreRegistry.ts`) — the bore log, filed
  under the trade: *you file; you do not hold the pen*. Append-only, and
  a dry hole's log is the thing that was still worth the payroll.
- **Two reading channels** — `structure` (there is a closed trap under
  here, crest about *that* way, at about *D* m ± *E* m, and the bracket
  widens with depth and narrows with the band) and `head` (how hard it
  is still flowing, in words to an eye and in atmospheres to a gauge).

⭐ **The premise, and the one thing this trade refuses to do.** The
survey has **two factors and only one has a channel.** Structure is
readable. **Charge is seeded** — decided before anybody looked — and no
instrument in this game will ever read it. That is why a dry hole
survives every improvement to the instruments, and why the payroll is a
bet rather than an expense.

⭐ **The falsifiable line.** A second well town must need **zero pack
code**: it supplies its own `fluids:` on its own column, its own sites
and prose, and imports this. `rejection` is the reference implementation
and ships no TypeScript at all.
