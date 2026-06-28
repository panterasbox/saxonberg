# Credential wallet — one holder, many credentials-as-data (sketch)

> **Status: sketch / pre-requirements.** A small **consolidation** build —
> captures an abstraction, not a spec. Authored 2026-06-27 in a design pass on
> the EU murder arc, when proctor **deputization** became the *third* credential
> and the per-credential-mixin pattern showed its seam.
>
> **The smell:** we already ship two credential mixins —
> `PaymentCredentialMixin` ([banking.md](../../subsystems/banking.md):
> `PaymentCard` Thing ⊕ `PaymentImplantUpdate` aether wallet) and
> `TravelCredentialMixin` ([fasttravel.md](../../subsystems/fasttravel.md): card
> + implant, registered-set) — and deputization wanted a third. **Three is the
> signal to stop building mixins and build the holder.**
>
> **The fix in one line:** a phone wallet — **one holder app, credentials as
> data.** A new credential kind becomes a new *record*, never a new class.

---

## The shape

### `Credential` — one value-object, not a mixin

A record: `{ issuer, kind, scope, subject, issued, expires }`. `kind` is a
vocabulary entry — `payment`, `travel`, `deputization`, `dorm-key`, … — and
**adding a kind is adding data**, not a class.

Crucially, the credential record is a **presentation, not the source of truth.**
The *issuer's* authorization ledger owns validity, derived on read (the
derive-don't-track house rule — see [renown.md](../../subsystems/renown.md),
and the deputization design: an `authorize`/`revoke` append-only ledger →
`isDeputized(actor, scope)` derives latest-non-revoked-non-expired). The wallet
holds the boarding pass; the airline's system is what clears you.

### `CredentialWalletMixin` — one holder, hosted as one aether app

A keyed set of `Credential`s, conferred by a **single aether-hosted update** (the
"wallet app," born-with like `ForumsUpdate` —
[augmentation.md](../../subsystems/augmentation.md) three-base capability model).
It is a **dumb store**: it knows *nothing* about what any credential means. Same
"dumb store, smart consumers" pattern as [chronicle.md](../../subsystems/chronicle.md)
and the belief store.

### Smart consumers stay in the subsystems that already exist

The semantics live where they always did:

- `AccessApi` reads `deputization` credentials (via an **MQL-defined group** —
  [grouping.md](../../subsystems/grouping.md) MQL provider — so membership is a
  query over the derived authorization status; `Zone.accessGroups` honors it with
  no hand-mutated roster, no new flag — see [access.md](../../subsystems/access.md)).
- `BankingApi` reads `payment` credentials (settlement).
- `FastTravelApi` reads `travel` credentials (node registration).

**This is the proliferation-stopper:** a new credential kind plugs into a
consumer that already exists; the wallet never grows a method for it.

### One card, polymorphic on its record

The physical side unifies too: instead of a bespoke `PaymentCard` + a separate
writ object + a transit pass, **one `CredentialCard`-style Thing carries any
credential record** — the §8 cross-jurisdiction *presentation* (the document a
Terminus official inspects because they can't read the campus ledger).

## Why it lands thematically (§8)

The wallet is implant software, and the aether is **identity-blind** (EU §8) —
so **the network can't vouch for what's in your wallet.** Validity is always the
*issuer's* to confirm (ledger lookup where reachable; physical/social trust where
not). Carrying a credential ≠ it being true. That is the whole
personhood-as-paperwork spine of *An Honest Count*, expressed in the engine.

## Scope

**In:** the `Credential` value-object + vocabulary; `CredentialWalletMixin` + its
aether update; the unified `CredentialCard`; **deputization as the first native
tenant** (wired to `AccessApi` via an MQL group over the derive-on-read
authorization ledger).

**Out (this pass):** refactoring the two existing mixins. `PaymentCredentialMixin`
/ `TravelCredentialMixin` carry real kind-specific *behavior* (settlement,
registered-set) that stays as consumers; they're candidates to fold their
*holder/card* into the wallet **later**, not in a big-bang. We stop adding new
credential mixins today; we retrofit the old two when convenient.

## Open dials

1. **Born-with or acquired?** — does every implant ship the wallet app (like
   `ForumsUpdate`), or is it installed/found? *(Lean: born-with — credentials are
   load-bearing across the world; gating the *holder* gates everything.)*
2. **Thin holder Api?** — a `CredentialApi` for the *dumb* surface
   (`hold` / `list` / `present`), verification staying per-issuer — vs. folding
   even that into the consumers. *(Lean: thin Api — the dumb surface is real and
   shared; the gated forwarding-shell pattern fits.)*
3. **Authorization-ledger home** — one shared `authorization_events`-style ledger
   keyed by `{issuer, kind}`, or per-issuer ledgers? *(Lean: per-issuer — each
   authority owns its own grants; deputization's lives with the proctors.)*

## Cross-references

- First tenant / driver: the EU murder arc deputization — the proctors office
  pathway ([eternal-university-narrative-slate.md](./eternal-university-narrative-slate.md)
  §14, the registrar/morgue access immsim).
- Folds in (later): [banking.md](../../subsystems/banking.md),
  [fasttravel.md](../../subsystems/fasttravel.md).
- Substrate: [augmentation.md](../../subsystems/augmentation.md) (aether host ⊕
  hosted update), [access.md](../../subsystems/access.md),
  [grouping.md](../../subsystems/grouping.md) (MQL group provider),
  [chronicle.md](../../subsystems/chronicle.md) (dumb-store-smart-consumers).
