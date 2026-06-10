# Lens: Feedback

> Part of the [design lenses](./README.md) set. Lens/concept named from
> Jesse Schell's *A Book of Lenses*; questions paraphrased, analysis our
> own.
>
> **Layer interrogated: the platform** (the response substrate).

## The lens

The player acts; the game must answer. Feedback is how the player learns
what happened, whether it worked, what changed in the world, and what
they can do next. Good feedback is immediate, clear, and proportioned —
big events feel big. Its excessive cousin, *juiciness*, is feedback so
abundant and satisfying that interacting is a pleasure in itself. The
questions: after every action, does the player know what happened? Is
the feedback timely, legible, and proportionate? And does it ever feel
*good*, not just informative?

> **From the book.** Schell ties feedback tightly to judgment and
> control: feedback tells players how they're doing and what the world
> is doing back, and a game starved of it feels dead no matter how good
> its rules. He also champions "juiciness" — lavish, responsive feedback
> that makes even trivial actions feel alive — as a cheap, huge win for
> how a game *feels*.[^aogd-fb]

## Why our design prompts it

Because the project built an entire substrate for exactly this. Every
command produces a `DispatchResponseEnvelope`
([response-envelope.md](../subsystems/response-envelope.md)) alongside
the rendered scene, and the prose half carries a hard guarantee from
[interaction-philosophy.md](../interaction-philosophy.md): every event
must carry a **failsafe string** — "whatever rich payload the server
also sends, the player can always read what happened." Feedback isn't an
afterthought here; it's a wire-level invariant. The lens checks whether
that machinery delivers feedback that's not just *present* but *legible*
and, where it matters, *satisfying*.

## What the design answers

- **Structured, guaranteed feedback per action.** The response envelope
  carries up to 16 `Note` kinds plus an auto-escalating `Status`, an
  input-echo frame, and a `prompt-refresh`
  ([response-envelope.md](../subsystems/response-envelope.md)).
  Controllers signal outcomes through `Scene.send` + `ctx.note` — every
  command resolves to explicit feedback, not silence.
- **The failsafe string.** The player can *always* read what happened,
  regardless of what richer payload rode along
  ([messaging.md](../subsystems/messaging.md)). Feedback degrades
  gracefully to plain text — the floor is never "nothing happened."
- **Perspective-correct feedback.** The Scene composer routes per
  sensor, so what you're told reflects what *you* could perceive — the
  feedback is honest to your vantage, not a global broadcast.
- **Live world-state feedback.** MQL subscriptions and the inspection
  pane ([inspection-pane.md](../subsystems/inspection-pane.md)) update
  the cockpit as the world changes — feedback that doesn't wait for you
  to ask.
- **Interactive loops.** The prompt substrate
  ([prompt.md](../subsystems/prompt.md)) closes the loop where an action
  needs a response, with validation and retry.

## Tensions & risks

- **Feedback competes with the world for one channel.** In a text game,
  feedback and world-description share the scrollback. Too much feedback
  is a noise wall that buries the signal — the failure mode is the
  inverse of silence. The topic system and sensory tagging
  ([messaging.md](../subsystems/messaging.md)) plus console filtering
  are the management tools, but legibility-under-load is a real,
  ongoing risk, not a solved one.
- **Juiciness is text's weak spot.** Schell's "make trivial actions feel
  alive" is hard when your medium is sentences — text feedback is
  strong on *information*, weak on *visceral satisfaction*. The
  client-rendered reaction bursts
  ([reactions](../slates/reactions-slate.md)) are the closest the design
  gets to juice; most feedback will be informational, and the game may
  under-deliver on *feel* unless that's deliberately invested in.
- **Failure feedback can break immersion.** A controller-rejected note
  that reads like a parser error ("invalid argument") is feedback that
  yanks the player out of the world. The `Scene.send` + `ctx.note`
  pattern is the seam where failure is communicated; whether it reads
  diegetically is an authoring choice, easily defaulted to system-speak.

## Implications

1. **The substrate is strong; the open problem is legibility under
   load.** Invest in topic filtering and sensory tagging as
   feedback-signal management, not just message routing — a great
   feedback system that produces a noise wall has failed the lens.
2. **Decide deliberately how much juice the game wants.** Text is
   informational by default; if "feel" matters (and for retention it
   often does), the reaction-burst / client-rendered-effect path is
   where to spend. Otherwise, accept informational-over-visceral as a
   conscious medium tradeoff, not an accident.
3. **Author failure feedback in-world voice.** Make diegetic,
   actionable rejection messages the default for the controller-rejected
   path — "the door won't budge; it's barred from the other side," not
   "precondition failed." The seam exists; the discipline is using it.
4. **Lean on unbidden feedback (the inspection pane, ambient sensory
   frames)** so the player learns what changed without having to
   interrogate the world — feedback that arrives is better than feedback
   you have to request.

---

[^aogd-fb]: Jesse Schell, *The Art of Game Design: A Book of Lenses*
    (CRC Press) — Schell's treatment of feedback and "juiciness," from
    his material on interface and on judging the player's experience. I
    can't confirm "Feedback" is a single separately-named lens in the
    book; this entry cites the concept as Schell develops it. Page
    numbers omitted (edition-dependent).
