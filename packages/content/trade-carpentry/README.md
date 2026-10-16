# trade-carpentry

Saw, then carve — and fit what you carved.

⭐ **The middle of the wood column.** Forestry fells a tree and rives a
billet off the bole; this trade turns wood into PARTS. Two acts of its
own, both conversions, and one engine verb it leans on:

- `saw` — a length off a bole into boards. **The decision is the cut**:
  through-sawn gives the most boards and the wide ones cup; quartered
  (`--quarter`) gives two in three and every one stays flat.
- `carve` — one piece of wood and an edge into one part: a haft, a
  handle, a peg, a dowel, a leg, a rail, a mallet. What can be carved is
  every installed recipe in that shape; this pack's controller names
  none of them.
- `fit` (the kernel's) — the parts into a whole: a frame is four legs and
  four rails, pegged (`pegged`, the first Joint a trade ships); a froe is
  a smith's blade on a carved handle, wedged by hand.

⭐⭐ **The capital ladder buys back your TIME**, exactly as the miller's
does on the same river. A pit saw holds your `hands` for the whole cut.
A water sawmill holds nothing of yours: put the log on, open the hatch,
leave. Its rate is the race's power, so it cuts slower in a dry August
and not at all with no water.

⭐ **The tool tree's root is walked by hand.** Carve a handle, fit it to
a forged froe blade, and rive the next blank with the froe.

⚠ This pack does **not** depend on `content-water`. The sawmill reads its
power by duck-typing a room sibling that answers `generationW` (the grist
mill's read, verbatim), so a sawmill with no race says it will not run
and a realm with no water pack still installs.

## Rows

| what | where |
|---|---|
| the sawmill and the pit saw (one class, two rows) | `content/trade/carpentry/thing/` |
| boards (through and quartered), the riven blank | `content/trade/carpentry/thing/` |
| the parts: hafts, handle, peg, dowel, leg, rail | `content/trade/carpentry/thing/` |
| the frame, the froe, the drawknife, the mallet | `content/trade/carpentry/thing/` |
| the recipes (carvings, the blank, the assemblies) | `content/recipes/` |
| `saw`, `carve` | `content/trade/carpentry/cmd/carpentry/` |
| the `carpentry` Discipline | `content/trade/carpentry/idea/Discipline/` |
| the `pegged` Joint | `content/trade/carpentry/idea/Joint/` |
| `help grain`, `help seasoning`, `help the-cut` | `content/trade/carpentry/idea/HelpConcept/` |
