# Locks, keys and lockcraft — requirements

**Kind:** feature
**Leads from:** kernel — the lock's physics (the secret by technology, matching by shape, the
pick, wear) and the defeat acts are platform substrate. **First consumers, in this build:** every
keyed door that ships today (the dorm, the holdings, Mayfield Row's leases, Rejection's yard door),
the chests that already exist (the Hearthworks pantry chest, the *Hesper*'s sea chest), the
padlock, and a locksmith's shop in Mayfield Row.

A lock today is a boolean and a token match. The bolt refuses and the key excuses — that much is
right and stays — but nothing about a lock can be read, made, copied, picked or broken; a key is
cloned from nothing, lives in your implant as well as your pocket, and *"every story about a lock
is about defeating it, and you cannot defeat one"* ([lock-slate](../slates/builds/lock-slate.md)).
This build makes a lock a made thing with a character, a key a cut piece of brass, and lockcraft a
competence with a real deciding act — **the player's choice of approach**, informed by a reading
whose detail is their knowledge and priced by their hand.

Seeding slate: [lock-slate](../slates/builds/lock-slate.md), with the design session of 2026-11-02
(§ 5 there and below). It sits beside the [assessment-slate](../slates/builds/assessment-slate.md),
whose first consumer lockcraft is — and does not wait for it.

## What the thing is (R1)

**A lock holds a closure shut against everyone but whoever presents the right secret.** Three
parts: the closure, the mechanism, the secret. The **secret's form** decides nearly everything,
and it is the bearer/registered split paper settled the same day:

| secret | it is | who gets in | copied by | revoked by |
|---|---|---|---|---|
| a **shape** (a key) | bearer | whoever holds it | the key, an impression or the code, cut on the right blank | re-keying the lock — every key dies |
| **knowledge** (a combination) | bearer knowledge | whoever knows it | telling, overhearing, watching | changing the combination |
| an **identity** (a keycard; the implant) | registered — the issuer's record decides | whoever the record names | forging the record | one person at a time |

The ladder is the epoch axis (warded → lever → pin tumbler → combination → keycard → implant).
Every defeat — **force · pick · copy the secret · take it · go around** — leaves its own evidence.

## What already exists

- **The bolt and the keyway, composed** — `lock`/`unlock` on doors; *the bolt refuses, the key
  excuses*; a key-holder never unlocks to get in ([boundary.md § Locks](../subsystems/boundary.md)).
- **Keys as credentials** — every key is issued **twice**, into the implant's keychain and as a
  physical key; issuers are a title, a lease and the dorm's provisioning; re-keying is a free mint;
  a master-key method nothing calls, and an authored master ring at Duncan Hall nobody is issued.
- **Two technology names** (pin tumbler, keycard) in a closed list; every lock in the content is
  pin tumbler; a kernel switch writes *"worn brass key"*.
- **What this build composes rather than builds:** quality bands, the maker's mark and a firm's
  brand on made goods; wear by use, never the clock; paint's weathering where weather reaches and
  the corrosion channel; the open/shut state on closures (which names chests); assembly's parts;
  `impress` into wax; the single `cut` verb whose target plans the cut; `analyze` over reading
  rows; concealment and stealth (who notices); sound as a sense; registers for records; founding,
  smithing, brass, steel and beeswax as inputs.
- **In flight:** harbors (build-4) makes a ship's gangway a lockable door whose master hands out
  keys; water supply (build-1) adds the **first lock on a thing** (a padlocked junior turnout) and a
  pump house whose Works keeper holds the key.
- **Disciplines:** none for lockcraft; `stealth`, `awareness`, `guarding` and `forensics` sit
  beside it.

**Therefore what is genuinely new here is:** the secret by technology (a bitting and keyway
profile for shape locks, seeded from the lock's identity), matching by shape, the pick as a
computed act with a floor, reading a lock and a key, the defeat acts (pick, rake, impression,
force), copying on blanks, a register of issued keys, seat-held keys, locks on things and the
padlock, one row per technology, the locksmith's trade, and the lockcraft Disciplines. **Everything
else is reuse** — the reuse ledger is [lock-slate § 6](../slates/builds/lock-slate.md), and the plan
accounts for every row.

## Goals

### The lock
- **A lock's secret is what its technology says it is.** Shape locks carry a physical secret: a
  ward pattern, or a **bitting** (the depth of each cut) on a **keyway profile** (the blank family
  that enters at all). A combination is numbers; a keycard is a record.
- **Keys match by shape.** A specific other key opens a lock if, and only if, its cuts fit — so
  **cheap locks share keys** (three pins at four depths is 64 keys; six at six is 46,656), and a
  thief with a ring of keys can try them. Deterministic: a given key fits a given lock, or never.
- **A skeleton key passes most warded locks**, by the geometry of wards, not by a rule.
- **A master-keyed lock admits two bittings** and is therefore easier to pick.
- **A lock has a character an author sets in rows** — technology, grade, maker, condition:
  - **grade** sets the mechanism (pins, depths, tolerance, security pins) through its technology's
    table — quality is arithmetic;
  - **maker** — the maker's mark and a firm's brand; *"this one is cheap and everyone knows it"* is
    the maker's reputation, read by people;
  - **condition** — wear by use loosens tolerance (an old lock picks and rakes more easily); a lock
    the weather reaches seizes until it is oiled or repaired, and its owner cannot open it either.
- **Every existing lock keeps working**: its identity stays, its bitting is seeded from it, and the
  keys already issued still open it.

### Reading and defeating
- **`analyze` reads a lock and a key**, in detail set by lockcraft knowledge — a novice sees *a
  brass padlock*; a competent eye *pin tumbler, five pins, cheap — it'll rake*; an expert *six pins,
  spools on two and four, four minutes picked, it'll show marks*. Reading a key reads its cuts.
- **A pick is a durative act whose length is computed, never a chance.** Seeded at manufacture: the
  bitting, the **binding order**, the tolerance, the security pins. The time comes from pins,
  tolerance, the picker's hand, the tool, the light and the lock's condition. A novice who cannot
  feel the binding order wastes a **fixed** amount on a given lock. **Below the floor the lock never
  yields**, and the refusal says what lifts it. Security pins false-set a picker below a band (time,
  not chance). **Raking** (`pick … --rake`) opens a lock if and only if its tolerance is loose enough.
- **An interrupted pick drops its pins** — the work is lost.
- **Who walks past is perception**, through the shipped concealment and stealth: close work in a
  doorway degrades hiding as motion does.
- **Every defeat leaves evidence**: a picked lock carries tool marks a lockcraft eye can read; a
  forced lock (`force`) is ruined, loud and plain to anyone; a copied or decoded key leaves nothing.
- **Warded locks are bypassed**, not picked; **a combination is manipulated by listening**; a
  keycard is not picked at all.
- **The deciding act is the player's choice of approach** — pick, rake, impression, copy, decode,
  force, take the key, go around — traded across time, noise, evidence, what must be relocked,
  and what is carried. The engine never chooses it.

### Keys, copies and records
- **A shape key exists only as the physical key.** Lose it and you lose the door; hand it over and
  you hand over the door. The implant's wallet holds only record-based credentials. **Nobody is
  locked out by the change**: anyone whose wallet held a shape key they no longer carry is given
  the physical key.
- **Copying is physically open, gated by supply and skill.** A copy needs the bitting (the key in
  hand, a wax impression, impressioning at the lock, decoding by eye, or the code), a blank of the
  right profile, and a hand that cuts within tolerance — a sloppy copy opens a loose lock and fails a
  tight one. **Common blanks sell anywhere; restricted blanks only from the authorized cutter.**
- **The register records issues, never possession.** Every issuer — a landlord, a title holder,
  the dorm, a Works department, a shipowner — keeps a register of which keys it issued to whom,
  and of every copy cut from a restricted blank. Its owner reads it; a refused player is told **who
  issues keys for this door** (lens 7's appeal). `keys` lists what you have issued; on a record lock
  it revokes one person; on a shape lock the remedy is **re-keying**, which kills every key.
- **A seat holds a key by its holder.** A shape key is issued to whoever holds the seat, recorded
  *in that capacity*; leaving the seat marks it **outstanding** — and a dismissed keeper who keeps it
  still has a working key until somebody re-keys. A record lock names the seat, and access follows
  the seat live.
- **A master key is a key**, issued by the lock system's fiction-side owner (lessor, title holder,
  housing office, Works department) to a seat of its own — never by parcel title. Duncan Hall's
  master ring is issued to the dorm's warden seat.

### Locks on things
- **Any closable container can carry a built-in lock** — a chest, strongbox, cabinet, trunk, cashbox
  — the bolt and the key as on a door, the lock a part of the container that can be swapped or
  repaired.
- **The padlock is a lock that is a good.** Bought, carried, fitted to anything with a **hasp** (a
  gate, a shed door, a sluice turnout, a sea chest); **you own your padlock** whoever owns the gate.
  It can be stolen, moved, sold, picked — or its shackle cut with a tool (force).

### The technologies
- **One row per technology**, any pack may add one: its name and its key's prose, the kind of
  secret, the grade-to-mechanism table, the defeat acts that apply, and its epoch (so a covenant can
  refuse it). Shipped with: **warded, lever, pin tumbler, combination, keycard**. A lock names its
  technology by reference; a misspelled technology is refused when the content is checked, never
  left as a door that opens for nobody.

### The trade
- **The locksmith makes and services locks**: lock bodies, wards, levers, pins and springs from the
  founder's brass and the smith's steel; key blanks by profile; cutting; re-keying (a paid service
  that costs pins and an hour — no longer a free mint); repair; opening for someone locked out.
- **Keys are cut by the one `cut` verb**, the blank planning the cut: `cut blank --from <key>`
  duplicates, `cut blank --code <n>` cuts from a code, `cut blank at <door>` is **impressioning**
  (filing a blank against the pins' marks at the lock — slow, and you leave holding a key).
- **A wax impression is the shipped `impress`**: `impress key on wax`.
- **A locksmith's shop in Mayfield Row** — the street whose leases issue keys, where re-keying
  between tenants is the shop's steady trade — with a locksmith on a rota.

### Lockcraft
- **Five Disciplines**: **lockcraft** (the root), **reading locks and keys** (knowledge),
  **picking** — the hand (skill), **impressioning** (skill), **keycutting and fitting** — the trade
  (skill). Earned by doing until the assessment build adds exams; the finer tree is the deferred
  tree pass's.
- **A lock's floor reads the hand; a reading reads knowledge.**
- **Refusals name only what exists**: today *"this lock wants a finer hand than yours — practise
  on easier locks"*; when the Locksmiths' Guild examines (the assessment build), the same refusal
  names it.

## Non-goals

- **Exams, the Locksmiths' Guild as an issuer, the exam interface** → the
  [assessment-slate](../slates/builds/assessment-slate.md) build. Lockcraft is its first consumer;
  neither waits.
- **The finer lockcraft tree** → the deferred tree pass (assessment-slate § 10); an unreviewed
  pilot draft exists.
- **Warrants and the constable** → [policing-slate](../slates/builds/policing-slate.md). A warrant
  compels the key-holder to open or authorizes force; until then the counter-power is picking and
  forcing.
- **Defeating a keycard** (forging the record) → nowhere in this build; it is another trade.
- **Disambiguating a verb by its target** (which would give `pick apples` back) → the verb-collision
  ladder's rung 7, its own cross-cutting work; recorded in the lock slate.
- **The guild's restricted-keyway licensing as a polity rule** → tier C, when a polity wants it.
- **Arcana's ward** → the arcana pack, as a technology row, when it wants one.
- **Moving every chest in the realm onto a lock** → content passes; this build ships the two that
  exist.

## Placement

- **Kernel:** the lock's physics — the secret by technology, the bitting seeded from the identity,
  matching by shape, the pick-time formula and floor, wear and seizing; the defeat acts (`pick`,
  `force`); reading through a `lock` reading row; the register of issues and seat-held keys; locks
  on closable containers; the padlock and the hasp; the technology row and its check. Doors, chests,
  ships and sluices across the realm use it with no common pack.
- **`trade-locksmithing`** (`/trade/locksmithing`): lock making, blanks, the cutting bench, keys cut
  through `cut`, re-keying and repair as services, the locksmith's seat and recipes over founding and
  smithing.
- **Terminus** (Mayfield Row): the shop, the locksmith, the rota.
- **Eternal University** (Duncan Hall): the master ring issued to the warden's seat.
- ⭐ **A second locksmith, a second technology, a second padlock are rows.**

## Collisions

- **`pick`** moves from `harvest`'s alias to the lock (the collision ladder: fruit has its own verb,
  a lock has no other word; unify, never-afforded-together and target dispatch all fail). The
  farming help and examples that say `pick` change to `harvest` in the same build.
- **`cut`** is not a collision — it is the shipped one-verb protocol, and a blank is its third
  cuttable thing.
- **The implant's keychain** stops holding shape keys — a real behavior change for every player with
  a home, softened by issuing the physical key to anyone missing one.
- **Matching moves from identity to shape** — another key can now open a cheap lock. Every existing
  lock is authored or seeded at a grade; the dorm and holding doors are **fine** or better so a
  neighbor's key does not open your room by accident (an explicit choice, not an accident of seeding).
- **Water supply's padlocked turnout** is the first lock on a thing: one model — *a padlock is a good,
  a closure with a hasp accepts one* — and whichever build merges second reconciles to it.
- **Harbors' gangway** issues keys through the same register (the shipowner is its issuer).
- **Duncan Hall's authored master ring** is finally issued.
- **The Hearthworks pantry chest and the *Hesper*'s sea chest** gain locks.
- **Mayfield Row** gains a shop; its landlord's leases issue keys through the register.

## Surface decisions

The design session's answers, 2026-11-02 (lock-slate § 5):

1. **The secret is what the technology says** (slate Q4). Shape, knowledge or record; bitting and
   profile for shape locks; the opaque identity stays and the bitting is seeded from it.
2. **A pick is computed, never rolled** (slate Q1). Seeded manufacture; time from pins, tolerance,
   hand, tool, light, condition; a floor; security pins and raking by arithmetic; interruption
   loses the pins; evidence by method.
3. **The deciding act is the player's choice of approach** (slate Q2) — reading supplies the facts
   (knowledge), the hand sets the price (skill), the choice is nobody's band.
4. **A lock's character composes shipped pieces** (slate Q3) — grade, maker and brand, wear by use,
   weathering and corrosion; the grade-to-mechanism table on the technology row.
5. **Copying is physically open, gated by blanks and skill; the register records issues, never
   possession** (slate Q5 and § 2). Shape keys are physical only.
6. **A seat holds a key by its holder; a master key is an ordinary key issued by the fiction-side
   owner to its own seat** (slate Q6 and § 1). The constable is policing's, with a warrant, not a
   master key.
7. **The physics and the defeat acts are kernel; making and servicing is `trade-locksmithing`**
   (slate Q7).
8. **One row per technology, with a check that owns the namespace** (slate § 4).
9. **Locks on things, built in and as padlocks** (slate § 0).
10. **Locks ships on deeds; refusals name only what exists; assessment adds exams later.**
11. **Verbs:** `pick` (with `--rake`) moves to the lock; `force` is new; keys are cut by `cut`
    (`--from`, `--code`, `at <door>`); `impress key on wax`; `analyze` reads locks and keys; `keys`
    lists and revokes; `lock`/`unlock` unchanged.
12. **The shop is in Mayfield Row** — lens 6: the demand (lease turnover, re-keying) is already
    there.

## Lens pass

1. **Pedagogy** — from *fails* to the strongest heading: pins, depths and tolerance are
   arithmetic you read and plan against; master keying's trade-off; why the world moved to
   keycards (selective revocation); binding order and false sets as the real theory; the approach
   as planning under constraints. Disciplines: lockcraft's five, with stealth and forensics beside.
2. **Expression** — every lock story becomes makeable from rows: the forged key, the wax
   impression, the cheap padlock everyone's key opens, the master six-pin you study first, the
   rusted gate, the skeleton key in the abbey. A lock has a character an author sets.
3. **3a Immersion** — a lock reads as what it is, and a defeat leaves what it would leave.
   **3b Participation** — a counter-power at last (pick, force, copy), a landlord who must re-key
   after a bad tenant, a keeper who walks off with the key.
4. **Values** — do you lock up behind you; do you lend your key; a copy for a friend; buy the good
   lock or the cheap one; keycard or brass (revocation against an identity record).
5. **Continuity** — the technology row is the epoch ladder; `lock`, `unlock`, `pick` and `force`
   answer the same on every rung that allows them. Who holds the obsolete half: the locksmith who
   cuts brass when the building goes to keycards.
6. **Economy** — locks and blanks made from brass and steel; cutting, re-keying, repair and
   lockouts as services; quality priced. The demand was there first: every holding, dorm room,
   ship and works issues keys.
7. **Governance** — the issuer's register is the readable record; the refusal names who issues
   keys; restricted blanks are the authorized cutter's; warrants are policing's.

## The drive

Paces: `instant` · `short` (up to a game day) · `staged` (a span's outcome set with wizard tools) ·
`span` (weeks or seasons). Each step names its assertion: `player` or `staged`.

### Blocking drive

**The shop and the trade**
1. `instant · player` — Walk to the Mayfield Row locksmith's by day and by night; `look`: the shop
   reads in its own light (R5). The locksmith is on shift.
2. `instant · player` — Buy a padlock and a common blank. `analyze padlock` as a novice: *a brass
   padlock*.
3. `short · player` — Fit the padlock to the hasp of a shed door; `lock` it; walk away with the
   key. A second player cannot open it.

**Keys are physical**
4. `instant · player` — In your holding, drop your door key in the street; `unlock` your door:
   refused — you do not have the key. Pick it up; it opens. (Before this build, the wallet opened it.)
5. `instant · player` — Hand your key to a second player; they open your door; you, without it,
   cannot.

**Copying and records**
6. `short · player` — At the locksmith's, `cut blank --from <key>`: a working copy. A copy cut by a
   novice hand opens a cheap padlock and fails a fine door.
7. `instant · player` — `impress key on wax`; later `cut blank --code` / from the impression: a key
   that opens the lock, the original never having left its owner.
8. `instant · player` — As a holding's owner, `keys`: the issues listed, the copy cut from a
   restricted blank listed, a copy cut from a common blank not listed.
9. `instant · player` — Refused at someone else's door, the refusal names who issues keys for it.
10. `short · player` — Re-key your holding's lock at the locksmith's (a paid service): every old key
    and copy stops opening it.

**Reading and picking**
11. `instant · player` — `analyze` a cheap lock, a fine lock and a masterful lock at a staged
    competent knowledge band: the detail grows with the band; the masterful lock names its security
    pins and a time.
12. `short · player` — `pick cheap --rake`: open in seconds. `pick fine --rake`: refused — too tight
    to rake.
13. `short · player` — `pick fine` at a staged novice hand: opens after the time the reading named
    (the same time on a second try — no chance). At a staged lower hand, a masterful lock refuses
    with what lifts it.
14. `instant · player` — Start a pick and walk away mid-way: the pins drop; starting again starts
    from nothing.
15. `instant · player` — While a second player picks a door, a third walks into the room: they see
    it, by the shipped perception — no roll.
16. `instant · player` — `analyze` a picked lock with a lockcraft eye: tool marks. `force` a door:
    the lock is ruined, the room hears it, anyone sees it.
17. `short · player` — `cut blank at <door>` (impressioning): slow, and you leave with a working key.
18. `instant · player` — A skeleton key opens a warded door at the staged abbey test room; a
    combination lock opens by listening at a staged skill; a keycard door refuses `pick`.
19. `instant · player` — A ring of cheap keys tried on a poor padlock: one of them fits — the same
    one every time.

**Seats, masters and things**
20. `instant · player` — The Duncan Hall warden opens any dorm room with the master ring.
21. `instant · staged` — The Works keeper is dismissed: the register shows the pump-house key
    outstanding; the key still opens the door until the works re-key it.
22. `instant · player` — The *Hesper*'s sea chest is locked; its key opens it; `get` from the locked
    chest is refused.
23. `instant · staged` — A padlock on an outdoor gate, staged as weathered: the key turns stiffly /
    refuses until it is oiled or repaired, for its owner too.
24. `instant · staged` — A lock staged as heavily worn: a lock that refused to rake now rakes.

**Verbs, restart and migration**
25. `instant · player` — `pick apples` in an orchard: not a lock; `harvest apples` works; the
    farming help says `harvest`.
26. `instant · player` — Restart the world (R4): your padlock is still on the shed, locked; your keys
    and copies still open what they opened; a re-keyed door still refuses the old key; the register
    reads the same.
27. `instant · staged` — A player whose wallet held a shape key and who carries no physical key logs
    in after the migration: they are carrying the physical key, and their door opens.

### Soak drive

1. `span · player` — An iron padlock on an outdoor gate through a wet season seizes; indoors one
   does not.
2. `span · player` — A front door used every day for a season wears looser.

## Acceptance criteria

- A key opens a lock if and only if its cuts fit; a cheap lock can be opened by somebody else's
  key, deterministically, and a fine dorm or holding door is not.
- Every lock that existed before still opens to every key issued for it.
- A shape key in the street no longer opens its owner's door; handing it over hands over the door;
  no player is locked out of their home by the change.
- `analyze` reads a lock's and a key's detail by lockcraft knowledge.
- A pick takes a computed time that is the same on every attempt, refuses below a floor with what
  lifts it, loses its progress when interrupted, and leaves marks a lockcraft eye can read; raking
  works on a loose lock and never on a tight one; `force` ruins a lock audibly and visibly.
- A copy can be cut from a key, an impression, a code or at the lock; a sloppy copy opens a loose
  lock and fails a tight one; restricted blanks come only from the authorized cutter.
- An issuer's register lists the keys it issued and restricted copies; a refused player is told who
  issues keys; re-keying kills every old key; a record lock revokes one person.
- A seat's key follows its holder, and a key kept by a dismissed holder still works until re-keyed;
  Duncan Hall's master ring opens the dorm's rooms.
- A chest and a padlock lock and unlock like a door; a padlock is the owner's own good; a weathered
  padlock seizes for its owner too.
- Five technologies exist as rows; a misspelled technology in content is refused when the content
  is checked.
- A locksmith's shop in Mayfield Row sells padlocks and blanks, cuts keys and re-keys locks, lit by
  day and night.
- `pick` acts on locks; `harvest` takes crops; the farming help agrees.
- Locks, keys, padlocks and registers read the same after a world restart.
- The blocking drive runs green in under half an hour of wall time.

## Cross-references

- [lock-slate](../slates/builds/lock-slate.md) — seeding slate, § 5 the session, § 6 the reuse ledger
- [assessment-slate](../slates/builds/assessment-slate.md) — exams, the guild, the finer tree
- [policing-slate](../slates/builds/policing-slate.md) — warrants, the constable
- [boundary.md](../subsystems/boundary.md) § Locks · [credential.md](../subsystems/credential.md) ·
  [assembly.md](../subsystems/assembly.md) · [spatial.md](../subsystems/spatial.md) (sealable
  closures) · [concealment.md](../subsystems/concealment.md) · [stealth.md](../subsystems/stealth.md) ·
  [instrumentation.md](../subsystems/instrumentation.md) · [mould.md](../subsystems/mould.md) ·
  [materials-response.md](../subsystems/materials-response.md) · [employment.md](../subsystems/employment.md)
- [uncertainty.md](../uncertainty.md) — seeded, never drawn
- In flight: harbors (build-4, the gangway), water supply (build-1, the padlocked turnout and the
  pump house)
