import DOMPurify from "isomorphic-dompurify";

const PURIFY_CONFIG: DOMPurify.Config = {
  FORBID_TAGS: [
    "script", "style", "iframe", "object", "embed",
    "form", "input", "textarea", "select", "button",
  ],
  FORBID_ATTR: [
    "onerror", "onload", "onclick", "onmouseover", "onmouseout", "onmouseenter",
    "onmouseleave", "onfocus", "onblur", "onsubmit", "onreset", "onchange",
    "oninput", "onkeydown", "onkeyup", "onkeypress", "ondblclick", "oncontextmenu",
    "ondrag", "ondragend", "ondragenter", "ondragleave", "ondragover", "ondragstart",
    "ondrop", "onscroll", "oncopy", "oncut", "onpaste", "onanimationend",
    "ontransitionend", "onwheel", "ontouchstart", "ontouchend", "ontouchmove",
    "srcdoc", "formaction",
  ],
  ALLOW_DATA_ATTR: false,
  ADD_TAGS: [
    "svg", "circle", "ellipse", "line", "path", "polygon", "polyline", "rect",
    "g", "text", "tspan", "defs", "use", "symbol", "clipPath", "mask", "pattern",
    "image", "foreignObject", "math", "mi", "mn", "mo", "ms", "mrow", "msup",
    "msub", "mfrac", "mroot", "msqrt",
  ],
  ADD_ATTR: [
    "viewBox", "xmlns", "d", "cx", "cy", "r", "rx", "ry", "x", "y",
    "x1", "y1", "x2", "y2", "width", "height", "fill", "stroke", "stroke-width",
    "transform", "points", "preserveAspectRatio",
  ],
};

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, PURIFY_CONFIG);
}
