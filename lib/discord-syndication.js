import { createHash } from "node:crypto";

export const DISCORD_TARGETS = { discord: true };

const REQUEST_TIMEOUT_MS = 10000;
const DISCORD_EMBED_COLOR = 0x5865f2;
const DISCORD_CONTENT_LIMIT = 2000;

function safeHttpsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !/\s/.test(value)
      ? url : null;
  } catch {
    return null;
  }
}

function splitContent(text) {
  const chunks = [];
  let remaining = text;
  while (remaining.length > DISCORD_CONTENT_LIMIT) {
    let boundary = remaining.lastIndexOf("\n", DISCORD_CONTENT_LIMIT);
    if (boundary < DISCORD_CONTENT_LIMIT / 2) boundary = DISCORD_CONTENT_LIMIT;
    if (/^[\uDC00-\uDFFF]$/.test(remaining[boundary])) boundary -= 1;
    chunks.push(remaining.slice(0, boundary));
    remaining = remaining.slice(boundary);
  }
  if (remaining) chunks.push(remaining);
  if (chunks.length > 64) throw new Error("release-announcement-too-long");
  return chunks;
}

export function casualDiscordText(text) {
  let inCode = false;
  return String(text || "").replace(/\r\n?/g, "\n").split("\n").map((line) => {
    const trimmed = line.trimEnd();
    if (trimmed.trimStart().startsWith("```")) {
      inCode = !inCode;
    } else if (!inCode && trimmed.endsWith(".") && !trimmed.endsWith("...")
        && !/^\s*\d+\.$/.test(trimmed) && !/^\s*https?:\/\/\S+$/.test(trimmed)
        && !/^(?: {4}|\t)/.test(trimmed)) {
      return trimmed.slice(0, -1) + line.slice(trimmed.length);
    }
    return line;
  }).join("\n");
}

export function buildDiscordReleaseMessages({ title, release, url }) {
  if (!release || release.schema !== 1 || typeof release.body !== "string" || !release.body.trim()
      || typeof release.moreInformation !== "string" || !Array.isArray(release.playLinks) || !safeHttpsUrl(url)) {
    throw new Error("invalid-release-announcement");
  }
  const links = release.playLinks.map((link) => {
    const destination = safeHttpsUrl(link?.url);
    if (!destination || destination.search || destination.hash || destination.port
        || typeof link.label !== "string" || !link.label.trim() || /[[\]\r\n]/.test(link.label)
        || !((destination.hostname === "gamejolt.com" && /^\/games\/[A-Za-z0-9_-]+\/[1-9]\d*\/?$/.test(destination.pathname))
          || (destination.hostname === "store.steampowered.com" && /^\/app\/[1-9]\d*\/?$/.test(destination.pathname)))) {
      throw new Error("invalid-release-play-link");
    }
    const label = destination.hostname === "gamejolt.com"
      ? "Play the latest version on Game Jolt" : "Play the latest version on Steam";
    return `[${label}](${destination.href})`;
  });
  const text = [
    `**${String(title || "Game update").trim()}**`, casualDiscordText(release.body).trim(), "**More information**",
    casualDiscordText(release.moreInformation).trim(), `[Read the website post](${url})`, ...links,
  ].filter(Boolean).join("\n\n");
  return splitContent(text);
}

export function discordReleaseDigest(options) {
  return createHash("sha256").update(JSON.stringify(buildDiscordReleaseMessages(options))).digest("hex");
}

function discordWebhook(value) {
  const parsed = safeHttpsUrl(value);
  const match = parsed?.pathname.match(/^\/api(?:\/v\d+)?\/webhooks\/(\d+)\/[A-Za-z0-9._-]+\/?$/);
  if (!parsed || parsed.hostname !== "discord.com" || !match || parsed.hash || parsed.port
      || [...parsed.searchParams.keys()].some((key) => !["wait", "thread_id"].includes(key))
      || (parsed.searchParams.has("thread_id") && !/^\d+$/.test(parsed.searchParams.get("thread_id")))) return null;
  return { url: parsed, id: match[1] };
}

