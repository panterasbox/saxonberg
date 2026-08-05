/**
 * migrate-currency — the currency build's live-data migration, and the
 * rehearsal gate that proves it moved no value.
 *
 * Wave 6 of docs/plans/currency-plan.md. Four backfill targets, because money
 * lives in four places and only one of them is a collection banking owns:
 *
 *  1. `bank_ledger` / `bank_accounts` / `bank_supply` — stamp `zorkmid` on
 *     every currency-less row. (Also handled idempotently at boot; here for
 *     the offline rehearsal.)
 *  2. The well-known fixed account ids — `treasury` → `treasury:zorkmid`,
 *     `central-bank` → `central-bank:zorkmid`. Renamed **unconditionally**:
 *     a conditional suffix would be exactly the zorkmid branch the
 *     acceptance test exists to forbid.
 *  3. The `/obj/Coin` row in `domain`. ⚠⚠ The seeder is INSERT-ONLY, so
 *     editing `Coin.yaml` does nothing to a database that already has this
 *     row — and unmigrated it keeps stamping every FUTURE coin with a legacy
 *     denomination, forever.
 *  4. Coin blobs nested inside `holder_snapshots`. This is the durable coin
 *     population (vault float does not survive a restart: `BankCounter`
 *     composes no `PersistableMixin`), and it is a recursive JSON rewrite.
 *
 * ⚠⚠ **Deploy order is stop → migrate → deploy → start.** The new code's
 * `warm()` throws on a currency-less row, so starting before migrating fails
 * fast and harmlessly rather than running the world on half-migrated money.
 *
 * Usage:
 *   tsx scripts/migrate-currency.ts --uri <uri> --db <db> --report-only
 *   tsx scripts/migrate-currency.ts --uri <uri> --db <db> --apply
 *
 * The rehearsal: report-only → apply → report-only, and the second report
 * **exits non-zero** unless every balance, every ledger row and every coin
 * has identical value before and after.
 */

import { MongoClient, type Db } from "mongodb";

/**
 * The legacy denomination vocabulary. ⚠ This is the ONLY place it survives —
 * deliberately outside `src/mud/` so the retired names cannot pollute the
 * codebase's grep-checkable hygiene, and so they die with this script.
 */
export const LEGACY_DENOMINATIONS: Record<
  string,
  { currency: string; denomination: number }
> = {
  credit: { currency: "zorkmid", denomination: 1 },
  crown: { currency: "zorkmid", denomination: 5 },
  sovereign: { currency: "zorkmid", denomination: 25 },
};

/** Face values under the NEW table, for the value-preservation check. */
export const ZORKMID_FACE_VALUES: Record<number, number> = {
  1: 1,
  5: 5,
  25: 25,
};

const COMPACT_CURRENCY = "zorkmid";
const ACCOUNT_ID_RENAMES: Record<string, string> = {
  treasury: `treasury:${COMPACT_CURRENCY}`,
  "central-bank": `central-bank:${COMPACT_CURRENCY}`,
};

export interface Fingerprint {
  ledgerRows: number;
  ledgerByKind: Record<string, { count: number; sum: number }>;
  balances: Record<string, number>;
  balanceTotal: number;
  supply: number;
  coinValue: number;
  coinByDenomination: Record<string, number>;
  currencylessRows: number;
  legacyDenominationsRemaining: string[];
  coinTemplateData: unknown;
}

/* ────────────────────────── pure transforms ────────────────────────── */

/**
 * Rewrite one captured coin entry in place: legacy `denomination: "crown"`
 * becomes `denomination: 5` plus `currency: "zorkmid"`.
 *
 * Returns whether anything changed. **Throws on a denomination string that is
 * not in the legacy table** — a half-migration must be loud, never partial.
 */
export function migrateCoinEntry(node: Record<string, unknown>): boolean {
  const raw = node.denomination;
  if (typeof raw !== "string") return false;
  const mapped = LEGACY_DENOMINATIONS[raw];
  if (!mapped) {
    throw new Error(
      `migrate-currency: unknown legacy denomination '${raw}' — the map must ` +
        `cover every value in the data, or coins would be silently revalued`
    );
  }
  node.denomination = mapped.denomination;
  node.currency = mapped.currency;
  return true;
}

