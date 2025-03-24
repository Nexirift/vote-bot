import { Client, Events, GatewayIntentBits } from "discord.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Parse SERVER_CHANNELS environment variable into map of server IDs to channel IDs
const channelsByServer =
  Bun.env.SERVER_CHANNELS?.split(";").reduce<Record<string, string[]>>(
    (acc, serverDef) => {
      const [serverId, channelIds] = serverDef.split(":").map((s) => s.trim());
      if (serverId && channelIds) {
        acc[serverId] = channelIds
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean);
      }
      return acc;
    },
    {},
  ) || {};

// Handle errors
client.on(Events.Error, (error) => {
  console.error("Discord client error:", error);
  // Optionally add error reporting service here
});

client.on(Events.ClientReady, (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}!`);
  console.log(
    "Bot is ready and monitoring channels by server:",
    JSON.stringify(channelsByServer, null, 2),
    "\n",
  );
});

client.on(Events.MessageCreate, async (message) => {
  try {
    // Early return if conditions aren't met
    if (
      !message.guildId ||
      !channelsByServer[message.guildId]?.includes(message.channelId) ||
      (!message.content.startsWith("---IDEA---") &&
        !message.content.startsWith("---QUESTION---"))
    ) {
      return;
    }

    console.log(
      `New ${message.content.startsWith("---IDEA---") ? "idea" : "question"} received in server ${message.guildId}, channel ${message.channel.id}:
${message.content}
`,
    );

    try {
      if (message.content.startsWith("---IDEA---")) {
        // Add default reactions for ideas
        const REACTIONS = ["✅", "❌"] as const;
        await Promise.all(REACTIONS.map((reaction) => message.react(reaction)));
      } else {
        // Extract and add emojis from question message
        const discordEmojiRegex = /<:.+?:\d+>/g;
        const unicodeEmojiRegex =
          /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/g;
        const discordEmojis = message.content.match(discordEmojiRegex) || [];
        const unicodeEmojis = message.content.match(unicodeEmojiRegex) || [];
        const allEmojis = [...discordEmojis, ...unicodeEmojis];
        await Promise.all(allEmojis.map((emoji) => message.react(emoji)));
      }
    } catch (error) {
      console.error("Failed to add reactions:", error);
    }
  } catch (error) {
    console.error("Error processing message:", error);
  }
});

// Initialize bot
client.login(Bun.env.TOKEN).catch((error) => {
  console.error("Failed to login:", error);
  process.exit(1);
});
