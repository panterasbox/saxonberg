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
| **chat** | real-time conversation: channels, DMs, `#here` | shipped; § 6b |
| **post** | asynchronous: forum threads, the inbox and mail, the press | § 6b |
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
   *Then the prompt design pass (§ 6a), before chat.*
3. **Learn** — sooner than it looked. The first session runs lounge → dorm → orientation, so
   Learn is the mode a new player reaches right after explore; and it produces the cards
   everything else reuses (§ 6). The cockpit slate's study / classroom / tutor modes fold into it.
4. **Govern** — Compact first: the legislature is the game before there is a game, and the vote is
   the reason to come back.
4a. **Post** — right after govern **[DECIDED — the owner]**: the floor wants threads, and the inbox
   rides the aether apps.
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
   slots (explore: unit · medium · full · max; watch: unit · medium · large · max, shaped around the video
   because it is watch's subject, but any card may take them). One card per slot; the previous
   holder returns to its size (the shipped `sizeBefore` rule). *Zoom* is one gesture everywhere
   (`client-card grow`/`shrink`); only the steps differ by mode. A per-card ladder was proposed and
   **rejected** — the owner: *"it means like the order you expand and collapse cards in determines
   what breakpoints you're seeing represented on screen at any given time."*
8. **The support slot** **[DECIDED]** — the left slot is not a ladder step. Each mode owns one
   support slot that only ever holds that mode's support card (explore: the navigation card; watch:
   the watch card); no other card docks there, because its value is being the same thing in the
   same place (law 2). The support card is an ordinary card elsewhere — opened by its command it
   flows and answers in the transcript. Whether the slot shows is decided by **the priority list**:
   it is one entry and falls off in its turn.
9. **The priority list is data** **[DECIDED — the owner]**, so a player may reorder it in settings
   *"if it's easy to make some of this stuff configurable, we can bury it in player settings."* The
   modes' defaults: **explore** — terminal → navigation card → cards; **watch** — video → terminal →
   second terminal → cards → watch card (*"splitting chat is more important than discovery"*).
10. **Only the player changes the step** **[DECIDED — the owner, "for now"]** — by growing or
    shrinking the card in the subject slot; no arriving card changes it (no auto-switch, applied to
    sizes). **The window caps the step and never rewrites it**: when the chosen step no longer fits,
    the largest that fits shows, and widening returns the player's step — as placed cards fold and
    return today.
11. **Terminals and bars** **[DECIDED — the owner]** — a bar per terminal (input lives with its
    output, grammar § Command bars), and **a mode's default layout never opens more than two
    terminals** (everything, plus at most one split). The owner: *"multiple command bars have
    diminishing returns pretty quickly. two helps you context switch but more than 3 and it's a
    decision matrix to work out."* A player may open more. **The everything terminal's bar is the
    plain prompt** in every mode; **the prefix follows what you mostly type in that terminal** — so
    watch's lone terminal at the large step carries the chat prefix, with `/` always reaching
    commands.

**The prompt** **[DECIDED — the owner, 2026-11-21: "not perfect but I can live with all this for
now"]** — four things were called *prompt* at the bar (the prefix, the base prompt, asks, the
preview); the base prompt was one string per player against N bars.

- **One prompt per bar, from one `prompt.format`**, rendered by the server after every command with
  that bar's facts in the context. The default `{{ prefix }}>` reads `chat gossip>` or `>`. The
  owner: *"I don't really want to have two different concepts."* The rendered prompt is the bar's
  leading element; the separate prefix span and the format bar go.
- **Tokens are reads, and must be cheap to read every command for every bar** — state already in
  memory (`prefix`, `focus`, `here`, `posture`, `time`, `weather`, the bar's `channel`, `unread`,
  `watching`, …); nothing that queries.
- **The prefix is a write — a rewrite like an alias.** The owner: *"the prefix thing operates as
  write and most other prompt tokens — maybe all others — are reads. the closest analog to the
  prefix thing is aliases."* `{{ prefix }}` reads the bar's rewrite rule. **The bar never previews
  a rewrite; the echo reveals it**, one way for all: `chat bobalu> hi` · `chat bobalu> /look → look`
  · `> k rat → kill rat`. This retires the shipped client behavior that hid the prefix on `/`, and
  rules out a second render.
- **One command, one echo**, from the bar that issued it; the echo is the record of which bar sent
  it and what was rewritten.
- **A click has no bar**, so its echo gets its own unbarred prompt, marked as a click
  (`↳ > look the torch`), in the everything terminal — where an unbarred command's asks already go.

**Was open — the prompt design pass:** What a prompt shows, how a prefix reads at a
glance so two bars compare instantly, `prompt.format` customization (`PromptMixin`, named in
[shell-environment.md](../../subsystems/shell-environment.md) and unbuilt), and the phone's target
chip. The owner: *"one thing all this stuff does is make us have to revisit the whole prompt
customization design and interface which has gotten changed around several times and probably
isn't yet where it needs to be."*


**Explore in this language** **[DECIDED — the owner]**: the terminal is the subject (the grammar's
*single* split); the navigation card is its support slot (22rem); cards come and go. Two changes
from what ships:

- **Every mode's top pair is the same: full and max.** *Full* — the grown card takes the stage and
  the terminal stays at its floor; *max* — chrome only, the terminal given up by explicit choice.
  Explore's steps become **unit · medium · full · max** (a document or an illustrated map at max
  gets the whole screen as a stream does).
- **A card the player grows is laid out first** — the player's choice outranks the list, as a
  video's box does — then the list hands out the rest: terminal → navigation card → cards. At
  full the navigation card falls off and the terminal holds its floor; at medium it stays.

