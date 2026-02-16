import { describe, it, expect } from "vitest";
import { parseWikilinks } from "../wikilink-parser.js";

describe("parseWikilinks", () => {
  it("extracts simple wikilinks", () => {
    const md = "See [[Newton's Laws]] for details.";
    const links = parseWikilinks(md);
    expect(links).toHaveLength(1);
    expect(links[0]).toEqual({
      target: "Newton's Laws",
      alias: undefined,
      position: 4,
    });
  });

  it("extracts aliased wikilinks", () => {
    const md = "Read [[physics/mechanics|this chapter]] now.";
    const links = parseWikilinks(md);
    expect(links).toHaveLength(1);
    expect(links[0]).toEqual({
      target: "physics/mechanics",
      alias: "this chapter",
      position: 5,
    });
  });

  it("extracts multiple wikilinks", () => {
    const md = "Link to [[Alpha]] and [[Beta]] and [[Gamma|G]].";
    const links = parseWikilinks(md);
    expect(links).toHaveLength(3);
    expect(links[0]!.target).toBe("Alpha");
    expect(links[1]!.target).toBe("Beta");
    expect(links[2]!.target).toBe("Gamma");
    expect(links[2]!.alias).toBe("G");
  });

  it("ignores wikilinks inside fenced code blocks", () => {
    const md = "Before\n```\n[[InCode]]\n```\nAfter [[Real]]";
    const links = parseWikilinks(md);
    expect(links).toHaveLength(1);
    expect(links[0]!.target).toBe("Real");
  });

  it("ignores wikilinks inside inline code", () => {
    const md = "Use `[[NotALink]]` but [[RealLink]] works.";
    const links = parseWikilinks(md);
    expect(links).toHaveLength(1);
    expect(links[0]!.target).toBe("RealLink");
  });

  it("returns empty array for no wikilinks", () => {
    const md = "No links here, just plain text.";
    expect(parseWikilinks(md)).toEqual([]);
  });

  it("handles empty string", () => {
    expect(parseWikilinks("")).toEqual([]);
  });
});
