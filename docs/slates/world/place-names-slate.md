# Place names slate — who names what, and the names we keep

**Status:** slated 2026-11-16, from the navigation server pass (*Terminus ›
Terminus* in the crumbs) and a conversation with the owner.
**Size:** a design, then content: the framework now; the names come with
the peoples conversation and the content builds that rewrite the world.
**Left:** the owned-names cleanup before launch · the name of the region
above Terminus · why the Eternal City is eternal · the sky's names · every
name that waits on the peoples conversation.

## The ask **[the owner]**

*"Terminus and Eternal University are two names I'm committed to using …
Terminus belongs to a greater realm that needs a name, and the planet needs
a name, as well as the star and any other celestial bodies. Individual
neighborhoods also need names, so we drill in as well as bubble out …
I'd rather not try to name everything right now. But if we need to rename
one thing we can, but that might mean coming up with a broader framework."*

And: *"I want to have a wide array of different registers used for game
content — we don't need to decide on just one thing and shouldn't."*

## ⚠ A word clash

In this project a **realm** is one hosted world — a whole server's
database. The polity or region Terminus sits in needs another word (a
nation, a kingdom, a province, a coast) so that *the realm's name* never
means two things.

## The fixed points **[DECIDED — the owner]**

- **Terminus** is the city. It is the end of the line — the TPA's
  terminal is there.
- **The Eternal City** is what everyone calls it. Hence **Eternal
  University**, which takes the city's nickname.
- Both names are homages to *End of the Line*, the LP MUD, whose hub was
  Eternal City (below).

⚠ Today a region-tier Locality is also named *Terminus*. The city keeps the
name; **the region above it is the one place that needs a new one** — from
the peoples conversation. Until then the crumbs tell them apart by kind.

**Open seed — why is it eternal?** Its founding lore, and something the
university would teach. Shapes: it has never fallen · it is the oldest
place still lived in · every line ends there, so everyone passes through
and it is never empty · something older and stranger.

## Who names what **[DECIDED in shape]**

| scale | examples | who names it | altitude |
|---|---|---|---|
| the sky | star, planet, moons, other bodies | us, once (per people — below) | invariant for our base pack; another realm names its own |
| the land | continents, seas, rivers, mountains, coasts | the base pack | grain — physical, slow to change in fiction too |
| polities | the nation, provinces, a city as a government | us at launch, then **the polity** | **title** — people rename their own countries (lens 7) |
| settlements and neighborhoods | districts, villages, quarters, streets | each content pack | grain |
| venues | buildings, shops | trade and venue packs | grain |

## The criteria a name passes **[DECIDED in shape]**

1. **Nobody else owns it** — no real place, no famous fiction. A name a fan
   would want for their own homage stays free.
2. **Unique at its scale, within its language.** A duplicate is a defect
   only when it breaks something a player does (the rule the navigation
   pass used for *Terminus › Terminus*).
3. **It is a keyword.** Players type it and the query language matches on
   it: short, typable, no diacritics required, and no shared opening with
   another name at its scale, so *which one?* prompts stay rare. Ours alone.
4. **It is derivable** (lens 1). A name says something the world can
   explain — what the land is (Greywater, the Weeping Moor, Hollow Mere),
   what it is paved with, who lived there first. Place names as a small
   lesson in toponymy.
5. **Coherent within a culture, diverse across the world.** The world is
   meant to be very diverse, in many registers — invented languages,
   English descriptive, comic, archaic. Within one people's land the names
   sound like one people; across the world they should not.

## ⭐ A place has more than one name

Names fall out of **peoples**, so a place has as many names as the peoples
who know it — an endonym and its exonyms. Terminus and *the Eternal City*
are the first case. The sun may have no single name: the university's
almanac uses one, each people its own. Rows already carry alternate names
and keywords; ⚠ the uniqueness rule (criterion 2) then holds per language,
not globally, and that is the engineering duty this adds. (Whether a
viewer *knows* a place by its other names is a belief question —
[belief.md](../../subsystems/belief.md) — not decided here.)

## What waits for the peoples conversation

