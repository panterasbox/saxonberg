# Expressive acts slate — what an emote means, who saw it, and whether they agreed

> **Status: UNBUILT** — designed at high level 2026-10-21 with the owner. What ships:
> emotes as diegetic acts over the aether's ESP carrier, an authored grammar with a free
> custom slot, emoji as a recipient-chosen layer ([emotes.md](../../subsystems/emotes.md));
> reactions — act-scoped tallies flushed on a fixed cadence, with `act.emote` reactable
> ([reactions.md](../../subsystems/reactions.md)); one signed `valence` per emote that
> renown reads ([renown.md](../../subsystems/renown.md)); per-viewer regard
> ([belief.md](../../subsystems/belief.md)); personality derived from a ledger of acts
> ([trait.md](../../subsystems/trait.md)); the harm-consent ledger
> ([accountability.md](../../subsystems/accountability.md)).
> **Left:** acts declared by properties (`performs:` on an emote) · the twenty-act
> starter set and eleven manner words · emote packs and the two-layer opt-in · the
> polity's mapping · the manner vocabulary (the custom slot's leading word) · the play frame · consent and welcome on directed acts,
> with accountability generalized from harm to directed acts · witness reach · the
> sincerity reading from witnesses' reactions · the consumers (displayed mood, NPC
> regard, social facts, the trait ledger, derived closeness) · the target's half (what
> you receive, adjacency pairs, target-side saturation) · the hand of open obligations ·
> script-fired acts marked · same-account acts count for nothing · intimacy (private records,
> witness consent, the minors/animals/corpses refusal) · the numbers on `look`
> and `score` · `afk`/`brb` as presence · the two new document kinds
> **Size:** a build

## 0. The problem **[DECIDED — the owner]**

*"A 'smile' isn't just some prose, it tells the game something about how you're
feeling at any given time in the game. 'smile iffy' tells you something also, even
moreso. Or 'thank iffy'. … Most emotes probably don't carry any of this baggage."* And:
*"I don't even know what we're trying to track or aggregate really, I just know there's
meaning to be had in this whole emote content and I'd like to leverage it to the best
of our ability."*

Emotes are already a huge, authored, culturally rich vocabulary — and, today, almost
inert: one signed `valence` read by renown when an emote is used as a reaction. This
slate gives a **core** of them significance without burdening the rest.

## 1. What the EotL corpus showed **[EVIDENCE — read with a grain of salt]**

The owner supplied EotL's soul save (`/etc/core/feelings.o`): **1,377 feelings**, each
with ten forms (undirected and directed, for self, room and target, plus a custom
variant taking a free-text slot). *"Take EotL emotes with a grain of salt, they're 30
years old"* — but the shape is instructive:

- **Synonym families everywhere** — about 13 kisses (`akiss bkiss gkiss hkiss kkiss
  pkiss skiss french smooch peck pash muah kiss`), 8 hugs, a dozen laughs (`lol rofl
  roflmao guffaw cackle chortle giggle snicker`…), 8 grins, 8 nods. Players author
  **flavors**, not meanings.
