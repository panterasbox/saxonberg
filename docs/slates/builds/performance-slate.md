# Performance slate — the real performance, the fictional stage, and scores that adapt

> **Status: UNBUILT** — designed at high level 2026-10-20 with the owner, out of
> the gap walk. The economy around a performance mostly ships — `react` batches
> an audience's reactions into one counter ([reactions.md](../../subsystems/reactions.md)),
> `tip` ships, reactions feed [renown](../../subsystems/renown.md), and the
> [markets slate](./markets-slate.md) lists *"human performance — music,
> storytelling, a game master's evening — what an NPC can only fake"* as genuinely
> scarce work. The stream substrate ships (`watch`/`tune`, the Twitch, YouTube and
> Kick transports, [streaming.md](../../subsystems/streaming.md); the display's
> projection rule, [display.md](../../subsystems/display.md)).
> **Left:** the stage as a source the room hears (the performer's live stream;
> audio by default, video by the performer's choice) · the stage presentation
> (performer foregrounded, NPC chatter silenced, the audience murmuring) · the
> theater before, around and after · measurement in three layers (happened ·
> received · judged by people) · the music Discipline · ⭐ adaptive MIDI scores
> (sections, markers, layers, a cue sheet over a closed situation vocabulary) ·
> authorship by title down the zone tree · seams graceful by default, seamless by
> a voluntary house sound · diegetic music beats the score · the listener's last
> word · the composition Discipline's craft checks · royalties
> **Size:** a build (client-led)

## 0. The owner's frame

*"Performance art in a text game is just not possible because performance is
explicitly not on the page. That said, we do have artistic content. It's on the
screen not the stage. A livestreamer can actually start streaming a musical
performance on real instruments and broadcast it to an audience in the game.
What's missing is a way to measure any of it so as to exercise the appropriate
disciplines, and everything up to, around, and after the performance itself …
I can sit down and play a piano performance in my own office at home, but the
game experience can model something completely different, a performance at the
Hollywood Bowl."* And: *"if we were going to leverage our client for anything I'd
think it'd be performance design."*

A first draft had the engine produce the performance (tunes in a text notation,
synthesized by an in-game instrument). This replaces it: **the performance
happens off the page, in the real world; the game supplies the fiction around it
and the measurement of it.**

## 1. ⭐⭐⭐ The real performance, the fictional venue **[DECIDED]**

- **A stage is a source the room hears.** Its sound is the performer's live
  stream, which the client plays to everyone in that venue — the display's
  *the display you can see shows X*, for the ear.
- **Audio by default**, because the performer's real office would break the
  Hollywood Bowl. **Video is the performer's opt-in**, with a greenscreen or a
  virtual backdrop — the [card-sizes slate](./card-sizes-slate.md)'s broadcast
  contract already has the camera region for it.
- **The fiction around it is text**, which is what we are good at: the house
  filling, the lights going down, the applause batched into one line, the encore.

## 2. ⭐⭐ The theater — before, around and after **[DECIDED]**

- **Before** — booking the venue (a seat, or a [contract](../../subsystems/contract.md)),
  the bill and the poster (the printed things,
  [paper-and-printing-slate](./paper-and-printing-slate.md)), tickets (admission
  as a door rule), rehearsal.
- **Around** — ⭐ **the stage presentation**: while a performance runs, the
  performer's output is foregrounded in each audience member's terminal, NPC
  ambient chatter stops, and audience talk becomes murmurs unless addressed —
  theater etiquette made presentation, and the answer to the usability pass's
  drowned room (#61). Reactions batch (*the room applauds ×14*); tips.
- **After** — the review in the Gazette ([press.md](../../subsystems/press.md)),
  renown, the encore, the recording (the stream's archive).

⚠ **NPCs never judge or tip.** They cannot tell good from bad, so an NPC tip would
be content-blind money a bot could farm by playing to an empty bar. An NPC
audience is atmosphere; **the money is player tips and the venue's own purse.**
And **a performance grants no buff** — it produces witness, renown and tips, the
rule the faith slate settled for ritual.

## 3. ⭐⭐⭐ Measurement in three layers **[DECIDED]**

The engine cannot know whether you played or put on a record, and it does not
pretend to. The split is [measurement.md](../../measurement.md)'s own:

| layer | what | how |
|---|---|---|
| **the engine measures** | that a performance **happened** — a live stream, its duration, the venue, who attended and who came back | the streaming layer's state is the evidence |
| **the subject values** | reception — reactions, tips, return attendance | renown's reception signals |
| **people judge** | quality | ⭐ juries, examiners and critics: the [festival](./festival-slate.md)'s judged class (a competition), graded exams the University runs, a critic's review |

**The music Discipline** — the first arts Discipline — is exercised by performing
for audiences; its higher bands are **conferred by people**, never computed.

## 4. ⭐⭐⭐ Adaptive scores — iMUSE across many authors **[DECIDED]**

**iMUSE** (LucasArts, 1991, first in *Monkey Island 2*) had one key idea: music
changes at **musically sensible moments** — a theme carries markers where a
transition is allowed, and the engine waits for the next one rather than cutting
mid-phrase. Later games added **layers** that fade in and out with intensity.

- **The format is MIDI** — iMUSE's heritage, and every music tool exports it.
- **A score is authored content**: themes (sections), transition markers, layers,
  its **signature** (key, tempo, meter, entry and exit points), and a **cue sheet**
  — a document beside the MIDI — mapping situations to sections and layers.
- **The client plays it**, moving between sections at the markers.

### ⭐⭐⭐ The problem iMUSE never had: many authors **[DECIDED — the owner's question]**

*"iMUSE was composed by like a single guy but we have many content authors with
competing ideas about what audio should be playing when and where and with what
musical signature."* (iMUSE's composers, Michael Land and Peter McConnell, wrote
one score in one palette, so every transition was composed for.)

1. **Who decides what plays where — the place's title holder.** Whoever maintains
   a place's content sets its score ([parcel.md](../../subsystems/parcel.md)), and
   it **inherits down the zone tree** like the climate
   ([zone.md](../../subsystems/zone.md)): **realm default → district → venue**,
   each overriding the one above. Competing ideas are settled by ground; a district
   whose soundtrack nobody likes is a reason to live elsewhere.
2. **Seams — graceful by default, seamless by agreement.** Crossing from one
   score into another, the client checks the two signatures:
   - **compatible** (the same or a related key, tempos within a ratio) — a
     **musical transition** at the next marker: iMUSE across authors;
   - **not compatible** — a **bridge**: the outgoing score resolves to its
     cadence, a breath of silence, the new one enters;
   - **never a jarring cut** — the worst case is a rest.

   ⭐ **A district may publish a house sound** — a key family, a tempo range, an
   instrumentation — so its scores flow into each other. It is **voluntary,
   rewarded only by seamlessness, never enforced**:
   [settlement-model](../../settlement-model.md) § 4's *zoning governs use,
   never self-expression*. A composer who ignores it gets a bridge, never a
   refusal.
3. **The shared contract is the situation vocabulary.** Each author decides how
   their score sounds; everyone shares **what it responds to** — a **closed
   vocabulary of situations**, derived from what the listener perceives
   (*exploring · in a crowd · at night · raining · in combat · wounded ·
   arriving*). Closed list, open expression — the ground's closed floor kinds,
   again.
4. ⭐⭐ **The perception firewall applies to music.** A score that turns ominous
   because a hidden ambusher is in the room tells the player what no sense
   reports — *the music told me there was a monster*. **Cues come only from what
   the listener perceives or knows**, the rule that keeps `--mixin` from becoming
   a sense the world does not have.
5. ⭐ **Music in the world beats the score.** Film's split between **diegetic**
   music (inside the world: the band, the busker, a music box) and
   **non-diegetic** (the score only the audience hears). Diegetic music is a
   sound in the world, heard through the shipped hearing propagation — muffled
   through a door, fading down the street ([senses.md](../../subsystems/senses.md)).
   **When diegetic music is audible, the score ducks or stops.** A venue's PA
   playing your entrance music is diegetic, and the venue's call.
6. **The listener has the last word** — the place's score, your own score that
   follows you (a character theme, which plays **only for you**), or silence: the
   color rule again — the writer expresses, the place owner sets the default, the
   listener decides what they hear.

### The composition Discipline **[DECIDED]**

Composition is measured in the same three layers:

- ⭐ **Craft is derivable** — transitions on bar lines, sections compatible in key
  and tempo, layers aligned in meter, endings that resolve. Deterministic checks,
  a lint for adaptive music, and lens-1 teaching about how interactive scoring
  works. ⭐ **Writing for compatibility is the hardest craft** — bridges,
  modulations, staying within a house sound — and the checks measure something a
  composer has to learn.
- **Reception is measured** — how many places use a score, and ⭐ **how often
  listeners turn it off**: an honest signal nobody can game by asking.
- **Quality is judged by people** — commissions, competitions, critics.

**Royalties** — a composer is credited wherever their score plays, and a performer
for their set, through [provenance](../../subsystems/provenance.md)'s credit
routing.

## 5. Venues and the economy

- **The venue books the performer** — a seat paid per night (the markets slate's
  piecework); the house earns on drinks from the crowd the performer draws, and
  **players present** is the honest measure of the draw.
- **The busker** — on the street (circulation, [roads-slate](./roads-slate.md));
  the hat on the ground is a container that takes tips.
- **The patron** — a commissioned piece or score, as a contract.
- **First venue** — music night at Dave's Bar; ⭐ the festival's band, which the
  festival slate left waiting on this cluster.

## 6. Lens pass

1. **Pedagogy** — interactive scoring (markers, layers, compatibility); the
   diegetic/non-diegetic split; performance as a craft with an audience.
2. **Expression** — ⭐ the performance and the score are the player's own; the
   engine never judges the art.
3. **Immersion** — the Hollywood Bowl around a real piano; the score that turns
   with what you do. **Participation** — performer, composer, critic, examiner,
   venue owner, busker.
4. **Values** — quality has no derivable answer; people judge it.
5. **Continuity** — the same stage across epochs; the busker to the PA to the
   broadcast.
6. **Economy** — tips, the venue's purse, the draw, royalties, commissions; no
   NPC tips.
7. **Governance** — licensing plays (Britain's Lord Chamberlain licensed every
   stage play from 1737 to 1968), noise ordinances, busking permits.

## 7. Open

1. **The stage's audio path** — how the client takes a stream's audio for a
   venue, and its latency against the text.
2. **The situation vocabulary** — the closed list, and how each situation derives
   from perceived state.
3. **Signature compatibility** — the exact rules (related keys, the tempo ratio).
4. **Where scores attach** — a zone field, a place field, both.
5. **Personal scores** — whether a character theme is a document the player owns
   and carries between realms.
