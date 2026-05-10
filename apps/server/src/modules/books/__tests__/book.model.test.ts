import { describe, it, expect } from "vitest";
import { Book, BookChapter } from "../book.model.js";

describe("Book model", () => {
  it("has format field defaulting to html", () => {
    const doc = new Book({ title: "T", htmlHash: "abc" });
    expect(doc.format).toBe("html");
  });

  it("accepts epub format", () => {
    const doc = new Book({ title: "T", htmlHash: "abc", format: "epub" });
    expect(doc.format).toBe("epub");
  });

  it("accepts metadata fields", () => {
    const doc = new Book({
      title: "T",
      htmlHash: "abc",
      author: "Author",
      publisher: "Pub",
      description: "Desc",
      language: "en",
      publishedDate: "2024",
      coverPath: "cover.jpg",
    });
    expect(doc.author).toBe("Author");
    expect(doc.coverPath).toBe("cover.jpg");
  });
});

describe("BookChapter model", () => {
  it("accepts scopedCss field", () => {
    const doc = new BookChapter({
      bookId: "507f1f77bcf86cd799439011",
      number: 1,
      title: "Ch1",
      htmlContent: "<p>hi</p>",
      scopedCss: ".epub-content p { color: red; }",
    });
    expect(doc.scopedCss).toBe(".epub-content p { color: red; }");
  });
});
