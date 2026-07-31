# Launch worklist — the guild-derived gap list

> **What this is.** The [guild-slate](./slates/builds/guild-slate.md)
> launch roster was audited charter-by-charter (*who pays · which law
> layer · world-native fantasy?*), and every audited demand anchor
> points at a system or content pass the world needs. **Guilds
> themselves are deferrable past launch** — the game is 100% playable
> without them — so this list inverts the derivation: use the guild
> landscape as the lens, build the economy it revealed. Work off this
> for the next few builds; strike items as they ship.
>
> Each item carries a **design-readiness tag**:
> **[T1]** settled / complete-by-precedent — `/requirements`-ready ·
> **[T2]** captured at slate level — needs a requirements pass, no open
> architecture · **[T3]** decisions locked, mechanisms unwritten ·
> **[T4]** no design artifact exists.

## 1. The economy spine — don't launch without these

The conserved economy needs real **faucets** (extraction), a real
**transform chain** (recipes), real **circulation** (venues, jobs,
retail), a **demand floor** that doesn't depend on DAU (polity paper),
and real **sinks** (rent, tax, wear). Ordered by leverage:

1. ~~**Crafting recipe branches + the repair lifecycle** [T2]~~ —
   **BUILT** (the crafting-branches build): smithing + cooking branches
   over the one skeleton, the heat gate (D9 consumed), the generalized
   knowledge ladder, combat wear-on-use, keenness + `sharpen`,
   `repair`/`salvage`, both Hearthworks venues. The **tailoring branch
   stays deferred** per the requirements (the jerkin recipe + `mending`
   capability are its attach points; waits on a fiber faucet). See
   [crafting.md](./subsystems/crafting.md).
   *Serves: Ironwrights, Victuallers; everything downstream.*
2. **Employment / venue / job-contract content pass** [T1 — the
   substrate is shipped; this is authoring] — venues and contracts per
   vocation, worked straight off the roster's demand-anchor column
   (guild-slate § *What the roster is for*). Proves each vocation's
   livelihood loop; the mint-time rule satisfied in advance.
