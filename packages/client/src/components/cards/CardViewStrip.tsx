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

/** The terminal strip's rename field, same shape, same gesture. */
const NameInput = styled.input`
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.fgEmphasis};
  border-radius: ${tokens.radius.sm};
  color: inherit;
  font: inherit;
  font-size: ${tokens.font.label};
  padding: 0.1rem 0.5rem;
  min-height: 32px;
  max-width: 12rem;
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
  /**
   * ⚠⚠ **Rename is INLINE, not a `window.prompt`.**
   *
   * This strip's whole claim is *same gestures as the terminal's*, and
   * `TabStrip` renames inline (`tab-rename-input`). A native dialog is a
   * different gesture in the one place the two strips were supposed to
   * be indistinguishable — and on the phone it is a browser modal over
   * a surface that has no other modals, which is how a player learns
   * that one of these two strips is not really the same thing. Found by
   * driving.
   */
  const [renaming, setRenaming] = React.useState<string | null>(null);

  const editingView = views.find((v) => v.name === editing);

  function commitRename(): void {
    if (editingView === undefined || renaming === null) return;
    const value = renaming.trim();
    if (value && value !== editingView.name) {
      renameCardView(editingView.name, value);
      setEditing(value);
    }
    setRenaming(null);
  }

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
          {renaming === null ? (
            <KindToggle
              $on={false}
              data-testid="card-view-rename"
              onClick={() => setRenaming(editingView.name)}
            >
              rename
            </KindToggle>
          ) : (
            <NameInput
              autoFocus
              value={renaming}
              aria-label="rename view"
              data-testid="card-view-rename-input"
              onChange={(e) => setRenaming(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                else if (e.key === "Escape") setRenaming(null);
              }}
            />
          )}
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
