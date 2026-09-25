/**
 * OperationCatalogue — the singleton Idea owning the surgical catalogue:
 * the authored `Operation` rows the `operate` verb picks from
 * (clinical-medicine D7).
 *
 * The `DisciplineCatalogue` recipe exactly: warmed at boot by CLASS
 * (`Template.findByClass(Operation.CLASS_PATH)`), so a row shipped under
 * ANY pack root (`/trade/medicine/idea/Operation/…`) is found; a residency
 * veto so it is never culled; a `postRegister` warm, a lazy cold state for
 * unit tests. Read-only canon — no runtime mutation.
 *
 * ⚠ A catalogue nothing boots reads empty forever, so the platform ships
 * `platform/idea/OperationCatalogue.yaml` and `packages/content/platform/
 * pack.yaml` boots it (`role: sync-read`).
 */

import { Idea } from "../../lib/stuff/Idea";
import { PostRegistrationMixin } from "../../lib/stuff/PostRegistration";
import { Template } from "../../lib/stuff/Template";
import Operation, {
  OPERATION_RESOLUTIONS,
  type OperationDescriptor,
  type OperationResolution,
  type OperationAddresses,
  type AnaesthesiaNeed,
} from "./Operation";
import { CompetenceBand } from "../../lib/advancement/CompetenceBand";
import type { VetoResult } from "../../lib/errors";
import type { EvictionContext } from "../../lib/stuff/Stuff";

const OperationCatalogueBase = PostRegistrationMixin(Idea);

export default class OperationCatalogue extends OperationCatalogueBase {
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: "system singleton; never culled" };
  }

  private cache: Map<string, OperationDescriptor> | null = null;

  /** The authored descriptor for `key`, or `null`. */
  public getOperation(key: string): OperationDescriptor | null {
    this.ensureCache();
    return this.cache!.get(key) ?? null;
  }

  /** Whether `key` names a cataloged operation. */
  public has(key: string): boolean {
    this.ensureCache();
    return this.cache!.has(key);
  }

  /** Every authored operation (defensive copies). */
  public allOperations(): OperationDescriptor[] {
    this.ensureCache();
    return [...this.cache!.values()].map(cloneDescriptor);
  }

  public override async postRegister(_context?: unknown): Promise<void> {
    await this.loadCacheFromTemplates();
  }

  public invalidateCache(): void {
    this.cache = null;
  }

  public canDestruct(): VetoResult {
    return {
      ok: false,
      reason:
        "OperationCatalogue is a system singleton and cannot be destructed",
    };
  }

  private ensureCache(): void {
    if (this.cache !== null) return;
    this.cache = new Map();
  }

  private async loadCacheFromTemplates(): Promise<void> {
    const templates = await Template.findByClass(Operation.CLASS_PATH);
    const map = new Map<string, OperationDescriptor>();
    for (const tpl of templates) {
      const descriptor = buildDescriptor(tpl.data);
      if (descriptor) map.set(descriptor.key, descriptor);
    }
    this.cache = map;
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

function buildDescriptor(data: unknown): OperationDescriptor | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  if (typeof d.key !== "string" || d.key.length === 0) return null;
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
    key: d.key,
    label: typeof d.label === "string" && d.label.length > 0 ? d.label : d.key,
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

function cloneDescriptor(d: OperationDescriptor): OperationDescriptor {
  return {
    ...d,
    addresses: { ...d.addresses, traumaTypes: d.addresses.traumaTypes ? [...d.addresses.traumaTypes] : undefined },
    competence: { ...d.competence },
  };
}
