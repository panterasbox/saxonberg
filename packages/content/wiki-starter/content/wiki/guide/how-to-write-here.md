---
title: How to write here
tags:
- meta
- guide
related:
- main:saxonberg
---
# How to write here {#how-to-write-here}

`wiki create <name>` starts a page. `wiki edit <name>` changes
one. That is the whole workflow.

## Linking {#linking}

Write `[[Oak]]` to link to a page, or `[[Oak|oak wood]]` to give
the link your own words.

A link to a page nobody has written renders red. **That is not an
error.** It is how a wiki grows: you noticed a gap, and the next
reader can click straight into filling it. Red links are also
ranked by demand in `wiki wanted`.

## Markup {#markup}

`**bold**`, `*italic*`, `` `code` ``, `> quote`, `- lists`
(indent to nest), and pipe tables. Headings are `#` to `###`.

| you write | you get |
| --- | --- |
| `**oak**` | **oak** |
| `[[Oak]]` | a link |
| `{{stub}}` | a snippet |

## Citing a section {#citing}

A heading can carry a permanent name: `## Uses {#uses}`. Once set
it is **kept** even if you later reword the heading — so a course
lesson citing `#uses` keeps working. Anchors are minted for you
if you do not write one.

## Working together {#working-together}

`--section <anchor>` edits one section and leaves the rest alone,
so two people working on different parts of a long page never
collide.

`--rev <n>` says which version you started from. If somebody else
edited meanwhile, your save is refused and you are shown both
versions rather than one quietly replacing the other.

`wiki preview` shows exactly what saving will produce.

## Reusable pieces {#snippets}

A page in the `snippet` namespace can be dropped into any article
with `{{name|arg}}`. See [[snippet:stub|the stub snippet]] for a
worked one. Snippets are ordinary pages — same editing, same
history, same rollback.
