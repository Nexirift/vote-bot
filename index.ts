import { Client, Events, GatewayIntentBits, Message } from "discord.js";
import emojiRegex from "emoji-regex";

const IDEA_PREFIX = "---IDEA---";
const QUESTION_PREFIX = "---QUESTION---";
const DEFAULT_REACTIONS = ["✅", "❌"] as const;
const DISCORD_EMOJI_REGEX = /<:.+?:\d+>/g;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const parseChannelConfig = (config: string): Record<string, string[]> => {
  if (!config) return {};

  return config
    .split(";")
    .reduce<Record<string, string[]>>((acc, serverDef) => {
      const [serverId, channelIds] = serverDef.split(":").map((s) => s.trim());
      if (serverId && channelIds) {
        acc[serverId] = channelIds
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean);
      }
      return acc;
    }, {});
};

const channelsByServer = parseChannelConfig(Bun.env.SERVER_CHANNELS || "");

const handleReactions = async (
  message: Message,
  isIdea: boolean,
): Promise<void> => {
  try {
    if (isIdea) {
      await Promise.all(
        DEFAULT_REACTIONS.map((reaction) => message.react(reaction)),
      );
      return;
    }

    const unicodeEmojiRegex = emojiRegex();
    const discordEmojis = message.content.match(DISCORD_EMOJI_REGEX) || [];
    const unicodeEmojis = message.content.match(unicodeEmojiRegex) || [];

    const reactionPromises = [
      ...unicodeEmojis.map((emoji) => message.react(emoji)),
      ...discordEmojis.map((emoji) => {
        const emojiId = emoji.split(":")[2]?.slice(0, -1);
        const discordEmoji = client.emojis.cache.get(emojiId!);
        return message.react(discordEmoji!);
      }),
    ];

    await Promise.all(reactionPromises);
  } catch (error) {
    console.error("Failed to add reactions:", error);
  }
};

client.on(Events.Error, (error) => {
  console.error("Discord client error:", error);
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
    const isIdea = message.content.startsWith(IDEA_PREFIX);
    const isQuestion = message.content.startsWith(QUESTION_PREFIX);

    if (
      !message.guildId ||
      !channelsByServer[message.guildId]?.includes(message.channelId) ||
      (!isIdea && !isQuestion)
    ) {
      return;
    }

    console.log(
      `New ${isIdea ? "idea" : "question"} received in server ${message.guildId}, channel ${message.channel.id}:
${message.content}
`,
    );

    await handleReactions(message, isIdea);
  } catch (error) {
    console.error("Error processing message:", error);
  }
});

// Initialize bot
client.login(Bun.env.TOKEN).catch((error) => {
  console.error("Failed to login:", error);
  process.exit(1);
});
