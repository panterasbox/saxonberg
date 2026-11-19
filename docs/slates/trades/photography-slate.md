# Photography slate — the game never captures art, but it can capture itself

> **Status: UNBUILT** — opened 2026-11-18 with the owner as the first step of a larger thread on
> **recording**: *"we need to talk about the general purpose recording serves in the game and what it can and
> can't do, the different media and how it intersects with all the different trades that rely on recordings.
> But I think it's better to start with something very simple: just the basic photograph. Figure out all the
> rules for that and then work on the harder stuff."* Nothing ships. What it rides: light as real physics,
> unlit interiors pitch black ([light.md](../../subsystems/light.md)); perception and concealment
> ([perception.md](../../subsystems/perception.md), [concealment.md](../../subsystems/concealment.md));
> per-viewer recognition ([belief.md](../../subsystems/belief.md)); paper as a frozen thing-text
> ([paper.md](../../subsystems/paper.md)); glass ([glass.md](../../subsystems/glass.md)); the instrument rule,
> *competence resolves detail, never access* ([instrumentation.md](../../subsystems/instrumentation.md)).
> **Left:** the `photograph` verb and the camera as a tool row · the frozen perception snapshot and how a print
> stores it · exposure (light × time, motion lost) · recognition at viewing · the negative and the print ·
> digital metadata · private extents' camera rules · the photographer's vocation · ⭐ (§ 9) **off-page** — the
> term for real-world creative work and its artists; Disciplines name in-world crafts only
> **Size:** a build

## 0. The line it sits on **[DECIDED — the owner's rule, read]**

