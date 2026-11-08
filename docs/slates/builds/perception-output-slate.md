# Perception output slate — one voice per thing

> **Status: UNBUILT** — captured 2026-11-08 from the client-surface
> review (!509). The owner has been thinking about this for a while; this
> is the first time it is written down.
> **Left:** the census of every producer that bolts prose onto a look ·
> a home for each (a thing, a detail, a status, or an event) · `look`'s
> options and aliases (`--brief` and friends) · what `query` prints · the
> overhaul of the sensory verbs that rides with it
> **Size:** a build (part of a larger overhaul of `look`, the sensory
> verbs and `query`)

Related: [legibility-slate § Part C/D](./legibility-slate.md) (contents
grouping; `sense` cut and `look` as the take-it-all-in verb) ·
[senses-slate](./senses-slate.md) (per-channel rendering) ·
[place-surfaces-slate](./place-surfaces-slate.md) (where in the room;
the presentation tiers) · [card-surface.md](../../subsystems/card-surface.md).

## The problem

A room's `look` today is the authored description **plus** lines that
other systems append to it: the light band (*"It is dim here…"*), a
notice derived from the house's openings (*"A notice here: HELP WANTED —
bartender, 4 zorkmids a game-hour"*), concealment hints (*"A hairline
seam runs up the north wall…"*), the body (*"You're shivering."*), and a
person's presence line (*"Now: stand."*). None of it is legible: a
player cannot tell what produced a line, or why it sits apart from the
description. And every new system that wants to be seen is tempted to
instrument one more interface to say something.

## ⭐⭐ The rule (owner, 2026-11-08)

> **The authored content of a thing is its short description, its long
> description, its details — and, to a lesser extent, its status.**
> That is all a thing should need to say for itself.

Everything else that wants to be seen has to find an honest home:

| it is… | its home | example |
|---|---|---|
| a **thing** | an object in the room you can look at | a hiring notice is a SIGN on the counter, its text derived from the openings — visible, readable, and you know where it came from |
| a **detail** | a `details:` entry on the thing it belongs to | the seam in the wall |
| the thing's **state** | its status, or its description reading its own state | the light; a lit/unlit lamp |
| an **event** | a line in the transcript, when it happens | *"You start to shiver."* — once, when it starts, not on every look |

⚠ More expressive mechanisms than appending text probably exist — the
point is that a player should be able to answer *"what is this line and
where did it come from?"* for every line they read.

## The transcript and the cards (decided for !509)

- **The terminal is a transcript.** It is written once and never
  rewritten: no hiding a line because a card covers it, no line
  reappearing when a card closes. (!509 removes the hide-while-covered
  filter.)
- **A card is a snapshot you can refresh.** Refresh re-runs the command
  that produced it (the clickable *taken 18:35* stamp). Live
  subscriptions to everything a card shows were tried and are mostly
  rejected: expensive at large breakpoints, and a refresh is simpler and
  transparent. Options that make a refresh behave specially are open.
- **The arrival command is the editorial choice.** Whatever runs when you
  arrive (a player setting, default `look`) is all most players will ever
  see of a place: it sets up the next decision — move on, or stay and
  drill in. Drilling in is the exception. What `look` prints by default
  is therefore the most-read text in the game, and is designed as such.

## `look`'s options, not more verbs

One verb, options for the shapes people want, aliases only for the
frequent ones:

- `look --brief` — the glance: name, the long description, who is here
  (with status), the ways out. No lists, no notices.
- the full look — everything, as a card's body.
- an alias (`glance`?) only if `--brief` gets typed a lot.

`query`'s output is in scope too: it lists what an MQL expression names,
and it should read like the same family as `look`.

## The census (to do when this slate is picked up)

Find every producer that appends text to a look, sense or query result
and give each a home from the table above. Known seeds from the !509
walk: the light-band phrase · the derived help-wanted notice · passive
concealment hints · body-state lines (shivering) · the presence line
("Now: stand." — fixed to read posture correctly in !509, still a second
voice) · the "N quiet interfaces" row on the inspection card.
