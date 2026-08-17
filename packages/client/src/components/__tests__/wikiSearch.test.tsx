/**
 * ⭐ **The wiki's search field is wired, and the hatch is gone.**
 *
 * It shipped as a not-wired treatment reading *"╌╌ no search port yet —
 * the tree is the way in"*, citing an audit that was already stale:
 * `recall --scope wiki` had merged **before** the wave that wrote the
 * hatch. The hatch was written from a table rather than from the tree,
 * which is the failure this file now guards in both directions.
 *
 * ⚠ The string test greps the CLIENT SOURCE, per the retired-string
 * precedent. A rendering assertion only proves the string is absent
 * from the one page a test happened to render; a source grep proves it
 * is absent from the product.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { readdirSync, readFileSync, statSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import type { WikiPageFrame } from "@saxonberg/types";
import { CardBody } from "../cards/CardBodies";
import type { CardState } from "../../store/cardFeedSlice";

const PAGE: WikiPageFrame = {
  kind: "wiki-page",
  handle: "palette:switchable",
  title: "Switchable",
  rev: 4,
  body: "A mixin for anything with two stable states.",
  tags: [],
  related: [],
  sections: [],
  subject: { kind: "mixin", ref: "SwitchableMixin" },
  updatedBy: "Aldric",
  updatedAt: 1_700_000_000_000,
  mayEdit: false,
};

function wikiCard(): CardState {
  return {
    instanceId: "w1",
    cardId: "wiki",
    key: "wiki palette:switchable",
    live: false,
    pinned: false,
    openedAt: 1,
    records: [],
    payload: { kind: "wikiPage", page: PAGE },
  };
}

const CLIENT_SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function sourceFiles(root: string): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
        continue;
      }
      if (/\.(ts|tsx)$/.test(entry)) out.push(full);
    }
  };
  walk(root);
  return out;
}

describe("wiki search", () => {
  it("⚠ the retired hatch string is gone from the client source", () => {
    const files = sourceFiles(CLIENT_SRC).filter(
      (f) => !f.endsWith("wikiSearch.test.tsx"),
    );
    // The scan must actually be scanning.
    expect(files.length).toBeGreaterThan(50);
    const offenders = files.filter((f) =>
      /no search port yet/.test(readFileSync(f, "utf8")),
    );
    expect(offenders).toEqual([]);
  });

  it("⭐ sends a REAL command — `recall --scope wiki <terms>`", () => {
    const sent: string[] = [];
    render(
      <CardBody card={wikiCard()} onSendCommand={(t) => sent.push(t)} />,
    );
    const field = screen.getByTestId("wiki-search");
    fireEvent.change(field, { target: { value: "switchable doors" } });
    fireEvent.keyDown(field, { key: "Enter" });
    expect(sent).toEqual(["recall --scope wiki switchable doors"]);
  });

  it("previews exactly what it will send", () => {
    const preview = vi.fn();
    render(
      <CardBody
        card={wikiCard()}
        onSendCommand={() => undefined}
        onCommandPreview={preview}
      />,
    );
    const field = screen.getByTestId("wiki-search");
    fireEvent.change(field, { target: { value: "doors" } });
    fireEvent.focus(field);
    expect(preview).toHaveBeenCalledWith("recall --scope wiki doors");
  });

  it("⚠ an empty field sends nothing — a search for nothing is not a search", () => {
    const sent: string[] = [];
    render(
      <CardBody card={wikiCard()} onSendCommand={(t) => sent.push(t)} />,
    );
    fireEvent.keyDown(screen.getByTestId("wiki-search"), { key: "Enter" });
    expect(sent).toEqual([]);
  });

  it("it is a real input, not a disabled stub", () => {
    render(
      <CardBody card={wikiCard()} onSendCommand={() => undefined} />,
    );
    const field = screen.getByTestId("wiki-search") as HTMLInputElement;
    expect(field.tagName).toBe("INPUT");
    expect(field.disabled).toBe(false);
  });
});
