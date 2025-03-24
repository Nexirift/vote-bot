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
        const emojiRegex =
          /<a?:.+?:\d+>|[\u{1f300}-\u{1f5ff}\u{1f900}-\u{1f9ff}\u{1f600}-\u{1f64f}\u{1f680}-\u{1f6ff}\u{2600}-\u{26ff}\u{2700}-\u{27bf}\u{1f1e6}-\u{1f1ff}\u{1f191}-\u{1f251}\u{1f004}\u{1f0cf}\u{1f170}-\u{1f171}\u{1f17e}-\u{1f17f}\u{1f18e}\u{3030}\u{2b50}\u{2b55}\u{2934}-\u{2935}\u{2b05}-\u{2b07}\u{2b1b}-\u{2b1c}\u{3297}\u{3299}\u{303d}\u{00a9}\u{00ae}\u{2122}\u{23f3}\u{24c2}\u{23e9}-\u{23ef}\u{25b6}\u{23f8}-\u{23fa}]/gu;
        const emojis = message.content.match(emojiRegex) || [];
        await Promise.all(emojis.map((emoji) => message.react(emoji)));
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
