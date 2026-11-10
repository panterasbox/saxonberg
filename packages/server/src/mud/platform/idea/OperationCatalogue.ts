/**
 * OperationCatalogue — the singleton that serves the `operation` documents
 * (what a surgeon can do: `extraction`, `bleed-control`, `amputation`, any
 * pack's `content/operations/`), reached as `ConditionApi.operations()`.
 * What an operation IS: `lib/vitals/Operation.ts`.
 *
 * ⭐ `operate` reads `all()` — one indexed read the first time a surgeon
 * operates, never at boot; a surgeon names an operation by its word.
 */

import { DocumentCatalogue } from "../../lib/document/DocumentCatalogue";
import { CompetenceBand } from "../../lib/advancement/CompetenceBand";
import type { BoundaryRole } from "../../lib/security/BoundaryRole";
import {
  OPERATION_RESOLUTIONS,
  type AnaesthesiaNeed,
  type OperationAddresses,
  type OperationDescriptor,
  type OperationResolution,
} from "../../lib/vitals/Operation";

export default class OperationCatalogue extends DocumentCatalogue<OperationDescriptor> {
  /** A reference catalogue everyone reads (the commons). */
  static boundaryRole: BoundaryRole = "commons";

  protected readonly kind = "operation";

  /** Read an operation document at `path` (the installer's validator too). */
  public parse(data: Record<string, unknown>, path: string): OperationDescriptor {
    const key = path.slice(path.lastIndexOf("/") + 1);
    if (!key) throw new Error(`operation '${path}' has no leaf to be its word`);
    return buildDescriptor(data, key);
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

