/**
 * Mechanism 5 — a source literal names a row outright, and a second
 * holds only its DIRECTORY (the `platform/agent/Gus.ts` shape, which a
 * full-path scan misses on all six of the rows it places).
 */
const NAMED = "/fixture/thing/code-named";
const ROOT = "/fixture/thing/prefixed";
export default class Coded {
  static rows = [NAMED, ROOT + "/one"];
}
