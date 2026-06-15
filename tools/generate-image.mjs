#!/usr/bin/env node
/**
 * Generate a Pantera's Box overlay background via the same provider saxonberg
 * uses (OpenAI gpt-image-1). NOTE: this deliberately does NOT use saxonberg's
 * locked watercolor STYLE — the livestream is the PB *parent* brand (cinematic,
 * institutional), not saxonberg's storybook content style.
 *
 * Usage:  node tools/generate-image.mjs [name]
 *   name defaults to "monastery" -> public/monastery.png (+ .prompt.txt)
 *
 * Key resolution: $OPENAI_API_KEY, else saxonberg/master/packages/server/.env.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const SIZE = '1536x1024'; // gpt-image-1 landscape; framed to 16:9 by the r3f camera.
const MODEL = 'gpt-image-1';
const QUALITY = 'high';

const PROMPT = [
  'Cinematic concept art, atmospheric and reverent, painterly with moody chiaroscuro.',
  'The vast after-hours library of a scholarly society at blue hour:',
  'a Gothic vaulted hall with towering two-story oak bookshelves, a timber rib ceiling,',
  'rolling library ladders, an antique brass armillary sphere, and manuscripts left open on reading tables.',
  'A massive pointed-arch cathedral window dominates one side; cold blue moonlight and soft volumetric',
  'god-rays pour through it. The window’s stone tracery and stained glass form three interlocking rings',
  '(Borromean rings) as a subtle heraldic motif, catching the light — a maker’s mark worked into the architecture.',
  'Deep navy palette (Old Glory Blue, #002147) in the shadows, cool white and faint silver highlights,',
  'near-monochrome and desaturated, with only the faintest warm candle accent.',
  'Fine drifting dust motes in the light shafts. Empty of people, hushed, scholarly, contemplative.',
  'Wide establishing shot. No text, no letters, no watermark, no modern objects.',
].join(' ');

function resolveKey() {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  const envPath = '/home/bobalu/play/saxonberg/master/packages/server/.env';
  try {
    const line = readFileSync(envPath, 'utf8')
      .split('\n')
      .find((l) => l.startsWith('OPENAI_API_KEY='));
    if (line) return line.slice('OPENAI_API_KEY='.length).trim().replace(/^["']|["']$/g, '');
  } catch {
    /* fall through */
  }
  return null;
}

async function main() {
  const name = process.argv[2] || 'monastery';
  const key = resolveKey();
  if (!key) {
    console.error('No OPENAI_API_KEY (env or saxonberg .env).');
    process.exit(1);
  }

  console.log(`Generating "${name}" (${MODEL}, ${SIZE}, quality=${QUALITY})...`);
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: MODEL, prompt: PROMPT, size: SIZE, quality: QUALITY, n: 1 }),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error(`HTTP ${res.status}:`, JSON.stringify(json, null, 2));
    process.exit(1);
  }
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) {
    console.error('No image in response:', JSON.stringify(json).slice(0, 400));
    process.exit(1);
  }

  const outDir = resolve(root, 'public');
  mkdirSync(outDir, { recursive: true });
  const png = resolve(outDir, `${name}.png`);
  writeFileSync(png, Buffer.from(b64, 'base64'));
  writeFileSync(resolve(outDir, `${name}.prompt.txt`), PROMPT + '\n');
  console.log(`Wrote ${png}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
