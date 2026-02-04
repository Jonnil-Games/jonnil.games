(function () {
  const EMOJI_BASE =
    "https://cdn.jsdelivr.net/gh/Mstrodl/mutant-standard-mirror@master/emoji/";
  const EMOJI_MAP = {
    "🔍": "1f50d.svg",
    "🏳️‍⚧️": "1f3f3-fe0f-200d-26a7-fe0f.svg",
    "🌈": "1f308.svg",
    "💝": "1f49d.svg",
    "✨": "2728.svg",
    "🏳️‍🌈": "1f3f3-fe0f-200d-1f308.svg",
    "👥": "1f465.svg",
    "🐾": "1f43e.svg",
    "🎮": "1f3ae.svg",
    "🏁": "1f3c1.svg",
    "👻": "1f47b.svg",
    "🔎": "1f50e.svg",
    "💬": "1f4ac.svg",
    "🌐": "1f310.svg",
    "🇺🇸": "/emoji/flag-us.svg",
    "🇸🇪": "/emoji/flag-se.svg",
    "🌀": "1f300.svg",
    "💖": "1f496.svg",
  };

  const SKIP_TAGS = new Set([
    "SCRIPT",
    "STYLE",
    "TEXTAREA",
    "CODE",
    "PRE",
    "NOSCRIPT",
    "SVG",
    "MATH",
  ]);
  const SKIP_SELECTOR = Array.from(SKIP_TAGS)
    .map((tag) => tag.toLowerCase())
    .join(",");

  function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  const EMOJI_PATTERN = new RegExp(
    "(" + Object.keys(EMOJI_MAP).map(escapeRegExp).join("|") + ")",
    "g"
  );
  const EMOJI_CHECK = new RegExp(EMOJI_PATTERN.source);

  function getEmojiSrc(emoji) {
    const value = EMOJI_MAP[emoji];
    if (!value) return null;
    if (value.startsWith("http") || value.startsWith("/")) return value;
    return EMOJI_BASE + value;
  }

  function createEmojiImg(emoji) {
    const src = getEmojiSrc(emoji);
    if (!src) return null;
    const img = document.createElement("img");
    img.className = "emoji";
    img.loading = "lazy";
    img.decoding = "async";
    img.setAttribute("role", "img");
    img.setAttribute("aria-label", emoji);
    img.alt = "";
    img.src = src;
    return img;
  }

  function shouldSkip(node) {
    if (!node || !node.parentNode) return true;
    const parent = node.parentNode;
    if (parent.closest && parent.closest(".emoji")) return true;
    if (parent.closest) {
      if (parent.closest(SKIP_SELECTOR)) return true;
    }
    if (parent.nodeType === Node.ELEMENT_NODE && SKIP_TAGS.has(parent.nodeName)) {
      return true;
    }
    return false;
  }

  function replaceTextNode(node) {
    const text = node.nodeValue;
    if (!text || !EMOJI_CHECK.test(text)) return;
    const parts = text.split(EMOJI_PATTERN);
    const frag = document.createDocumentFragment();
    parts.forEach((part) => {
      if (!part) return;
      if (EMOJI_MAP[part]) {
        const img = createEmojiImg(part);
        if (img) frag.appendChild(img);
      } else {
        frag.appendChild(document.createTextNode(part));
      }
    });
    node.parentNode.replaceChild(frag, node);
  }

  function process(root) {
    const scope = root || document.body;
    if (!scope) return;
    const walker = document.createTreeWalker(
      scope,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          if (!node.nodeValue || !EMOJI_CHECK.test(node.nodeValue)) {
            return NodeFilter.FILTER_REJECT;
          }
          if (shouldSkip(node)) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        },
      }
    );
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(replaceTextNode);
  }

  function run() {
    process(document.body);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }

  document.addEventListener("jg-i18n-ready", () => process(document.body));

  window.JG_EMOJI = {
    process,
    map: EMOJI_MAP,
  };
})();