- **Memes and quotes** — over 500 contain a quote (`pbride`, `caddyshack`, *"Life is
  pain, Highness"*). Performance, not literal statement (§ 4).
- **Community lore** — emotes named for people (`iffy`, `zamboni`, `duncan`,
  `jimbotomy`). Culturally priceless, mechanically nothing.
- **Out-of-character shorthand** — `afk`, `brb`, `bbl`, `idle`, `lol`, `imho`, `rtfm`.
- **Directed touch** — about 130, including about 30 sexual ones as one-word prose
  (`grope`, `molest`), beside world-changing violence (`decapitate`, `explode`, `nuke`).
- **The custom slot** — 917 of them take free text (`smile evilly`).

## 2. ⭐⭐⭐ Meaning belongs to an ACT, not a verb **[DECIDED]**

The owner: *"'thumbs up', 'agree' and 'ok' probably all evaluate to the same thing
mechanically."*

- An emote declares the act it **performs** — `performs: kiss` — as a field on the
  emote document, beside today's `valence` (which this subsumes: valence is an
  evaluation act's reading). The act carries the meaning; the verb carries the flavor.
- **Most emotes perform nothing** and stay pure expression. The meaningful set is not
  an arbitrary verb list the player must memorize: *any kiss is a kiss*, and
  `soul show skiss` says *performs: kiss*.
- ⭐ **No routing around a boundary by synonym** — consent (§ 6) hangs on the act, so
  every kiss anyone ever authors is covered automatically.
- **An emote cannot describe a world change.** Emotes change nothing
  ([emotes.md](../../subsystems/emotes.md)); `decapitate` says something happened that
  did not, which betrays the fiction. An act that would change the world renders as mime
  (*"Bobalu mimes decapitating Iffy"*) or is not an emote — violence is combat's, which
  has its own consent through terms.

### ⭐⭐⭐ Consumers read an act's PROPERTIES, never its name **[DECIDED]**

Acts ship in packs (§ 2b), so nothing in the kernel may know the word *kiss*. Every act
declares:

- its **kind** — affect · touch · social · evaluation · pointing · presence;
- for touch, its **intimacy tier** (§ 6);
- its **default stance** when aimed at someone (warm · hostile · deferent · dismissive ·
  none);
- for a social act, **what it attaches to** (a gift, a harm, an apology, an office, a
  displayed mood).

Displayed mood, regard, consent, the social record and the trait ledger read those
properties. A pack's new act therefore works with no kernel change — *a pack must never
need a kernel list edit*. The kinds come from what the social sciences already separate:
**affect** on two axes (pleasant–unpleasant, calm–energized); **stance** on the
interpersonal circle (warmth–hostility, deference–dominance); **social acts** as acts
that do something by being performed.

### ⭐⭐ The starter set — one act per mechanism, chosen to teach **[DECIDED — the owner]**

The owner: *"keep the starting set of significant grammar here pretty limited but make
sure that the things that do do something do it in a way that's very legible to the
player and instructs how the overall mechanism is supposed to work."* The test for every
entry: **it exists only if some consumer reads it differently from its neighbors.**

| teaches | acts (example verbs) |
|---|---|
| **displayed mood** | joy (smile, grin) · sadness (cry, sob) · anger (glare, scowl) |
| **consent tiers** | pat — casual · hug — affectionate · kiss — intimate · slap — hostile |
| **social facts** | greet (wave, hello) · thank — a gift · apologize — a harm · forgive — closes it · console — their sadness · defer (bow, kneel, salute) — an office |
| **evaluation and sincerity** | approve (agree, nod, ok, thumbs up, applaud) · disapprove · doubt (eyeroll) |
| **pointing** | beckon |
| **presence** | away (afk, brb) · back |

**Twenty acts**, shipped in the `expression` pack. Agree and praise are one act
(**approve**) here; a polity may split them. Everything else drafted — amusement, fear,
surprise, disgust, confusion, embarrassment, boredom, weariness, farewell, welcome,
congratulate, flirt, taunt, deride, point, shush, caress, tickle — is a **candidate for a
polity to add**, not a starter act.

## 2a. ⭐⭐⭐ Meaning is cultural — the polity decides **[DECIDED — the owner]**

The owner: *"a lot of meaning here is cultural, an emote could be completely ironic or
satirical representing the opposite sentiment of what the original meaning carries. Or
the same grammar could mean something totally genuine in another game server. So these
are decisions that a polity has to make for its constituents."*

The design lenses' three altitudes:

| altitude | what | who changes it |
|---|---|---|
| **invariant** | meaning comes from an act's properties · the consent rule per tier (the sexual tier locked) · no number about who you are · witnesses are reach · emotes change nothing in the world | nobody |
| **grain** | the twenty-act starter set and its manner words | our default; a realm may change it |
| **title** | which emotes perform which acts · new acts and manner words · ⭐ re-mapping for a culture — one realm's `smile` sincere, another's ironic; a satirical emote mapped to the opposite of its surface | the polity, for its constituents |

The emote→act mapping is **realm data the polity governs**, never something the platform
ships as truth.

## 2b. ⭐⭐ Content packs and the opt-in **[DECIDED — the owner]**

The owner: *"my answer to the content issues here was generally to break emotes up into
content packs, so you could have a romance pack with all the sex acts you can think of,
but it's opt-in by the Compact."*

- **Content beyond the starter set ships as emote packs** — a romance pack, a crude-humor
  pack, violence as mime — each carrying its emotes, its acts and its manner words.
- **Two layers of opt-in:**
  1. **the Compact decides whether a pack is installed** — installing a pack is the
     governance act, by whatever process the Compact uses;
  2. **each player opts in to receive it** — a perception filter like the emoji render
     setting. Nobody can aim a pack's acts at a player who has not opted in (the refusal
     in advance, applied wholesale), and ⭐ a **witness who has not opted in sees it
     redacted**: *"Bobalu and Iffy share a private moment."* ⚠ Except the sexual tier,
     which is **refused** rather than redacted when any witness has not consented (§ 6a).
