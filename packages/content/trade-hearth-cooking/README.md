# trade-hearth-cooking

The hearth-cooking trade, a **capability pack** since libations: the trade's own steps `cook` and `plate` (`content/trade/hearth-cooking/cmd/crafting/` + `src/idea/cmd/crafting/`), the `cook-pot` row (whose `capabilities[].verbs` names what the pot confers) and the `kitchen` bundle, the hearth recipes, and (libations) the pantry — `sugar`, `salt`, `coffee`, `simple-syrup` materials, the `sack` preset, three floor sacks, the pantry outfit consigning onto `/trade/distribution/thing/counter`, and the `simple-syrup` recipe whose output bottle is claimed from the pool.

`src/` ships the classes only this trade names: `CookPot` (the build
vessel + `pot` tool — the kernel knows a pot only by the capability the
ROW authors) and the `cook`/`plate` controllers.
