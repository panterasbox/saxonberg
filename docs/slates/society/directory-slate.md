# Directory slate — `who`, the profile, and lists of people

> **Status: UNBUILT — DESIGN CAPTURED 2026-11-20** from a design conversation with the owner. Nothing
> here exists yet; the shipped `who` (a global online list) and the IP-derived country of origin are
> what it replaces (§ *Collisions with what shipped*).
> **Left:** the Post's directory (the floor, listings, sections, paid prominence) · the six layers
> (listing · vocabulary · directory · entries · holder + `who` · code) · `~/profile` and the `profile`
> verb · lists of anyone, with recorded provenance · the meaning line, opinion vs fact · the law of
> published lists and who enforces it · sealed anonymous lists · resolution order, collisions,
> impersonation, name changes · retiring the IP country.
> **Size:** a build (kernel-led: two document kinds, one holder, the `who` and `profile` verbs), with
> the Post's directory as its first consumer.

Related: [journalism-slate § the Saxonberg Post](./journalism-slate.md) (the publisher),
[press.md](../../subsystems/press.md) (publishing as substrate; the anonymous press room),
[contacts.md](../../subsystems/contacts.md) and [social-graph.md](../../subsystems/social-graph.md)
(the lists and notify groups this generalizes), [belief.md](../../subsystems/belief.md) (introductions
and disguise), [chronicle.md](../../subsystems/chronicle.md) (deed vs claim; the name history),
[document-store.md](../../subsystems/document-store.md) (the tree the profile lives in),
[measurement.md](../../measurement.md) (the mirror; no score on a person),
[moderation-slate](./moderation-slate.md) § 23 (jurisdiction), the **mql-anchors slate** (build-3's
`reqs/listing-resolution` branch, in requirements as *naming-overhaul* — `online` goes, relations are
`~name`, players are `@id`).

---

## 0. Why this exists

Build-3's MQL anchors design removes every anchor but `me`: everything a query reaches, it reaches
through a relation to the asker. **`online` goes, intentionally**, and the owner named its
replacement: *who is online is tracked by players, who keep and compete over lists.* But players will
not cultivate a list for everyone, so the game still needs **a public `who` anyone can use on their
first day.** The owner: *"this sounds like the perfect job for our Saxonberg Post to publish the
first public online people directory."*

⭐ **The shape:** `who` stops being a global registry and becomes **a verb that renders any list of
people some holder keeps.** Your default `who` points at the Post's directory; every other list is
somebody's publication.

## 1. Foundations **[DECIDED — the owner]**

- ⭐⭐ **A name on a published register is public.** The introduction rule is **perception in a
  room** — you do not know my name when I walk in because you have not heard it — never privacy.
  *"My name isn't private and it's not some precious PII we want to protect, it's my name and I chose
  it."* The register shows names to everyone, met or not.
- ⭐ **Why the register still never shows faces or places:** introductions and disguise are
  *mechanics*. A register that showed appearance or location would let anyone match a name to a face
  across a room, and both would stop meaning anything.
- ⭐⭐⭐ **Everyone in the game is a character, and everything the game does keys on choices you made
  about that character.** A female avatar is a choice; "single" is a status in the fiction you chose.
  ⛔ **Nothing, anywhere in the game or outside it, is keyed on real-life traits nobody chose** — real
  sex, race, age, real-world location. *"No one asked to be female in real life and we don't do
  things with people based on things they didn't choose."*
- **Country of origin is private unless published.** It exists for one reason: political content
  is kept from crossing political boundaries, so **opting into that content asks you to share your
  country.** Otherwise nobody sees it.
- **The "single female" list is the case meant to bait the griefer** — risky, but the
  social machinery around it is supposed to rebuff it.

## 2. The Post's directory — what people want from it

Real directories tell us what is wanted:

