import { describe, it, expect } from "vitest";
import { parseSearchQuery } from "../query-parser.js";

describe("parseSearchQuery", () => {
  it("treats bare text as semantic", () => {
    expect(parseSearchQuery("how does gravity work")).toEqual({
      semantic: "how does gravity work",
    });
  });

  it("parses !semantic: prefix", () => {
    expect(parseSearchQuery("!semantic:gravity")).toEqual({
      semantic: "gravity",
    });
  });

  it("parses !file: prefix", () => {
    expect(parseSearchQuery("!file:newton")).toEqual({
      file: "newton",
    });
  });

  it("parses combined !file: and !semantic:", () => {
    expect(parseSearchQuery("!file:lecture !semantic:derivatives")).toEqual({
      file: "lecture",
      semantic: "derivatives",
    });
  });

  it("prefix value runs until next ! prefix", () => {
    expect(parseSearchQuery("!file:physics force and motion")).toEqual({
      file: "physics force and motion",
    });
  });

  it("strips unknown prefixes", () => {
    expect(parseSearchQuery("!tags:react hooks")).toEqual({});
  });

  it("strips unknown prefixes but keeps known ones", () => {
    expect(parseSearchQuery("!tags:react !semantic:hooks")).toEqual({
      semantic: "hooks",
    });
  });

  it("last wins for duplicate prefixes", () => {
    expect(parseSearchQuery("!file:alpha !file:beta")).toEqual({
      file: "beta",
    });
  });

  it("returns empty object for empty string", () => {
    expect(parseSearchQuery("")).toEqual({});
  });

  it("returns empty object for whitespace only", () => {
    expect(parseSearchQuery("   ")).toEqual({});
  });

  it("trims prefix values", () => {
    expect(parseSearchQuery("!file:  newton  ")).toEqual({
      file: "newton",
    });
  });

  it("handles reversed order", () => {
    expect(parseSearchQuery("!semantic:force !file:physics")).toEqual({
      file: "physics",
      semantic: "force",
    });
  });
});
