/**
 * `CardViewStrip` — named views over the card feed.
 *
 * The terminal's `TabStrip`, for the other column: `All` first and
 * locked, then the player's own views, then `+`. Same gestures, same
 * vocabulary, because a player who has learned one strip has learned
 * both.
 *
 * ⭐ **`All` is the absence of a filter**, not a member of the list. It
 * renders as a structural entry, has no `⋯`, and cannot be deleted —
 * because it is not stored to delete.
 *
 * ⚠ **Not a command preview**, and deliberately: changing which cards
 * you are looking at is not a command, it is a saved viewport setting —
 * the same line `console.tabs` and the feed switcher already sit on.
 */

import React from "react";
import styled from "styled-components";
import type { CardId } from "@saxonberg/types";
import { CARD_IDS } from "@saxonberg/types";
import { useStore } from "../../store/index";
import { tokens } from "../ui";
import { CARD_LABEL } from "./useCardFeed";
import {
  ALL_CARDS,
  addCardView,
  deleteCardView,
  getActiveCardView,
  getCardViews,
  renameCardView,
  setActiveCardView,
  setCardViewKinds,
} from "../../store/cardViewActions";

const Strip = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-wrap: wrap;
  padding: ${tokens.space.xs} ${tokens.space.md};
  border-bottom: 1px solid ${tokens.color.borderMuted};
  background: ${tokens.color.surfaceAlt};
`;

const ViewButton = styled.button<{ $active: boolean }>`
  background: ${(p) => (p.$active ? tokens.color.surface : "transparent")};
  border: 1px solid
    ${(p) => (p.$active ? tokens.color.fgEmphasis : tokens.color.borderMuted)};
  border-radius: ${tokens.radius.sm};
  color: inherit;
  cursor: pointer;
  padding: 0.15rem 0.6rem;
  font: inherit;
  min-height: 32px;
`;

const Editor = styled.div`
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  gap: ${tokens.space.xs};
  padding: ${tokens.space.xs} 0;
`;

const KindToggle = styled.button<{ $on: boolean }>`
  background: ${(p) => (p.$on ? tokens.color.accentWash : "transparent")};
  border: 1px solid
    ${(p) => (p.$on ? tokens.color.fgEmphasis : tokens.color.borderMuted)};
  border-radius: ${tokens.radius.sm};
  color: inherit;
  cursor: pointer;
  padding: 0.1rem 0.5rem;
  font: inherit;
  font-size: ${tokens.font.label};
  min-height: 32px;
`;

export function CardViewStrip(): React.ReactElement {
  // Subscribed, not read once: a `client-state-update` push must
  // repaint the strip without a remount.
  const clientState = useStore((s) => s.clientState);
  void clientState;
  const views = getCardViews();
  const active = getActiveCardView();
  const [editing, setEditing] = React.useState<string | null>(null);

  const editingView = views.find((v) => v.name === editing);

  return (
    <Strip data-testid="card-view-strip">
      <ViewButton
        $active={active === ALL_CARDS}
        data-testid="card-view-All"
        onClick={() => setActiveCardView(ALL_CARDS)}
      >
        {ALL_CARDS}
      </ViewButton>
      {views.map((v) => (
        <ViewButton
          key={v.name}
          $active={active === v.name}
          data-testid={`card-view-${v.name}`}
          onClick={() =>
            active === v.name
              ? setEditing(editing === v.name ? null : v.name)
              : setActiveCardView(v.name)
          }
        >
          {v.name}
          {active === v.name ? " ⋯" : ""}
        </ViewButton>
      ))}
      <ViewButton
        $active={false}
        data-testid="card-view-add"
        aria-label="new card view"
        onClick={() => {
          /*
           * ⚠ Created AND activated, then opened for editing — the `+`
           * on the terminal strip does the same. A control that made
           * an empty thing somewhere else and left you where you were
           * is one nobody can explain to themselves.
           */
          const name = `View ${views.length + 1}`;
          addCardView(name);
          setActiveCardView(name);
          setEditing(name);
        }}
      >
        ＋
      </ViewButton>
      {editingView && (
        <Editor data-testid="card-view-editor">
          {CARD_IDS.map((kind: CardId) => {
            const on = editingView.kinds.includes(kind);
            return (
              <KindToggle
                key={kind}
                $on={on}
                data-testid={`card-view-kind-${kind}`}
                onClick={() =>
                  setCardViewKinds(
                    editingView.name,
                    on
                      ? editingView.kinds.filter((k) => k !== kind)
                      : [...editingView.kinds, kind],
                  )
                }
              >
                {CARD_LABEL[kind]}
              </KindToggle>
            );
          })}
          <KindToggle
            $on={false}
            data-testid="card-view-rename"
            onClick={() => {
              const next = window.prompt("Rename view", editingView.name);
              if (next) {
                renameCardView(editingView.name, next);
                setEditing(next.trim());
              }
            }}
          >
            rename
          </KindToggle>
          <KindToggle
            $on={false}
            data-testid="card-view-delete"
            onClick={() => {
              deleteCardView(editingView.name);
              setEditing(null);
            }}
          >
            delete
          </KindToggle>
        </Editor>
      )}
    </Strip>
  );
}