| precedent | what it shows |
|---|---|
| **the white pages** | everyone listed by default; being *unlisted* cost extra — **the floor** |
| **the yellow pages** | listings by category, businesses paying for prominence, which paid for the free white pages — **the economics** |
| ⭐ **the personals column** | *"SWF, 30s, seeks…"* — **the "single female" list done right: the subject wrote it** |
| **Who's Who, the Social Register** | listing as status (Who's Who sold copies to the people in it; being dropped from the Register was a scandal) |
| **city directories** | compilers walked door to door gathering listings — a real trade |

⭐⭐ **If the public list is rich, the demand for private ones shrinks** (the owner). Players have
wide discretion to publish whatever they want about their characters that people may want to
aggregate or search; a search runs against what each person chose to publish, so **consent is built
into the data.**

**The product [LEAN]:**

- **The floor, free** — everyone present: **name · their own line · status** (idle, engaged, *do not
  disturb* — a status, never invisibility) · **"here since"** (a fact from the record) · anything
  else they chose to publish.
- **Listings, free** — whatever each person publishes on their profile (§ 4).
- **Sections** — trades, guilds recruiting, mentors on duty, lessons offered, the personals.
- **Paid prominence**, marked as advertising, **in sections only, never on the floor** — the Post's
  first revenue, as the yellow pages paid for the white.
- **The white pages include everyone with a published profile, not only the present** [LEAN] — a DM
  almost always has to work, and a directory of the present cannot address someone asleep.

**The Post's pen here is the schema and the sections, never who is present.** It decides which fields
and categories exist and how they are arranged, and may refuse a listing under published standards;
it can never drop anyone from the floor. ⭐ **A register is not reporting**: its facts come from the
subjects (you are on it because you connected; your line is yours), and compiling it is a mechanical
seat an NPC may hold — consistent with the Post's *no synthetic floor*.

## 3. The six layers — competition without divergence **[DECIDED in shape — the owner]**

The owner: competition must come in layers — *"you shouldn't need to write your own set of verbs and
controllers to curate and model and publish your own directory of information, however if the ones
there don't do it, you should be able to like anything else. I don't really want that kind of
divergence though so heading it off with good abstractions at each layer is desirable … hopefully most
of this is expressed as data in the Post's own branch of the document tree."*

