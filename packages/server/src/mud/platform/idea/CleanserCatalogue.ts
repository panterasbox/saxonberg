/**
 * CleanserCatalogue — the singleton Idea owning the cleanser vocabulary:
 * the authored `Cleanser` rows a wash finds by the AGENT TAG its cleanser
 * carries (cleanliness D2).
 *
 * The `JointCatalogue` shape: warmed by CLASS, lazily, on first read; no
 * boot entry (`lint:template-scans` lists the warm under `LAZY_DICT`).
 * `warmed`/`byAgentWarmed` are async (the wash, before it decides);
 * `peek`/`peekByAgent` are sync (a `look`, a begin line) and kick a warm
 * when cold. A malformed row is skipped and NAMED, never thrown.
 */

import { Idea } from "../../lib/stuff/Idea";
import { Template } from "../../lib/stuff/Template";
import Cleanser, {
  CLEANSER_ACTIONS,
  type CleanserAction,
  type CleanserDamage,
  type CleanserDescriptor,
} from "./Cleanser";
import type { VetoResult } from "../../lib/errors";
import type { EvictionContext } from "../../lib/stuff/Stuff";

const CleanserCatalogueBase = Idea;

const DAMAGE_EFFECTS: readonly CleanserDamage["effect"][] = [
  "felts",
  "scratches",
  "yellows",
];

export default class CleanserCatalogue extends CleanserCatalogueBase {
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: "system singleton; never culled" };
  }

  private byKey: Map<string, CleanserDescriptor> = new Map();
  private warmedOnce = false;

  /** The authored cleanser for `key`, warming on a cold miss. */
  public async warmed(key: string): Promise<CleanserDescriptor | null> {
    if (!this.warmedOnce) await this.warm();
    const d = this.byKey.get(key);
    return d ? copy(d) : null;
  }

  /** Every authored cleanser, warming first. Alphabetical by key. */
  public async allWarmed(): Promise<CleanserDescriptor[]> {
    if (!this.warmedOnce) await this.warm();
    return [...this.byKey.values()]
      .sort((a, b) => a.key.localeCompare(b.key))
      .map(copy);
  }

  /**
   * The cleanser whose agent is one of `tags` (a material's tags), warming
   * first. The first authored match in key order — a material carrying two
   * agent tags is the author's call to make, and the order is stable.
   */
  public async byTagsWarmed(tags: readonly string[]): Promise<CleanserDescriptor | null> {
    if (!this.warmedOnce) await this.warm();
    return this.match(tags);
  }

  /** The cleanser for one ambient agent (`sunlight`), sync. */
  public peekByAgent(agent: string): CleanserDescriptor | null {
    this.kick();
    return this.match([agent]);
  }

  /** The cleanser for `tags`, sync — a cold read answers `null`. */
  public peekByTags(tags: readonly string[]): CleanserDescriptor | null {
    this.kick();
    return this.match(tags);
  }

  /** The index as it stands, with no wait; a cold read starts the warm. */
  public peek(key: string): CleanserDescriptor | null {
    this.kick();
    const d = this.byKey.get(key);
    return d ? copy(d) : null;
  }

  /** Stand the roster up from every row naming the Cleanser class. */
  public async warm(): Promise<number> {
    const templates = await Template.findByClass(Cleanser.CLASS_PATH);
    const index = new Map<string, CleanserDescriptor>();
    for (const tpl of templates) {
      const d = describe(tpl.data);
      if (typeof d === "string") {
        console.warn(`CleanserCatalogue: skipping '${tpl.path}': ${d}`);
        continue;
      }
      if (index.has(d.key)) {
        console.warn(
          `CleanserCatalogue: cleanser '${d.key}' authored twice — the ` +
            `first warmed keeps it, '${tpl.path}' ignored`,
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
      reason: "CleanserCatalogue is a system singleton and cannot be destructed",
    };
  }

  private kick(): void {
    if (this.warmedOnce) return;
    void this.warm().catch((err: unknown) => {
      console.warn("CleanserCatalogue: lazy warm failed:", err);
    });
  }

  private match(tags: readonly string[]): CleanserDescriptor | null {
    const keys = [...this.byKey.keys()].sort();
    for (const key of keys) {
      const d = this.byKey.get(key);
      if (d && tags.includes(d.agent)) return copy(d);
    }
    return null;
  }
}

/** Validate one row's data into a descriptor, or the reason it is malformed. */
function describe(data: unknown): CleanserDescriptor | string {
  if (!data || typeof data !== "object") return "no data";
  const d = data as Record<string, unknown>;
  if (typeof d.key !== "string" || d.key.length === 0) return "no key";
  if (typeof d.agent !== "string" || d.agent.length === 0) return "no agent";
  if (!(CLEANSER_ACTIONS as readonly string[]).includes(String(d.action))) {
    return `action '${String(d.action)}' is not one of ${CLEANSER_ACTIONS.join("|")}`;
  }
  const damages: CleanserDamage[] = [];
  if (d.damages !== undefined && d.damages !== null) {
    if (!Array.isArray(d.damages)) return "damages is not a list";
    for (const raw of d.damages) {
      const r = (raw ?? {}) as Record<string, unknown>;
      if (typeof r.fibreTag !== "string" || r.fibreTag.length === 0) {
        return "a damage names no fibreTag";
      }
      if (!DAMAGE_EFFECTS.includes(r.effect as CleanserDamage["effect"])) {
        return `damage effect '${String(r.effect)}' is not one of ${DAMAGE_EFFECTS.join("|")}`;
      }
      damages.push({
        fibreTag: r.fibreTag,
        effect: r.effect as CleanserDamage["effect"],
        aboveK: typeof r.aboveK === "number" ? r.aboveK : null,
      });
    }
  }
  const num = (v: unknown, fallback: number): number =>
    typeof v === "number" && Number.isFinite(v) ? v : fallback;
  return {
    key: d.key,
    agent: d.agent,
    action: d.action as CleanserAction,
    damages,
    hardWaterPenalty: d.hardWaterPenalty === true,
    softens: d.softens === true,
    consumesPerWash: Math.max(0, num(d.consumesPerWash, 0)),
    skinHarshness: Math.max(0, Math.min(1, num(d.skinHarshness, 0))),
    ambient: d.ambient === true,
  };
}

function copy(d: CleanserDescriptor): CleanserDescriptor {
  return { ...d, damages: d.damages.map((x) => ({ ...x })) };
}
