[![Corda Discord Library](https://iili.io/FUrMdcx.md.png)](https://freeimage.host/i/FUrMdcx)

# Corda - Modern Discord Bot Library [Alpha]

**Corda** is a modern, flexible, and scalable Discord bot library for **TypeScript** and **JavaScript**. It features a powerful event system (with aliases like `onReady`, `messageCreate`), full control over the Discord Gateway, REST API, sharding, and graceful shutdown.

---

## 🚀 Features

- 100% TypeScript (works in JS & TS)
- Event aliases like `onReady`, `messageCreate` — or use raw Discord events such as `READY`, `MESSAGE_CREATE`.
- Fully typed REST API client
- Intents & Presence support
- Automatic or manual sharding
- Built-in logger & graceful shutdown (`OnShutDown()`)

---

## 📦 Installation

```bash
npm install corda.js
```

---

## ⚡ Quick Start

```ts
import { Client, Constants } from "corda.js";

const client = new Client({
  token: "YOUR_BOT_TOKEN",
  intents: Constants.DefaultIntents,
  presence: {
    status: "online",
    activities: [{ name: "My Awesome Bot", type: 0 }],
  },
  debug: true,
});

client
  .on("onReady", () => {
    console.log(`${client.user.username} is ready!`);
  })
  .on("messageCreate", async (message) => {
    if (message.author.bot) return;
    if (message.content === "!ping") {
      client.sendMessage(message.channel_id, "🏓 Pong!");
    }
  });

client.login();
client.OnShutDown(); // Handles graceful exit (SIGINT/SIGTERM)
```

---

## 🧩 Sharding Example

To enable sharding, just set `totalShards`:

```ts
const client = new Client({
  token: "YOUR_BOT_TOKEN",
  intents: Constants.DefaultIntents,
  totalShards: "auto", // or a number
  debug: true,
});

client.on("shardReady", (shardId) => {
  console.log(`Shard ${shardId} is ready!`);
});
client.login();
```

---

## 📚 API Reference (Main Client)

### `new Client(options)`

- **token**: string — Your bot token (required)
- **intents**: number — Intents bitmask (see `Constants.Intents`)
- **presence**: object — Presence data (status, activities, etc.)
- **totalShards**: number | "auto" — Shard count (optional)
- **debug**: boolean — Enable debug logs (optional)

### Properties

| Property       | Type         | Description                   |
| -------------- | ------------ | ----------------------------- |
| `user`         | object       | Bot user object (after login) |
| `shardManager` | ShardManager | Sharding controller           |
| `rest`         | RestManager  | REST API client               |
| `eventManager` | EventManager | Event system                  |
| `intents`      | number       | Intents bitmask               |
| `totalShards`  | number       | Number of shards              |
| `debug`        | boolean      | Debug mode                    |

### Methods

| Method                         | Description                                           |
| ------------------------------ | ----------------------------------------------------- |
| `login()`                      | Connects to Discord Gateway                           |
| `OnShutDown()`                 | Handles graceful shutdown (SIGINT/SIGTERM)            |
| `sendMessage(channelId, data)` | Send message to a channel (string or full API object) |
| `getUser(userId)`              | Fetch user info via REST                              |
| `rest.get(path)`               | Raw REST GET request                                  |
| `rest.post(path, body)`        | Raw REST POST request                                 |

---

## 🔔 Event System

Corda supports both **raw Discord Gateway events** and **friendly aliases** for better readability.

### Common Aliases

| Alias             | Gateway Event      | Description        |
| ----------------- | ------------------ | ------------------ |
| `onReady`         | `READY`            | Bot is ready       |
| `messageCreate`   | `MESSAGE_CREATE`   | New message        |
| `shardReady`      | `SHARD_READY`      | Shard is ready     |
| `shardDisconnect` | `SHARD_DISCONNECT` | Shard disconnected |
| `error`           | `ERROR`            | Error on shard     |

> You can also listen to raw events by their Discord name.

---

## 📨 Sending Messages

You can send a message as a string or as a full Discord API object:

```ts
// Simple text
client.sendMessage(channelId, "Hello!");

// Full API object (embeds, files, etc)
client.sendMessage(channelId, {
  content: "Hello!",
  embeds: [ ... ],
  tts: false,
});
```

---

## 🌐 REST API Usage

```ts
// Get bot user info
const user = await client.rest.get("/users/@me");

// Send message using REST
await client.rest.post(`/channels/${channelId}/messages`, {
  content: "Hello via REST!",
});
```

---

## 🧰 Utility Methods

| Method                 | Description                                    |
| ---------------------- | ---------------------------------------------- |
| `client.login()`       | Connect to the Discord Gateway                 |
| `client.sendMessage()` | Send a message directly to a channel           |
| `client.rest.get()`    | Perform a REST GET request                     |
| `client.rest.post()`   | Perform a REST POST request                    |
| `client.OnShutDown()`  | Graceful shutdown on `SIGINT`, `SIGTERM`, etc. |

---

## ✅ Why Corda?

- Clean, minimal, and intuitive
- Type-safe, but compatible with plain JS
- Alias event system for developer-friendly code
- Works in bots of any scale — with or without sharding
- Focused on performance and flexibility

---

## 📜 License

MIT

> Contributions welcome! Open issues or PRs to help improve the library.

---