Most naming does: **the planet, the sun, the moons, the region above
Terminus, the land and the waters, the towns and neighborhoods.** Each
comes as a set, from whoever lives there. The peoples conversation (who
lives where, with what languages and histories — the owner: *"a very very
diverse world, and none of the current content models that"*) has no slate
yet; [species-slate](./species-slate.md) holds only how species *play*
differently.

## The owned-names cleanup **[DECIDED — before launch]**

Names someone else owns, in a public repo, before the launch audience sees
it:

| name | where | source |
|---|---|---|
| Lorien | a month in the shipped calendar (`DefaultCalendar`) | Tolkien |
| Narnia, Cair Paravel, the Lantern Waste | world-seed Localities (test content) | C. S. Lewis |
| Waponi Woo | the sugar island (33 files) | *Joe Versus the Volcano* |

Everything else is placeholder and is replaced by the content builds, which
apply this framework when they write it — nothing else is renamed now.

## End of the Line — the source **[the owner]**

*"I don't mind if we get the rest of our names from EotL if we want, though
I didn't write most of that content. Still, I would hope most of the
authors would appreciate the homage."*

⭐ **Credit it openly** (lens 4): a wiki page on where our names come from,
naming EotL and, where the source records them, each area's authors. The
mudlib is at `~/play/eotl/mudlib` (private).

**Already in the game:** the lounge (EotL's new players woke in *the End of
the Line player lounge* and went down a spiral staircase to Eternal City) ·
the TPA (the EotL Teleport Authority, its hub *the Eternal City Terminal*)
· Dave's Bar · our calendar's months (EotL's ten — Arienle, Teliminus,
Lorien, Ysaril, Karmina, Ingot, Alystos, Gettrellyn, Rozgayn, Blayhrr —
plus Heliune and Brendarn to make twelve).

**What EotL named:**
- **No world, sun, moon or stars** — it framed itself as a hub of *the
  Multiverse*. Ours to coin.
- **"Terminus City"** was a post-apocalyptic city in one area (Arson, 1997),
  not the hub; *End of the Line* had no in-fiction meaning beyond the
  lounge.
- **Eternal City** had no districts, and **each street its own paving** —
  Glass Way (glass), Limbo Lane (pink and spongy), Eternal Way (fog over the
  road), Dimension Drive (plain gravel), Infinity Way, Silver Street, Old
  Road; landmarks: the Heart of Eternal City, the Temple of the Ages, the
  Oracle, Eternal Savings and Loan, Eternal Arms. ⭐ The paving fits our
  ground model (a surface is a material): a street named for what it is
  paved with — Glass Way laid in slag from the glassworks (lens 1).
- **Original regions and towns:** Floridel, Baronar, Westport, Disaster,
  Crimson City, Entesia, Aescbourne, Dyrathea, Naromaar, Nargolia,
  Yxuxacta, Newhaven (streets named for virtues), Nacosin, Bracken, Coral,
  MoeTown. Myth and history (Greek, Norse, Egyptian) are nobody's.
- **Borrowed — avoid:** Lorien, Tanelorn (Moorcock), Trantor (Asimov),
  Aydindril (Goodkind), Culhaven (Shannara), Valdemar (Lackey), Solace
  (Dragonlance), Middle-earth, Star Trek, the Jedi, the Matrix, Hitchhiker's.

**Matches that suggest themselves** (for the content builds, not decided):
Waponi Woo → **Coral** (EotL's had a rainforest, the ocean blue and Coral
Road); Rejection → **Disaster**, or kept.

## Open

1. The region above Terminus — its name and what it is (nation, province,
   coast).
2. Why the Eternal City is eternal.
3. The sky's names, per people.
4. Lorien's replacement month (with the cleanup).
5. Whether the credit page is a wiki page or part of a broader *about*
   surface.

## Cross-references

- [navigation-server-slate](../engine/navigation-server-slate.md) — S14, where this began
- [worlds-slate](./worlds-slate.md) — a body is a biome; the planet's physics
- [species-slate](./species-slate.md) — how species play differently
- [time.md](../../subsystems/time.md) — the calendar
- [ground.md](../../subsystems/ground.md) — a surface is a material
