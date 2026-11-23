/**
 * TravelCard — a carryable Teleport Authority travel card.
 *
 * A held credential: a thin {@link CredentialWalletMixin} holder over a plain
 * `Thing`, carrying one `travel` credential record (the born-with floor). The
 * card is a bearer **instrument**, never a clearance store: its `travel` record
 * satisfies the `teleport`/`register` *instrument gate* ("do you have the means
 * to use the TPA at all?"), but travel **authorization** (the registered-node
 * set) is bound to the traveller's *identity* — the born-with, aether-hosted
 * wallet — and is never read off, nor written to, the card. Handing the card to
 * another player confers no destinations they didn't already hold on their own
 * identity.
 *
 * Affords no holder-verbs: `register` is afforded by the terminal you're
 * standing at, `teleport` is a general verb. The card is pure instrument.
 */

import Good from "@saxonberg/server/mud/lib/stuff/Good";
import { CredentialWalletMixin } from "@saxonberg/server/mud/lib/credential/CredentialWallet";
import { TravelCredential, type CredentialKind } from "@saxonberg/server/mud/lib/credential/Credential";
import { RelatingMixin, type HeldRelation, type RelatedSet } from "@saxonberg/server/mud/lib/relation/Relating";
import { StuffApi } from "@saxonberg/server/mud/api/stuff";
import type { Stuff } from "@saxonberg/server/mud/lib/stuff/Stuff";

export default class TravelCard extends RelatingMixin(CredentialWalletMixin(Good)) {
  /** Born holding one travel credential record (registered set + floor). */
  static defaultCredentialKinds: readonly CredentialKind[] = ["travel"];

  /** The nodes this card is registered at that are in the world. */
  private registeredNodes(): Stuff[] {
    const out: Stuff[] = [];
    for (const c of this.getCredentials()) {
      if (!(c instanceof TravelCredential)) continue;
      for (const path of c.getRegistered()) {
        const node = StuffApi.findByTemplatePath<Stuff>(path);
        if (node !== undefined && !out.includes(node)) out.push(node);
      }
    }
    return out;
  }

  /** ⭐ `card:~nodes` — the nodes it is registered at (naming overhaul D-B5); anyone may ask. */
  public relationsFor(asker: Stuff | null): HeldRelation[] {
    return [{ name: "nodes", meaning: "the travel nodes this card is registered at" }, ...super.relationsFor(asker)];
  }

  public relatedBy(name: string, asker: Stuff | null): RelatedSet[] {
    const below = super.relatedBy(name, asker);
    if (name !== "nodes") return below;
    return [{ name, meaning: "the travel nodes this card is registered at", members: this.registeredNodes() }, ...below];
  }
}
