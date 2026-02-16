import { remark } from "remark";
import remarkParse from "remark-parse";

export function extractHeadings(markdown: string) {
  const tree = remark().use(remarkParse).parse(markdown);
  const headings: { level: number; text: string }[] = [];

  const extractText = (node: any): string => {
    if (node.type === "text") return node.value;
    if (node.type === "inlineCode") return node.value;
    if (node.type === "emphasis" || node.type === "strong") {
      return node.children.map(extractText).join("");
    }
    if (node.children) return node.children.map(extractText).join("");
    return "";
  };

  const visit = (node: any) => {
    if (node.type === "heading") {
      const text = node.children.map(extractText).join("").trim();
      if (text) {
        headings.push({ level: node.depth, text });
      }
    }
    if (node.children) node.children.forEach(visit);
  };

  visit(tree);
  return headings;
}
