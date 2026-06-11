// Offline content-art generation harness (Machine 1 — first pass).
// Drives gpt-image-1 with a locked "Potter watercolor" house style so all
// images read as one storybook. NOT app code — offline tooling, run by hand.
// Output is scratch (S3 is the real home); nothing here is committed.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, "samples");
const ENV = resolve(HERE, "../../packages/server/.env");
const SEEDS = resolve(HERE, "../../packages/server/src/mud/seeds");

// --- read a field out of a seed YAML (inline or folded block scalar) -------
// Tiny purpose-built extractor — proves the model-driven prompt without
// booting the engine. The live-introspection path replaces this entirely.
function seedField(txt, key) {
  const lines = txt.split("\n");
  const re = new RegExp(`^(\\s*)${key}:\\s*(.*)$`);
  const idx = lines.findIndex((l) => re.test(l));
  if (idx < 0) return null;
  const m = lines[idx].match(re);
  const indent = m[1].length;
  const inline = m[2].trim();
  if (inline && !/^[>|]-?$/.test(inline)) {
    return inline.replace(/^["']|["']$/g, "");
  }
  const out = [];
  for (let i = idx + 1; i < lines.length; i++) {
    if (lines[i].trim() === "") continue;
    if (lines[i].match(/^(\s*)/)[1].length <= indent) break;
    out.push(lines[i].trim());
  }
  return out.join(" ").trim();
}

// Build the *subject* clause from a species seed — the model is the source
// of truth for morphology, build, and material, not a hand-written guess.
function speciesSubject(relSeedPath) {
  const txt = readFileSync(resolve(SEEDS, relSeedPath), "utf8");
  const desc = seedField(txt, "defaultDescription");
  const common = (seedField(txt, "commonNames") || "")
    .replace(/[[\]"']/g, "")
    .split(",")[0]
    .trim();
  const bodyPlan = (seedField(txt, "_bodyPlanPath") || "").split("/").pop();
  const material = (seedField(txt, "_defaultMaterialPath") || "")
    .split("/")
    .pop();
  const morph = bodyPlan === "biped" ? "a bipedal humanoid figure" : bodyPlan;
  // flesh is the unmarked default for living things; only name exotic stuff.
  const mat = material && material !== "flesh" ? ` Made of ${material}.` : "";
  return `${morph} of the kind commonly called "${common}". ${desc}${mat}`;
}

// --- read the key from the gitignored server .env -------------------------
function readKey() {
  const txt = readFileSync(ENV, "utf8");
  const m = txt.match(/^OPENAI_API_KEY=(.+)$/m);
  if (!m) throw new Error("OPENAI_API_KEY not found in " + ENV);
  return m[1].trim().replace(/^["']|["']$/g, "");
}

// --- the house style: one preamble every image shares ---------------------
// Cohesion lock #1 (palette) + technique live here; locks #2 (reference
// image) and #4 (post-process LUT/grain) come later once the lane is proven.
const STYLE = [
  "Children's storybook illustration in the style of Beatrix Potter and",
  "E.H. Shepard. Delicate naturalist watercolor over a fine, sparing",
  "pen-and-ink line. Soft painterly edges, visible cold-press watercolor",
  "paper grain, gentle soft daylight, no harsh shadows. Muted desaturated",
  "earthy palette: sage and moss green, dusty brown, ochre, faded",
  "slate-blue, warm grey, soft terracotta, cream paper white. Warm,",
  "old-fashioned, gentle, all-ages.",
].join(" ");

const AVOID = [
  "No photorealism, no 3D render, no CGI, no harsh or dramatic shadows,",
  "no neon or saturated color, no thick black outlines, no digital airbrush",
  "gloss, no text, letters, or watermarks.",
].join(" ");

// --- per-type composition templates (cohesion lock #3) --------------------
// Subjects map to real game content so we judge cohesion across a character,
// a second character, a room, and an item — the user's "variable fidelity" fear.
const SUBJECTS = [
  {
    name: "race-khazad",
    size: "1024x1536", // portrait 2:3
    seed: "lib/species/animalia/chordata/mammalia/primates/hominidae/homo/khazadicus.yaml",
    composition:
      "Three-quarter full-body figure, three-quarter turn, eye-level, " +
      "centered, soft watercolor vignette fading to bare cream paper.",
  },
  {
    name: "race-human",
    size: "1024x1536",
    seed: "lib/species/animalia/chordata/mammalia/primates/hominidae/homo/sapiens.yaml",
    composition:
      "Three-quarter full-body figure, three-quarter turn, eye-level, " +
      "centered, soft watercolor vignette fading to bare cream paper.",
  },
  {
    name: "room-tavern",
    size: "1536x1024", // landscape 3:2
    subject:
      "A cozy village tavern common room: timber beams, a stone hearth " +
      "with a low fire, worn wooden tables and stools, a few clay mugs, " +
      "warm and quiet, no people.",
    composition:
      "Establishing interior view, slightly elevated eye-level, " +
      "naturalistic setting filling the frame.",
  },
  {
    name: "item-cloak",
    size: "1024x1024", // square
    subject:
      "A single woolen traveling cloak in faded moss green, with a simple " +
      "bronze clasp, gently folded.",
    composition:
      "Single object centered, faint soft cast shadow, on near-bare cream paper.",
  },
];

async function generate(key, s) {
  const subject = s.seed ? speciesSubject(s.seed) : s.subject;
  const prompt = `${STYLE}\n\n${s.composition} ${subject}\n\n${AVOID}`;
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt,
      size: s.size,
      quality: "medium",
      n: 1,
    }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(
      `${s.name}: HTTP ${res.status} — ${JSON.stringify(json.error ?? json)}`
    );
  }
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) throw new Error(`${s.name}: no image in response`);
  const file = resolve(OUT, `${s.name}.png`);
  writeFileSync(file, Buffer.from(b64, "base64"));
  return { file, usage: json.usage };
}

async function main() {
  const key = readKey();
  mkdirSync(OUT, { recursive: true });
  const only = process.argv.slice(2);
  const subjects = only.length
    ? SUBJECTS.filter((s) => only.includes(s.name))
    : SUBJECTS;
  for (const s of subjects) {
    process.stdout.write(`generating ${s.name} (${s.size})... `);
    try {
      const { file, usage } = await generate(key, s);
      console.log(`ok -> ${file}` + (usage ? `  [${JSON.stringify(usage)}]` : ""));
    } catch (e) {
      console.log("FAILED");
      console.error("  " + e.message);
    }
  }
}

main();
