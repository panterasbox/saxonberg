/**
 * PaymentCard — the carryable payment credential: a `Thing` you hold (and
 * can lose), 1:1 with one account (the bearer instrument). A finder can
 * spend it up to its cap until it's frozen — the deliberate middle of the
 * risk ladder (more recoverable than cash, less secure than the body-bound
 * implant). The `PaymentCredentialMixin` demonstrator over a corporeal base,
 * homed beside the mixin (the `TravelCard` precedent).
 */

import Thing from "../stuff/Thing";
import { PaymentCredentialMixin } from "./PaymentCredential";

export default class PaymentCard extends PaymentCredentialMixin(Thing) {}
