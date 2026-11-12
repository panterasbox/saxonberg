# MQL lists — naming several things in one command

> **Status: UNBUILT** — a question raised 2026-11-09 during the
> controller-liquidity requirements, waiting for its own design conversation.
> **Left:** how a player names several things at once (`get apple and pear`) ·
> how a view says an argument takes a list · how lists interact with quoting
> **Size:** a tail, until the conversation sizes it

## The question

Controller-liquidity removes greedy object arguments everywhere. Greedy was
the accidental way a command took several words, and sometimes several
things. The owner, 2026-11-09: *"I'd rather get rid of greedy everywhere and if
it turns up usability issues then we'll do real design around that instead of
just relying on greedy."* and *"I kinda wanna have a larger conversation about
lists in MQL."*

What MQL already has: sets (`all watches`, a quantity, `@inventory` as a set
source), quoting with `"…"` for a multi-word name, and ordinals. What it lacks:
a way to name two different things in one argument, and a way for a view to
say an argument accepts more than one. Open, for the conversation: is a list a
grammar form (a separator), a set built by MQL, or a view's declared plurality;
and how the client teaches it.

## Related

- [controller-survey/](./controller-survey/README.md) — the survey that found
  the greedy arguments.
- [mql-grammar.md](../../mql-grammar.md)
