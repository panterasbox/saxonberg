/**
 * Operation — one row of the surgical catalogue as a leaf Idea
 * (clinical-medicine D7).
 *
 * The `Discipline` shape exactly: a pure-data leaf authored under a pack
 * root (`/trade/medicine/idea/Operation/<key>`), read by
 * `OperationCatalogue` straight from `template.data`, never cloned as
 * live Stuff. What an operation IS — which wound it addresses, what it
 * costs in blood and time, whether it needs anaesthesia, and how it
 * resolves — is data; what it DOES to a body (`applyTreatment` /
 * `severPart`) is kernel biology, so a second trade's operation is a row.
 *
 * `key`, not templatePath, is the durable join.
 */

import { Idea } from "../../lib/stuff/Idea";
import type { CompetenceBandName } from "../../lib/advancement/CompetenceBand";
import type { FieldMeta } from "../../lib/mixin";

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

export default class Operation extends Idea {
  /** The class every Operation row names — what the catalogue warms by. */
  static readonly CLASS_PATH = "/platform/idea/Operation";

  public key: string = "";
  public label: string = "";
  public addresses: OperationAddresses = {};
  public instrument: string = "surgery";
  public competence: { discipline: string; band: CompetenceBandName } = {
    discipline: "medicine",
    band: "competent",
  };
  public bloodCostL: number = 0;
  public baseDurationS: number = 120;
  public anaesthesia: AnaesthesiaNeed = "advised";
  public resolution: OperationResolution = "surgery";
  public difficulty: string = "formidable";

  static fieldMeta: FieldMeta = {
    key: { persistent: true },
    label: { persistent: true },
    addresses: { persistent: true },
    instrument: { persistent: true },
    competence: { persistent: true },
    bloodCostL: { persistent: true },
    baseDurationS: { persistent: true },
    anaesthesia: { persistent: true },
    resolution: { persistent: true },
    difficulty: { persistent: true },
  };

  public getKey(): string {
    return this.key;
  }
  public getLabel(): string {
    return this.label;
  }
}
