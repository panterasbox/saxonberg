/**
 * Live content-illustration harness (Machine 1 — "go live").
 *
 * Boots the real engine, resolves a content Stuff, and assembles the
 * image prompt FROM THE INTERNAL MODEL — the same composed state the
 * `look` pipeline reads (description, contained things, exits + door
 * state). The image becomes a render of the model, not a hand-written
 * guess. Offline tooling; not part of the server runtime.
 *
 * Isolation: boots against its OWN scratch DB (`<db>_media`) so it never
 * touches the DB a concurrent dev server is using.
 *
 * Run from `packages/server/`:
 *   tsx src/tools/illustrate-preload.js location /domain/eternal/duncan-hall/lobby
 */
import "dotenv/config";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

import { AppBootstrap } from "../backend/AppBootstrap";
import { StuffApi } from "../mud/api/stuff";
import { ContainmentApi } from "../mud/api/containment";
import { MediaAsset } from "../mud/lib/media/MediaAsset";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, "../../../../tools/imagegen/samples");

// Pipeline constants. The harness shells out to the `aws` CLI for the
// upload so the AWS SDK stays out of the server's dependency tree.
const BUCKET = "panterasbox-media";
const STYLE_VERSION = "potter-v1";
const MODEL = "gpt-image-1";
const QUALITY = "medium";
// ILLUSTRATE_SKIP_IMAGE=1 → record-only backfill: derive the prompt and
// write/update the MediaAsset record without re-spending on generation or
// re-uploading (the asset is already in S3).
const SKIP_IMAGE = process.env.ILLUSTRATE_SKIP_IMAGE === "1";

// --- the locked Potter house style (cohesion lock #1, shared verbatim
// with the static harness — promote to one file when a third caller appears).
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

// Loose structural views onto the mixin surfaces this harness reads. The
// engine narrows these with MixinApi predicates; a tooling script reaching
// across several mixins reads them through small local shapes instead.
interface DescribedLike {
  getShortDescription?(): string;
  getLongDescription?(): string;
}
interface ExitableLike {
  getExits?(): ReadonlyMap<string, ExitLike>;
}
interface ExitLike {
  getDirection(): string;
  getDoor(): { isOpen(): boolean; getShortDescription(): string } | null;
}

/** Assemble a location's prompt from its live composed state. */
function locationPrompt(loc: unknown): { prompt: string; size: string } {
  const d = loc as DescribedLike;
  const short = d.getShortDescription?.() ?? "";
  const long = d.getLongDescription?.() ?? "";

  // Composed state #1 — what's actually in the room (the `populates` clones).
  const contents = ContainmentApi.getContents(loc as never)
    .map((c) => c.getPresentation())
    .filter(Boolean);

  // Composed state #2 — exits, and whether their doors stand open.
  const exits = (loc as ExitableLike).getExits?.() ?? new Map();
  const exitPhrases: string[] = [];
  for (const ex of exits.values()) {
    const door = ex.getDoor();
    const through = door
      ? door.isOpen()
        ? `an open door (${door.getShortDescription()})`
        : `a closed door`
      : `an open way`;
    exitPhrases.push(`to the ${ex.getDirection()}, ${through}`);
  }

  const composition =
    "Establishing interior view, slightly elevated eye-level, " +
    "naturalistic setting filling the frame, no people.";

  const facts = [
    short ? `${short}.` : "",
    long,
    contents.length ? `Things in the room: ${contents.join(", ")}.` : "",
    exitPhrases.length ? `Ways out: ${exitPhrases.join("; ")}.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    prompt: `${STYLE}\n\n${composition} ${facts}\n\n${AVOID}`,
    size: "1536x1024",
  };
}

interface SpeciesLike {
  getLongDescription?(): string;
  getCommonNames?(): string[];
  getBodyPlanPath?(): string | null;
}

/** Assemble a species' character portrait from its model (generic kind). */
function speciesPrompt(species: unknown): { prompt: string; size: string } {
  const s = species as SpeciesLike;
  const long = s.getLongDescription?.() ?? "";
  const common = s.getCommonNames?.()?.[0] ?? "person";
  const bodyPlan = (s.getBodyPlanPath?.() ?? "").split("/").pop();
  const morph =
    bodyPlan === "biped" ? "a bipedal humanoid figure" : "a figure";
  // No proper-name label in the visual prompt (keeps gpt-image-1 from
  // stamping signage); the kind word rides as descriptive text only.
  const facts = `${morph} of the kind commonly called "${common}". ${long}`;
  const composition =
    "Three-quarter full-body figure, three-quarter turn, eye-level, " +
    "centered, soft watercolor vignette fading to bare cream paper. No text.";
  return {
    prompt: `${STYLE}\n\n${composition} ${facts}\n\n${AVOID}`,
    size: "1024x1536",
  };
}

async function generate(name: string, prompt: string, size: string) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY not set");
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt,
      size,
      quality: "medium",
      n: 1,
    }),
  });
  const json = (await res.json()) as { data?: { b64_json?: string }[] };
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${JSON.stringify(json)}`);
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) throw new Error("no image in response");
  mkdirSync(OUT, { recursive: true });
  const file = resolve(OUT, `${name}.png`);
  writeFileSync(file, Buffer.from(b64, "base64"));
  return file;
}

