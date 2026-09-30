# Salvage from the retired lens deck

> **What this is.** `docs/lenses/` held 29 applied analyses written
> between 2026-06-09 and 2026-09-23 against Jesse Schell's lens deck.
> They were **retired 2026-09-29** and the directory restarted. This
> doc is everything in them judged worth carrying forward, in one
> place.
>
> ⚠ **These are claims, not law.** Some were explicitly ratified and
> say so. The rest were one analyst's implications, written at a
> moment, and are recorded here so they can be *decided on* rather than
> lost. Nothing here is project doctrine merely by appearing here.
>
> **The originals are in git history** — `git log --diff-filter=D --
> docs/lenses/` finds the deletion commit; `git show <sha>^:docs/lenses/<file>`
> reads any of them whole.

## Why they were retired

Not because they were wrong. **Because they were written against
content, and the content moved.** Eleven of the 29 landed in a single
sitting on 2026-07-28 and were never touched again; six more date from
June. Since that July batch the tree has taken **1,161 commits to
`docs/subsystems` and `docs/slates`**, and `docs/subsystems` has grown
from **120 files to 151** — roughly a fifth of the subsystems those
entries would need to discuss did not exist when they were written.

⭐ **The lesson for whatever replaces them:** an entry anchored to
*this month's content* rots in a quarter. An entry anchored to **which
of the seven lenses it sharpens, and what it demands of any design**
survives, because [design-lenses.md](./design-lenses.md) is now the
stable thing.

---

## 1 · The slate checklist — assembled here for the first time

⭐⭐ **This is the most valuable thing in the deck and it existed
nowhere whole.** Nine entries each added "a question to the slate
checklist," numbered, and no file ever collected them. Recovered:

