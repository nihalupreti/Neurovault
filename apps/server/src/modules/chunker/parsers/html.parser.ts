import * as cheerio from "cheerio";
import type { ContentNode, ContentParser, NodeType } from "./parser.types.js";

const HEADING_RE = /^h([1-6])$/i;

export class HtmlParser implements ContentParser {
  parse(content: string, metadata?: Record<string, string>): ContentNode {
    const root: ContentNode = { type: "root", content: "", children: [], metadata };
    if (!content.trim()) return root;

    const $ = cheerio.load(content);

    const container = $("article").length > 0 ? $("article") : $("body");
    const elements = container.children().toArray();

    const sectionStack: { node: ContentNode; level: number }[] = [{ node: root, level: 0 }];

    for (const el of elements) {
      const tagName = (el as cheerio.Element).tagName?.toLowerCase() ?? "";
      const $el = $(el);
      const headingMatch = tagName.match(HEADING_RE);

      if (headingMatch) {
        const level = parseInt(headingMatch[1]!, 10);
        const heading = $el.text().trim();

        const sectionNode: ContentNode = {
          type: "section",
          heading,
          headingLevel: level,
          content: "",
          children: [],
        };

        while (sectionStack.length > 1 && sectionStack[sectionStack.length - 1]!.level >= level) {
          sectionStack.pop();
        }

        sectionStack[sectionStack.length - 1]!.node.children.push(sectionNode);
        sectionStack.push({ node: sectionNode, level });
      } else {
        const node = this.classifyElement($, $el, tagName);
        if (node) {
          sectionStack[sectionStack.length - 1]!.node.children.push(node);
        }
      }
    }

    return root;
  }

  private classifyElement(
    $: cheerio.CheerioAPI,
    $el: cheerio.Cheerio<cheerio.Element>,
    tagName: string,
  ): ContentNode | null {
    const text = $el.text().trim();
    if (!text) return null;

    let type: NodeType;
    let nodeContent: string;

    switch (tagName) {
      case "pre":
        type = "code";
        nodeContent = $el.find("code").text().trim() || text;
        break;
      case "blockquote":
        type = "blockquote";
        nodeContent = text;
        break;
      case "ul":
      case "ol":
        type = "list";
        nodeContent = text;
        break;
      case "table":
        type = "table";
        nodeContent = text;
        break;
      default:
        type = "paragraph";
        nodeContent = text;
        break;
    }

    return { type, content: nodeContent, children: [] };
  }
}
