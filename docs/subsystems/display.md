# Display — screens: what a display shows, and who sees it

The display substrate (libations D12): a **tablet, a wall TV and the
terminal's departures board are one thing** — a `Thing` that shows one
source to everyone who can see it. Output is optical; the difference
between the three is data.

Source: `lib/display/Display.ts` (`DisplayMixin`), `api/display.ts`
(`DisplayApi`), `platform/idea/api/DisplayLogic.ts` (the logic singleton
at `/platform/idea/api/display`), `platform/thing/{Tablet,Screen,Remote}.ts`,
`world/common/tpa/TpaTerminal.ts` (composes the mixin). Tests:
`lib/display/__tests__/Display.test.ts`.

## The rule that governs everything here

> **A display confers no money authority.** A thief holding the house
> tablet reads the stock sheet — the sheet is what the screen shows. What
> the thief lacks is the seat: `wallet use house` refuses them, `buy`
> settles from their own account. Money authority is only ever the
> wallet's, and the wallet's is the position's ([employment.md](./employment.md),
> [banking.md](./banking.md)).

The screen is a *thing* in the room. Verbs are physical acts — `watch …
on tv`, `house stock` with the tablet in hand — and the operations they
drive are apps on a display, never a new verb only a machine could run.

## `DisplayMixin`

Persistent + authorable fields (the row decides which screen it is):

| field | values | meaning |
|---|---|---|
| `pairing` | `remote` · `held` · `staff` · `open` | who may DRIVE it (below) |
| `sourcePolicy` | `any` · `cards` · `streams` | which source kinds it accepts (`acceptsSource`) |
| `principal` | a Business template path or `''` | the `staff` policy's "signed in as" |
| `remote` | a `Remote` row's template path or `''` | the `remote` policy's paired thing |

Runtime only: `_showing: DisplaySource | null` — **a screen is dark on
boot**; nothing persists what it showed. `_setShowing` is gated
`FromTemplate('/platform/idea/api/display')`: only the logic singleton
writes it, because a write without the projection below would leave
every viewer's screen stale.

### The two source kinds

```ts
type DisplaySource =
  | { kind: 'stream'; target: WatchTarget; label: string }
  | { kind: 'card'; cardId: CardId; subjectId?: string; key: string; prose?: Mml };
```

A **stream** is the focal embed the personal `watch` verb already writes
([streaming.md](./streaming.md)). A **card** is a card-rail card
([card-surface.md](./card-surface.md)) — the `stock` sheet, the terminal's
departures board (a `subject` card on the terminal carrying the board's
prose).

## Who drives — the pairing policies (`DisplayApi.mayDrive`)

| pairing | drives it iff |
|---|---|
| `held` | the actor carries it (inventory, any depth) |
| `remote` | the actor carries an instance of the row `remote` names — the pairing is the SCREEN's field; a `Remote` is a plain thing |
| `staff` | `EmploymentApi.holdsPosition(actor, principal)` or `isProprietorOf` — the house tablet's "signed in as" |
| `open` | `PerceptionApi.canReach(actor, display)` — the terminal's board |

### The modem is a predicate on the driver