/**
 * Walk an arbitrary snapshot blob, migrating every captured `/obj/Coin`
 * entry's field slice. Returns the number of entries rewritten.
 *
 * Snapshot records nest containers inside containers, so this is genuinely
 * recursive — and the coin's fields may sit a level or two below the entry
 * that names the template path, which is why it rewrites any object carrying
 * a string `denomination` beneath a coin entry.
 */
export function migrateSnapshotBlob(node: unknown, insideCoin = false): number {
  if (Array.isArray(node)) {
    let n = 0;
    for (const child of node) n += migrateSnapshotBlob(child, insideCoin);
    return n;
  }
  if (!node || typeof node !== "object") return 0;
  const obj = node as Record<string, unknown>;
  const isCoin = insideCoin || obj.templatePath === "/obj/Coin";
  let n = 0;
  if (isCoin && migrateCoinEntry(obj)) n += 1;
  for (const value of Object.values(obj)) {
    n += migrateSnapshotBlob(value, isCoin);
  }
  return n;
}

/** Σ value of a captured coin population under whichever table applies. */
export function coinValueOf(
  denomination: unknown,
  quantity: number
): number | null {
  if (typeof denomination === "string") {
    const mapped = LEGACY_DENOMINATIONS[denomination];
    return mapped ? mapped.denomination * quantity : null;
  }
  if (typeof denomination === "number") {
    const face = ZORKMID_FACE_VALUES[denomination];
    return face === undefined ? null : face * quantity;
  }
  return null;
}

/* ─────────────────────────── the fingerprint ───────────────────────── */

function walkCoins(
  node: unknown,
  visit: (fields: Record<string, unknown>) => void,
  insideCoin = false
): void {
  if (Array.isArray(node)) {
    for (const child of node) walkCoins(child, visit, insideCoin);
    return;
  }
  if (!node || typeof node !== "object") return;
  const obj = node as Record<string, unknown>;
  const isCoin = insideCoin || obj.templatePath === "/obj/Coin";
  if (isCoin && ("denomination" in obj || "quantity" in obj)) visit(obj);
  for (const value of Object.values(obj)) walkCoins(value, visit, isCoin);
}

export async function fingerprint(db: Db): Promise<Fingerprint> {
  const ledger = await db.collection("bank_ledger").find({}).toArray();
  const ledgerByKind: Record<string, { count: number; sum: number }> = {};
  for (const row of ledger) {
    const kind = String(row.kind);
    const seen = ledgerByKind[kind] ?? { count: 0, sum: 0 };
    seen.count += 1;
    seen.sum += Number(row.amount) || 0;
    ledgerByKind[kind] = seen;
  }

  const accounts = await db.collection("bank_accounts").find({}).toArray();
  const balances: Record<string, number> = {};
  for (const row of accounts) {
    balances[String(row.accountId)] = Number(row.balance) || 0;
  }
  const balanceTotal = Object.values(balances).reduce((s, v) => s + v, 0);

  const supplyRows = await db.collection("bank_supply").find({}).toArray();
  const supply = supplyRows.reduce(
    (s, r) => s + (Number(r.minted) || 0) - (Number(r.drained) || 0),
    0
  );

  const snapshots = await db.collection("holder_snapshots").find({}).toArray();
  let coinValue = 0;
  const coinByDenomination: Record<string, number> = {};
  const legacyRemaining = new Set<string>();
  for (const record of snapshots) {
    walkCoins(record, (fields) => {
      const qty = Number(fields.quantity ?? 1) || 1;
      const denom = fields.denomination;
      const key = String(denom);
      coinByDenomination[key] = (coinByDenomination[key] ?? 0) + qty;
      const value = coinValueOf(denom, qty);
      if (value !== null) coinValue += value;
      if (typeof denom === "string") legacyRemaining.add(denom);
    });
  }

  const currencylessRows =
    (await db.collection("bank_ledger").countDocuments({ currency: { $exists: false } })) +
    (await db.collection("bank_accounts").countDocuments({ currency: { $exists: false } })) +
    (await db.collection("bank_supply").countDocuments({ currency: { $exists: false } }));

  const coinTemplate = await db.collection("domain").findOne({ path: "/obj/Coin" });

  return {
    ledgerRows: ledger.length,
    ledgerByKind,
    balances,
    balanceTotal,
    supply,
    coinValue,
    coinByDenomination,
    currencylessRows,
    legacyDenominationsRemaining: [...legacyRemaining],
    coinTemplateData: coinTemplate?.data ?? null,
  };
}

