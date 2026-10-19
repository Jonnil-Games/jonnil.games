import assert from "node:assert/strict";
import test from "node:test";
import { buildDiscordReleaseMessages, casualDiscordText, discordReleaseDigest, sendDiscordRelease, sendDiscordWebhook } from "./discord-syndication.js";

const webhook = "https://discord.com/api/webhooks/123456789012345678/test-token";
const options = {
  title: "Game 1.2.3 Patch Notes", url: "https://jonnil.games/blog/game-1-2-3/",
  release: { schema: 1, body: "## Added\n- A new drawing option.", moreInformation: "Please share feedback or report issues",
    playLinks: [{ label: "Play on Game Jolt", url: "https://gamejolt.com/games/Game/123" }, { label: "Play on Steam", url: "https://store.steampowered.com/app/456/" }] },
};

function configure(t) {
  const previous = process.env.DISCORD_WEBHOOK_URL;
  process.env.DISCORD_WEBHOOK_URL = webhook;
  t.after(() => previous === undefined ? delete process.env.DISCORD_WEBHOOK_URL : process.env.DISCORD_WEBHOOK_URL = previous);
}

function fakeDiscord() {
  const requests = [];
  return {
    requests,
    fetch: async (url, init) => {
      requests.push({ url: String(url), ...init });
      if (init.method === "GET") return { ok: true, status: 200, json: async () => ({ id: "123456789012345678", guild_id: "100", channel_id: "200" }) };
      return { ok: true, status: 200, json: async () => ({ id: String(300 + requests.filter((r) => r.method === "POST").length), channel_id: "200" }) };
    },
  };
}

test("release text includes full notes, approved feedback, website and both public stores", () => {
  const text = buildDiscordReleaseMessages(options).join("");
  assert.ok(text.includes(casualDiscordText(options.release.body)));
  assert.ok(text.includes("**More information**"));
  assert.ok(text.includes(options.release.moreInformation));
  assert.ok(text.includes(`[Read the website post](${options.url})`));
  assert.ok(text.includes("[Play the latest version on Game Jolt](https://gamejolt.com/games/Game/123)"));
  assert.ok(text.includes("[Play the latest version on Steam](https://store.steampowered.com/app/456/)"));
});

test("Discord prose drops line-ending periods while preserving sentences, code, lists and technical text", () => {
  const source = "One sentence. The next sentence.  \r\n- A new option.\r\nMore soon...\r\n1.\r\nhttps://example.com/path.\r\n    value.\r\n\tvalue.\r\n```gml\r\nvalue.\r\n```\r\nDone!\r\nA question?";
  const expected = "One sentence. The next sentence  \n- A new option\nMore soon...\n1.\nhttps://example.com/path.\n    value.\n\tvalue.\n```gml\nvalue.\n```\nDone!\nA question?";
  assert.equal(casualDiscordText(source), expected);
  const rendered = buildDiscordReleaseMessages({ ...options, release: { ...options.release,
    body: "A complete sentence. Another sentence.", moreInformation: "Please share your feedback." } }).join("");
  assert.ok(rendered.includes("A complete sentence. Another sentence\n"));
  assert.ok(rendered.includes("Please share your feedback\n"));
  assert.equal(options.release.body, "## Added\n- A new drawing option.");
});

test("large Unicode notes are split without truncation or broken surrogate pairs", () => {
  const release = { ...options.release, body: "😀".repeat(2600) + "\n" + "x".repeat(5000) };
  const chunks = buildDiscordReleaseMessages({ ...options, release });
  assert.ok(chunks.length > 3);
  assert.ok(chunks.every((chunk) => chunk.length <= 2000 && !/^[\uDC00-\uDFFF]|[\uD800-\uDBFF]$/.test(chunk)));
  assert.ok(chunks.join("").includes(release.body));
  assert.equal(discordReleaseDigest({ ...options, release }), discordReleaseDigest({ ...options, release }));
  assert.notEqual(discordReleaseDigest({ ...options, release }), discordReleaseDigest(options));
});

test("blank extra text remains intentionally blank", () => {
  const text = buildDiscordReleaseMessages({ ...options, release: { ...options.release, moreInformation: "" } }).join("");
  assert.ok(!text.includes("Please share feedback"));
  assert.ok(text.includes(casualDiscordText(options.release.body)));
});

