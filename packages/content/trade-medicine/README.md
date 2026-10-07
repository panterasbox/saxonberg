# trade-medicine

The medical trade — **how a body is READ**, and nothing about where the
reading happens.

⭐ The line it holds: **competence buys what you can SEE, never what you
can DO.** An untrained eye knows something is wrong; a novice reads the
signs; a competent medic knows which conditions could produce them —
plural and unranked; a proficient one knows what would treat it and how
it spreads; an expert reads how far it has gone. Nothing on that ladder
makes a treatment work better.

⚠ It ships **no venue**. A clinic is rows — a business, a room, a tariff,
a cot — in whatever locality wants one. A second clinic needs zero pack
code.

## The blood economy (blood build)

The pack also ships a civic **blood bank**, gift-only: the donor is never
paid, a patient pays a service fee. It is all rows in a locality, over
pack substrate:

- **`BloodWindow`** — a priced board (`Tariff`) that is also a donation
  register (`DonationBankMixin`): it reads its typed units out of the
  vault it points at, sells a `transfusion` off them, and the fee
  attributes to whoever operates the counter.
- **`BloodUnit`** — a filled, typed, brandable, spawn-eligible bag.
- **`issue`** (seat-gated, gift-only) and **`donate`** (the gift act — a
  player's own-blood gift earns chronicle, trait and renown credit).
- **`analyze blood`** / **`analyze bank`** — the legible surfaces.
- the **`banks`** (floor/summons/notice), **`supplies`** (the runner) and
  **`donates`** (the visible donor) brains.

A second blood window is a row; a second KIND of bank (milk) is one small
class composing the same `DonationBankMixin`.
