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

import { CompetenceBand } from "../advancement/CompetenceBand";
import type { CompetenceBandName } from "../advancement/CompetenceBand";
import { DocumentCache } from "../document/DocumentCache";

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

/**
 * The operation documents, by path — see the module header.
 *
 * @internal the medic substrate's; a surgeon names an operation by its word.
 */
export class Operation {
  private static memo: DocumentCache<OperationDescriptor> | null = null;
  private static get cache(): DocumentCache<OperationDescriptor> {
    // Built on first use: a static built at module load races an import
    // cycle through the document store.
    return (Operation.memo ??= new DocumentCache<OperationDescriptor>("operation", (doc) =>
      Operation.fromData(doc.getData(), doc.getPath()),
    ));
  }

  /** Read an operation document at `path` (the installer's validator too). */
  public static fromData(data: Record<string, unknown>, path: string): OperationDescriptor {
    const key = path.slice(path.lastIndexOf("/") + 1);
    if (!key) throw new Error(`operation '${path}' has no leaf to be its word`);
    return buildDescriptor(data, key);
  }

  /**
   * ⭐ Every operation any pack ships — the lazy dictionary `operate` reads
   * (a typed word and a roster; scan-sweep ruling 1). One indexed read, the
   * first time a surgeon operates; never at boot.
   */
  public static all(): Promise<OperationDescriptor[]> {
    return Operation.cache.all();
  }

  /** Keep an operation (a unit fixture with no store behind it). */
  public static remember(path: string, d: OperationDescriptor): OperationDescriptor {
    return Operation.cache.remember(path, d);
  }
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

function buildAddresses(value: unknown): OperationAddresses {
  if (!value || typeof value !== "object") return {};
  const a = value as {
    traumaTypes?: unknown;
    minSeverity?: unknown;
    interior?: unknown;
    bleeding?: unknown;
    flag?: unknown;
  };
  const out: OperationAddresses = {};
  if (Array.isArray(a.traumaTypes)) out.traumaTypes = stringArray(a.traumaTypes);
  if (typeof a.minSeverity === "number") out.minSeverity = a.minSeverity;
  if (typeof a.interior === "boolean") out.interior = a.interior;
  if (typeof a.bleeding === "boolean") out.bleeding = a.bleeding;
  if (a.flag === "foreign-body" || a.flag === "unsalvageable")
    out.flag = a.flag;
  return out;
}

function buildDescriptor(d: Record<string, unknown>, key: string): OperationDescriptor {
  const comp = (d.competence ?? {}) as { discipline?: unknown; band?: unknown };
  const band = CompetenceBand.isBand(comp.band) ? comp.band : "competent";
  const resolution: OperationResolution = OPERATION_RESOLUTIONS.includes(
    d.resolution as OperationResolution,
  )
    ? (d.resolution as OperationResolution)
    : "surgery";
  const anaesthesia: AnaesthesiaNeed =
    d.anaesthesia === "required" || d.anaesthesia === "none"
      ? d.anaesthesia
      : "advised";
  return {
    key,
    label: typeof d.label === "string" && d.label.length > 0 ? d.label : key,
    addresses: buildAddresses(d.addresses),
    instrument: typeof d.instrument === "string" ? d.instrument : "surgery",
    competence: {
      discipline:
        typeof comp.discipline === "string" ? comp.discipline : "medicine",
      band,
    },
    bloodCostL: typeof d.bloodCostL === "number" ? d.bloodCostL : 0,
    baseDurationS: typeof d.baseDurationS === "number" ? d.baseDurationS : 120,
    anaesthesia,
    resolution,
    difficulty:
      typeof d.difficulty === "string" ? d.difficulty : "formidable",
  };
}

