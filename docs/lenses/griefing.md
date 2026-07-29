# Lens: Griefing

> Part of the [design lenses](./README.md) set. Lens named from Jesse
> Schell's *A Book of Lenses*; questions paraphrased, analysis our own.
>
> **Fresh pass, entry 10 (2026-07-28), net-new** — third of the
> systems-first sequence. Run against the built anti-grief machinery
> (leases, quotas, consent, accountability) and, more importantly,
> against what hasn't been audited.
>
> **Layer interrogated: both** — the guards are platform substrate;
> the social consequences are the game's polity.

## The lens

Three questions: **what systems in my game are easy to grief? How can
I make my game boring to grief? Am I ignoring any loopholes?**

> **From the book.** The governing insight: **griefing is a game the
> griefer is playing**, so the deepest counter is to make that game
> no fun. The exemplar is the obscenity filter that gives no
> feedback — the griefer sees their own message normally while
> everyone else gets the filtered version; beatable, "but it is much
> more work and much less fun." The taxonomy Schell walks:
> misrepresented **trades** (total information kills the scam);
> **obscenities** (filters become a game themselves — pattern-minds
> beat machines); **blocking the way** (Toontown let players push
> blockers aside — and griefers promptly pushed *abandoned avatars*
> into battles); and **loopholes**, "possibly the griefer's greatest
> joy" — disconnect to deny a kill, crash the server by jumping in a
> corner, furniture arranged into obscene words, stolen resources.
> "You must be ever mindful … careful to remove them whenever they
> turn up."[^aogd-gr]

## Why our design prompts it

Because the design has built serious anti-grief machinery without
ever running this lens across the whole surface — and because a
persistent world with real property, real money, and a real polity
raises the stakes of every hole: grief here doesn't reset at the
next match.

## What the design answers

### The design has a formal griefing predicate