**The Where card — explore's support card at three depths** **[DECIDED in shape — the owner; to
see in the prototype, claude.ai artifact AZNSH7t6edfN4kpiLgpPnz]**. The owner: *"maybe it's not
'navigation' after all maybe it's something else."* What explore does after navigation stops —
looking closely, searching, reading, and the handoff — needs a home, and the
[map-slate](./map-slate.md) already leaned a **room view** (*a diagram on the compass plane*, ways on
their walls, contents as relations) and left open how to reach it. Room, zone and wider are three
different models with three renderers, so: **one card, "where you are", with a depth switch at the
top — Room · Zone · Region** — not sub-modes (you are still exploring at every depth) and not cards
swapped through the slot (the support slot is always the same thing). A shared spine (*you are
here*, the breadcrumbs); **Room** — the room view, who's here, what this place offers (the
handoff: a click that switches mode, amber when not for you now), what to read, what you have
searched; **Zone** — the navigation card as built (MR !640), its three zoom steps inside;
**Region** — the places above you, the zones you know and how they join, illustrated maps,
expanses. The **atlas** stays its own card (anywhere, not where you are). The depth is the card's
own control, remembered, never changed by moving. ⚠ It bends the navigation card's *"one column,
no tabs"* — argued consistent (that rule is about sections within one model; each depth is still
one column in a fixed order). **Open:** the card's name (LEAN *Where*) and *Region*.

**It shows what was authored here** **[DECIDED — the owner, 2026-11-21]**. The first prototype made
the room depth a second room inspection card (who's here, what to read). The owner: *"what I want
the explore card to answer is what was authored here? I don't need to know about everything in
reach but I do want to know what's staged. that's essentially what my maps try to tell me too.
this is what makes it a little different than the other kinds of inspection cards … those are
much more concerned with whatever the current runtime state is and how it's diverged from what's
staged or authored."* So:

- **The explore card is the staged layer, as you know it** — it changes when the place is restaged
  or you learn more, never when someone sets a glass down; that is why it can stay put.
  **Inspection and query cards are runtime** — what is there now and how it drifted. The room's
  inspection card keeps following your attention, arrival included (the `here` role is unchanged:
  *"your attention should move when you move and the card follows your attention"*).
- **The room depth:** the authored **ways** on their walls (a concealed way absent until found);
  **fixtures and props** grouped by where they sit; the **details** you can look closer at; **the
  cast — who belongs here, shown when absent** (*Dave runs the bar*; whether he is in now is the
  inspection card's); **what the place offers** (its authored business, menu, positions — the
  handoff); **searched and found**. Players never appear — they are not authored.
- **Server:** a projection of a place's authored layer (its row's ways, props, cast, details,
  business), filtered **by what you know** (the map's firewall) and **by spoiler appetite** (a
  place's details are spoilers on the same axis as paths). Staged content changes rarely, so it
  refreshes on restage or new knowledge, never live.
- The navigation design's *"position, never place"* holds at zone depth; the room depth is the
  authored place at your position.

## 6b. Chat and post **[DECIDED — the owner, 2026-11-21]**

**Chat, in the design language:** the terminal is the subject (steps unit · medium · full · max);
**two terminals** — the channel you picked splits out and *everything else* keeps the rest; the
**channel list is the support slot**; room for cards. Picking a channel retargets the split terminal
and sets its bar's prefix (`chat gossip>`); the everything bar stays `>`. **The room is a channel,
`#here`** — talk at Dave's lives in *everything else* until you pick it, which retires the shipped
Chat view's exclusion of room speech (a mode may not hide messages). The owner: *"the two terminal
split and channel list on the left is exactly what I was going for."*

**Chat is synchronous only; post is its own mode.** The owner, on putting a channel's forum twin
inside chat: *"sounds like shit that's been tried and rejected"* — Facebook Messenger's one buffer
for real-time and asynchronous (*"some people just get confused … it's why they need a whole
separate app"*) and Google Wave (*"a total failure"*). *"We need to cater to all different kinds of
playing habits."* **Post** holds forum threads (ordered or open subjects), the inbox and mail, and
the press. A channel with a forum twin offers *open the board in post* — the handoff pattern, a
click that switches modes, never the board inside chat.

**The monitor** **[LEAN]** — the owner: *"another design that actually wants many different chats
open at once in smaller cards to see everything at a glance … more to passively watch a buncha
channels at once and grouping them into different windows so maybe you'd have a small window just
for mudlog messages."* LEAN: **an arrangement of chat** the player composes and saves (no code),
built from **feeds — terminals with no command bar** (read-only scoped buffers in small cards), so
any number of feeds still leaves at most two places to type. Feeds are the player's own filters and
may overlap. It becomes its own mode (an operator's console) only if it grows non-message content —
gauges, the moderation queue, server health.

**The phone works the way Discord's mobile app does** **[DECIDED — the owner]**: one channel at a
time, full screen; the channel list a swipe away (a drawer from the left) with unread and mention
badges; who's here a swipe the other way. *Everything else* — the world, the room, your phone's
notices — is one more entry in the list, not a hidden remainder. This is the one place the
one-terminal-is-unfiltered rule bends, and it bends honestly: what the screen does not show is
**counted** on the list, never silently gone — which makes unread and mention counts load-bearing.

**Open:** unread and mention counts and badges (no server source today — required by the phone).

## 7. The lens pass

Run per mode, in its own slate. Recorded here: **pedagogy** decided Learn's place in the queue
(the cards it produces are the trades' controls); **economy** — every mode after watch serves
people already in the game, so the queue is ordered by the funnel the promotion feeds.
