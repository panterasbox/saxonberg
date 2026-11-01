/**
 * The one icon map: every icon is drawn by name through `<Icon>`, the
 * word is always there, and an unknown name is visibly a placeholder.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { Icon } from "../icons/Icon";

describe("Icon", () => {
  it("draws a mapped name, with its word as the accessible name", () => {
    const { container } = render(<Icon name="card.pin" label="pin" />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("data-icon")).toBe("card.pin");
    expect(svg.getAttribute("aria-label")).toBe("pin");
    expect(svg.getAttribute("data-icon-fallback")).toBeNull();
  });

  it("⭐ an unmapped name draws the fallback glyph — never nothing", () => {
    const { container } = render(<Icon name="mixin.Nonesuch" label="a nonesuch" />);
    const svg = container.querySelector("svg")!;
    expect(svg).not.toBeNull();
    expect(svg.getAttribute("data-icon-fallback")).toBe("true");
    expect(svg.getAttribute("aria-label")).toBe("a nonesuch");
  });

  it("⭐⭐ nothing outside ui/icons imports an icon set", () => {
    const src = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
    const offenders: string[] = [];
    const walk = (dir: string): void => {
      for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        if (statSync(full).isDirectory()) {
          if (name !== "node_modules") walk(full);
        } else if (/\.tsx?$/.test(name) && !full.includes(`${join("ui", "icons")}`)) {
          if (/from ["'](lucide-react|@iconify\/|@phosphor-icons\/)/.test(readFileSync(full, "utf8"))) {
            offenders.push(relative(src, full));
          }
        }
      }
    };
    walk(src);
    expect(offenders).toEqual([]);
  });
});
