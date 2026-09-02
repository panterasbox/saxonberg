# trade-bottling

The bottling trade, as a stub: it **fills vessels**. It does not make
them and it does not make what goes in them — that is the trade-as-
process rule, and the can-making and refining trades are both gaps
today (see `docs/slates/builds/aluminium-can-slate.md`).

Ships: seven mixer + juice materials (the carbonated ones tagged
`carbonated`), `ice` (frozen water — `meltingPoint`,
`latentHeatOfFusion`, so it melts by the same arithmetic a drink's ice
does), the `can` and `mixer-bottle` vessels, the floor rows incl. the
`ice-bag` and `can-of-cola`, the bottling outfit consigning onto
`/trade/distribution/thing/counter`, and the `soft-drink` serving recipe
(a glass of soda for the patron who isn't drinking — `mixer` is the
category tag the cocktails draw on, not a recipe).

## ⭐ The standard: a product is a vessel, filled

Template inheritance does not exist. A vessel row is therefore **not**
something you inherit from — it is the exemplar you copy, and this
README is the contract:

> **A bottling product row is one of this pack's vessel rows, plus the
> fill.** Same class, same capacity, same construction, same material;
> add `interiorMaterial` + `interiorAmount`, `open: false`, a
> `censusKey`, a `regionTarget`, and the `container:` that stands it on
> its producer's floor.

`can.yaml` (the empty) and `can-of-cola.yaml` (the same vessel, filled
and seamed) are the pair to read. Three properties are load-bearing:

- **`closure` is construction; `open` is state.** `closure: sealed`
  means gas-tight — it is why fizzy drinks come in cans, and it is a
  fact about the vessel that never changes. Whether the lid is on is
  `Sealable.isOpen()`, which the pour verbs ask. **An empty can is an
  opened can.**
- **A vessel row authors no `censusKey`.** The census counts *product*;
  an empty derives `vessel:<keyword>` from state, so nothing can target
  it and the sweep never mints empties. Empties come from drinking.
- **The vessel is the input of the trade that ships it.** When the
  filling recipe lands it will claim a clean empty from a pool — the
  same mechanism the bar's glasses already use — so these rows are the
  stack the line draws from, not decoration.

A future can-making trade takes `can.yaml` back upstream; nothing about
the standard changes when it does.
