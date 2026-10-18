import assert from "node:assert/strict";
import test from "node:test";
import frontMatter from "./front-matter.js";

for (const newline of ["\n", "\r\n"]) {
  test(`preserves metadata and body with ${JSON.stringify(newline)}`, () => {
    const source = [
      "---",
      'title: "A localized post"',
      "date: 2026-05-11",
      "translations:",
      "  sv:",
      "    title: En lokaliserad post",
      "---",
      "# Body",
      "",
      ":::lang sv",
      "Svensk text.",
    ].join(newline);
    const result = frontMatter(source);
    assert.equal(result.attributes.title, "A localized post");
    assert.equal(result.attributes.date.toISOString(), "2026-05-11T00:00:00.000Z");
    assert.equal(result.attributes.translations.sv.title, "En lokaliserad post");
    assert.equal(result.body, ["# Body", "", ":::lang sv", "Svensk text."].join(newline));
  });
}

test("accepts an empty header and preserves plain Markdown", () => {
  assert.deepEqual(frontMatter("---\n---\nBody"), { attributes: {}, body: "Body" });
  assert.deepEqual(frontMatter("# Body"), { attributes: {}, body: "# Body" });
});

test("accepts a BOM and YAML document end marker", () => {
  assert.deepEqual(frontMatter("\uFEFF---\ntitle: Post\n...\nBody"), {
    attributes: { title: "Post" },
    body: "Body",
  });
});

test("rejects invalid YAML instead of silently dropping metadata", () => {
  assert.throws(() => frontMatter("---\ntitle: [broken\n---\nBody"));
});

test("prototype keys cannot change object prototypes", () => {
  frontMatter("---\n__proto__:\n  polluted: true\n---\nBody");
  assert.equal({}.polluted, undefined);
});
