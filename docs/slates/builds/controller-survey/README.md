# Controller survey (2026-11-09) — the raw record

Every command controller (527) read against the owner's replacement test: *if a
player rewrote this controller from scratch to change how the command talks to
them, what would they be forced to copy that isn't about how it talks to them?*
The summary, the candidate rules (with the owner's calls), the questions and the
consolidated defect list are in the **Controller survey** doc
(https://claude.ai/artifact/F4w6vXxwhjKkvNcdMiPBcB). These files are the
evidence behind it, kept so the next build can work from them.

- `smelt.md`, `route-bail.md`, `look-harvest.md`, `feed-operate.md`,
  `social-shell.md` — the first, in-depth survey of ten controllers: every region
  classified (presentation · coordination · game rule · parsing/routing ·
  unclear) with line ranges.
- `sweep-shard01.md` … `sweep-shard12.md` — the full sweep of the other 517:
  one row per controller (rule/presentation/coordination/parsing shares, one act
  or split or protocol, the worst misplaced item and where it belongs), then each
  shard's defects, hard cases and candidate rules.
- `multihead-scan.md` — the false-unification scan: controllers that are several
  acts under one word, and the last build's own unifications judged.

Read-only survey: line numbers are as of master `369f59759`; percentages are the
agents' rough reads by line count; every defect is suspected until confirmed.
