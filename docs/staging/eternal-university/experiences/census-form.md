# Experience — the census form (§13; the thematic centerpiece)

> **Status:** staging design (focused pass, 2026-06-27). The arc's **thematic
> centerpiece** — the §13 census form, promoted out of its stub in
> [registrar.md](./registrar.md) to its own pass.
> **Kind:** a *scene* + a reusable *mechanic* (the authorable-allegory template)
> + the investigation's **literacy primer**.
> **Placement:** straddles the geography — the player's *own* counting happens
> early (the campus enrollment on-ramp; §6 arriving = being counted); the count
> is *investigated* at the city Registrar (the victim-category at the counter,
> §15.2). See [registrar.md](./registrar.md).
> **The one-line thesis:** the only scene where the game's central question —
> *who counts as a person?* — is **performed on the player**, not narrated.
> **Retire when:** cemented as the `CensusForm` template/mechanic + the EU's
> shipped category set, in YAML/content.

---

## The effect (what this pass changes)

Three deltas, the first the important one:

- **KNOWLEDGE / literacy — you learn to *read the count*.** The **decoder**
  delta. By filling out a clean form yourself, you learn what a clean filing
  *looks like* — the only reason the cooked filings, phantoms, and holes become
  legible later. The census form is the **Rosetta stone for the records track**:
  the morgue certificate and the registrar ledger are unreadable until you've
  been processed once. This is the §3 *teaching* beat — the investigation's
  literacy, taught by doing.
- **STANDING / world — you become *counted*.** Your character lands on the rolls
  with an **enumeration date** (the roll-clock) — the personhood/enfranchisement
  anchor (the hook into the cooperative polity: counted = you get a say). §6
  newcomer → on-the-rolls.
- **CASE — the gaps are the bodies.** You learn, viscerally, that **the form's
  missing boxes are the kill-list's recruiting ground** (§15.2). The victims
  live in the exclusions.

## The experience (the story)

You fill a form to become real. It asks you to put yourself in boxes — and the
boxes are the whole game. Most lines you breeze. Then you hit one that doesn't
fit you, or fits you *twice*, or has no option for what you are — and you feel
the system deciding, in real time, whether *you* count. You file it; a clerk
stamps you onto the rolls; the roll-clock starts. Only much later — reading the
cooked ledger — do you realize the mundane intake form you shrugged through is
the exact instrument the murders run on. **The form you filled to enter the
world is the murderer's tool.**

## The axis: counted by *contribution* (A) — the dark mirror

The form measures **what you contribute**, not who you are. And this is not a
borrowed dystopia — it is **the world's own civic logic with the floor removed.**
The cooperative enfranchises by engagement; the influence stocks are literally
*make / play / fund* (producer / consumer / patron — see
[influence.md](../../../subsystems/influence.md)), and your *say* is
engagement × renown. **The census measures exactly what the legislature
measures.** That's the most damning allegory there is: not an evil system out
there, but *our own operating principle, one inversion away from monstrous.*

The inversion is the thesis in one move:

> The cooperative makes engagement **additive and opt-in** — *more
> participation → more voice.*
> The census makes the same engagement **the floor of personhood** — *no
> participation → no person.*

Same axis. One is a ladder you climb for standing; the other is a trapdoor you
fall through into non-existence. The murders live in the trapdoor.

### The form's recognized modes (the three stocks)

Personhood = **clearing an engagement floor in at least one mode** — the box the
form is really checking, dressed as occupation lines:

- **Labor** (the *make* stock — producer): you count if you work.
- **Play** (the *play* stock — consumer): you count if you participate, you're
  present, you engage.
- **Fund** (the *patron* stock): you count if you pay in.

The three-stock mirror is complete: the census categories *are* the influence
stocks, reframed as the **floor of personhood** instead of the **ladder of
standing.**

## Who falls through (the victims, by failure mode)

- **Uncounted** (no box) — contributes in *none* of the recognized modes: can't
  labor, can't play, can't pay. The incapacitated, the withdrawn, the destitute.
  **The §15.2 uncountable — the victim pool.** A body that engaged with nothing
  is a body no one reconciles.
- **Miscounted** (wrong box) — real contribution the form *doesn't recognize*:
  the caretaker whose labor is unlogged, work that doesn't register as
  "engagement." Counted, but undervalued, mis-tiered — alive, diminished.
- **Over-counted** (too many boxes) — engages in multiple modes, gets
  *double-weighted*: the engaged elite, more-person-than-person. (And the
  phantoms: fabricated engagement clearing a floor for someone never there.)