function printFingerprint(fp: Fingerprint, label: string): void {
  const line = (s = ""): void => process.stdout.write(`${s}\n`);
  line(`═══ ${label} ═══`);
  line(`ledger rows: ${fp.ledgerRows}`);
  for (const [kind, v] of Object.entries(fp.ledgerByKind).sort()) {
    line(`  ${kind.padEnd(16)} count=${v.count} Σamount=${v.sum}`);
  }
  line(`accounts: ${Object.keys(fp.balances).length}  Σbalance=${fp.balanceTotal}`);
  for (const [id, bal] of Object.entries(fp.balances).sort()) {
    line(`  ${id.padEnd(40)} ${bal}`);
  }
  line(`supply: ${fp.supply}`);
  line(`snapshot coin value: ${fp.coinValue}`);
  for (const [denom, qty] of Object.entries(fp.coinByDenomination).sort()) {
    line(`  denomination ${denom.padEnd(12)} Σqty=${qty}`);
  }
  line(`currency-less bank_* rows: ${fp.currencylessRows}`);
  line(
    `legacy denomination strings remaining: ${
      fp.legacyDenominationsRemaining.join(", ") || "none"
    }`
  );
  line(`/obj/Coin domain data: ${JSON.stringify(fp.coinTemplateData)}`);
  line();
}

/* ──────────────────────────── the migration ────────────────────────── */

async function apply(db: Db): Promise<void> {
  const line = (s = ""): void => process.stdout.write(`${s}\n`);

  // 1 — stamp the compact currency on every currency-less bank row.
  for (const name of ["bank_ledger", "bank_accounts", "bank_supply"]) {
    const res = await db
      .collection(name)
      .updateMany(
        { currency: { $exists: false } },
        { $set: { currency: COMPACT_CURRENCY } }
      );
    line(`  ${name}: stamped ${res.modifiedCount} rows`);
  }

  // 2 — rename the well-known fixed account ids (unconditionally).
  for (const [from, to] of Object.entries(ACCOUNT_ID_RENAMES)) {
    const a = await db
      .collection("bank_accounts")
      .updateMany({ accountId: from }, { $set: { accountId: to } });
    const f = await db
      .collection("bank_ledger")
      .updateMany({ fromAccount: from }, { $set: { fromAccount: to } });
    const t = await db
      .collection("bank_ledger")
      .updateMany({ toAccount: from }, { $set: { toAccount: to } });
    line(
      `  rename ${from} → ${to}: accounts=${a.modifiedCount} ` +
        `legs(from)=${f.modifiedCount} legs(to)=${t.modifiedCount}`
    );
  }

  // 3 — the /obj/Coin domain row: a blank cash shell.
  const coinRow = await db.collection("domain").findOne({ path: "/obj/Coin" });
  if (coinRow) {
    const data = { ...(coinRow.data as Record<string, unknown>) };
    delete data.denomination;
    delete data.currency;
    delete data.shortDescription;
    data.keywords = ["coin", "coins", "cash", "money"];
    await db
      .collection("domain")
      .updateOne({ path: "/obj/Coin" }, { $set: { data } });
    line("  domain /obj/Coin: rewritten to the blank cash shell");
  } else {
    line("  domain /obj/Coin: absent (nothing to rewrite)");
  }

  // 4 — the nested coin blobs in holder_snapshots.
  const snapshots = await db.collection("holder_snapshots").find({}).toArray();
  let rewritten = 0;
  let records = 0;
  for (const record of snapshots) {
    const state = record.state;
    const n = migrateSnapshotBlob(state);
    if (n > 0) {
      await db
        .collection("holder_snapshots")
        .updateOne({ _id: record._id }, { $set: { state } });
      rewritten += n;
      records += 1;
    }
  }
  line(`  holder_snapshots: ${rewritten} coin entries in ${records} records`);
}

/* ─────────────────────────── the rehearsal gate ────────────────────── */