⭐⭐ **The listing is separate from the directory**: you publish one listing about yourself; every
directory reads it. Directories compete on how they select, arrange and present people — never on
capturing data (the web's shape: people publish pages, search engines compete to index them).

| layer | what | who writes it | competition |
|---|---|---|---|
| **1 · the listing** | your profile, in **your** home tree (§ 4) | you only | none needed — one listing, read by every directory |
| **2 · the vocabulary** | shared field names: a small core, free tags, publisher-namespaced fields | the core by the platform; extensions by any publisher | proposing fields; a widely used publisher field is **promoted to the core by an observable adoption threshold** (how schema.org and microformats grew) [LEAN] |
| **3 · the directory** | a document in the **publisher's** tree: its sources, sections, columns, order, searchable fields, standards | the publisher | ⭐ **the main arena — all data** |
| **4 · entries** | curated members and annotations | the curator | curation and commentary |
| **5 · the holder + `who`** | one generic holder that reads a directory document and answers its relations; one verb that renders any people relation as a card | nobody — shared | none |
| **6 · code** | a pack subclass for behavior the document cannot express | a wizard | the escape hatch, rare |

**A directory document declares its sources**, any combination of: **present** (the public floor —
open to **every** publisher, or the Post owns the floor and nobody can compete [LEAN]) ·
**submitted** (people who asked to be listed there) · **curated** (entries added by hand, annotated).

- `who` alone renders the default directory (a removable player alias, like `l`, pointing at the
  Post's by address); `who` with any other directory renders that one with its own columns. A search
  is an MQL filter over published fields. **No directory needs its own verb.** Re-pointing your
  default `who` at someone else's list is the highest compliment a curator can get.
- ⭐ **Load on use, never search.** A directory never scans everyone: the present set is known, and
  submitted and curated sources are explicit entries, each loaded by path.
- ⭐ **The mirror falls out of the act**: adding someone to a *published* directory records the
  back-reference on their profile, so *"which lists am I on"* is a read of your own profile.
- **New:** two document kinds (**profile**, **directory**) in the closed vocabulary, one generic
  holder, and `who` rebuilt as the renderer.

**Categories or tags — both** [LEAN]: the fixed core, free tags, and publisher fields, with each
directory deciding which it searches. The tension between a controlled vocabulary and free tagging
is real in library science and is part of the lesson.

## 4. The profile — your first document **[DECIDED — the owner]**

The owner: *"I've been looking for a way to introduce players to the concept that they have a home
directory. For source code and content they don't need to interact with any of this stuff unless they
start acting as labor but the documents tree has utility for consumers and they need to understand at
least their own branch of it."* And: *"I don't want them to have to manually edit this file or know
anything about its structure unless they need to do something exotic … this is a rich yaml doc that
contains all sorts of metadata about the player profile. We want it to be durable; it shouldn't be a
replacement for player state … this is a document lesson, not a yaml or file i/o lesson."* (Finger's
`.plan` is the historical ancestor only.)

**`~/profile`** — a durable document in your home tree, managed through **one verb, `profile`**
(it exists today as *look someone up*; it becomes the read-and-manage verb):

| command | does |
|---|---|
| `profile` | shows yours — every field, and which are published |
| `profile @bob` | shows Bob's published fields |
| `profile set <field> <value>` / `profile unset <field>` | a field (`profile set seeking "a dueling partner, evenings"`) |
| `profile tag <word>` / `profile untag <word>` | free tags |
| ⭐ `profile publish <field>` / `profile hide <field>` | **who can read it, field by field** |
| `profile submit <directory>` / `profile withdraw <directory>` | be listed in a directory's submitted section, or leave it |
| `profile listed` | the mirror — every published directory listing you |

- ⭐⭐ **The document lesson is in the receipts.** Every subcommand ends with one plain line naming
  what happened to the document — *"Saved to your profile at `~/profile`. Only you can change it."*
  · *"Published: anyone can now read your country."* · *"Hidden: only you can read your hours."* The
  player learns durable, addressable, **theirs**, and **readable by whom they decide** by using it.
- ⭐⭐⭐ **The first pen every player holds is their own home.** Power is write access; a player who
  later becomes labor is only getting write access to more of the tree.
- **Per-field publication** [LEAN]: everything but name and line hidden until published —
  *private unless published*, country included.
- **A description, never player state.** The body, inventory and vitals stay in player state. Two
  kinds of field: **claims** (seeking, offering, hours, "single", free text — you set them) and
  **facts drawn from the character** (name, species, the avatar's gender — published *from* state,
  unfakeable). Directories mark the difference — chronicle's **deed vs claim**, and lens 3a's *the
  world does not lie*.

### What it teaches

Printing teaches mechanical reproduction; broadcasting, transmission. ⭐ **The directory teaches the
database and the query** — information science: cataloguing and indexing; **schema design** (which
fields exist decides which questions can be asked); controlled vocabulary vs free tagging;
**querying, in MQL, the game's own language — the medium is the lesson**; and data ethics (consent,
purpose, published vs compiled). The epoch ladder: city directory → telephone book → card index →
**Hollerith's punched cards** (the 1890 US census; his company became IBM) → the database → search.

## 5. Lists of people — permissive, with provenance **[DECIDED — the owner]**

*"If you can put them on a notify group you can list them because it's basically the same mechanic.
And you need to be able to put most anyone on a notify list even if you haven't met them before. If
day one your buddy says 'watch out for the player Biff Tannen they're a fucking dick' I should be able
to put them on my foes list."* Private lists hold anyone, and the people on them never see them.
⭐ What keeps a creep list in check is not who can be listed: **every fact on any list comes from what
that person published, and hiding a field removes it everywhere.**

### Provenance — how you came to know of them

*"Hopefully we could theoretically trace that back … how did my buddy find out about Biff? … what if
you found out about Biff from a wiki or just a fuckin google search? I'm not concerned with modelling
any externality as anything but an externality."*

