/**
 * Operation — one entry of the surgical catalogue, as an `operation`
 * document (clinical-medicine D7; a document since the path-identity build).
 *
 * Pure authored data under a pack's `content/operations/`
 * (`/trade/medicine/operations/amputation`). What an operation IS — which
 * wound it addresses, what it costs in blood and time, whether it needs
 * anaesthesia, how it resolves — is data; what it DOES to a body
 * (`applyTreatment` / `severPart`) is kernel biology, so a second trade's
 * operation is a file. Its WORD (`operate … for amputation`) is its path's
 * leaf — a typed word, unique at install.
 */

import type { CompetenceBandName } from "../advancement/CompetenceBand";

/** Whether an operation needs the patient under. */
export type AnaesthesiaNeed = "required" | "advised" | "none";

/** How the operation resolves the wound it addresses. */
export const OPERATION_RESOLUTIONS = [
  "surgery",
  "extraction",
  "setting",
  "severance",
] as const;
export type OperationResolution = (typeof OPERATION_RESOLUTIONS)[number];

/** Which wound this operation is for. */
export interface OperationAddresses {
  /** Trauma types it can act on (a `TraumaType` string). */
  traumaTypes?: string[];
  /** Minimum severity of the addressed wound. */
  minSeverity?: number;
  /** Require the wound be interior (a rupture) — optional. */
  interior?: boolean;
  /** Require the wound be still bleeding. */
  bleeding?: boolean;
  /**
   * A special trigger the controller resolves rather than a trauma type:
   * `unsalvageable` scans severable parts via `Vitals.isPartUnsalvageable`
   * (amputation); `foreign-body` is a convenience for the embedded trauma.
   */
  flag?: "foreign-body" | "unsalvageable";
}

/** The runtime descriptor the catalogue caches. */
export interface OperationDescriptor {
  key: string;
  label: string;
  addresses: OperationAddresses;
  /** The instrument capability kind the kit must offer (e.g. `surgery`). */
  instrument: string;
  competence: { discipline: string; band: CompetenceBandName };
  bloodCostL: number;
  baseDurationS: number;
  anaesthesia: AnaesthesiaNeed;
  resolution: OperationResolution;
  /** A `Difficulty` token graded at completion (e.g. `formidable`). */
  difficulty: string;
}
