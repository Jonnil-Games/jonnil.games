import { load } from "js-yaml";

export default function frontMatter(markdown) {
  const match = /^\uFEFF?---[ \t]*\r?\n(?:([\s\S]*?)\r?\n)?(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/.exec(
    markdown
  );
  if (!match) return { attributes: {}, body: markdown };

  return {
    attributes: load(match[1] || "") || {},
    body: markdown.slice(match[0].length),
  };
}