Most games define griefing in their terms of service. This one
defines it **in the model**: the accountability ledger's blame
derivation — *non-consented harm to a sentient* — is a
machine-checkable griefing definition, derived on read from append-
only rows, producer-written at every harm seam (combat's three
writers, the trap's spring, the imposed-terms marker). The consent
architecture (combat terms handshake, opt-in employment, leases
signed) makes "did they agree to these stakes?" a stored fact, not a
moderator's guess. Courts and bounties are deferred, but the
evidentiary substrate for them ships already. That is this lens's
first question answered at the constitution layer: what's easy to
grief is at least *impossible to grief invisibly*.

### The standing guards, mapped to Schell's taxonomy

- **Resource griefing** → the governing rule already in force:
  exclusive resource → **lease** (attendant points, idle eviction,
  instant linkdead release), common pool → **quota** (till
  withdrawals, consignment listing caps). 
- **Trades** → `analyze` is total information about what a thing
  *is*; maker's marks, chattel title, and provenance are unspoofable
  identity about where it came from. What remains tradeable-unfairly
  is deliberate: the world contains disguise, concealment, and
  unidentified items *as content* — deception inside the fiction is
  play, governed by reputation and the ledger, not prevented. The
  line is consent and stakes, and it needs newbie-side care (below).
- **Blocking the way** → structurally mostly moot (bag-of-stuff
  rooms don't collide) — but not audited: sealable vessels, cart
  placement, doorway fixtures, and lockable doors on public paths
  are all obstruction surfaces nobody has tried to abuse yet.
- **Obscenities** → no filter exists yet; when one is wanted,
  Schell's feedback-denial trick is architecturally *free* here —
  the per-viewer message pipeline (Scenes composed per recipient)
  is exactly the machinery for sender-sees-it-others-don't.
- **Loopholes** → the known classes have owners: disconnect-abuse
  (combat's linkdead handling, presence freezes, leases releasing),
  resource-exhaustion (the script engine shipped *with* authorship-
  tiered ceilings and preemption — the crash-corner defense built
  in advance), public-space vandalism (dorm theming is a prose-only
  allowlist; public personalization barely exists yet — keep it
  allowlisted when it comes).

### "Boring to grief" — the design's natural style

Several shipped choices already deny the griefer their audience and
their scoreboard: reaction fan-out collapses at volume (spam
becomes a counter, not a wall of lines), participation credit
dedups (AFK/spam acts earn nothing), presence relays rate-limit,
and there are **no leaderboards** — nowhere for grief-fame to
accrue. The general principle worth keeping: the griefer's game
needs feedback and an audience; this design's per-viewer rendering
and aggregate-collapse seams can quietly starve both without ever
announcing a punishment.

### The two unguarded doors this lens finds

1. **The linkdead body.** Toontown's abandoned-avatar prank, aimed
   here: what exactly can be done *to* a disconnected character?
   Presence freezes protect their metabolism — but can they be
   dragged, looted, trapped-around, hauled into a hostile parcel,
   pushed into the brine pool? Nobody has enumerated it. The
   accountability ledger would *record* the harm, but recording is
   not preventing, and "log in dead in a canal" is the kind of
   story that ends a newcomer's tenure.
2. **The anonymous guest.** Guest avatars persist nothing and cost
   nothing to mint — which is precisely the identity-shaped hole in
   a deterrence model built on durable identity, reputation, and
   ledgers. A griefer who can always be a fresh guest is immune to
   every social consequence the design relies on. Guest capability
   needs a deliberate ceiling (no property, no trades, no trap
   kits, rate-limited speech — whatever the audit decides), and the
   Sybil frontier (cheap identities) should be treated as the same
   problem wearing a different mask.

## Tensions & risks

- **Recording ≠ preventing.** The ledger-and-courts model is
  principled (mirror-thesis: crime exists, justice is content) but
  courts are deferred — until they land, consequence is reputation
  only, and reputation doesn't deter the guest or the sociopath.
  Interim teeth (parcel bans? credential freezes?) may be needed
  before the full judiciary.
- **Deception-as-content blurs the report surface.** When disguise
  and scams are legitimate play, "I was griefed" and "I was
  outplayed" separate only by consent and stakes — which the model
  does track, but players won't read ledgers. The social surface
  (what a report shows, what a moderator sees) has to translate
  the formal predicate honestly.
- **The polity itself is griefable.** Conviction stakes, forum
  organizers, office assignment, group membership — governance
  mechanisms are game systems too, and this lens applies to them
  recursively (ballot-spam, quorum games, wash-conviction). The
  economy entry's collusion audit and this lens's loophole sweep
  are the same work order.
- **Loophole removal vs. emergence.** "Remove loopholes whenever
  they turn up" collides with a design that prizes unanticipated
  interactions. The discriminator is the formal predicate: an
  exploit that imposes non-consented harm or breaks conservation is
  a loophole; a clever unanticipated use that doesn't is emergence
  working. Write that down wherever exploits get adjudicated.

## Implications

1. **Run the two audits this entry names:** the linkdead-body
   enumeration (every verb that can target a disconnected
   character, with a decision each) and the guest-ceiling
   definition. Both are bounded, high-yield, and pre-playtest.
2. **The griefing predicate is the adjudication rule** — publish it
   in the polity docs: non-consented harm / conservation break /
   title violation = exploit; everything else clever is play. This
   keeps loophole-removal from strangling emergence.
3. **Feedback-denial is the house style for nuisance counters** —
   per-viewer rendering makes it nearly free; prefer starving the
   griefer's game (no feedback, no audience, no scoreboard) over
   visible punishment, which is itself feedback.
4. **Slate checklist, ninth question:** *what does your system look
   like to someone playing it to hurt people — what's the grief
   move, and is it boring?* Every system with a public surface or a
   shared resource answers at design time.
5. **Treat governance surfaces as griefable game systems** — every
   polity mechanism (votes, boards, offices, groups) gets the same
   ninth-question treatment; the courts build, when it comes,
   should consume the formal predicate directly.

---

[^aogd-gr]: Jesse Schell, *The Art of Game Design: A Book of
    Lenses*, 3rd ed. (CRC Press, 2020) — **Lens #99, the Lens of
    Griefing**, from the communities chapter (read from the author's
    Google Play edition, 2026-07). The three questions, the
    griefing-is-a-game insight, the feedback-denial filter
    technique, and the trades / obscenities / blocking (Toontown) /
    loopholes taxonomy are Schell's; all analysis ours.
