---
title: Carrying
tags:
- guide
- inventory
- carrying
related:
- guide:doors-and-ways
---
# Carrying {#carrying}

Everything you carry is somewhere on you: in your hands, in a pocket,
hanging from your belt, in the bag at your side, or packed in the pack on
your back. Nothing just floats about your person. Where a thing is
decides how quickly you can use it, who can see it, and whether it fits
through a low door with you.

## Your hands {#hands}

You have two hands, and they hold anything: a mug, a sack, a coat, a
sword. When you `get` something it goes into a free hand first. If your
hands are full, it goes into the first pocket or bag it fits. If nothing
fits, you are told what you are holding and what to do about it: put
something away, or set something down.

Some things take both hands. A heavy thing does, and so does a long one,
and what counts as heavy or long depends on you: a small body needs two
hands for what a big one carries in one. A bow takes two hands whatever
your size, because one holds and one draws.

If you are knocked out, or you lose a hand, what that hand held falls to
the ground. What you wear stays on.

## Pockets {#pockets}

Clothes have pockets, and each pocket has a name: the *left pocket* of
your trousers, the *inner pocket* of your coat. A pocket takes small
things. A key, a coin or a box of matches goes in a trouser pocket; a mug
does not.

- `put key in trousers` puts the key in the first of two plain pockets it
  fits, and tells you which.
- `put key in coat` asks which pocket when the coat's pockets differ — one
  buttons, one is inside under the coat — and the question says how.
  `look coat` shows its pockets and what differs.
- `put key in "inner pocket"` names it.

Other people can see what is in an outside pocket. They cannot see into
an inner pocket, or a buttoned one, or a pocket covered by the coat you
wear over it.

## In hand, ready, packed {#tiers}

What you carry is at one of three distances from your hand.

- **In hand**: what you are holding now.
- **Ready**: what you can get at without taking anything off — your
  pockets, what hangs from your belt, the satchel at your side and what is
  in it.
- **Packed**: inside something you would have to take off — the pack on
  your back. To reach in, take the pack off first (`remove backpack`).

A shut thing is shut wherever it is. A buttoned pocket or a pouch with its
flap down has to be opened first (`open pouch`, `open "breast pocket"`),
and nothing opens itself.

`i` (or `inventory`) lists what you carry in that order, then tells you
how heavy your load feels. Both are shortcuts for `query --ledger me:i` —
`alias list` shows them — so the query's options work on them too:
`i --weight` gives each thing's weight and bulk, `i --flat` one plain
list. To see only part, narrow the query: `query --ledger me:i:held`,
`query --ledger me:i:worn`. `query --ledger me:I` opens the packs on your
back as well.

<help verb="query"/>

## Putting things away {#readying}

A tool is used where it sits. `measure strike with compass` with the
compass in the open pouch on your belt works, and the compass is still in
the pouch afterwards. A shut pouch has to be opened first; a compass packed
on your back is refused until you take the pack off.

Nothing moves into or out of your hands unless you say so:

- `get compass from pouch` takes it into a free hand. With both hands full
  you are told what you are holding and what to `drop` or put away.
- `unwield sword` puts it away by the one rule: a pocket, a hook on your
  belt, a pouch or bag you wear, the pack on your back, the first that
  takes it. You are told where. If nothing takes it, it stays in your hand.
- `drop` sets a thing down where you stand.

If you want one command to do several of these, write it yourself:
`def draw ($x) { open ($x):e ; get $x from ($x):e }` (see `help def`).

In a fight, every one of these hand acts takes time, and your guard is
down while you do it. A pistol in a holster or a sword in its scabbard
comes out quickest. A thing in an open pocket or pouch takes longer.
Opening a buttoned pocket or a shut pouch is its own moment. Nothing comes
out of a pack on your back in a fight, and a gun in a pack at your feet is
`get gun from pack`. Dropping what you hold is instant. Out of a fight,
nothing waits.

## Belts and what hangs from them {#belts}

A belt is something you hang things from: a pouch, a holster, a knife in
its sheath, a canteen on a clip. A bandolier, a harness, the straps of a
pack and a pack saddle work the same way.

- `put holster on belt` clips it on. `get holster from belt` takes it off.
- `i` shows what hangs from it and how much room is left along it.

A belt only holds so much. It is as long as your waist is round, so a
small body's belt holds fewer pouches than a big one's, and it will only
bear so much weight. Things that hang from you make you wider, and metal
that hangs from you clanks when you move, which matters if you are trying
to move quietly. A thing in a pocket makes no sound.

When you take off a coat or a belt, what is in its pockets or hangs from
it comes off with it. Hang the coat up and the key is still in its pocket.

## What fits {#fits}

Everything has a size, worked out from what it is made of and how much of
it there is. A bag, a chest or a pocket takes a thing only if it fits
through the opening and inside. A thing can stick out of an open bucket
or crate, but a lid will not shut on it. A soft thing such as a coat
squeezes through a gap a board will not.

Water gets into what you carry when you go in, unless it is in something
shut and waterproof. An oilskin pouch keeps a letter dry. A shut canvas
pack does not.

## Low doors and tight squeezes {#stoop-and-crawl}

Some ways are low, narrow or awkward. If you do not fit, you are told
what would work.

- `stoop north` takes you through a low door bent over.
- `crawl east` takes you through a crawlway on hands and knees. A pack on
  your back may not fit; take it off and carry it through.
- Climbing a ladder takes both hands.
- A long, stiff thing such as a pole or a plank may not get round the bend
  of a stair.
- You cannot stand up under a ceiling lower than you are.

<help verb="stoop"/>
<help verb="crawl"/>

## Giving and buying {#giving}

When you give someone a thing, it goes where their body puts it: a hand,
a pocket, a bag. If nothing fits, they set it down at their feet, and
everyone sees it. A shop works the same way: you pay, and if you cannot
carry what you bought, you set it down where you stand. It is yours
either way. The same goes for coins from a tip jar, a crate drawn from a
store, a thing taken back off a shelf, and a rope you untie.

Picking something up is different. If `get` has nowhere to put a thing,
it does not pick it up only to set it down again: you are told what you
are holding, and the thing stays where it was.

Things you make, catch or harvest go into your hands or bags if they
fit. If they do not, they are set down where you stand.

## Leading an animal {#leading}

Tie a rope to an animal's halter (`tie rope to mule`) and hold the other
end. Where you go, the animal follows, as long as it fits. A mule laden
with panniers may not fit through a narrow gate, and you are told so.
While you pull a cart, your hands are on its handles.

<help verb="get"/>
<help verb="put"/>
