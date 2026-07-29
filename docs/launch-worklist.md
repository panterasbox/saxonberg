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

1. **Crafting recipe branches + the repair lifecycle** [T2] — smithing
   / cooking / tailoring branches over the shipped crafting substrate
   (the fire build's named deferral); wear→repair→scrap→reforge from
   the materials-response slate. The transform stage of the whole
   goods economy, and the wear economy is a universal money sink.
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
   - **Fishing v1** [T2 — see the rescue note in §5] — the accessible
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
- **Alignment spine content** [T1 — alignment-slate is SETTLED] — the
  evil-realm demo the alignment thesis needs; also what the Warding /
  contemplative Orders eventually open on.

## 3. Launch-enhancing systems (valuable, not economy-blocking)

- **Pets W1–W2 (taming)** [T2] — the Wardens' supply-chain anchor;
  chattel shipping already closed one of its three named gaps.
- **Magic-items / BUC + identification** [T2] — the Society of
  Inquiry's identification economy.
- **Courts / the adjudication stack** [T3] — opens the Advocates,
  sources marshal writs, lands Landwright disputes.
- **Corpo sponsorship wings** [T3 — decisions locked in corpos
  Phase 2] — endowment mechanics inside institutions.
- **Inquiry's teachable-goods market** [T3] — commissioned research
  with teeth.

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

- **Rescue the fishing slate** — `fishing-slate.md` (design captured,
  mining/farming-grade depth) lives in unpushed commit `19f9c474` on
  the **diverged local `master`** in the `master` worktree, alongside
  a multi-currency slate that may overlap the
  `docs/currency-market-decision` branch. Push or cherry-pick before
  it's lost; reconcile the divergence.
- **Marshal-credential issuance** [T4, small] — Office or court?
  Waits on the courts design.
- **Ranching deep pass** [stub] — the Grange's herd wing; scheduled to
  ride the farming session; shares the breeding substrate (and
  aquaculture is fishing's ranching sibling — design them together).
- **Guild-slate open questions** — chapters, revocation, one-Order-or-
  two, the Ironwrights' name, rank-on-presence-line, the first-hour
  fantasy (guild-slate § Open questions).

## Cross-references

[guild-slate](./slates/builds/guild-slate.md) (the roster + audit this
list derives from) · [slates/README.md](./slates/README.md) (the
by-area catalogue) · [build-menu.md](./build-menu.md) (the size-ordered
session menu — this list is the priority axis it deliberately isn't) ·
[roadmap.md](./roadmap.md) (the long-term navigation doc).
