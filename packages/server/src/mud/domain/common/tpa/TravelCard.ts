/**
 * TravelCard — a carryable Teleport Authority travel card.
 *
 * A held credential: composes `TravelCredentialMixin` (the registered-node
 * set + register/authorize surface) on a plain `Thing`. State lives on the
 * card, so handing it to another player hands over its registered routes —
 * the transferable half of the credential (the implant is the personal half).
 *
 * Issued into every fresh Avatar's inventory at clone time by
 * `Avatar.installDefaultLoadout` (the card is the v1 default credential; the
 * cranial slot is capacity-1 and already holds the AetherImplant).
 */

import Thing from "../../../lib/stuff/Thing";
import { TravelCredentialMixin } from "../../../lib/fasttravel/TravelCredential";

export default class TravelCard extends TravelCredentialMixin(Thing) {
  static readonly TEMPLATE_PATH = "/domain/common/tpa/travel-card";
}