- **A pack can add acts, never loosen the consent rule of the tier it uses** (§ 6) — which
  is what makes opting in safe.

## 3. ⭐⭐⭐ The manner vocabulary — what to do with text that can be anything **[DECIDED]**

The owner: *"the harder one is the custom text … you probably want another fixed set of
grammar that the player culture can absorb and understand as a vocabulary they can use
to make certain emotes 'do something'. Anything outside that vocabulary is just
neutral. That vocabulary itself needs to be tagged and sorted."*

- **A closed, authored vocabulary of manner words**, each with a reading on one
  dimension; synonyms collapse (warmly · kindly · fondly → warm). Like acts, the words
  ship in packs and a polity extends them (§ 2a).

| dimension | effect on the act | starter words | candidates for a polity |
|---|---|---|---|
| **intensity** | scales it | slightly · very | deeply · wildly · madly |
| **warmth** | shifts stance | warmly · coldly | fondly · tenderly · kindly · gently · icily · curtly · dismissively |
| **dominance** | shifts stance | proudly · shyly | smugly · haughtily · imperiously · meekly · humbly · respectfully · sheepishly |
| **sincerity** | ⭐ the actor declares it — counts more, or inverts and discounts (sarcastic approval reads as disapproval) | sincerely · sarcastically | earnestly · solemnly · ironically · mockingly |
| **frame** | sets the play frame (§ 4) | playfully | jokingly · teasingly · mischievously · ⭐ evilly, wickedly (mustache-twirling play, by MUD tradition) |
| **affect color** | adds a feeling to displayed mood (`smile sadly` is bittersweet) | happily · sadly | angrily · nervously · wearily · excitedly · bitterly · dreamily · awkwardly |

**Eleven starter words**, one pair per dimension (one for frame).

- **Where it is read: the leading word(s) of the custom slot.** `smile warmly at the
  sunset over the harbor` — warm, and the rest is prose. `smile like a cat that ate the
  canary` — neutral flavor. One rule to learn: **lead with the word.** Negation (*not
  warmly*) is flavor, deliberately.
- ⭐ **Discoverable, or it is an arbitrary memory test** — the client marks a recognized
  manner word as you type it; `help manners` lists the vocabulary by dimension;
  `soul show <verb>` lists the act. The culture absorbs the vocabulary because the
  interface keeps showing it.
- The emotes slate's typed slots (`literal` / `enum`, for moderation) are the same
  machinery; one typed-slot design serves both.

## 4. ⭐⭐ Significance, not literal content — the meme and the play frame **[DECIDED — the owner]**

The owner: *"None of the emotes are speech, they're read through extrasensory perception
over the aether field. But more important than their physics is their significance and
if you're quoting Princess Bride you don't really mean to kill the guy because he killed
your father. It's a metaphor, i.e. a meme."*

- **An emote means what it does, not what it literally says.** `pbride` performs
  amusement or banter, never threat. Literal content and significance are separate, and
  only significance is read.
