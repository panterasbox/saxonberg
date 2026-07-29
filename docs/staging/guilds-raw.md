# Guilds: vocations as institutions (raw material)

**Staging: brainstorm capture for the guild design session — not a
slate, not requirements.** The brief: guilds = vocations modeled as
institutions. Constraint inherited from everything else: institutions
must be *composed from shipped substrates*, not a parallel engine.
The pleasant surprise of this pass: nearly every organ a guild needs
already exists — the guild is an integration, the way Dave's Bar was.

**Governing principle (user, 2026-07-28): guilds are designed as
pure game design — explicitly NOT for study.com or gamification
priorities.** Where good game design and gamification pull apart,
game design wins, every time. If guilds end up serving gamification
not at all, that is an acceptable outcome (so much of the rest of
the game serves it); any gamification value is a downstream windfall
consumed by the vertical *after* the design is done, never an input
that shapes it. Everything in this doc is to be read under that
rule — anything below that smells like vertical-serving is a
downstream note, not a design input.

**Prior art — read first.** A guild design pass already landed
(2026-07-01) in `docs/slates/builds/advancement-slate.md` (§ Guilds +
§ Declared focus) with settled decisions this doc must respect, not
re-litigate: guild = **institution over the Discipline Catalog**
(map vs. institution; no hardcoded classes — guilds ARE the class
system); **declared focus = deliberate practice** (a learning-rate
*gradient*, never a gate; focus-tagged transcript, prospective-only,
honesty firewall intact); **open canon** (guilds sell access/
sequencing/instruction/credential — brands fork the institution, not
the knowledge); the **form/join/earn wall** (party/guild/corp are
three different relationship kinds); and the **governance boundary**
(guilds are Groups — private institutions — NOT Offices; powerful ≠
sovereign). Everything below is *additive* — the institutional flesh
(rank, hallmark, halls, portfolios, dues, arbitration) on the
already-designed skeleton — with conflicts flagged inline.

## The one-sentence thesis

> A guild is the institution that turns a *measured* competence into
> a *recognized* vocation — it cannot make you good (bands are
> honest), so it sells everything else: rank, legitimacy, knowledge,
> tools, work, fellowship, and a name.

The load-bearing distinction: **band vs. rank.** Band is derive-on-
read, honest, nobody's to give. Rank (apprentice / journeyman /
master) is a *social act* — conferred by an institution, gated on
bands and deeds but not reducible to them. That gap between measured
and recognized is the guild's entire product, and it's honest: real
professions work exactly this way (the license is not the skill).
Fungibility-follows-legitimacy already covers it — rank is a
specialized currency; if you could buy it, it would mean nothing.

## Organs a guild is made of (all shipped)

| Guild organ | Existing substrate |
|---|---|
| Legal person, accounts, payroll | `Business` Idea (proprietor edge, positions, roster, account) |
| Membership + audience | Group provider (the Party precedent — own your roster, register a `guild:<path>` GroupRef) |
| The hall | Parcel title + a Warren/locality; the lounge pattern for the social floor |
| Rank & internal seats | Rank as recognized tier; Guildmaster/Warden as *charter-internal* roles on the guild's own Group/Business machinery — NOT the Office substrate (that's government's; the governance wall stands) |
| Certification | The credential substrate — **guilds are issuers**: guild papers ride the same claim/deed ladder as external credentials, with graded provenance |
| Knowledge custody | Recipes + RecipeKnowledge (known-of → can-make), scripts in the document store, the demonstration-capture teaching ladder |
| Teaching economy | command Discipline (teaching pays), producer standing, master-apprentice formation (already shipped in combat formations!) |
| Work | Employment engine + the contracts/gig board (MR !149) — the guild as labor broker |
| Quality marks | CraftedMixin maker's mark + a guild **hallmark** countersign; grade verdicts |
| Tools | DurableMixin lending library — guild tools, wear-tracked, custody vs. ownership (the consignment pattern inverted) |
| Dues & treasury | Banking (accounts, terms, remittance splits) |
| Deliberation | A guild board on the forums Subject layer; the **argument organizer for standards debates** |
| Internal justice | Accountability rows + arbitration-before-courts (the pre-judiciary consumer) |
| Identity | StatusMixin presence affix ("Journeyman Electrician"), livery/theming, the chronicle portfolio |

