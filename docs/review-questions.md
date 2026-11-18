# The review questions — asked before review, not at it

The owner's MR reviews keep opening with the same questions, and the answers
keep turning up the same defects. Asked at review, each one is a rewrite;
asked at requirements or plan time, it is a sentence. This file is the list,
with the evidence that put each one here and **the phase that must ask it**.

⭐ **How the skills use it.** `/requirements` asks the R questions, `/plan`
(and the `planner` agent) answers every P question in the plan, `/build`
checks every B question at each wave and at the drive, and `/finalize`
verifies all of them. A question answered *"not applicable"* says why in one
line. A question nobody asked is the defect class it names, arriving later.

Evidence was gathered on 2026-11-02 from the retired plans' review B-lists
(ceramics, river, paint) and the owner's recorded corrections, across the
builds named in each entry.

---

## R — requirements

### R1. What IS the thing, before how it is made?
Before the trade's process: what the thing is, what it does, where it sits
in the supply chain, how it scales (one vs many), its material qualities,
and what other systems it touches — **in every epoch** (lens 5 first, not
last). *Paper, 2026-11-02:* the first draft went from the slate straight to
rags and the press; the owner: *"we need to step way back. I don't even know
what paper is in this game."* The step back found the build's real subject
(paper as the presentation of a Document) and halved its new substrate.

