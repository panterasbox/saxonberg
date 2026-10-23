/**
 * check-envelope — ⭐⭐ **can an author still declare how warm a room is,
 * and can the list of rooms that do only get shorter?**
 *
 * ## Why
 *
 * The light half of the envelope build has a census (`check-light-
 * sources`); the heat half had nothing, and that asymmetry was the
 * hole. Before this build every interior in the realm was 21 °C because
 * one biome row said so, in January, at 4 a.m., with the door open. The
 * build replaced that with a derivation — a room's warmth comes from
 * what it is built of, what stands open, and what is burning in it —
 * and a derivation is only worth having if the bypass is watched.
 *
 * ## ⭐ The rule the whole gate serves
 *
 * > **Authors author CAUSES, not EFFECTS.**
 *
 * You cannot write *well-insulated*; you write *granite, 0.3 m* and the
 * physics decides. A material is checkable, it is already in the world
 * (154 content rows carry a real `thermalConductivity`), and it makes a
 * granite shopfront with a timber stockroom behind it read as *a stone
 * shop with a timber lean-to* rather than as two rooms that disagree
 * for no reason. **The dishonesty was never *rooms differ* — it was
 * *rooms differ for no reason*, and a material is a reason.**
 *
 * So `enclosure:` is ORDINARY and unlisted: a room may say what it is made
 * of freely, as it says what its floor is made of. What is listed is
 * `_temperature`, the one way to bypass the derivation entirely.
 *
 * ## The clauses
 *
 *   (a) ⭐ every row authoring `_temperature` is in
 *       {@link AUTHORED_TEMPERATURES} with a REASON, its length is a
 *       ratchet that may fall and never rise, and a stale entry fails.
 *       This is the one thing that needs a paragraph, so it costs
 *       somebody one.
 *   (b) a `enclosure.material` resolves to a real `Material` row AND that
 *       row authors `thermalConductivity > 0`. ⚠ An unauthored
 *       conductivity reads **zero**, which is an infinite insulator —
 *       silently, and the room would simply never lose heat.
 *   (c) ⭐⭐ **the biome line**: no row whose class extends `Biome`
 *       authors `enclosure`, `thicknessM` or any envelope key. *A biome
 *       may say what the outside AIR is doing; it may never say how
 *       well a structure holds heat.* Climate is a fact about the air;
 *       construction is a fact about the room. Put construction on a
 *       biome and one row warms every room that references it with no
 *       fire in them — the dishonest-physics failure in its purest
 *       form, and the one that CASCADES.
 *   (d) no row under the `/stuff/idea/biome/indoor/` admin subtree
 *       authors `_defaultTemperature`. "Indoor" is a folder that means
 *       *an enclosure*, and an enclosure's temperature is a
 *       structure's. The decree cannot come back.
 *   (e) `FabricSpec` is a CLOSED vocabulary — `material` and
 *       `thicknessM`, and nothing else. There is no `uPerM2`, no
 *       `insulation:`, and no way to type one.
 *
 * ## Why the reason is a list HERE and not a `reason:` key on the row
 *
 * ⚠ A `data:` key the applier does not write is dropped **silently** —
 * the grain-chain drive found 49 such rows. A `reason:` beside the
 * temperature would be a field nothing reads and nothing can miss. This
 * list is a **diff a reviewer reads**, which is the whole point: a sixth
 * cellar costs somebody a paragraph in a file whose ceiling they must
 * also raise. The row keeps a YAML comment as courtesy; the list is the
 * gate.
 *
 * ## Usage
 *
 *   pnpm lint:envelope            # the gate (clauses a–e)
 *   pnpm lint:envelope --report   # every room and how its heat is decided
 */

import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { join, dirname, relative } from "path";
import { fileURLToPath } from "url";
import { parse as parseYaml } from "yaml";
import { composesMixin, packSources, type PackSource,
  effectiveDoc,
  inheritanceIndex,
  type InheritanceIndex,
} from "./pack-roots";

// ⚠ Template inheritance: a CHILD row states no `class:`, so selecting on
// the raw field skips it SILENTLY — which reads exactly like a pass. Every
// row this gate parses goes through `effectiveDoc` first.
let _inheritIdx: InheritanceIndex | null = null;
function inheritIdx(): InheritanceIndex {
  return (_inheritIdx ??= inheritanceIndex());
}


const HERE = dirname(fileURLToPath(import.meta.url));
const SERVER = join(HERE, "..");
const CONTENT = join(SERVER, "..", "content");
const REPO = join(SERVER, "..", "..");

