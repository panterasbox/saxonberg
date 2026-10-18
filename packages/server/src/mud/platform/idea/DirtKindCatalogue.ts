/**
 * DirtKindCatalogue — the singleton Idea owning the dirt vocabulary: the
 * authored `DirtKind` rows a deposit names by key (cleanliness D2).
 *
 * The `JointCatalogue` shape: warmed by CLASS
 * (`Template.findByClass(DirtKind.CLASS_PATH)`), so a row under ANY pack
 * root (`/trade/mining/idea/DirtKind/dust`) is found with no boot line. It
 * warms LAZILY, on first read; there is no `onCreate` and no boot entry
 * (`lint:template-scans` lists the warm under `LAZY_DICT`).
 *
 * ⚠ Two reads, on purpose. `warmed(key)` is async and warms on a miss —
 * `wash` uses it, because the chemistry DECIDES something. `peek(key)` is
 * SYNC and never waits — `look` and the band sentence use it, and a cold
 * peek answers `null` (the reader falls back to the key as the word) and
 * kicks a warm so the next read is not cold.
 *
 * ⚠ A malformed row is skipped and NAMED, never thrown.
 */

import { Idea } from "../../lib/stuff/Idea";
import { Template } from "../../lib/stuff/Template";
import DirtKind, { DIRT_FORMS, type DirtForm, type DirtKindDescriptor } from "./DirtKind";
import { CLEANSER_ACTIONS, type CleanserAction } from "./Cleanser";
import type { VetoResult } from "../../lib/errors";
import type { EvictionContext } from "../../lib/stuff/Stuff";

const DirtKindCatalogueBase = Idea;

export default class DirtKindCatalogue extends DirtKindCatalogueBase {
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: "system singleton; never culled" };
  }

  private byKey: Map<string, DirtKindDescriptor> = new Map();
  private warmedOnce = false;

  /** The authored dirt for `key`, warming on a cold miss; `null` if none. */
  public async warmed(key: string): Promise<DirtKindDescriptor | null> {
    if (!this.warmedOnce) await this.warm();
    const d = this.byKey.get(key);
    return d ? copy(d) : null;
  }

  /** Every authored dirt, warming first. Alphabetical by key. */
  public async allWarmed(): Promise<DirtKindDescriptor[]> {
    if (!this.warmedOnce) await this.warm();
    return [...this.byKey.values()]
      .sort((a, b) => a.key.localeCompare(b.key))
      .map(copy);
  }

  /** The index as it stands, with no wait; a cold read starts the warm. */
  public peek(key: string): DirtKindDescriptor | null {
    if (!this.warmedOnce) {
      void this.warm().catch((err: unknown) => {
        console.warn("DirtKindCatalogue: lazy warm failed:", err);
      });
    }
    const d = this.byKey.get(key);
    return d ? copy(d) : null;
  }

  /** Whether the index has been stood up since boot (or the last go-live). */
  public isWarm(): boolean {
    return this.warmedOnce;
  }

  /** Stand the roster up from every row naming the DirtKind class. */
  public async warm(): Promise<number> {
    const templates = await Template.findByClass(DirtKind.CLASS_PATH);
    const index = new Map<string, DirtKindDescriptor>();
    for (const tpl of templates) {
      const d = describe(tpl.data);
      if (typeof d === "string") {
        console.warn(`DirtKindCatalogue: skipping '${tpl.path}': ${d}`);
        continue;
      }
      if (index.has(d.key)) {
        console.warn(
          `DirtKindCatalogue: dirt '${d.key}' authored twice — the first ` +
            `warmed keeps it, '${tpl.path}' ignored`,
        );
        continue;
      }
      index.set(d.key, d);
    }
    this.byKey = index;
    this.warmedOnce = true;
    return index.size;
  }

  /** Drop the index so the next read re-warms (a pack install / go-live). */
  public invalidateCache(): void {
    this.byKey = new Map();
    this.warmedOnce = false;
  }

  public canDestruct(): VetoResult {
    return {
      ok: false,
      reason: "DirtKindCatalogue is a system singleton and cannot be destructed",
    };
  }
}

function actions(v: unknown, field: string): CleanserAction[] | string {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) return `${field} is not a list`;
  for (const a of v) {
    if (!(CLEANSER_ACTIONS as readonly string[]).includes(String(a))) {
      return `${field} names '${String(a)}', not one of ${CLEANSER_ACTIONS.join("|")}`;
    }
  }
  return v as CleanserAction[];
}

/** Validate one row's data into a descriptor, or the reason it is malformed. */
function describe(data: unknown): DirtKindDescriptor | string {
  if (!data || typeof data !== "object") return "no data";
  const d = data as Record<string, unknown>;
  if (typeof d.key !== "string" || d.key.length === 0) return "no key";
  const form = d.form ?? "film";
  if (!(DIRT_FORMS as readonly string[]).includes(String(form))) {
    return `form '${String(form)}' is not one of ${DIRT_FORMS.join("|")}`;
  }
  const answersTo = actions(d.answersTo, "answersTo");
  if (typeof answersTo === "string") return answersTo;
  const setAnswersTo = actions(d.setAnswersTo, "setAnswersTo");
  if (typeof setAnswersTo === "string") return setAnswersTo;
  const contaminates: Record<string, number> = {};
  if (d.contaminates && typeof d.contaminates === "object") {
    for (const [k, v] of Object.entries(d.contaminates as Record<string, unknown>)) {
      if (typeof v === "number" && v > 0) contaminates[k] = Math.min(1, v);
    }
  }
  const lifts =
    typeof d.waterLifts === "number" && Number.isFinite(d.waterLifts)
      ? Math.max(0, Math.min(1, d.waterLifts))
      : 0.3;
  const brush =
    typeof d.brushLifts === "number" && Number.isFinite(d.brushLifts)
      ? Math.max(0, Math.min(1, d.brushLifts))
      : 0;
  return {
    key: d.key,
    adjective:
      typeof d.adjective === "string" && d.adjective.length > 0
        ? d.adjective
        : d.key,
    form: form as DirtForm,
    answersTo,
    setsAboveK:
      typeof d.setsAboveK === "number" && Number.isFinite(d.setsAboveK)
        ? d.setsAboveK
        : null,
    setAnswersTo,
    absorbedBy: d.absorbedBy === true,
    contaminates,
    waterLifts: lifts,
    brushLifts: brush,
  };
}

function copy(d: DirtKindDescriptor): DirtKindDescriptor {
  return {
    ...d,
    answersTo: [...d.answersTo],
    setAnswersTo: [...d.setAnswersTo],
    contaminates: { ...d.contaminates },
  };
}