3. **The three extraction faucets** — the economy's source nodes;
   without them the world's goods are authored stock, not an economy:
   - **Farming staple loop** [T2, slate says buildable now] — the food
     faucet; metabolism (everyone eats) is the bedrock paymaster; the
     Reserve floor-buy adds polity demand. *Serves: Grange,
     Victuallers.*
   - **Mining / Ferrow Delving** [T2] — the materials faucet; ends the
     metal-import era (a world event); salt as the preservation
     staple. *Serves: Delvers, Ironwrights.*
   - **Fishing v1** [T2 — [fishing-slate](./slates/builds/fishing-slate.md)] — the accessible
     income floor (the body's rest); first real gameplay consumer of
     weather; drives perishability; the salt-cod interlock with
     mining; the net wave's commons/quota = more polity paper.
     *Serves: Watermen, Victuallers.*
4. **Retail S3 — the producer loop + real pricing** [T2] — closes
   mine→ore→shop→player; retires the reset-sweep self-restock
   placeholder (which currently *erases* the Carriers' vocation — see
   guild-slate § audit finding 4). *Serves: Carriers, Factors.*
5. **The polity-paper engine** [T3 — livelihood §8 vision captured,
   mechanism unwritten] — recurring public contracts: assessment
   rolls, marshal writs, floor-buys, quota administration, frontier
   contracts. The **DAU-independent demand floor** (the Terminus
   rule) and the WPA floor's delivery vehicle. Without it the
   roster's best economics are prose. *Serves: Landwrights, Free
   Company, Grange, Watermen — and the economy's health at small
   population.*
6. **Property: tenancy + parcel tax + the apartment ladder** [T2/T3 —
   phases named, tenancy/tax mechanisms thinnest] — the essential
   **sinks** (rent, rates) and the residence progression every player
   rides. *Serves: Landwrights; the money supply's drain side.*

## 2. Pre-beta content passes (wanted regardless of guilds)

- **The vanilla discipline pack** [T1 — pure data] — fill out the
  Discipline tree as the platform's shipping content pack, ISCED-F
  anchored (partner-agnostic: right spine for a generic-ed-tech
  target). The guild roster fixes its spine: author the taxonomy so
  the ~18 career-grain regions fall out coherent, with the
  mystery-tier `synergizes` edges honored in data. Also the asset the
  education video wants.
- **The vanilla recipe pack** [T1 — pure data once the crafting-
  branches build ships] — the comprehensive launch recipe set, authored
  as a content pack (sibling of the discipline pack, done **together**
  with it: recipe tiers are the crafting disciplines' ZPD rungs, so the
  tree and the ladders must agree). Width is enumeration over the real
  response axes (form × material × construction — gear width is
  template *data*, not new classes), governed by the **admission
  test**: a recipe ships only if a live system reads its output
  (weapons/armor/tools/vessels/lights/dressings/trap-kits/food today;
  jewelry, instruments, furniture-beyond-readers, locksmithing wait for
  their readers — locksmithing additionally a security design
  conversation, not just a reader). The build itself stays narrow
  (~6+5 laddered seeds proving the seams).
- **Alignment spine content** [T1 — alignment-slate is SETTLED] — the
  evil-realm demo the alignment thesis needs; also what the Warding /
  contemplative Orders eventually open on.

## 3. Launch-enhancing systems (valuable, not economy-blocking)

- **Pets W1–W2 (taming)** [T2] — the Wardens' supply-chain anchor.
  **2026-07-30:** two of its three named gaps are now closed (chattel;
  multi-instance keyed persistence) — only the **fear/threat axis**
  remains structural. If pets builds before ranching, the one rule is:
  **don't solve custody or persistence pet-shaped** — both are shared
  one-liners (`ChattelMixin` on the Creature stack; a keyed
  `PersistableMixin` host).
- **Magic-items / BUC + identification** [T2] — the Society of
  Inquiry's identification economy.
- **Courts / the adjudication stack** [T3] — opens the Advocates,
  sources marshal writs, lands Landwright disputes.
- **Corpo sponsorship wings** [T3 — decisions locked in corpos
  Phase 2] — endowment mechanics inside institutions.
- **Inquiry's teachable-goods market** [T3] — commissioned research
  with teeth.
- **The odometer** [T2 slate; **deliberately LAST — a capstone**] —
  honest number-go-up over the ledgers. Built after the spine + skill
  seam are live and beta play has shown which counters are resonant;
  deferral loses nothing (derive-on-read → retroactively complete).
  Governed by the **load-inert rule** (odometer-slate): no system's
  felt-progression may depend on it — a standing review question for
  every build until then.

## 4. The guild layer itself — deferrable past launch

Small when its time comes (the substrate mapping in guild-slate shows
almost everything rides Party / Business / parcel / contract
precedents):

- **Guild core substrate** [T1] — charter Document + validation, Guild
  Idea + provider, the budget / Transcript focus-tag / `Competence.derive`
  modulation, hall keyways, the advancement gym.
- **Contract claim gates** [T1] — credential/band/membership gating on
  who may claim; also what the Marshalcy writ stream rides. (Worth
  pulling *earlier* if writs land with the polity-paper engine.)
- **Guild-scoped renown + credential presentation** [T1].
- **The mentor / instruction loop** [T4 — **the biggest design hole**]
  — assignment, debrief, tuition, the mentor session; the guild's
  daily verb. Wants its own design pass before guild requirements
  (the quest-modeling slate's objective/trace model may be the
  skeleton for "assignments").
- **The calls mechanism** [T4] — the civic summons (posse comitatus in
  the original sense); parts exist (notify/presence, contracts,
  credentials), the summons doesn't.

## 5. Design debt & housekeeping

- **Fishing slate rescued** (2026-07-28) — commit `19f9c474`
  cherry-picked onto `docs/guild-slate` (fishing-slate + the
  multi-currency tail + their README lines). **Residual**: the local
  `master` in the `master` worktree remains **diverged from origin**
  with other unpushed commits (manifesto/rerecord work, the WizWar
  reference PDF) plus a dirty tree of modified lenses/manifesto files —
  still needs reconciling; and the multi-currency tail should be
  read against the `docs/currency-market-decision` branch when that
  merges.
- **Marshal-credential issuance** [T4, small] — Office or court?
  Waits on the courts design.
- **Ranching deep pass** — the Grange's herd wing; scheduled to
  ride the farming session; shares the breeding substrate (and
  aquaculture is fishing's ranching sibling — design them together).
  **2026-07-30: the shared conventions are now DECIDED** (density dial ·
  custody = `ChattelMixin` on the Creature stack · one family-wide clock ·
  two yield shapes) — see
  [ranching-slate](./slates/builds/ranching-slate.md). What's left open is
  ranching's own content design (yield feel, herd UX, the breeding game).
- **The procgen doctrine capture** — due when the first extraction
  vertical builds its generation grammar (mining/fishing). The
  scattered instincts to write down as one doctrine: procgen for
  **worldspace** (Warren grammars, weather) and **distributions**
  (catch tables, spawn weights), always seeded/deterministic-from-
  state; **never for loot** (constitutional); item generation =
  **enumeration over real response axes** (form × material ×
  construction — performance derived, not stamped, so generated forms
  are automatically meaningful), entering the world as
  templates/recipes via the authoring gate now and inquiry-style
  discovery later — never as drops; and the undrawn **creature/person
  line** (spawn-distribution's procgen-NPC generator vs the
  NPCs-are-expensive-carves doctrine).
- **The respawn-provisioning leak** — NPC gear is the gear economy's
  back-door faucet: corpse-loot of *placed* matter is conservation-
  honest (kill→reward severed means no *minted* reward, not vanishing
  swords), but a re-armed respawn mints matter each cycle. V1 bounds:
  munitions-grade + worn-condition authored kit, chattel traceability
  (looted gear is provably not yours — fencing prices it down, the
  accountability row records the how), salvage lossiness on the way
  out. End-state: **provisioning as a real economy leg** (the issuer
  buys replacement kit — NPC gear demand becomes a customer of the
  smiths). Due with the first combat-NPC-dense area at economy scale.
- **Guild-slate open questions** — chapters, revocation, one-Order-or-
  two, the Ironwrights' name, rank-on-presence-line, the first-hour
  fantasy (guild-slate § Open questions).

## Cross-references

[guild-slate](./slates/builds/guild-slate.md) (the roster + audit this
list derives from) · [slates/README.md](./slates/README.md) (the
by-area catalogue) · [build-menu.md](./build-menu.md) (the size-ordered
session menu — this list is the priority axis it deliberately isn't) ·
[roadmap.md](./roadmap.md) (the long-term navigation doc).
