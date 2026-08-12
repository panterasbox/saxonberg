# The platform business model — Saxonberg is a commons; Study is an operator

> **Status: foundational correction (2026-08-05).** The earlier
> `study-com-*` docs (and the GTM "deal models" in
> [study-com-strategy.md](./study-com-strategy.md)) implicitly framed the
> game as a **proprietary product we own and Study partners with.** That is
> wrong at the root. **Saxonberg is AGPL-3 open source; Study licenses and
> runs its own instance.** This doc records the correct economic
> relationship, per the copyright holder (the user). It corrects the
> business framing across the set; the *technical* architecture
> (vertical-agnostic core + proprietary adapter) was already right.

---

## 1. The root fact: AGPL-3, run by anyone

- **Saxonberg is AGPL-3, meant to be run by any party for any digital
  community.** The engine is a **commons.**
- **Study.com licenses and runs its *own* instance** — its capital, its
  labor, its consumer base. Study owns *its* "StudyWorld" and *its*
  customers; we do **not** own the customer relationship through the engine.
- **Study has no special authority.** The deal runs **in reverse and
  sideways**: any operator can run the platform, and any operator can strike
  its own content deal (with the user or with anyone). Study is one operator
  among possible many — precisely because the project is open source.

*(This retires the earlier "who owns the free playerbase / freemium vs.
bundled" analysis — it presumed we own the product. We don't.)*

## 2. Where the revenue is (the copyright holder's business)

Two models, both selling **capability around** the open engine, never the
engine itself:

- **Custom platform + integration support.** An operator (Study) needs the
  platform *and* a proprietary content-integration layer built and
  maintained; the copyright holder provides that expertise **at cost** —
  deal-scoped, project-shaped. (Requires the platform to stay needed — i.e.
  the integration layer is genuinely custom.)
- **Managed operations / PaaS — the better long-term model.** The copyright
  holder runs all **infra + software updates** for a community; the
  community brings its own capital, labor, and users and simply **uses the
  engine.** Recurring and operational.

## 3. The proprietary integration layer is the paid surface — the architecture already fits

- The **vertical-agnostic core + per-partner proprietary adapter** split
  ([study-com-integration-spec.md](./study-com-integration-spec.md) §1, §4)
  *is* this layer: the **core is the AGPL commons**; the **adapter** (Study
  content → game) is the **proprietary, per-operator piece** the copyright
  holder builds and supports. The technical design was right; only the
  business framing needed correcting.
- **Dual-license / open-core lever.** As the copyright holder, the user can
  license **AGPL to the commons** *and* grant a **commercial license** that
  lets a proprietary integration layer exist cleanly — AGPL's combined-work
  question makes a proprietary adapter something to architect at arm's
  length or license explicitly. Support + PaaS + the dual-license lever
  reinforce each other. *(Noted as a lever the copyright holder holds, not
  legal advice or a committed plan.)*

## 4. The governance residue — the platform is not a neutral shell

- Any operator's instance must **plug into the governance model, or
  explicitly ignore it.** And because some systems depend on **"laws" as
  metadata**, **some residue of the governance model is always present even
  with no government running.**
- So the "vertical-agnostic core" carries an **opinionated civics
  substrate.** Every operator — Study included — must decide: **adopt it,
  explicitly ignore it, or live with the residual laws-metadata.** This is a
  **first-class operator/integration decision**, not a footnote, and the
  adapter layer has to address it. (It's also the sibling of the world's
  *danger* being load-bearing — see
  [study-com-student-experience.md](./study-com-student-experience.md) §2:
  the world is opinionated, both civically and in its stakes, not a neutral
  content shell.)

## 5. What this reframes for the pitch

- The strategy doc's GTM "deal models" (credential integration / bundle /
  co-branded SKU / cohort / platform license) were written as
  **Study-partnership** shapes. Reframe them around
  **Study-as-operator-of-an-open-platform**: the pitch is *"license and run
  the open platform; we build and support your proprietary
  content-integration layer, and/or run your instance for you as a managed
  service."* The strategy doc's **"model E (platform license)"** is the
  closest existing shape but under-specified — **this is its correct,
  foundational form.**
- Our leverage is **expertise (support) and operations (PaaS)** — not
  customer ownership. Any pitch that positions us as a *bundled feature Study
  owns* mis-states the relationship.

*Recorded 2026-08-05 from the copyright holder's own framing. Verify AGPL /
dual-license specifics with counsel before any deal.*
