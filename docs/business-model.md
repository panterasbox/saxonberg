# Business model — what is on offer, and what it risks

> **Status: FIRST PASS, 2026-11-08.** The structure is decided; the volumes are
> illustrative until the first offering measures them. Sibling of
> [company-and-capital.md](./company-and-capital.md), which says what the entity is and
> why capital standing is not equity. This doc models it **as if it were**, privately,
> to answer the owner's question.
>
> ⛔ **Internal analysis only.** Nothing here may appear in player-facing copy, on
> stream, or in any offering's wording. Publicly the units are *capital standing*: a
> stake, never a share, a valuation, an investment, a return or a dividend
> ([giving-slate](./slates/builds/giving-slate.md) § Before the first entry). Not legal
> or financial advice.

## The question

The owner: *"capital standing is an oddball because even though we're not actually
giving people equity, I kinda want to design as if we are. it's illegal and we can't
imply we're doing it anywhere, but I want to know if running our system is worth actual
capital risk or not … there's value to be had after the initial capital investment here,
but there's also risk. I wanna know as best as I can how much of both are on offer."*

And what the company is: *"the game isn't really the company, the livestream is the
company, it's just running the platform that provides the compact for governance."*
**Pantera's Box is a media company that runs Saxonberg as its governance platform.**

## 1. The shadow cap table

Kept privately, as if the units were shares.

| holder | units | how |
|---|---|---|
| patrons | Σ (recurring rate × months) + Σ pool shares | the offerings ([giving-slate § Offerings](./slates/builds/giving-slate.md)) |
| the founder | patrons' units + 1 | the charter's matched-plus-one, until 1.0 |
| **total** | ≈ 2 × patrons' units | |

**Implied valuation = the round's discovered price × total units outstanding.** The
discovered price comes from the bits pool (net money ÷ pool units), so every round
produces one data point. The founder's matched units count like founder shares, which
is what makes the number mean anything.

**The comparison that answers the question:** implied valuation (what patrons pay)
against **fundamental value** (§ 4, what the business earns).

- Implied well above fundamental: patrons are paying for the experiment and the
  community, not the business. That is fine, and it says a real raise would be priced
  on enthusiasm.
- Implied near or below fundamental: the business is undervalued by its own patrons,
  and a real raise later (company-and-capital's ladder, rung 2: a PBC and a Reg CF
  round) would likely succeed.

## 2. Revenue lines

Net is what reaches the commons (the giving slate's split table; verify each
platform's current terms at build time).

| line | unit | reaches us | notes |
|---|---|---|---|
| Twitch subs | $4.99 / month (tier 1) | ~50% → ~$2.50 | gift subs the same; the rate lock rewards both |
| Twitch bits | per bit | ~$0.01 | the discovery pool |
| YouTube memberships, Super Chat | varies | ~70% | |
| Kick subs | varies | ~95% | the owner's preferred channel to grow |
| Patreon | varies | ~85–90% | out-of-world perks only |
| Stream ads | per impression | platform-set | small at low viewership |
| Sponsorship and brand placement | per deal | 100% | [sponsorship-slate](./slates/builds/sponsorship-slate.md); all real money to the Compact budget (§ 11.4) |
| Blanket license (federation) | per member server | — | later; also an expense when paid out to rights holders |
| Hosting | per realm | — | if offered |
| Steam (desktop build) | per copy or cover fee | ~70% | later |

## 3. Costs

| line | amount | source |
|---|---|---|
| Infrastructure, today | ~$11 / month | [deployment.md § Cost](./deployment.md) |
| Infrastructure at scale | grows with players: a paid database tier, a second box, media bandwidth | to measure |
| The LLC | state filing fee plus an annual fee, tens to hundreds of dollars a year | varies by state |
| DMCA designated agent | a small fee, renewed every 3 years | Copyright Office directory |
| A lawyer, once | the offering's wording and the operating agreement | one-time |
| ⭐ **The founder's time** | hours × a market rate | the largest cost by far, and the one most often left off |

## 4. Fundamental value

A small media or creator business is commonly valued at a multiple of its annual
profit; small online businesses tend to sell for roughly **2–4× annual profit**. That
is a rule of thumb for orientation, not an appraisal.

**Fundamental value ≈ (annual net revenue − annual costs, founder's time included) ×
the multiple.**

### Illustrative only (not a forecast)

A stream averaging 50 concurrent viewers, with 60 recurring Twitch subs, 20 gift subs a
month, 20,000 bits a month and one small sponsorship a quarter at $500:

- subs: 80 × $2.50 × 12 ≈ $2,400 / year
- bits: 20,000 × $0.01 × 12 ≈ $2,400 / year
- sponsorship: 4 × $500 ≈ $2,000 / year
- **≈ $6,800 / year net revenue**, against ~$150 / year infrastructure, before the
  founder's time

Counting the founder's time, this is a loss; without it, a few thousand dollars of
profit, worth perhaps $10–25k by the rule of thumb. **The first offering replaces every
number above with a measurement.**

## 5. Risk register

| risk | what happens | lever |
|---|---|---|
| **Securities** | wording or terms imply a profit expectation; the units become a security | the wording rules, the operating agreement, a lawyer's read before round 1 |
| **Platform terms** | Twitch, YouTube or Kick objects to standing offered for subs or bits | ⚠ read each platform's current rules on sub perks and incentives before round 1 |
| **Copyright** | a takedown on the demo realm's real assets | comply first; the takedown desk ([sponsorship-slate § 9](./slates/builds/sponsorship-slate.md)) |
| **Sweepstakes** | a brand promotion is an illegal lottery | no purchase necessary; registration where required |
| **Key person** | the founder is the stream, the maker and the majority | matched-plus-one ends at 1.0 by design; the labor house dilutes as makers join |
| **Concentration** | one platform or one sponsor is most of revenue | the multi-platform giving design; many small sponsors over one big one |
| **The rate lock** | early posted prices prove generous and hold until 1.0 | bounded steps between rounds; windows limit new locks |
| **Demand** | nobody gives until there is an offering | the offering *is* the measurement; a quiet round is a finding |

## 6. What to measure from round 1

- The discovered price per round, and its trend.
- Recurring sign-ups, retention month over month, lapse rate.
- Net revenue by line, and its share of the total.
- Gifts outside windows (pure income) against gifts inside them (standing-seeking), which
  is the demand signal the owner named.
- The founder's hours.

## Open

1. **The multiple** to use for fundamental value, once there is a year of data.
2. **The unit count and posted price for round 1.** The count is arbitrary (only ratios
   matter); the price is a first guess the bits pool corrects.
3. **When the model is reviewed:** at every round's close is the natural cadence.
