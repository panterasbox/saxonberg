/**
 * Source guard: the reaction surfaces hold no emoji of their own.
 *
 * ⚠ `ReactionBar` shipped for a long time with this:
 *
 *     const QUICK = [
 *       { verb: "smile", emoji: "😊" }, … six of them
 *     ];
 *
 * A verb/emoji pairing written out beside the catalogue's own is a
 * second copy of a fact the server owns, and it drifts silently — the
 * button keeps rendering, it just stops matching the chip it produces.
 * The design conventions rule out hardcoding "including just for now",
 * so this is enforced rather than remembered.
 *
 * A rendering test cannot catch this: a hardcoded array renders
 * perfectly. Only the source can be asked.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const HERE = dirname(fileURLToPath(import.meta.url));

const GUARDED = [
  "../../ReactionBar.tsx",
  "../EmotePicker.tsx",
  "../EmoteSheet.tsx",
  "../reactCommand.ts",
];

/**
 * Emoji live in these ranges. Deliberately narrow: this is looking for
 * pictographic glyphs standing in for catalogue data, not for every
 * non-ASCII character — the source is full of ⭐ ⚠ ✕ ＋ in comments and
 * chrome, and those are the file's own furniture, not server data.
 */
const PICTOGRAPHIC =
  /[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}]/gu;

/** Strip comments — a doc comment may legitimately quote the old array. */
function code(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

describe("no hardcoded emoji in the reaction surfaces", () => {
  it.each(GUARDED)("%s carries none", (rel) => {
    const text = readFileSync(resolve(HERE, rel), "utf8");
    const found = code(text).match(PICTOGRAPHIC) ?? [];
    expect(found).toEqual([]);
  });

  it.each(GUARDED)("%s declares no verb/emoji pairing", (rel) => {
    const text = code(readFileSync(resolve(HERE, rel), "utf8"));
    // The exact shape that drifted: an object literal binding a verb to
    // a glyph. Catches the array coming back under any name.
    expect(text).not.toMatch(/verb\s*:\s*["'][a-z]+["']\s*,\s*emoji\s*:/);
  });
});
