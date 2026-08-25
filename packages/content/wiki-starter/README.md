# wiki-starter

The starter articles — the `wiki` kind: one `content/wiki/<namespace>/<slug>.md`
per page, YAML frontmatter (`title`, optional `subject`, `tags`, `related`,
`spoilerLevel`) over a **markdown** body (the article dialect, exactly what
`wiki edit` takes).

Installed by SUBMITTING through the wiki's own create/edit path as the pack
(`pack:wiki-starter` is the revision author) — never as rows: a page has a
revision log and a compare-and-swap edit, and the pack is one more editor.
A changed pack file over a page nobody touched edits it (a new revision);
over a page somebody has edited it is a **conflict** (`wiki-cas`) that
`pack diff` shows with all three bodies and `pack resolve --take-pack`
settles as an edit over the current revision (the history keeps both). A
vanished file keeps the page — a wiki page is community property the
moment it exists. A page that was renamed resolves by alias, so it is never
re-created under its old name.

## The teaching note (from the former `wiki-pages.yaml`)

wiki-pages.yaml — the starter articles, installed by the backend
WikiSeeder at boot.

**Insert-only.** A page whose name already exists is left completely
alone. That is load-bearing rather than convenient: a wiki is
community-maintained, and a seeder that re-asserted its version every
boot would silently revert every edit anybody made to a seeded page,
on a schedule, with no record of having done it.

⭐ WHAT BELONGS HERE, and what does not.

"Where the taxonomy IS the thing's identity — materials, biomes — we
seed deliberately, because there the structure is not an editorial
choice, it is the subject matter. Everything else grows organically
and is reorganised later if it ever needs to be. **Over-organising an
empty wiki is how wikis die.**"

So this file is a FLOOR to build on, not a skeleton to fill in. It
ships: the front door, one worked example of each thing the engine can
do (a subject-bound article, a snippet, a guide), and nothing else.
Resist adding a stub for every material. A redlink is a better empty
page than an empty page — it says "somebody wanted this" and turns up
in `wiki wanted`, whereas a stub says "this is done" and does not.

⚠ Bodies are **markdown** — the article dialect, exactly what a
player types into `wiki edit`. Not MML. These pages are the first
thing anybody reads AND the first thing anybody opens the source of,
so a seed written in markup the guide page does not teach would be
teaching two syntaxes on day one. MML tags the dialect has no
markdown for (`<composition/>`, `<spoiler>`, snippet components) are
written inline as tags, which is the intended mixed authoring.
