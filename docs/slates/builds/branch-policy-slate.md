# Branch-policy slate — `writers` on the document tree

**Captured 2026-07-31**, out of the legal-code session. The document
tree cannot currently say one sentence it needs: **"writes below here
must come through process P."** `DocumentApi.save`'s gate answers
*who owns a path* (self-home → covering zone → slice-walk) — never
*how it was written*.

This is **document-store infrastructure**, not law. Law is merely the
first caller with a hard requirement
([legal-code-slate](./legal-code-slate.md)); the same sentence is
wanted by guild charters, CMS go-live records, contract records, and
per-institution recipe books.

Related: [document-store.md](../../subsystems/document-store.md),
[call-security.md](../../subsystems/call-security.md) (the identity
this reuses), [access.md](../../subsystems/access.md),
[parcel.md](../../subsystems/parcel.md).

## The design, in one sentence

> **`writers` is `FromModule` with a data-sourced allowlist** — the
> same unforgeable identity, the same fail-closed behavior, the same
> lint. The only difference is that the allowlist comes from **a
> policy document resolved by path** instead of a decorator
> argument.

Everything it needs is already load-bearing elsewhere:

- Module IDs are **`path#exportName`, stamped at load by the loader
  hook and unforgeable**;
- **`resolveModuleId`** reads the caller's;
- identity-keyed policies **fail closed** — an unstamped class is
  denied (`ModuleApi.lookup` → null);
- and **`pnpm lint:gates`** already CI-validates that every such
  string resolves to a real module + export.

## Where it lives, and how it resolves

A `StoredDocument` of kind **`policy`** at a branch root, resolved by
**longest-prefix walk** — the house pattern already used three times
(the address coverage chain, the parcel `ownerOf` chain,
jurisdiction). Self-describing, in the tree, browsable by the CMS
like anything else.

```yaml
# /world/terminus/law/.policy
kind: policy
writers: ["/platform/idea/api/LawLogic"]
```

**A policy at a high prefix protects everything beneath it.**

⚠⚠ **CORRECTED 2026-08-04 — and this correction WEAKENS the design; it is
not a rename.** This section originally read *"the Compact sets `/law/**`
**once** and every institution's code is chokepointed with no
per-institution setup."* That assumed a top-level `/law/` tree. Law
actually nests **under each institution's own extent**
(`/world/terminus/law/`, `<guild extent>/law/` — see
[legal-code-slate](./legal-code-slate.md), corrected the same day), so:

> ⚠ **There is no single prefix covering all law. The set-it-once
> guarantee is gone; policy becomes PER-INSTITUTION.**

**State the cost plainly: an institution that never sets a policy is not
chokepointed.** A guild could `DocumentApi.save` straight into its own
code branch, because it owns that ground and no ancestor policy narrows
it.

⭐ **The mitigation is the pack provisioning mechanism**
([content-packs-slate](./content-packs-slate.md)): a locality or
institution pack **declares the policy as a requirement**, so it is
created at install and shows on the derived checklist until it exists.
That converts *"someone must remember"* into *"the installer did it, or
it is visibly outstanding."*

⭐ **And the loss aligns with doctrine rather than fighting it.**
legal-code's own rule is that **hierarchy is DECLARED, never assumed** —
so a Compact policing every institution's law by prefix was always
assuming a hierarchy the constitution says must be declared. The old
shape let path structure smuggle in an incorporation the charter
mechanism is supposed to establish explicitly.

⚠ **Rejected alternative: glob policies** (`**/law/**`). It would restore
the one-line guarantee, but pattern-matched security policy brings
precedence and accidental-breadth problems that a longest-prefix trie
does not have, and this slate's whole safety argument rests on that trie.
Not worth trading a proof for a convenience.

## The invariant that makes it safe

> **The policy NARROWS an already-permitted write. It never widens
> one.**

The existing ownership rungs run **first** and must pass; only then
does the writer check apply. If you do not own the branch you were
already denied, so **a `writers` policy can never become an
escalation vector** — it has no power to grant.

That single invariant is what makes this safe to hand to content
authors.

## Nearest-wins — and why that still cannot widen

Effect is **nearest policy wins.** (Intersection-down-the-chain
*sounds* safer but bricks branches: `[LawLogic]` ∩ `[GuildLogic]` =
nothing writable.)

Protection against a deeper branch re-opening itself falls out with
**no special rule**: **the policy document is itself governed by the
policy above it.** Writing `<guild extent>/law/sub/.policy` must first
satisfy the policy at `<guild extent>/law/`. So widening is **possible but governed** — the
right answer, and free.

## Self-amendment

| Branch state | Who may set the policy |
|---|---|
| **unpoliced** | the **owner** (they already own it) |
| **policed** | **only the module the policy names** |

Which means, for law: **changing how law is made requires making a
law** — a `structural` instrument, which the taxonomy already has.
Precisely how constitutions work, and the recursion closes without
inventing anything.

## The escape hatch, stated honestly

**The wizard axis breaks glass, and the override is logged loudly**
as an authoring event. Not because exceptions are pleasant, but
because **anyone who can run arbitrary code can already write
anything** — a gate pretending otherwise is theater, and the sandbox
doctrine already holds code-trust as the one axis nothing opens.
**Better a visible override than an imaginary guarantee.**

## Scope — and what this deliberately is not

- **Writes means create, update, and delete.**
- **`readers` is the obvious sibling** — noted, **not built**,
  because nothing needs it yet.
- **Sealing is a different mechanism.** The
  [press slate](./press-slate.md)'s *seal-don't-hide* is
  **per-document** (existence public, content withheld); this is
  **per-branch**. Do not conflate them.

## Footguns and mitigations

| Footgun | Mitigation |
|---|---|
| a policy naming a **module that does not exist** bricks the branch | validate at set time with the **existing `lint:gates` resolver**; wizard hatch as last resort |
| a policy naming a module with **no write path to that prefix** silently freezes it | warn at set time |
| an **orphaned** policy (its module deleted later) | the gates lint is CI-gating, so a deleted module surfaces there |

## Consumers (the argument for building it now)

| Branch | Writer | Why |
|---|---|---|
| each institution's `<extent>/law/**` | `LawLogic` | the enactment chokepoint — the hard requirement. ⚠ Per-institution, not one root |
| a guild's charter branch | `GuildLogic` | charters must not be hand-edited |
| CMS go-live records | the go-live path | provenance integrity |
| contract records | `ContractLogic` | terms must move through the escrow path |
| per-guild recipe books | `CraftLogic`/guild | proprietary knowledge worth guarding |

**Law is simply the first caller that cannot proceed without it.**

## Open questions (for requirements)

1. **The policy document's name and placement convention** —
   `.policy` at the branch root, a reserved leaf, or a field on an
   owning record? (Instinct: a reserved leaf, so it is visible in
   the CMS tree rather than hidden.)
2. **Resolution caching** — a longest-prefix walk per save is cheap,
   but a warmed prefix cache is the shipped pattern
   (`AddressApi`-style); decide whether it needs one.
3. **Does `writers` accept anything besides module IDs?** (Instinct:
   **no**, deliberately — a module is a code identity the lint can
   verify. Admitting groups or players would rebuild ACLs, which the
   ownership rungs already do.)
4. **Set-time authorization for the first policy** — an owner
   policing their own branch is fine, but should there be a floor
   preventing an owner from policing a branch they own *inside*
   someone else's tree?
5. **Migration** — retrofitting a policy onto an existing branch
   with live writers; presumably a wizard-gated one-time operation.
