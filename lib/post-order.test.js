import test from "node:test";
import assert from "node:assert/strict";
import { postOrderTime } from "./post-order.js";

test("publication instants override display dates, including across UTC midnight", () => {
  const date = Date.parse("2026-10-19T12:00:00Z");
  const posts = [
    { title: "Jonnil Online", publishedAt: "2026-10-19T18:07:20Z" },
    { title: "Sticky Paws", publishedAt: "2026-10-20T00:04:51Z" },
  ];
  posts.sort(
    (a, b) =>
      postOrderTime(b.publishedAt, date) - postOrderTime(a.publishedAt, date)
  );
  assert.deepEqual(
    posts.map((post) => post.title),
    ["Sticky Paws", "Jonnil Online"]
  );
  assert.equal(
    postOrderTime("2026-10-20T02:04:51+02:00", date),
    postOrderTime(posts[0].publishedAt, date)
  );
});

test("date-only entries keep their input order on ties", () => {
  const date = Date.parse("2026-10-19T12:00:00Z");
  const posts = ["first", "second", "third"].map((title) => ({ title, date }));
  posts.sort(
    (a, b) =>
      postOrderTime(undefined, b.date) - postOrderTime(undefined, a.date)
  );
  assert.deepEqual(
    posts.map((post) => post.title),
    ["first", "second", "third"]
  );
  assert.equal(postOrderTime(null, date), date);
});

test("date-only, ambiguous and invalid publication times are refused", () => {
  for (const value of [
    "2026-10-19",
    "2026-10-19T12:00:00",
    "bad",
    "2026-99-19T12:00:00Z",
    "",
  ]) {
    assert.throws(
      () => postOrderTime(value, 0, "fixture.md"),
      /Invalid publishedAt in fixture.md/
    );
  }
  assert.equal(
    postOrderTime(new Date("2026-10-19T18:07:20Z"), 0),
    Date.parse("2026-10-19T18:07:20Z")
  );
});
