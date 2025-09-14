import { remark } from "remark";
import remarkParse from "remark-parse";

export function extractHeadings(markdown: string) {
  const tree = remark().use(remarkParse).parse(markdown);
  const headings: { level: number; text: string }[] = [];

  const visit = (node: any) => {
    if (node.type === "heading") {
      const text = node.children
        .filter((child: any) => child.type === "text")
        .map((child: any) => child.value)
        .join("");
      headings.push({ level: node.depth, text });
    }
    if (node.children) node.children.forEach(visit);
  };

  visit(tree);
  return headings;
}
