/**
 * currency-census — READ-ONLY fingerprint of every place money lives.
 *
 * Wave 0 of the currency build (docs/plans/currency-plan.md § 2). Run against
 * a **restored copy** of the live database before a line of production code
 * changes: it answers "how much value is out there, in what shapes, and
 * where", and produces the *before* fingerprint the migration rehearsal
 * compares against.
 *
 * ⚠⚠ **Never point this at production.** It only reads, but the discipline
 * matters: the rehearsal that follows it does not only read.
 *
 * Two findings this exists to confirm on real data, because both change the
 * migration's shape and neither is obvious from the code:
 *
 *  1. `BankCounter` composes no `PersistableMixin`, so **vault coin does not
 *     survive a restart** — the durable coin population is smaller than "every
 *     coin in the world" implies.
 *  2. The `/obj/Coin` row in `domain` is a backfill target in its own right.
 *     The seeder is INSERT-ONLY, so editing `Coin.yaml` leaves that row
 *     stamping every *future* coin with a legacy denomination forever.
 *
 * Usage:
 *   pnpm --filter @saxonberg/server exec tsx scripts/currency-census.ts \
 *     --uri mongodb://... --db saxonberg_scratch
 */

import { MongoClient } from "mongodb";

/** The pre-currency denomination vocabulary, and what each was worth. */
const LEGACY_FACE_VALUES: Record<string, number> = {
  credit: 1,
  crown: 5,
  sovereign: 25,
};

interface Args {
  uri: string;
  db: string;
}

function parseArgs(argv: string[]): Args {
  const get = (flag: string): string => {
    const i = argv.indexOf(flag);
    return i >= 0 && argv[i + 1] ? (argv[i + 1] as string) : "";
  };
  const uri = get("--uri");
  const db = get("--db");
  if (!uri || !db) {
    throw new Error(
      "currency-census: --uri and --db are required\n" +
        "  tsx scripts/currency-census.ts --uri mongodb://... --db saxonberg_scratch"
    );
  }
  return { uri, db };
}

/**
 * Walk an arbitrary persisted blob, calling `visit` at every object that
 * looks like a captured `/obj/Coin` content entry. Snapshot records nest
 * containers inside containers, so this is genuinely recursive.
 *
 * Exported for the unit test: the walker is the one piece of real logic here
 * and it must be provable without a database.
 */
export function walkCoinEntries(
  node: unknown,
  visit: (entry: Record<string, unknown>) => void
): void {
  if (Array.isArray(node)) {
    for (const child of node) walkCoinEntries(child, visit);
    return;
  }
  if (!node || typeof node !== "object") return;
  const obj = node as Record<string, unknown>;
  if (obj.templatePath === "/obj/Coin") visit(obj);
  for (const value of Object.values(obj)) walkCoinEntries(value, visit);
}

/**
 * The captured field slice of a coin entry, wherever the spine put it. Kept
 * tolerant: the census must report what IS there, not assume a shape.
 */
export function coinFieldsOf(
  entry: Record<string, unknown>
): { denomination?: unknown; currency?: unknown; quantity?: unknown } {
  const out: Record<string, unknown> = {};
  const scan = (node: unknown): void => {
    if (!node || typeof node !== "object") return;
    const obj = node as Record<string, unknown>;
    for (const key of ["denomination", "currency", "quantity"]) {
      if (key in obj && out[key] === undefined) out[key] = obj[key];
    }
    for (const value of Object.values(obj)) {
      if (value && typeof value === "object") scan(value);
    }
  };
  scan(entry);
  return out;
}

