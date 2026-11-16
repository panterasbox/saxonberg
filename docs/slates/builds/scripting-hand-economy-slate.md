# Scripting the hand economy — the player's own conveniences

> **Status: UNBUILT · opened 2026-11-14 (size and carrying W10, owner ruling: *the command def
> predicts everything a command does*).** What ships: the engine does exactly what each verb's
> help says — an instrument is used where it sits, `get X from <on you>` takes it into a FREE
> hand or refuses naming what the hands hold, a shut holder says `open` it first, `unwield` puts
> a thing off the hands by the one documented order or refuses and leaves it in hand. Nothing
> frees a hand, opens a pouch or remembers a home for you. The conveniences the engine used to
> perform implicitly are the player's to write, with `def`/`do` ([scripting.md](../../subsystems/scripting.md))
> and aliases ([shell-alias.md](../../subsystems/shell-alias.md)).
> **Left:** try-else · waiting on combat's beat · a fits predicate · aliases with arguments · an alias `$1`-else-default form
> **Size:** a build — five small language expansions, each authored out-of-band per scripting.md § *Growing the language*

## What a player writes today

```
def ready ($x) { each (me:held) { unwield $it } ; get $x }
def draw ($x) { open ($x):e ; get $x from ($x):e }
```

`ready` clears the hands and takes the thing; `draw` is the owner's one-line *open and take* —
the holder is the thing's container, `:e`. Both are explicit, both are the player's, and both
print exactly what each step did.

## What is missing — each a scripting expansion, never a carrying rule

1. **Try-else.** A script fails closed on the first refusal (scripting.md § *Scripts fail
   CLOSED*): `unwield $it` refusing *nowhere on you to put it* aborts the alias where the player
   meant *then `drop $it`*. Needed: a form that reads a refusal as a value — `try { … } else
   { … }`, or a refusal-as-falsy on the `( )` island (`if (unwield $it) …`) — a new intrinsic
   (lazy block args).
2. **Waiting on a beat.** In a fight each hand act is a guarded beat (W10 D-W10-5) and the second
   in a row is `already-switching`; `wait` suspends on the game clock, not combat's tick. Needed:
   `when (me:fight:ready)` — a session predicate the `( )` island can ask (as an MQL facet, or a
   `fight` subcommand that reports it).
3. **A dry read of "would it take it".** `put $it in <first place that fits>` has no MQL
   predicate for *fits in* (`Container.fitRefusal` / `Placing.canPlace` read dry); without it the
   alias is the engine's old `stow` by trial. Needed: a `[fits:<holder>]` predicate, or the
   `unwield` refusal above as the loop's test.
4. **Aliases with arguments.** `alias` expands a word; `def` takes positional params but lives
   in a script document. A player-level `alias ready = def …` round trip is the gap `help alias`
   should name.
5. **An alias `$1`-else-default form** (size-and-carrying finalize, 2026-11-16). `i` and
   `inventory` are removable default aliases for `query --ledger me:i` (W10h-b), so `i <target>`
   no longer works — the alias has no slot for an argument. Needed: an alias form that takes
   `$1` when given and a default otherwise (`i` → `query --ledger ${1:-me}:i`), so `i bob` and
   `i backpack` read the ledger of what was named.

No code in W10; this slate holds the five and the two `def`s.
