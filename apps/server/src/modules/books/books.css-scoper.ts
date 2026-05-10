import * as csstree from "css-tree";

const DANGEROUS_PROPERTIES = new Set(["behavior", "-moz-binding"]);
const DANGEROUS_VALUE_PATTERNS = [/expression\s*\(/i, /url\s*\(\s*["']?javascript:/i];

export function scopeCss(css: string, assetBasePath?: string): string {
  if (!css.trim()) return "";

  const ast = csstree.parse(css, { parseValue: true });

  csstree.walk(ast, {
    visit: "Rule",
    enter(node) {
      if (node.prelude.type === "SelectorList") {
        prefixSelectorList(node.prelude);
      }
    },
  });

  csstree.walk(ast, {
    visit: "Declaration",
    enter(node, item, list) {
      if (DANGEROUS_PROPERTIES.has(node.property.toLowerCase())) {
        list.remove(item);
        return;
      }
      const raw = csstree.generate(node.value);
      for (const pattern of DANGEROUS_VALUE_PATTERNS) {
        if (pattern.test(raw)) {
          list.remove(item);
          return;
        }
      }
    },
  });

  if (assetBasePath) {
    csstree.walk(ast, {
      visit: "Url",
      enter(node) {
        const value = node.value;
        if (typeof value === "string") {
          node.value = rewriteUrl(value, assetBasePath);
        }
      },
    });
  }

  return csstree.generate(ast);
}

function prefixSelectorList(selectorList: csstree.SelectorList): void {
  selectorList.children.forEach((selector, selectorItem) => {
    if (selector.type !== "Selector") return;

    // Capture the first ListItem via forEach
    let firstItem: csstree.ListItem<csstree.CssNode> | null = null;
    selector.children.forEach((_node, item) => {
      if (!firstItem) firstItem = item;
    });

    if (!firstItem) return;

    const firstNode = (firstItem as csstree.ListItem<csstree.CssNode>).data;

    if (
      firstNode.type === "TypeSelector" &&
      (firstNode.name === "body" || firstNode.name === "html")
    ) {
      selector.children.remove(firstItem);
      if (selector.children.isEmpty) {
        selector.children.prepend(
          selector.children.createItem({ type: "ClassSelector", name: "epub-content" }),
        );
      } else {
        selector.children.prepend(
          selector.children.createItem({ type: "Combinator", name: " " }),
        );
        selector.children.prepend(
          selector.children.createItem({ type: "ClassSelector", name: "epub-content" }),
        );
      }
    } else {
      selector.children.prepend(
        selector.children.createItem({ type: "Combinator", name: " " }),
      );
      selector.children.prepend(
        selector.children.createItem({ type: "ClassSelector", name: "epub-content" }),
      );
    }
  });
}

function rewriteUrl(url: string, basePath: string): string {
  if (url.startsWith("http") || url.startsWith("data:")) return url;
  const cleaned = url.replace(/^\.\.\//, "").replace(/^\.\//, "");
  return `${basePath}/${cleaned}`;
}