async function webhookRequest(fetchImpl, url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetchImpl(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export async function sendDiscordRelease({ title, release, url, delivery, checkpoint, fetchImpl = fetch,
  sleepImpl = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)) }) {
  const webhook = discordWebhook(process.env.DISCORD_WEBHOOK_URL || "");
  if (!webhook) return { ok: false, status: 0, syndicatedUrl: "", error: "invalid-webhook-url" };
  let chunks, digest;
  try {
    chunks = buildDiscordReleaseMessages({ title, release, url });
    digest = discordReleaseDigest({ title, release, url });
  } catch (error) {
    return { ok: false, status: 0, syndicatedUrl: "", error: error.message };
  }
  if (typeof checkpoint !== "function") return { ok: false, status: 0, syndicatedUrl: "", error: "missing-delivery-checkpoint" };
  let state = delivery ? structuredClone(delivery) : {
    schema: 1, webhookId: webhook.id, payloadDigest: digest,
    chunks: chunks.map(() => ({ state: "ready" })),
  };
  const fail = (error, status = 0) => ({ ok: false, status, syndicatedUrl: "", error, delivery: state });
  if (state.schema !== 1 || state.webhookId !== webhook.id || state.payloadDigest !== digest
      || !Array.isArray(state.chunks) || state.chunks.length !== chunks.length) return fail("delivery-identity-changed");
  for (const chunk of state.chunks) {
    if (!chunk || !["ready", "failed", "confirmed", "sending", "unverified"].includes(chunk.state)
        || (chunk.state === "confirmed" && (!/^\d+$/.test(chunk.messageId) || !/^\d+$/.test(chunk.channelId)
          || !/^\d+$/.test(String(chunk.guildId || state.guildId))))) {
      return fail("invalid-delivery-receipt");
    }
  }
  try {
    if (state.chunks.some((chunk) => ["sending", "unverified"].includes(chunk.state))) return fail("delivery-unverified-review-required");
    const needsSend = state.chunks.some((chunk) => chunk.state !== "confirmed");
    if (needsSend) {
      const metadataUrl = new URL(webhook.url);
      metadataUrl.search = "";
      const metadataResponse = await webhookRequest(fetchImpl, metadataUrl.href, { method: "GET" });
      if (!metadataResponse.ok) return fail("webhook-metadata-unavailable", metadataResponse.status);
      const metadata = await metadataResponse.json();
      if (String(metadata.id) !== webhook.id || !/^\d+$/.test(String(metadata.guild_id)) || !/^\d+$/.test(String(metadata.channel_id))) {
        return fail("webhook-channel-unverified");
      }
      const guildId = String(metadata.guild_id);
      const channelId = String(webhook.url.searchParams.get("thread_id") || metadata.channel_id);
      if (state.chunks.some((chunk) => chunk.state === "confirmed" && (chunk.channelId !== channelId || chunk.guildId !== guildId))) {
        return fail("delivery-destination-changed");
      }
      state.guildId = guildId;
      state.channelId = channelId;
    }
    let rateLimitRetries = 0;
    let rateLimitWaitMs = 0;
    for (let index = 0; index < chunks.length; index += 1) {
      if (state.chunks[index].state === "confirmed") continue;
      for (;;) {
        state.chunks[index] = { state: "sending" };
        await checkpoint(structuredClone(state));
        const executeUrl = new URL(webhook.url);
        executeUrl.searchParams.set("wait", "true");
        let response, message;
        try {
          response = await webhookRequest(fetchImpl, executeUrl.href, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: chunks[index], allowed_mentions: { parse: [] } }),
          });
          if (response.ok) {
            message = await response.json();
            if (!/^\d+$/.test(String(message.id)) || !/^\d+$/.test(String(message.channel_id))
                || String(message.channel_id) !== state.channelId) throw new Error("invalid-message-receipt");
          }
        } catch (error) {
          state.chunks[index] = { state: "unverified", error: error?.name === "AbortError" ? "timeout" : "network-or-receipt-error" };
          await checkpoint(structuredClone(state));
          return fail("delivery-unverified-review-required");
        }
        if (!response.ok) {
          const rejected = response.status >= 400 && response.status < 500 && response.status !== 408;
          state.chunks[index] = { state: rejected ? "failed" : "unverified", error: `http-${response.status}` };
          await checkpoint(structuredClone(state));
          if (response.status === 429 && rateLimitRetries < 3) {
            let retryAfter;
            try { retryAfter = (await response.json()).retry_after; } catch { /* Keep the known rejection for the next attempt. */ }
            const delay = typeof retryAfter === "number" && Number.isFinite(retryAfter) && retryAfter >= 0
              ? Math.ceil(retryAfter * 1000) : Infinity;
            if (rateLimitWaitMs + delay <= 30000) {
              rateLimitRetries += 1;
              rateLimitWaitMs += delay;
              await sleepImpl(delay);
              continue;
            }
          }
          return fail(`http-${response.status}`, response.status);
        }
        state.chunks[index] = { state: "confirmed", messageId: String(message.id), channelId: String(message.channel_id), guildId: state.guildId };
        await checkpoint(structuredClone(state));
        break;
      }
    }
    const first = state.chunks[0];
    return { ok: true, status: 200, syndicatedUrl: `https://discord.com/channels/${first.guildId || state.guildId}/${first.channelId}/${first.messageId}`, delivery: state };
  } catch {
    return fail("delivery-checkpoint-failed");
  }
}

export async function sendDiscordWebhook({
  title,
  excerpt,
  url,
  imageUrl,
  fetchImpl = fetch,
}) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    return { ok: false, status: 0, syndicatedUrl: "", error: "no-webhook-url" };
  }

  const embed = {
    title: String(title || "New post").slice(0, 256),
    url,
    color: DISCORD_EMBED_COLOR,
  };

  if (excerpt) {
    embed.description = String(excerpt).slice(0, 4096);
  }

  if (imageUrl) {
    embed.image = { url: imageUrl };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetchImpl(`${webhookUrl}?wait=true`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: `<${url}>`, embeds: [embed] }),
      signal: controller.signal,
    });

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        syndicatedUrl: "",
        error: `http-${res.status}`,
      };
    }

    const data = await res.json();
    const guildId = data.guild_id;
    const channelId = data.channel_id;
    const messageId = data.id;

    const syndicatedUrl =
      guildId && channelId && messageId
        ? `https://discord.com/channels/${guildId}/${channelId}/${messageId}`
        : "https://discord.com/";

    return { ok: true, status: res.status, syndicatedUrl };
  } catch (err) {
    const error = err?.name === "AbortError" ? "timeout" : "network-error";
    return { ok: false, status: 0, syndicatedUrl: "", error };
  } finally {
    clearTimeout(timeout);
  }
}