`AetherMixin` is `_augmentGated`: it is active only when a slot augment
or a species confers it, so a slot-less Thing composing it would never
be active — and a display hosts no updates. So the screen composes **no**
aether mixin. Driving *by mind* is `MixinApi.isActive(driver,
'AetherMixin')` checked on the driver, and it works from anywhere the
display exists; driving *by hand* needs reach. (Plan deviation 4 from
the requirements' wording; the five D12 behaviours hold.)

### The resolver ladder (`DisplayApi.resolveFor(actor)`)

Returns `{ display, mode: 'hand' | 'mind' } | null`:

1. **Held** — a screen in your hand is yours to drive **whatever its
   pairing**. This rung is deliberately unconditional: it is what lets
   the thief read the sheet on a `staff`-paired tablet. The seat is
   checked where money moves, never here.
2. **Paired and in sight** — a screen in the actor's room that
   `mayDrive` admits.
3. **Paired anywhere, by mind** — with an active `AetherMixin`, any
   `held`/`remote`/`staff` screen `mayDrive` admits (`open` screens are
   never driven remotely). The driver by mind **sees nothing** of what
   they show — the projection is to the screen's room, not to them.

A command that needs a screen and finds none declines `no-display`
("you'd need a screen").

## Who sees — the projection rule (`DisplayApi.show`)

> *The display you can see shows X.*

`show(display, source)` sets `_showing`, then projects to **every
viewer**: a `HasInteractive` Stuff with at least one Interactive
attached, in the display's resting room, passing
`PerceptionApi.perceives(viewer, display)` (that predicate is a
concealment gate only, so the room check is explicit). Derived from the
world on every projection — never from the connection registry.

- A **stream** source writes each viewer's `cockpit.watch` clientState —
  the same key the personal `watch` writes — with a `display: { stuffId,
  label }` marker, and pushes it. No new wire message.
- A **card** source is `CardApi.push`ed to each of the viewer's
  Interactives with the display's presentation as the card `title`.
  That is the card rail's ONE birth path: the onlooker's card is a fact
  the server pushes, not one the client infers. (The `card-birth-path`
  test's mint set records `DisplayLogic:push`; when a display is in
  play, `show` is the birth path and the driver's own card is one of the
  projected viewers' — no double push.)

`clear(display)` darkens it and clears every projected viewer's
`cockpit.watch` that names it. `refresh(display)` re-projects the current
source. `viewersOf(display)` is the derived viewer list.

### Arrival and departure — `DisplayApi.refreshViewer(viewer)`

One hook, called from `Mobile.traverse` and `Mobile.teleport` after the
move: project every lit display the viewer now sees, and if their
`cockpit.watch` names a display they no longer see, clear it. Walking
into the booth shows what the TV shows; walking out, the shared embed
leaves with you. A personal watch (no `display` marker) is untouched.

## The three instances

| | class | pairing | sourcePolicy | row |
|---|---|---|---|---|
| **house tablet** | `/platform/thing/Tablet` (`Display(Detailed(Thing))`, portable) | `staff` | `cards` | `/trade/hospitality/thing/house-tablet` (`principal: ''`); the lounge's `/world/lounge/thing/house-tablet` sets `principal: /world/lounge/idea/business` |
| **booth TV + remote** | `/platform/thing/Screen` (`Display(PostRegistration(Fixture(Detailed(Thing))))` — self-seats via `seatIn`, `canMove` vetoes anything but a `Location`: mounted, never carried) + `/platform/thing/Remote` (`Detailed(Thing)`; the row authors `keywords: [remote]`) | `remote` | `any` | `/world/lounge/thing/tv` (`remote: /world/lounge/thing/remote`) in `/world/lounge/location/booth` |
| **the terminal** | `TpaTerminal` composes the mixin; the constructor sets `open` / `cards` | `open` | `cards` | the lounge terminal, unchanged |

## The verbs that drive a display

- **`house stock`** ([employment.md](./employment.md)): `resolveFor(giver)`
  → `no-display` if none → emits the sheet as prose and `show`s the
  `stock` card (`Cards.ts`: an `mql` source over
  `reachable:[mixin.BulkableMixin]`, live) through the screen. When the
  screen's `principal` is set, the house read is the screen's (the
  signed-in tablet); otherwise the giver's seat. `house par` — a write —
  stays seat-gated.
- **`watch <target> on <screen>`** / **`watch off on <screen>`**
  ([streaming.md](./streaming.md)): the `on` object arg resolves in
  `peers` scope with `requires: DisplayMixin`; `mayDrive` decides;
  `show`/`clear` project. Personal `watch` (no `on`) is unchanged.
- **`teleport`** (bare, at a terminal): the departures board renders for
  the reader and is `show`n as a `subject` card carrying the board's
  prose to everyone in reach of the terminal.

## What the client changed

Nothing but a caption. `@saxonberg/types` `WatchTarget` gained
`display?: { stuffId: string; label: string }`. `StreamEmbed.tsx` renders
"on <label> — whoever holds the remote switches it off" under a shared
embed (`data-testid="display-caption"`) and hides the personal
empty-state copy; the iframe path is identical. Two RTL tests.

## Non-goals (v1)

- A `channel` list / guide on the TV — the remote drives `watch … on tv`
  with the stream grammar; a channel vocabulary is the lounge's later
  build.
- Persisting what a screen shows across a reboot — dark on boot, by
  design.
- A screen as an aether host (see the modem rule above).
- Driving an `open` screen by mind.
- Multiple simultaneous sources per screen.

## Cross-references

[streaming.md](./streaming.md) (the embed key, `watch … on`),
[card-surface.md](./card-surface.md) (the one birth path),
[employment.md](./employment.md) (`house`, the seat),
[fasttravel.md](./fasttravel.md) (the terminal), [augmentation.md](./augmentation.md)
(`AetherMixin` activity), the libations plan
(`docs/plans/libations-plan.md`, findings 16–18).