### R2. What is already doing this job — shipped, or in flight?
The **reuse ledger**: every concept the build needs, against what already
does it — shipped subsystems **and the sibling builds in flight** (`git
worktree list`; read each branch's requirements and plan). Product-level
conclusions go in *What already exists*; the ledger itself, which may name
mixins and classes, goes in the **slate** (a requirements doc may not name
code). It ends with the short list of what is genuinely new.
*Evidence:* ceramics !437 (*"the review kept finding this MR re-modelling
something the engine already modelled"* — 20 overlaps in one survey), paint
!513 (*"no new mixins"*), cleanliness !380, scan-sweep !362, climate !360,
location-graph !335; paper found harbors' register book and water supply's
rights on the flats only because the owner asked.

### R3. Would this make sense if the trade did not exist?
If yes, it is a cross-cutting capability, and it gets its own build — never
solved inside a trade build. *Evidence:* taps W4 (offline automation in a
build about tapping trees), paint (capabilities as mixins). A new systemic
field is the symptom: look upstream.

### R4. Does the drive reboot the world?
Tests build state and never reload it. Every drive that persists anything
has a step that **restarts the world and reads it back**. *Evidence:* rubber
(worn goods came back carried), underwater (goods duplicated), cleanliness
(players woke in the lounge), repair (a part's name wiped), sugar (a sealed
vessel's `open` broke restore).

### R5. Can a person see it?
Every new place in the drive is visited and `look`ed at in its own light, at
night as well as day if anyone goes there at night. *Evidence:* the sugar
house, the colorman's shop and the ropewalk were pitch dark; ceramics read
*"something"* after dark.

---

## P — plan

### P1. Every new mixin, Api, class, hook, registry and document kind cites the ledger
For each: the R2 ledger row it reuses or generalizes, **or** the words
*genuinely new* and what was searched to establish it. A hook with one
implementer and an Api with one concept in it are not new substrate; they
are a method in the wrong place. *Evidence:* as R2; *"what else would
possibly go in it?"* (cleanliness); a hook needs more than one implementer
(!335); promote at the third consumer, never invent it.
⭐ **And when the build GENERALIZES something, is the specific one gone?**
A general substrate that leaves the old one's surface standing beside it is
two of the thing, not one. *Evidence:* navigation-server !595 built the one
subscription protocol and its `SubscriptionApi`, and left
`MqlSubscriptionApi` (own logic singleton, two bespoke pokes) beside it —
*"now there's multiple subscription apis. we only need one for
everything"*. See [antipatterns.md § An Api per implementer of a
protocol](./antipatterns.md#an-api-per-implementer-of-a-protocol).

### P2. Host placement: does every host on it *mean* it?
The shipped test — *a guard that re-narrows the host set means the host is
wrong* — catches guards. It does not catch the other form: **an honest
default that answers "no" on most hosts.** Ask instead: of everything that
composes this host, how many will ever answer yes? *Evidence:* river !464
(every pool answering "no current", every ship carrying a firebox; *"this
build kept widening a general base"*), paint (the outside on every
`Structure` — *"the Waponi Woo PEAK could be painted"*), ceramics (flaws on
`Tangible`; `dip` afforded on every good), scan-sweep (`SiteMixin` on every
location).

⭐ **And its mirror: a value IDENTICAL on every host.** Hold everything
else fixed and vary the host — if the value never changes, it is a fact
about something else, copied onto each one. *Evidence:* navigation-server
(`flee` on every way's verdict — a fight is the viewer's, not the way's;
*"why is this a property of the exit?"*). See
[antipatterns.md § A fact about one thing, stamped onto everything it
touches](./antipatterns.md).

### P3. Refuse, skip or throw — never silent
For every path that can fail: the world says no → a refusal; a read finds
nothing → a skip; code asked the impossible → a typed throw, checked first.
No swallowed error, no quiet default. *Evidence:* ceramics (*"maybe we should
actually have a policy instead of giving up and telling no one"*; *"no quiet
losses"*), storage (the applier silently dropped fields), rubber (`wear` was
dead), river (`hailRangeM?.()` always fell back to 100).

### P4. No duck typing across packs
A pack imports only the packs it declares; anything else is a kernel
protocol. `?.()` on a name nobody defines, or a structural cast, is the
defect. *Evidence:* river W16 (~50 sites; *"I hate hate hate duck typing"*),
ceramics, !335.

### P5. The mixin decides; the controller is dumb
One decision, in one place, on the model. A controller that gates what the
mixin also gates, or decides what the mixin should, is two places to be
wrong. *Evidence:* climate, cleanliness (*"never gonna be able to find this
stuff"*), ceramics (`DipController` deciding).

### P6. Persistence is chosen per piece of content
Staged or live is a row's choice, with a named purpose; no class persists
everything it hosts. An identity key must survive a restart; a bare `Map`
field is not persistent. *Evidence:* cover (`PersistentLocation` copied from
Hinkley rows), paint (`persistsWhenStaged`), scan-sweep (`container:`).

### P7. Load on use — never search, never boot
Follow authored references; a question that needs a reverse search means
the reference points the wrong way. A roster nothing warms is fixed by
loading on use, not by a boot entry. *Evidence:* the scan sweep cut boot
entries 128 → 83.

### P8. Names
A class is named for its composition, never a mixin's word; the common word
wins a collision and the niche row is renamed; one verb per act; the
collision ladder before first-come. *Evidence:* `NamedField` (*"terrible name
… we have a Named mixin"*), the painter / bow line, `SeaRoom` / `RiverBed`.

⭐ **P9–P14 were added 2026-11-16 from one review** (size and carrying,
MR !576). It shipped every one of these defects, and each broke doctrine the
owner had already set. Ask each of them of **every** item on the plan's
new-substrate list, and of every wave's additions, *before* code. The answer
goes in the plan.

### P9. Could a player predict it from the command def and `help`?
The command def is the view and the help page. If a command does something
its def and `help` don't say (moves a thing, swaps hands, chooses for you),
it is wrong, however convenient. A convenience is the player's to express:
options, the arg types, an explicit verb they already know, or a script or
alias. Never a dispatcher flag. *Evidence:* the `readies:` view field (the
dispatcher put the held thing away and drew the tool before the controller
ran); "homes" (a hidden per-item memory the player had to track to predict
`remove`); `inventory` duplicating `query`'s display options. All three were
retired. *Gated by `lint:view-keys`*: every key a view, a subcommand, an arg
or an option may carry is pinned by name with what it does; a new key fails
until it is added in a reviewed change. Owner: *"the whole point of the command def is it's supposed to be
the one document that, if you get your head around it, you can predict
everything a command will do … if you're making help worse you're really
doing something wrong."*

### P10. Is new metadata a Document?
A vocabulary or table that nothing writes and that is read by name or path
is a **document** with a value class over it (`Placement` is the precedent),
never a new `Idea` class with rows. *Evidence:* `Form` shipped as a
`SingletonMixin(Idea)` with five rows, right after the documents build had
converted that pattern away. It cost a `lint:boundary-roles` rise and a
load-on-use workaround. *Gated by `lint:data-ideas`*: a census of the `Idea`
classes whose bodies are data only (fields, accessors, pure computation — no
hook, Api call, await or timer); a new one fails, and each one counted today
is a candidate for a document conversion.

### P11. Does any caller branch on what the destination is, to decide how to call a primitive?
`if (isX(dest)) dest.special(item) else Api.primitive(item, dest)` means the
primitive is incomplete. The destination decides, *inside* the primitive
(`arrivalFor` in `move`). A caller never needs a rolodex of interfaces to
stage a state. *Evidence:* the `isCarrying ? receive/directMove : move` port
idiom at ~70 sites, then again at 14; `lint:carry-moves` now holds it at 0.

### P12. Is this a new name for something an existing call already does?
No synonyms for a primitive (`deliver`, `receive*`, `directMove`,
`routeMove`). One call, and its behavior honestly decided by who owns it. If
the only difference is "it can refuse", that is not a new verb. *Evidence:*
four synonyms for `move` were proposed and withdrawn in one review.

### P13. Does the concept belong on the mixin whose doc says what it is?
Read the host mixin's header sentence. If the new members aren't about that
sentence, they go elsewhere. A census split (`lint:mixin-clusters`) is
evidence of two concepts in one mixin, not a ceiling to raise. *Evidence:*
geometry added to `Tangible` (*"made of materials"*), then moved to
`Containable`, where the clusters gate split it, and finally to
`ShapedMixin`. Also a 35-member `Carrying` that answered every adjacent
mixin's question.

### P14. Does it move, retarget or decide on its own, invisibly?
A primitive never lies (`move` to X ends in X, or every onward step is
itself a true move). Selection happens only among things that are truly
alike: ask when the choices differ in a way the world cares about. There
is no "main" or default unless the author can see the reason for it.
Delay is never a cost outside a budgeted clock (combat's beats). *Evidence:*
`move(item, body)` silently became `move(item, bag)`; "fridge then freezer"
as an invented main chamber; "closed is never a tier" erasing authored
closures.

---

## B — build

### B1. Did this wave add substrate the plan's ledger does not list?
If so, it is not a stop: fold it into what already does the job, or
re-plan the wave in place with a P1 line saying why it is genuinely new.
And re-check the host table whenever a wave adds a mixin.

### B2. Can every drive checkpoint fail?
Before trusting a green drive, make each checkpoint fail once on purpose. A
helper blind to a failure kind passes everything. *Evidence:* taps (15/15
false for three rounds), cleanliness (a prompt id read wrong for 19 runs),
climate (blind to a locomotion refusal), cover (a refused `eval` answered
ok), sugar (the glowcap hid a dark room).

### B3. Walk it in a browser — once, at code-complete, not first at /finalize
The wire drive proves the flow; the browser walk proves a person can use it.
It runs once, beside the blocking drive at code-complete — never per review
round — and /finalize verifies it ran.
The walk is `e2e/tests/<feature>-walk.spec.ts` (precedents: cordage, energy,
ground, paint). *Evidence:* the walk found what the wire drive missed in
eleven builds — maritime (*"swimming drowned you"*), river (8, walked only
when the owner asked at /finalize), ceramics (8), climate, cover, storage,
rubber, silk, sugar, cordage, underwater (*"we just wasted 4 hours"*).

### B4. Did a rename reach the content?
A renamed key, value or class is grepped across `packages/content` before
the wave commits; every recipe output that should compose `Crafted` does.
*Evidence:* ceramics (`fused` → `set` left 11 rows invalid), river
(`alternateNames` dead in 79 rows), paint (a mill output without `Crafted`).
