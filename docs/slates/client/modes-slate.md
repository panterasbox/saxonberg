# Modes slate — what you are here to do, and the order we design it in

> **Status: DESIGNING** — opened 2026-11-21 with the owner. What ships: the mode axis
> (`chat · explore · watch · build · govern`, [cockpit.md](../../subsystems/cockpit.md) § The mode
> axis), one stage per mode, the rail's mode buttons, *a mode is a view, never a gate*, no
> auto-switch. Explore is mid-build (the navigation card, MR !640).
> **Left:** the full mode list · the design queue · each mode's definition (five questions) · the
> handoff from explore into a mode · the shared cards Learn produces
> **Size:** a roadmap — each mode is its own slate and build; watch is first
> ([watch-slate.md](./watch-slate.md))

## 0. The ask **[DECIDED — the owner]**

*"This is to think about the other experiences I need to design for and trying to come up with
some kind of priority queue or roadmap for designing and building them according to our current
plans to promote the project through reddit and youtube and twitch and discord."*

Explore keeps its name (*"I'm actually pretty happy with it"*). Every mode is named by a verb that
finishes *"I'm here to ___"*.

## 1. The modes **[DECIDED — the owner, list not claimed exhaustive]**

| mode | the activity | note |
|---|---|---|
| **explore** | getting around, then looking closely at where you are | in build |
| **watch** | watching a live performance | [watch-slate](./watch-slate.md) |
| **learn** | the curriculum: instruction, reading, labs, assessment | on campus or off |
| **craft** | working at a bench: recipe, materials, tools, the work in progress | |
| **govern** | the Compact's floor: bills, votes, elections | shipped as a value, unlaid |
| **steward** | the place your title or grant covers | was "home" — see § 4 |
| **chat** | channels and DMs | shipped |
| **build** | writing the world | shipped (CMS, studio) |
| **broadcast** | a streamer's own controls while live | only the founder today; outside the queue |
| *work* | acting for a business under contract | **open** — § 4 |
| *the hunt / fight family* | hunting, and conflict between people | **open** — § 4 |

⭐ **The rail shows the whole list.** The owner: *"I do want to show the whole list — it's a nice
tease and I like to reward curious people."* An unbuilt mode is labeled the way the Views menu
already labels one (`╌╌ not built`), never hidden. (A derived rail — only the modes your positions
and titles open — was proposed and **rejected** for this reason.)

⚠ *"This game is a lot of things to a lot of different people and building one interface for
everyone is a challenge."* The list stays short on purpose — *"we only have room for so many
different options before it starts to get silly."*

## 2. The test for a mode **[LEAN]**

A mode earns a slot when it has **an information space no other mode has, and someone spends
sustained time in it**. Craft passes at once (the process: recipe, materials, tools, the state of
the work, the grade coming out). Anything that fails the test is a card that rides inside a mode.

