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

import { AppBootstrap } from "../backend/AppBootstrap";
import { StuffApi } from "../mud/api/stuff";
import { ContainmentApi } from "../mud/api/containment";
import { DescribeApi } from "../mud/api/describe";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, "../../../../tools/imagegen/samples");

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
    .map((c) => DescribeApi.getDisplayName(c as never))
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

export async function main() {
  const [kind, path] = process.argv.slice(2);
  if (kind !== "location" || !path) {
    throw new Error("usage: illustrate-preload.js location <template-path>");
  }

  // Own scratch DB — never touch a concurrent dev server's data.
  const baseDb = process.env.MONGODB_DATABASE || "saxonberg";
  await AppBootstrap.run({
    mongoUri: process.env.MONGODB_URI!,
    dbName: `${baseDb}_media`,
  });

  try {
    const loc = await StuffApi.singleton(path);
    const { prompt, size } = locationPrompt(loc);
    console.info("\n=== MODEL-DERIVED PROMPT ===\n" + prompt + "\n");
    const name = path.split("/").filter(Boolean).join("-");
    const file = await generate(name, prompt, size);
    console.info(`ok -> ${file}`);
  } finally {
    await AppBootstrap.shutdown();
    // Bootstrap opens Mongo + timers; nothing here joins the event loop
    // back to idle, so exit explicitly once the image is written.
    process.exit(0);
  }
}
