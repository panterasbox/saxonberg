# trade-mining

The mining trade, a **capability pack**: everything that answers *how
does a mine work*, and nothing that answers *what is it like here*.

- **The acts** — `hew`, `drive`/`drift`, `sink`, `raise`, `shore`, and
  `stake` — as `content/trade/mining/cmd/mining/` views with their
  controllers in `src/idea/cmd/mining/`. ⚠ None carries a deed gate:
  they are labour, and gating labour on a craft deed is the band gate
  wearing a hat.
- **`WorkingMixin`** (`src/idea/Working.ts`) — every READ a mine needs
  (`facesOf`, `stabilityAt`, `airAt`), derived from the room and its
  zone. ⭐⭐ **The warren creates rooms; it does not interpret them**, so
  a hand-authored static mine with no warren at all behaves identically.
- **`MineWarren`** (`src/idea/MineWarren.ts`) — the MUTATION half only:
  carve, abandon, the tier ledger, seal-and-reap.
- **`Deposit`** (`src/idea/Deposit.ts`) — the geology field's *model*.
  ⚠ The class is a trade fact; an **orebody is a place**, so every row
  of it belongs to a venue pack. This pack ships no ore.
- **`Ore`** and its grade field, the survey instruments and their three
  channels, the tool recipes, the `geology` Discipline, the mine
  archetype, and the two **functional** species any mine needs — the pit
  pony that hauls and the canary that reads air.

⭐ **The falsifiable line.** A second mining town must need **zero pack
code**: it supplies its own deposit row, its own room type rows and
prose, and its own ecology, and imports this. `rejection` is the
reference implementation and ships no TypeScript at all.