## The mechanism (the documentation substrate + the roll-clock)

Underneath the contribution surface, the form **operates by anchoring your
contribution to certified records** (§8 — labor logged, play logged, payments
logged; physical, manipulable, because the aether can't vouch). So the fraud is
**contribution-record manipulation**: erase someone's logged engagement and they
drop below the floor — *un-personed by deletion*; forge engagement and a phantom
clears it. The murders **zero out the contribution** and let the form do the
rest.

And the roll-clock has teeth, because **engagement decays** — which is *already*
how the participation substrate works (real-time decay, precisely because
"participation measures a human showing up" — see
[participation.md](../../../subsystems/participation.md)). So
personhood-by-contribution is **perishable**: stop engaging and you drift toward
the floor on your own. The murders don't invent the fade — they **accelerate a
fade the system already builds in.** Personhood you must keep re-earning or you
quietly cease to count.

## The closer — it implicates the player

The player is an engager (they play; maybe make; maybe fund), so they **clear
the floor easily.** The form doesn't threaten the player — it **flatters** them:
*you count, you're engaged, you're real.* The horror isn't fear for yourself. It
is realizing, as the investigation drags you below the floor to meet the
uncounted, that **the comfortable flattery and the erasure are the same
sentence** — that the logic enfranchising *you* is the logic erasing *them.* The
player is never this form's victim. They are its beneficiary. That is worse.

## System vs. scene (the authorable-allegory template)

Two things at once:

- **The mechanic** — a `CensusForm` whose **recognized-contribution schema is
  authorable content** (plugging into the document-tree work — see
  [document-tree-slate.md](../../../slates/builds/document-tree-slate.md)). The
  EU arc ships *this* category set (labor/play/fund, the three-stock mirror);
  other authors ship their own surface allegory over the same machinery.
- **The scene** — the EU arc's particular instance: the player's counting + the
  records investigation.

## The onboarding rhyme (§6)

"Arriving = being counted" means the player's *first* brush with this form can be
the **arrival/intake beat itself** — breezed through as char-gen-adjacent setup,
then re-encountered as the thesis. The mundane form you filled to get *in* is
revealed to be the personhood machine. (Flag the hook to onboarding/char-gen's
`enroll` draft state machine — itself a field-keyed intake form — but don't weld
them yet.)

## The fraud-hook — witnessing the uncountable (§15.2)

At the counter, the census **spawns the victim-category** — the person the form
can't process, administered into or out of existence in front of you. The most
loaded thing the player sees, and it needs **no carve** (spawned, negative-space).

## Cross-references

- Bible: [§13](../../../slates/builds/eternal-university-narrative-slate.md) (the
  census form), §6 (the census spine / arriving = counted), §8 (the physical
  anchor; identity-blind aether), §15.2 (the uncountable / victim category),
  §11/§15.1 (the banal handler / no villain at the desk), §3 (first-quest
  teaching).
- Experience: [registrar.md](./registrar.md) (the records track this primes; the
  §13 stub this promotes), [the-morgue.md](./the-morgue.md) (the matched bureau).
- Engine: [influence.md](../../../subsystems/influence.md) (the three stocks the
  form mirrors), [participation.md](../../../subsystems/participation.md) (the
  real-time engagement decay = the roll-clock fade),
  [belief.md](../../../subsystems/belief.md) (the lived-exhaust anchor half).
- Slate: [document-tree-slate.md](../../../slates/builds/document-tree-slate.md)
  (the authorable form-as-document substrate).

## Open questions / dials

1. **The contribution tiers** — does the form *rank* contribution (more
   engagement = higher-counted, mirroring standing bands) or just gate the
   personhood floor (counted / not)? *(Lean: both — a floor for personhood + a
   tier for standing, the full dark mirror.)*
2. **How much the player fills vs. witnesses** — does the player's own counting
   land at onboarding (felt, breezed) and the *investigation* of others' counting
   land at the Registrar — or do both happen in-scene? *(Lean: split — onboarding
   primes, Registrar investigates.)*
3. **The roll-clock fade as real mechanic vs. fiction-only** — the engine decays
   participation for real; do un-engaged *player* characters actually drift on the
   rolls, or is the fade strictly the NPC/fiction allegory? *(Lean: fiction for
   the allegory; never de-person a real player.)*
4. **Fund mode's weight** — pay-to-count is the sharpest line; how prominent is
   it vs. labor/play? *(Confirmed in: include it; tune the emphasis.)*
