import { describe, it, expect } from "vitest";
import { classifyUrl, UrlType } from "../capture.url-classifier.js";

describe("classifyUrl", () => {
  it("classifies youtube.com/watch as bookmark", () => {
    expect(classifyUrl("https://youtube.com/watch?v=abc123")).toBe(UrlType.Bookmark);
  });

  it("classifies youtu.be short link as bookmark", () => {
    expect(classifyUrl("https://youtu.be/abc123")).toBe(UrlType.Bookmark);
  });

  it("classifies www.youtube.com as bookmark", () => {
    expect(classifyUrl("https://www.youtube.com/watch?v=xyz")).toBe(UrlType.Bookmark);
  });

  it("classifies twitter.com as bookmark", () => {
    expect(classifyUrl("https://twitter.com/user/status/123")).toBe(UrlType.Bookmark);
  });

  it("classifies x.com as bookmark", () => {
    expect(classifyUrl("https://x.com/user/status/456")).toBe(UrlType.Bookmark);
  });

  it("classifies reddit.com as bookmark", () => {
    expect(classifyUrl("https://www.reddit.com/r/programming/comments/abc")).toBe(UrlType.Bookmark);
  });

  it("classifies regular article URL as article", () => {
    expect(classifyUrl("https://blog.example.com/my-article")).toBe(UrlType.Article);
  });

  it("classifies news site as article", () => {
    expect(classifyUrl("https://www.nytimes.com/2025/01/15/tech/ai.html")).toBe(UrlType.Article);
  });

  it("classifies Wikipedia as article", () => {
    expect(classifyUrl("https://en.wikipedia.org/wiki/Neural_network")).toBe(UrlType.Article);
  });
});
