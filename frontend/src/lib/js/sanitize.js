// Sanitizer HTML tối giản chống XSS, dùng cho {@html} trong Svelte.
// Allow-list whitelist: chỉ giữ các tag/attr an toàn cho nội dung bài học + description.
// Bỏ <script>, <iframe>, <object>, <embed>, on* event handlers, href="javascript:..."
//
// Tại sao không dùng DOMPurify: tránh thêm runtime dep ~45KB khi yêu cầu chỉ là
// sanitize text content hiển thị (không dùng cho input/storage). Nếu cần sanitize
// chặt hơn (dấu như text editor output), cân nhắc dùng DOMPurify sau.
//
// Usage:
//   import { sanitizeHtml } from "$lib/js/sanitize";
//   {@html sanitizeHtml(rawHtml)}

const ALLOWED_TAGS = new Set([
  "a", "b", "blockquote", "br", "code", "div", "em", "h1", "h2", "h3", "h4",
  "h5", "h6", "hr", "i", "img", "li", "ol", "p", "pre", "span", "strong",
  "sub", "sup", "table", "tbody", "td", "th", "thead", "tr", "u", "ul",
]);

const ALLOWED_ATTRS = {
  // chỉ whitelist — attrs khác bị strip.
  a: ["href", "target", "rel", "title"],
  img: ["src", "alt", "title", "width", "height", "loading"],
  "*": ["class", "id", "title"], // áp dụng cho mọi tag
};

const DANGEROUS_PROTOCOLS = /^(?:javascript:|data:(?!image\/)|vbscript:)/i;

const sanitizeAttrValue = (name, value) => {
  if (typeof value !== "string") return "";
  if (name === "href" || name === "src") {
    const trimmed = value.trim();
    if (DANGEROUS_PROTOCOLS.test(trimmed)) return "";
  }
  return value;
};

const attrAllowed = (tag, attr) => {
  if (attr.startsWith("on")) return false; // block onclick, onerror, ...
  const tagAttrs = ALLOWED_ATTRS[tag] || [];
  const globalAttrs = ALLOWED_ATTRS["*"] || [];
  return tagAttrs.includes(attr) || globalAttrs.includes(attr);
};

const cleanNode = (node, doc) => {
  if (node.nodeType === 3) return; // text node — safe
  if (node.nodeType !== 1) {
    // comment, processing instruction, etc. — remove
    node.remove();
    return;
  }

  const tag = node.tagName.toLowerCase();
  if (!ALLOWED_TAGS.has(tag)) {
    // Thay tag không cho phép bằng text content để giữ chữ.
    const text = doc.createTextNode(node.textContent || "");
    node.replaceWith(text);
    return;
  }

  // Lọc attrs
  for (const attr of Array.from(node.attributes)) {
    const name = attr.name.toLowerCase();
    if (!attrAllowed(tag, name)) {
      node.removeAttribute(attr.name);
      continue;
    }
    const cleaned = sanitizeAttrValue(name, attr.value);
    if (cleaned === "" && attr.value !== "") {
      node.removeAttribute(attr.name);
    } else if (cleaned !== attr.value) {
      node.setAttribute(attr.name, cleaned);
    }
  }

  // Tự động add rel="noopener noreferrer" cho external link.
  if (tag === "a" && node.getAttribute("target") === "_blank") {
    const rel = (node.getAttribute("rel") || "").split(/\s+/).filter(Boolean);
    if (!rel.includes("noopener")) rel.push("noopener");
    if (!rel.includes("noreferrer")) rel.push("noreferrer");
    node.setAttribute("rel", rel.join(" "));
  }

  // Recurse
  for (const child of Array.from(node.childNodes)) {
    cleanNode(child, doc);
  }
};

export const sanitizeHtml = (html) => {
  if (!html || typeof html !== "string") return "";

  // SSR: DOMParser không có ở Node → fallback strip tag.
  if (typeof DOMParser === "undefined") {
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
      .replace(/on\w+\s*=\s*"[^"]*"/gi, "")
      .replace(/on\w+\s*=\s*'[^']*'/gi, "")
      .replace(/javascript:/gi, "");
  }

  const doc = new DOMParser().parseFromString(
    `<!doctype html><body>${html}</body>`,
    "text/html",
  );
  const body = doc.body;
  for (const child of Array.from(body.childNodes)) {
    cleanNode(child, doc);
  }
  return body.innerHTML;
};
