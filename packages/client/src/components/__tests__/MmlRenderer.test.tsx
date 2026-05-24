import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MmlRenderer } from "../MmlRenderer";

function renderRenderer(text: string) {
  const onCommandClick = vi.fn();
  const onCommandPreview = vi.fn();
  const result = render(
    <MmlRenderer
      text={text}
      onCommandClick={onCommandClick}
      onCommandPreview={onCommandPreview}
    />
  );
  return { ...result, onCommandClick, onCommandPreview };
}

describe("MmlRenderer", () => {
  it("renders plain text without modification", () => {
    renderRenderer("hello world");
    expect(screen.getByText("hello world")).toBeDefined();
  });

  it("renders an <exit> tag as a clickable span with the label as text", () => {
    renderRenderer(
      'Exits: <exit dir="north">north</exit>, <exit dir="south">south</exit>.'
    );
    expect(screen.getByText("north")).toBeDefined();
    expect(screen.getByText("south")).toBeDefined();
  });

  it("fires onCommandClick with dir attribute when clicked", () => {
    const { onCommandClick } = renderRenderer(
      'Exits: <exit dir="north">north</exit>.'
    );
    fireEvent.click(screen.getByText("north"));
    expect(onCommandClick).toHaveBeenCalledWith("north");
  });

  it("falls back to label text when <exit> has no dir attribute", () => {
    const { onCommandClick } = renderRenderer("<exit>up</exit>");
    fireEvent.click(screen.getByText("up"));
    expect(onCommandClick).toHaveBeenCalledWith("up");
  });

  it("renders unknown tags as their label text without a clickable affordance (forward-compat)", () => {
    const { container } = renderRenderer(
      'You see <item id="42">a brass thermometer</item> here.'
    );
    expect(container.textContent).toBe("You see a brass thermometer here.");
    expect(container.querySelector("span")).toBeNull();
  });

  it("handles multiple tags interleaved with text", () => {
    const { onCommandClick } = renderRenderer(
      'Go <exit dir="north">north</exit> or <exit dir="east">east</exit>.'
    );
    fireEvent.click(screen.getByText("east"));
    expect(onCommandClick).toHaveBeenCalledWith("east");
    expect(onCommandClick).toHaveBeenCalledTimes(1);
  });

  it("renders text containing only a tag", () => {
    const { onCommandClick } = renderRenderer('<exit dir="north">north</exit>');
    fireEvent.click(screen.getByText("north"));
    expect(onCommandClick).toHaveBeenCalledWith("north");
  });

  it("renders text containing no tags", () => {
    const { container } = renderRenderer("Your surroundings are indistinct.");
    expect(container.textContent).toBe("Your surroundings are indistinct.");
  });

  it("fires onCommandPreview with the command on mouseenter", () => {
    const { onCommandPreview } = renderRenderer(
      '<exit dir="north">north</exit>'
    );
    fireEvent.mouseEnter(screen.getByText("north"));
    expect(onCommandPreview).toHaveBeenCalledWith("north");
  });

  it("fires onCommandPreview with null on mouseleave", () => {
    const { onCommandPreview } = renderRenderer(
      '<exit dir="north">north</exit>'
    );
    fireEvent.mouseEnter(screen.getByText("north"));
    fireEvent.mouseLeave(screen.getByText("north"));
    expect(onCommandPreview).toHaveBeenNthCalledWith(1, "north");
    expect(onCommandPreview).toHaveBeenNthCalledWith(2, null);
  });

  it("does not fire onCommandPreview for unknown tags", () => {
    const { onCommandPreview, container } = renderRenderer(
      'You see <item id="42">a brass thermometer</item>.'
    );
    // No span rendered for unknown tag — nothing to hover.
    expect(container.querySelector("span")).toBeNull();
    expect(onCommandPreview).not.toHaveBeenCalled();
  });
});
