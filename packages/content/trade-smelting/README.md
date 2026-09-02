# trade-smelting

The smelting trade, a **capability pack**: ground into metal.

- **The furnace** composes the shipped `FurnaceMixin`
  (`burnTemperatureK × bellows`); copper melts at 1358 K, which charcoal
  reaches and wood does not.
- **`smelt`** rides the shipped crafting spine — a maker, tools, inputs —
  but ⭐ **the yield derives from the charge's composition, never from a
  recipe constant**: metal out is Σ(lump mass × lump grade × the
  mineral's metal fraction by `formula`/`molarMass`), and the gangue
  fluxes off as slag. A lean lump honestly makes less copper, and
  `analyze` shows it.
- **The cast** freezes through the shipped `Casting` path into a stamped
  ingot — and the ingot re-melts, because the phase change is honest in
  both directions.

Stage A ships the **easy rung**: oxide copper. Roasting, bronze, the
bloomery and steel are the rungs above it.
