/**
 * ⭐⭐ `lint:mixin-clusters` — **a mixin is one idea; two ideas that never
 * touch are two mixins.**
 *
 * The `Slotted → Attired` precedent (`lib/slot/Attired.ts`, slot.md): a
 * rack is slotted and wears nothing, so the covering half was carved out
 * and composed only where it is true. The same shape hides wherever a
 * later idea was added to an existing mixin because the host was
 * convenient — `OrganizationMixin`'s call rota, `WaterPlaceMixin`'s haul
 * out, `MetabolicMixin`'s eating (controllers-are-io D6 carves five).
 *
 * ## The heuristic (syntax only — it reads the factory body)
 *
 * For each `export function <Name>Mixin(…)` in the mud corpus (kernel
 * `src/mud/**`, every pack's `src/**`), the class it builds (the first
 * class expression or declaration in its body):
 *
 *   1. **Nodes** — its instance members (methods, fields, accessors; the
 *      constructor and statics are not members of an idea), with a field
 *      and its accessor methods folded into ONE node by stem (`_foo`,
 *      `foo`, `getFoo`, `setFoo`, `isFoo`, `hasFoo` → `foo`). ⚠ Without
 *      the fold every get/set pair was an island and the census read 77.
 *   2. **Edges** — member A's body or initializer reads `this.B` (or
 *      `this.#B`) for another member B. Co-use is the evidence that two
 *      members are one idea.
 *   3. **Clusters** — the connected components with at least TWO nodes (a
 *      lone node — a field with only its own accessors, or a method that
 *      references no sibling — is a utility, not an idea, and is ignored).
 *
 * A mixin **splits** when it has two or more clusters. ⚠ A co-use split
 * is a candidate, never a disposition (docs/lint-family.md § Four ways a
 * census lies, 1): D6 keeps `WaterPlaceMixin`'s haul-out on every host
 * because every host is honestly both — the test is who composes it and
 * which imports leave, beside co-use. The heuristic misses a member that
 * reaches a sibling only through a helper the class does not own, and an
 * edge through `super` is not read.
 *
 * ⭐ Census, then ratchet: the ceiling is this gate's own count (the plan's
 * "45" was a different heuristic's); W3's splits lower it.
 */

import { readFileSync } from "fs";
import { relative, resolve } from "path";
import { pathToFileURL } from "url";
import ts from "typescript";
import { CONTENT, MUD, mudSourceFiles, parseTs, ratchet } from "./pack-roots";

export const MIXIN_CLUSTERS_CEILING = 41; // controller-liquidity W14: −1, re-pinned at the measured floor after the pack lanes. // controller-liquidity W7c: +1, a stated rise — CombatantMixin {defend, defendAlly, intervene, queueGambit} (the one `defend` act, D13) beside {beforeTraverse, disengage} (leaving). Co-use, not a new idea: `defend` is the act over three members that were lone nodes until it named them together, so the census now sees a cluster it could not before. Caller audit: `defend` has one caller (DefendController); `intervene` has its own verb (InterveneController); `defendAlly` and the `defend` gambit have no caller outside Combatant. Carving defending out would compose two mixins on exactly the same hosts — every combatant defends and leaves. // controller-liquidity W8: +1, a stated rise — HaulableMixin {hauledBy, slipHitch} (the coupling, C24) beside {draftFactor, draftLoad} (the load). Every haulable host is honestly both: a cart is weighed and coupled; a carve would compose two mixins on exactly the same hosts. Caller audit: slipHitch has one caller (GotoController), hauledBy was a lone node until it gained a method

function memberName(m: ts.ClassElement): string | null {
  if (ts.isConstructorDeclaration(m) || ts.isClassStaticBlockDeclaration(m)) return null;
  if (ts.getCombinedModifierFlags(m as ts.Declaration) & ts.ModifierFlags.Static) return null;
  const n = m.name;
  if (!n) return null;
  if (ts.isIdentifier(n) || ts.isPrivateIdentifier(n) || ts.isStringLiteralLike(n)) return n.text;
  return null;
}

/**
 * ⭐ One STATE, one node: a field and its accessor methods (`_foo`, `foo`,
 * `getFoo`, `setFoo`, `isFoo`, `hasFoo`) are one idea, not a cluster of
 * three — read without this, every get/set pair read as its own island and
 * the census counted any mixin with two fields as split.
 */
