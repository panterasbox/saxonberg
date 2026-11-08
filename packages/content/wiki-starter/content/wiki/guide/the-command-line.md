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

The words decide the act. The game never guesses which one you meant.

A *manner* of doing something is an option, not a new verb.
`wash board --hard` scrubs it rather than rinsing it, and takes the time
and effort scrubbing takes.

## Where a verb looks {#where-a-verb-looks}

A verb that works on the world (cutting, digging, harvesting, sweeping)
looks around you first. A verb that works on what you hold looks in your
hands first. A name is just one more word a thing answers to, so the
fullest match wins: `look hesper` finds the ship, not her deck.

## Saying which one: `verb@source` {#verb-at-source}

When two things nearby both offer the same verb, put the one you mean
after an `@` on the verb: `wind@me:i:watch` winds the watch you are
carrying, `harvest@here:i:wheat` the wheat where you stand. What comes
after the `@` is a query, the same language `query` uses: `me` is you,
`here` is where you stand, and `:i` is what is in it. Quote a name of more
than one word: `wind@"pocket watch"`.

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
`look`, `i` for `inventory`, `h` and `?` for `help`, `'` for `say`, and
the compass letters for `go`. Make your own with `alias set`. If a
built-in one gets in your way, `alias unset` turns it off, and it stays
off.

## Scripts {#scripts}

A script is a list of commands you wrote and named. Run one with `do`:

<help verb="do"/>
