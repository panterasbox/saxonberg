---
title: Scripts that stop, and handling a refusal
tags:
- guide
- scripts
related:
- guide:doors-and-ways
---
# Scripts that stop, and handling a refusal {#scripts}

A script is a few commands run one after another, exactly as if you typed
them: `script open north; go north`, or one you named with `def` and run
with `do`. Each line still needs whatever it needs. Running it as a script
skips nothing.

## A script stops at the first refusal {#stops}

When a line is refused (the door is locked, you are short of coin, the
word means nothing here), the script stops there. It says which line and
why, once:

```
The script stopped at `open north`: The lock holds — the oak door won't open.
```

Nothing after that line runs. A script never walks you through a door
it failed to open.

## Handling a refusal with `try` {#try}

To carry on instead, wrap the line in `try` and say what to do `on` a
reason:

```
try { open north } on locked { unlock $why.target; open north }
```

- `on` names one or more reasons (`on locked, no-key`), or `*` for any
  refusal.
- Inside the handler, `$why` is the refusal. `$why.reason` is its name and
  `$why.<fact>` is each thing it names. `$why.target` is the very door that
  was locked, so `unlock $why.target` unlocks that one.
- A trade can have reasons of its own, named by their full path:
  `on /trade/forestry/reasons/wrong-tool`.
- A timed act that is cut short (you `cancel` it, or what you were working
  on goes away) is refused as `interrupted`.
- When the records can't be reached, the refusal is `unavailable`. Try
  again in a moment.

If you misspell a reason, the script is refused before it runs, and the
corrected line is offered to tap.

## What no script can catch {#faults}

`on *` handles refusals: things the world said no to. It never handles
something going wrong in the game itself, such as a broken recipe or a
fault in the code. Those stop the script, you are told something went
wrong, and whoever keeps that part of the world is told what.

See `help script` and `help do`.