interface IllustratedLike {
  getIllustration?(): string | null;
}

/** The S3 key this content publishes to: its own declared key, else a default. */
function targetKey(kind: string, path: string, stuff: unknown): string {
  const declared = (stuff as IllustratedLike).getIllustration?.();
  if (declared) return declared;
  const slug = path.split("/").filter(Boolean).pop() ?? "asset";
  return `${kind}/${slug}.png`;
}

function uploadToS3(file: string, key: string): void {
  execFileSync(
    "aws",
    ["s3", "cp", file, `s3://${BUCKET}/${key}`, "--content-type", "image/png"],
    { stdio: "ignore" },
  );
}

/** Upsert the provenance record for an asset, joined by its key. */
async function recordAsset(opts: {
  key: string;
  sourcePath: string;
  prompt: string;
  size: string;
}): Promise<void> {
  const [w, h] = opts.size.split("x").map((n) => parseInt(n, 10));
  const existing = await MediaAsset.find<MediaAsset>({ key: opts.key });
  const rec = existing[0] ?? new MediaAsset();
  rec.key = opts.key;
  rec.sourcePath = opts.sourcePath;
  rec.sourceContentHash = createHash("sha256").update(opts.prompt).digest("hex");
  rec.prompt = opts.prompt;
  rec.model = MODEL;
  rec.size = opts.size;
  rec.quality = QUALITY;
  rec.styleVersion = STYLE_VERSION;
  rec.width = w ?? 0;
  rec.height = h ?? 0;
  rec.status = "draft";
  await rec.save();
}

export async function main() {
  const [kind, ...paths] = process.argv.slice(2);
  if ((kind !== "location" && kind !== "species") || paths.length === 0) {
    throw new Error(
      "usage: illustrate-preload.js <location|species> <template-path...>",
    );
  }

  // Own scratch DB — never touch a concurrent dev server's data.
  const baseDb = process.env.MONGODB_DATABASE || "saxonberg";
  await AppBootstrap.run({
    mongoUri: process.env.MONGODB_URI!,
    dbName: `${baseDb}_media`,
  });

  try {
    for (const path of paths) {
      try {
        const stuff = await StuffApi.singleton(path);
        const { prompt, size } =
          kind === "species" ? speciesPrompt(stuff) : locationPrompt(stuff);
        const slug = path.split("/").filter(Boolean).join("-");
        const key = targetKey(kind, path, stuff);
        process.stdout.write(
          `${SKIP_IMAGE ? "recording" : "generating"} ${key} (${size})... `,
        );
        if (!SKIP_IMAGE) {
          const file = await generate(slug, prompt, size);
          uploadToS3(file, key);
        }
        await recordAsset({ key, sourcePath: path, prompt, size });
        console.info(`ok -> s3://${BUCKET}/${key} (+ media_assets)`);
      } catch (e) {
        console.info(`FAILED ${path}`);
        console.error("  " + (e as Error).message);
      }
    }
  } finally {
    await AppBootstrap.shutdown();
    // Bootstrap opens Mongo + timers; nothing here joins the event loop
    // back to idle, so exit explicitly once the image is written.
    process.exit(0);
  }
}
