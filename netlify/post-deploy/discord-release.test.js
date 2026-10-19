import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import frontMatter from "../../lib/front-matter.js";
import { casualDiscordText } from "../../lib/discord-syndication.js";
import { buildFrontmatter, deliverDiscordReleasePost, runSyndicationPostDeploy } from "./run-syndication.js";

const filename = "game-1-2-3.md";
const filePath = "src/blog/posts/" + filename;
const url = "https://jonnil.games/blog/game-1-2-3/";
const release = { schema: 1, body: "## Added\n- " + "Full approved notes. ".repeat(240),
  moreInformation: "Please share your feedback", playLinks: [{ label: "Play on Game Jolt", url: "https://gamejolt.com/games/Game/123" }] };
const metadataLine = "discordRelease: " + JSON.stringify(release);
const original = '---\ntitle: "Game 1.2.3"\ndate: "2026-10-19"\n' + metadataLine + '\nsyndicate:\n  - "discord"\nsyndication:\n  bluesky: "https://bsky.app/profile/game/post/old"\nsyndicationStatus:\n  bluesky: "confirmed"\n---\n\nApproved article body.\n\n<!-- release-id: ' + "a".repeat(64) + " -->\n";

async function fixture(t) {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), "site-discord-"));
  const previousCwd = process.cwd();
  const environment = { ...process.env };
  const previousFetch = globalThis.fetch;
  await fs.mkdir(path.join(folder, "src/blog/posts"), { recursive: true });
  await fs.writeFile(path.join(folder, filePath), original);
  process.chdir(folder);
  Object.assign(process.env, { CONTEXT: "production", SITE_URL: "https://jonnil.games", GITHUB_TOKEN: "test-only-token", GITHUB_OWNER: "test-studio", GITHUB_REPO: "test-site", GITHUB_BRANCH: "main",
    DISCORD_WEBHOOK_URL: "https://discord.com/api/webhooks/123456789012345678/test-only-token" });
  const state = { source: original, sha: "sha-0", writes: [], posts: [], successes: [], checkpoints: [], failLease: false,
    failConfirmedCheckpoint: false, failPostNumber: 0, metadataGets: 0,
    beforeMetadata: null, beforeCheckpoint: null };
  const response = (status, value = {}) => ({ ok: status >= 200 && status < 300, status, json: async () => value, text: async () => JSON.stringify(value) });
  globalThis.fetch = async (destination, options = {}) => {
    const target = new URL(destination);
    const method = options.method || "GET";
    if (target.hostname === "api.github.com") {
      if (target.pathname.endsWith("/contents/src/blog/posts")) return response(200, [{ type: "file", name: filename, path: filePath }]);
      assert.ok(target.pathname.endsWith("/contents/" + filePath));
      if (method === "GET") return response(200, { sha: state.sha, content: Buffer.from(state.source).toString("base64") });
      assert.equal(method, "PUT");
      const payload = JSON.parse(options.body);
      if (payload.sha !== state.sha) return response(409);
      const source = Buffer.from(payload.content, "base64").toString();
      const attributes = frontMatter(source).attributes;
      if (state.beforeCheckpoint && attributes.discordDelivery?.chunks.some((chunk) => chunk.state === "sending")) {
        const callback = state.beforeCheckpoint;
        state.beforeCheckpoint = null;
        await callback();
        return response(409);
      }
      if (state.failLease || (state.failConfirmedCheckpoint && attributes.discordDelivery?.chunks.some((chunk) => chunk.state === "confirmed"))) return response(403);
      state.source = source;
      state.sha = "sha-" + (state.writes.length + 1);
      state.writes.push(source);
      if (attributes.discordDelivery) state.checkpoints.push(structuredClone(attributes.discordDelivery));
      return response(200, { content: { sha: state.sha } });
    }
    if (target.hostname === "discord.com") {
      if (method === "GET") {
        state.metadataGets += 1;
        if (state.beforeMetadata) {
          const callback = state.beforeMetadata;
          state.beforeMetadata = null;
          await callback();
        }
        return response(200, { id: "123456789012345678", guild_id: "100", channel_id: "200" });
      }
      assert.equal(method, "POST");
      const payload = JSON.parse(options.body);
      assert.ok(frontMatter(state.source).attributes.discordDelivery.chunks.some((chunk) => chunk.state === "sending"));
      state.posts.push(payload);
      if (state.posts.length === state.failPostNumber) return response(429, { retry_after: 31 });
      const id = String(300 + state.successes.length);
      state.successes.push({ id, content: payload.content });
      return response(200, { id, channel_id: "200" });
    }
    assert.equal(target.hostname, "jonnil.games", "Unexpected external request");
    return response(200);
  };
  t.after(async () => {
    globalThis.fetch = previousFetch;
    process.chdir(previousCwd);
    for (const key of Object.keys(process.env)) if (!(key in environment)) delete process.env[key];
    Object.assign(process.env, environment);
    await fs.rm(folder, { recursive: true, force: true });
  });
  return state;
}

