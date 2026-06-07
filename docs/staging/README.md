# Content staging

**Ephemeral.** This tree stages hand-authored game content — room prose,
maps, NPCs, taxonomy entries (Materials / Biomes / Species) — in markdown
*before* it's cemented into YAML seeds. It's a drafting surface: easy to
read, easy to argue with, easy to throw away.

## The lifecycle

```
staging/*.md   →   YAML seeds   →   delete the staging doc
(draft & argue)    (the real      (or this whole tree, once
                    artifact)       everything has graduated)
```

A staging doc is **done** the moment its content lands in YAML seeds.
Then it's deleted. There is no "keep it for reference" — the YAML is the
reference, and the design rationale that's worth keeping lives in the
relevant slate (`docs/slates/`), not here.

## Rules that keep cleanup trivial

1. **Everything content-staging lives under `docs/staging/`** — one
   subtree, deletable wholesale.
2. **Permanent docs never deep-link a staging file.** A slate may mention
   "staged under `docs/staging/eternal-university/`" generically, but must
   not link an individual file. Deleting staging then breaks no links.
3. **Every staging doc carries a header** naming (a) its **target seed
   path(s)** and (b) **Retire when:** the condition that graduates it.
4. **Staging docs don't cross-link each other** beyond a parent index, so
   removing one leaves the rest intact.

## Layout

One subdirectory per content area:

- `eternal-university/` — the EU campus (the first hand-authored area).

Add a new area subdir as content for it begins; delete a subdir once that
area is fully in YAML.