Before a mode is designed, it is defined by five questions — *the gaps come out of the definition,
never ahead of it* (the owner: *"it's hard to reason about what's missing when we haven't even
discussed what it is yet"*):

1. **Who is in it, and what are they doing** — a person and an activity, not a feature list.
2. **The information space** — what they need to know that no other mode shows.
3. **The loop** — what they do over and over, and the commands that carry it.
4. **In and out** — which place, object or moment offers the mode, and where they go next.
5. **The first minute** — the first time they open it, what do they see.

## 3. The queue **[LEAN]**

1. **Explore** — finish the navigation card; then the perception half and the handoff (§ 5).
2. **Watch** — the Twitch arrival funnel. Deadline: the Twitch launch after New Year.
3. **Learn** — sooner than it looked. The first session runs lounge → dorm → orientation, so
   Learn is the mode a new player reaches right after explore; and it produces the cards
   everything else reuses (§ 6). The cockpit slate's study / classroom / tutor modes fold into it.
4. **Govern** — Compact first: the legislature is the game before there is a game, and the vote is
   the reason to come back.
5. **Craft**.
6. **Steward**.
7. **Work** and **the hunt / fight family**, once defined.
8. **Chat** and **broadcast** — ongoing; broadcast serves one person and is not ranked.

## 4. Modes still being argued **[OPEN]**

- **Steward, not home.** The owner: *home "is very focused on a few very specific Places … we'd
  want it to have something to say about other people's homes than yours, or the aspects of a
  commercial or industrial facility that require some amount of stewardship."* LEAN: steward is
  what your **title or use-grant** covers ([separation-of-powers-slate § 7t](../society/separation-of-powers-slate.md)):
  the holder sees condition, upkeep, grants, furnishings; a grantee sees what the grant covers; a
  guest is in explore. Dave's leaking roof is steward; his P&L is not.
- **Work.** The owner: *"maybe what the 'work' mode is, is more of a mode for anything done under
  contract whether you're employee or employer … I'm just not sure what specific kind of controls
  it all needs to justify its own item on the menu."* LEAN: its information space is **the
  institution you act for** — the queue and your duties, the till, the roster; for an owner, stock,
  payroll and P&L — so Mara and Dave on one shift see different cards by position. The proprietor's
  side already ships as the `house` verb (books, P&L, payroll, roster, stock, prices), all prose
  today. Open: whether enough time is spent there to earn a slot, or work is a card inside craft.
- **Craft is its own mode** **[DECIDED — the owner]**: *"we absolutely want a 'craft' mode … that's
  what I was reaching for when thinking about working at the bar."* The bar is craft plus
  inventory, payroll and P&L done by different staff.
- **The hunt / fight family.** The owner: hunting *"is about a lot more than just combat"*, and
  conflict between people wants a word that is neither offense nor defense (*"a soldier in active
  combat may be operating in a completely offensive role but uses all the same controls as the
  defender"*). *"Hunt as multiple modes makes a lot of sense."* LEAN on the word **fight**
  (a verb, both sides; "martial" is an adjective). Open: how hunting splits; whether combat is a
  mode or the summoned card over the view that the combat slate leans toward — a fight starts
  wherever you are attacked, before anyone chooses a mode.
- **Watch any video** is **not** a mode **[DECIDED — the owner]**: a video player is a card, and
  Learn needs one. Watch is the live, real-time performance. *"We might not want to call it
  'watch' we might want to call it 'live'"* — LEAN keep **watch** (the verb test).

## 5. Where explore ends — the handoff **[LEAN]**

The owner: *"You need to ask 'What happens at the end of the Explore experience?' because at some
point you stop walking around and do something in one general area."* Sometimes the answer is
still explore — perception, search, reading — and that half is undesigned. The rest of the time
explore has to show **what this place affords and offer the door into the mode for it**: at the
bar, order and clock on; at a bench, craft; in a classroom, attend. Only `cockpit mode` changes the
mode, so the handoff is an **offer** the player clicks, never a switch.

Nothing on the server links an affordance to a mode today. A command view's `category` is a
possible key; the client owns no command semantics, which argues for the server computing the
offer.

**Open:** the bar's room talk. The design slates say *the room is a channel* (room speech in chat);
the shipped Chat filter leaves room speech out on purpose. Which one is Dave's Bar?

## 6. Learn is the card factory **[LEAN — the owner]**

The owner: *"the tricky part will be all the labs which probably each want their own cards and
widgets for using the laboratory equipment. the nice thing is all that ports out to the off campus
experience as well … so the school is now our path to building out all the smaller forms and tables
and such that all our other little trades and subsystems need to smooth over their CLI."*

A mode is an arrangement of cards; the instrument cards a lab needs are the cards a bench and a
shift need. Precedent that ships: the `survey` card's frame (rows of channel, figure and honest
bracket) is already shared by mining and soil — a general readings frame plus a work-in-progress
element could serve lab and bench alike. Across every mode surveyed, the server's state reaches
the client **as prose**; most modes will want the server to publish structured state beside it.

## 6a. The design language — what translates between modes **[DECIDED — the owner, 2026-11-21]**

The owner: *"the important part is the design language translates between modes, the specific
design doesn't have to."* And: *"any 'forever and always' decisions were made before we even had a
map of the modes in front of us."* So the shipped stage (a fixed rail, a fixed panel every mode
fills) is **not** preserved; the grammar's laws ([cockpit-composition.md](../../cockpit-composition.md))
are.

1. **A mode is a priority list over shared parts** — the chrome, the mode's subject (if it has one),
   the terminal, cards, and anything the mode argues is permanent. Space is handed out down the
   list; when it runs out, things fall off from the bottom.
2. **The terminal never falls off** (law 1, never blind) — **except when the viewer explicitly
   maximizes something else.** *"If someone wants to penetrate it and go max dimensions despite
   losing the term that's up to them."* There is always a step just below max that keeps a
   terminal.
3. **The chrome never falls off, not even at max** — *"what I don't want to lose is the top nav and
   things like connection status"* — so notices still arrive.
4. **One terminal is always unfiltered.** *"If you only have space for one terminal, you have to
   show a single unfiltered view … unless we like the notion of different messages being hidden
   from view depending on which mode you're on which sounds like a nightmare to keep track of."*
   With room for two, they **split** the stream — the union is everything, nothing is shown twice.
   A mode never filters; a player may.
5. **Nothing is permanent unless the mode argues for it.** No slot is filled because it exists —
   the owner: *"you just saw a slot that needed filling and filled it."* The **mode rail** is chrome
   and stays (*"the dropdown doesn't pack the same punch"*). Explore argues for the navigation card;
   watch argues for **the watch card** at its small step (discovery, the schedule).
6. **The subject sizes first** (law 4): a fixed-ratio subject such as a video takes its box at the
   size chosen, and the rest is laid out in what it leaves.
7. **A mode owns its breakpoints; a card renders at any size** **[DECIDED — the owner]**. Cards stay
   mode-blind. Inside a mode, every card grows and shrinks through the **same** steps — the mode's
   slots (explore: unit · medium · full; watch: unit · medium · large · max, shaped around the video
   because it is watch's subject, but any card may take them). One card per slot; the previous
   holder returns to its size (the shipped `sizeBefore` rule). *Zoom* is one gesture everywhere
   (`client-card grow`/`shrink`); only the steps differ by mode. A per-card ladder was proposed and
   **rejected** — the owner: *"it means like the order you expand and collapse cards in determines
   what breakpoints you're seeing represented on screen at any given time."*

**Explore in this language:** the terminal is the subject (the grammar's *single* split); the
navigation card is the one permanent support explore argues for; cards come and go. Its behavior
does not change — its panel stops being *the panel every mode has*.

## 7. The lens pass

Run per mode, in its own slate. Recorded here: **pedagogy** decided Learn's place in the queue
(the cards it produces are the trades' controls); **economy** — every mode after watch serves
people already in the game, so the queue is ordered by the funnel the promotion feeds.
