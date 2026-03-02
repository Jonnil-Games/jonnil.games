export const DISCORD_TARGETS = { discord: true };

const REQUEST_TIMEOUT_MS = 10000;
const DISCORD_EMBED_COLOR = 0x5865f2;

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
      body: JSON.stringify({ embeds: [embed] }),
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
