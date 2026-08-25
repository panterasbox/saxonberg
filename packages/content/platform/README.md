# platform

The seed of **pack zero** — what the platform itself ships as content,
installed by the ordinary installer this wave (the core decomposition
that makes it a real pack zero is later).

| dir | kind | policy |
|---|---|---|
| `content/settings/<section>.yaml` | `settings` — the `app_settings` singleton's defaults, split by key prefix (`combat.yaml`, `banking.yaml`, …; un-dotted keys in `core.yaml`) | **merge-missing**: a key the singleton lacks is merged in; a value the operator changed with `config` is never touched and never a conflict; a vanished file keeps every value |
| `content/subjects/<name>.yaml` | `subject` — a standing forum/chat Subject: `name`, `description`, optional `audience: {group}`, `channel: true|{name}`, `board: true|{name}` | **archive-never-reap**: a vanished file (or a surface switched off) archives the row and its channel/board; nothing is ever deleted |

Every settings key is unique across the install set (two files claiming
one key fail the claimant pack at `flat-key`); so are subject titles and
their surface names. The per-key comments travel with their keys.
| `content/blueprints/<blueprintId>.yaml` | `blueprint` — the curated overlay of the Studio composition catalogue: named / blessed compositions and logic-bearing kinds, matched to the derived skeleton by structural signature (a `classPath` is introspected) | three-way, like any document kind; the derived skeleton itself is a cache `BlueprintCatalogue.rebuild()` regenerates at boot |
| `content/blueprints/<blueprintId>.yaml` | `blueprint` — the curated overlay of the Studio composition catalogue: named / blessed compositions and logic-bearing kinds, matched to the derived skeleton by structural signature (a `classPath` is introspected) | three-way, like any document kind; the derived skeleton itself is a cache `BlueprintCatalogue.rebuild()` regenerates at boot |