Every entry records its basis, as far as the game witnessed it:

| basis | recorded |
|---|---|
| **first-hand** — an introduction, a deal, a fight, harm done to you | the act, cited from the record |
| **from someone** — a mention of `@biff` in a message, a shared entry | **hearsay, the teller named** (a player mention is a structured reference, so it is traceable) |
| **from a list or directory** | that list and its curator |
| **by address** — you typed `@biff` | nothing more: you knew it from outside the record |

**The game records only what it witnessed** — a wiki, a search engine and Discord all arrive as an
address you typed, recorded honestly as that.

- ⭐ **It turns permissive listing into source criticism**: *"Biff is on thirty published lists;
  twenty-eight trace back to one person's word, two are first-hand"* — the difference between a
  reputation and a pile-on. The lesson is journalism's: hearsay vs testimony, citation chains,
  circular reporting (Wikipedia's *citogenesis*).
- **Recorded by code, never fakeable** [LEAN, lens 3a] — "first-hand" only ever cites an act.
- **"Stranger" is remodeled**: it no longer limits lists. It goes back to what it means in a room —
  not knowing which face is which name — and *how you know someone* is now recorded on the entry.

## 6. Every player a publisher **[DECIDED in shape — the owner, then LEAN]**

The owner: *"if your existence on a foes list is public then essentially every player is doing what
the Washington Post is doing all the time. And that's fine, but let's then run it through all the
same tests … how do we even know that a foes list actually contains foes … I should also probably be
explicit about what it means to me if other people are going to read it. Well now you're actually
editorializing … do we want this? We've said we're building a system for organizing digital
communities."*

- ⭐ **Yes** [LEAN, lens 3b]: *a system for organizing digital communities* means the community does
  the organizing — thousands of small publishers. **The same law applies to everyone, scaled by
  reach**; the Post has no legal privilege (press freedom belongs to the pamphlet as much as the
  paper).
- ⭐⭐ **A published list states its meaning** [LEAN, lens 7] — one line, in the curator's words, of
  what being on it means. That line decides the law: **opinion** (*"people I don't get along with"*)
  is protected; **a factual claim** (*"people who stole from me"*) carries liability — entries should
  cite first-hand sources, and a false one is defamation of a character. (*Milkovich v. Lorain
  Journal*, US 1990: calling it opinion does not protect a statement that implies a false fact.)
- **The Post's privilege is the floor and nothing else** — the complete, neutral register is why it
  is trusted; its editorial lists compete with everyone's. Where the culture's interest lands — the
  Post, or the long tail of players' lists — is cultural, and both are made possible under one law.
- ⭐⭐ **Aggregated reading yes; lists as votes no.** Seeing the shape of many perspectives with
  their sources is reading. Letting private lists quietly count against someone's reputation is a
  score on a person built from judgments nobody stands behind (Peeple, Klout) — refused by
  measurement.md. Renown comes from acts in the world; putting someone on a list is not an act
  toward them.
- ⭐⭐ **The consumer as one entity appears in governance**: the **law of lists** (§ 7) is
  consumer-chamber law, tier C, checked by labor and capital — **the people in the graph write the
  rules of the graph.** The real-life-trait ban is tier A.

## 7. The law of published lists, and who enforces it **[LEAN]**

1. ⭐ **The listed person controls the facts; the curator controls the words.** Facts come only from
   the floor and the subject's published fields, read live — hidden means gone from every list.
2. **Every published list carries its curator's name** (or a masthead).
3. **The mirror** — you can see every published list you are on.
4. **A right of reply** — one line of your own beside your entry on anyone's list.
5. ⛔ **No real-life traits anywhere** — the vocabulary has **no field** for them, so no schema can
   express them (a wall); a tag or annotation that says it anyway is a conduct violation.
6. **Annotations are speech**: a false, damaging claim about a *character* is defamation, a civil
   case in court under the polity's press law (tier C); an annotation restating what the subject hid,
   or targeting the person behind the character, is doxxing or griefing — the conduct track.

| layer | catches |
|---|---|
| **code** (a wall) | facts only from published fields; hidden = gone everywhere; names on every published list; the mirror; no real-life-trait vocabulary; provenance recorded |
| **the publisher** | its own published standards across its own directories |
| **moderation, by jurisdiction** | a published list lives in its publisher's tree, so moderation goes there first (moderation § 23's information domain); appeal to the Compact always |
| **the court** | defamation of a character; press-law disputes |
| **reputation** | ⭐ how the "single female" bait is rebuffed — the people on it see it, reply beside their entries, hide fields so it empties, react to its curator in public; rival lists compete it out of attention |