The performance and visual-arts slates hold one rule: **the game stages art and never captures it**
([performance-slate](../world/performance-slate.md) § 0 — *"the performance happens off the page … the game
supplies the fiction around it"*; [visual-arts-slate](../world/visual-arts-slate.md) § 1 — *"the piece is the
artist's, and it is never generated"*). A photograph sits on that line, because two things share the name:

1. **A real photograph** — taken by a person in the real world and brought into the game. That is art: the
   game frames it (the print it hangs on, the gallery, the audience) and never makes or captures it.
2. **A photograph taken inside the game**, with an in-world camera, of the game world. It *does* capture —
   but what it captures is **the world's own rendering, which the game already owns**, never anyone's
   real-world art.

> ⭐⭐⭐ **The game never captures art, but it can capture itself.** This slate is the second kind.

## 1. ⭐⭐⭐ What an in-world photograph captures **[DECIDED in shape]**

**What the camera could see, and nothing else:**

- **only the visual channel** — no sound, no smell;
- **from where the camera stood**, framing what is in view;
- ⭐ **under the light at that moment** — light is real physics, and an unlit interior is pitch black, so a
  photo of a dark room is black;
- ⭐ **never more than perception allows** — a hidden person is not in it; a disguised person appears
  disguised. **A photo is a frozen perception, never an omniscient snapshot** — the evidence firewall holds,
  which is what makes a photo honest evidence.

## 2. ⭐⭐⭐ Appearance, not identity **[DECIDED — lenses 1, 3a]**

Recognition is per-viewer: you know who someone is only if you have met them. So **a photo stores how things
looked** — *"a tall man in a gray coat beside the fountain"* — and **whoever looks at it later applies their
own recognition**. Someone who knows Bob's face sees Bob; a stranger sees a tall man in a gray coat. The same
photograph means more to the people who know more, as a real one does.

## 3. ⭐⭐ It is frozen, and it is a thing

- **Frozen in time** — paper's thesis ([paper.md](../../subsystems/paper.md)): it shows the scene as it was,
  goes stale, contradicts the present, can be dated.
- **A thing** — printed on paper or a plate; carried, given, lost, burnt.
- **Copied from a negative** — a reusable original: the printing slate's fixed-cost curve
  ([printing-slate](./printing-slate.md) § 3).
- **Forgeable** — staged scenes, retouching. Forgery stays play: the record never certifies an in-fiction
  object ([record-integrity-slate](../platform/record-integrity-slate.md) § *The interface*).

## 4. ⭐⭐ Exposure is physics **[DECIDED — lens 1]**

- **Light × time** — too little and the photo is dark, too much and it is washed out.
- ⭐ **A long exposure loses what moves.** Real history: Daguerre's *Boulevard du Temple* (1838), the earliest
  photograph of a street, shows an empty boulevard — the traffic moved too fast to register; the only person in
  it is a man standing still to have his boots shined. A slow camera in a busy square makes a photo of an empty
  square.
- Every outcome can be worked out in advance; none is rolled ([uncertainty.md](../../uncertainty.md)).

## 5. ⭐⭐⭐ It never captures a performer's real media **[DECIDED]**

Photograph a stage where someone streams a real piano performance and the photo shows **the stage** — the hall,
the crowd, *"a pianist at the grand piano"* — never a frame of their real video. Photograph a screen showing an
aether stream and you get *"a screen showing* Saturday Night at the Bowl*"*. The owner's line, held at its
sharpest point.

## 6. Craft, epoch, trades

- **Competence resolves detail, never access** — a better photographer gets a sharper, better-exposed frame of
  the same scene, resolving more. ⛔ **The game never judges composition or beauty** — that would be judging
  art; only the technical result is measured.
- **Epoch** — the camera **runs on** muscle (no power) but is **made with** Engine-era optics and chemistry,
  from the daguerreotype (1839). A digital camera or the phone's camera **runs on** Signal; its photos are
  digital — copied with no negative, carrying their own metadata
  ([content-declaration-slate](../platform/content-declaration-slate.md) § 3.0).
- **Trades it pulls on** — glass for lenses, silver and chemistry for the process, paper for prints; and
  **photography** itself as a vocation: portraits, photojournalism, forensics, records.

## 7. Lens pass

1. **Pedagogy** — optics, exposure as light × time, silver chemistry, Daguerre and the empty boulevard, the
   history of doctored photographs (Stalin's commissars disappearing from official pictures). **Lens 1 chose
   exposure as real physics, and appearance not identity.**
2. **Expression** — the ordinary case is point and capture: the camera a tool row, the photo derived from the
   scene, nothing authored per photo. ⭐ **One new verb, `photograph`** **[DECIDED — lens 2]** — `snap` is
   glassworking and `shoot` is ranged combat; nothing holds `photograph`.
3. **3a Immersion** — the photo obeys perception and light, so it cannot contradict the fiction; it never
   captures real media; **covenants apply to operating devices**, so a phone camera (runs on Signal) is subject
   to a covenant town's law, and a film camera (runs on nothing) is not. **3b Participation** — photojournalism
   for the Post, portrait studios, forensic photos at a scene, **blackmail** (Vionne's hidden hand —
   [corpos-slate](../society/corpos-slate.md)), staged forgeries and the work of exposing them.
4. **Values** — ⭐ **photographing inside a private extent is its holder's rule** **[DECIDED — lens 4]**: the
   right to exclude applied to cameras — a club or a home may ban them, enforced as that extent enforces its
   rules. In the fiction's public spaces there is no consent mechanism (*leaving the lounge is the opt-in* —
   [moderation-slate](../society/moderation-slate.md) § 1a).
5. **Continuity** — ⭐ **one command across the epochs** **[DECIDED — lens 5]**: daguerreotype, film, digital,
   phone — `photograph` answers on every rung; only the dynamics change (exposure time, a negative or none,
   copies free or not).
6. **Economy** — a real vocation with demand already designed (journalism, portraits, forensics, records); the
   pull on glass, silver, chemistry and paper. ⭐ **Value moves across the epochs** **[DECIDED — lens 6]**: a
   film print costs a negative and a printing session, so copies have value; a digital photo copies free, so
   its value moves to *the shot itself* and to *being first* — timeliness, journalism's whole business.
7. **Governance** — ⭐ **an in-fiction photo is admissible in an in-fiction case, weighed like testimony**
   **[DECIDED — lens 7]**: frozen perception, so epistemic and fair; forgeable, so weighed, never trusted
   blindly. **Never evidence in a conduct case**, which uses only what was delivered to someone
   ([separation-of-powers-slate](../society/separation-of-powers-slate.md) § 7o; moderation-slate § 23).
   Taking a photo judges nobody; publishing a staged one to defame someone is a civil case.

| question | answer | lens |
|---|---|---|
| the line | the game never captures art, but can capture itself | the owner's rule |
| what it captures | the visual channel only, from the camera's place, under the light then, within perception | 1, 3a |
| identity | appearance only; recognition by whoever views it | 1, 3a |
| exposure | real physics — dark means black, slow loses motion | 1 |
| real media | never captured; a stage or screen photographs as its description | 3a |
| the verb | `photograph`, new, one word | 2 |
| private extents | the holder's rule | 4 |
| across epochs | one command; the dynamics change | 5 |
| as evidence | admissible in-fiction, weighed like testimony; never in conduct cases | 7 |

## 8. Open

1. **How a photo is stored** — a frozen perception snapshot on the print: the plan's question.
2. **Digital metadata** — does a digital photo carry when and where it was taken (stronger evidence, easier to
   verify)?
3. **The recording thread** — the general purpose of recording, what it can and cannot do, the other media
   (sound, film, the recorded performance), and the trades that rely on recordings; this slate is its first
   step.

## Cross-references

- [performance-slate](../world/performance-slate.md) · [visual-arts-slate](../world/visual-arts-slate.md) — the
  rule this sits on
- [paper.md](../../subsystems/paper.md) · [printing-slate](./printing-slate.md) — the frozen thing-text, the
  negative's fixed cost
- [light.md](../../subsystems/light.md) · [perception.md](../../subsystems/perception.md) ·
  [belief.md](../../subsystems/belief.md) — what a camera can see and who is recognized
- [journalism-slate](../society/journalism-slate.md) — photojournalism, and the recording instrument
- [broadcasting-slate](./broadcasting-slate.md) — television and the recorded program, the harder media

## 9. ⭐⭐⭐ "Photographer," and off-page work **[DECIDED — the owner; lens pass]**

The owner: *"One thing is how to handle the ambiguity when we say 'photographer' in the game. Do we mean the
fictional kind or the real-life kind, because they both exist and are two different disciplines … or are they?
Is a real-life photographer actually a fictional photographer automatically, because they can show deeds that
prove their ability? My gut says no, because they're not really the same skill — one's gameplay and one's using
actual cameras. But then there's even more reason why we need to disambiguate them. Maybe even coin a new term
for 'real-life media producer' in the game's jargon that we can use in code and content."*

### Not the same skill, but bridged **[DECIDED — lens 1]**

- **Understanding transfers.** In-world photography runs on real physics, so a real photographer already
  understands it and **can pass the in-world photography exam on day one** — the tech tree's understanding
  layer, however it was learned ([assessment-slate](../society/assessment-slate.md): one student model, two
  kinds of evidence).
- **Deeds do not.** In-world competence is evidenced in the world — framing a scene, timing an exposure in a
  dark room. A real photograph proves real skill, but **the game cannot count it as an in-world deed, because the
  game never judges art.**
- So: **real expertise earns the credential by exam; deeds come only from play.** Not automatic — the owner's
  gut — but a real bridge, which a real photographer will likely cross faster than anyone.

### Three kinds of people

| who | what they do | how the game knows them |
|---|---|---|
| **a tradesperson in the fiction** | a character practicing photography in the world | the **Discipline** — deeds in the world, and exams |
| **an author** | someone who writes the world's content — rows, places, code | the authoring record; the tech tree's author credentials |
| ⭐ **an off-page artist** | a person whose real work enters the game — a musician streaming, a painter uploading, a photographer, a streamer | **audience reception**, never a judgment of the work; Disciplines only for the staging around it |

### ⭐⭐⭐ The term: off-page **[DECIDED — lens 2]**

From the owner's own doctrine — *"performance is explicitly not on the page … the performance happens off the
page"* ([performance-slate](../world/performance-slate.md) § 0). In a text game **the page is the game's own
medium**:

- **off-page work** — real-world creative work brought into the game: a real photo, a real performance, a
  stream;
- **an off-page artist** — the person who made it;
- **on-page** — anything the game itself renders, so **an in-world photograph is on-page**.

Short, from the doctrine, plain in content (*"an off-page photograph hangs in the gallery"*), usable as a code
flag (`offPage`), and it says the important thing on its face: **off-page work is the artist's, and the game
never touches its content.**

### What it does to the word

- **In the game, "photographer" always means the in-world trade** — a Discipline holder. A real photographer is
  **an off-page photographer**, and their work off-page work.
- ⭐ **Disciplines name in-world crafts only** **[DECIDED — lens 1]** — no Discipline exists for off-page art,
  because the engine cannot measure it. **An off-page artist's standing comes from audience reception and
  credentials**, and the game measures **the staging around** their work as a Discipline — a streamer's craft
  measured by agendas kept ([broadcasting-slate](./broadcasting-slate.md) § 7) is exactly this.

### The rest of the lens pass

- **Expression** — off-page artists grow in-game through the staging around their work; their art stays theirs.
- **3a Immersion** — off-page work appears in the fiction framed (a photograph on a gallery wall, a performer on
  a stage), and in prose is just *"a photograph"*; ⭐ **off-page work carries the out-of-fiction mark in the
  interface** **[DECIDED — lens 3a]**, the flag streams carry — a viewer can always tell it is a real person's
  real work. **3b Participation** — real artists join on their own terms, and may also take up the in-world
  trade: two roads, both open.
- **Values** — what counts as good off-page art is never the engine's call; the audience decides.
- **Continuity** — off-page work persists as media, independent of any Discipline.
- **Economy** — off-page artists earn through tips, patrons and the audience; in-world photographers through
  their trade. ⭐ **Off-page work earns standing only if it is original** **[DECIDED — lenses 6, 7]** — the
  existing rights rule: labor standing is for original work only, and the platform never rewards uploading
  someone else's.
- **Governance** — the engine never judges art (*the engine measures, people value*); **authorship is attested
  by whoever brings the work in and challenged through notice-and-takedown**; a false claim of authorship is a
  conduct matter; what may be shown publicly is the visual-arts slate's open moderation question.

| question | answer | lens |
|---|---|---|
| real vs in-world photographer | not the same; real expertise earns the credential by exam, deeds only from play | 1 |
| the term | **off-page** — off-page work, off-page artists; on-page is what the game renders | 2 |
| "photographer" in the game | always the in-world trade; a real one is an off-page photographer | 2 |
| Disciplines | in-world crafts only; off-page artists gain Disciplines only for the staging around their work | 1 |
| in the interface | off-page work carries the out-of-fiction mark | 3a |
| standing | only for original off-page work | 6, 7 |
| authorship | attested by whoever brings it in; challenged by notice-and-takedown | 7 |