## Ideas worth going crazy on

- **Promotion by portfolio, not exam.** The masterpiece
  (Meisterstück) generalized: promotion = a judged body of
  *receipts* — the smith submits the piece (renderVerdict), the
  medic submits the case log (chronicle deeds), the teacher submits
  the graduated cohort (command/producer records), the broker
  submits closed chains-of-title. The world already mints every
  receipt; the guild's judging panel is the drama. Judged by
  masters, argued on the board, recorded category-first.
- **Guilds gate authorization, never ability.** You *can* wire the
  substation at band; the guild decides whether you *may* do it for
  pay on Foundry Row (parcel-law tie-in, the licensure mirror).
  Honest, teaches how licensure actually works, and creates the
  unlicensed-competent outsider as a legitimate dramatic role.
- ~~The externship seam~~ **[DOWNSTREAM NOTE — not a design
  input.]** The idea (external credential → guild standing shortcut;
  the conferral scene staged at the guildhall) is a *vertical*
  staging idea that may consume guilds after they exist. Under the
  governing principle it must not shape the guild design: if guild
  admission/rank mechanics happen to have a door an external issuer
  can knock on, the vertical uses it; the door is never built for
  the knock. Moved to the vertical's side of the ledger
  ([study-com-strategy.md](../study-com-strategy.md) territory).
- **Charter as data; schism as feature.** Player-foundable via a
  chartering act (governance registry, the Party durable-lifetime
  precedent); the charter is rules-as-data (dues rate, rank gates,
  hallmark standards). A schism = fork the charter and walk — story
  machine gold, and the argument forum already models the dispute
  that precedes it.
- **Labor vs. capital, built-in.** Guilds (member institutions) vs.
  corpos (authored capital marks) is a real political axis the
  world inherits for free — chamber politics, sponsorship offers a
  guild can refuse, the corpo trying to buy a hallmark it can't
  earn.
- **The guild as newbie funnel.** Katie is the threshold-guardian
  exemplar; a guild porter NPC per hall does the same for each
  vocation — the first person who takes your ambition seriously.
  Daily loops (wishbook) are guild-shaped already: rounds, office
  hours, rotations, listings — a guild is *who assigns them*.
- **Rank has teeth socially, never mechanically.** A master's word
  moves regard, their hallmark moves prices, their seminar fills —
  all social-graph and economy effects, no stat buffs. The moment
  rank grants ability, band honesty dies.
- **Magic guilds are the same institution** with the liberty-zone
  twist — carefully scoped against the settled **open-canon** rule:
  established knowledge is never proprietary (guilds sell access/
  sequencing, not the canon). The live tension applies only to
  **genuinely new frontier findings** (vignette 8): between
  *discovery* and *publication* there is an honest interval where
  the finding is yours because nobody else has done the work. The
  hermetic order stretches that interval; the academy collapses it
  for renown (publication = the renown play; hoarding = the
  capability play). Both charters valid; canon stays open once
  taught. Whether the interval needs a mechanical bound is a
  design-session question.

## Tensions to design against (flagged now, decided later)

- **Gatekeeping vs. the open world:** authorization-gating must not
  become content-gating for non-members (the unlicensed path stays
  playable — fines and reputation, not walls).
- **Guild dues are chosen-haftas** — consent + exit (the motivation
  entry's rule applies verbatim; no absence-punishment, standing
  fades honestly).
- **Sybil/capture:** a guild is a governance surface (the griefing
  entry's recursive rule) — charter design must assume hostile
  founders eventually.
- **Don't mint a parallel advancement.** Rank consumes bands/deeds;
  it never produces them. The moment a guild grants transcript
  evidence, the honesty firewall is breached.

## Handoff

This doc is input, not conclusions. The design session owns: the
charter schema, rank vocabulary, founding mechanics, the
authorization-law tie-in, and which one guild ships first (the
electricians of Foundry Row have the strongest wishbook support;
the healers have the strongest cohort).
