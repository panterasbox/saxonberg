/**
 * VIOLATION (scan) — a computed view path is invisible to a literal
 * scan, so the gate REPORTS the shape rather than reading past it.
 */
const BASE = "fixture/cmd/fixture";
export default class Computed {
  static commandContributions = { environment: [`${BASE}/orphan.yaml`] };
}