test("invalid or private play destinations fail before sending", () => {
  for (const url of ["http://gamejolt.com/games/Game/123", "https://gamejolt.com/dashboard/123", "https://127.0.0.1/play", "https://user:secret@gamejolt.com/games/Game/123", "https://gamejolt.com/games/Game/123?token=secret"]) {
    assert.throws(() => buildDiscordReleaseMessages({ ...options, release: { ...options.release, playLinks: [{ label: "Game", url }] } }), /invalid-release-play-link/);
  }
});

test("release send checkpoints before POST and retains IDs without guild_id in the message ACK", async (t) => {
  configure(t);
  const server = fakeDiscord();
  const checkpoints = [];
  const result = await sendDiscordRelease({ ...options, fetchImpl: async (url, init) => {
    if (init.method === "POST") assert.equal(checkpoints.at(-1).chunks[0].state, "sending");
    return server.fetch(url, init);
  }, checkpoint: async (value) => checkpoints.push(structuredClone(value)) });
  assert.equal(result.ok, true);
  assert.equal(result.syndicatedUrl, "https://discord.com/channels/100/200/301");
  assert.equal(result.delivery.chunks[0].messageId, "301");
  assert.equal(checkpoints.at(-1).chunks[0].state, "confirmed");
  const post = server.requests.find((r) => r.method === "POST");
  assert.equal(new URL(post.url).searchParams.get("wait"), "true");
  assert.deepEqual(JSON.parse(post.body).allowed_mentions, { parse: [] });
  assert.ok(JSON.parse(post.body).content.includes(casualDiscordText(options.release.body)));
  assert.ok(!JSON.stringify(result.delivery).includes("test-token"));
});

test("confirmed chunks resume without re-sending and all-confirmed receipts do no network work", async (t) => {
  configure(t);
  const expanded = { ...options, release: { ...options.release, body: "x".repeat(4200) } };
  const server = fakeDiscord();
  let first;
  const interrupted = await sendDiscordRelease({ ...expanded, fetchImpl: server.fetch, checkpoint: async (value) => {
    if (value.chunks[0].state === "confirmed" && value.chunks[1].state === "ready") first = structuredClone(value);
    if (value.chunks[1].state === "sending") throw new Error("Stop after the first confirmed chunk");
  } });
  assert.equal(interrupted.ok, false);
  assert.equal(server.requests.filter((r) => r.method === "POST").length, 1);
  const resumed = fakeDiscord();
  const result = await sendDiscordRelease({ ...expanded, delivery: first, fetchImpl: resumed.fetch, checkpoint: async () => {} });
  assert.equal(result.ok, true);
  assert.equal(resumed.requests.filter((r) => r.method === "POST").length, result.delivery.chunks.length - 1);
  const complete = await sendDiscordRelease({ ...expanded, delivery: result.delivery, checkpoint: async () => {}, fetchImpl: async () => { throw new Error("Must not resend"); } });
  assert.equal(complete.ok, true);
});

test("timeout or a pre-existing sending checkpoint never gets blindly retried", async (t) => {
  configure(t);
  const server = fakeDiscord();
  let saved;
  const result = await sendDiscordRelease({ ...options, checkpoint: async (state) => { saved = structuredClone(state); }, fetchImpl: async (url, init) => {
    if (init.method === "POST") throw Object.assign(new Error("Unknown send outcome"), { name: "AbortError" });
    return server.fetch(url, init);
  } });
  assert.equal(result.ok, false);
  assert.equal(saved.chunks[0].state, "unverified");
  for (const state of [saved, { ...saved, chunks: [{ state: "sending" }] }]) {
    const held = await sendDiscordRelease({ ...options, delivery: state, checkpoint: async () => {}, fetchImpl: async () => { throw new Error("Must not send"); } });
    assert.equal(held.error, "delivery-unverified-review-required");
  }
});

test("checkpoint failure blocks POST and a changed payload cannot reuse old message receipts", async (t) => {
  configure(t);
  const server = fakeDiscord();
  const result = await sendDiscordRelease({ ...options, fetchImpl: server.fetch, checkpoint: async () => { throw new Error("GitHub denied the save"); } });
  assert.equal(result.error, "delivery-checkpoint-failed");
  assert.equal(server.requests.filter((r) => r.method === "POST").length, 0);
  const completed = await sendDiscordRelease({ ...options, fetchImpl: fakeDiscord().fetch, checkpoint: async () => {} });
  const changed = await sendDiscordRelease({ ...options, release: { ...options.release, body: "Different notes" }, delivery: completed.delivery,
    checkpoint: async () => {}, fetchImpl: async () => { throw new Error("Must not send"); } });
  assert.equal(changed.error, "delivery-identity-changed");
});