test("writeback preserves fingerprinted inline release metadata and the article body", () => {
  const parsed = frontMatter(original);
  parsed.attributes.discordDelivery = { schema: 1, chunks: [] };
  const rewritten = buildFrontmatter(parsed.attributes, parsed.body, original);
  assert.ok(rewritten.includes(metadataLine + "\n"));
  assert.deepEqual(frontMatter(rewritten).attributes.discordRelease, release);
  assert.equal(frontMatter(rewritten).body, parsed.body);
});

test("production release sends full content once and saves every message receipt without changing Bluesky", async (t) => {
  const state = await fixture(t);
  const report = await runSyndicationPostDeploy();
  assert.equal(report.errors.length, 0);
  assert.ok(state.posts.length > 1);
  const source = frontMatter(state.source);
  assert.ok(state.source.includes(metadataLine));
  assert.equal(source.attributes.syndicationComplete, true);
  assert.equal(source.attributes.syndicationStatus.discord, "confirmed");
  assert.equal(source.attributes.syndicationStatus.bluesky, "confirmed");
  assert.equal(source.attributes.syndication.bluesky, "https://bsky.app/profile/game/post/old");
  assert.equal(source.attributes.discordDelivery.chunks.length, state.posts.length);
  assert.ok(source.attributes.discordDelivery.chunks.every((chunk) => chunk.state === "confirmed" && chunk.messageId));
  assert.ok(state.posts.map((post) => post.content).join("").includes(casualDiscordText(release.body).trim()));
  assert.ok(state.posts.map((post) => post.content).join("").includes(url));
  assert.equal(source.body, frontMatter(original).body);
  const count = state.posts.length;
  await runSyndicationPostDeploy();
  assert.equal(state.posts.length, count);
});

test("a failed GitHub reservation prevents any Discord request", async (t) => {
  const state = await fixture(t);
  state.failLease = true;
  await assert.rejects(deliverDiscordReleasePost({ filePath, branch: "main", title: "Game 1.2.3", release, url }), /checkpoint failed/);
  assert.equal(state.posts.length, 0);
  assert.equal(state.metadataGets, 0);
});

test("a crash after posting but before saving its ACK holds delivery instead of posting twice", async (t) => {
  const state = await fixture(t);
  state.failConfirmedCheckpoint = true;
  const first = await deliverDiscordReleasePost({ filePath, branch: "main", title: "Game 1.2.3", release, url });
  assert.equal(first.ok, false);
  assert.equal(state.posts.length, 1);
  assert.equal(frontMatter(state.source).attributes.discordDelivery.chunks[0].state, "sending");
  state.failConfirmedCheckpoint = false;
  const later = await deliverDiscordReleasePost({ filePath, branch: "main", title: "Game 1.2.3", release, url, now: new Date(Date.now() + 16 * 60 * 1000) });
  assert.equal(later.error, "delivery-unverified-review-required");
  assert.equal(state.posts.length, 1);
});

test("a known rejected later chunk resumes without repeating the first confirmed message", async (t) => {
  const state = await fixture(t);
  state.failPostNumber = 2;
  await runSyndicationPostDeploy();
  assert.equal(state.successes.length, 1);
  const first = state.successes[0];
  assert.equal(frontMatter(state.source).attributes.discordDelivery.chunks[1].state, "failed");
  state.failPostNumber = 0;
  await runSyndicationPostDeploy();
  assert.equal(state.successes.filter((message) => message.content === first.content).length, 1);
  assert.equal(frontMatter(state.source).attributes.syndicationStatus.discord, "confirmed");
  assert.equal(frontMatter(state.source).attributes.discordDelivery.chunks[0].messageId, first.id);
});

