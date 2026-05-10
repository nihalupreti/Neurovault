import { describe, it, expect } from "vitest";
import { scopeCss } from "../books.css-scoper.js";

describe("scopeCss", () => {
  it("prefixes simple selectors", () => {
    const input = "p { color: red; }";
    expect(scopeCss(input)).toBe(".epub-content p{color:red}");
  });

  it("prefixes class selectors", () => {
    const input = ".chapter p { margin: 0; }";
    expect(scopeCss(input)).toBe(".epub-content .chapter p{margin:0}");
  });

  it("replaces body selector with .epub-content", () => {
    const input = "body { font-size: 16px; }";
    expect(scopeCss(input)).toBe(".epub-content{font-size:16px}");
  });

  it("prefixes compound selectors (comma-separated)", () => {
    const input = "h1, h2 { font-weight: bold; }";
    expect(scopeCss(input)).toBe(".epub-content h1,.epub-content h2{font-weight:bold}");
  });

  it("preserves @font-face rules without prefixing", () => {
    const input = '@font-face { font-family: "Custom"; src: url("font.woff2"); }';
    const result = scopeCss(input);
    expect(result).toContain("@font-face");
    expect(result).not.toContain(".epub-content @font-face");
  });

  it("prefixes selectors inside @media queries", () => {
    const input = "@media (max-width: 600px) { .narrow { display: block; } }";
    const result = scopeCss(input);
    expect(result).toContain(".epub-content .narrow");
    expect(result).toContain("@media");
  });

  it("strips expression() and url(javascript:) from values", () => {
    const input = "div { width: expression(alert(1)); background: url(javascript:void(0)); }";
    const result = scopeCss(input);
    expect(result).not.toContain("expression(");
    expect(result).not.toContain("javascript:");
  });

  it("strips -moz-binding", () => {
    const input = "div { -moz-binding: url('evil.xml#xss'); }";
    const result = scopeCss(input);
    expect(result).not.toContain("-moz-binding");
  });

  it("rewrites font URLs with asset base path", () => {
    const input = '@font-face { font-family: "X"; src: url("../fonts/x.woff2"); }';
    const result = scopeCss(input, "/api/books/abc123/assets");
    expect(result).toContain("/api/books/abc123/assets/fonts/x.woff2");
  });

  it("returns empty string for empty input", () => {
    expect(scopeCss("")).toBe("");
  });
});
