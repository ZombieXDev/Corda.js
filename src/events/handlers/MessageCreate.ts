import Message from "../../structures/Message";
import Client from "../../client/Client";

export interface MessageCreateHandler {
  name: string;
  alias: string;
  transform: (client: Client, rawData: any) => Message;
  handler: (client: Client, message: Message, shardId: number) => void;
}

const MessageCreate: MessageCreateHandler = {
  name: "MESSAGE_CREATE",
  alias: "messageCreate",
  transform: (client, rawData) => {
    return new Message(client, rawData);
  },
  handler: (client, message, shardId) => {
    // here you can handle the message event
    console.log(`Message from ${message.author.username}: ${message.content}`);
  },
};

export default MessageCreate;
