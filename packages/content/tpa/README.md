# tpa

The Teleport Authority pack — a **capability pack** (it ships classes in
`src/` alongside content in `content/`). Package
`@saxonberg/content-tpa`; namespace root **`/system/tpa`** — the *how the
world works* axis, beside `/system/arcana`, `/system/water` and
`/system/residence`. A system is true whether or not anyone is
participating in it: the network stands with nobody riding it.

The membership test: **the kernel takes the physics, this pack takes the
works.** What a relocation costs (`MagicApi.relocationCost` — `m·g·Δh`),
the cast pipeline it rides and the closed `Effect` union it joins are
kernel, because every pack's magic is already subject to them. What a
*content author names* — a node, a terminal, a card, the Authority — is
here.

## `src/` — the classes (`/system/tpa/<rel>`)

| module | backs |
|---|---|
| `lib/FastTravel.ts` | `FastTravelMixin` — the node: directionality, routes, the timetable, the viewer-aware departures board, `boardLabel`. Substrate, inherited and never instanced. |
| `lib/paths.ts` | the pack's own template paths, in one place |
| `thing/TpaTerminal.ts` | the concrete terminal: a node that **runs on mana** (arcana's `ManaPoweredMixin`) and is **its own coupling** (`ConduitMixin`) |
| `thing/TravelCard.ts` | the carryable instrument — a bearer credential holder, never a clearance store |
| `idea/cmd/movement/TeleportController.ts` | the four-way fork: free movement · the ride · the board · the anchored spell |
| `idea/cmd/movement/RegisterController.ts` | `register` — writes to identity, never to a carried card |
| `idea/cmd/tpa/ProcureCardController.ts` | the clerk hands out a replacement card |

Source mirrors path: `src/thing/TpaTerminal.ts` backs
`/system/tpa/thing/TpaTerminal`. The pack imports the kernel **only by
package specifier** (`@saxonberg/server/mud/lib/…`) through the server's
`exports` map, and writes **absolute** `FromModule` gates.

## ⭐ AC24 — this pack holds nothing a non-teleport device would want

Reviewed class by class, and the sentence for each is *why a front door
somewhere else would not want it*:

- **`FastTravelMixin`** — a directed graph of surveyed destinations with
  a timetable and a board. Nothing that is not a transit network wants
  routes-plus-departures; a thing that merely moves you is an `Exit`.
- **`TpaTerminal`** — the composition IS the specificity: a fast-travel
  node that is also a mana-powered charged shell that is also a display.
  Every layer is generic; the stack is a terminal and only a terminal.
- **`TravelCard`** — the kernel's `CredentialWalletMixin` over a `Thing`
  with one `travel` kind. A payment card is the platform's; a key ring
  will be somebody's. This one is the travel kind's.
- **the three controllers** — verbs, and a verb belongs to whatever
  affords it.

⚠ **What deliberately is NOT here:** the socket (`ManaPoweredMixin` is
arcana's — a wall lamp composes it and has nothing to do with travel);
the physics (`relocationCost` is the kernel's — three packs ask for it);
the six-word supply vocabulary (the kernel's, because two packs must
agree on the same strings); and **any particular terminal.** Every gate
in the world keeps its row under `/world/<locality>/`, because a terminal
belongs to the locality it stands in.

## What the reform moved, and the reseed hazard

This pack is the migration half of the TPA reform: `FastTravelMixin`,
`TpaTerminal`, `TravelCard`, the three controllers, their views, the
travel-card row, the `fasttravel.*` settings and the Teleport Authority
all left `packages/server/src/mud/`. `Mixins.FastTravel`,
`MixinApi.isFastTravel` and the two TPA-shaped kernel validators were
deleted; narrowing is `MixinApi.isActive(x, FAST_TRAVEL_MIXIN)`.

⚠ **Reseed hazard.** `fasttravel.tpaBusinessPath` is a `settings`-kind
row and that kind is **merge-missing** — an existing world keeps
pointing at the retired `/world/terminus/terminal/idea/tpa` until an
operator edits the key by hand:

```
config set fasttravel.tpaBusinessPath /system/tpa/idea/teleport-authority
```

A fresh DB is correct automatically.

See [docs/subsystems/fasttravel.md](../../../docs/subsystems/fasttravel.md).
