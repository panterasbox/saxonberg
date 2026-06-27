/**
 * PaymentImplantUpdate — the payment credential as a hosted update: the
 * **wallet**. The incorporeal (Idea-based) twin of the {@link PaymentCard}
 * Thing, composing `PaymentCredentialMixin` (links all the owner's accounts,
 * one active) and `AetherHostedMixin` (the must-be-hosted relation) around a
 * bare `Idea`. Installed once at avatar creation (`Avatar.installDefaultLoadout`,
 * the `TravelCredentialUpdate` precedent) and **body-bound** — the secure
 * default of the risk ladder, not casually lost or stolen (extraction is a
 * deferred dark-future hook).
 *
 * Born with no linked accounts (there is no born-with default account);
 * `openAccount` auto-links each new account to the implant and sets the
 * first active. Session-durable in v1 — re-cloned each login, re-linked by
 * `openAccount`.
 */

import { Idea } from "../stuff/Idea";
import { PaymentCredentialMixin } from "./PaymentCredential";
import { AetherHostedMixin } from "../augmentation/AetherHosted";
import { TemplatePaths } from "../paths";

export default class PaymentImplantUpdate extends PaymentCredentialMixin(
  AetherHostedMixin(Idea)
) {
  static readonly TEMPLATE_PATH = TemplatePaths.paymentImplantUpdate;
}