**Anonymous lists — sealed, not hidden** [LEAN]: the journalism slate's *seal, don't hide* and the
anonymous press room. The curator's identity is sealed and the court can unseal it in a case; readers
see a list is anonymous.

## 8. Reaching people at a distance

The owner: *"the Post … is gonna be the go-to default for targeting people at a distance via MQL …
why not just use the global list every DM, it's got everyone? The only real time that works against
you is name collisions, which are very real … names are most explicitly not unique in our game."*

- ⭐ **Resolution by closeness** [LEAN, lens 2]: a typed name resolves **here → your own relations
  (contacts, notify groups, party, guild) → your default directory.** A closer relation wins a
  collision, so curating your lists pays off directly. Equally close candidates bring a choice, never
  a silent guess.
- **Collisions only bite when you type a name**: lists store people **by id**, and a mention
  carries the id, so hearsay reaches the right Biff. On the register, two Biffs are told apart by
  their lines, the id when exactness is needed, how you know them, and **"here since."**
- ⭐ **Non-unique names kill name camping** — there is nothing to claim first. The cost is collisions,
  paid at typing time.
- **Impersonation** — a throwaway named exactly like you — is made obvious by the floor ("here since"
  yesterday, an empty profile, a name identical to someone's of months) and is a conduct violation;
  the record shows when the throwaway was made.
- **Name changes** [LEAN]: possible, never impossible. Lists key on ids, so **a new name escapes no
  reputation**, and the friction only protects recognition and the record:
  - a **published notice** — real name changes were published in the official gazette (the London
    Gazette still prints deed-poll notices); here the Post or the gazette prints it;
  - the **old names stay on the record** (the chronicle's append-only ledger — *formerly known as*);
  - the **old name shown beside the new** for a while;
  - a **cooldown** between changes. Whether it costs anything is open.

## 9. Where others went wrong

| who | tried | failed because | our answer |
|---|---|---|---|
| **Facebook** | owned the social graph, monetized it through an algorithmic feed | attention diverged from users' interests; the measurement was hidden; Cambridge Analytica | the graph is players' data in their own homes; no attention business; the mirror |
| **Facebook's governance votes** (2009–2012) | users voting on policy | binding only at 30% turnout; 2012 turnout was well under 1%, and the votes ended | standing-weighted continuous conviction in a chamber of people who show up |
| **Google+** | real names required (the "nymwars") | punished people with reasons not to use legal names | chosen names; nothing keyed on real-life traits |
| **Twitter shared blocklists** (2015–) | subscribing to others' block lists | mistaken inclusion, no stated criteria, no source, no appeal | the meaning line, provenance, the mirror, the right of reply, the court |
| **Bluesky moderation lists** | public lists anyone makes and subscribes to | lists used for targeting, some named with slurs; seeing and reporting lists you are on came after | the same tools with the mirror and the law built in from the start |
| **Klout, Peeple** | scoring or rating people | a number on a person nobody stands behind | no score on a person — aggregated reading, never votes |
| **MySpace Top 8** | a public ranking of your friends | endless drama | ⭐ arguably a success — status (Schell #90) in action; public lists of people will be dramatic |
| **FOAF, XFN** | open social-graph standards | nobody had a reason to maintain the data | the profile is useful on day one — it is how `who` and every directory find you |

**Our advantages:** the record (traceable sources, citable acts) · chosen identities and the
real-life-trait ban · no attention business on the graph · the mirror · open source and exit · and
the backstop the owner named — **the Compact's balance of three**: if lists become a mob weapon, the
people who bear the cost legislate; capital cannot buy the outcome and labor cannot impose it.

## 10. Lens pass

1. **Pedagogy** — information science (§ 4): indexing, schema design, controlled vocabulary vs
   tags, querying in MQL, data ethics; and source criticism (§ 5): hearsay vs testimony, citation
   chains, circular reporting, opinion vs fact. ⭐ The one trade whose tool is the platform's own
   query language.
2. **Expression** — the profile's fields and line are expression slots (Schell #97: expression works
   by enumerating the slots); curating is publishing. Ordinary case, no code: fill in a profile,
   publish a list. Bespoke: a rival schema; code only as the escape hatch.
3. **3a Immersion** — the directory desk, the compiler, the published name-change notice, the
   printed edition for towns the aether cannot reach; facts vs claims marked; provenance never
   faked. **3b Participation** — a directory editor, an advertising seller, compilers, curators, the
   welcome committee (greeting newcomers meets the civic-service criterion); *can the polity do
   something we did not want?* — rival directories, scandal lists, society pages.
4. **Values** — what the floor shows; status, never invisibility; paid prominence in sections only;
   private unless published; choices only, never real-life traits; no score on a person.
5. **Continuity** — city directory → telephone book → card index → punched cards → database →
   search; the same commands answer in every epoch.
6. **Economy** — produces findability; paid by advertising (yellow pages for white); consumes
   curators' attention; nothing minted for curation. The demand is there on day one — a newcomer
   must find someone to talk to.
7. **Governance** — refusing a listing judges a person: criterion = the publisher's published
   standards, appeal = its public editor then the court. The law of lists is consumer-chamber law
   (C); the real-life-trait ban is A. Nobody can be dropped from the floor.

**Schell (3rd ed.)**: **#96 Friendship** — friendships need a way to break the ice and something to
talk about; "here since" and newcomers' visibility break the ice, the line starts the conversation.
**#97 Expression** — the slots. **#90 Status** — on a list, status is order and inclusion; the
Social Register and Top 8 were status. **His Community lens** — serve newcomers, regulars and elders
differently and make community property: the floor for newcomers, curated lists as elders'
property. **His Griefing lens** — answered by *the subject controls the facts*. ⭐ **It is lame if it
is a census; it is good if it is a paper with a society page** — a floor anyone can trust, and above
it a market of lists people care about getting onto.

## 11. Collisions with what shipped

- **`who`** ([who.yaml](../../../packages/content/platform/content/platform/cmd/social/who.yaml)) lists
  everyone online with *"country of origin always shown"* and filters `--country`. ⚠ **That country is
  resolved from the player's IP address** (`SocialLogic` · `presenceCountryFor` →
  `ConnectionApi.originOf`) and also rides presence notifications. Under § 1 it becomes **private
  unless published**, shared only when opting into cross-border political content; the `--country`
  filter goes with the global list.
- **`profile`** is one of the 23 views that scoped to `online` (the mql-anchors slate); it moves to
  `@` addresses and relations and becomes the profile verb (§ 4).
- **Contacts and notify groups** are the private lists § 5 generalizes; their ids-only storage is
  already the rule.
- ⚠ Verify that a fresh, non-author player can write their own home through the document gate.

## 12. Open

1. **The floor's defaults** — name, line, status, "here since" for everyone present; everything else
   opt-in.
2. **Whether a curator may hide each entry's source** on a published list (default shown; hidden
   visibly).
3. **Sharing an entry** as its own act, so hearsay survives forwarding — or a mention is enough.
4. **Defamation of a character** as an actual civil wrong, or in-fiction speech harms left to
   reputation.
5. **Name-change cost**, and the cooldown's length.
6. **The core vocabulary's first fields**, and the adoption threshold for promoting a publisher's.
7. **Where the newcomer flow teaches the profile** (lean: set a line and see it on `who` in the
   newcomer flow; the rest found).