test("rate limits wait for retry_after and resume only the rejected chunk", async (t) => {
  configure(t);
  const expanded = { ...options, release: { ...options.release, body: "x".repeat(4200) } };
  const server = fakeDiscord();
  const delivered = [];
  const waits = [];
  let saved, rejections = 0;
  const result = await sendDiscordRelease({ ...expanded, checkpoint: async (state) => { saved = state; },
    sleepImpl: async (delay) => {
      assert.equal(saved.chunks[0].state, "confirmed");
      assert.equal(saved.chunks[1].state, "failed");
      waits.push(delay);
    }, fetchImpl: async (url, init) => {
      if (init.method === "POST") {
        const payload = JSON.parse(init.body);
        if (delivered.length === 1 && rejections < 2) {
          rejections += 1;
          return { ok: false, status: 429, json: async () => ({ retry_after: rejections * 0.125 }) };
        }
        delivered.push(payload.content);
      }
      return server.fetch(url, init);
    } });
  assert.equal(result.ok, true);
  assert.deepEqual(waits, [125, 250]);
  assert.equal(delivered.length, result.delivery.chunks.length);
  assert.equal(delivered.filter((content) => content === delivered[0]).length, 1);
  assert.ok(result.delivery.chunks.every((chunk) => chunk.state === "confirmed"));
});

test("rate-limit retries stop after three attempts or thirty seconds of waiting", async (t) => {
  configure(t);
  for (const retryAfter of [0, 31]) {
    const server = fakeDiscord();
    let posts = 0;
    const waits = [];
    const result = await sendDiscordRelease({ ...options, checkpoint: async () => {}, sleepImpl: async (delay) => waits.push(delay),
      fetchImpl: async (url, init) => {
        if (init.method === "POST") {
          posts += 1;
          return { ok: false, status: 429, json: async () => ({ retry_after: retryAfter }) };
        }
        return server.fetch(url, init);
      } });
    assert.equal(result.error, "http-429");
    assert.equal(result.delivery.chunks[0].state, "failed");
    assert.equal(posts, retryAfter === 0 ? 4 : 1);
    assert.equal(waits.length, retryAfter === 0 ? 3 : 0);
  }
});

test("server errors and non-default webhook ports never trigger an automatic repeat", async (t) => {
  configure(t);
  const server = fakeDiscord();
  let posts = 0;
  const result = await sendDiscordRelease({ ...options, checkpoint: async () => {},
    fetchImpl: async (url, init) => {
      if (init.method === "POST") {
        posts += 1;
        return { ok: false, status: 503, json: async () => ({}) };
      }
      return server.fetch(url, init);
    } });
  assert.equal(result.delivery.chunks[0].state, "unverified");
  const held = await sendDiscordRelease({ ...options, delivery: result.delivery, checkpoint: async () => {},
    fetchImpl: async () => { throw new Error("Must not repeat an uncertain POST"); } });
  assert.equal(held.error, "delivery-unverified-review-required");
  assert.equal(posts, 1);
  process.env.DISCORD_WEBHOOK_URL = webhook.replace("discord.com", "discord.com:8443");
  const invalid = await sendDiscordRelease({ ...options, checkpoint: async () => {}, fetchImpl: async () => { throw new Error("Must not connect"); } });
  assert.equal(invalid.error, "invalid-webhook-url");
});

test("ordinary blog posts retain the existing short embed format", async (t) => {
  configure(t);
  let payload;
  const result = await sendDiscordWebhook({ title: "Studio news", excerpt: "A short summary", url: options.url,
    fetchImpl: async (_url, init) => {
      payload = JSON.parse(init.body);
      return { ok: true, status: 200, json: async () => ({ guild_id: "100", channel_id: "200", id: "300" }) };
    } });
  assert.equal(result.ok, true);
  assert.equal(payload.content, `<${options.url}>`);
  assert.equal(payload.embeds[0].description, "A short summary");
});
