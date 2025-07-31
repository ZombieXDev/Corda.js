import Client from "../client/Client";

export interface MessageData {
  id: string;
  channel_id: string;
  guild_id?: string | null;
  author: any;
  content: string;
  timestamp: string | Date;
  // ... add more fields as needed
}

class Message {
  client: Client;
  id: string;
  channel_id: string;
  guild_id: string | null;
  author: any;
  content: string;
  timestamp: Date;

  constructor(client: Client, data: MessageData) {
    this.client = client;
    this.id = data.id;
    this.channel_id = data.channel_id;
    this.guild_id = data.guild_id ?? null;
    this.author = data.author;
    this.content = data.content;
    this.timestamp = new Date(data.timestamp);
  }

  async reply(content: string) {
    return this.client.sendMessage(this.channel_id, { content });
  }
}

export default Message;