/** The admin folder whose rows describe an ENCLOSURE rather than a climate. */
const INDOOR_BIOME_PREFIX = "/stuff/idea/biome/indoor/";

/** Every key a `enclosure:` spec may carry. Closed, and clause (e) holds it. */
const ENCLOSURE_KEYS = new Set(["material", "thicknessM"]);

/**
 * ⚠⚠ **Rooms that declare their own temperature**, bypassing the
 * envelope entirely — each with the reason it is allowed to.
 *
 * ⭐ The inclusion test, stated so the list can be argued with: **the
 * place is the same temperature the year round for a reason that is not
 * its construction**, and something in the game depends on that being
 * true. All five are maturation cellars: the whole point of a cellar is
 * that it does not follow the weather, and the fermentation and
 * maturation clocks read these numbers directly.
 *
 * ⚠ A room that is merely *cold* is not on this list. Cold is what the
 * envelope produces on its own, from a rock enclosure and no fire; adding
 * a `_temperature` to get it would be authoring an effect over a
 * mechanism that already answers.
 */
export const AUTHORED_TEMPERATURES: ReadonlyArray<{
  path: string;
  reason: string;
}> = [
  {
    path: "/trade/hospitality/location/cellar",
    reason:
      "285 K — a maturation cellar. The bar's cellar holds its own " +
      "temperature the year round by being underground, and the " +
      "maturation clock reads this number directly.",
  },
  {
    path: "/world/terminus/goods-yards/brewing/location/cold-store",
    reason:
      "279 K — a cold store, kept deliberately near freezing. The " +
      "coldest authored room in the realm and the one most obviously " +
      "not a consequence of its walls.",
  },
  {
    path: "/world/terminus/goods-yards/brewing/location/floor",
    reason:
      "288 K — a brewery floor, held cool for the ferment. Its " +
      "temperature is a fact about the trade practised in it.",
  },
  {
    path: "/world/terminus/goods-yards/vintner/location/floor",
    reason:
      "285 K — a vintner's floor, held at cellar temperature for the " +
      "same reason and read by the same maturation clock.",
  },
  {
    path: "/world/terminus/goods-yards/crowsfoot/location/floor",
    reason:
      "289 K — the crowsfoot floor, cool for maturation. The warmest " +
      "of the five, and the first to argue with if this list is ever " +
      "paid down.",
  },
  {
    path: "/world/terminus/hearts-delight/creamery/location/cheese-room",
    reason:
      "284 K — a cheese cave cut into the bank under the creamery (dairy " +
      "D14). A cellar the same the year round is the case this list " +
      "exists for, and here the temperature IS the product: the ripening " +
      "profiles' happy band is 284 K, and a wheel carried up into the warm " +
      "goes over or dies.",
  },
  {
    path: "/world/terminus/hearts-delight/creamery/location/floor",
    reason:
      "293 K — a creamery workroom, held warm for the curd: renneted and " +
      "soured milk is a maturation clock that stalls below 283 K, the " +
      "brewery floor's case exactly. Found by the dairy drive when the " +
      "climate build gave the Delight a winter: a 2.5 kW stove moved this " +
      "room by a few kelvin (267–276 K lit), so the mechanism does not " +
      "answer yet — sizing room heating is thermal's, and this entry is " +
      "the first to pay down when it does.",
  },
  {
    path: "/world/terminus/rejection/location/the-dry",
    reason:
      "293 K — the Dry, the drying room the miners keep warm by its stove " +
      "(its prose: \"a stove in the middle that somebody keeps going\"); " +
      "its warmth IS its trade, and it is the one room on the hill where " +
      "a goat's milk can be set. The stove alone read 272–273 K under the " +
      "climate build's winter (the dairy drive) — pay down with the " +
      "creamery's.",
  },
];

/**
 * Today's count, and it is a RATCHET: it may fall and may never rise.
 * The ceiling IS the list's length, so the two cannot disagree — the
 * only way to lower it is to delete an entry.
 */
export const AUTHORED_TEMPERATURES_CEILING = AUTHORED_TEMPERATURES.length;

interface Row {
  path: string;
  file: string;
  class: string;
  data: Record<string, unknown>;
}

