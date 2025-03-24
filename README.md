# Vote Bot

Nexirift's Discord bot that automatically reacts on ideas.

## Setup

1. Create a bot on [Discord's developer portal](https://discord.com/developers).
2. Create an .env by copying the .env.example file.
3. Run `bun install` to install the dependencies.
5. Run `bun run start` to start the bot.

## How it works

It looks for messages that begin with `---IDEA---` and reacts to them with checkbox and x emojis. Alternatively, it also looks for messages that begin with `---QUESTION---` and reacts to them with emojis that match emojis in the message.