test("concurrent deployments cannot both acquire the same release delivery", async (t) => {
  const state = await fixture(t);
  const results = await Promise.all([
    deliverDiscordReleasePost({ filePath, branch: "main", title: "Game 1.2.3", release, url }),
    deliverDiscordReleasePost({ filePath, branch: "main", title: "Game 1.2.3", release, url }),
  ]);
  assert.equal(results.filter((result) => result.ok).length, 1);
  assert.equal(results.filter((result) => result.error === "delivery-lease-active").length, 1);
  assert.equal(state.successes.length, frontMatter(state.source).attributes.discordDelivery.chunks.length);
});

test("a checkpoint conflict cannot overwrite another deployment's delivery lease or send", async (t) => {
  const state = await fixture(t);
  state.beforeCheckpoint = () => {
    const parsed = frontMatter(state.source);
    parsed.attributes.discordDelivery.lease.id = "a-different-deployment";
    state.source = buildFrontmatter(parsed.attributes, parsed.body, state.source);
    state.sha = "concurrent-lease-sha";
  };
  const result = await deliverDiscordReleasePost({ filePath, branch: "main", title: "Game 1.2.3", release, url });
  assert.equal(result.error, "delivery-checkpoint-failed");
  assert.equal(state.posts.length, 0);
  assert.equal(frontMatter(state.source).attributes.discordDelivery.lease.id, "a-different-deployment");
  assert.equal(frontMatter(state.source).attributes.discordDelivery.chunks[0].state, "ready");
});

test("a checkpoint retry preserves a receipt changed under the same lease", async (t) => {
  const state = await fixture(t);
  state.beforeCheckpoint = () => {
    const parsed = frontMatter(state.source);
    parsed.attributes.discordDelivery.chunks[0] = { state: "unverified", error: "manual-review" };
    state.source = buildFrontmatter(parsed.attributes, parsed.body, state.source);
    state.sha = "concurrent-receipt-sha";
  };
  const result = await deliverDiscordReleasePost({ filePath, branch: "main", title: "Game 1.2.3", release, url });
  assert.equal(result.error, "delivery-checkpoint-failed");
  assert.equal(state.posts.length, 0);
  assert.deepEqual(frontMatter(state.source).attributes.discordDelivery.chunks[0], { state: "unverified", error: "manual-review" });
});

test("final Discord writeback preserves a concurrently confirmed Bluesky receipt", async (t) => {
  const state = await fixture(t);
  const initial = frontMatter(original);
  initial.attributes.syndicate = ["discord", "bluesky"];
  initial.attributes.syndication = {};
  initial.attributes.syndicationStatus.bluesky = "requested";
  initial.attributes.syndicationRequestedAt = { bluesky: new Date().toISOString() };
  initial.attributes.syndicationCheckedAt = { bluesky: new Date().toISOString() };
  state.source = buildFrontmatter(initial.attributes, initial.body, original);
  state.beforeMetadata = () => {
    const parsed = frontMatter(state.source);
    parsed.attributes.syndication.bluesky = "https://bsky.app/profile/game/post/concurrent";
    parsed.attributes.syndicationStatus.bluesky = "confirmed";
    delete parsed.attributes.syndicationRequestedAt.bluesky;
    delete parsed.attributes.syndicationCheckedAt.bluesky;
    parsed.attributes.syndicate = ["discord"];
    state.source = buildFrontmatter(parsed.attributes, parsed.body, state.source);
    state.sha = "concurrent-bluesky-sha";
  };
  const report = await runSyndicationPostDeploy();
  assert.deepEqual(report.errors, []);
  const final = frontMatter(state.source).attributes;
  assert.equal(final.syndication.bluesky, "https://bsky.app/profile/game/post/concurrent");
  assert.equal(final.syndicationStatus.bluesky, "confirmed");
  assert.equal(final.syndicationStatus.discord, "confirmed");
  assert.equal(final.syndicationComplete, true);
  assert.equal(final.syndicate, undefined);
  assert.equal(final.discordDelivery.lease, undefined);
});

test("legacy generic confirmed receipt is preserved without a replacement or repost", async (t) => {
  const state = await fixture(t);
  const parsed = frontMatter(original);
  parsed.attributes.syndication.discord = "https://discord.com/";
  parsed.attributes.syndicationStatus.discord = "confirmed";
  state.source = buildFrontmatter(parsed.attributes, parsed.body, original);
  await runSyndicationPostDeploy();
  assert.equal(state.posts.length, 0);
  assert.equal(state.metadataGets, 0);
  assert.equal(frontMatter(state.source).attributes.syndication.discord, "https://discord.com/");
  assert.equal(frontMatter(state.source).attributes.discordDelivery, undefined);
});
