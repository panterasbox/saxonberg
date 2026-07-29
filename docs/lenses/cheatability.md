# Lens: Cheatability

> Part of the [design lenses](./README.md) set. Lens named from Jesse
> Schell's *A Book of Lenses*; questions paraphrased, analysis our own.
>
> **Fresh pass, entry 12 (2026-07-28), net-new** — fifth of the
> systems-first sequence, and the strangest fit in the catalog for
> this design: a world where **automation is a feature** has to draw
> the cheating line somewhere other than where every other
> multiplayer game draws it.
>
> **Layer interrogated: the platform's trust architecture**, with the
> education vertical's integrity question riding on it.

## The lens

Three questions: **can players cheat at my game — how? If players
can cheat, will anyone notice? Do players trust my game?**

> **From the book.** Cheating alone only cheats yourself; cheating
> among others is "a meaningful breach of social contract." Schell
> names two harms, and the second is the killer: loopholes create
> vigilance stress — players watching for cheaters instead of
> playing — but worse, "if players realize that cheating is
> possible, and they can't tell if other players are cheating or
> not, it makes the non-cheaters want to stop playing … who wants to
> lose to a cheater?" The damage isn't the cheat; it's the
> **doubt**.[^aogd-ch]

## Why our design prompts it

Because the standard anti-cheat line — "no bots, no automation" —
is unavailable on principle: the scripting engine is a celebrated
surface, demonstration capture converts play into programs, and the
long-game thesis says the human interface *is* the AI interface.
Meanwhile the education vertical raises the stakes on integrity
past any game's: a credential seam that can be cheated isn't a
broken game, it's a broken *pedagogical claim*. The line has to be
drawn, formally, somewhere else.

## What the design answers

### The line: forge nothing — automation may act, records may not lie

The doctrine, extracted from what the built systems already
enforce:

> **You may automate your deeds; you may not forge your receipts.**
> Cheating is *falsifying provenance* — making the world's record
> claim something that didn't happen: spoofed identity,
> manufactured evidence, broken conservation, misrepresented
> mechanics. Automation, shared knowledge, and clever emergent
> exploits are play (the griefing entry's discriminator handles the
> harmful subset).

### "Can players cheat?" — the structural answers

- **Server-authoritative everything** — nothing is pure client; the
  model is the server's, so the whole client-side cheat family
  (seeing through fog, editing state, speed) is void in principle.
- **The call-security layer** — even in-process, gated APIs and
  participant contracts mean capability flows through policy;
  content authors can't name executable classes (the code-trust
  lockdown), so cheating-by-authoring is fenced at the chokepoint
  where content enters.
- **Conservation and title** — money exists only via the sealed
  mint; ownership lives in registries content edits can't touch;
  standings derive from evidence ledgers with dedup. The classic
  MMO cheats (dupes, spoofed trades, edited stats) each collide
  with a structural invariant rather than a detection heuristic.
- **The residue** — Sybil identities (cheap guests, multi-accounts
  vs. per-character influence banking) and evidence-stream gaming
  (scripted grinding of transcripts). The first is the known
  frontier (shared with griefing's guest-ceiling audit); the second
  is where the automation question actually lives, below.

### The scripted-competence question — and the vertical's clean answer

If your script tends bar all night, your character *did* practice —
is the resulting band cheated? The two-learners problem, wearing a
bot costume. The design's layered answer:

- The **floor tolerates it**: low-difficulty repetition stops
  teaching (ZPD difficulty-gating), buckets dedup, quality splits
  from quantity — scripted grinding yields diminishing evidence by
  the estimator's own honest math, not by a bot-detector.
- The **ceiling refuses it by construction**: deed-tier credit
  requires what a script cannot supply — externally verified
  assessment (the credential seam) or witnessed live performance
  against another mind (deterministic combat, judged in real
  time). **The education vertical's integrity story is that its
  anti-cheat is the assessment itself** — the game never had to
  solve proctoring, because it consumes credentials from
  institutions whose whole product is exactly that.

### "Will anyone notice?" — the receipts answer

This is the design's strongest suit, and it inverts Schell's doubt
problem. Because everything of consequence is an append-only ledger
(title, provenance, accountability, transcripts, bank legs) and
every standing derives on read, cheating is either structurally
impossible or **leaves receipts**. A disputed fortune has a ledger;
a disputed fight is deterministic and re-derivable; a disputed
item's nature is one `analyze` away. Suspicion is *answerable* —
"audit me" is a sentence a player can say and mean. Most games
fight doubt with detection they can't show; this one can show its
work.

### "Do players trust my game?" — trust is the product

The honesty discipline is usually justified pedagogically; this
lens reveals it as the trust architecture too. No hidden rolls,
analyze-preview parity (the preview *is* the outcome), no fudge
anywhere — the same properties that make the world teachable make
it un-doubtable. A game that lies about physics can't teach; a
game that can't be trusted can't hold a community. They were the
same claim all along.

## Tensions & risks

- **Receipts require readers.** "Audit me" works when someone can
  adjudicate; until courts land, the receipts deter the honest and
  merely document the shameless — same interim gap the griefing
  entry names, same eventual consumer.
- **Legal automation still shifts social texture.** A bar where
  half the regulars are scripts is uncheated and yet different;
  norms (and maybe disclosure conventions — is a script-driven
  character marked?) are polity questions the formal line doesn't
  settle. Deliberately unresolved; belongs to the community that
  the accretion thesis is counting on.
- **The Sybil frontier is this lens's open flank** — every
  per-identity guard (influence banking, quotas, guest ceilings)
  is only as strong as identity cost. Known, named, recurring
  across three entries now; deserves its own design pass rather
  than another mention.
- **External-credential trust is imported, not derived.** The
  deed tier inherits the issuer's integrity (identity-verified
  open-book vs. proctored matters — hence graded provenance). Our
  receipts can prove *a credential arrived*; they cannot prove the
  human earned it. Honest framing: the vertical's floor is
  uncheatable by us; its ceiling is as honest as its issuer.

## Implications

1. **The forge-nothing doctrine is the anti-cheat policy** —
   publish beside the griefing predicate: falsified provenance =
   cheating; automation, spoilers, and clever exploits = play. The
   pair gives the polity a complete, derivable misconduct
   vocabulary (harm without consent / records made to lie).
2. **Slate checklist, eleventh question:** *can your system's
   records be made to lie — and if a script plays it, what
   accrues?* Every new ledger consumer answers both halves at
   design time.
3. **Keep the ceiling's anti-cheat where it lives** — deed-tier
   credit stays gated on script-resistant evidence (external
   verification, live judged performance). Any proposal to mint
   deeds from unwitnessed solo play argues against this entry.
4. **Surface the receipts.** The trust story only beats doubt if
   players can *see* it — the audit-me affordance (a public
   provenance view for a fortune, a fight, an item) is cheap,
   distinctive, and turns the ledger architecture into felt
   fairness. Candidate video moment, incidentally: "in this world,
   suspicion is answerable."
5. **Script-disclosure norms go to the polity, on purpose** —
   record it as an open governance question (not a technical one),
   with the lens's warning attached: what players can't tell, they
   will doubt.

---

[^aogd-ch]: Jesse Schell, *The Art of Game Design: A Book of
    Lenses*, 3rd ed. (CRC Press, 2020) — **Lens #95½, the Lens of
    Cheatability** (a third-edition half-lens), from the
    communities chapter (read from the author's Google Play
    edition, 2026-07). The three questions, the social-contract
    framing, and the doubt-drives-out-the-honest observation are
    Schell's; all analysis ours.