function* walkYaml(dir: string): Generator<string> {
  if (!existsSync(dir)) return;
  for (const e of readdirSync(dir)) {
    if (e.startsWith(".")) continue;
    const full = join(dir, e);
    if (statSync(full).isDirectory()) yield* walkYaml(full);
    else if (e.endsWith(".yaml")) yield full;
  }
}

function contentRows(): Map<string, Row> {
  const out = new Map<string, Row>();
  if (!existsSync(CONTENT)) return out;
  for (const pack of readdirSync(CONTENT).sort()) {
    const contentRoot = join(CONTENT, pack, "content");
    if (!existsSync(contentRoot)) continue;
    for (const file of walkYaml(contentRoot)) {
      let doc: unknown;
      try {
        doc = parseYaml(readFileSync(file, "utf8"));
      } catch {
        continue;
      }
      if (!doc || typeof doc !== "object") continue;
      const d = effectiveDoc(file, doc as Record<string, unknown>, inheritIdx());
      if (typeof d.class !== "string") continue;
      const rel = relative(contentRoot, file).replace(/\.yaml$/, "");
      const path = "/" + rel.split(/[\\/]/).join("/");
      out.set(path, {
        path,
        file: relative(REPO, file),
        class: d.class,
        data: (d.data as Record<string, unknown>) ?? {},
      });
    }
  }
  return out;
}

const biomeCache = new Map<string, boolean>();

function isBiomeRow(row: Row, sources: readonly PackSource[]): boolean {
  return composesMixin(row.class, "Biome", sources, biomeCache);
}

function enclosureOf(row: Row): Record<string, unknown> | null {
  const layers = layersOf(row, "enclosure");
  return layers === null || layers === "none" ? null : (layers[0] ?? null);
}

/**
 * ⭐ One part (`enclosure:` — the walls — or `roof:`) as its layers: a
 * single spec is a one-element list, a list is outermost first, and the
 * literal `none` is no such part (rubber build, D1/D1a).
 */
function layersOf(
  row: Row,
  key: "enclosure" | "roof",
): Array<Record<string, unknown>> | "none" | null {
  const f = row.data[key];
  if (f === "none") return "none";
  if (Array.isArray(f)) {
    return f.filter((l): l is Record<string, unknown> => !!l && typeof l === "object");
  }
  return f && typeof f === "object" ? [f as Record<string, unknown>] : null;
}

/** The two classes a Structure row names (a `Ship` is a Structure). */
const STRUCTURE_CLASSES = new Set(["/platform/idea/Structure", "/platform/idea/Ship", "/platform/idea/Steamer"]);

function isStructureRow(row: Row): boolean {
  return STRUCTURE_CLASSES.has(row.class) || row.data.storeys !== undefined;
}

function report(): void {
  const rows = contentRows();
  const listed = new Set(AUTHORED_TEMPERATURES.map((e) => e.path));
  const lines: string[] = [];
  for (const row of [...rows.values()].sort((a, b) =>
    a.path.localeCompare(b.path),
  )) {
    const enclosure = enclosureOf(row);
    const declared = row.data._temperature !== undefined;
    if (!enclosure && !declared) continue;
    lines.push(
      `  ${row.path}  — ${
        declared
          ? `DECLARED ${String(row.data._temperature)}${listed.has(row.path) ? "" : " (UNLISTED)"}`
          : `enclosure ${String(enclosure?.material ?? "?")}` +
            (enclosure?.thicknessM !== undefined
              ? ` @ ${String(enclosure.thicknessM)} m`
              : "")
      }`,
    );
  }
  console.log(
    `\nlint:envelope --report — ${lines.length} row(s) say something ` +
      `about their own heat.\n`,
  );
  for (const l of lines) console.log(l);
  console.log(
    `\nEverything else derives: the universe enclosure, no fire, and ` +
      `whatever its doors are doing.\n`,
  );
}

