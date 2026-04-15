import { describe, it, expect } from "@jest/globals";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

/**
 * Regression guard: the app-wide CSS must prevent horizontal scrolling
 * at the page level so a single rogue wide element can never make the
 * whole page scrollable sideways on mobile.
 *
 * We don't have a real browser in the unit-test suite, so instead of
 * taking layout screenshots we assert the CSS safety rules stay in
 * globals.css. If you need to override on a specific element, do it
 * there — never by relaxing the global rule.
 */
describe("no horizontal scroll safety net", () => {
  const globalsPath = join(process.cwd(), "src/app/globals.css");
  const css = readFileSync(globalsPath, "utf8");

  it("globals.css sets overflow-x: hidden on html and body", () => {
    // Strip whitespace so we can match regardless of formatting
    const normalized = css.replace(/\s+/g, " ");
    expect(normalized).toMatch(/html\s*,\s*body\s*\{[^}]*overflow-x\s*:\s*hidden/);
  });

  it("globals.css caps body width at 100vw", () => {
    const normalized = css.replace(/\s+/g, " ");
    expect(normalized).toMatch(/html\s*,\s*body\s*\{[^}]*max-width\s*:\s*100vw/);
  });

  it("does NOT use overflow-x: visible at the html/body level", () => {
    // Someone adding overflow-x: visible later would negate the safety net
    const normalized = css.replace(/\s+/g, " ");
    const htmlBodyBlock = normalized.match(/html\s*,\s*body\s*\{([^}]*)\}/);
    expect(htmlBodyBlock).not.toBeNull();
    if (htmlBodyBlock) {
      expect(htmlBodyBlock[1]).not.toMatch(/overflow-x\s*:\s*visible/);
    }
  });

  /**
   * Heuristic check: scan all page.tsx files for common anti-patterns
   * that would likely cause horizontal scrolling. This doesn't render
   * the pages, but it flags suspicious patterns early.
   */
  it("no page uses whitespace-nowrap on a container without overflow handling", () => {
    function walk(dir: string): string[] {
      const out: string[] = [];
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) out.push(...walk(full));
        else if (entry.name === "page.tsx") out.push(full);
      }
      return out;
    }

    const files = walk(join(process.cwd(), "src/app"));

    const offenders: string[] = [];
    for (const file of files) {
      const content = readFileSync(file, "utf8");
      // Pattern: whitespace-nowrap on a container that doesn't also have
      // overflow-hidden / truncate / min-w-0 / overflow-x-auto. Heuristic
      // — false positives are fine; false negatives are not.
      const suspicious =
        /className\s*=\s*"[^"]*whitespace-nowrap(?![^"]*(?:overflow-hidden|truncate|min-w-0|overflow-x-auto))[^"]*"/.test(
          content
        );
      if (suspicious) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });
});