async function main(): Promise<void> {
  const { uri, db } = parseArgs(process.argv.slice(2));
  const client = new MongoClient(uri);
  await client.connect();
  const database = client.db(db);
  const line = (s = ""): void => process.stdout.write(`${s}\n`);

  try {
    line("═══ currency census ═══");
    line(`db: ${db}`);
    line();

    /* ── bank_ledger ─────────────────────────────────────────────────── */
    const ledger = database.collection("bank_ledger");
    const ledgerCount = await ledger.countDocuments();
    const withCurrency = await ledger.countDocuments({
      currency: { $exists: true },
    });
    const byKind = await ledger
      .aggregate([
        { $group: { _id: "$kind", count: { $sum: 1 }, sum: { $sum: "$amount" } } },
        { $sort: { _id: 1 } },
      ])
      .toArray();
    line("── bank_ledger");
    line(`  rows: ${ledgerCount}   rows already carrying a currency: ${withCurrency}`);
    for (const k of byKind) {
      line(`  ${String(k._id).padEnd(16)} count=${k.count}  Σamount=${k.sum}`);
    }
    line();

    /* ── bank_accounts ───────────────────────────────────────────────── */
    const accounts = database.collection("bank_accounts");
    const accountRows = await accounts
      .find({}, { projection: { accountId: 1, balance: 1, currency: 1 } })
      .toArray();
    const accountTotal = accountRows.reduce(
      (s, r) => s + (Number(r.balance) || 0),
      0
    );
    line("── bank_accounts");
    line(`  rows: ${accountRows.length}   Σbalance: ${accountTotal}`);
    for (const r of accountRows) {
      line(`  ${String(r.accountId).padEnd(40)} ${r.balance}`);
    }
    const wellKnown = accountRows.filter((r) =>
      ["treasury", "central-bank", "tpa"].includes(String(r.accountId))
    );
    line(
      `  ⚠ well-known fixed ids present (rename targets): ${
        wellKnown.map((r) => r.accountId).join(", ") || "none"
      }`
    );
    line();

    /* ── bank_supply ─────────────────────────────────────────────────── */
    const supplyRows = await database.collection("bank_supply").find({}).toArray();
    line("── bank_supply");
    for (const r of supplyRows) {
      line(
        `  minted=${r.minted} drained=${r.drained} → supply=${
          Number(r.minted) - Number(r.drained)
        }  currency=${r.currency ?? "(none)"}`
      );
    }
    if (supplyRows.length === 0) line("  (no row)");
    line();

    /* ── the /obj/Coin domain row ────────────────────────────────────── */
    const coinTemplate = await database
      .collection("domain")
      .findOne({ path: "/obj/Coin" });
    line("── domain: /obj/Coin  ⚠ the seeder is INSERT-ONLY; this row is a");
    line("   backfill target — unmigrated, it stamps every FUTURE coin stale");
    line(`  ${coinTemplate ? JSON.stringify(coinTemplate.data) : "(row absent)"}`);
    line();

    /* ── holder_snapshots: the durable coin population ───────────────── */
    const snapshots = await database.collection("holder_snapshots").find({}).toArray();
    const byDenomination = new Map<string, { stacks: number; quantity: number }>();
    const unknownDenominations: string[] = [];
    for (const record of snapshots) {
      walkCoinEntries(record, (entry) => {
        const fields = coinFieldsOf(entry);
        const denom = String(fields.denomination ?? "(unstamped)");
        const qty = Number(fields.quantity ?? 1) || 1;
        const seen = byDenomination.get(denom) ?? { stacks: 0, quantity: 0 };
        seen.stacks += 1;
        seen.quantity += qty;
        byDenomination.set(denom, seen);
        if (!(denom in LEGACY_FACE_VALUES) && !unknownDenominations.includes(denom)) {
          unknownDenominations.push(denom);
        }
      });
    }
    let snapshotValue = 0;
    line("── holder_snapshots (the DURABLE coin population)");
    line(`  records scanned: ${snapshots.length}`);
    for (const [denom, seen] of byDenomination) {
      const face = LEGACY_FACE_VALUES[denom];
      const value = face === undefined ? NaN : face * seen.quantity;
      if (!Number.isNaN(value)) snapshotValue += value;
      line(
        `  ${denom.padEnd(14)} stacks=${String(seen.stacks).padEnd(6)} ` +
          `Σqty=${String(seen.quantity).padEnd(8)} Σvalue=${
            Number.isNaN(value) ? "??" : value
          }`
      );
    }
    if (byDenomination.size === 0) line("  (no captured coin)");
    line(`  Σ snapshot coin value (legacy table): ${snapshotValue}`);
    line();

    /* ── the finding that would change the plan ──────────────────────── */
    line("── ⚠ denominations OUTSIDE the legacy table");
    if (unknownDenominations.length === 0) {
      line("  none — the migration's legacy map is complete");
    } else {
      line(`  ${unknownDenominations.join(", ")}`);
      line("  ⚠⚠ a non-empty list here CHANGES THE PLAN — the migration's");
      line("     map must cover every value it will encounter, or it throws.");
    }
    line();
    line("═══ end census ═══");
  } finally {
    await client.close();
  }
}

// Entry point — a script, not a module the mudlib imports.
if (process.argv[1] && process.argv[1].includes("currency-census")) {
  main().catch((err) => {
    process.stderr.write(`currency-census failed: ${String(err)}\n`);
    process.exitCode = 1;
  });
}
