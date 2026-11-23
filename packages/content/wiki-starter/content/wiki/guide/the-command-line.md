---
title: The command line
tags:
- guide
- commands
related:
- guide:how-to-write-here
- saxonberg
---
# The command line {#the-command-line}

Everything you do here is a sentence: a verb, the thing it acts on, and
whatever else the act needs. This page is how those sentences find their
things. What any one verb does is in `help` — type `help` alone for the
list of categories, `help <category>` for the verbs in one, and
`help <verb>` for the verb itself.

## One word, one act {#one-word-one-act}

Each verb has one word. There are no synonyms to learn: the word `help`
teaches is the word that works. When a verb does more than one thing, the
sentence says which. `throw` is the clearest case:

- `throw rock` pitches it away;
- `throw line to Mara` is a toss meant to be caught;
- `throw flask at the wolf` is meant to hit, and starts a fight.

- `dry shirt with towel` rubs it dry now; `dry shirt on rack` hangs it up
  and the air does the rest.

The words decide the act. The game never guesses which one you meant.

A *manner* of doing something is an option, not a new verb.
`wash board --hard` scrubs it rather than rinsing it, and takes the time
and effort scrubbing takes.

## Where a verb looks {#where-a-verb-looks}

A verb that works on the world (cutting, digging, harvesting, sweeping)
looks around you first. A verb that works on what you hold looks in your
hands first. A name is just one more word a thing answers to, so the
fullest match wins: `look hesper` finds the ship, not her deck.

## Names of more than one word {#names}

A name of one word goes in bare: `buy loaf`, `get flower`. A name with a
space in it goes in quotes: `buy "dog loaf"`, `look "brass lantern"`. A
leading *the* or *a* is fine either way (`eat the apple`), and so is the
plural (`buy loaves`). A name is whole words or the start of one: `buy
lo` finds the loaf, but a word from the middle of a name finds nothing.
When two things answer the same word equally well, you are asked which
one you mean. If you leave
the quotes off, the reply says there were too many words and shows you
the quoted form. Words you are *saying* or *writing* — `say`, `dm`, a
post — never need quotes.

Some slots take one of a fixed set of words, like a fire's draught:
`help <verb>` lists them, and a word not on the list is refused with the
list.

`here` is the place you are in, even when you are sitting in a boat or
lying in a bed: `look here` on the river describes the river.

## People and the sets you keep {#relations}

A word with `~` in front names something kept *for you*: `~here` is the
place you are in, `~inventory` what you carry, `~peers` who and what is
in the room with you. Your contact lists are kept the same way —
`~friends` is everyone on your friends list who is in the world, and
`~friends:iffy` is Iffy, through that list, wherever she is. A group you
belong to answers by its name (`~bookclub`), and `~contacts` is everyone
you keep — every list and every group at once. So `dm ~friends:iffy
hello` reaches her from anywhere.

`who` shows each player's `@` address (`@abc123`); `dm @abc123 hello`
reaches that one player even before they are on any list of yours.
`query me:~` lists every `~` word you can use, each with a line saying
what it means — and `query book:~` asks a thing what it keeps (a charter
book answers with its `~ships`).

## How long {#durations}

A slot that takes a length of time reads it the way you would say it:
`a week`, `2 hours`, `90 minutes`, `1h30m`. The time is the game's
clock, not yours. If a verb wants whole days, or at least a minute, it
says so when you give it something shorter.

## Saying which one: `source::verb` {#verb-at-source}

When two things nearby both offer the same verb, put the one you mean
first, joined to the verb by `::` — `me:i:watch::wind` winds the watch you
are carrying, `here:i:wheat::harvest` the wheat where you stand. What comes
before the `::` is a query, the same language `query` uses: `me` is you,
`here` is where you stand, and `:i` is what is in it. Quote a name of more
than one word: `"pocket watch"::wind`.

If the thing you reached for refuses, but something else nearby would
have done it, the reply says so and gives you the exact form to type.

## Things with books {#books}

A shop's shelf, a check rack, a house's accounts, a job board, a bank and
the land registry each keep a book, and you work that book by naming it
first:

- `shelf consign` and `shelf reclaim` put a good up for sale and take it back;
- `rack check` and `rack reclaim` hand a weapon in at the door and take it back;
- `house appoint`, `house dismiss` and `house draw` are the keeper's side of a house;
- `job apply` and `job quit` are the worker's side, beside `job claim` and `job fulfill`;
- `bank deposit`, `bank withdraw` and `bank transfer` move money;
- `title transfer` and `title subdivide` change who holds ground.

`help shelf`, `help house` and the rest list every entry in each book.

## Shortcuts {#shortcuts}

A few verbs you type all the time have built-in short forms: `l` for
`look`, `h` and `?` for `help`, `'` for `say`, and the compass letters for
`go`. `i` and `inventory` run a whole line, `query --ledger me:i` — what
you carry, grouped by how near it is to your hand. Make your own with `alias set`. If a
built-in one gets in your way, `alias unset` turns it off, and it stays
off.

## Scripts {#scripts}

A script is a list of commands you wrote and named. Run one with `do`:

<help verb="do"/>
