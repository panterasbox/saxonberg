/**
 * Inspection-card fixtures shaped as the server sends them: the record
 * the subject card projects and the segments `look` built (client-surface
 * D1/D2). Strings follow the specimen sheet (docs/design/client-surface/
 * specimens) — the pint, the back-bar, a stranger's body.
 */

import type { CardState } from "../../../../store/cardFeedSlice";

export const PINT: CardState = {
  instanceId: "card-pint",
  cardId: "subject",
  key: "look pint",
  live: false,
  pinned: false,
  openedAt: 1,
  subjectKind: "thing",
  subjectId: "pint-1",
  records: [
    {
      stuffId: "pint-1",
      displayName: "a pint glass",
      primaryKeyword: "pint",
      illustration: "items/pint.png",
      illustrationShape: "square",
    } as never,
  ],
  segments: [
    {
      shape: "prose",
      sources: [{ kind: "mixin", name: "Visible" }],
      text: "A heavy straight-sided pint glass, beaded with cold.",
    },
    {
      shape: "state",
      sources: [{ kind: "mixin", name: "Bulkable" }],
      text: "It holds some lager, nearly full.",
    },
    {
      shape: "state",
      sources: [{ kind: "class", name: "CraftVessel" }],
      text: "It looks fair: honestly made, if unremarkable.",
    },
  ],
};

export const BACKBAR: CardState = {
  instanceId: "card-backbar",
  cardId: "subject",
  key: "look back-bar",
  live: false,
  pinned: false,
  openedAt: 2,
  subjectKind: "thing",
  subjectId: "bb-1",
  records: [
    {
      stuffId: "bb-1",
      displayName: "the back-bar",
      primaryKeyword: "back-bar",
      illustration: "items/backbar.png",
      illustrationShape: "wide",
    } as never,
  ],
  segments: [
    {
      shape: "prose",
      sources: [{ kind: "mixin", name: "Visible" }, { kind: "mixin", name: "Detailed" }],
      text: "A long mirrored shelf behind the counter.",
    },
    {
      shape: "list",
      heading: "On it",
      sources: [{ kind: "look", name: "On it" }],
      text: "── On it: 14 bottles of gin and a bar spoon.",
      items: [
        {
          stuffId: "gin-1",
          label: "14 bottles of gin",
          keyword: "gin",
          count: 14,
          members: Array.from({ length: 14 }, (_, i) => ({
            stuffId: `gin-${i + 1}`,
            label: "a bottle of gin",
            keyword: "gin",
            count: 1,
          })),
        },
        { stuffId: "spoon-1", label: "a bar spoon", keyword: "spoon", count: 1 },
      ],
    },
  ],
};

export const CORPSE: CardState = {
  instanceId: "card-corpse",
  cardId: "subject",
  key: "look body",
  live: false,
  pinned: false,
  openedAt: 3,
  subjectKind: "thing",
  subjectId: "corpse-1",
  records: [{ stuffId: "corpse-1", displayName: "the body of a woman", primaryKeyword: "body" } as never],
  segments: [
    {
      shape: "prose",
      sources: [{ kind: "mixin", name: "Visible" }],
      text: "A still body, cooling.",
    },
    {
      shape: "notice",
      sources: [{ kind: "look", name: "Hints" }],
      text: "Something here almost catches your eye.",
    },
  ],
};