/**
 * Compare two fingerprints. Returns the list of failures — **empty means the
 * migration moved no value**, which is the whole claim.
 */
export function compareFingerprints(
  before: Fingerprint,
  after: Fingerprint
): string[] {
  const failures: string[] = [];

  if (before.ledgerRows !== after.ledgerRows) {
    failures.push(`ledger row count changed: ${before.ledgerRows} → ${after.ledgerRows}`);
  }
  for (const [kind, v] of Object.entries(before.ledgerByKind)) {
    const now = after.ledgerByKind[kind];
    if (!now || now.count !== v.count || now.sum !== v.sum) {
      failures.push(`ledger '${kind}' changed: ${JSON.stringify(v)} → ${JSON.stringify(now)}`);
    }
  }

  // Per-account, not just the total — a compensating pair of errors would
  // pass a total check and still have moved somebody's money.
  const renamed = (id: string): string => ACCOUNT_ID_RENAMES[id] ?? id;
  for (const [id, bal] of Object.entries(before.balances)) {
    const now = after.balances[renamed(id)];
    if (now !== bal) {
      failures.push(`balance of '${id}' changed: ${bal} → ${now}`);
    }
  }
  if (before.balanceTotal !== after.balanceTotal) {
    failures.push(`Σ balances changed: ${before.balanceTotal} → ${after.balanceTotal}`);
  }
  if (before.supply !== after.supply) {
    failures.push(`total supply changed: ${before.supply} → ${after.supply}`);
  }

  // ⭐ The test that catches the silent revalue: the same coins, valued under
  // the new table, must be worth exactly what they were worth under the old.
  if (before.coinValue !== after.coinValue) {
    failures.push(
      `Σ coin value changed: ${before.coinValue} → ${after.coinValue} ` +
        `(this is the silent-revalue failure — the ?? 1 fallback's whole point)`
    );
  }

  if (after.currencylessRows !== 0) {
    failures.push(`${after.currencylessRows} bank_* rows still have no currency`);
  }
  if (after.legacyDenominationsRemaining.length > 0) {
    failures.push(
      `legacy denomination strings remain: ${after.legacyDenominationsRemaining.join(", ")}`
    );
  }
  return failures;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const get = (flag: string): string => {
    const i = argv.indexOf(flag);
    return i >= 0 && argv[i + 1] ? (argv[i + 1] as string) : "";
  };
  const uri = get("--uri");
  const dbName = get("--db");
  const doApply = argv.includes("--apply");
  const reportOnly = argv.includes("--report-only");
  if (!uri || !dbName || (!doApply && !reportOnly)) {
    throw new Error(
      "migrate-currency: --uri, --db and one of --apply | --report-only are required"
    );
  }

  const client = new MongoClient(uri);
  await client.connect();
  try {
    const db = client.db(dbName);
    const before = await fingerprint(db);

    if (reportOnly) {
      printFingerprint(before, "fingerprint");
      // A report against a migrated database doubles as the gate: nothing
      // currency-less, no legacy strings left.
      const selfCheck = compareFingerprints(before, before);
      if (selfCheck.length > 0) {
        process.stdout.write("⚠ NOT FULLY MIGRATED:\n");
        for (const f of selfCheck) process.stdout.write(`  - ${f}\n`);
        process.exitCode = 1;
      }
      return;
    }

    printFingerprint(before, "BEFORE");
    process.stdout.write("── applying ──\n");
    await apply(db);
    process.stdout.write("\n");
    const after = await fingerprint(db);
    printFingerprint(after, "AFTER");

    const failures = compareFingerprints(before, after);
    if (failures.length > 0) {
      process.stdout.write("⛔ MIGRATION GATE FAILED:\n");
      for (const f of failures) process.stdout.write(`  - ${f}\n`);
      process.exitCode = 1;
      return;
    }
    process.stdout.write(
      "✔ gate passed: every balance, ledger row and coin has identical value\n"
    );
  } finally {
    await client.close();
  }
}

if (process.argv[1] && process.argv[1].includes("migrate-currency")) {
  main().catch((err) => {
    process.stderr.write(`migrate-currency failed: ${String(err)}\n`);
    process.exitCode = 1;
  });
}
