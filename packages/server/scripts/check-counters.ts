/**
 * check-counters — ⭐ **a counter is a vocation's instrument; it ships in
 * `/trade/<x>`.**
 *
 * A *counter* is the front-of-house instrument somebody stands behind:
 * the thing that holds the goods, prices them, takes them into custody,
 * or leases the customer's attention. It is never generic — it is what
 * one TRADE does for a living, and the trades-and-labor build moved the
 * shopkeeper's (`Stock`, `ConsignmentShelf`) into `trade-shopkeeping` and
 * the publican's (`CheckRack`) into `trade-hospitality` on exactly that
 * argument: *the kernel provides businesses, corporations, money, an
 * economy; a content pack provides a trade.*
 *
 * The mechanism may stay kernel — `lib/retail/Stock.ts` is substrate the
 * price index and the credit ladder read, and nothing instances it. What
 * may not stay is the **instanceable class a row names**, because that is
 * the trade's, and a second one would put the next trade's shopfront in
 * the kernel too.
 *
 * ## ⚠ What counts, stated exactly
 *
 * A class under the kernel's `platform/**` (non-test) whose composition
 * text names `AttendantMixin(`, `PricedOfferMixin(`, `HeldGoodsMixin(`,
 * `ConsignmentShelfMixin(` or `BankMixin(`, or which extends a counter
 * base (`Stock`, `CommerceMenu`). `lib/**` is excluded by design:
 * nothing instances it.
 *
 * ## The ceiling is 4, and each of the four is named here with its reason
 *
 *   - `AttendancePoint` — the generic queue. A ticket window, a clinic
 *     desk and a bank counter all attend; attendance is SUBSTRATE and
 *     stays kernel (the user's ruling: "attendant stays kernel").
 *   - `Menu` and `Tariff` — the consumer's `order` surface over a
 *     kernel-owned closed vocabulary (retail.md § The priced SERVICE).
 *     A menu is not a shopfront; it is how a priced service is READ.
 *   - `BankCounter` — ⚠ **the one to-do.** It is trade-banking's, and
 *     trade-banking is deferred with a stated reason (the requirements'
 *     *Non-goals*; credit-slate Parts 6/7). When that pack ships, this
 *     ceiling drops to 3.
 *
 * A fifth fails the build. `lint:family` derives its roster from
 * package.json, so this enrols itself.
 */

import { readFileSync } from 'fs';
import { relative } from 'path';
import { MUD, packSrcFiles } from './pack-roots';

const EXIT_ON_FINDINGS = true; // CI-gating

/** ⭐ The ceiling. It may fall; it may never rise. */
const CEILING = 4;

/** The four, and why each is still here. Order is the doc order above. */
const ALLOWED: Record<string, string> = {
  AttendancePoint: 'the generic queue — attendance is substrate',
  Menu: "the consumer's `order` surface over a kernel vocabulary",
  Tariff: "the consumer's `order` surface over a kernel vocabulary",
  BankCounter: 'trade-banking is deferred (credit-slate Parts 6/7) — the one to-do',
};

const MARKERS = [
  'AttendantMixin(',
  'PricedOfferMixin(',
  'HeldGoodsMixin(',
  'ConsignmentShelfMixin(',
  'BankMixin(',
];

/**
 * ⚠ A counter can also be reached by INHERITANCE rather than composition
 * — `Menu extends CommerceMenu` is the offer surface one class removed.
 * The census has to see through that or it reads 2 where the truth is 4,
 * which is how a ceiling stops meaning anything.
 */
const COUNTER_BASES = ['Stock', 'CommerceMenu'];

const offenders: { file: string; className: string }[] = [];
const seen: string[] = [];

for (const file of packSrcFiles(`${MUD}/platform`)) {
  if (file.includes('__tests__')) continue;
  const source = readFileSync(file, 'utf8');
  const isCounter =
    MARKERS.some((m) => source.includes(m)) ||
    COUNTER_BASES.some((b) => new RegExp(`\\bextends\\s+${b}\\b`).test(source));
  if (!isCounter) continue;
  const m = /export\s+(?:default\s+)?(?:abstract\s+)?class\s+(\w+)/.exec(source);
  const className = m?.[1] ?? '(anonymous)';
  seen.push(className);
  if (!(className in ALLOWED)) {
    offenders.push({ file: relative(`${MUD}/../../..`, file), className });
  }
}

if (offenders.length === 0 && seen.length <= CEILING) {
  console.log(
    `check-counters: ${seen.length} counters in the kernel (ceiling ${CEILING}) ✔`,
  );
  process.exit(0);
}

console.error(
  `check-counters: ${seen.length} counter class(es) under packages/server/src/mud/platform/ — ` +
    `the ceiling is ${CEILING}.\n`,
);
for (const o of offenders) console.error(`  ${o.className}  ${o.file}`);
console.error(
  `\n⭐ A counter is a VOCATION's instrument; it ships in \`/trade/<x>\`.\n` +
    `The kernel provides businesses, corporations, money, an economy — a\n` +
    `content pack provides a trade, and the thing somebody stands behind\n` +
    `to practise it is the trade's.\n\n` +
    `The mechanism MAY stay kernel (\`lib/retail/Stock.ts\` is substrate the\n` +
    `price index and the credit ladder read, and nothing instances it).\n` +
    `The instanceable class a row names may not.\n\n` +
    `The four the kernel keeps, and why:\n` +
    Object.entries(ALLOWED)
      .map(([k, v]) => `  ${k} — ${v}`)
      .join('\n') +
    `\n\nSee docs/subsystems/retail.md § The kernel/pack line.`,
);
process.exit(EXIT_ON_FINDINGS ? 1 : 0);
