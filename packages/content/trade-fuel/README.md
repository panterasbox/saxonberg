# trade-fuel

The fuel trade, a **capability pack**: the coppice, the burn, and the
charcoal that makes a smelt reach copper.

- **The coppice is the FORESTRY trade's** (`trade-forestry`): the panel,
  the hazel stool, the cordwood and the billhook moved there with the
  forestry build, which is also where the game-year rotation landed.
  This pack is a CUSTOMER of cordwood — it depends on no forestry class
  (`CharController` finds cordwood by keyword), so a fuel yard fed by a
  bought stock line installs without a forester.
- **The burn** — `CharcoalPit`, and `char` as a **watched engagement over
  game time**. ⭐ Airflow is the decision and the failure mode is the
  point: too much air and the charge goes to ash, too little and you draw
  half-burnt brands. **You can lose a whole burn.**
- **Charcoal** — its material row and the `Combustible` thing, fuel value
  and ignition read off the material rather than authored twice.

⭐ The same stand that yields charcoal yields the **timber the mine
shores with** — two consumers, one supply, which is the wood contest the
slates kept asserting and this pack makes real.