function lint(): void {
  const rows = contentRows();
  const sources = packSources();
  const failures: string[] = [];

  // (a) the ratchet, and the list
  if (AUTHORED_TEMPERATURES.length > AUTHORED_TEMPERATURES_CEILING) {
    failures.push(
      `AUTHORED_TEMPERATURES has ${AUTHORED_TEMPERATURES.length} entries, ` +
        `over the ceiling of ${AUTHORED_TEMPERATURES_CEILING}. The list may ` +
        `fall and may never rise.`,
    );
  }
  const listed = new Map(AUTHORED_TEMPERATURES.map((e) => [e.path, e]));
  for (const row of rows.values()) {
    if (row.data._temperature === undefined) continue;
    if (listed.has(row.path)) continue;
    failures.push(
      `${row.file}: authors \`_temperature\` and is not in ` +
        `AUTHORED_TEMPERATURES. ⭐ A room's warmth is DERIVED — from what ` +
        `it is built of, what stands open, and what is burning in it. ` +
        `Declaring it bypasses all three, which is right for a cellar ` +
        `that is the same the year round and wrong for a room that is ` +
        `merely cold (the envelope already makes a room with a rock ` +
        `enclosure and no fire cold). If this one earns it, add the line ` +
        `with its reason; the ceiling is the list's own length.`,
    );
  }
  for (const entry of listed.values()) {
    const row = rows.get(entry.path);
    if (!row) {
      failures.push(
        `'${entry.path}' is listed in AUTHORED_TEMPERATURES but is not a ` +
          `content row (moved? deleted?). A list of ghosts measures nothing.`,
      );
    } else if (row.data._temperature === undefined) {
      failures.push(
        `'${entry.path}' no longer authors \`_temperature\` — the debt is ` +
          `PAID. Delete its line; the ceiling falls with it.`,
      );
    }
  }

  // (b) an enclosure names a material that EXISTS and CONDUCTS — for
  // every layer of both parts, the walls and the roof.
  let enclosureRows = 0;
  for (const row of rows.values()) {
    const parts = (["enclosure", "roof"] as const).flatMap((part) => {
      const raw = row.data[part];
      const layers = layersOf(row, part);
      if (raw !== undefined && raw !== null && layers === null) {
        failures.push(
          `${row.file}: \`${part}: ${JSON.stringify(raw)}\` is neither a ` +
            `layer \`{ material, thicknessM }\`, a list of layers (outermost ` +
            `first), nor \`none\`.`,
        );
      }
      return layers === null || layers === "none"
        ? []
        : layers.map((l) => ({ part, enclosure: l }));
    });
    if (parts.length === 0) continue;
    enclosureRows++;
    for (const { part, enclosure } of parts) {
    // (e) the closed vocabulary
    for (const key of Object.keys(enclosure)) {
      if (ENCLOSURE_KEYS.has(key)) continue;
      failures.push(
        `${row.file}: \`${part}.${key}\` is not part of the EnclosureSpec ` +
          `vocabulary (${[...ENCLOSURE_KEYS].join(", ")}). ⭐ There is no ` +
          `U-value and no insulation rating on purpose: you cannot author ` +
          `"well-insulated", you author a material and a thickness and the ` +
          `physics decides. An authored effect is the dishonesty this ` +
          `build exists to remove.`,
      );
    }
    const materialPath = enclosure.material;
    if (typeof materialPath !== "string") continue;
    const material = rows.get(materialPath);
    if (!material) {
      failures.push(
        `${row.file}: \`enclosure.material: ${materialPath}\` resolves to no ` +
          `row. The envelope would fall back to the universe default and ` +
          `this room would quietly be built of something else.`,
      );
      continue;
    }
    // A thin layer is honest only if it is meant to pass light (glass,
    // horn): an opaque 4 mm wall is a tin shed, said without meaning it.
    const t = Number(enclosure.thicknessM);
    if (t > 0 && t <= 0.005 && material.data.lightAbsorption === undefined) {
      console.warn(
        `  ⚠ ${row.file}: \`${part}\` is ${t} m of '${materialPath}', which ` +
          `passes no light — is that meant to be glass?`,
      );
    }
    const k = material.data.thermalConductivity;
    const kValue =
      typeof k === "number"
        ? k
        : k && typeof k === "object"
          ? Number((k as { value?: unknown }).value)
          : NaN;
    if (!(kValue > 0)) {
      failures.push(
        `${material.file}: named as a \`${part}.material\` by ` +
          `'${row.path}' but authors no positive \`thermalConductivity\`. ` +
          `⚠ An unauthored conductivity reads ZERO, which is an infinite ` +
          `insulator — silently. That room would never lose heat and ` +
          `nothing would say why.`,
      );
    }
    }
  }

  // ⭐⭐ ONE PLACE OR A SET: a structure is never made of anything. Walls
  // and roofs are each place's own, and (f) a structure's storeys are
  // relations only — keys, what stands on what, extents inside its own.
  for (const row of rows.values()) {
    if (!isStructureRow(row)) continue;
    for (const key of ["enclosure", "roof"]) {
      if (row.data[key] === undefined) continue;
      failures.push(
        `${row.file}: a Structure row authoring \`${key}\`. ⛔ A structure ` +
          `says which places are its members and which stand on which — ` +
          `never what anything is made of. Author \`${key}:\` on each ` +
          `member place's own row: a place decides what bounds it alone.`,
      );
    }
    const storeys = row.data.storeys;
    if (storeys === undefined) continue;
    if (!Array.isArray(storeys)) {
      failures.push(`${row.file}: \`storeys\` must be a list of { key, extent, on? }.`);
      continue;
    }
    const extent = String(row.data.extent ?? "").replace(/\/+$/, "");
    const byKey = new Map<string, Record<string, unknown>>();
    for (const st of storeys as Array<Record<string, unknown>>) {
      const key = st?.key;
      for (const k of Object.keys(st ?? {})) {
        if (k === "key" || k === "extent" || k === "on") continue;
        failures.push(
          `${row.file}: storey \`${String(key)}\` authors \`${k}\`. A storey ` +
            `is a relation (key, extent, on) and nothing else — whether it is ` +
            `enclosed is read off its member places' own walls and roof.`,
        );
      }
      if (typeof key !== "string" || key === "") {
        failures.push(`${row.file}: a storey with no \`key\`.`);
        continue;
      }
      if (byKey.has(key)) failures.push(`${row.file}: storey \`${key}\` declared twice.`);
      byKey.set(key, st);
      const sx = String(st.extent ?? "").replace(/\/+$/, "");
      if (extent === "" || (sx !== extent && !sx.startsWith(`${extent}/`))) {
        failures.push(
          `${row.file}: storey \`${key}\`'s extent '${sx}' lies outside the ` +
            `structure's extent '${extent}'.`,
        );
      }
    }
    for (const [key, st] of byKey) {
      const seen = new Set<string>([key]);
      let on = st.on;
      while (typeof on === "string") {
        if (!byKey.has(on)) {
          failures.push(`${row.file}: storey \`${key}\` stands on \`${on}\`, which is no storey.`);
          break;
        }
        if (seen.has(on)) {
          failures.push(`${row.file}: storey \`${key}\` stands on itself through \`${on}\` — a cycle.`);
          break;
        }
        seen.add(on);
        on = byKey.get(on)?.on;
      }
    }
  }

  // (c) ⭐⭐ the biome line
  let biomeRows = 0;
  for (const row of rows.values()) {
    if (!isBiomeRow(row, sources)) continue;
    biomeRows++;
    for (const key of ["enclosure", "thicknessM", "uPerM2", "insulation"]) {
      if (row.data[key] === undefined) continue;
      failures.push(
        `${row.file}: a Biome row authoring \`${key}\`. ⭐⭐ **A biome may ` +
          `say what the outside AIR is doing; it may never say how well a ` +
          `structure holds heat.** Climate is a fact about the air and ` +
          `construction is a fact about the room — put construction here ` +
          `and ONE row warms every room that references it, with no fire ` +
          `in any of them.`,
      );
    }
    // (d) the decree cannot come back
    if (
      row.path.startsWith(INDOOR_BIOME_PREFIX) &&
      row.data._defaultTemperature !== undefined
    ) {
      failures.push(
        `${row.file}: an \`indoor/\` biome authoring ` +
          `\`_defaultTemperature\`. That is the 21 °C decree the envelope ` +
          `build removed: every interior in the realm inherited it, in ` +
          `January, at 4 a.m., with the door open. "Indoor" is a folder ` +
          `that means AN ENCLOSURE, and an enclosure's temperature is a ` +
          `structure's.`,
      );
    }
  }

  if (failures.length) {
    console.error(`\n✖ lint:envelope — ${failures.length} finding(s):\n`);
    for (const f of failures) console.error(`  ${f}\n`);
    process.exit(1);
  }
  console.log(
    `check-envelope: ${AUTHORED_TEMPERATURES.length}/` +
      `${AUTHORED_TEMPERATURES_CEILING} room(s) declare their own ` +
      `temperature, each with a reason; ${enclosureRows} row(s) name an enclosure ` +
      `that resolves and conducts; ${biomeRows} biome row(s) claim nothing ` +
      `about construction and no indoor biome decrees a temperature.`,
  );
}

function main(): void {
  const mode = process.argv.find((a) => a.startsWith("--")) ?? "--lint";
  if (mode === "--report") return report();
  lint();
}

if (process.argv[1] && /check-envelope\.ts$/.test(process.argv[1])) main();