function stemOf(name: string): string {
  const bare = name.replace(/^[_#]+/, "");
  const m = /^(get|set|is|has)([A-Z].*)$/.exec(bare);
  const core = m ? m[2]! : bare;
  return core.charAt(0).toLowerCase() + core.slice(1);
}

/** The clusters (components of ≥ 2 members) of one class's co-use graph. */
export function clustersOf(cls: ts.ClassLikeDeclaration): string[][] {
  const names = new Set<string>();
  for (const m of cls.members) {
    const n = memberName(m);
    if (n) names.add(n);
  }
  const parent = new Map<string, string>([...names].map((n) => [stemOf(n), stemOf(n)]));
  const find = (x: string): string => {
    let r = x;
    while (parent.get(r) !== r) r = parent.get(r)!;
    parent.set(x, r);
    return r;
  };
  const union = (a: string, b: string): void => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };
  const linked = new Set<string>();
  for (const m of cls.members) {
    const self = memberName(m);
    if (!self) continue;
    const visit = (n: ts.Node): void => {
      if (
        ts.isPropertyAccessExpression(n) &&
        n.expression.kind === ts.SyntaxKind.ThisKeyword &&
        names.has(n.name.text) &&
        stemOf(n.name.text) !== stemOf(self)
      ) {
        union(stemOf(self), stemOf(n.name.text));
        linked.add(stemOf(self));
        linked.add(stemOf(n.name.text));
      }
      ts.forEachChild(n, visit);
    };
    ts.forEachChild(m, visit);
  }
  const groups = new Map<string, string[]>();
  for (const n of linked) {
    const r = find(n);
    groups.set(r, [...(groups.get(r) ?? []), n]);
  }
  return [...groups.values()].filter((g) => g.length >= 2).map((g) => g.sort());
}

/** Every mixin factory in one module, with the class it builds. */
export function factoriesIn(sf: ts.SourceFile): Array<{ name: string; cls: ts.ClassLikeDeclaration }> {
  const out: Array<{ name: string; cls: ts.ClassLikeDeclaration }> = [];
  for (const st of sf.statements) {
    if (!ts.isFunctionDeclaration(st) || !st.name || !/Mixin$/.test(st.name.text) || !st.body) continue;
    const exported = (ts.getCombinedModifierFlags(st) & ts.ModifierFlags.Export) !== 0;
    if (!exported) continue;
    let cls: ts.ClassLikeDeclaration | null = null;
    const visit = (n: ts.Node): void => {
      if (cls) return;
      if (ts.isClassExpression(n) || ts.isClassDeclaration(n)) {
        cls = n;
        return;
      }
      ts.forEachChild(n, visit);
    };
    visit(st.body);
    if (cls) out.push({ name: st.name.text, cls });
  }
  return out;
}

export function census(contentDir: string = CONTENT, mudDir: string = MUD): string[] {
  const repo = resolve(mudDir, "..", "..", "..", "..");
  const out: string[] = [];
  for (const { file } of mudSourceFiles(contentDir, mudDir)) {
    const text = readFileSync(file, "utf8");
    if (!text.includes("Mixin")) continue;
    for (const f of factoriesIn(parseTs(file, text))) {
      const clusters = clustersOf(f.cls);
      if (clusters.length >= 2) {
        out.push(
          `${relative(repo, file)}  ${f.name}: ${clusters.length} clusters — ` +
            clusters.map((c) => `{${c.slice(0, 4).join(", ")}${c.length > 4 ? ", …" : ""}}`).join(" "),
        );
      }
    }
  }
  return out;
}

function main(): void {
  const findings = census();
  const ok = ratchet(
    "check-mixin-clusters",
    "mixins whose members split into ≥ 2 disjoint co-use clusters",
    findings.length,
    MIXIN_CLUSTERS_CEILING,
    findings,
    "⭐ Two ideas that never touch are two mixins: carve the later idea out and\n" +
      "  compose it only on the hosts where it is true (the Slotted → Attired\n" +
      "  precedent) — or, if every host is honestly both, record why it stays.",
  );
  if (!ok) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main();
}