| # | The question | Came from |
|---|---|---|
| 4 | Where do this system's motivations sit on **internal/external × wanna/hafta**? | Motivation (#23) |
| 5 | Does each value-bearing element declare **pure-play · effort-anchored · conserved-economic**? | Endogenous Value (#7) |
| 6 | **Which term do you multiply** — subjects, verbs, objects, goal-paths — and **whose constraints do your side effects change**? | Emergence (#30) |
| 7 | Does your system **move value across the fungibility line**? | Economy (#52) |
| 8 | **Where does uncertainty come from** — hidden minds, world state, or dice? | Skill vs. Chance (#41) |
| 9 | What does your system look like **to someone playing it to hurt people** — what is the grief move, and is it boring? | Griefing (#99) |
| 10 | **What story does your system leave behind** — what is recorded, who can retell it, who will care? | Story Machine (#73) |
| 11 | **Can your system's records be made to lie** — and if a script plays it, what accrues? | Cheatability (#95½) |
| 12 | **Whose wish does this serve** — who fantasizes about being the person your system lets them be? | Fantasy (#83) |

⚠ **Questions 1–3 are not recoverable from the surviving text** — no
entry numbered them and no file listed the set. Either they were never
written or they lived in a draft that did not land.

Three more were proposed without numbers:

- **The curiosity audit** — *what question does this put in the
  player's mind, and can they investigate it with shipped handles?*
- **The Wii Sports question** — *name the essence this fidelity spend
  serves; if it is a ninth inning, defer it.*
- **The inspiration line** — *what is this subsystem's non-game
  inspiration, in one line?* A slate that cannot answer is copying
  other games.

⭐ Several of these have since been absorbed by the rubric — 8 is
lens 1's uncertainty instrument, 7 and 5 are lens 6's, 9 is lens 7's
load test. **6, 10, 11 and 12 have no home in the seven lenses** and
are the ones worth deciding about.

---

## 2 · The two essence sentences — ratified, and the only ratified thing here

**The platform's essence** (four clauses ratified 2026-06-09, fifth
added 2026-07-28):

> **Real effort, recognized — your doing is seen, what you become is
> earned, what you make persists, you do it among others who remember
> you, and the world itself honors what you understand.**

**The game's essence** (ratified 2026-06-09):

> **Learning as adventure — you grow into who you become by mastering
> a field, in a university world that makes that growth feel like a
> story worth being in.**

⭐ The 2026-07 re-test found every clause had become literal machinery
rather than aspiration — *doing is seen* is the witness loop plus the
accountability and provenance ledgers; *what you make persists* stopped
being about dorm rooms and became property law. The fifth clause is the
honesty discipline felt as play, and it is the one that constrains any
future vertical: **a vertical whose models are not honest can ride the
first four clauses and gets a lesser product.**

---

## 3 · Claims worth keeping

### ⭐⭐⭐ The NetHack accretion thesis

The most substantial original idea in the deck, and it is a direct
statement of **lens 2**:

> NetHack is what it is because years of different developers each
> coded one unique experience into it — "the DevTeam thinks of
> everything" is accreted human ingenuity, not a content budget.
> Dissolving the player/maker line aims at the same accretion over
> much shorter timespans, **but by a different method, because our
> discipline forbids NetHack's** (hand-coded pairwise special cases).
>
> The honest models are the base chemistry set. The community adds
> **nouns** — items, materials, rooms, brains, scripts, recipes — and
> the physics supplies the **verbs** for free: a player-authored brass
> lantern participates in fire, shock, thermal mass and wetness
> without its author writing any of it.
>
> ⭐⭐ **NetHack accreted *rules*; we accrete *content over fixed
> honest rules*** — so contributions compose instead of colliding.

Its corollary, also worth keeping: **prefer nouns to verbs when growing
the game.** A new capability-speaking noun multiplies the whole verb
set; a new verb must earn its interactions one at a time.

### Doctrines, one line each

- ⭐ **Fungibility follows legitimacy.** Any proposal to make a
  standing purchasable, or to mint a second fungible currency, argues
  against this first. *(Economy)*
- ⭐ **Strangeness is a finish, never a function.** Stated for the first
  campus; proposed as a standing authoring law for all world content,
  especially UGC, so the identity survives many authors. *(Unification ·
  The World)*
- ⭐⭐ **The balance-by-honesty ladder.** Trade-offs from physics first,
  gym-style measurement second, priced-in-economy third, tuning dials
  last — and **never a dishonest nerf.** A dominant strategy that
  survives all four is reality teaching something: document it, do not
  fudge it. *(Emergence)*
- ⭐⭐ **The griefing predicate.** Non-consented harm · conservation
  break · title violation = exploit. Everything else clever is play.
  Stated so loophole-removal cannot strangle emergence, and so the
  polity has a derivable misconduct vocabulary. *(Griefing ·
  Cheatability)*
- ⭐ **Feedback-denial is the house style for nuisance counters.**
  Per-viewer rendering makes it nearly free; starve the griefer's game
  rather than punish visibly, because visible punishment is itself
  feedback. *(Griefing — and it is Schell's own technique.)*
- ⭐ **Spend presentation moves in rendering, never in the model.** The
  standing answer whenever essence and honesty conflict. *(Essential
  Experience)*
- ⭐ **"Become, don't begin-as."** A deliberate inversion of the
  idealized avatar, and right for a learning game — but the early
  attachment a humble start gives up has to be repaid. *(The Avatar)*
- ⭐ **Reality-as-taught is the inspiration library**; curricula are
  content roadmaps. The "you can copy the moves, you can't copy the
  inspiration" argument. *(Infinite Inspiration)*
- ⭐ **Narration adapters are a category**: state → arc → per-viewer
  beats, one per dramatic domain as it earns one. The combat pattern,
  generalized — the storm passing, the shop's big day, election night.
  *(Story Machine · Moments · Interest Curve)*
- ⭐ **Emergence ships with narration.** Any new cross-channel side
  effect needs its perceivable trace — the scene line, the hint, the
  `analyze` row — in the same build, or the depth reads as dice.
  *(Emergence)*
- ⭐ **The learnability gradient is transparency infrastructure**, not
  an onboarding nicety: command-echo and form-to-CLI graduation are
  *how* a CLI becomes transparent. *(Transparency)*
- ⭐ **Hold the card budget.** Each cockpit card must make the world
  more present than its absence would; the inspection card's job is to
  remove queries you would otherwise type, not to add a thing to watch.
  *(Transparency)*

---

## 4 · Open asks the deck recorded that are still open

These were named as work and, as far as this salvage can tell, never
scheduled. Recorded so they can be scheduled or dismissed on purpose.

- ⭐⭐ **The theme-orphan audit.** Find subsystems that are honest and
  built but have **no content using them and no felt experience pulling
  for them.** The entry named celestial mechanics and radioactive decay
  as the obvious candidates to check. *(Unification)*
- ⭐⭐ **The economy gym** — a headless agent-based earn/spend
  simulation, on the combat-gym precedent, hunting earn-path dominance,
  inflation trajectories and collusion holes before live players do.
  *(Economy)*
- **The collusion audit** — *can players pool funds to exploit holes?*
  — applied to quotas, consignment, tips, transfers and the influence
  stocks, with the Sybil frontier treated as an economy problem.
  *(Economy)*
- ⚠ **The RMT posture.** The property and conservation machinery makes
  real-money overflow likely *if the game succeeds*. Decide the stance
  — prohibit, channel, embrace — **before player wealth exists.**
  *(Endogenous Value)*
- ⚠⚠ **The engagement-vs-outcome tiebreaker, in writing.** A live
  service will meet features that lift engagement without lifting
  learning. Commit that outcomes win, or admit honestly that they do
  not; either is better than letting the metric decide by default.
  *(Transformation — folding in Schell's unnumbered final lens.)*
- **The linkdead-body enumeration** — every verb that can target a
  disconnected character, with a decision each. *(Griefing; overlaps
  the absent-body doctrine.)*
- **Channel-invariant property tests** as the emergence test strategy —
  conservation, band monotonicity, no-silent-state — because
  enumerating the verb × object product is hopeless. *(Emergence)*
- ⚠ **Moderation as a design track, because of minors.** Reporting,
  blocking and abuse response were flagged as not-yet-designed and a
  *prerequisite* for a student community, not a later addition.
  *(Community · Transformation)*

---

## Related

- [design-lenses.md](./design-lenses.md) — the seven lenses, the live rubric.
- [lenses/README.md](./lenses/README.md) — the restarted deck.
- [design-lenses-revision-proposal.md](./design-lenses-revision-proposal.md)
  — the 2026-09-28 audit that occasioned the restart.