- ⭐ **The play frame** (Gregory Bateson: the dog's nip says *this is not a bite*) — a
  play-framed act never counts as its literal act: a playful slap is not a slap, a mock
  threat not a threat. Set by the emote (a meme performs within it) or by a frame manner
  word.
- ⭐⭐ **A play frame has to be shared.** A "playful" slap on a stranger is not play — they
  never agreed it was a game. Banter between friends and the same line at someone new
  read differently, and the game can tell from the history between the two (§ 8.5).

## 5. ⭐⭐ Witnesses — the set of people who now know **[DECIDED — the owner]**

The owner: *"we'd want to weight these things by how many witnesses there are to the
act. That isn't to say that privately expressed emotes shouldn't be significant, but
doing things publicly has a certain self-policing quality that privacy doesn't have."*

- **Witnesses are not a multiplier; they are reach.** A private act lands in one memory
  (the recipient's); a public act also lands in every witness's memory, regard, and
  renown in that scope. The self-policing comes free: you cannot later deny the public
  apology, the crowd saw the glare, someone present can contradict you.
- **A witness is whoever perceived it** — the per-viewer perception the engine already
  does (the dark room, the sensorium, out of earshot). ⭐ Disguise works for free:
  witnesses attribute the act to whoever they believe you are, so a public apology in a
  mask credits the mask ([privacy-slate](./privacy-slate.md) § 8).
- **What a crowd does depends on the act** — a public apology costs face and counts for
  more; a public thanks is an honor; a public glare is humiliation, counting more
  against you; a public consolation is less intimate, and the private one may count
  more.
- **Saturating and distinct** — reach is log-saturated and counts distinct, independent
  witnesses; your alts and your own party are not a crowd.
- **Steep diminishing returns** per pair and act — the owner: *"yes on the steep
  diminishing returns or there's a cooldown or something."* Smiling at Augie forty times
  is one smile. ⭐ This is **modeling, not anti-gaming** (§ 8b): it is how a person
  responds, it lives on the **recipient's** side, and it never asks the actor to ration —
  emotes are free.

## 6. ⭐⭐⭐ Consent — what it tells us about the act **[DECIDED — the owner]**

The owner: *"the most interesting part … was actually the consent point. Not because
kissing people who don't want or expect it is creepy (though that's a part of it), but
also that consent itself tells us something about the act. We might want to actually
try to broaden the model for kissing to anything/everything."*

- **Every act directed at a person means something different with consent and without**
  — a kiss: affection or violation; a hug from a friend or a stranger; teasing: banter or
  bullying; a gift: generosity or an obligation pressed on someone; help unasked:
  kindness or paternalism; following, recording, entering a room: company or stalking;
  sparring or assault, which combat's terms already decide.
- ⭐⭐ **Accountability generalizes from harm to directed acts** — it is already *"who
  harmed whom, on what terms, and did the victim consent?"* Harm is the far end of the
  spectrum of acts directed at a person. Harm keeps its `crime` reading unchanged; new
  derived readings join it (closeness, harassment, respect for boundaries). One place
  answers *did they agree*.
- ⭐⭐ **Consent is not welcome** — consent is **before** (were they asked, a standing
  permission, the norm here?); welcome is **after** (they hugged back, they pulled
  away). An unconsented kiss that turns out welcome is still unconsented; the game must
  never encode *it worked out* as permission. Two fields, not one.
- ⭐⭐ **The intimacy tiers** — every touch act names one, and the consent default keys
  on the tier, never on the act:

| tier | starter acts | default consent |
|---|---|---|
| casual | pat | allowed |
| affectionate | hug | between contacts, or where a place's norms allow |
| intimate | kiss | standing consent or asked only |
| hostile | slap | never consented by default; may open a fight under combat's terms |
| **sexual** | none — opt-in packs only (§ 2b) | ⛔ **locked**: the partner's standing consent or asked, never a place's norm; ⭐ **and every witness's consent** (§ 6a); a pack cannot loosen it |
- **Where consent comes from**, cheapest first, so play stays spontaneous:
  1. **standing** — your contacts and relationships (*friends may hug me*);
  2. **place and context** — the dance floor, the sparring ring, the festival, a greeting
     culture: norms an author sets on a place (enable, never impose);
  3. **asked** — an explicit ask and answer, for the acts that need one;
  4. **refused in advance** — a standing boundary, ⭐ enforced mechanically for players:
     the act renders as an attempt (*"Bobalu leans in; Iffy turns away"*) — safety
     without breaking the fiction.
- **Welcome is read from the response** — the recipient's own emote completes the
  meaning of the first.
- **NPCs** consent by regard, personality and role: kissing a stranger NPC is refused,
  their regard drops, and the witnesses saw it.
- ⭐⭐⭐ **Why this is foundational, not a feature** — in LambdaMOO in 1993 a player called
  Mr. Bungle used a "voodoo doll" program to make other characters appear to perform
  sexual acts. Julian Dibbell's *A Rape in Cyberspace* (*The Village Voice*, 1993)
  describes the community inventing self-governance in response. That is the
  [Compact](../../compact-political-science.md)'s ancestor: consent on directed acts is
  why governance in virtual worlds exists at all.

## 6a. ⭐⭐⭐ Intimacy — private by default, and the audience as part of the act **[DECIDED — the owner]**

The owner: *"what if we did have a sex emote pack — how should sex affect the characters,
given it generally happens in private, and it happening in public is, uh, an expression
of a very specific kink."*

### The invariant answers most of it

**Emotes change nothing in the world**, so an intimate or sexual act triggers **no
biology** — no conception, no disease, no stat. If a realm wants pregnancy or children,
that is the household lifecycle's, with its own deliberate act, never a side effect of an
emote. Modeling it through emotes would make every intimate scene a medical event —
*expression is inelastic*. In the fiction, sex affects characters through three things
only: **closeness, the record, and who knows.**

### In private — closeness and a shared secret

- **Closeness** — the most intimate tier weighs most in the closeness derived between two
  people (§ 8.5); a relationship emerges with no relationship field.
- **The record is private by default** — intimate- and sexual-tier acts show only in the
  two people's own records: never renown, never reception counts, nothing another person
  can be shown. ⭐ **Either person can delete their copy** — opt-in content, and the closest
  thing in the game to personal.
- ⭐⭐ **Who slept with whom is the classic secret**, and it reaches anyone else only
  through the [privacy slate](./privacy-slate.md)'s machinery: someone saw, someone told
  (a disclosure act), or a trace was found (the
  [deception-and-detection](./deception-and-detection-slate.md) detective). Affairs,
  jealousy and scandal all run on discovery, which already exists; a marriage
  ([staging-leftovers § 1.5](../tails/staging-leftovers-slate.md#15-marriage-and-the-two-prisons))
  gives a betrayal its stakes.

### In public — the audience is part of the act

- ⭐⭐⭐ **Exhibitionism includes the audience by definition**, so the sexual tier needs
  **every witness's consent**, not only the partner's — without it, it is indecent
  exposure, a harm to the witnesses. Consent generalizes: some acts need **witness
  consent**.
- **Where witness consent comes from** — every player present has opted in to the pack,
  or ⭐ the **place declares it as its norm** (a club whose door *is* the consent) — a
  venue authors and polities can make. A place's norm supplies witness consent only,
  never the partner's.
- ⭐⭐ **Without it, the act is refused — not performed and redacted.** Redaction would let
  the act happen *to* the room. So the **private room** — the privacy slate's open item, a
  place property — becomes load-bearing.
- **Public indecency is a polity's law** — a crime, a fine, or legal in a district is
  title-level; accountability holds the evidence.

### ⛔ Invariants no pack and no polity can change

- A sexual-tier act **can never target a character presented as a minor, an animal, or a
  corpse** — refused at the act, with no setting or norm that lifts it. Stated because
  NPC children exist (household lifecycle) and species vary.
- The tier's consent rule — the partner's and the witnesses'.
- Emotes trigger no biology.

**NPCs** consent by regard and role, as for any act. **Sex work** is the gap walk's
**vice** item — a trade a polity regulates or bans — and its own conversation.

## 7. ⭐⭐ Sincerity — the audience is the check **[DECIDED — the owner]**

The owner: *"performing for a crowd, there's a word for that and it's called virtue
signalling and people hate it. Hopefully the audience would be able to read between the
lines and then they in turn can react and emote back how they feel about the person's
authenticity; that in itself is another thing to read."*

- Reactions to emotes already ship. **Evaluation acts carry a sincerity reading** —
  skeptical (eyeroll, scoff, smirk) or affirming (nod, moved, forgive).
- **Each witness's update is shaped by their own reaction** — the eyerollers discount
  the apology; witnesses who saw the eyerolls saw a contested apology, not a clean one.
  The engine never computes *this was insincere*; the reading spreads through the crowd
  as acts.
- **The reactions are acts with witnesses too** — eyerolling a sincere apology before a
  sympathetic room costs *you*.
- **The actor gets the record, not a verdict** — *"your apology in the square drew 5 nods
  and 3 eyerolls."* What it says about you is yours to conclude.
- **It settles when the reaction window closes** — reactions already aggregate per act on
  a fixed flush, so an expressive act's effect can finalize then.

## 8. The consumers **[DECIDED]**

1. **Displayed mood** — derived on read from your recent affect acts, never stored:
   `look bobalu` shows *he looks pleased* for a while after a smile, fading over
   game-minutes; NPC brains read it (the barkeep notices you're down). The emote still
   changes nothing — the zero-state doctrine stands.
2. **NPC regard** — stance and social acts directed at an NPC move its regard, scaled by
   its susceptibility and personality, with steep diminishing returns. ⭐ **A thank
   counts when there was something to thank for** — a recent gift, trade or help between
   you; a thank from nowhere is noise.
3. **Social facts** — ⭐ **apologize** attaches to an accountability record of harm you
   did that person: it acknowledges, it never erases, and they may **forgive**, which
   closes it; **thank** attaches to a gift — [giving](./giving-slate.md) is the first
   act of play, and thanks closes the loop; **greet** is a light introduction;
   **salute** and **bow** to an officeholder recognize the office. Each shows in both
   people's record (*"Iffy thanked you for the bread"*).
4. **The trait ledger** — directed acts are exactly the disposition-valenced acts
   [trait.md](../../subsystems/trait.md) counts: a habit of consoling reads warm, a
   habit of glaring hostile. Cheap acts weigh very little — a slow, honest drift, never a
   stat to grind.
5. ⭐ **Closeness, derived** — mutual, consented, welcomed acts accumulating between two
   people is how the game knows they are close, **with no relationship field
   anywhere**. The trait ledger's trick applied to a pair. It also tells whether a play
   frame is shared (§ 4).
6. **Renown** — as now, via reactions.
7. **Presence** — `away` and `back` tell the game the human is away (the livestream's
   `stream away` already has the concept). The most mechanically meaningful emotes are
   the out-of-character ones.

**What it does not do** — no buffs from smiling (gameable, and it cheapens the gesture);
nothing mechanical on a player recipient beyond the record and closeness — the human
reads Iffy's glare and decides what it means.

## 8a. ⭐⭐⭐ The target — the other half of every directed act **[DECIDED — the owner]**

The owner: *"you talked a lot about what an emote means for the person emoting, but what
about the target, when there is one."*

### What you receive is how the world treats you

What you have done is your conduct; what has been done **to** you is the world's regard.
Thanked by five people this week — evidence you help; apologized to — you were wronged;
consoled — someone noticed; glared at by the same three — a feud. These are other people's
acts, so they are readable numbers (§ 9): *thanked 5 times by 4 people*, *apologies
received 2, forgiven 1*. For most players this is the half that says how they are doing.

### The target gets a turn — adjacency pairs

Conversation analysis's **adjacency pairs**: some acts open a slot for the other person's
reply.

| first act | the expected reply | the cold reply |
|---|---|---|
| greet | greet back | ignore |
| thank | acknowledge | brush off |
| apologize | forgive | refuse |
| hug | hug back | pull away |
| console | accept the comfort | rebuff |
| offer (a gift) | accept | decline |

- **The reply completes the meaning** (it is the welcome of § 6), and both records take the
  pair as one fact: *"Iffy apologized; you forgave her"* is not *"Iffy apologized."*
- **Silence is a move — fairly.** An unanswered act means something only if the target was
  present and could perceive it; away, in the dark, or out of reach is no snub.
- ⭐ **NPCs read snubs; players are never penalized for them.** Augie remembers you ignored
  him. For a player target an unanswered act shows only as *unanswered* in the record —
  real people miss messages.

### Protection centers on the target

- **Consent and refusal** are the target's (§ 6).
- ⭐⭐⭐ **Saturation on the target's side** — per pair, nobody can farm one person; **per
  target, nobody can be mobbed**: thirty people glaring in an hour is a pile-on, and its
  effect on the target saturates. **Invariant** — no polity may make mobbing effective.
- **Harassment is a pattern of acts received** — unwelcome acts from one person, or a
  dogpile from many: the target's side is where the Compact's conduct process reads its
  evidence.

### Who or what the target is

| target | what it means |
|---|---|
| a player | everything above |
| an NPC | the engine simulates the response: regard, mood (consoling a sad NPC lifts them), the remembered snub |
| ⭐ an animal | [pets.md](../../subsystems/pets.md) already reads it — the bond is regard × handling, so `pat` **is** handling; animals refuse too (*difficult, not feral*) |
| an object or symbol | no consent, no regard, but meaning: bowing to an altar is a faith act, saluting a flag civic, kissing the ring fealty — for [organized religion](./organized-religion-slate.md), civics and [diplomacy](./diplomacy-slate.md) to read |
| the room (*apologizes to everyone*) | a social act aimed at the witnesses themselves |
| yourself | self-soothing (`hug self`) — affect only |

### Under a disguise

You act toward whoever you **believe** someone is: thank a masked stranger and the thanks
belongs to the persona you thought you thanked. The person underneath knows; nobody else
does. The witnesses' rule (§ 5), applied to targets, with
[privacy § 8a](./privacy-slate.md)'s pen-name rule for where standing attaches.

## 8b. ⭐⭐⭐ Gaming, cards and culture **[DECIDED — the owner]**

The owner: *"if it can't be gamed then it probably isn't actually that compelling … my
normal way to deal with this is to have culture that self-polices, and preferred-use
systems that are more compelling than the payoff of gaming something would be. … Like in
a card game, if someone played the 'thank you' card and you're holding the 'you're
welcome' card, when you choose to deploy it is the whole game. Every emote becomes its own
little minigame, not necessarily based on real codified rules but on cultural norms that
emerge from the codified rules. … If you're accurately modeling the experience, then going
through the motions and genuinely engaging with the experience take the same requests and
responses and are essentially the same at the material layer, and it's only at the
cultural layer where they're questioned."*

### The principle

- ⭐⭐⭐ **Rote and genuine are materially identical; only the culture tells them apart.**
  The engine never tries to detect sincerity or rote-ness — no timing heuristic, no
  *replied too fast* — and every mechanism in this slate is **modeling, never
  anti-gaming**. It is the project's gameability doctrine applied to
  expression: gaming is fatal only when it is **invisible** or **breaks conservation**;
  everything else is play, and the exploit should be indistinguishable from competence.
- ⭐⭐ **Emotes are free — never something to conserve.** The owner: *"we'd never want
  players to have to conserve emotes. They should be totally free to use … it just means
  that saying 'you're welcome' is always cheap, so if I don't do it when you say thank you
  I'm still making a statement."* Because the expected reply costs nothing, **its absence
  is the signal** — the reverse of costly signaling: when sending is free, *not* sending is
  what informs.

### The hand — open pairs are obligations

The adjacency pairs of § 8a are **obligations** (Marcel Mauss, *The Gift*: a gift obliges
the receiver to receive and to reciprocate). The reply decides what happens to the
obligation — that choice is the card:

| they played | your cards | what each does |
|---|---|---|
| thank | **you're welcome** | closes it — no debt between you |
| | **anytime** | closes the debt, opens a standing offer — warmth |
| | ⭐ **you owe me one** | keeps the debt open as leverage, to call in later |
| | silence | left open — a statement, because the reply was free; NPCs read it, players are never penalized |
| apologize | **forgive** | closes the harm |
| | **accept, don't forgive** | acknowledged, still open |
| | **refuse** | open, and colder |
| | **forgive in public** | closes it, and honors them before witnesses |

- **What is open between you and everyone else is your hand** — whom you owe, who owes
  you, whose apology you are still holding. **You see your whole hand; each counterparty
  sees only what is open between the two of you; nobody sees anyone else's.**
- **Timing is the game** — when to forgive, when to call in the favor, whether a debt is
  worth more left open. The codified rules are tiny (open · close · keep open); the norms
  on top — is *you owe me one* crass here, or how business is done? — are the culture's
  (§ 2a).
- A favor economy, not money: it conserves nothing, so it cannot break conservation.

### The only two fatal cases

1. ⛔ **Self-dealing across one human's characters** — thanking your own alt for a gift it
   never really gave manufactures a counterparty; it is invisible and breaks the
   conservation of truth. **Acts between characters of one account count for nothing** —
   the influence system's account roll-up seam
   ([influence.md](../../subsystems/influence.md)), the same rule as *your alts are not a
   crowd* (§ 5).
2. ⭐ **Invisible automation** — a player may script (*on thank, say you're welcome*), and
   by the principle that is allowed: the rote reply is materially the real one. But it is
   policeable only if it is visible, so **a script-fired act is marked** — in the record
   and to witnesses (*"reflexively"*). The culture judges bot-like politeness; the engine
   never penalizes it.

## 9. ⭐⭐⭐ The numbers — of the effect, never of the person **[DECIDED — the owner, measurement Part 6]**

The owner: *"at some point you need to aggregate things into a number, if not for the
engine's sake for the player's sake. This isn't like traits where it's hard to
introspect — you should know the effect emotes are having."*

[measurement.md](../../measurement.md) Part 6 draws the line exactly here: a number about
**who you are** (warm, sincere, kind) is a gauge on a declared standard and banned (rule
3); a number about **what happened and what it did** is owed (rule 4, B3 — the feed
hides the measurement, the mirror shows you).

| the number | what it is | where |
|---|---|---|
| **Augie's regard for you: +34, warm** | someone else's attitude — a fact about the relationship | `look augie`; the social section of `score` |
| **between you and Iffy** | mutual, consented, welcomed acts, counted and decayed | both see it |
| **your week** — 40 warm, 3 hostile, 12 thanks given, 5 received, 2 apologies, 1 unwelcome | the record of your acts | `score` |
| **how your public acts were received** | witnesses' reactions, counted | `score` |
| renown per scope | already numeric | as now |

- **Never** a sincerity or kindness position.
- **Quiet per act** — emotes may be half of a chat session's frames, so no note on every
  smile; the numbers live on the relationship and the mirror, and a per-act line fires
  only when something moves (regard crosses a band, an apology is accepted) —
  *announce the surprising*.
- **Pure-flavor emotes write nothing.**

### ⭐⭐ Legibility — the act explains itself, then goes quiet **[DECIDED — the owner]**

The starter set's job is to **teach the mechanism** (§ 2). So the first few times you
perform a meaningful act, its effect is narrated **with the reason**:

- *"Augie warms to you. Thanks count because you'd just given him bread."*
- *"Iffy turns away; she hasn't agreed to that."*
- *"Six people saw your apology."*

Then it goes quiet, speaking only when something moves. The reason is the lesson — four
sentences teach something to thank for, consent and witnesses, with no tutorial.
`soul show <verb>` and `help expression` show what an emote performs and why, so
anything a polity adds describes itself the same way.

## 10. Data, not Stuff **[DECIDED — the owner]**

The owner: *"you're saying you make all these words Stuff objects? That's only for
things that need runtime state and need to be targetable by commands. This all just
sounds like document data to me."*

- **Acts and manner words are documents**, like emotes: installed by a pack, reconciled
  three-way, cached beside the soul catalogue. `performs:` is a field on the emote
  document.
- **The one kernel cost** — the document kinds are a closed list, so the new kinds are a
  kernel change in the build.
- **A realm extends the vocabulary** by shipping or editing documents, as it edits emotes
  today.

## 11. The lens pass

1. **Pedagogy** — affect and stance as real psychology; acts that do things by being
   performed; the play frame; consent before and welcome after; base rates of
   reception.
2. **Expression** — ⭐ thousands of flavors over twenty starter acts a polity extends: authors keep writing emotes
   freely, and meaning comes from one field. Memes keep their place as play.
3. **Immersion** — the barkeep who notices; the turned-away kiss; the eyerolls in the
   square. **Participation** — the apology and the forgiveness, the gracious thanks, the
   banter between friends, the cad refused before witnesses.
4. **Values** — consent as foundational; virtue signaling met by the audience, never by
   the engine; no number on who you are.
5. **Continuity** — the same acts under any epoch; only who can witness (an aether
   channel, a broadcast) changes.
6. **Economy** — thanks closing the gift loop; regard as the currency of service;
   reputation from reception.
7. **Governance** — consent records as evidence; harassment as a pattern of unwelcome
   acts for the Compact's conduct process, with its criterion and appeal; LambdaMOO as
   the precedent.

## 12. Open

1. **The weights** — diminishing returns, witness saturation, and how much each act moves
   regard.
2. **Directed acts beyond emotes** — give, follow, record, enter onto the same consent
   ledger: the lean is to design for all and build emotes first.
3. **Importing an EotL-derived emote pack** — gesture families mapped to acts, lore kept,
   world-changing ones rewritten as mime, sexual ones to an opt-in pack (§ 2b). Likely the
   from-scratch content pass's, not this build's.
4. **How a polity governs the mapping** (§ 2a) — the Compact's process for installing a
   pack and re-mapping emotes to acts; the mechanism is documents, the process is the
   Compact's.
5. **The displayed-mood fade** — how long a smile shows.
6. **The first-use narration** — how many uses before an act goes quiet.
