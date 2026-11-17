# Script-runner decouple — the findings (working slate)

> **Status: PARTIAL** — the decoupling shipped: the can-make deed is crafting's ([crafting.md § The knowledge ladder](../../subsystems/crafting.md)), the auto-transcription is gone, and `make` is the shell's ungated `do` ([scripting.md](../../subsystems/scripting.md))
> **Left:** 25 stranded recipes, by trade (no verb reaches them); two heat-tie shadows in the hand-build match; an explicit macro recorder; a gate for rows naming a class that does not exist
> **Size:** a wave

What the 2026-10-18 census of all 181 catalogue recipes found once `make`
was understood for what it was: a script runner, never a crafting verb.
Each item below rides the next build of the trade it names. None is a
reason to bring back a generic `make`: a recipe without a verb is a
missing **act**, and the act belongs to the trade.

## 1. Stranded recipes — no verb produces them

| recipe(s) | pack | why stranded | the missing act |
|---|---|---|---|
| `crush-comb`, `spin-comb` | trade-apiculture | Written for `make`. The two rows have identical slots (`honey` item), so even a verb resolving by input could not pick one. | A `press` / `spin` on the comb at the extractor, choosing by tool. |
| `lean-loaf`, `flatbread`, `dog-loaf` | trade-baking | Only `bake` makes a loaf, and `bake` is deed-gated, so the deed can never be earned. `knead` makes dough, not the loaf. | Bake the shaped dough in the oven as its own ungated act (the oven takes a trough's dough), or have `bake`'s first attempt from your own dough count. |
| `black-pudding`, `sausage`, `scrape-casing` | trade-cooking (butchery) | Tangible outputs. `cook` is gated, and `plate` only fills a dish with bulk. | A stuffing / casing act at the butcher's bench. |
| `axe-head`, `breastplate`, `flail-head`, `mace-head`, `mail-hauberk`, `plough-share`, `sword`, `warhammer-head` | trade-smithing | They need 2–4 bars, and a quench workpiece holds exactly one (`bankWorkpiece`), so they can never be hand-built; `forge` stays gated. | A multi-bar workpiece (`weld` two bars into one stock) or a forge that takes the charge. |
| `sledge`, `shovel`, `assay-kit`, `miners-dial` | trade-mining | Forged metal plus wood. The `hammer` then `add wood` sequence is unverified, and three of them tie at 1100 K (see § 2). | `fit` with a bill: forge the head, haft it. |
| `billhook` | trade-forestry | Same shape as the mining tools: forged plus wood, 1200 K. | `fit` with a bill. |
| `pressure-gauge` | trade-drilling | Same shape: forged plus wood, 1100 K. A prop at the claims office. | `fit` with a bill. |
| `bailer` | trade-drilling | Two item slots (leather and wood). `carve` takes one wood slot, and the output has no bill. Stocked at the Rejection counter (par 2), which cannot take money. | `cut` / `sew` on leather, or a bill and `fit`. |
| `packing` | trade-tanning | Leather plus a cutting tool, and `carve` is wood only. On the claims-office rack. | `cut` on leather (the same verb as the bailer). |
| `glass-batch-amber` | trade-glass | Its charge is a superset of `glass-batch`'s, so `fire` finds two firings and refuses `mixed-charge`. | `fire` choosing the MOST SPECIFIC firing (the one consuming the most of the charge). |
| `leather-jerkin` | trade-tailoring | On the smithy menu, but no maker there can make it; the row calls itself *"STILL UNMAKEABLE"*. | `cut` / `sew` taking hide. |

`cut` on leather recurs three times (bailer, packing, jerkin). That is the
signal it is one act, owned by tanning or tailoring, not three fixes.

## 2. Shadowed by a heat tie

The hand build's `matchBuild` keeps the recipe with the highest heat the
work reached; on a tie, catalogue order decides, so the loser can never
come out of a quench or a plate:

- `dagger` = `spear-head` (1450 K);
- `adze-blade` = `hoop` (1150 K);
- `pick-head` = `shield-boss` = `tongs` = `driver` (1200 K);
- `seared-cut` = `fine-roast` (500 K).

`matchBuild` also ignores `toolCapabilities`, which is the natural
tiebreaker: the anvil's swage and the tongs' bite are what differ.

## 3. An explicit macro recorder

The capture the decoupling removed was the right idea done as magic.
Recording a procedure is a real convenience; doing it silently, into a
file the player never saw and could not find, was not. The shape the
user asked for:

- **`record <name>` … `record stop`**: record the commands you type at the
  prompt (all of them, not one vessel's), then show you the script and ask
  *"save this as `<name>`?"*. It saves to your home `scripts/`, where `do`
  finds it.
- The saved file is ordinary, editable source (`cat`, `write`). Nothing is
  recorded that you did not type, and nothing is learned by recording: a
  replayed `forge` still meets the knowledge gate.
- It records at the PROMPT, not inside a build. That is why the per-vessel
  command buffer (`ManualBuild.recordCommand`) was deleted rather than
  kept for this.

## 4. No gate catches a row whose class does not exist

Deleting `MakeController.ts` left its template row
(`content/platform/idea/cmd/crafting/MakeController.yaml`) naming a class
that no longer existed. **All 79 lint gates passed**, and the world would
not boot: the platform pack failed `requires-kernel` and every pack after
it failed to reconcile (`Template not found: /platform/idea/GroupRegistry`).
Verified on purpose afterwards with a scratch row naming a made-up class:
still 79/79 green. A census-then-ratchet gate (every row's `class:`
resolves through `classFileOf`) would turn a dead boot into a red line.

## Prose fixed in the decoupling

These sent players to `make` for crafting. They now name the verb that
works, or say plainly that none does:

- `line` (drilling): *`carve liner`*.
- The Rejection claims office: the packing (none yet) and the liner.
- The Rejection store counter: the derrick is a prop at the salt spring; there is no recipe.
- apiculture: no verb runs the honey recipes yet.
- assembly: `fit`'s raise arm.
- forestry: `timber-set` is `carve`-shaped (not yet driven).
- The strain line: now `mix <id>`.
