# generic-objects

Generic (locality-free) objects. **This wave: the crafting recipe roster**
— the `recipe` document kind, one file per recipe under
`content/recipes/<recipeId>.yaml`, installed at
`/generic-objects/recipes/<recipeId>` (owned by the pack root, stamped
`sourcePack: generic-objects`). The basename IS the `recipeId`.

Recipes are authored knowledge, not Stuff templates: `category` on each
input slot is the Material tag the chosen input must carry;
`outputTemplate` is a real cloneable template; `outputMaterial` is an
optional authored substance (empty ⇒ the blend derives — identity + prose
ride the recipe, macros sum from the drawn inputs). Amounts are litres for
bulk slots, `count` for item slots. A file with an empty `inputSlots` or
no `outputTemplate` fails the pack at `read`.

The `RecipeCatalogue` singleton warms from these rows at boot and is
re-warmed by the installer after a live `pack sync`. See
docs/subsystems/crafting.md.
