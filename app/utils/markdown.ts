import MarkdownIt from "markdown-it";
import sanitizeHtml from "sanitize-html";
import { full as emoji } from "markdown-it-emoji";

const md = new MarkdownIt({
  html: false,
  linkify: true,
});

md.use(emoji);

md.renderer.rules.html_block = () => "";
md.renderer.rules.html_inline = () => "";

const originalRender = md.render;
md.render = (markdown, env) => {
  return sanitizeHtml(originalRender.call(md, markdown, env), {
    allowedTags: [
      "em",
      "strong",
      "s",
      "a",
      "pre",
      "code",
      "br",
      "hr",
      "ol",
      "ul",
      "li",
      "blockquote",
      "p",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
    ],
    allowedAttributes: { a: ["href", "target"], code: ["class"] },
    transformTags: {
      a: (tagName, attribs) => {
        if (attribs.href && attribs.href.startsWith("http")) {
          attribs.target = "_blank";
          attribs.rel = "noopener noreferrer";
        }
        return { tagName, attribs };
      },
    },
  });
};

export default md;
